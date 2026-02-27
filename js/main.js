/**
 * ENTRY POINT — Study Tool (FSRS Edition)
 *
 * Two distinct modes:
 *   MCQ Mode  — FSRS scheduling, rating, card actions, terms, easy mode
 *   Math Mode — streak tracking, category filters, step-by-step solutions
 * Shared: timer, score, skip, keyboard navigation
 */

import { shuffle, imgLink, pick, round2 } from './classes/Utils.js';
import { FSRSEngine, Rating } from './classes/FSRS.js';
import { CardManager } from './classes/CardManager.js';
import { Project } from './classes/Project.js';
import { State } from './classes/State.js';
import { Timer } from './classes/Timer.js';
import { Glossary } from './classes/Glossary.js';
import { SectionRenderer } from './classes/SectionRenderer.js';
import { RatingUI } from './classes/RatingUI.js';
import { Stats } from './classes/Stats.js';
import { Migration } from './classes/Migration.js';
import { ActivityScore } from './classes/ActivityScore.js';
import { mathGenerators } from './data/math.js';
import { projectRegistry } from '../projects/registry.js';

// ===== LATEX RENDERING =====
function renderLatex(element) {
  if (window.renderMathInElement) {
    renderMathInElement(element, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      throwOnError: false,
    });
  }
}

// ===== APP STATE =====
let project = null;
let engine = null;
let cardMgr = null;
let state = null;
let timer = new Timer();
let glossary = null;
let stats = new Stats();
let ratingUI = null;
let activityScore = null;

let activeTab = null;
let easyMode = localStorage.getItem('easy-mode') !== 'false';   // Simple mode: auto-rate based on answer time (on by default)
let zenMode = localStorage.getItem('zen-mode') === 'true';    // Focus mode: hide extra UI
let syncActivity = localStorage.getItem('sync-activity') !== 'false'; // Sync activity trendline across sections (on by default)

// ─── Shared state ───
const quizState = {};   // sectionId -> 'answering'|'revealed'|'rated'
const pending = {};     // sectionId -> skip pending?

// ─── MCQ state ───
const currentCard = {};  // sectionId -> card ID
const currentQ = {};     // sectionId -> question object
const history = {};      // sectionId -> [{ idx }]
const histPos = {};      // sectionId -> position
const scenarioIdx = {};  // sectionId -> current scenario index
const scenarioQIdx = {}; // sectionId -> current question within scenario
const flashState = {};   // sectionId -> { idx }
const currentOptOrder = {};  // sectionId -> shuffled options array

// ─── Math state ───
const mathState = {};    // sectionId -> { cat, ans, unit, ex, steps, streak, bestStreak }

// ===== LAUNCHER =====
function initLauncher() {
  const launchFile = document.getElementById('launch-file');
  const fileInput = document.getElementById('file-input');

  // Build project buttons from registry
  const buttonsContainer = document.getElementById('launcher-buttons');
  for (const proj of projectRegistry) {
    const btn = document.createElement('button');
    btn.className = 'launcher-btn launcher-btn-primary';
    btn.textContent = proj.name;
    btn.addEventListener('click', async () => {
      const data = await proj.loader();
      loadProject(data, true);
    });
    buttonsContainer.insertBefore(btn, launchFile);
  }

  launchFile.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const errors = Project.validate(data);
        if (errors.length > 0) {
          showLauncherError('Invalid project: ' + errors.join(', '));
          return;
        }
        loadProject(data, false);
      } catch (err) {
        showLauncherError('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Drag and drop
  const dropZone = document.getElementById('drop-zone');
  if (dropZone) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file || !file.name.endsWith('.json')) {
        showLauncherError('Please drop a .json file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const errors = Project.validate(data);
          if (errors.length > 0) { showLauncherError('Invalid project: ' + errors.join(', ')); return; }
          loadProject(data, false);
        } catch (err) { showLauncherError('Failed to parse JSON: ' + err.message); }
      };
      reader.readAsText(file);
    });
  }

  renderRecentProjects();

  // Auto-load last project
  const lastSlug = State.getLastProject();
  if (lastSlug) {
    const registryEntry = projectRegistry.find(p => p.slug === lastSlug);
    if (registryEntry) {
      registryEntry.loader().then(data => loadProject(data, true));
    } else {
      const savedData = State.getProjectData(lastSlug);
      if (savedData) loadProject(savedData, false);
    }
  }
}

function renderRecentProjects() {
  const container = document.getElementById('launcher-recent');
  const recent = State.getRecentProjects();
  if (recent.length === 0) { container.innerHTML = ''; return; }

  let html = '<h3>Recent Projects</h3>';
  for (const p of recent) {
    html += `<button class="launcher-recent-item" data-slug="${p.slug}">${p.name}</button>`;
  }
  container.innerHTML = html;

  container.querySelectorAll('.launcher-recent-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug = btn.dataset.slug;
      const registryEntry = projectRegistry.find(p => p.slug === slug);
      if (registryEntry) {
        registryEntry.loader().then(data => loadProject(data, true));
      } else {
        const savedData = State.getProjectData(slug);
        if (savedData) loadProject(savedData, false);
        else showLauncherError('Project data not found. Please re-import the file.');
      }
    });
  });
}

function showLauncherError(msg) {
  const el = document.getElementById('launcher-error');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

// ===== PROJECT LOADING =====
function loadProject(data, isDefault) {
  project = new Project(data);

  engine = new FSRSEngine({
    desired_retention: project.config.desired_retention,
    leech_threshold: project.config.leech_threshold,
  });

  if (isDefault) Migration.run(project.slug, engine);

  cardMgr = new CardManager(engine, {
    newPerSession: project.config.new_per_session,
  });

  state = new State(project.slug);
  state.initScores(project.sections.map(s => s.id));
  const cardData = state.load();
  if (cardData) cardMgr.fromJSON(cardData);

  if (!isDefault) State.saveProjectData(project.slug, data);
  State.setLastProject(project.slug);
  State.addRecentProject(project.name, project.slug);

  // MCQ: glossary, rating UI, stats
  glossary = new Glossary(state);
  glossary.build(project.glossary);
  glossary.initPanel();
  // glossary tags rendered per-question in renderMc()

  ratingUI = new RatingUI((sectionId, rating) => handleRate(sectionId, rating));
  stats = new Stats();
  stats.loadForProject(project.slug);
  stats.bind(document.getElementById('activity-stats'));

  // Activity score
  activityScore = new ActivityScore(
    document.getElementById('activity-chart'),
    document.getElementById('activity-score')
  );
  activityScore.load(state.loadActivity());
  activityScore.render();

  // Build UI
  document.getElementById('app-title').textContent = project.name;
  buildTabs();
  const renderer = new SectionRenderer();
  renderer.render(document.getElementById('sections-container'), project);

  wireEvents();

  document.getElementById('launcher').style.display = 'none';
  document.getElementById('study-app').style.display = '';

  for (const section of project.sections) {
    initSectionState(section.id);
  }

  if (project.sections.length > 0) activateTab(project.sections[0].id);

  for (const section of project.sections) {
    updateScore(section.id);
    renderSection(section.id);
  }
  updateAllDue();

  // First-time tips: show key-hints on first load, then auto-hide after 6s
  if (!localStorage.getItem('tips-seen')) {
    const hints = document.querySelectorAll('.key-hints');
    hints.forEach(h => h.style.display = '');
    setTimeout(() => {
      hints.forEach(h => h.style.display = 'none');
      localStorage.setItem('tips-seen', '1');
    }, 6000);
  }
}

function buildTabs() {
  const tabContainer = document.getElementById('tabs');
  tabContainer.innerHTML = '';
  for (const section of project.sections) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.tab = section.id;
    btn.textContent = section.name;
    tabContainer.appendChild(btn);
  }
}

function activateTab(sectionId) {
  // Pause timer when switching away from current tab
  if (activeTab && activeTab !== sectionId) timer.stop();

  activeTab = sectionId;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const sectionEl = document.getElementById(sectionId);
  if (sectionEl) sectionEl.classList.add('active');
  const tabBtn = document.querySelector(`.tab-btn[data-tab="${sectionId}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  const section = project.getSection(sectionId);
  const isMath = section?.type === 'math-gen';

  // MCQ-only UI: easy mode toggle, terms panel, activity widget
  const easyEl = document.getElementById('easy-toggle');
  if (easyEl) easyEl.style.display = isMath ? 'none' : '';
  const sidebar = document.getElementById('sidebar-right');
  if (sidebar) sidebar.style.display = isMath ? 'none' : '';

  // Update activity widget for this section (only filter when sync is off)
  if (activityScore) {
    activityScore.setSection(syncActivity ? null : sectionId);
    activityScore.render();
  }
  updateSidebarScore();

  // Refresh glossary terms for the current question in this tab
  if (glossary && !isMath) {
    const q = currentQ[sectionId];
    if (q) {
      const imgName = q.imageName || q.cropName;
      glossary.setQuestionContext(q.q + ' ' + q.correct + ' ' + (imgName || '') + ' ' + (q.explanation || ''));
    } else {
      glossary.setQuestionContext('');
    }
    glossary.renderContextTags(document.getElementById('activity-terms'));
  }

  // Math: focus input
  if (isMath) {
    const inp = document.getElementById(sectionId + '-answer');
    if (inp && !inp.disabled) inp.focus();
  }
}

function initSectionState(sectionId) {
  quizState[sectionId] = 'answering';
  pending[sectionId] = false;

  const section = project.getSection(sectionId);
  if (section?.type === 'math-gen') {
    // Math-specific init
    mathState[sectionId] = { cat: 'all', ans: 0, unit: '', ex: '', steps: [], streak: 0, bestStreak: 0 };
  } else {
    // MCQ-specific init
    if (!history[sectionId]) history[sectionId] = [];
    if (histPos[sectionId] == null) histPos[sectionId] = -1;
    scenarioIdx[sectionId] = 0;
    scenarioQIdx[sectionId] = 0;
    flashState[sectionId] = { idx: 0 };
  }
}

// ===== EVENT WIRING =====
function wireEvents() {
  // Tabs
  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn) activateTab(btn.dataset.tab);
  });

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => goToLauncher());

  const container = document.getElementById('sections-container');

  // ─── Shared events ───
  container.addEventListener('click', (e) => {
    const nextBtn = e.target.closest('.next-btn');
    if (nextBtn) {
      const section = nextBtn.closest('.section');
      if (section) nextQ(section.id);
    }
  });

  container.addEventListener('click', (e) => {
    const resetBtn = e.target.closest('.reset-btn');
    if (resetBtn) resetSection(resetBtn.dataset.section);
  });

  // ─── MCQ events ───
  container.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('.action-sm');
    if (!actionBtn) return;
    const section = actionBtn.closest('.section');
    if (!section) return;
    const action = actionBtn.dataset.action;
    if (action === 'undo') handleUndo(section.id);
    else if (action === 'suspend') handleSuspend(section.id);
    else if (action === 'bury') handleBury(section.id);
  });

  container.addEventListener('click', (e) => {
    const modeBtn = e.target.closest('.mode-btn');
    if (!modeBtn) return;
    const section = modeBtn.closest('.section');
    if (!section) return;
    const sectionId = section.id;
    const mode = modeBtn.dataset.mode;
    document.getElementById(sectionId + '-quiz-btn')?.classList.toggle('active', mode === 'quiz');
    document.getElementById(sectionId + '-flash-btn')?.classList.toggle('active', mode === 'flash');
    document.getElementById(sectionId + '-quiz-area').style.display = mode === 'quiz' ? 'block' : 'none';
    document.getElementById(sectionId + '-flash-area').style.display = mode === 'flash' ? 'block' : 'none';
    if (mode === 'flash') renderFlashcard(sectionId);
  });

  container.addEventListener('click', (e) => {
    const flashcard = e.target.closest('.flashcard');
    if (flashcard) flashcard.classList.toggle('flipped');

    const flashNext = e.target.closest('[id$="-flash-next"]');
    if (flashNext) {
      const sectionId = flashNext.id.replace('-flash-next', '');
      const sectionData = project.getSection(sectionId);
      if (sectionData?.flashcards) {
        flashState[sectionId].idx = (flashState[sectionId].idx + 1) % sectionData.flashcards.length;
        renderFlashcard(sectionId);
      }
    }

    const flashPrev = e.target.closest('[id$="-flash-prev"]');
    if (flashPrev) {
      const sectionId = flashPrev.id.replace('-flash-prev', '');
      const sectionData = project.getSection(sectionId);
      if (sectionData?.flashcards) {
        const len = sectionData.flashcards.length;
        flashState[sectionId].idx = (flashState[sectionId].idx - 1 + len) % len;
        renderFlashcard(sectionId);
      }
    }
  });

  // Flashcard order toggle — re-render on change
  container.addEventListener('change', (e) => {
    if (e.target.id && e.target.id.endsWith('-flash-order')) {
      const sectionId = e.target.id.replace('-flash-order', '');
      renderFlashcard(sectionId);
    }
  });

  // MCQ: easy mode toggle
  const easyToggle = document.getElementById('easy-mode-toggle');
  if (easyToggle) {
    easyToggle.checked = easyMode;
    easyToggle.addEventListener('change', () => { easyMode = easyToggle.checked; localStorage.setItem('easy-mode', easyMode); });
  }

  // Zen mode toggle
  const zenToggle = document.getElementById('zen-mode-toggle');
  if (zenToggle) {
    zenToggle.checked = zenMode;
    if (zenMode) document.getElementById('study-app').classList.add('zen');
    zenToggle.addEventListener('change', () => {
      zenMode = zenToggle.checked;
      localStorage.setItem('zen-mode', zenMode);
      document.getElementById('study-app').classList.toggle('zen', zenMode);
    });
  }

  // Sync activity toggle
  const syncToggle = document.getElementById('sync-activity-toggle');
  if (syncToggle) {
    syncToggle.checked = syncActivity;
    syncToggle.addEventListener('change', () => {
      syncActivity = syncToggle.checked;
      localStorage.setItem('sync-activity', syncActivity);
      // Reset activity data on toggle
      if (activityScore) {
        activityScore.load([]);
        state.saveActivity([]);
        if (!syncActivity && activeTab) activityScore.setSection(activeTab);
        else activityScore.setSection(null);
        activityScore.render();
      }
      updateSidebarScore();
    });
  }

  // Header pull tab
  const headerPull = document.getElementById('header-pull');
  const headerWrap = document.getElementById('header-wrap');
  if (headerPull && headerWrap) {
    headerPull.addEventListener('click', () => {
      headerWrap.classList.toggle('header-visible');
      headerPull.innerHTML = headerWrap.classList.contains('header-visible') ? '&#9650;' : '&#9660;';
    });
  }

  // Tips button — toggle key-hints visibility
  const tipsBtn = document.getElementById('tips-btn');
  if (tipsBtn) {
    tipsBtn.addEventListener('click', () => {
      const hints = document.querySelectorAll('.key-hints');
      const showing = hints.length > 0 && hints[0].style.display !== 'none';
      hints.forEach(h => h.style.display = showing ? 'none' : '');
      if (!showing) {
        setTimeout(() => hints.forEach(h => h.style.display = 'none'), 6000);
      }
    });
  }

  // Terms dropdown toggle with click-outside-to-close
  const termsBtn = document.getElementById('terms-toggle-btn');
  const termsList = document.getElementById('terms-list-wrap');
  const termsDropdown = document.getElementById('terms-dropdown');
  if (termsBtn && termsList && termsDropdown) {
    const togglesEl = document.getElementById('top-toggles');
    const closeTerms = () => {
      termsList.style.display = 'none';
      termsBtn.innerHTML = 'Terms &#9660;';
      if (togglesEl) togglesEl.classList.remove('hidden');
    };
    const openTerms = () => {
      termsList.style.display = '';
      termsBtn.innerHTML = 'Terms &#9650;';
      if (togglesEl) togglesEl.classList.add('hidden');
    };
    termsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      termsList.style.display !== 'none' ? closeTerms() : openTerms();
    });
    document.addEventListener('click', (e) => {
      if (termsList.style.display !== 'none' && !termsDropdown.contains(e.target)) {
        closeTerms();
      }
    });

  }

  // Activity widget reset button
  const activityResetBtn = document.getElementById('activity-reset-btn');
  if (activityResetBtn) {
    activityResetBtn.addEventListener('click', () => {
      if (!confirm('Reset all activity data?')) return;
      state.archiveAndClearActivity();
      activityScore.load([]);
      activityScore.render();
      updateSidebarScore();
    });
  }

  // ─── Math events ───
  container.addEventListener('click', (e) => {
    const submitBtn = e.target.closest('[id$="-submit"]');
    if (submitBtn) {
      const sectionId = submitBtn.id.replace('-submit', '');
      checkMath(sectionId);
    }
  });

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[id$="-answer"]')) {
      const sectionId = e.target.id.replace('-answer', '');
      if (quizState[sectionId] === 'revealed') {
        e.preventDefault();
        nextQ(sectionId);
      } else {
        checkMath(sectionId);
      }
    }
    if (e.code === 'Space' && e.target.matches('[id$="-answer"]') && e.target.disabled) {
      e.preventDefault();
      const sectionId = e.target.id.replace('-answer', '');
      if (quizState[sectionId] === 'revealed') nextQ(sectionId);
    }
  });

  container.addEventListener('click', (e) => {
    const catBtn = e.target.closest('.math-category-btns button');
    if (!catBtn) return;
    const catContainer = catBtn.closest('.math-category-btns');
    const sectionId = catContainer.id.replace('-cats', '');
    mathState[sectionId].cat = catBtn.dataset.cat;
    catContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    catBtn.classList.add('active');
    renderSection(sectionId);
  });

  // Keyboard
  document.addEventListener('keydown', handleKeyboard);
}

// ===== RENDER SECTION =====
function renderSection(sectionId) {
  const section = project.getSection(sectionId);
  if (!section) return;

  if (section.type === 'mc-quiz') renderMcQuiz(sectionId);
  else if (section.type === 'passage-quiz') renderPassageQuiz(sectionId);
  else if (section.type === 'math-gen') renderMathProblem(sectionId);
}

// ═══════════════════════════════════════════════════════════════════════════
//  MCQ MODE — FSRS scheduling, rating, card actions, terms, easy mode
// ═══════════════════════════════════════════════════════════════════════════

function renderMcQuiz(sectionId) {
  const section = project.getSection(sectionId);
  if (!section || section.cardIds.length === 0) return;

  const cardId = cardMgr.pickNext(section.cardIds);
  if (!cardId) return;
  const idx = parseInt(cardId.split('-').pop());
  const q = section.questions[idx];
  if (!q) return;

  currentCard[sectionId] = cardId;
  currentQ[sectionId] = q;

  histPos[sectionId] = (histPos[sectionId] || 0) + 1;
  history[sectionId] = (history[sectionId] || []).slice(0, histPos[sectionId]);
  history[sectionId].push({ idx });

  renderMc(sectionId, q);
}

function renderMcForced(sectionId, idx, histEntry) {
  const section = project.getSection(sectionId);
  if (!section) return;
  const q = section.questions[idx];
  if (!q) return;

  currentCard[sectionId] = section.id + '-' + idx;
  currentQ[sectionId] = q;

  // If we have answer state from history, replay it instead of a fresh question
  if (histEntry && histEntry.optionOrder) {
    quizState[sectionId] = 'reviewing-history';
    pending[sectionId] = false;
    timer.stop();

    const sp = document.getElementById(sectionId + '-skip-prompt');
    if (sp) sp.classList.remove('show');

    const questionEl = document.getElementById(sectionId + '-question');
    questionEl.textContent = q.q;
    renderLatex(questionEl);

    const iv = document.getElementById(sectionId + '-view-img');
    const imgName = q.imageName || q.cropName;
    if (iv) iv.innerHTML = imgName ? imgLink(imgName, project.config.imageSearchSuffix) : '';

    // Render options in the original order, with answer highlights
    const con = document.getElementById(sectionId + '-options');
    con.innerHTML = '';
    histEntry.optionOrder.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = o;
      btn.disabled = true;
      if (o === histEntry.correct) btn.classList.add('correct');
      if (o === histEntry.selected && !histEntry.isCorrect) btn.classList.add('wrong');
      renderLatex(btn);
      con.appendChild(btn);
    });

    // Hide DK button
    const dka = document.getElementById(sectionId + '-dk-area');
    if (dka) dka.innerHTML = '';

    // Show feedback on the selected/correct button
    const optBtns = document.getElementById(sectionId + '-options').querySelectorAll('.option-btn');
    if (histEntry.skipped) {
      const cBtn = [...optBtns].find(b => b.textContent === histEntry.correct);
      if (cBtn) showOptionFeedback(cBtn, 'skip-fb', 'Answer: ' + histEntry.correct, histEntry.explanation);
    } else if (histEntry.isCorrect) {
      const cBtn = [...optBtns].find(b => b.textContent === histEntry.correct);
      if (cBtn) showOptionFeedback(cBtn, 'correct-fb', 'Correct!', histEntry.explanation);
    } else {
      const wBtn = [...optBtns].find(b => b.textContent === histEntry.selected);
      if (wBtn) showOptionFeedback(wBtn, 'wrong-fb', 'Incorrect. Answer: ' + histEntry.correct, histEntry.explanation);
    }

    // Hide rating, actions, badge
    ratingUI.hide(sectionId);
    hideCardActions(sectionId);
    hideStateBadge(sectionId);
    document.getElementById(sectionId + '-next').classList.remove('show');

    // Show history hint
    const hintId = sectionId + '-history-hint';
    let hint = document.getElementById(hintId);
    if (!hint) {
      hint = document.createElement('div');
      hint.id = hintId;
      hint.className = 'key-hints';
      hint.style.marginTop = '12px';
      fb.parentNode.insertBefore(hint, fb.nextSibling);
    }
    hint.innerHTML = 'Reviewing previous — press <kbd>D</kbd> or <kbd>&rarr;</kbd> for next';
    hint.style.display = '';
  } else {
    renderMc(sectionId, q);
  }
}

function renderPassageQuiz(sectionId) {
  const section = project.getSection(sectionId);
  if (!section || !section.scenarios || section.scenarios.length === 0) return;

  if (scenarioQIdx[sectionId] === 0) {
    scenarioIdx[sectionId] = pickBestScenario(sectionId, section);
  }

  const si = scenarioIdx[sectionId];
  const scenario = section.scenarios[si];
  const qi = scenarioQIdx[sectionId];
  const q = scenario.questions[qi];

  const cardId = sectionId + '-' + si + '-' + qi;
  currentCard[sectionId] = cardId;
  currentQ[sectionId] = q;

  const passageEl = document.getElementById(sectionId + '-passage');
  if (passageEl) {
    passageEl.innerHTML = scenario.passage +
      (scenario.source ? '<span class="source">' + scenario.source + '</span>' : '');
  }

  renderMc(sectionId, q);
}

function pickBestScenario(sectionId, section) {
  const now = new Date();
  let best = 0, bestScore = Infinity;
  section.scenarios.forEach((s, si) => {
    let score = 0;
    s.questions.forEach((_, qi) => {
      const id = sectionId + '-' + si + '-' + qi;
      const entry = cardMgr.cards[id];
      if (!entry) score -= 1e12;
      else if (new Date(entry.fsrsCard.due) <= now) score -= 1e6;
      else score += (entry.fsrsCard.stability || 0);
    });
    if (score < bestScore) { bestScore = score; best = si; }
  });
  return best;
}

// ─── Generic MC render (shared by mc-quiz and passage-quiz) ───
function renderMc(sectionId, q) {
  quizState[sectionId] = 'answering';
  pending[sectionId] = false;

  const sp = document.getElementById(sectionId + '-skip-prompt');
  if (sp) sp.classList.remove('show');

  timer.start(sectionId);

  const questionEl = document.getElementById(sectionId + '-question');
  questionEl.textContent = q.q;
  renderLatex(questionEl);

  // MCQ: update glossary context
  const imgName = q.imageName || q.cropName;
  glossary.setQuestionContext(q.q + ' ' + q.correct + ' ' + (imgName || '') + ' ' + (q.explanation || ''));
  glossary.renderContextTags(document.getElementById('activity-terms'));

  // View image
  const iv = document.getElementById(sectionId + '-view-img');
  if (iv) iv.innerHTML = imgName ? imgLink(imgName, project.config.imageSearchSuffix) : '';

  // Options
  const opts = shuffle([q.correct, ...q.wrong]);
  currentOptOrder[sectionId] = [...opts];
  const con = document.getElementById(sectionId + '-options');
  con.innerHTML = '';
  opts.forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = o;
    renderLatex(btn);
    btn.addEventListener('click', () => answerMc(sectionId, btn, o, q));
    con.appendChild(btn);
  });

  // "I Don't Know"
  const dka = document.getElementById(sectionId + '-dk-area');
  if (dka) {
    dka.innerHTML = '';
    const dk = document.createElement('button');
    dk.className = 'dk-btn';
    dk.textContent = "I Don't Know";
    dk.addEventListener('click', () => doSkip(sectionId));
    dka.appendChild(dk);
  }

  // Reset feedback, rating, actions, badge
  const fb = document.getElementById(sectionId + '-feedback');
  fb.className = 'feedback';
  fb.textContent = '';
  document.getElementById(sectionId + '-options')?.querySelectorAll('.option-feedback').forEach(el => el.remove());

  ratingUI.hide(sectionId);
  hideCardActions(sectionId);
  hideStateBadge(sectionId);

  document.getElementById(sectionId + '-next').classList.remove('show');

  // Hide history hint if present
  const histHint = document.getElementById(sectionId + '-history-hint');
  if (histHint) histHint.style.display = 'none';
}

// ─── MCQ: Easy mode helpers ───
function timeToRating(seconds) {
  if (seconds >= 59) return Rating.Again;
  if (seconds >= 40) return Rating.Hard;
  if (seconds >= 8) return Rating.Good;
  return Rating.Easy;
}

const ratingLabels = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
const ratingClasses = { 1: 'flash-again', 2: 'flash-hard', 3: 'flash-good', 4: 'flash-easy' };

function showRatingFlash(sectionId, rating) {
  const el = document.getElementById(sectionId + '-rating-flash');
  if (!el) return;
  el.className = 'rating-flash';
  el.textContent = ratingLabels[rating] || '';
  void el.offsetWidth;
  el.classList.add('show', ratingClasses[rating] || '');
}

// ─── Feedback overlay on option button ───
function showOptionFeedback(btn, type, text, explanation) {
  // Remove any existing overlays in this options group
  btn.closest('.options')?.querySelectorAll('.option-feedback').forEach(el => el.remove());
  const overlay = document.createElement('div');
  overlay.className = 'option-feedback ' + type;
  overlay.innerHTML = text + (explanation ? '<span class="explanation">' + explanation + '</span>' : '');
  btn.appendChild(overlay);
  renderLatex(overlay);
}

// ─── MCQ: Answer ───
function answerMc(sectionId, btn, selected, q) {
  if (quizState[sectionId] !== 'answering') return;
  quizState[sectionId] = 'revealed';
  const elapsed = timer.stop();

  document.getElementById(sectionId + '-options').querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  const dkb = document.getElementById(sectionId + '-dk-area')?.querySelector('.dk-btn');
  if (dkb) dkb.disabled = true;

  const assisted = glossary.checkAssisted(q.q + ' ' + q.correct);

  state.scores[sectionId].attempted++;
  const isCorrect = selected === q.correct;

  if (isCorrect) {
    btn.classList.add('correct');
    state.scores[sectionId].correct++;
    showOptionFeedback(btn, 'correct-fb', 'Correct!', q.explanation);
  } else {
    btn.classList.add('wrong');
    document.getElementById(sectionId + '-options').querySelectorAll('.option-btn').forEach(b => {
      if (b.textContent === q.correct) b.classList.add('correct');
    });
    showOptionFeedback(btn, 'wrong-fb', 'Incorrect. Answer: ' + q.correct, q.explanation);
  }

  // Save answer state to history for go-back replay
  const histEntry = history[sectionId]?.[histPos[sectionId] - 1];
  if (histEntry) {
    histEntry.selected = selected;
    histEntry.correct = q.correct;
    histEntry.optionOrder = currentOptOrder[sectionId];
    histEntry.isCorrect = isCorrect;
    histEntry.explanation = q.explanation || '';
  }

  updateScore(sectionId);

  const cardId = currentCard[sectionId];
  if (cardId) {
    cardMgr.getOrCreate(cardId);

    if (easyMode) {
      const autoRating = isCorrect ? timeToRating(elapsed) : Rating.Again;
      showRatingFlash(sectionId, autoRating);
      handleRate(sectionId, autoRating);
    } else {
      const intervals = cardMgr.getPreview(cardId);
      ratingUI.show(sectionId, intervals);
      showCardActions(sectionId);
      showStateBadge(sectionId, cardId);
    }
  }
}

// ─── MCQ: Skip ("I Don't Know") ───
function doSkip(sectionId) {
  if (quizState[sectionId] !== 'answering') return;
  quizState[sectionId] = 'revealed';
  timer.stop();

  const q = currentQ[sectionId];
  document.getElementById(sectionId + '-options').querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (b.textContent === q.correct) b.classList.add('correct');
  });
  const dkb = document.getElementById(sectionId + '-dk-area')?.querySelector('.dk-btn');
  if (dkb) dkb.disabled = true;

  state.scores[sectionId].attempted++;
  // Show skip feedback on the correct answer button
  const correctBtn = [...document.getElementById(sectionId + '-options').querySelectorAll('.option-btn')].find(b => b.textContent === q.correct);
  if (correctBtn) showOptionFeedback(correctBtn, 'skip-fb', 'Answer: ' + q.correct, q.explanation);

  // Save skip state to history
  const histEntry = history[sectionId]?.[histPos[sectionId] - 1];
  if (histEntry) {
    histEntry.selected = null;
    histEntry.correct = q.correct;
    histEntry.optionOrder = currentOptOrder[sectionId];
    histEntry.isCorrect = false;
    histEntry.skipped = true;
    histEntry.explanation = q.explanation || '';
  }

  updateScore(sectionId);

  const cardId = currentCard[sectionId];
  if (cardId) {
    showRatingFlash(sectionId, Rating.Again);
    handleRate(sectionId, Rating.Again);
  }
}

// ─── MCQ: Rating (FSRS) ───
function handleRate(sectionId, rating) {
  if (quizState[sectionId] !== 'revealed') return;
  quizState[sectionId] = 'rated';

  const cardId = currentCard[sectionId];
  if (cardId) {
    const result = cardMgr.review(cardId, rating);
    stats.record(rating);

    // Record activity
    const isCorrect = rating !== 1;
    if (activityScore) {
      activityScore.addEntry(rating, isCorrect, sectionId);
      activityScore.render();
      state.saveActivity(activityScore.toJSON());
    }

    if (result.isLeech) {
      const fb = document.getElementById(sectionId + '-feedback');
      fb.innerHTML += '<span class="explanation">This card is a leech (frequently forgotten). Consider reviewing the material.</span>';
    }
  }

  ratingUI.hide(sectionId);
  hideCardActions(sectionId);
  document.getElementById(sectionId + '-next').classList.add('show');

  state.save(cardMgr);
  updateAllDue();
}

// ─── MCQ: Card actions ───
function showCardActions(sectionId) {
  const el = document.getElementById(sectionId + '-card-actions');
  if (el) el.style.display = 'flex';
}
function hideCardActions(sectionId) {
  const el = document.getElementById(sectionId + '-card-actions');
  if (el) el.style.display = 'none';
}

function showStateBadge(sectionId, cardId) {
  const badge = document.getElementById(sectionId + '-state-badge');
  if (!badge) return;
  const fsrsState = cardMgr.getState(cardId);
  const labels = { 0: 'NEW', 1: 'LEARNING', 2: 'REVIEW', 3: 'RELEARNING' };
  const classes = { 0: 'state-new', 1: 'state-learning', 2: 'state-review', 3: 'state-relearning' };
  badge.textContent = labels[fsrsState] || 'NEW';
  badge.className = 'state-badge ' + (classes[fsrsState] || 'state-new');
}
function hideStateBadge(sectionId) {
  const badge = document.getElementById(sectionId + '-state-badge');
  if (badge) { badge.textContent = ''; badge.className = 'state-badge'; }
}

function handleUndo(sectionId) {
  const cardId = cardMgr.undo();
  if (!cardId) return;
  const section = project.getSection(sectionId);
  if (!section) return;

  if (section.type === 'mc-quiz') {
    const idx = parseInt(cardId.split('-').pop());
    renderMcForced(sectionId, idx);
  } else if (section.type === 'passage-quiz') {
    const parts = cardId.split('-');
    scenarioIdx[sectionId] = parseInt(parts[1]);
    scenarioQIdx[sectionId] = parseInt(parts[2]);
    renderPassageQuiz(sectionId);
  }
  state.save(cardMgr);
  updateAllDue();
}

function handleSuspend(sectionId) {
  const cardId = currentCard[sectionId];
  if (!cardId) return;
  cardMgr.suspend(cardId);
  state.save(cardMgr);
  updateAllDue();
  nextQ(sectionId);
}

function handleBury(sectionId) {
  const cardId = currentCard[sectionId];
  if (!cardId) return;
  cardMgr.bury(cardId);
  state.save(cardMgr);
  updateAllDue();
  nextQ(sectionId);
}

// ─── MCQ: Flashcards ───
function renderFlashcard(sectionId) {
  const section = project.getSection(sectionId);
  if (!section?.flashcards || section.flashcards.length === 0) return;

  const fs = flashState[sectionId];
  const card = section.flashcards[fs.idx];

  const front = document.getElementById(sectionId + '-flash-front');
  const back = document.getElementById(sectionId + '-flash-back');
  const flashcard = document.getElementById(sectionId + '-flashcard');
  const counter = document.getElementById(sectionId + '-flash-counter');

  // Check if definition-first toggle is on
  const orderToggle = document.getElementById(sectionId + '-flash-order');
  const defFirst = orderToggle && orderToggle.checked;

  const showFront = defFirst ? card.back : card.front;
  const showBack = defFirst ? card.front : card.back;

  if (front) {
    front.innerHTML = showFront;
  }
  if (back) {
    const imgSource = defFirst ? card.back : card.front;
    back.innerHTML = showBack +
      (section.hasImages ? '<br><br>' + imgLink(imgSource, project.config.imageSearchSuffix) : '');
  }
  if (flashcard) flashcard.classList.remove('flipped');
  if (counter) counter.textContent = (fs.idx + 1) + ' / ' + section.flashcards.length;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MATH MODE — streak tracking, category filters, step-by-step solutions
// ═══════════════════════════════════════════════════════════════════════════

function renderMathProblem(sectionId) {
  const section = project.getSection(sectionId);
  if (!section) return;

  const ms = mathState[sectionId];
  const cats = ms.cat === 'all' ? section.generators : [ms.cat];
  const gen = pick(cats);
  const prob = mathGenerators[gen]();

  ms.ans = prob.a;
  ms.unit = prob.u;
  ms.ex = prob.ex;
  ms.steps = prob.steps || [];

  quizState[sectionId] = 'answering';

  const mathQuestionEl = document.getElementById(sectionId + '-question');
  mathQuestionEl.textContent = prob.q;
  renderLatex(mathQuestionEl);
  const inp = document.getElementById(sectionId + '-answer');
  inp.value = '';
  inp.disabled = false;
  document.getElementById(sectionId + '-feedback').className = 'feedback';
  document.getElementById(sectionId + '-next').classList.remove('show');
  hideMathSteps(sectionId);
  pending[sectionId] = false;
  const sp = document.getElementById(sectionId + '-skip-prompt');
  if (sp) sp.classList.remove('show');

  // "I Don't Know"
  const dka = document.getElementById(sectionId + '-dk-area');
  if (dka) {
    dka.innerHTML = '';
    const dk = document.createElement('button');
    dk.className = 'dk-btn';
    dk.textContent = "I Don't Know";
    dk.addEventListener('click', () => skipMath(sectionId));
    dka.appendChild(dk);
  }

  inp.focus();
  timer.start(sectionId);
}

function checkMath(sectionId) {
  const inp = document.getElementById(sectionId + '-answer');
  if (inp.disabled) return;
  const val = parseFloat(inp.value.replace(/,/g, ''));
  if (isNaN(val)) return;
  inp.disabled = true;
  timer.stop();
  const dkb = document.getElementById(sectionId + '-dk-area')?.querySelector('.dk-btn');
  if (dkb) dkb.disabled = true;

  quizState[sectionId] = 'revealed';
  state.scores[sectionId].attempted++;

  const ms = mathState[sectionId];
  const fb = document.getElementById(sectionId + '-feedback');
  const isCorrect = Math.abs(val - ms.ans) <= Math.abs(ms.ans) * 0.01 + 0.01;

  if (isCorrect) {
    state.scores[sectionId].correct++;
    ms.streak++;
    if (ms.streak > ms.bestStreak) ms.bestStreak = ms.streak;
    fb.innerHTML = 'Correct!' + (ms.ex ? '<span class="explanation">' + ms.ex + '</span>' : '');
    fb.className = 'feedback show correct-fb';
  } else {
    ms.streak = 0;
    fb.innerHTML = 'Incorrect. Answer: ' + ms.ans + (ms.unit ? ' ' + ms.unit : '') + (ms.ex ? '<span class="explanation">' + ms.ex + '</span>' : '');
    fb.className = 'feedback show wrong-fb';
    if (ms.steps && ms.steps.length > 0) showMathSteps(sectionId, ms.steps);
  }
  renderLatex(fb);

  updateScore(sectionId);
  updateMathStreak(sectionId);
  document.getElementById(sectionId + '-next').classList.add('show');
  state.save(cardMgr);
}

function skipMath(sectionId) {
  if (quizState[sectionId] !== 'answering') return;
  quizState[sectionId] = 'revealed';
  timer.stop();

  const inp = document.getElementById(sectionId + '-answer');
  if (inp) inp.disabled = true;
  const dkb = document.getElementById(sectionId + '-dk-area')?.querySelector('.dk-btn');
  if (dkb) dkb.disabled = true;

  state.scores[sectionId].attempted++;
  const ms = mathState[sectionId];
  ms.streak = 0;

  const fb = document.getElementById(sectionId + '-feedback');
  fb.innerHTML = 'The answer is: ' + ms.ans + (ms.unit ? ' ' + ms.unit : '') + (ms.ex ? '<span class="explanation">' + ms.ex + '</span>' : '');
  fb.className = 'feedback show skip-fb';
  renderLatex(fb);

  if (ms.steps && ms.steps.length > 0) showMathSteps(sectionId, ms.steps);

  updateScore(sectionId);
  updateMathStreak(sectionId);
  document.getElementById(sectionId + '-next').classList.add('show');
  state.save(cardMgr);
}

// ─── Math: Steps display ───
function showMathSteps(sectionId, steps) {
  const el = document.getElementById(sectionId + '-math-steps');
  if (!el) return;
  let html = '<h4>Step-by-Step Solution</h4><ol>';
  for (const step of steps) html += `<li>${step}</li>`;
  html += '</ol>';
  el.innerHTML = html;
  el.style.display = 'block';
  renderLatex(el);
}

function hideMathSteps(sectionId) {
  const el = document.getElementById(sectionId + '-math-steps');
  if (el) el.style.display = 'none';
}

// ─── Math: Streak display ───
function updateMathStreak(sectionId) {
  const ms = mathState[sectionId];
  const streakEl = document.getElementById(sectionId + '-streak');
  const bestEl = document.getElementById(sectionId + '-best-streak');
  if (streakEl) streakEl.textContent = ms.streak;
  if (bestEl) bestEl.textContent = ms.bestStreak;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED — navigation, scoring, keyboard
// ═══════════════════════════════════════════════════════════════════════════

function nextQ(sectionId) {
  const section = project.getSection(sectionId);
  if (!section) return;

  if (section.type === 'mc-quiz') renderMcQuiz(sectionId);
  else if (section.type === 'passage-quiz') {
    scenarioQIdx[sectionId]++;
    const si = scenarioIdx[sectionId];
    if (scenarioQIdx[sectionId] >= section.scenarios[si].questions.length) {
      scenarioQIdx[sectionId] = 0;
    }
    renderPassageQuiz(sectionId);
  } else if (section.type === 'math-gen') renderMathProblem(sectionId);
}

function resetSection(sectionId) {
  state.resetSection(sectionId);
  updateScore(sectionId);

  const section = project.getSection(sectionId);
  if (!section) return;

  if (section.type === 'math-gen') {
    mathState[sectionId].streak = 0;
    mathState[sectionId].bestStreak = 0;
    updateMathStreak(sectionId);
  } else {
    cardMgr.resetPrefix(sectionId + '-');
    history[sectionId] = [];
    histPos[sectionId] = -1;
    scenarioIdx[sectionId] = 0;
    scenarioQIdx[sectionId] = 0;
  }

  renderSection(sectionId);
  state.save(cardMgr);
  updateAllDue();
}

function updateScore(sectionId) {
  const scoreEl = document.getElementById(sectionId + '-score');
  const totalEl = document.getElementById(sectionId + '-total');
  if (scoreEl && state.scores[sectionId]) scoreEl.textContent = state.scores[sectionId].correct;
  if (totalEl && state.scores[sectionId]) totalEl.textContent = state.scores[sectionId].attempted;
  updateSidebarScore();
}

function updateSidebarScore() {
  const el = document.getElementById('activity-score-stats');
  if (!el || !activeTab) return;
  const s = state.scores[activeTab];
  const section = project.getSection(activeTab);
  if (!s) return;
  let html = `<span class="stat-item">score: <strong>${s.correct} / ${s.attempted}</strong></span>`;
  if (section && section.type !== 'math-gen') {
    const counts = cardMgr.countDue(section.cardIds);
    html += `<span class="stat-item">due: <strong>${counts.total} / ${section.cardIds.length}</strong></span>`;
  }
  el.innerHTML = html;
}

function updateAllDue() {
  for (const section of project.sections) {
    if (section.type === 'math-gen') continue; // math has no FSRS due counts
    const dueEl = document.getElementById(section.id + '-due');
    if (dueEl) {
      const counts = cardMgr.countDue(section.cardIds);
      dueEl.textContent = counts.total;
    }
    const totalEl = document.getElementById(section.id + '-deck-total');
    if (totalEl) totalEl.textContent = section.cardIds.length;
  }
}

// ===== KEYBOARD =====
function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (!activeTab || !project) return;

  const s = activeTab;
  const section = project.getSection(s);
  if (!section) return;

  if (section.type === 'math-gen') {
    handleMathKeyboard(e, s);
  } else {
    // Check if flashcard mode is active
    const flashBtn = document.getElementById(s + '-flash-btn');
    if (flashBtn && flashBtn.classList.contains('active')) {
      handleFlashcardKeyboard(e, s, section);
    } else {
      handleMcqKeyboard(e, s, section);
    }
  }
}

// ─── Math keyboard: Space/D/Enter to advance or skip ───
function handleMathKeyboard(e, s) {
  if (e.code === 'Space' || e.key === 'd' || e.key === 'D' || e.key === 'Enter') {
    e.preventDefault();
    if (quizState[s] === 'revealed') {
      nextQ(s);
    } else if (quizState[s] === 'answering') {
      if (pending[s]) {
        pending[s] = false;
        const sp = document.getElementById(s + '-skip-prompt');
        if (sp) sp.classList.remove('show');
        skipMath(s);
      } else {
        pending[s] = true;
        const sp = document.getElementById(s + '-skip-prompt');
        if (sp) sp.classList.add('show');
      }
    }
  }
}

// ─── Flashcard keyboard: Space/D flip/next, A/ArrowLeft prev, ArrowRight next ───
function handleFlashcardKeyboard(e, s, section) {
  const flashcard = document.getElementById(s + '-flashcard');
  if (!flashcard) return;
  const isFlipped = flashcard.classList.contains('flipped');

  // Space/D: flip if unflipped, next if flipped
  if (e.code === 'Space' || e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    if (!isFlipped) {
      flashcard.classList.add('flipped');
    } else {
      if (section.flashcards) {
        flashState[s].idx = (flashState[s].idx + 1) % section.flashcards.length;
        renderFlashcard(s);
      }
    }
    return;
  }

  // ArrowRight: next card
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (section.flashcards) {
      flashState[s].idx = (flashState[s].idx + 1) % section.flashcards.length;
      renderFlashcard(s);
    }
    return;
  }

  // A / ArrowLeft: previous card
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    e.preventDefault();
    if (section.flashcards) {
      const len = section.flashcards.length;
      flashState[s].idx = (flashState[s].idx - 1 + len) % len;
      renderFlashcard(s);
    }
    return;
  }

  // F: flip
  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    flashcard.classList.toggle('flipped');
    return;
  }
}

// ─── MCQ keyboard: 1-4 answer/rate, Space/D skip/advance, Z/S/B/R/A ───
function handleMcqKeyboard(e, s, section) {
  // 1-4: select answer (answering) or rate (revealed)
  if (e.key >= '1' && e.key <= '4') {
    e.preventDefault();
    if (quizState[s] === 'answering') {
      const btns = document.getElementById(s + '-options')?.querySelectorAll('.option-btn');
      const idx = parseInt(e.key) - 1;
      if (btns && btns[idx]) btns[idx].click();
    } else if (quizState[s] === 'revealed') {
      const ratingMap = { '1': Rating.Again, '2': Rating.Hard, '3': Rating.Good, '4': Rating.Easy };
      handleRate(s, ratingMap[e.key]);
    }
    return;
  }

  // Space/D: skip (double-tap) or advance
  if (e.code === 'Space' || e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    if (quizState[s] === 'reviewing-history') {
      const hintEl = document.getElementById(s + '-history-hint');
      if (hintEl) hintEl.style.display = 'none';
      if (histPos[s] < history[s].length - 1) {
        histPos[s]++;
        const entry = history[s][histPos[s]];
        renderMcForced(s, entry.idx, entry);
      } else {
        renderMcQuiz(s);
      }
    } else if (quizState[s] === 'rated') {
      nextQ(s);
    } else if (quizState[s] === 'revealed') {
      // Must rate first (1-4)
    } else if (pending[s]) {
      pending[s] = false;
      const sp = document.getElementById(s + '-skip-prompt');
      if (sp) sp.classList.remove('show');
      doSkip(s);
    } else {
      pending[s] = true;
      const sp = document.getElementById(s + '-skip-prompt');
      if (sp) sp.classList.add('show');
    }
    return;
  }

  // Z — undo
  if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); handleUndo(s); return; }
  // S — suspend
  if (e.key === 's' || e.key === 'S') { e.preventDefault(); handleSuspend(s); return; }
  // B — bury
  if (e.key === 'b' || e.key === 'B') { e.preventDefault(); handleBury(s); return; }
  // R — view image
  if (e.key === 'r' || e.key === 'R') {
    const link = document.querySelector('#' + s + '-view-img .view-img');
    if (link) window.open(link.href, '_blank');
    return;
  }
  // A — previous
  if (e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    if (history[s]?.length > 0 && (histPos[s] || 0) > 0) {
      histPos[s]--;
      const entry = history[s][histPos[s]];
      if (section.type === 'mc-quiz') renderMcForced(s, entry.idx, entry);
    }
    return;
  }

  // ArrowRight — forward from history review
  if (e.key === 'ArrowRight') {
    if (quizState[s] === 'reviewing-history') {
      e.preventDefault();
      const hintEl = document.getElementById(s + '-history-hint');
      if (hintEl) hintEl.style.display = 'none';
      if (histPos[s] < history[s].length - 1) {
        histPos[s]++;
        const entry = history[s][histPos[s]];
        renderMcForced(s, entry.idx, entry);
      } else {
        renderMcQuiz(s);
      }
    }
    return;
  }
}

// ===== GO TO LAUNCHER =====
function goToLauncher() {
  if (state && cardMgr) state.save(cardMgr);
  document.getElementById('study-app').style.display = 'none';
  document.getElementById('launcher').style.display = '';
  timer.stop();
  document.removeEventListener('keydown', handleKeyboard);
  renderRecentProjects();
}

// ===== INIT =====
initLauncher();
