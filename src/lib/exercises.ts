/**
 * Mashq generatori — so'zlar va grammatika qoidalaridan pedagogik ketma-ketlikda
 * turli xil mashqlar yasaydi. AI shart emas: hammasi oflayn ishlaydi.
 */
import type {
  Exercise, Word, GrammarTopic, GrammarDrill, ChoiceExercise, TypingExercise, MatchExercise, OrderExercise,
  ListenExercise, SpeakExercise, HarmonyExercise, FillExercise, IntroExercise, TrueFalseExercise, Lesson,
} from './types';
import { shuffle, pick, uid } from './utils';
import { attach, harmonyDistractors, SUFFIX_LABELS, IRREGULAR_STEMS, type SuffixKind, normalizeTr } from './turkish';

function distractors(word: Word, pool: Word[], n: number, field: 'tr' | 'uz'): string[] {
  const samePos = pool.filter((w) => w.id !== word.id && w.pos === word.pos && normalizeTr(w[field]) !== normalizeTr(word[field]));
  const rest = pool.filter((w) => w.id !== word.id && normalizeTr(w[field]) !== normalizeTr(word[field]));
  const chosen: string[] = [];
  const seen = new Set<string>([normalizeTr(word[field])]);
  for (const w of [...shuffle(samePos), ...shuffle(rest)]) {
    const v = w[field];
    if (seen.has(normalizeTr(v))) continue;
    seen.add(normalizeTr(v));
    chosen.push(v);
    if (chosen.length >= n) break;
  }
  return chosen;
}

export function intro(word: Word): IntroExercise {
  return {
    id: uid('i'), type: 'intro', wordId: word.id, skill: 'vocab',
    tr: word.tr, uz: word.uz, example_tr: word.example_tr, example_uz: word.example_uz,
    cognate: word.cognate, false_friend: word.false_friend,
  };
}

/** Turkcha → o'zbekcha (tanib olish) */
export function choiceTrToUz(word: Word, pool: Word[]): ChoiceExercise {
  const opts = shuffle([word.uz, ...distractors(word, pool, 3, 'uz')]);
  return {
    id: uid('c'), type: 'choice', wordId: word.id, skill: 'vocab',
    prompt: word.tr, promptSub: 'Tarjimasini tanlang', options: opts, answer: opts.indexOf(word.uz), tts: word.tr,
    explain: word.cognate ? `💡 ${word.cognate}` : undefined,
  };
}

/** O'zbekcha → turkcha (eslab qolish) */
export function choiceUzToTr(word: Word, pool: Word[]): ChoiceExercise {
  const opts = shuffle([word.tr, ...distractors(word, pool, 3, 'tr')]);
  return {
    id: uid('c'), type: 'choice', wordId: word.id, skill: 'vocab',
    prompt: word.uz, promptSub: 'Turkchasini tanlang', options: opts, answer: opts.indexOf(word.tr),
    explain: word.example_tr ? `${word.example_tr} — ${word.example_uz ?? ''}` : undefined,
  };
}

/** Yozish (production) */
export function typingUzToTr(word: Word): TypingExercise {
  return {
    id: uid('t'), type: 'typing', wordId: word.id, skill: 'writing',
    prompt: word.uz, promptSub: 'Turkchasini yozing', answer: word.tr,
    accept: word.tr.includes('(') ? [word.tr.replace(/\s*\(.*?\)\s*/g, '').trim()] : [],
    explain: word.example_tr ? `${word.example_tr} — ${word.example_uz ?? ''}` : undefined,
  };
}

/** Tinglab yozish / tanlash */
export function listenExercise(word: Word, pool: Word[], withOptions = true): ListenExercise {
  const base: ListenExercise = {
    id: uid('l'), type: 'listen', wordId: word.id, skill: 'listening',
    tts: word.example_tr && word.example_tr.length < 40 ? word.tr : word.tr, answer: word.tr, translation: word.uz,
  };
  if (withOptions) base.options = shuffle([word.tr, ...distractors(word, pool, 3, 'tr')]);
  return base;
}

export function speakExercise(word: Word): SpeakExercise {
  const useSentence = word.example_tr && word.example_tr.length <= 45;
  return {
    id: uid('s'), type: 'speak', wordId: word.id, skill: 'speaking',
    text: useSentence ? word.example_tr! : word.tr, translation: useSentence ? word.example_uz ?? word.uz : word.uz,
  };
}

export function matchExercise(words: Word[]): MatchExercise {
  return { id: uid('m'), type: 'match', skill: 'vocab', pairs: words.map((w) => ({ a: w.tr, b: w.uz, wordId: w.id })) };
}

/** Jumla tuzish: misol gapni so'zlarga bo'lib aralashtirish */
export function orderExercise(word: Word, pool: Word[]): OrderExercise | null {
  if (!word.example_tr) return null;
  const tokens = word.example_tr.replace(/[.!?]$/, '').split(/\s+/);
  if (tokens.length < 3 || tokens.length > 9) return null;
  const extra = pick(pool.filter((w) => w.id !== word.id && !w.tr.includes(' ')), 2).map((w) => w.tr);
  const punct = word.example_tr.match(/[.!?]$/)?.[0] ?? '';
  return {
    id: uid('o'), type: 'order', wordId: word.id, skill: 'grammar',
    prompt: (word.example_uz ?? '').replace(/[.!?]$/, '') + punct,
    answer: tokens, tokens: shuffle([...tokens, ...extra]), tts: word.example_tr,
  };
}

export function trueFalseExercise(word: Word, pool: Word[]): TrueFalseExercise {
  const truthful = Math.random() < 0.5;
  const other = distractors(word, pool, 1, 'uz')[0] ?? word.uz;
  return {
    id: uid('tf'), type: 'truefalse', wordId: word.id, skill: 'reading',
    statement: `${word.tr} = ${truthful ? word.uz : other}`, sub: 'To‘g‘ri yoki noto‘g‘ri?', answer: truthful,
    explain: `${word.tr} = ${word.uz}`,
  };
}

const HARMONY_KINDS_SAFE: SuffixKind[] = ['plural', 'locative', 'ablative', 'question', 'with'];
const HARMONY_KINDS_ADJ: SuffixKind[] = ['plural', 'locative', 'question'];
const HARMONY_KINDS_ALL: SuffixKind[] = ['plural', 'locative', 'ablative', 'dative', 'accusative', 'genitive', 'question', 'poss1', 'poss2', 'poss3'];

export function harmonyExercise(word: Word, kind?: SuffixKind): HarmonyExercise | null {
  const stem = word.tr.trim();
  if (stem.includes(' ') || stem.includes('?') || stem.length < 2) return null;
  const irregular = IRREGULAR_STEMS.has(stem.toLowerCase());
  const kinds = irregular ? HARMONY_KINDS_SAFE : word.pos === 'adj' ? HARMONY_KINDS_ADJ : HARMONY_KINDS_ALL;
  const k = kind && kinds.includes(kind) ? kind : kinds[Math.floor(Math.random() * kinds.length)];
  const answer = attach(stem, k);
  const wrong = harmonyDistractors(stem, k, answer).slice(0, 3);
  if (wrong.length < 2) return null;
  const options = shuffle([answer, ...wrong]);
  return {
    id: uid('h'), type: 'harmony', wordId: word.id, skill: 'grammar',
    stem, stemUz: word.uz, suffixLabel: SUFFIX_LABELS[k].uz + ' · ' + SUFFIX_LABELS[k].label, answer, options, rule: SUFFIX_LABELS[k].rule,
  };
}

export function fillFromDrill(d: GrammarDrill): FillExercise {
  return { id: uid('f'), type: 'fill', skill: 'grammar', sentence: d.sentence, answer: d.answer, options: shuffle(d.options), explain: d.explain };
}

export function harmonyEligible(words: Word[]) {
  return words.filter((w) => (w.pos === 'noun' || w.pos === 'adj') && !w.tr.includes(' ') && !w.tr.includes('?') && w.tr.length >= 2 && /^[a-zçğıöşüâîû]+$/i.test(w.tr));
}

/** ---------- Sessiya tuzuvchilar ---------- */

export interface LessonSessionOpts {
  newWords: Word[];      // bu darsning so'zlari
  pool: Word[];          // distraktorlar uchun umumiy so'zlar
  reviewWords?: Word[];  // navbatdagi takrorlashlar (interleaving)
  grammar?: GrammarTopic[];
  lesson?: Lesson;
  maxItems?: number;
}

/** Dars sessiyasi: tanishtirish → tanib olish → tinglash → eslash → yozish → jumla → grammatika → gapirish */
export function buildLessonSession(o: LessonSessionOpts): Exercise[] {
  const introduced = new Map(o.pool.map(w => [w.id, w]));
  let pool = [...introduced.values()];
  // newWords allaqachon tartiblangan (ko'rilmaganlar birinchi) — sessiyaga 8 ta so'z
  const words = o.newWords.slice(0, 8);
  const ex: Exercise[] = [];
  const chunks: Word[][] = [];
  for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4));

  for (const chunk of chunks) {
    // 1) tanishtirish
    for (const w of chunk) { ex.push(intro(w)); introduced.set(w.id, w); }
    pool = [...introduced.values()];
    // 2) tanib olish (tr→uz)
    for (const w of shuffle(chunk)) ex.push(choiceTrToUz(w, pool));
    // 3) match
    if (chunk.length >= 3) ex.push(matchExercise(chunk));
    // 4) tinglash va eslash aralash
    for (const w of shuffle(chunk)) ex.push(Math.random() < 0.5 ? listenExercise(w, pool) : choiceUzToTr(w, pool));
    // 5) ishlab chiqarish
    const prod = shuffle(chunk).slice(0, 2);
    for (const w of prod) {
      const ord = orderExercise(w, pool);
      ex.push(ord ?? typingUzToTr(w));
    }
    if (chunk[0]) ex.push(speakExercise(chunk[0]));
  }

  // 6) grammatika (agar bo'lsa)
  for (const g of o.grammar ?? []) {
    for (const d of shuffle(g.drills ?? []).slice(0, 4)) ex.push(fillFromDrill(d));
  }

  // 7) interleaving: eski so'zlarni aralashtirish (har 5-6 mashqdan keyin)
  const reviews = (o.reviewWords ?? []).slice(0, 6).map((w) => (Math.random() < 0.5 ? choiceUzToTr(w, pool) : listenExercise(w, pool)));
  const merged: Exercise[] = [];
  let ri = 0;
  ex.forEach((e, i) => {
    merged.push(e);
    if (i > 0 && i % 6 === 0 && ri < reviews.length) merged.push(reviews[ri++]);
  });
  while (ri < reviews.length) merged.push(reviews[ri++]);
  return o.maxItems ? merged.slice(0, o.maxItems) : merged;
}

/** Takrorlash sessiyasi (FSRS navbati) — turlicha, tez, har so'z 1 marta */
export function buildReviewSession(due: Word[], pool: Word[], max = 20): Exercise[] {
  const types = ['choiceUz', 'choiceTr', 'listen', 'typing', 'truefalse', 'harmony'];
  return shuffle(due).slice(0, max).map((w, i) => {
    const t = types[i % types.length];
    switch (t) {
      case 'choiceUz': return choiceUzToTr(w, pool);
      case 'choiceTr': return choiceTrToUz(w, pool);
      case 'listen': return listenExercise(w, pool);
      case 'typing': return typingUzToTr(w);
      case 'truefalse': return trueFalseExercise(w, pool);
      default: return harmonyEligible([w]).length ? harmonyExercise(w) ?? choiceUzToTr(w, pool) : choiceUzToTr(w, pool);
    }
  });
}

/** Boss: bo'lim bo'yicha aralash sinov */
export function buildBossSession(unitWords: Word[], pool: Word[], grammar: GrammarTopic[], n = 16): Exercise[] {
  const ws = shuffle(unitWords);
  const ex: Exercise[] = [];
  ws.slice(0, 4).forEach((w) => ex.push(choiceTrToUz(w, pool)));
  ws.slice(4, 7).forEach((w) => ex.push(listenExercise(w, pool)));
  ws.slice(7, 10).forEach((w) => ex.push(typingUzToTr(w)));
  ws.slice(10, 12).forEach((w) => { const o = orderExercise(w, pool); if (o) ex.push(o); });
  if (ws.length >= 4) ex.push(matchExercise(ws.slice(12, 16).length >= 3 ? ws.slice(12, 16) : ws.slice(0, 4)));
  const drills = grammar.flatMap((g) => g.drills ?? []);
  shuffle(drills).slice(0, 4).forEach((d) => ex.push(fillFromDrill(d)));
  harmonyEligible(ws).slice(0, 2).forEach((w) => { const h = harmonyExercise(w); if (h) ex.push(h); });
  if (ws[0]) ex.push(speakExercise(ws[0]));
  return shuffle(ex).slice(0, n);
}

/** Duel: faqat tez (tanlov) savollar */
export function buildDuelQuestions(words: Word[], n = 10): Exercise[] {
  const pool = words;
  return shuffle(words).slice(0, n).map((w, i) => (i % 2 === 0 ? choiceTrToUz(w, pool) : choiceUzToTr(w, pool)));
}

export function buildHarmonySession(words: Word[], n = 12): Exercise[] {
  const elig = shuffle(harmonyEligible(words));
  const out: Exercise[] = [];
  for (const w of elig) {
    const h = harmonyExercise(w);
    if (h) out.push(h);
    if (out.length >= n) break;
  }
  return out;
}

export function buildListenSession(words: Word[], n = 12): Exercise[] {
  return shuffle(words).slice(0, n).map((w, i) => listenExercise(w, words, i % 3 !== 2));
}

export function buildSpeakSession(words: Word[], n = 8): Exercise[] {
  return shuffle(words.filter((w) => w.example_tr)).slice(0, n).map((w) => speakExercise(w));
}

export function buildBuilderSession(words: Word[], n = 10): Exercise[] {
  const out: Exercise[] = [];
  for (const w of shuffle(words)) {
    const o = orderExercise(w, words);
    if (o) out.push(o);
    if (out.length >= n) break;
  }
  return out;
}

export function buildMatchSession(words: Word[], rounds = 4, size = 5): Exercise[] {
  const ws = shuffle(words);
  const out: Exercise[] = [];
  for (let r = 0; r < rounds; r++) {
    const chunk = ws.slice(r * size, r * size + size);
    if (chunk.length >= 3) out.push(matchExercise(chunk));
  }
  return out;
}

export function buildGrammarSession(topics: GrammarTopic[], n = 12): Exercise[] {
  const drills = shuffle(topics.flatMap((t) => t.drills ?? []));
  return drills.slice(0, n).map(fillFromDrill);
}

/** Sinov imtihoni bo'limlari (Multi-level formatiga yaqin) */
export function buildExamSections(words: Word[], grammar: GrammarTopic[], cfg: { listening: number; reading: number; speaking: number }) {
  const pool = words;
  const listening: Exercise[] = shuffle(words.filter((w) => w.example_tr)).slice(0, cfg.listening).map((w) => ({
    id: uid('xl'), type: 'listen', wordId: w.id, skill: 'listening',
    tts: w.example_tr!, answer: w.example_tr!, translation: w.example_uz ?? '',
    options: shuffle([w.example_tr!, ...pick(words.filter((x) => x.id !== w.id && x.example_tr), 3).map((x) => x.example_tr!)]),
  } as ListenExercise));
  const reading: Exercise[] = [
    ...shuffle(words).slice(0, Math.ceil(cfg.reading / 2)).map((w) => trueFalseExercise(w, pool)),
    ...shuffle(grammar.flatMap((g) => g.drills ?? [])).slice(0, Math.floor(cfg.reading / 2)).map(fillFromDrill),
  ];
  const speaking: Exercise[] = buildSpeakSession(words, cfg.speaking);
  return { listening, reading, speaking };
}
