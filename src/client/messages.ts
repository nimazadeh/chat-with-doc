import type { ChatMessage } from '../shared/chat';

export function renderMessage(message: ChatMessage): HTMLElement {
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
      prose.dir = /[\u0600-\u06ff]/.test(segment) ? 'rtl' : 'ltr';
      appendInlineText(prose, segment);
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
      pre.tabIndex = 0;
      const code = document.createElement('code');
      code.textContent = segment.replace(/\n$/, '');
      pre.append(code);
      const feedback = document.createElement('span');
      feedback.className = 'copy-feedback';
      feedback.setAttribute('role', 'status');
      async function copyCode(): Promise<void> {
        try {
          if (!navigator.clipboard) {
            throw new Error('Clipboard is unavailable.');
          }
          await navigator.clipboard.writeText(code.textContent ?? '');
          copy.textContent = 'Copied';
          feedback.textContent = 'Code copied to clipboard.';
        } catch {
          copy.textContent = 'Copy unavailable — select code';
          feedback.textContent =
            'Copy failed. Select the code and copy it manually.';
        }
      }
      copy.addEventListener('click', () => {
        void copyCode();
      });
      block.append(copy, feedback, pre);
      article.append(block);
    }
  }
  return article;
}

function appendInlineText(parent: HTMLElement, text: string): void {
  // Directional isolation prevents English identifiers and URLs from reordering neighbouring Persian punctuation.
  const pattern =
    /`([^`\n]+)`|\[page\s+[0-9۰-۹٠-٩]+\]|https?:\/\/[^\s<>()`،؛؟]+|[A-Za-z0-9][A-Za-z0-9_+.#:/@-]*(?:[ \t]+[A-Za-z0-9_+.#:/@=×÷*−-]+)*/g;
  let position = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    parent.append(document.createTextNode(text.slice(position, index)));
    const isolated = document.createElement('bdi');
    isolated.dir = 'ltr';
    if (match[1] !== undefined) {
      const code = document.createElement('code');
      code.className = 'inline-code';
      code.textContent = match[1];
      isolated.append(code);
    } else {
      isolated.textContent = match[0];
    }
    parent.append(isolated);
    position = index + match[0].length;
  }
  parent.append(document.createTextNode(text.slice(position)));
}
