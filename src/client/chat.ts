import { ApiError, requestJson } from './api';
import { chatLimits } from '../shared/chat';
import type { ChatMessage } from '../shared/chat';
import type { LearningSource } from '../shared/sources';

function renderMessage(message: ChatMessage): HTMLElement {
  const article = document.createElement('article');
  article.className = `chat-message message-${message.role}`;
  const author = document.createElement('h3');
  author.textContent = message.role === 'user' ? 'You' : 'Learning assistant';
  article.append(author);
  // Only fenced code is interpreted structurally. All provider prose and markup stay inert text.
  const segments = message.text.split(/```[^\n`]*\n([\s\S]*?)(?:```|$)/g);
  for (const [index, segment] of segments.entries()) {
    if (index % 2 === 0) {
      if (!segment) {
        continue;
      }
      const prose = document.createElement('p');
      prose.className = 'message-prose';
      prose.dir = 'auto';
      prose.textContent = segment;
      article.append(prose);
    } else {
      const block = document.createElement('div');
      block.className = 'code-block';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'button copy-code';
      copy.textContent = 'Copy code';
      const pre = document.createElement('pre');
      pre.dir = 'ltr';
      const code = document.createElement('code');
      code.textContent = segment.replace(/\n$/, '');
      pre.append(code);
      copy.addEventListener('click', () => {
        void navigator.clipboard
          .writeText(code.textContent ?? '')
          .then(() => {
            copy.textContent = 'Copied';
          })
          .catch(() => {
            copy.textContent = 'Copy unavailable — select code';
          });
      });
      block.append(copy, pre);
      article.append(block);
    }
  }
  return article;
}

export function mountChat(root: HTMLElement, onUnauthorized: () => void) {
  const element = <T extends HTMLElement>(selector: string): T => {
    const found = root.querySelector<T>(selector);
    if (!found) {
      throw new Error(`Missing chat element: ${selector}`);
    }
    return found;
  };
  const dialog = element<HTMLDialogElement>('#learning-chat');
  const form = element<HTMLFormElement>('#chat-form');
  const question = element<HTMLTextAreaElement>('#chat-question');
  const consent = element<HTMLInputElement>('#chat-consent');
  const send = element<HTMLButtonElement>('#send-question');
  const cancel = element<HTMLButtonElement>('#cancel-question');
  const restart = element<HTMLButtonElement>('#new-conversation');
  const transcript = element('#chat-messages');
  const status = element('#chat-status');
  const error = element('#chat-error');
  let source: LearningSource | undefined;
  let messages: ChatMessage[] = [];
  let controller: AbortController | undefined;
  let revision = 0;
  let disposed = false;
  let ready = false;

  function setBusy(busy: boolean): void {
    form.setAttribute('aria-busy', String(busy));
    send.disabled = busy || !ready;
    question.disabled = busy;
    consent.disabled = busy;
    restart.disabled = busy;
    cancel.hidden = !busy;
  }
  function clear(): void {
    messages = [];
    transcript.replaceChildren();
    question.value = '';
    status.textContent = '';
    error.textContent = '';
  }
  function showError(reason: unknown): void {
    if (reason instanceof ApiError && reason.status === 401) {
      onUnauthorized();
      return;
    }
    error.textContent =
      reason instanceof Error
        ? reason.message
        : 'Could not get an answer. Please try again.';
  }
  dialog.addEventListener('close', () => {
    revision += 1;
    controller?.abort();
    source = undefined;
    clear();
    element('#chat-source').textContent = '';
  });
  element('#close-chat').addEventListener('click', () => dialog.close());
  cancel.addEventListener('click', () => controller?.abort());
  restart.addEventListener('click', () => {
    clear();
    question.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (controller || !source || !ready) {
      return;
    }
    error.textContent = '';
    if (!consent.checked) {
      error.textContent =
        'Confirm that you agree to send this source and conversation to your AI provider.';
      consent.focus();
      return;
    }
    const text = question.value.trim();
    if (!text || text.length > chatLimits.questionCharacters) {
      error.textContent = 'Ask a question between 1 and 4,000 characters.';
      question.focus();
      return;
    }
    const pending: ChatMessage[] = [...messages, { role: 'user', text }];
    if (
      pending.length > chatLimits.messages ||
      pending.reduce((sum, message) => sum + message.text.length, 0) >
        chatLimits.historyCharacters
    ) {
      error.textContent =
        'This conversation has reached its limit. Start a new conversation; no messages were silently removed.';
      return;
    }
    const currentRevision = revision;
    const requestController = new AbortController();
    controller = requestController;
    setBusy(true);
    status.textContent = 'Thinking about your question…';
    void requestJson(
      '/api/chat',
      { sourceId: source.id, consent: true, messages: pending },
      { signal: requestController.signal },
    )
      .then((result) => {
        if (disposed || revision !== currentRevision) {
          return;
        }
        if (
          typeof result !== 'object' ||
          result === null ||
          !('text' in result) ||
          typeof result.text !== 'string' ||
          !result.text.trim() ||
          result.text.length > chatLimits.answerCharacters
        ) {
          throw new Error('The response could not be read. Please try again.');
        }
        const answer: ChatMessage = { role: 'assistant', text: result.text };
        messages = [...pending, answer];
        transcript.append(
          renderMessage({ role: 'user', text }),
          renderMessage(answer),
        );
        transcript.scrollTop = transcript.scrollHeight;
        question.value = '';
        status.textContent =
          'Answer ready. Ask a follow-up or start a new conversation.';
      })
      .catch((reason: unknown) => {
        if (disposed || revision !== currentRevision) {
          return;
        }
        status.textContent = requestController.signal.aborted
          ? 'Generation cancelled. Your question is kept so you can retry.'
          : '';
        if (!requestController.signal.aborted) {
          showError(reason);
        }
      })
      .finally(() => {
        if (controller === requestController) {
          controller = undefined;
        }
        if (!disposed && revision === currentRevision) {
          setBusy(false);
          question.focus();
        }
      });
  });
  return {
    async open(selected: LearningSource): Promise<void> {
      source = selected;
      const currentRevision = ++revision;
      clear();
      consent.checked = false;
      ready = false;
      controller = undefined;
      setBusy(false);
      element('#chat-source').textContent = selected.title;
      const provider = element('#chat-provider');
      provider.textContent = 'Checking AI configuration…';
      dialog.showModal();
      question.focus();
      try {
        const result = (await requestJson('/api/chat/status')) as {
          configured?: boolean;
          provider?: string;
        };
        if (disposed || revision !== currentRevision) {
          return;
        }
        ready =
          result.configured === true &&
          selected.characterCount <= chatLimits.sourceCharacters;
        provider.textContent = !result.configured
          ? 'Set AI_PROVIDER, AI_MODEL and AI_API_KEY in your local .env, then restart the app. Never paste a key into a conversation.'
          : `${result.provider === 'gemini' ? 'Gemini' : 'OpenAI-compatible provider'} · text-only responses · no persistent history yet`;
        if (selected.characterCount > chatLimits.sourceCharacters) {
          error.textContent =
            'This source is too long for chat (24,000 characters maximum). Save a shorter excerpt; nothing was truncated.';
        }
        setBusy(false);
      } catch (reason) {
        if (!disposed && revision === currentRevision) {
          showError(reason);
        }
      }
    },
    dispose(): void {
      disposed = true;
      controller?.abort();
      source = undefined;
      messages = [];
    },
  };
}
