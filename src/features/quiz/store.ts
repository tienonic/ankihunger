import { createSignal, createEffect, batch } from 'solid-js';
import { workerApi } from '../../core/hooks/useWorker.ts';
import { useTimer } from '../../core/hooks/useTimer.ts';
import { shuffle } from '../../utils/shuffle.ts';
import { activeProject, easyMode } from '../../core/store/app.ts';
import { setQuestionContext } from '../glossary/store.ts';
import { pushChartEntry } from '../activity/store.ts';
import type { Section, Question } from '../../projects/types.ts';

export type QuizState = 'idle' | 'answering' | 'revealed' | 'rated' | 'reviewing-history' | 'done';

export interface HistoryEntry {
  idx: number;
  scenarioIdx?: number;
  questionIdx?: number;
  cardId: string;
  selected: string | null;
  correct: string;
  optionOrder: string[];
  isCorrect: boolean;
  skipped: boolean;
  explanation: string;
  passage: string;
}

export interface QuizSession {
  state: () => QuizState;
  cardId: () => string | null;
  question: () => Question | null;
  options: () => string[];
  selected: () => string | null;
  isCorrect: () => boolean;
  ratingLabels: () => Record<number, string>;
  score: () => { correct: number; attempted: number };
  dueCount: () => { due: number; newCount: number; total: number };
  flashMode: () => boolean;
  flashCardId: () => string | null;
  flashFlipped: () => boolean;
  flashFront: () => string;
  flashBack: () => string;
  flashDefFirst: () => boolean;
  passage: () => string;
  historyReview: () => HistoryEntry | null;
  leechWarning: () => boolean;
  skipped: () => boolean;
  currentImageLink: () => string;
  pickNextCard: () => Promise<void>;
  answer: (option: string) => Promise<void>;
  skip: () => Promise<void>;
  rate: (rating: number) => Promise<void>;
  undo: () => Promise<void>;
  suspend: () => Promise<void>;
  bury: () => Promise<void>;
  flipFlash: () => void;
  rateFlash: (rating: number) => Promise<void>;
  toggleFlashMode: () => void;
  setFlashDefFirst: (v: boolean) => void;
  advanceFromHistory: () => void;
  goBackHistory: () => void;
  shuffleFlash: () => Promise<void>;
  resetSection: () => Promise<void>;
  refreshDue: () => Promise<void>;
  studyMore: () => Promise<void>;
  increaseNewCards: (count?: number) => Promise<void>;
  unburyAll: () => Promise<void>;
  timer:{ seconds: () => number; start: () => void; stop: () => number; reset: () => void; pause: () => void; resume: () => void; paused: () => boolean };
  paused: () => boolean;
  togglePause: () => void;
}

import { bumpHandlerVersion } from '../../core/store/sections.ts';

function timeToRating(seconds: number): number {
  if (seconds >= 59) return 1; // Again
  if (seconds >= 40) return 2; // Hard
  if (seconds >= 8) return 3;  // Good
  return 4; // Easy
}

export function createQuizSession(section: Section): QuizSession {
  const project = () => activeProject()!;

  const [state, setState] = createSignal<QuizState>('idle');
  const [cardId, setCardId] = createSignal<string | null>(null);
  const [question, setQuestion] = createSignal<Question | null>(null);
  const [options, setOptions] = createSignal<string[]>([]);
  const [selected, setSelected] = createSignal<string | null>(null);
  const [isCorrect, setIsCorrect] = createSignal(false);
  const [ratingLabels, setRatingLabels] = createSignal<Record<number, string>>({});
  const [score, setScore] = createSignal({ correct: 0, attempted: 0 });
  const [dueCount, setDueCount] = createSignal({ due: 0, newCount: 0, total: 0 });
  const [flashMode, setFlashMode] = createSignal(false);
  const [flashCardId, setFlashCardId] = createSignal<string | null>(null);
  const [flashFlipped, setFlashFlipped] = createSignal(false);
  const [flashFront, setFlashFront] = createSignal('');
  const [flashBack, setFlashBack] = createSignal('');
  const [flashDefFirst, setFlashDefFirst] = createSignal(false);
  const [passage, setPassage] = createSignal('');
  const [historyReview, setHistoryReview] = createSignal<HistoryEntry | null>(null);
  const [leechWarning, setLeechWarning] = createSignal(false);
  const [skipped, setSkipped] = createSignal(false);

  const timer = useTimer();
  let lastElapsedMs = 0;

  // When easyMode is toggled off while a question is revealed, load rating previews
  createEffect(() => {
    const easy = easyMode();
    const st = state();
    const cId = cardId();
    if (!easy && st === 'revealed' && cId) {
      workerApi.previewRatings(cId).then(preview => {
        setRatingLabels(preview.labels);
      });
    }
  });

  let history: HistoryEntry[] = [];
  let histPos = -1;
  let currentScenarioIdx = 0;
  let currentScenarioQIdx = 0;

  function setFlashError(msg = 'Card data mismatch') {
    batch(() => { setFlashCardId(null); setFlashFront(msg); setFlashBack(''); setFlashFlipped(false); });
  }

  function getCardIds(): string[] {
    return flashMode() ? section.flashCardIds : section.cardIds;
  }

  function getCardType(): 'mcq' | 'passage' | 'flashcard' {
    if (flashMode()) return 'flashcard';
    return section.type === 'passage-quiz' ? 'passage' : 'mcq';
  }

  function lookupQuestion(cId: string): { question: Question; scenarioIdx?: number; questionIdx?: number; passage?: string } | null {
    if (section.type === 'mc-quiz' && section.questions) {
      const idx = parseInt(cId.slice(section.id.length + 1), 10);
      if (isNaN(idx)) return null;
      const q = section.questions[idx];
      return q ? { question: q } : null;
    }
    if (section.type === 'passage-quiz' && section.scenarios) {
      // Card ID format: sectionId-scenarioIdx-questionIdx
      const suffix = cId.slice(section.id.length + 1); // remove "sectionId-"
      const parts = suffix.split('-');
      if (parts.length < 2) return null;
      const si = parseInt(parts[0], 10);
      const qi = parseInt(parts[1], 10);
      if (isNaN(si) || isNaN(qi)) return null;
      const scenario = section.scenarios[si];
      if (!scenario) return null;
      const q = scenario.questions[qi];
      if (!q) return null;
      return {
        question: q,
        scenarioIdx: si,
        questionIdx: qi,
        passage: scenario.passage + (scenario.source ? `<span class="source">${scenario.source}</span>` : ''),
      };
    }
    return null;
  }

  async function refreshDue() {
    const p = project();
    if (!p) return;
    const ids = flashMode() ? section.flashCardIds : section.cardIds;
    if (ids.length === 0) return;
    const result = await workerApi.countDue(p.slug, [section.id], getCardType());
    setDueCount(result);
  }

  async function pickNextCard() {
    const p = project();
    if (!p) return;

    setLeechWarning(false);
    setHistoryReview(null);
    setSkipped(false);

    const ids = getCardIds();
    if (ids.length === 0) {
      setState('done');
      return;
    }

    const cardType = getCardType();
    const result = await workerApi.pickNext(p.slug, [section.id], p.config.new_per_session, cardType);
    if (!result.cardId) {
      setState('done');
      return;
    }

    const lookup = lookupQuestion(result.cardId);
    if (!lookup) {
      setState('done');
      return;
    }

    const shuffled = shuffle([lookup.question.correct, ...lookup.question.wrong]);
    const passageText = lookup.passage ?? '';

    batch(() => {
      setCardId(result.cardId);
      setQuestion(lookup.question);
      setOptions(shuffled);
      setSelected(null);
      setIsCorrect(false);
      setPassage(passageText);
      setState('answering');
    });

    histPos++;
    history = history.slice(0, histPos);
    history.push({
      idx: section.type === 'mc-quiz'
        ? (parseInt(result.cardId!.slice(section.id.length + 1), 10) || 0)
        : 0,
      scenarioIdx: lookup.scenarioIdx,
      questionIdx: lookup.questionIdx,
      cardId: result.cardId!,
      selected: null,
      correct: lookup.question.correct,
      optionOrder: shuffled,
      isCorrect: false,
      skipped: false,
      explanation: lookup.question.explanation ?? '',
      passage: passageText,
    });

    timer.start();

    const q = lookup.question;
    const ctx = [q.q, q.correct, q.imageName || q.cropName || '', q.explanation || ''].join(' ');
    setQuestionContext(ctx);

    await refreshDue();
  }

  async function answer(option: string) {
    if (state() !== 'answering') return;
    const elapsed = timer.stop();
    lastElapsedMs = elapsed * 1000;
    const q = question();
    const cId = cardId();
    const p = project();
    if (!q || !cId || !p) return;

    const correct = option === q.correct;

    batch(() => {
      setSelected(option);
      setIsCorrect(correct);
      setState('revealed');
      setSkipped(false);
    });

    const s = await workerApi.updateScore(p.slug, section.id, correct);
    setScore({ correct: s.correct, attempted: s.attempted });

    const entry = history[histPos];
    if (entry) {
      entry.selected = option;
      entry.correct = q.correct;
      entry.optionOrder = options();
      entry.isCorrect = correct;
      entry.explanation = q.explanation ?? '';
    }

    if (easyMode()) {
      const autoRating = correct ? timeToRating(elapsed) : 1;
      await doRate(cId, autoRating);
    } else {
      const preview = await workerApi.previewRatings(cId);
      setRatingLabels(preview.labels);
    }
  }

  async function doSkip() {
    if (state() !== 'answering') return;
    const elapsed = timer.stop();
    lastElapsedMs = elapsed * 1000;
    const q = question();
    const cId = cardId();
    const p = project();
    if (!q || !cId || !p) return;

    batch(() => {
      setSelected(null);
      setIsCorrect(false);
      setState('revealed');
      setSkipped(true);
    });

    const s = await workerApi.updateScore(p.slug, section.id, false);
    setScore({ correct: s.correct, attempted: s.attempted });

    const entry = history[histPos];
    if (entry) {
      entry.selected = null;
      entry.correct = q.correct;
      entry.optionOrder = options();
      entry.isCorrect = false;
      entry.skipped = true;
      entry.explanation = q.explanation ?? '';
    }

    await doRate(cId, 1);
  }

  async function doRate(cId: string, rating: number) {
    const p = project();
    if (!p) return;

    const [result] = await Promise.all([
      workerApi.reviewCard(cId, p.slug, section.id, rating, lastElapsedMs),
      workerApi.addActivity(p.slug, section.id, rating, rating !== 1),
    ]);
    pushChartEntry(rating, rating !== 1);

    if (result.isLeech) setLeechWarning(true);

    setState('rated');
    await refreshDue();
  }

  async function rate(rating: number) {
    if (state() !== 'revealed') return;
    const cId = cardId();
    if (!cId) return;
    await doRate(cId, rating);
  }

  async function undoAction() {
    const cId = cardId();
    if (!cId) return;
    const result = await workerApi.undoReview(cId);
    if (result.undone && result.cardId) {
      const lookup = lookupQuestion(result.cardId);
      if (lookup) {
        batch(() => {
          setCardId(result.cardId!);
          setQuestion(lookup.question);
          setOptions(shuffle([lookup.question.correct, ...lookup.question.wrong]));
          setSelected(null);
          setIsCorrect(false);
              setPassage(lookup.passage ?? '');
          setState('answering');
          setLeechWarning(false);
          setSkipped(false);
        });
        timer.start();
        await refreshDue();
      }
    }
  }

  async function suspendAction() {
    const cId = cardId();
    if (!cId) return;
    await workerApi.suspendCard(cId);
    await refreshDue();
    await pickNextCard();
  }

  async function buryAction() {
    const cId = cardId();
    if (!cId) return;
    await workerApi.buryCard(cId);
    await refreshDue();
    await pickNextCard();
  }

  async function pickNextFlash() {
    const p = project();
    if (!p || !section.flashcards || section.flashCardIds.length === 0) return;

    const result = await workerApi.pickNext(p.slug, [section.id], p.config.new_per_session, 'flashcard');

    if (!result.cardId) {
      batch(() => {
        setFlashCardId(null);
        setFlashFront('');
        setFlashBack('');
        setFlashFlipped(false);
        setState('done');
      });
      await refreshDue();
      return;
    }

    const flashParts = result.cardId.split('-flash-');
    if (flashParts.length !== 2) {
      console.warn('pickNextFlash: unexpected card ID format', result.cardId);
      setFlashError();
      return;
    }
    const idx = parseInt(flashParts[1], 10);
    if (isNaN(idx)) {
      console.warn('pickNextFlash: failed to parse card index', result.cardId);
      setFlashError();
      return;
    }
    const card = section.flashcards![idx];
    if (!card) {
      setFlashError();
      return;
    }

    const defFirst = flashDefFirst();
    batch(() => {
      setFlashCardId(result.cardId);
      setFlashFront(defFirst ? card.back : card.front);
      setFlashBack(defFirst ? card.front : card.back);
      setFlashFlipped(false);
      setRatingLabels({});
    });

    setQuestionContext([card.front, card.back].join(' '));

    await refreshDue();
  }

  function flipFlash() {
    const flipped = !flashFlipped();
    setFlashFlipped(flipped);
    if (flipped && flashCardId()) {
      workerApi.previewRatings(flashCardId()!).then(preview => {
        setRatingLabels(preview.labels);
      });
    }
  }

  async function rateFlashAction(rating: number) {
    const fId = flashCardId();
    const p = project();
    if (!fId || !p) return;

    await workerApi.reviewCard(fId, p.slug, section.id, rating, 0);
    await workerApi.addActivity(p.slug, section.id, rating, rating !== 1);
    pushChartEntry(rating, rating !== 1);
    await pickNextFlash();
  }

  function toggleFlashMode() {
    const next = !flashMode();
    setFlashMode(next);
    bumpHandlerVersion();
    if (next) {
      pickNextFlash();
    } else {
      pickNextCard();
    }
  }

  function goBackHistory() {
    if (history.length === 0 || histPos <= 0) return;
    histPos--;
    const entry = history[histPos];
    if (!entry) return;

    const lookup = lookupQuestion(entry.cardId);
    if (!lookup) return;

    batch(() => {
      setQuestion(lookup.question);
      if (entry.optionOrder.length > 0) {
        setOptions(entry.optionOrder);
      }
      setSelected(entry.selected);
      setIsCorrect(entry.isCorrect);
      setSkipped(entry.skipped);
      setPassage(entry.passage);
      setHistoryReview(entry);
      setState('reviewing-history');
    });
  }

  function advanceFromHistory() {
    if (state() !== 'reviewing-history') return;
    setHistoryReview(null);
    if (histPos < history.length - 1) {
      histPos++;
      const entry = history[histPos];
      // Restore unanswered card directly (don't re-pick from scheduler)
      if (entry && entry.selected === null && !entry.skipped) {
        const lookup = lookupQuestion(entry.cardId);
        if (lookup) {
          batch(() => {
            setCardId(entry.cardId);
            setQuestion(lookup.question);
            setOptions(entry.optionOrder);
            setSelected(null);
            setIsCorrect(false);
            setPassage(entry.passage);
            setState('answering');
          });
          timer.start();
          return;
        }
      }
      if (entry && (section.type === 'mc-quiz' || section.type === 'passage-quiz')) {
        const lookup = lookupQuestion(entry.cardId);
        if (lookup) {
          batch(() => {
            setQuestion(lookup.question);
            if (entry.optionOrder.length > 0) {
              setOptions(entry.optionOrder);
            }
            setSelected(entry.selected);
            setIsCorrect(entry.isCorrect);
            setSkipped(entry.skipped);
            setPassage(entry.passage);
            setHistoryReview(entry);
            setState('reviewing-history');
          });
          return;
        }
      }
    }
    pickNextCard();
  }

  async function shuffleFlashAction() {
    if (!section.flashcards || section.flashCardIds.length === 0) return;
    const idx = Math.floor(Math.random() * section.flashcards.length);
    const card = section.flashcards[idx];
    const fId = section.flashCardIds[idx];
    if (!card || !fId) return;

    const defFirst = flashDefFirst();
    batch(() => {
      setFlashCardId(fId);
      setFlashFront(defFirst ? card.back : card.front);
      setFlashBack(defFirst ? card.front : card.back);
      setFlashFlipped(false);
      setRatingLabels({});
    });

    setQuestionContext([card.front, card.back].join(' '));
    await refreshDue();
  }

  async function studyMore() {
    const p = project();
    if (!p) return;
    const cardType = getCardType();
    const result = await workerApi.pickNextOverride(p.slug, [section.id], cardType);
    if (!result.cardId) return;

    if (flashMode()) {
      const flashParts = result.cardId.split('-flash-');
      if (flashParts.length !== 2) return;
      const idx = parseInt(flashParts[1], 10);
      if (isNaN(idx)) return;
      const card = section.flashcards?.[idx];
      if (!card) return;
      const defFirst = flashDefFirst();
      batch(() => {
        setFlashCardId(result.cardId);
        setFlashFront(defFirst ? card.back : card.front);
        setFlashBack(defFirst ? card.front : card.back);
        setFlashFlipped(false);
        setRatingLabels({});
        setState('answering');
      });
      setQuestionContext([card.front, card.back].join(' '));
    } else {
      const lookup = lookupQuestion(result.cardId);
      if (!lookup) return;
      batch(() => {
        setCardId(result.cardId);
        setQuestion(lookup.question);
        setOptions(shuffle([lookup.question.correct, ...lookup.question.wrong]));
        setSelected(null);
        setIsCorrect(false);
          setPassage(lookup.passage ?? '');
        setState('answering');
      });
      timer.start();
      const q = lookup.question;
      const ctx = [q.q, q.correct, q.imageName || q.cropName || '', q.explanation || ''].join(' ');
      setQuestionContext(ctx);
    }
    await refreshDue();
  }

  async function increaseNewCards(count?: number) {
    const p = project();
    if (p && count != null) p.config.new_per_session = count;
    await workerApi.resetNewCount();
    if (flashMode()) {
      await pickNextFlash();
    } else {
      await pickNextCard();
    }
  }

  async function unburyAllAction() {
    const p = project();
    if (!p) return;
    await workerApi.unburyAll(p.slug);
    if (flashMode()) {
      await pickNextFlash();
    } else {
      await pickNextCard();
    }
  }

  async function resetSectionAction() {
    const p = project();
    if (!p) return;
    await workerApi.resetSection(p.slug, section.id);
    const cardRegs = [
      ...section.cardIds.map(id => ({
        sectionId: section.id,
        cardId: id,
        cardType: (section.type === 'passage-quiz' ? 'passage' : 'mcq') as 'mcq' | 'passage' | 'flashcard',
      })),
      ...section.flashCardIds.map(id => ({
        sectionId: section.id,
        cardId: id,
        cardType: 'flashcard' as const,
      })),
    ];
    await workerApi.loadProject(p.slug, [section.id], cardRegs);
    setScore({ correct: 0, attempted: 0 });
    history = [];
    histPos = -1;
    if (flashMode()) {
      await pickNextFlash();
    } else {
      await pickNextCard();
    }
  }

  function currentImageLink(): string {
    const q = question();
    if (!q) return '';
    const imgName = q.imageName || q.cropName;
    if (!imgName) return '';
    const suffix = project()?.config.imageSearchSuffix ?? '';
    const query = suffix ? `${imgName} ${suffix}` : imgName;
    return 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(query);
  }

  return {
    state,
    cardId,
    question,
    options,
    selected,
    isCorrect,
    ratingLabels,
    score,
    dueCount,
    flashMode,
    flashCardId,
    flashFlipped,
    flashFront,
    flashBack,
    flashDefFirst,
    passage,
    historyReview,
    leechWarning,
    skipped,
    currentImageLink,

    pickNextCard,
    answer,
    skip: doSkip,
    rate,
    undo: undoAction,
    suspend: suspendAction,
    bury: buryAction,
    flipFlash,
    rateFlash: rateFlashAction,
    toggleFlashMode,
    setFlashDefFirst: (v: boolean) => setFlashDefFirst(v),
    advanceFromHistory,
    goBackHistory,
    shuffleFlash: shuffleFlashAction,
    resetSection: resetSectionAction,
    refreshDue,
    studyMore,
    increaseNewCards,
    unburyAll: unburyAllAction,

    timer,
    paused: timer.paused,
    togglePause: () => { timer.paused() ? timer.resume() : timer.pause(); },
  };
}
