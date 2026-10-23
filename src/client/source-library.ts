import { ApiError, requestJson } from './api';
import { renderIcons } from './icons';
import { sourceLimits, isLearningSource } from '../shared/sources';
import type { LearningSource, SourceSummary } from '../shared/sources';

export function mountSourceLibrary(
  root: HTMLElement,
  onUnauthorized: () => void,
): () => void {
  let disposed = false;
  let saving = false;
  let deleting = false;
  let loadRevision = 0;
  let previewRevision = 0;
  let selectedSource: LearningSource | undefined;
  const element = <T extends HTMLElement>(selector: string): T => {
    const found = root.querySelector<T>(selector);
    if (!found) {
      throw new Error(`Missing library element: ${selector}`);
    }
    return found;
  };
  const importDialog = element<HTMLDialogElement>('#source-import');
  const previewDialog = element<HTMLDialogElement>('#source-preview');
  const deleteDialog = element<HTMLDialogElement>('#source-delete');
  const status = element('#library-status');
  const list = element('#source-list');
  const retry = element<HTMLButtonElement>('#retry-library');

  function showError(error: unknown, target: HTMLElement): void {
    if (disposed) {
      return;
    }
    if (error instanceof ApiError && error.status === 401) {
      onUnauthorized();
      return;
    }
    target.textContent =
      error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.';
  }

  async function preview(id: string): Promise<void> {
    const revision = ++previewRevision;
    selectedSource = undefined;
    element('#preview-title').textContent = 'Opening source…';
    element('#preview-pages').replaceChildren();
    element('#preview-meta').textContent = '';
    element('#preview-error').textContent = '';
    element<HTMLButtonElement>('#delete-source').disabled = true;
    previewDialog.showModal();
    try {
      const source = await requestJson(
        `/api/sources/${encodeURIComponent(id)}`,
      );
      if (disposed || !previewDialog.open || revision !== previewRevision) {
        return;
      }
      if (!isLearningSource(source)) {
        throw new Error(
          'The saved source could not be read. Please try again.',
        );
      }
      selectedSource = source;
      element('#preview-title').textContent = source.title;
      element('#preview-meta').textContent =
        `${source.kind === 'pdf' ? 'PDF' : 'Pasted text'} · ${source.pageCount} ${source.pageCount === 1 ? 'page' : 'pages'} · ${source.characterCount.toLocaleString()} characters`;
      const pages = element('#preview-pages');
      for (const page of source.pages) {
        const section = document.createElement('section');
        section.className = 'source-page';
        const heading = document.createElement('h3');
        heading.textContent =
          source.kind === 'pdf' ? `Page ${page.number}` : 'Source text';
        const text = document.createElement('p');
        text.dir = 'auto';
        // Educational material can contain arbitrary HTML and scripts; it must never be interpreted.
        text.textContent = page.text || 'No selectable text on this page.';
        section.append(heading, text);
        pages.append(section);
      }
      element<HTMLButtonElement>('#delete-source').disabled = false;
    } catch (error) {
      if (!disposed) {
        showError(error, element('#preview-error'));
      }
    }
  }

  async function load(): Promise<void> {
    const revision = ++loadRevision;
    status.textContent = 'Opening your library…';
    list.setAttribute('aria-busy', 'true');
    retry.hidden = true;
    try {
      const result = (await requestJson('/api/sources')) as {
        sources: SourceSummary[];
      };
      if (disposed || revision !== loadRevision) {
        return;
      }
      list.replaceChildren();
      element('#source-count').textContent =
        `${result.sources.length} / ${sourceLimits.count}`;
      if (result.sources.length === 0) {
        list.innerHTML = `<div class="empty-workspace"><span class="empty-icon"><i data-lucide="book-open"></i></span><span class="feature-tag">A FRESH START</span><h2>A home for what you’re learning.</h2><p>Add a text-based PDF or paste your notes.<br />Your next moment of clarity starts with a source.</p><button id="first-source" class="button button-quiet"><i data-lucide="plus"></i> Add your first source</button><span class="empty-footnote">Local storage. No AI requests. Just your material.</span></div>`;
        element('#first-source').addEventListener('click', openImport);
      } else {
        const rows = document.createElement('ul');
        rows.className = 'source-rows';
        rows.setAttribute('aria-label', 'Saved learning sources');
        for (const source of result.sources) {
          const row = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'source-row';
          const icon = document.createElement('span');
          icon.className = 'source-file-icon';
          icon.innerHTML = '<i data-lucide="file-text"></i>';
          const description = document.createElement('span');
          description.className = 'source-description';
          const title = document.createElement('span');
          title.className = 'source-title';
          title.dir = 'auto';
          title.textContent = source.title;
          const metadata = document.createElement('span');
          metadata.className = 'source-metadata';
          metadata.textContent = `${source.kind === 'pdf' ? 'PDF' : 'TEXT'} · ${source.pageCount} ${source.pageCount === 1 ? 'page' : 'pages'} · ${source.characterCount.toLocaleString()} characters`;
          description.append(title, metadata);
          const arrow = document.createElement('span');
          arrow.innerHTML = '<i data-lucide="arrow-up-right"></i>';
          button.append(icon, description, arrow);
          button.addEventListener('click', () => {
            void preview(source.id);
          });
          row.append(button);
          rows.append(row);
        }
        list.append(rows);
      }
      status.textContent = result.sources.length
        ? `${result.sources.length} saved ${result.sources.length === 1 ? 'source' : 'sources'}. Select one to read the extracted text.`
        : 'Your library is ready for its first source.';
      renderIcons();
    } catch (error) {
      if (!disposed && revision === loadRevision) {
        showError(error, status);
        retry.hidden = false;
      }
    } finally {
      if (!disposed && revision === loadRevision) {
        list.setAttribute('aria-busy', 'false');
      }
    }
  }

  function openImport(): void {
    element('#import-error').textContent = '';
    element('#import-status').textContent = '';
    importDialog.showModal();
  }

  previewDialog.addEventListener('close', () => {
    previewRevision += 1;
  });

  root
    .querySelectorAll<HTMLButtonElement>('[data-close-dialog]')
    .forEach((button) => {
      button.addEventListener('click', () => button.closest('dialog')?.close());
    });
  importDialog.addEventListener('cancel', (event) => {
    if (saving) {
      event.preventDefault();
    }
  });
  deleteDialog.addEventListener('cancel', (event) => {
    if (deleting) {
      event.preventDefault();
    }
  });
  element('#add-source').addEventListener('click', openImport);
  retry.addEventListener('click', () => {
    void load();
  });

  const tabs = [
    element<HTMLButtonElement>('#pdf-tab'),
    element<HTMLButtonElement>('#text-tab'),
  ];
  function activateTab(index: number): void {
    tabs.forEach((tab, position) => {
      tab.setAttribute('aria-selected', String(index === position));
      tab.tabIndex = index === position ? 0 : -1;
      element(position === 0 ? '#pdf-panel' : '#text-panel').hidden =
        index !== position;
    });
    element('#import-error').textContent = '';
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(index));
    tab.addEventListener('keydown', (event) => {
      if (
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        const next =
          event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
        activateTab(next);
        tabs[next]?.focus();
      }
    });
  });

  async function save(
    form: HTMLFormElement,
    request: () => Promise<unknown>,
  ): Promise<void> {
    if (saving) {
      return;
    }
    saving = true;
    element('#import-error').textContent = '';
    element('#import-status').textContent =
      'Saving your source… PDF processing may take a few seconds.';
    importDialog
      .querySelectorAll<HTMLButtonElement>('button')
      .forEach((button) => {
        button.disabled = true;
      });
    form.setAttribute('aria-busy', 'true');
    try {
      await request();
      if (disposed) {
        return;
      }
      form.reset();
      importDialog.close();
      await load();
    } catch (error) {
      if (!disposed) {
        showError(error, element('#import-error'));
      }
    } finally {
      saving = false;
      if (!disposed) {
        importDialog
          .querySelectorAll<HTMLButtonElement>('button')
          .forEach((button) => {
            button.disabled = false;
          });
        form.setAttribute('aria-busy', 'false');
        element('#import-status').textContent = '';
      }
    }
  }

  element<HTMLFormElement>('#text-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = element<HTMLInputElement>('#source-title');
    const text = element<HTMLTextAreaElement>('#source-text');
    if (!title.value.trim() || !text.value.trim()) {
      element('#import-error').textContent =
        'Add a title and some educational text before saving.';
      (!title.value.trim() ? title : text).focus();
      return;
    }
    void save(event.currentTarget as HTMLFormElement, () =>
      requestJson('/api/sources/text', {
        title: title.value,
        text: text.value,
      }),
    );
  });
  element<HTMLFormElement>('#pdf-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = element<HTMLInputElement>('#pdf-file');
    const file = input.files?.[0];
    if (
      !file ||
      !file.name.toLowerCase().endsWith('.pdf') ||
      file.size > sourceLimits.pdfBytes
    ) {
      element('#import-error').textContent =
        'Choose a PDF file no larger than 10 MiB.';
      input.focus();
      return;
    }
    void save(event.currentTarget as HTMLFormElement, () =>
      requestJson('/api/sources/pdf', undefined, {
        method: 'POST',
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
          'X-File-Name': encodeURIComponent(file.name),
        },
      }),
    );
  });

  element('#delete-source').addEventListener('click', () => {
    element('#delete-error').textContent = '';
    deleteDialog.showModal();
  });
  element('#cancel-delete').addEventListener('click', () =>
    deleteDialog.close(),
  );
  element<HTMLButtonElement>('#confirm-delete').addEventListener(
    'click',
    () => {
      if (!selectedSource) {
        return;
      }
      deleting = true;
      deleteDialog
        .querySelectorAll<HTMLButtonElement>('button')
        .forEach((button) => {
          button.disabled = true;
        });
      void requestJson(
        `/api/sources/${encodeURIComponent(selectedSource.id)}`,
        undefined,
        { method: 'DELETE' },
      )
        .then(async () => {
          if (disposed) {
            return;
          }
          deleteDialog.close();
          previewDialog.close();
          selectedSource = undefined;
          element('#preview-title').textContent = '';
          element('#preview-pages').replaceChildren();
          element('#preview-meta').textContent = '';
          element('#add-source').focus();
          await load();
        })
        .catch((error: unknown) => {
          if (!disposed) {
            showError(error, element('#delete-error'));
          }
        })
        .finally(() => {
          deleting = false;
          if (!disposed) {
            deleteDialog
              .querySelectorAll<HTMLButtonElement>('button')
              .forEach((button) => {
                button.disabled = false;
              });
          }
        });
    },
  );
  void load();
  return () => {
    disposed = true;
  };
}
