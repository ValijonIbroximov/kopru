'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import GameShell, { Hud, type GameData, type GameResult } from '@/components/games/GameShell';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { SrsSession } from '@/lib/srs-client';
import type { Word } from '@/lib/types';
import { shuffle, cn } from '@/lib/utils';
import { speak } from '@/lib/speech';

const HOWTO = [
  { icon: '🌉', title: 'Ko‘prikni saqlang', text: 'Yashirin turkcha so‘z (o‘zbekcha ma’nosi beriladi). Harflarni bosib so‘zni toping. Har noto‘g‘ri harf — ko‘prikdan bir taxta tushadi.' },
  { icon: '🪵', title: '6 ta taxta', text: '6 ta xato — ko‘prik qulaydi, so‘z ochiladi va keyingisiga o‘tasiz. Turkcha harflar (ç ğ ı ö ş ü) klaviaturada bor.' },
  { icon: '💎', title: 'Ball', text: 'Topilgan so‘z: 10 + qolgan taxtalar ×2. 8 ta so‘z. Xatosiz so‘z = +5 bonus. Ovozni (🔊) eshitish mumkin — bu ishora!' },
];

const KEYS = ['a', 'b', 'c', 'ç', 'd', 'e', 'f', 'g', 'ğ', 'h', 'ı', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'ö', 'p', 'r', 's', 'ş', 't', 'u', 'ü', 'v', 'y', 'z'];
const MAX = 6;

function Bridge({ data, onEnd }: { data: GameData; onEnd: (r: GameResult) => void }) {
  const words = useMemo<Word[]>(() => shuffle((data.words.length >= 8 ? data.words : data.allWords).filter((w) => /^[a-zçğıöşü]{3,10}$/i.test(w.tr))).slice(0, 8), [data]);
  const [i, setI] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'play' | 'won' | 'lost'>('play');
  const [listened, setListened] = useState(false);
  const st = useRef({ correct: 0, started: Date.now(), shown: Date.now(), mistakes: [] as { tr: string; uz: string }[] });
  const srs = useMemo(() => new SrsSession('bridge'), []);
  useEffect(() => { srs.load(); }, [srs]);
  const w = words[i];
  useEffect(() => { setGuessed(new Set()); setWrong(0); setStatus('play'); setListened(false); st.current.shown = Date.now(); }, [i]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { const k = e.key.toLocaleLowerCase('tr-TR'); if (KEYS.includes(k)) press(k); if (e.key === 'Enter' && status !== 'play') next(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guessed, wrong, status, i]);

  if (!w) return null;
  const answer = w.tr.toLocaleLowerCase('tr-TR');
  const letters = [...answer];
  const uniq = new Set(letters);

  function press(k: string) {
    if (status !== 'play' || guessed.has(k)) return;
    const g = new Set(guessed); g.add(k); setGuessed(g);
    if (uniq.has(k)) {
      if ([...uniq].every((c) => g.has(c))) {
        const left = MAX - wrong;
        const pts = 10 + left * 2 + (wrong === 0 ? 5 : 0) - (listened ? 2 : 0);
        setScore((s) => s + Math.max(5, pts)); st.current.correct += 1; setStatus('won');
        srs.grade(w.id, true, Date.now() - st.current.shown, 'typing', listened);
        speak(w.tr);
      }
    } else {
      const nw = wrong + 1; setWrong(nw);
      if (nw >= MAX) { setStatus('lost'); st.current.mistakes.push({ tr: w.tr, uz: w.uz }); srs.grade(w.id, false, Date.now() - st.current.shown, 'typing'); }
    }
  }
  function next() {
    if (i + 1 >= words.length) {
      const s = st.current;
      onEnd({ score, correct: s.correct, total: words.length, xp: Math.min(40, s.correct * 4), durationSec: Math.round((Date.now() - s.started) / 1000), perfect: s.correct === words.length, mistakes: s.mistakes, details: [{ label: 'So‘zlar', value: `${s.correct}/${words.length}` }] });
    } else setI(i + 1);
  }

  const planks = MAX - wrong;
  return (
    <div>
      <Hud score={score} extra={<span className="card-soft px-3 py-1.5 text-xs text-ink-300">{i + 1}/{words.length}</span>} />
      {/* ko'prik vizuali */}
      <div className="relative mx-auto mb-3 h-28 w-full max-w-md">
        <svg viewBox="0 0 320 110" className="h-full w-full">
          <path d="M10 70 Q160 -10 310 70" stroke="#ff8f4d" strokeWidth="5" fill="none" strokeLinecap="round" opacity={status === 'lost' ? 0.3 : 1} />
          {Array.from({ length: MAX }).map((_, k) => {
            const x = 40 + k * 48; const alive = k < planks;
            return <g key={k} className="transition-all duration-500" style={{ transform: alive ? 'none' : `translateY(${30 + k * 3}px) rotate(${(k % 2 ? 1 : -1) * 25}deg)`, transformOrigin: `${x + 20}px 80px`, opacity: alive ? 1 : 0.15 }}>
              <rect x={x} y={76} width={40} height={10} rx={3} fill={alive ? '#2fd1bc' : '#f43f6e'} />
              <line x1={x + 20} y1={76} x2={x + 20} y2={40 - Math.sin(((k + 0.5) / MAX) * Math.PI) * 22} stroke="#2fd1bc" strokeWidth="2" opacity={alive ? 0.7 : 0} />
            </g>;
          })}
          <rect x={0} y={86} width={320} height={6} rx={3} fill="rgba(255,255,255,0.15)" />
          <text x={160} y={104} textAnchor="middle" fontSize="11" fill={planks <= 2 ? '#fb6f92' : '#9aa6b8'}>{status === 'lost' ? 'Ko‘prik quladi…' : `${planks} taxta qoldi`}</text>
          <text x={14 + (planks / MAX) * 290} y={30} fontSize="18">🚶</text>
        </svg>
      </div>
      <div className="card-soft p-4 text-center">
        <div className="text-[10px] uppercase tracking-wider text-ink-400">Ma’nosi</div>
        <div className="font-display text-2xl font-bold text-ember-300">{w.uz}</div>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-ink-400"><span className="chip">{w.pos}</span><span className="chip">{letters.length} harf</span><button className="chip" onClick={() => { setListened(true); speak(w.tr); }}>🔊 eshitish (−2)</button></div>
      </div>
      <div className={cn('mt-5 flex flex-wrap justify-center gap-1.5', status === 'lost' && 'animate-shake')}>
        {letters.map((c, k) => (
          <div key={k} className={cn('grid h-12 w-10 place-items-center rounded-xl border text-xl font-bold uppercase sm:h-14 sm:w-12', guessed.has(c) || status !== 'play' ? (status === 'lost' && !guessed.has(c) ? 'border-rose-500 bg-rose-500/20 text-rose-200' : 'border-teal-400/60 bg-teal-500/20 text-white') : 'border-white/15 bg-white/[0.03] text-transparent')}>{guessed.has(c) || status !== 'play' ? c : '_'}</div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {KEYS.map((k) => {
          const used = guessed.has(k); const good = used && uniq.has(k);
          return <button key={k} type="button" disabled={used || status !== 'play'} onClick={() => press(k)}
            className={cn('h-10 w-9 rounded-xl border text-base font-semibold uppercase transition active:scale-95 sm:h-11 sm:w-10', used ? (good ? 'border-teal-400/50 bg-teal-500/20 text-teal-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-300/60') : 'border-white/10 bg-ink-800 text-white hover:border-white/40')}>{k}</button>;
        })}
      </div>
      {status !== 'play' && (
        <div className={cn('mt-4 rounded-2xl p-3 text-sm', status === 'won' ? 'bg-teal-500/15 text-teal-200' : 'bg-rose-500/15 text-rose-200')}>
          <div className="flex items-center justify-between"><span>{status === 'won' ? '✓ Topdingiz: ' : '✗ So‘z: '}<b className="text-white">{w.tr}</b> — {w.uz}</span><SpeakButton text={w.tr} size="sm" /></div>
          {w.example_tr && <div className="mt-1 text-xs text-ink-200">{w.example_tr} — {w.example_uz}</div>}
          <button className={cn('btn mt-2 w-full', status === 'won' ? 'btn-teal' : 'bg-rose-500 text-white')} onClick={next}>Keyingi so‘z <span className="kbd ml-1 hidden sm:inline">Enter</span></button>
        </div>
      )}
    </div>
  );
}

export default function BridgePage() {
  return (
    <GameShell id="bridge" title="So‘z ko‘prigi" icon="🌉" desc="Hangman uslubida: harflarni toping, ko‘prik buzilmasin. Turkcha imlo va harflar bilan ishlash uchun ideal." howTo={HOWTO} minWords={8}>
      {(data, onEnd) => <Bridge data={data} onEnd={onEnd} />}
    </GameShell>
  );
}
