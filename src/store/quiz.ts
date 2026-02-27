import { createSignal, batch } from 'solid-js';
import { workerApi } from '../hooks/useWorker.ts';
import { useTimer } from '../hooks/useTimer.ts';
import { shuffle } from '../utils/shuffle.ts';
import { activeProject, easyMode } from './app.ts';
import { setQuestionContext } from './glossary.ts';
import type { Section, Question } from '../projects/types.ts';

export type QuizState = 'idle' | 'answering' | 'revealed' | 'rated' | 'reviewing-history' | 'done';

export interface HistoryEntry {
  idx: number;
  scenarioIdx?: number;
  questionIdx?: number;
  selected: string | null;
  correct: string;
  optionOrder: string[];
  isCorrect: boolean;
  skipped: boolean;
  explanation: string;
}

export interface QuizSession {
  // Signals
  state: () => QuizState;
  cardId: () => string | null;
  question: () => Question | null;
  options: () => string[];
  selected: () => string | null;
  isCorrect: () => boolean;
  pending: () => boolean;
  ratingLabels: () => Record<number, string>;
  score: () => { correct: number; attempted: number };
  dueCount: () => { due: number; newCount: number; total: number };
  flashMode: () => boolean;
  flashCardId: () => string | null;
  flashFlipped: () => boolean;
  flashFront: () => string;
  flashBack: () => string;
  flashDefFirst: () => boolean;
  cardState: () => number;
  passage: () => string;
  historyReview: () => HistoryEntry | null;
  leechWarning: () => boolean;
  ratingFlash: () => { rating: number; show: boolean };
  skipped: () => boolean;

  // Actions
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
  resetSection: () => Promise<void>;
  refreshDue: () => Promise<void>;

  // Timer
  timer: { seconds: () => number; start: () => void; stop: () => number; reset: () => void };
}

// Global handler registry for keyboard routing (stores QuizSession or MathSession)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sectionHandlers = new Map<string, any>();

function timeToRating(seconds: number): number {
  if (seconds >= 59) return 1; // Again
  if (seconds >= 40) return 2; // Hard
  if (seconds >= 8) return 3;  // Good
  return 4; // Easy
}

const RATING_LABELS: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

export function createQuizSession(section: Section): QuizSession {
  const project = () => activeProject()!;

  const [state, setState] = createSignal<QuizState>('idle');
  const [cardId, setCardId] = createSignal<string | null>(null);
  const [question, setQuestion] = createSignal<Question | null>(null);
  const [options, setOptions] = createSignal<string[]>([]);
  const [selected, setSelected] = createSignal<string | null>(null);
  const [isCorrect, setIsCorrect] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [ratingLabels, setRatingLabels] = createSignal<Record<number, string>>({});
  const [score, setScore] = createSignal({ correct: 0, attempted: 0 });
  const [dueCount, setDueCount] = createSignal({ due: 0, newCount: 0, total: 0 });
  const [flashMode, setFlashMode] = createSignal(false);
  const [flashCardId, setFlashCardId] = createSignal<string | null>(null);
  const [flashFlipped, setFlashFlipped] = createSignal(false);
  const [flashFront, setFlashFront] = createSignal('');
  const [flashBack, setFlashBack] = createSignal('');
  const [flashDefFirst, setFlashDefFirst] = createSignal(false);
  const [cardState, setCardState] = createSignal(0);
  const [passage, setPassage] = createSignal('');
  const [historyReview, setHistoryReview] = createSignal<HistoryEntry | null>(null);
  const [leechWarning, setLeechWarning] = createSignal(false);
  const [ratingFlash, setRatingFlash] = createSignal<{ rating: number; show: boolean }>({ rating: 0, show: false });
  const [skipped, setSkipped] = createSignal(false);

  const timer = useTimer();

  // History tracking
  let history: HistoryEntry[] = [];
  let histPos = -1;

  // Passage-quiz scenario tracking
  let currentScenarioIdx = 0;
  let currentScenarioQIdx = 0;

  function getCardIds(): string[] {
    return flashMode() ? section.flashCardIds : section.cardIds;
  }

  function getSectionIds(): string[] {
    // For passage-quiz, the worker needs the section IDs
    return [section.id];
  }

  function lookupQuestion(cId: string): { question: Question; scenarioIdx?: number; questionIdx?: number; passage?: string } | null {
    if (section.type === 'mc-quiz' && section.questions) {
      const idx = parseInt(cId.split('-').pop()!);
      const q = section.questions[idx];
      return q ? { question: q } : null;
    }
    if (section.type === 'passage-quiz' && section.scenarios) {
      // Card ID format: sectionId-scenarioIdx-questionIdx
      const suffix = cId.slice(section.id.length + 1); // remove "sectionId-"
      const parts = suffix.split('-');
      const si = parseInt(parts[0]);
      const qi = parseInt(parts[1]);
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
    // The sectionIds for the worker call: we derive which section IDs are in play
    const result = await workerApi.countDue(p.slug, [section.id]);
    setDueCount(result);
  }

  async function refreshScore() {
    const p = project();
    if (!p) return;
    const scores = await workerApi.getScores(p.slug);
    const s = scores.find((sc: any) => sc.section_id === section.id);
    if (s) setScore({ correct: s.correct, attempted: s.attempted });
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

    const result = await workerApi.pickNext(p.slug, [section.id], p.config.new_per_session);
    if (!result.cardId) {
      setState('done');
      return;
    }

    const lookup = lookupQuestion(result.cardId);
    if (!lookup) {
      setState('done');
      return;
    }

    batch(() => {
      setCardId(result.cardId);
      setQuestion(lookup.question);
      setOptions(shuffle([lookup.question.correct, ...lookup.question.wrong]));
      setSelected(null);
      setIsCorrect(false);
      setPending(false);
      setPassage(lookup.passage ?? '');
      setState('answering');
    });

    // Track history
    histPos++;
    history = history.slice(0, histPos);
    history.push({
      idx: section.type === 'mc-quiz'
        ? parseInt(result.cardId!.split('-').pop()!)
        : 0,
      scenarioIdx: lookup.scenarioIdx,
      questionIdx: lookup.questionIdx,
      selected: null,
      correct: lookup.question.correct,
      optionOrder: [],
      isCorrect: false,
      skipped: false,
      explanation: lookup.question.explanation ?? '',
    });

    timer.start();

    // Update glossary context
    const q = lookup.question;
    const ctx = [q.q, q.correct, q.imageName || q.cropName || '', q.explanation || ''].join(' ');
    setQuestionContext(ctx);

    await refreshDue();
  }

  async function answer(option: string) {
    if (state() !== 'answering') return;
    const elapsed = timer.stop();
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

    // Update score in worker
    await workerApi.updateScore(p.slug, section.id, correct);
    await refreshScore();

    // Save to history
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
      setRatingFlash({ rating: autoRating, show: true });
      setTimeout(() => setRatingFlash({ rating: 0, show: false }), 1600);
      await doRate(cId, autoRating);
    } else {
      // Preview intervals for rating bar
      const preview = await workerApi.previewRatings(cId);
      setRatingLabels(preview.labels);
      // Get card state for badge
      const cs = await workerApi.getCardState(cId) as any;
      if (cs) setCardState(cs.fsrs_state ?? 0);
    }
  }

  async function doSkip() {
    if (state() !== 'answering') return;
    timer.stop();
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

    await workerApi.updateScore(p.slug, section.id, false);
    await refreshScore();

    // Save skip to history
    const entry = history[histPos];
    if (entry) {
      entry.selected = null;
      entry.correct = q.correct;
      entry.optionOrder = options();
      entry.isCorrect = false;
      entry.skipped = true;
      entry.explanation = q.explanation ?? '';
    }

    // Auto-rate Again
    setRatingFlash({ rating: 1, show: true });
    setTimeout(() => setRatingFlash({ rating: 0, show: false }), 1600);
    await doRate(cId, 1);
  }

  async function doRate(cId: string, rating: number) {
    const p = project();
    if (!p) return;

    const result = await workerApi.reviewCard(cId, p.slug, section.id, rating, timer.seconds() * 1000);
    await workerApi.addActivity(p.slug, section.id, rating, rating !== 1);

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
          setPending(false);
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

  // Flash mode
  async function pickNextFlash() {
    const p = project();
    if (!p || !section.flashcards || section.flashCardIds.length === 0) return;

    const result = await workerApi.pickNext(p.slug, [section.id], p.config.new_per_session);
    // pickNext returns from all card types for section — need flashcard-specific pick
    // Actually the worker filters by sectionIds, and flashcards have section.id too
    // But flashcards and MCQ cards share section.id — we need to pick only from flashCardIds
    // The worker doesn't distinguish, so we may need to filter or use a different approach
    // For now, let's keep it simple: pickNext from the section, and check if it's a flash card
    // Actually, looking at the worker code, it picks from all cards in the section
    // We need a way to pick only flash cards. Let's use a sub-section approach:
    // We'll filter by checking if the returned cardId is in flashCardIds

    if (!result.cardId || !section.flashCardIds.includes(result.cardId)) {
      // Try to find a flash card specifically - check all flash card IDs
      // Since worker doesn't distinguish, we'll pick the first due flash card
      setFlashCardId(null);
      setFlashFront('All flashcards reviewed!');
      setFlashBack('');
      setFlashFlipped(false);
      await refreshDue();
      return;
    }

    const idx = parseInt(result.cardId.split('-flash-')[1], 10);
    const card = section.flashcards![idx];
    if (!card) return;

    const defFirst = flashDefFirst();
    batch(() => {
      setFlashCardId(result.cardId);
      setFlashFront(defFirst ? card.back : card.front);
      setFlashBack(defFirst ? card.front : card.back);
      setFlashFlipped(false);
      setRatingLabels({});
    });

    // Update glossary context with flashcard text
    setQuestionContext([card.front, card.back].join(' '));

    const cs = await workerApi.getCardState(result.cardId) as any;
    if (cs) setCardState(cs.fsrs_state ?? 0);
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
    await pickNextFlash();
  }

  function toggleFlashMode() {
    const next = !flashMode();
    setFlashMode(next);
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

    // Replay the history entry
    if (section.type === 'mc-quiz' && section.questions) {
      const q = section.questions[entry.idx];
      if (!q) return;
      batch(() => {
        setQuestion(q);
        if (entry.optionOrder.length > 0) {
          setOptions(entry.optionOrder);
        }
        setSelected(entry.selected);
        setIsCorrect(entry.isCorrect);
        setSkipped(entry.skipped);
        setHistoryReview(entry);
        setState('reviewing-history');
      });
    }
  }

  function advanceFromHistory() {
    if (state() !== 'reviewing-history') return;
    setHistoryReview(null);
    if (histPos < history.length - 1) {
      histPos++;
      const entry = history[histPos];
      if (entry && section.type === 'mc-quiz' && section.questions) {
        const q = section.questions[entry.idx];
        if (q) {
          batch(() => {
            setQuestion(q);
            if (entry.optionOrder.length > 0) {
              setOptions(entry.optionOrder);
            }
            setSelected(entry.selected);
            setIsCorrect(entry.isCorrect);
            setSkipped(entry.skipped);
            setHistoryReview(entry);
            setState('reviewing-history');
          });
          return;
        }
      }
    }
    pickNextCard();
  }

  async function resetSectionAction() {
    const p = project();
    if (!p) return;
    await workerApi.resetSection(p.slug, section.id);
    // Re-register cards
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

  return {
    state,
    cardId,
    question,
    options,
    selected,
    isCorrect,
    pending,
    ratingLabels,
    score,
    dueCount,
    flashMode,
    flashCardId,
    flashFlipped,
    flashFront,
    flashBack,
    flashDefFirst,
    cardState,
    passage,
    historyReview,
    leechWarning,
    ratingFlash,
    skipped,

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
    resetSection: resetSectionAction,
    refreshDue,

    timer,
  };
}
