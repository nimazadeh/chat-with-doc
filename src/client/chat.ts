import { renderMessage } from './messages';
import { ApiError, requestJson } from './api';
import { chatLimits } from '../shared/chat';
import type { ChatMessage, TeachingPreferences } from '../shared/chat';
import type { LearningSource } from '../shared/sources';

export function mountChat(root: HTMLElement, onUnauthorized: () => void) {
  const element = <T extends HTMLElement>(selector: string): T => {
    const found = root.querySelector<T>(selector);
    if (!found) {
      throw new Error(`Missing chat element: ${selector}`);
    }
    return found;
  };
  const dialog = element<HTMLDialogElement>('#learning-chat');
  const goal = element<HTMLInputElement>('#learning-goal');
  const level = element<HTMLSelectElement>('#learning-level');
  const mode = element<HTMLSelectElement>('#response-mode');
  const preferences = element<HTMLDetailsElement>('#learning-preferences');
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
    goal.disabled = busy;
    level.disabled = busy;
    mode.disabled = busy;
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
    mode.value = 'explain';
    updateMode();
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
    goal.value = '';
    level.value = 'beginner';
    preferences.open = false;
  });
  element('#close-chat').addEventListener('click', () => dialog.close());
  cancel.addEventListener('click', () => controller?.abort());
  restart.addEventListener('click', () => {
    clear();
    question.focus();
  });
  function updateMode(): void {
    const labels = {
      explain: 'Send question',
      simplify: 'Explain more simply',
      practice: 'Give me an exercise',
      feedback: 'Check my answer',
    };
    const hints = {
      explain: 'One concept, an example and a small understanding check.',
      simplify:
        'A simpler version of the previous explanation. A question is optional.',
      practice:
        'One small exercise without the solution. Tell us what you want to practise, or leave the question blank.',
      feedback:
        'Write your attempt below. Feedback uses the exercise and conversation above.',
    };
    const placeholders = {
      explain: 'What would you like to understand?',
      simplify: 'Optional: what part still feels unclear?',
      practice: 'Optional: what would you like to practise?',
      feedback: 'Write your attempt and explain your reasoning…',
    };
    const action = mode.value as TeachingPreferences['action'];
    question.placeholder = placeholders[action];
    element('#chat-send-label').textContent = labels[action];
    element('#mode-hint').textContent = hints[action];
  }
  mode.addEventListener('change', updateMode);
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
    const action = mode.value as TeachingPreferences['action'];
    const persian = /[\u0600-\u06ff]/.test(
      messages.filter((message) => message.role === 'user').at(-1)?.text ??
        goal.value,
    );
    let text = question.value.trim();
    if (!text && action === 'simplify') {
      text = persian
        ? 'لطفاً توضیح قبلی را ساده‌تر و با یک مثال روشن توضیح بده.'
        : 'Please explain the previous idea more simply with a concrete example.';
    }
    if (!text && action === 'practice') {
      text = persian
        ? 'لطفاً یک تمرین کوتاه برای این مفهوم بده؛ پاسخ را هنوز نگو.'
        : 'Please give me one small exercise about this concept, without the solution yet.';
    }
    if (action === 'feedback' && !text) {
      error.textContent = 'Write your attempt before asking for feedback.';
      question.focus();
      return;
    }
    if (
      (action === 'simplify' || action === 'feedback') &&
      messages.length === 0
    ) {
      error.textContent = 'Ask for an explanation or exercise first.';
      return;
    }
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
      {
        sourceId: source.id,
        consent: true,
        messages: pending,
        teaching: { goal: goal.value, level: level.value, action },
      },
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
