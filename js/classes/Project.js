/**
 * Project loader and validator.
 *
 * A project defines sections, questions, glossary, and FSRS config.
 * Can load from a built-in default or a user-provided JSON file.
 */

export class Project {
  constructor(data) {
    this.name = data.name;
    this.version = data.version || 1;
    this.config = {
      desired_retention: 0.9,
      learn_steps: [1, 10],
      new_per_session: 20,
      leech_threshold: 8,
      imageSearchSuffix: '',
      ...data.config,
    };
    this.sections = data.sections || [];
    this.glossary = data.glossary || [];
    this.slug = this._slugify(data.name);

    // Build card ID maps for each section
    this._buildCardIds();
  }

  /** Build card ID arrays for each section */
  _buildCardIds() {
    for (const section of this.sections) {
      section.cardIds = [];
      section.flashCardIds = [];

      if (section.type === 'mc-quiz') {
        section.questions.forEach((_, i) => {
          section.cardIds.push(section.id + '-' + i);
        });
      } else if (section.type === 'passage-quiz') {
        section.scenarios.forEach((s, si) => {
          s.questions.forEach((_, qi) => {
            section.cardIds.push(section.id + '-' + si + '-' + qi);
          });
        });
      } else if (section.type === 'math-gen') {
        // Math cards are generated, no fixed IDs
        section.cardIds = [];
      }

      // Flashcard IDs (separate FSRS deck)
      if (section.flashcards) {
        section.flashcards.forEach((_, i) => {
          section.flashCardIds.push(section.id + '-flash-' + i);
        });
      }
    }
  }

  /** Get a section by ID */
  getSection(id) {
    return this.sections.find(s => s.id === id);
  }

  /** Get all card IDs across all sections */
  getAllCardIds() {
    return this.sections.flatMap(s => s.cardIds);
  }

  _slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /**
   * Validate project data. Returns array of error strings (empty = valid).
   * @param {object} data
   * @returns {string[]}
   */
  static validate(data) {
    const errors = [];
    if (!data.name) errors.push('Missing project name');
    if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
      errors.push('No sections defined');
    } else {
      for (const s of data.sections) {
        if (!s.id) errors.push('Section missing id');
        if (!s.name) errors.push('Section missing name');
        if (!s.type) errors.push(`Section "${s.name || s.id}" missing type`);
        if (s.type === 'mc-quiz' && (!s.questions || s.questions.length === 0)) {
          errors.push(`Section "${s.name}" has no questions`);
        }
        if (s.type === 'passage-quiz' && (!s.scenarios || s.scenarios.length === 0)) {
          errors.push(`Section "${s.name}" has no scenarios`);
        }
        if (s.type === 'math-gen' && (!s.generators || s.generators.length === 0)) {
          errors.push(`Section "${s.name}" has no generators`);
        }
      }
    }
    return errors;
  }
}
