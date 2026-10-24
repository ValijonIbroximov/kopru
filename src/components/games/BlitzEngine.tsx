'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChoiceExercise, Word } from '@/lib/types';
import { shuffle } from '@/lib/utils';
import { normalizeTr } from '@/lib/turkish';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { Hud, useCountdown, type GameResult } from './GameShell';
import { SrsSession } from '@/lib/srs-client';
import { cn } from '@/lib/utils';

/** Seed bilan bir xil savollar — kunlik chaqiriq va do'st chaqirig'i uchun */
export function buildBlitzQuestions(words: Word[], n: number, seed?: number): ChoiceExercise[] {
  const pool = words.length >= 8 ? words : words;
  const ws = shuffle(pool, seed).slice(0, n);
  return ws.map((w, i) => {
    const dir = (seed !== undefined ? (seed + i) % 2 : Math.random() < 0.5 ? 0 : 1) === 0;
    const field = dir ? 'uz' : 'tr';
    const seen = new Set<string>([normalizeTr(w[field])]);
    const dis: string[] = [];
    for (const x of shuffle(pool.filter((p) => p.id !== w.id), seed !== undefined ? seed * 31 + i : undefined)) {
      const v = x[field];
      if (seen.has(normalizeTr(v))) continue;
      seen.add(normalizeTr(v)); dis.push(v);
      if (dis.length >= 3) break;
    }
    const opts = shuffle([w[field], ...dis], seed !== undefined ? seed * 7 + i : undefined);
    return {
      id: `b${i}_${w.id}`, type: 'choice', wordId: w.id, skill: 'vocab',
      prompt: dir ? w.tr : w.uz, promptSub: dir ? 'Tarjimasi?' : 'Turkchasi?', options: opts, answer: opts.indexOf(w[field]), tts: dir ? w.tr : undefined,
    };
  });
}

interface Props { questions: ChoiceExercise[]; seconds?: number; onEnd: (r: GameResult) => void; mode?: string; allWords?: Word[] }

export default function BlitzEngine({ questions, seconds = 60, onEnd, mode = 'blitz', allWords = [] }: Props) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const shownAt = useRef(Date.now());
  const started = useRef(Date.now());
  const mistakes = useRef<{ tr: string; uz: string }[]>([]);
  const srs = useMemo(() => new SrsSession(mode), [mode]);
  const finished = useRef(false);
  const stats = useRef({ score: 0, correct: 0, answered: 0, maxCombo: 0 });

  useEffect(() => { srs.load(); }, [srs]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setRunning(false);
    const s = stats.current;
    onEnd({ score: s.score, correct: s.correct, total: s.answered, xp: Math.min(60, Math.round(s.correct * 2 + s.maxCombo)), durationSec: Math.round((Date.now() - started.current) / 1000), perfect: s.answered >= 10 && s.correct === s.answered,
      details: [{ label: 'Javoblar', value: s.answered }, { label: 'Eng uzun combo', value: s.maxCombo }, { label: 'Aniqlik', value: s.answered ? Math.round((s.correct / s.answered) * 100) + '%' : '—' }],
      mistakes: mistakes.current });
  }, [onEnd]);

  const [time, setTime] = useCountdown(seconds, running, finish);
  const q = questions[idx % questions.length];

  const answer = useCallback((i: number) => {
    if (picked !== null || !running || !q) return;
    const ms = Date.now() - shownAt.current;
    const ok = i === q.answer;
    setPicked(i); setFlash(ok ? 'ok' : 'bad');
    srs.grade(q.wordId, ok, ms, 'choice');
    const st = stats.current;
    st.answered += 1;
    if (ok) {
      const c = combo + 1;
      const speedBonus = ms < 1500 ? 5 : ms < 3000 ? 2 : 0;
      const gained = 10 + speedBonus + (c >= 3 ? 5 : 0);
      st.score += gained; st.correct += 1; st.maxCombo = Math.max(st.maxCombo, c);
      setScore(st.score); setCorrect(st.correct); setCombo(c); setMaxCombo(st.maxCombo);
      if (c > 0 && c % 5 === 0) { setTime((t) => t + 3); setBonusMsg('+3 soniya! 🔥'); setTimeout(() => setBonusMsg(null), 900); }
    } else {
      setCombo(0);
      const w = allWords.find((x) => x.id === q.wordId);
      if (w) mistakes.current.push({ tr: w.tr, uz: w.uz });
    }
    setTimeout(() => { setPicked(null); setFlash(null); setIdx((x) => x + 1); shownAt.current = Date.now(); }, ok ? 280 : 650);
  }, [picked, running, q, combo, srs, allWords, setTime]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 4) answer(n - 1); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [answer]);

  if (!q) return null;
  return (
    <div className={cn('relative transition-colors duration-200', flash === 'ok' && 'bg-teal-500/5', flash === 'bad' && 'bg-rose-500/5')}>
      <Hud score={score} combo={combo} time={time} extra={<span className="card-soft px-3 py-1.5 text-xs text-ink-300">✓ {correct}</span>} />
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-ember-500 transition-all duration-1000 ease-linear" style={{ width: `${(time / Math.max(seconds, 1)) * 100}%` }} /></div>
      {bonusMsg && <div className="absolute right-2 top-14 animate-pop rounded-full bg-gold-400/20 px-3 py-1 text-sm font-bold text-gold-300">{bonusMsg}</div>}
      <div key={idx} className="mt-6 animate-pop text-center">
        <div className="text-xs uppercase tracking-wider text-ink-400">{q.promptSub}</div>
        <div className="mt-1 flex items-center justify-center gap-3"><div className="font-display text-4xl font-bold text-white">{q.prompt}</div>{q.tts && <SpeakButton text={q.tts} size="sm" />}</div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => (
          <button key={i} type="button" onClick={() => answer(i)} disabled={picked !== null}
            className={cn('option py-4 text-center text-lg', picked !== null && i === q.answer && 'option-correct', picked === i && i !== q.answer && 'option-wrong')}>
            <span className="kbd mr-2 hidden sm:inline">{i + 1}</span>{o}
          </button>
        ))}
      </div>
      <div className="mt-4 text-center text-xs text-ink-500">Tez javob = ko‘proq ball · har 5 ketma-ket to‘g‘ri = +3 soniya · {maxCombo > 0 ? `eng uzun combo ${maxCombo}` : 'combo yig‘ing'}</div>
    </div>
  );
}
