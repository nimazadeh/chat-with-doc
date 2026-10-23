import chatDialog from './chat-dialog.html?raw';
import { mountChat } from './chat';
import sourceDialogs from './source-dialogs.html?raw';
import { mountSourceLibrary } from './source-library';
import './styles.css';
import { ApiError, requestJson } from './api';
import { renderIcons } from './icons';
import { loginView, workspaceView } from './views';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Application root is missing.');
}
const applicationRoot = root;
let chat: ReturnType<typeof mountChat> | undefined;
let disposeLibrary: (() => void) | undefined;
let expiryCheck: number | undefined;
let unlockTimer: number | undefined;

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = applicationRoot.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required interface element is missing: ${selector}`);
  }
  return element;
}

function showLogin(message = '', focus = false): void {
  disposeLibrary?.();
  chat?.dispose();
  window.clearInterval(expiryCheck);
  window.clearTimeout(unlockTimer);
  // Only developer-owned templates enter innerHTML. Server and user text use textContent.
  applicationRoot.innerHTML = loginView();
  applicationRoot.setAttribute('aria-busy', 'false');
  document.title = 'Folio — Unlock your learning space';
  renderIcons();
  const form = requireElement<HTMLFormElement>('#login-form');
  const codeInput = requireElement<HTMLInputElement>('#access-code');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const errorText = requireElement<HTMLParagraphElement>('#login-error');
  const label = requireElement<HTMLSpanElement>('#unlock-label');
  if (!submit) {
    throw new Error('Unlock button is missing.');
  }
  errorText.textContent = message;
  if (focus) {
    codeInput.focus();
  }

  const help = document.querySelector<HTMLDialogElement>('#help-dialog');
  requireElement('#access-help').addEventListener('click', () =>
    help?.showModal(),
  );
  document
    .querySelector('#close-help')
    ?.addEventListener('click', () => help?.close());
  codeInput.addEventListener('input', () => {
    codeInput.removeAttribute('aria-invalid');
    errorText.textContent = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submit.disabled) {
      return;
    }
    if (!/^\d{6}$/.test(codeInput.value)) {
      errorText.textContent = 'Enter your six-digit access code.';
      codeInput.setAttribute('aria-invalid', 'true');
      codeInput.focus();
      return;
    }
    submit.disabled = true;
    label.textContent = 'Unlocking…';
    form.setAttribute('aria-busy', 'true');
    const code = codeInput.value;
    void requestJson('/api/auth/login', { code })
      .then(() => {
        codeInput.value = '';
        showWorkspace();
      })
      .catch((error: unknown) => {
        errorText.textContent =
          error instanceof Error ? error.message : 'Please try again.';
        codeInput.value = '';
        codeInput.setAttribute('aria-invalid', 'true');
        label.textContent = 'Unlock workspace';
        form.setAttribute('aria-busy', 'false');
        if (
          error instanceof ApiError &&
          error.status === 429 &&
          error.retryAfter > 0
        ) {
          unlockTimer = window.setTimeout(() => {
            submit.disabled = false;
            errorText.textContent = 'You can try your access code again.';
          }, error.retryAfter * 1000);
        } else {
          submit.disabled = false;
          codeInput.focus();
        }
      });
  });
}

function showWorkspace(): void {
  disposeLibrary?.();
  chat?.dispose();
  applicationRoot.innerHTML = workspaceView() + sourceDialogs + chatDialog;
  applicationRoot.setAttribute('aria-busy', 'false');
  document.title = 'Folio — Personal workspace';
  renderIcons();
  requireElement('#workspace-title').focus();
  const onUnauthorized = () =>
    showLogin('Your session has ended. Unlock your workspace again.', true);
  chat = mountChat(applicationRoot, onUnauthorized);
  disposeLibrary = mountSourceLibrary(
    applicationRoot,
    onUnauthorized,
    (source) => {
      void chat?.open(source);
    },
  );
  const logout = requireElement<HTMLButtonElement>('#logout');
  logout.addEventListener('click', () => {
    logout.disabled = true;
    void requestJson('/api/auth/logout', {})
      .then(() => showLogin('', true))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          showLogin(
            'Your session has ended. Unlock your workspace again.',
            true,
          );
          return;
        }
        requireElement('#workspace-error').textContent =
          error instanceof Error
            ? error.message
            : 'Could not lock the workspace. Please try again.';
        logout.disabled = false;
      });
  });
  window.clearInterval(expiryCheck);
  expiryCheck = window.setInterval(() => {
    void checkSession();
  }, 60_000);
}

async function checkSession(): Promise<void> {
  try {
    await requestJson('/api/workspace');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      showLogin('Your session has ended. Unlock your workspace again.', true);
    }
  }
}

async function initialize(): Promise<void> {
  try {
    const session = await requestJson('/api/auth/session');
    if (
      typeof session === 'object' &&
      session !== null &&
      'authenticated' in session &&
      session.authenticated === true
    ) {
      showWorkspace();
    } else {
      showLogin();
    }
  } catch (error) {
    const message =
      error instanceof ApiError && error.status === 401
        ? ''
        : 'Could not connect to your workspace. Please try again.';
    showLogin(message);
  }
}

void initialize();
