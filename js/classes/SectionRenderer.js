/**
 * Dynamic DOM generation for study sections.
 *
 * Builds all section HTML from project data instead of hardcoded markup.
 * MCQ and Math modes have fully separate layouts and features.
 */

export class SectionRenderer {
  /**
   * Build and insert all sections into the container.
   * @param {HTMLElement} container - #sections-container
   * @param {import('./Project.js').Project} project
   */
  render(container, project) {
    container.innerHTML = '';
    for (const section of project.sections) {
      const div = document.createElement('div');
      div.id = section.id;
      div.className = 'section';
      div.innerHTML = this._buildSection(section);
      container.appendChild(div);
    }
  }

  _buildSection(section) {
    let html = '';

    // Hidden score spans for JS
    if (section.type === 'math-gen') {
      html += this._buildMathScoreBar(section);
    } else {
      html += this._buildMcqScoreBar(section);
    }

    // Mode toggle + actions row
    if (section.hasFlashcards) {
      html += `<div class="mode-toggle">
        <button class="mode-btn active" id="${section.id}-quiz-btn" data-mode="quiz">Quiz Mode</button>
        <button class="mode-btn" id="${section.id}-flash-btn" data-mode="flash">Flashcards</button>
        <span class="mode-toggle-actions">
          <span id="${section.id}-view-img" class="score-bar-img"></span>
          <button class="reset-btn" data-section="${section.id}">Reset</button>
        </span>
      </div>`;
    } else {
      html += `<div class="mode-toggle mode-toggle-actions-only">
        <span class="mode-toggle-actions">
          <span id="${section.id}-view-img" class="score-bar-img"></span>
          <button class="reset-btn" data-section="${section.id}">Reset</button>
        </span>
      </div>`;
    }

    // Tips (for passage-quiz sections that have them)
    if (section.tips && section.tips.length > 0) {
      html += `<div class="card"><h2>${section.name} Tips</h2><ul class="tips-list">`;
      for (const tip of section.tips) {
        html += `<li>${tip}</li>`;
      }
      html += '</ul></div>';
    }

    // Quiz area
    if (section.type === 'math-gen') {
      html += this._buildMathArea(section);
    } else {
      html += this._buildMcArea(section);
    }

    // Flashcard area (MCQ only)
    if (section.hasFlashcards) {
      html += this._buildFlashcardArea(section);
    }

    return html;
  }

  // Hidden spans for JS score/due tracking
  _buildMcqScoreBar(section) {
    const id = section.id;
    return `<div style="display:none">
      <span id="${id}-score">0</span><span id="${id}-total">0</span>
      <span id="${id}-due">0</span><span id="${id}-deck-total">0</span>
    </div>`;
  }

  _buildMathScoreBar(section) {
    const id = section.id;
    return `<div style="display:none">
      <span id="${id}-score">0</span><span id="${id}-total">0</span>
      <span id="${id}-streak">0</span><span id="${id}-best-streak">0</span>
    </div>`;
  }

  // ─── MCQ Card ───
  _buildMcArea(section) {
    const id = section.id;
    const hasPassage = section.type === 'passage-quiz';
    const hasImages = section.hasImages;

    let html = `<div id="${id}-quiz-area" class="card">
      <span class="rating-flash" id="${id}-rating-flash"></span>`;

    if (hasPassage) {
      const instruction = section.instruction || 'Read the passage, then answer the question.';
      html += `<h3>${instruction}</h3>`;
      html += `<div id="${id}-passage" class="passage"></div>`;
    }

    html += `<div class="question-header"><div class="question-text" id="${id}-question"></div><span class="timer" id="${id}-timer">0s</span></div>`;

    if (hasImages) {
      /* view-img moved to score bar */
    }

    html += `<div class="options" id="${id}-options"></div>`;
    html += `<div id="${id}-dk-area"></div>`;
    html += `<div class="feedback" id="${id}-feedback"></div>`;

    // Rating UI (FSRS — MCQ only)
    html += `<div class="rating-area" id="${id}-rating-area" style="display:none"></div>`;

    // Card actions: undo, suspend, bury (MCQ only)
    html += `<div class="card-actions" id="${id}-card-actions" style="display:none">
      <button class="action-sm" data-action="undo" title="Undo (Z)">Undo</button>
      <button class="action-sm" data-action="suspend" title="Suspend (S)">Suspend</button>
      <button class="action-sm" data-action="bury" title="Bury (B)">Bury</button>
    </div>`;

    // State badge (MCQ only)
    html += `<span class="state-badge" id="${id}-state-badge"></span>`;

    html += `<div class="skip-prompt" id="${id}-skip-prompt">Press <kbd>D</kbd> again to skip</div>`;
    html += `<div class="key-hints" style="display:none"><kbd>1-4</kbd> answer/rate \u00b7 <kbd>D</kbd> x2 skip \u00b7 <kbd>Z</kbd> undo \u00b7 <kbd>S</kbd> suspend \u00b7 <kbd>B</kbd> bury${hasImages ? ' \u00b7 <kbd>R</kbd> image' : ''}</div>`;
    html += '</div>';
    html += `<button class="next-btn" id="${id}-next" style="display:none">next</button>`;

    return html;
  }

  // ─── Math Card ───
  _buildMathArea(section) {
    const id = section.id;

    let html = `<div class="math-category-btns" id="${id}-cats">
      <button class="active" data-cat="all">All</button>`;
    for (const gen of section.generators) {
      const label = gen.charAt(0).toUpperCase() + gen.slice(1);
      html += `<button data-cat="${gen}">${label === 'Conversion' ? 'Unit Conversions' : label === 'Average' ? 'Averages' : label === 'Percent' ? 'Percentages' : label === 'Decimal' ? 'Decimals' : label}</button>`;
    }
    html += '</div>';

    html += `<div id="${id}-quiz-area" class="card">
      <span class="timer" id="${id}-timer">0s</span>
      <div class="question-text" id="${id}-question"></div>
      <div class="math-input">
        <input type="text" id="${id}-answer" placeholder="Your answer">
        <button id="${id}-submit">Submit</button>
      </div>
      <div id="${id}-dk-area"></div>
      <div class="feedback" id="${id}-feedback"></div>
      <div class="math-steps" id="${id}-math-steps" style="display:none"></div>
      <div class="skip-prompt" id="${id}-skip-prompt">Press <kbd>D</kbd> again to skip</div>
      <div class="key-hints" style="display:none"><kbd>Enter</kbd> submit \u00b7 <kbd>Space</kbd>/<kbd>D</kbd> next \u00b7 <kbd>D</kbd> x2 skip</div>
    </div>
    <button class="next-btn" id="${id}-next" style="display:none">New Problem</button>`;

    return html;
  }

  // ─── Flashcards (MCQ only) ───
  _buildFlashcardArea(section) {
    const id = section.id;
    return `<div id="${id}-flash-area" style="display:none">
      <label class="flash-order-toggle" title="Show definition first">
        <input type="checkbox" id="${id}-flash-order">
        <span>definition first</span>
      </label>
      <div class="flashcard-container">
        <div class="flashcard" id="${id}-flashcard">
          <div class="flashcard-face flashcard-front" id="${id}-flash-front"></div>
          <div class="flashcard-face flashcard-back" id="${id}-flash-back"></div>
        </div>
      </div>
      <div class="flashcard-hint">Click card to flip</div>
      <div class="flashcard-nav">
        <button id="${id}-flash-prev">Previous</button>
        <span id="${id}-flash-counter"></span>
        <button id="${id}-flash-next">Next</button>
      </div>
    </div>`;
  }
}
