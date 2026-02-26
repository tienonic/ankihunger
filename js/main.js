/**
 * ENTRY POINT — Sacramento County Ag Inspector Study Tool
 *
 * Imports all modules, wires up event listeners, initializes state.
 * Run with a local server (ES modules require HTTP, not file://).
 *   npx serve .
 *   or VS Code Live Server extension
 */

import { shuffle, imgLink, domPrefix } from './classes/Utils.js';
import { SRS } from './classes/SRS.js';
import { State } from './classes/State.js';
import { Timer } from './classes/Timer.js';
import { Glossary } from './classes/Glossary.js';

import { crops, extraCropQuestions } from './data/crops.js';
import { mapScenarios } from './data/maps.js';
import { mathGenerators } from './data/math.js';
import { readPassages } from './data/reading.js';
import { conservationSpecies } from './data/conservation.js';
import { pick, round2 } from './classes/Utils.js';

// ===== INIT CORE SYSTEMS =====
const scores = {
  crop: { correct: 0, attempted: 0 },
  map: { correct: 0, attempted: 0 },
  math: { correct: 0, attempted: 0 },
  reading: { correct: 0, attempted: 0 },
  conservation: { correct: 0, attempted: 0 },
};

const srs = new SRS();
const state = new State(srs, scores);
const timer = new Timer();
const glossary = new Glossary(state);

state.load();
glossary.build();
glossary.initPanel();

// ===== BUILD QUESTIONS =====

// Crop questions (auto-generated + extra)
const cropQuestions = [];
crops.forEach(c => {
  cropQuestions.push({ q: `What category does ${c.name} belong to?`, correct: c.category, wrong: shuffle(crops.filter(x => x.category !== c.category).map(x => x.category).filter((v,i,a)=>a.indexOf(v)===i)).slice(0,3), cropName: c.name, explanation: `${c.name} is a ${c.category.toLowerCase()}.` });
  cropQuestions.push({ q: `Which best describes the leaves of ${c.name}?`, correct: c.leaf, wrong: shuffle(crops.filter(x => x.name !== c.name).map(x => x.leaf)).slice(0,3), cropName: c.name, explanation: `Key: ${c.leaf.split(',')[0]}.` });
  cropQuestions.push({ q: `How do you distinguish ${c.name} from similar crops?`, correct: c.distinguish, wrong: shuffle(crops.filter(x => x.name !== c.name).map(x => x.distinguish)).slice(0,3), cropName: c.name, explanation: `${c.distinguish.split(';')[0]}.` });
});
extraCropQuestions.forEach(eq => cropQuestions.push(eq));
const cropCardIds = cropQuestions.map((_, i) => 'crop-' + i);

// Conservation questions
const consQuestions = [];
conservationSpecies.forEach(sp => {
  consQuestions.push({ q: `Conservation status of ${sp.name}?`, correct: sp.status, wrong: shuffle(conservationSpecies.filter(x=>x.name!==sp.name).map(x=>x.status)).slice(0,3), cropName: sp.name, explanation: sp.status.split('.')[0]+'.' });
  consQuestions.push({ q: `How to identify ${sp.name} in the field?`, correct: sp.id_features, wrong: shuffle(conservationSpecies.filter(x=>x.name!==sp.name).map(x=>x.id_features)).slice(0,3), cropName: sp.name, explanation: sp.id_features.split('.')[0]+'.' });
  consQuestions.push({ q: `Inspector action for ${sp.name}?`, correct: sp.inspector_action, wrong: shuffle(conservationSpecies.filter(x=>x.name!==sp.name).map(x=>x.inspector_action)).slice(0,3), cropName: sp.name, explanation: sp.inspector_action.split('.')[0]+'.' });
  consQuestions.push({ q: `Habitat of ${sp.name}?`, correct: sp.habitat, wrong: shuffle(conservationSpecies.filter(x=>x.name!==sp.name).map(x=>x.habitat)).slice(0,3), cropName: sp.name, explanation: `Found in ${sp.habitat.split('\u2014')[0].toLowerCase().trim()}.` });
});
const consCardIds = consQuestions.map((_, i) => 'cons-' + i);

// Map/Reading card IDs
const mapCardIds = [];
mapScenarios.forEach((s,si) => s.questions.forEach((_,qi) => mapCardIds.push('map-'+si+'-'+qi)));
const readCardIds = [];
readPassages.forEach((p,pi) => p.questions.forEach((_,qi) => readCardIds.push('read-'+pi+'-'+qi)));

// ===== QUIZ STATE =====
const quizState = {};   // section -> 'answering'|'revealed'
const currentCard = {}; // section -> card ID
const currentQ = {};    // section -> question object
const pending = {};     // section -> skip pending?
const history = {};
const histPos = {};
let mapSIdx = 0, mapQIdx = 0, readPIdx = 0, readQIdx = 0;

function initSectionState(s) { quizState[s]='answering'; pending[s]=false; history[s]=history[s]||[]; histPos[s]=histPos[s]!=null?histPos[s]:-1; }
['crop','map','math','reading','conservation'].forEach(initSectionState);

// ===== SCORE DISPLAY =====
function updateScore(section) {
  const p = domPrefix(section);
  document.getElementById(p+'-score').textContent = scores[section].correct;
  document.getElementById(p+'-total').textContent = scores[section].attempted;
}
function updateDue() {
  document.getElementById('crop-due').textContent = srs.countDue(cropCardIds);
  document.getElementById('map-due').textContent = srs.countDue(mapCardIds);
  document.getElementById('read-due').textContent = srs.countDue(readCardIds);
  document.getElementById('cons-due').textContent = srs.countDue(consCardIds);
}

// ===== GENERIC MC QUIZ =====
function renderMc(section, q) {
  const p = domPrefix(section);
  quizState[section] = 'answering'; pending[section] = false;
  const sp = document.getElementById(p+'-skip-prompt'); if(sp) sp.classList.remove('show');
  timer.start(section);
  document.getElementById(p+'-question').textContent = q.q;
  const iv = document.getElementById(p+'-view-img');
  if(iv) iv.innerHTML = q.cropName ? imgLink(q.cropName) : '';
  const opts = shuffle([q.correct, ...q.wrong]);
  const con = document.getElementById(p+'-options'); con.innerHTML = '';
  opts.forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'option-btn'; btn.textContent = o;
    btn.addEventListener('click', () => answerMc(section, btn, o, q));
    con.appendChild(btn);
  });
  const dka = document.getElementById(p+'-dk-area'); dka.innerHTML = '';
  const dk = document.createElement('button'); dk.className = 'dk-btn'; dk.textContent = "I Don't Know";
  dk.addEventListener('click', () => doSkip(section));
  dka.appendChild(dk);
  const fb = document.getElementById(p+'-feedback'); fb.className = 'feedback'; fb.textContent = '';
  document.getElementById(p+'-next').style.display = 'none';
}

function answerMc(section, btn, selected, q) {
  if (quizState[section] === 'revealed') return;
  quizState[section] = 'revealed'; timer.stop();
  const p = domPrefix(section);
  document.getElementById(p+'-options').querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  const dkb = document.getElementById(p+'-dk-area').querySelector('.dk-btn'); if(dkb) dkb.disabled = true;
  const card = srs.getCard(currentCard[section]);
  const assisted = glossary.checkAssisted(q.q + ' ' + q.correct);
  if (assisted) card.assisted = true;
  scores[section].attempted++;
  const fb = document.getElementById(p+'-feedback');
  if (selected === q.correct) {
    btn.classList.add('correct'); scores[section].correct++;
    srs.review(card, card.assisted ? 3 : 5);
    if (!assisted) card.assisted = false;
    fb.innerHTML = 'Correct!' + (q.explanation ? '<span class="explanation">'+q.explanation+'</span>' : '');
    fb.className = 'feedback show correct-fb';
    btn.addEventListener('click', () => nextQ(section));
  } else {
    btn.classList.add('wrong'); srs.review(card, 1);
    document.getElementById(p+'-options').querySelectorAll('.option-btn').forEach(b => {
      if (b.textContent === q.correct) { b.classList.add('correct'); b.addEventListener('click', () => nextQ(section)); }
    });
    fb.innerHTML = 'Incorrect. Answer: ' + q.correct + (q.explanation ? '<span class="explanation">'+q.explanation+'</span>' : '');
    fb.className = 'feedback show wrong-fb';
  }
  updateScore(section); document.getElementById(p+'-next').style.display = 'inline-block';
  state.save(); updateDue();
}

function doSkip(section) {
  if (quizState[section] === 'revealed') return;
  quizState[section] = 'revealed'; timer.stop();
  const p = domPrefix(section); const q = currentQ[section];
  document.getElementById(p+'-options').querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (b.textContent === q.correct) { b.classList.add('correct'); b.addEventListener('click', () => nextQ(section)); }
  });
  const dkb = document.getElementById(p+'-dk-area').querySelector('.dk-btn'); if(dkb) dkb.disabled = true;
  scores[section].attempted++;
  srs.review(srs.getCard(currentCard[section]), 0);
  const fb = document.getElementById(p+'-feedback');
  fb.innerHTML = 'The correct answer is: ' + q.correct + (q.explanation ? '<span class="explanation">'+q.explanation+'</span>' : '');
  fb.className = 'feedback show skip-fb';
  updateScore(section); document.getElementById(p+'-next').style.display = 'inline-block';
  state.save(); updateDue();
}

// ===== SECTION RENDERERS =====
function renderCrop(forceIdx) {
  const idx = forceIdx != null ? forceIdx : parseInt(srs.pickNext(cropCardIds, 'crop').split('-')[1]);
  currentCard.crop = 'crop-'+idx; currentQ.crop = cropQuestions[idx];
  histPos.crop = (histPos.crop||0)+1; history.crop = (history.crop||[]).slice(0, histPos.crop);
  history.crop.push({ idx }); renderMc('crop', cropQuestions[idx]);
}

function pickScenario(prefix, scenarios) {
  const now = Date.now(); let best=0, bestS=Infinity;
  scenarios.forEach((s,si) => { let sc=0; s.questions.forEach((_,qi)=>{const c=srs.cards[prefix+si+'-'+qi]; if(!c)sc-=1e12;else if(c.nextReview<=now)sc-=1e6;else sc+=c.ef;}); if(sc<bestS){bestS=sc;best=si;} });
  return best;
}

function renderMap() {
  if (mapQIdx===0) mapSIdx = pickScenario('map-', mapScenarios);
  const s = mapScenarios[mapSIdx], q = s.questions[mapQIdx];
  currentCard.map = 'map-'+mapSIdx+'-'+mapQIdx; currentQ.map = q;
  document.getElementById('map-passage').textContent = s.passage;
  renderMc('map', q);
}

function renderRead() {
  if (readQIdx===0) readPIdx = pickScenario('read-', readPassages);
  const p = readPassages[readPIdx], q = p.questions[readQIdx];
  currentCard.reading = 'read-'+readPIdx+'-'+readQIdx; currentQ.reading = q;
  document.getElementById('read-passage').innerHTML = p.text + '<span class="source">'+p.source+'</span>';
  renderMc('reading', q);
}

function renderCons(forceIdx) {
  const idx = forceIdx != null ? forceIdx : parseInt(srs.pickNext(consCardIds, 'conservation').split('-')[1]);
  currentCard.conservation = 'cons-'+idx; currentQ.conservation = consQuestions[idx];
  histPos.conservation = (histPos.conservation||0)+1;
  history.conservation = (history.conservation||[]).slice(0, histPos.conservation);
  history.conservation.push({ idx }); renderMc('conservation', consQuestions[idx]);
}

// Math (no SRS — questions are generated)
let mathCat = 'all', mathAns = 0, mathUnit = '', mathEx = '';
function renderMath() {
  const cats = mathCat === 'all' ? Object.keys(mathGenerators) : [mathCat];
  const prob = mathGenerators[pick(cats)]();
  mathAns = prob.a; mathUnit = prob.u; mathEx = prob.ex;
  document.getElementById('math-question').textContent = prob.q;
  const inp = document.getElementById('math-answer'); inp.value = ''; inp.disabled = false;
  document.getElementById('math-feedback').className = 'feedback';
  document.getElementById('math-next').style.display = 'none';
  inp.focus(); timer.start('math');
}
function checkMath() {
  const inp = document.getElementById('math-answer'); if(inp.disabled) return;
  const val = parseFloat(inp.value.replace(/,/g,'')); if(isNaN(val)) return;
  inp.disabled = true; timer.stop(); scores.math.attempted++;
  const fb = document.getElementById('math-feedback');
  if (Math.abs(val - mathAns) <= Math.abs(mathAns)*0.01+0.01) {
    scores.math.correct++;
    fb.innerHTML = 'Correct!' + (mathEx?'<span class="explanation">'+mathEx+'</span>':'');
    fb.className = 'feedback show correct-fb';
  } else {
    fb.innerHTML = 'Incorrect. Answer: '+mathAns+(mathUnit?' '+mathUnit:'')+(mathEx?'<span class="explanation">'+mathEx+'</span>':'');
    fb.className = 'feedback show wrong-fb';
  }
  updateScore('math'); document.getElementById('math-next').style.display = 'inline-block'; state.save();
}

// ===== NAVIGATION =====
function nextQ(section) {
  if (section==='crop') renderCrop();
  else if (section==='map') { mapQIdx++; if(mapQIdx>=mapScenarios[mapSIdx].questions.length) mapQIdx=0; renderMap(); }
  else if (section==='reading') { readQIdx++; if(readQIdx>=readPassages[readPIdx].questions.length) readQIdx=0; renderRead(); }
  else if (section==='conservation') renderCons();
  else if (section==='math') renderMath();
}

function resetSection(section) {
  scores[section].correct=0; scores[section].attempted=0; updateScore(section);
  const pfx = domPrefix(section); srs.resetPrefix(pfx+'-');
  history[section]=[]; histPos[section]=-1;
  if(section==='crop') renderCrop(); else if(section==='map'){mapQIdx=0;renderMap();}
  else if(section==='math') renderMath(); else if(section==='reading'){readQIdx=0;renderRead();}
  else if(section==='conservation') renderCons();
  state.save(); updateDue();
}

// ===== FLASHCARDS =====
let flashIdx = 0;
function renderFlash() {
  const c = crops[flashIdx];
  document.getElementById('flash-front').textContent = c.name;
  document.getElementById('flash-back').innerHTML = `<strong>${c.category}</strong><br><br><strong>Leaf:</strong> ${c.leaf}<br><br><strong>Bark:</strong> ${c.bark}<br><br><strong>Key ID:</strong> ${c.distinguish}<br><br>${imgLink(c.name)}`;
  document.getElementById('flashcard').classList.remove('flipped');
  document.getElementById('flash-counter').textContent = (flashIdx+1)+' / '+crops.length;
}

// ===== EVENT LISTENERS =====
// Tabs
let activeTab = 'crop';
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
  activeTab = btn.dataset.tab;
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(activeTab).classList.add('active'); btn.classList.add('active');
}));

// Next buttons
document.querySelectorAll('.next-btn').forEach(btn => btn.addEventListener('click', () => {
  const section = btn.closest('.section')?.id || activeTab;
  nextQ(section);
}));

// Reset buttons
document.querySelectorAll('.reset-btn').forEach(btn => btn.addEventListener('click', () => resetSection(btn.dataset.section)));

// Flashcard
document.getElementById('flashcard')?.addEventListener('click', () => document.getElementById('flashcard').classList.toggle('flipped'));
document.getElementById('flash-next')?.addEventListener('click', () => { flashIdx=(flashIdx+1)%crops.length; renderFlash(); });
document.getElementById('flash-prev')?.addEventListener('click', () => { flashIdx=(flashIdx-1+crops.length)%crops.length; renderFlash(); });

// Crop mode toggle
document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => {
  const mode = btn.dataset.mode;
  document.getElementById('crop-quiz-btn').classList.toggle('active', mode==='quiz');
  document.getElementById('crop-flash-btn').classList.toggle('active', mode==='flash');
  document.getElementById('crop-quiz-area').style.display = mode==='quiz'?'block':'none';
  document.getElementById('crop-flash-area').style.display = mode==='flash'?'block':'none';
  if(mode==='flash') renderFlash();
}));

// Math
document.getElementById('math-submit')?.addEventListener('click', checkMath);
document.getElementById('math-answer')?.addEventListener('keydown', e => { if(e.key==='Enter') checkMath(); });
document.getElementById('math-cats')?.addEventListener('click', e => {
  if(e.target.tagName==='BUTTON') {
    mathCat = e.target.dataset.cat;
    document.querySelectorAll('#math-cats button').forEach(b=>b.classList.remove('active'));
    e.target.classList.add('active'); renderMath();
  }
});

// Keyboard navigation (A/D/Space)
document.addEventListener('keydown', e => {
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
  if(activeTab==='math') return;
  const s = activeTab;
  if(e.code==='Space') { e.preventDefault(); if(quizState[s]==='revealed') nextQ(s); }
  else if(e.key==='d'||e.key==='D') {
    e.preventDefault();
    if(quizState[s]==='revealed') nextQ(s);
    else if(pending[s]) { pending[s]=false; const sp=document.getElementById(domPrefix(s)+'-skip-prompt'); if(sp)sp.classList.remove('show'); doSkip(s); }
    else { pending[s]=true; const sp=document.getElementById(domPrefix(s)+'-skip-prompt'); if(sp)sp.classList.add('show'); }
  }
  else if(e.key==='a'||e.key==='A') {
    e.preventDefault();
    if(history[s]?.length>0 && (histPos[s]||0)>0) {
      histPos[s]--;
      const entry = history[s][histPos[s]];
      if(s==='crop') renderCrop(entry.idx);
      else if(s==='conservation') renderCons(entry.idx);
    }
  }
});

// ===== INITIAL RENDER =====
['crop','map','math','reading','conservation'].forEach(updateScore);
renderCrop(); renderMap(); renderMath(); renderRead(); renderCons();
updateDue(); glossary.renderList(glossary.entries);
