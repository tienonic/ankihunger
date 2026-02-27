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
    }
  }

  onMount(() => document.addEventListener('click', handleClickOutside, true));
  onCleanup(() => document.removeEventListener('click', handleClickOutside, true));

  return (
    <div class="terms-dropdown" ref={dropdownRef}>
      <button class="terms-toggle-btn" onClick={() => setTermsOpen(!termsOpen())}>
        Terms {termsOpen() ? '\u25B2' : '\u25BC'}
      </button>
      <Show when={termsOpen()}>
        <div class="terms-list">
          <div class="activity-terms">
            <For each={getRelevantTerms()}>
              {t => (
                <a class="term-tag" href={googleUrl(t.term)} target="_blank" rel="noopener">
                  {t.term}
                </a>
              )}
            </For>
          </div>
          <input
            class="term-search"
            placeholder="Search terms..."
            value={searchQuery()}
            onInput={e => setSearchQuery(e.currentTarget.value)}
          />
          <Show when={searchQuery()}>
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
        </div>
      </Show>
    </div>
  );
}
