'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameShell, { Hud, type GameData, type GameResult } from '@/components/games/GameShell';
import { ChoiceView, ListenView, HarmonyView, FillView, TypingView, OrderView, TrueFalseView } from '@/components/exercises/ExerciseViews';
import { choiceTrToUz, choiceUzToTr, listenExercise, harmonyExercise, fillFromDrill, typingUzToTr, orderExercise, trueFalseExercise, harmonyEligible } from '@/lib/exercises';
import { SrsSession } from '@/lib/srs-client';
import type { Exercise } from '@/lib/types';
import { shuffle, cn } from '@/lib/utils';

const HOWTO = [
  { icon: '🗼', title: '20 qavatli minora', text: 'Har qavat — bitta topshiriq. Pastki qavatlar oson (tanlov), yuqorida yozish, grammatika va jumla tuzish.' },
  { icon: '❤️', title: '3 jon va nazorat nuqtalari', text: 'Xato = 1 jon. Har 5-qavatda nazorat nuqtasi: 1 jon qaytadi. Jonlar tugasa — qulaysiz, natija = yetgan qavat.' },
  { icon: '🏆', title: 'Rekord — qavat', text: 'Ball = qavatlar + tezlik bonusi. 20-qavatga chiqqan — "Minora ustasi" yutug‘i. Har safar savollar boshqa.' },
];

type Floor = { ex: Exercise; kind: string };

function Tower({ data, onEnd }: { data: GameData; onEnd: (r: GameResult) => void }) {
  const floors = useMemo<Floor[]>(() => {
    const ws = shuffle(data.words.length >= 20 ? data.words : data.allWords);
    const pool = data.allWords;
    const drills = shuffle(data.grammar.flatMap((g) => g.drills ?? []));
    const harm = harmonyEligible(pool);
    const out: Floor[] = [];
    let wi = 0; const next = () => ws[wi++ % ws.length];
    for (let f = 1; f <= 20; f++) {
      let ex: Exercise | null = null; let kind = 'choice';
      if (f <= 5) { ex = f % 2 ? choiceTrToUz(next(), pool) : choiceUzToTr(next(), pool); }
      else if (f <= 10) {
        const r = f % 3;
        if (r === 0) { ex = listenExercise(next(), pool, true); kind = 'listen'; }
        else if (r === 1) { const h = harmonyExercise(shuffle(harm)[0]); ex = h; kind = 'harmony'; }
        else { ex = trueFalseExercise(next(), pool); kind = 'truefalse'; }
      } else if (f <= 15) {
        if (f % 2 && drills.length) { ex = fillFromDrill(drills[f % drills.length]); kind = 'fill'; }
        else { ex = typingUzToTr(next()); kind = 'typing'; }
      } else {
        const o = orderExercise(next(), pool);
        if (o && f % 2) { ex = o; kind = 'order'; }
        else if (f % 3 === 0 && drills.length) { ex = fillFromDrill(drills[(f * 7) % drills.length]); kind = 'fill'; }
        else { ex = typingUzToTr(next()); kind = 'typing'; }
      }
      if (!ex) { ex = choiceTrToUz(next(), pool); kind = 'choice'; }
      out.push({ ex, kind });
    }
    return out;
  }, [data]);

  const [floor, setFloor] = useState(0);
  const [override, setOverride] = useState<Record<number, Floor>>({});
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [fall, setFall] = useState(false);
  const shownAt = useRef(Date.now());
  const started = useRef(Date.now());
  const st = useRef({ correct: 0, wrong: 0, mistakes: [] as { tr: string; uz: string }[], ended: false });
  const srs = useMemo(() => new SrsSession('tower'), []);
  useEffect(() => { srs.load(); }, [srs]);
  useEffect(() => { shownAt.current = Date.now(); }, [floor]);

  const cur = override[floor] ?? floors[floor];

  const finish = useCallback((reached: number, won: boolean) => {
    if (st.current.ended) return;
    st.current.ended = true;
    const s = st.current;
    onEnd({ score: reached, correct: s.correct, total: s.correct + s.wrong, xp: Math.min(70, reached * 3 + (won ? 10 : 0)), durationSec: Math.round((Date.now() - started.current) / 1000), perfect: won && s.wrong === 0,
      details: [{ label: 'Qavat', value: `${reached}/20` }, { label: 'Xatolar', value: s.wrong }, { label: 'Jon', value: lives }], mistakes: s.mistakes });
  }, [onEnd, lives]);

  function onAnswer(ok: boolean, meta?: { usedHint?: boolean; detail?: string; skipped?: boolean }) {
    if (answered || !cur) return;
    const ms = Date.now() - shownAt.current;
    srs.grade(cur.ex.wordId, ok, ms, cur.ex.type, meta?.usedHint);
    setAnswered({ ok, detail: meta?.detail });
    if (ok) { st.current.correct += 1; setScore((s) => s + 1 + (ms < 4000 ? 1 : 0)); }
    else {
      st.current.wrong += 1;
      const w = data.allWords.find((x) => x.id === cur.ex.wordId);
      if (w) st.current.mistakes.push({ tr: w.tr, uz: w.uz });
      setLives((l) => l - 1);
    }
  }

  function next() {
    if (!answered) return;
    const ok = answered.ok;
    const livesNow = ok ? lives : lives; // lives already decremented
    setAnswered(null);
    if (!ok && livesNow <= 0) { setFall(true); setTimeout(() => finish(floor, false), 900); return; }
    if (ok) {
      const nf = floor + 1;
      if (nf >= 20) { finish(20, true); return; }
      if (nf % 5 === 0 && lives < 3) setLives((l) => Math.min(3, l + 1));
      setFloor(nf);
    } else {
      // xato: shu qavat yangi (osonroq) savol bilan qaytadi
      const w = shuffle(data.words)[0];
      const repl: Exercise = floor < 10 ? choiceTrToUz(w, data.allWords) : listenExercise(w, data.allWords, true);
      setOverride((o) => ({ ...o, [floor]: { ex: repl, kind: repl.type } }));
      shownAt.current = Date.now();
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter' && answered) next(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, lives, floor]);

  if (!cur) return null;
  const p = { onAnswer, answered: Boolean(answered) } as const;
  const view = (() => {
    const e = cur.ex;
    switch (e.type) {
      case 'choice': return <ChoiceView key={e.id + floor} ex={e} {...p} />;
      case 'listen': return <ListenView key={e.id} ex={e} {...p} />;
      case 'harmony': return <HarmonyView key={e.id} ex={e} {...p} />;
      case 'fill': return <FillView key={e.id} ex={e} {...p} />;
      case 'typing': return <TypingView key={e.id} ex={e} {...p} />;
      case 'order': return <OrderView key={e.id} ex={e} {...p} />;
      case 'truefalse': return <TrueFalseView key={e.id} ex={e} {...p} />;
      default: return null;
    }
  })();

  return (
    <div className={cn(fall && 'animate-shake')}>
      <Hud score={score} lives={lives} extra={<span className="card-soft px-3 py-1.5 text-xs text-ink-300">🗼 {floor + 1}-qavat</span>} />
      {/* minora vizuali */}
      <div className="mb-4 flex items-end gap-0.5 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={cn('flex-1 rounded-t-sm transition-all duration-500', i < floor ? 'bg-gradient-to-t from-ember-600 to-gold-400' : i === floor ? 'bg-white/40 animate-pulse' : 'bg-white/10', (i + 1) % 5 === 0 && 'border-r border-gold-400/50')} style={{ height: 8 + i * 1.6 }} title={`${i + 1}-qavat`} />
        ))}
      </div>
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-ink-400"><span>{cur.kind === 'choice' ? 'Tanlov' : cur.kind === 'listen' ? 'Tinglash' : cur.kind === 'harmony' ? 'Uyg‘unlik' : cur.kind === 'fill' ? 'Grammatika' : cur.kind === 'typing' ? 'Yozish' : cur.kind === 'order' ? 'Jumla' : 'To‘g‘ri/noto‘g‘ri'}</span>{(floor + 1) % 5 === 0 && <span className="text-gold-300">⭐ nazorat nuqtasi</span>}</div>
        <div key={cur.ex.id + floor} className="animate-pop">{view}</div>
      </div>
      {answered && (
        <div className={cn('mt-3 rounded-2xl p-3 text-sm', answered.ok ? 'bg-teal-500/15 text-teal-200' : 'bg-rose-500/15 text-rose-200')}>
          <div className="font-semibold">{answered.ok ? (floor + 1 >= 20 ? '🏆 Minora cho‘qqisi!' : `✓ ${floor + 2}-qavatga ko‘tarilyapsiz`) : lives <= 0 ? '💥 Minora qulamoqda…' : `✗ Jon ketdi (${lives} qoldi) — shu qavat qaytadi`}</div>
          {answered.detail && <div className="text-xs">{answered.detail}</div>}
          {cur.ex.explain && <div className="text-xs text-ink-200">{cur.ex.explain}</div>}
          <button className={cn('btn mt-2 w-full', answered.ok ? 'btn-teal' : 'bg-rose-500 text-white')} onClick={next}>Davom etish</button>
        </div>
      )}
    </div>
  );
}

export default function TowerPage() {
  return (
    <GameShell id="tower" title="Minora" icon="🗼" desc="Roguelike mashg‘ulot: 20 qavat, qiyinlik oshib boradi, 3 jon, nazorat nuqtalari. Qancha yuqoriga chiqa olasiz?" howTo={HOWTO} minWords={16}>
      {(data, onEnd) => <Tower data={data} onEnd={onEnd} />}
    </GameShell>
  );
}
