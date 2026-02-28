import { Show, For, onMount, onCleanup } from 'solid-js';
import {
  entries,
  getRelevantTerms,
  filteredEntries,
  searchQuery,
  setSearchQuery,
} from '../../store/glossary.ts';
import { termsOpen, setTermsOpen } from '../../store/app.ts';

function googleUrl(term: string): string {
  return 'https://www.google.com/search?q=' + encodeURIComponent(term + ' definition');
}

function googleImgUrl(term: string): string {
  return 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(term);
}

export function TermsDropdown() {
  let dropdownRef: HTMLDivElement | undefined;

  function handleClickOutside(e: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
      setTermsOpen(false);
      setSearchQuery('');
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (!termsOpen()) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Backspace') {
      setSearchQuery(searchQuery().slice(0, -1));
      return;
    }
    if (e.key === 'Escape') {
      setSearchQuery('');
      setTermsOpen(false);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setSearchQuery(searchQuery() + e.key);
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleKey);
  });
  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside, true);
    document.removeEventListener('keydown', handleKey);
  });

  return (
    <div class="terms-dropdown" ref={dropdownRef}>
      <button class="terms-toggle-btn" onClick={() => { setTermsOpen(!termsOpen()); setSearchQuery(''); }}>
        Terms {termsOpen() ? '\u25B2' : '\u25BC'}
      </button>
      <Show when={termsOpen()}>
        <div class="terms-list">
          <Show when={searchQuery()}>
            <div class="term-filter">{searchQuery()}</div>
            <div class="term-list">
              <For each={filteredEntries()}>
                {t => (
                  <div class="term-item">
                    <strong>{t.term}</strong>
                    <Show when={t.hasImage}>
                      <a class="term-img-link" href={googleImgUrl(t.term)} target="_blank" rel="noopener">
                        img
                      </a>
                    </Show>
                    <div class="term-def">{t.def}</div>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <Show when={!searchQuery()}>
            <div class="activity-terms">
              <For each={getRelevantTerms()}>
                {t => (
                  <a class="term-tag" href={googleUrl(t.term)} target="_blank" rel="noopener">
                    {t.term}
                  </a>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
