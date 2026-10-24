'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, Delete } from 'lucide-react';
import GameShell, { Hud, type GameData, type GameResult } from '@/components/games/GameShell';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { SrsSession } from '@/lib/srs-client';
import type { Word } from '@/lib/types';
import { shuffle, cn } from '@/lib/utils';
import { speak } from '@/lib/speech';

const HOWTO = [
  { icon: '🔡', title: 'Harflar aralash', text: 'O‘zbekcha ma’no (va 🔊 ovoz) beriladi. Pastdagi aralash harflardan turkcha so‘zni to‘g‘ri tartibda tering.' },
  { icon: '👆', title: 'Harfni bosing', text: 'Harf yuqoriga ko‘chadi. Xato bo‘lsa — yuqoridagi harfni bosib qaytaring yoki ⌫ tugmasi.' },
  { icon: '💡', title: 'Ishora', text: 'Ishora keyingi harfni o‘z joyiga qo‘yadi, lekin ball kamayadi. 10 ta so‘z, har biri 10 ball, ishorasiz = +5 bonus.' },
];

interface Tile { id: number; ch: string }

function Anagram({ data, onEnd }: { data: GameData; onEnd: (r: GameResult) => void }) {
  const words = useMemo(() => {
    const ok = (data.words.length >= 10 ? data.words : data.allWords).filter((w) => /^[a-zçğıöşüâîû]{3,10}$/i.test(w.tr));
    return shuffle(ok).slice(0, 10);
  }, [data]);
  const [i, setI] = useState(0);
  const [pool, setPool] = useState<Tile[]>([]);
  const [chosen, setChosen] = useState<Tile[]>([]);
  const [hints, setHints] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [status, setStatus] = useState<'play' | 'ok' | 'bad'>('play');
  const [wrongTries, setWrongTries] = useState(0);
  const srs = useMemo(() => new SrsSession('anagram'), []);
  const started = useRef(Date.now());
  const shownAt = useRef(Date.now());
  const mistakes = useRef<{ tr: string; uz: string }[]>([]);
  const w: Word | undefined = words[i];

  useEffect(() => { srs.load(); }, [srs]);
  useEffect(() => {
    if (!w) return;
    const letters = [...w.tr.toLocaleLowerCase('tr-TR')];
    let tiles = shuffle(letters.map((ch, k) => ({ id: k, ch })));
    if (tiles.map((t) => t.ch).join('') === letters.join('') && letters.length > 2) tiles = [...tiles.slice(1), tiles[0]];
    setPool(tiles); setChosen([]); setHints(0); setStatus('play'); setWrongTries(0); shownAt.current = Date.now();
  }, [i, w]);

  if (!w) return null;
  const cur: Word = w;
  const answer = cur.tr.toLocaleLowerCase('tr-TR');
  const typed = chosen.map((t) => t.ch).join('');

  function check(next: Tile[]) {
    const s = next.map((t) => t.ch).join('');
    if (s.length !== answer.length) return;
    const ok = s === answer;
    if (ok) {
      const pts = Math.max(3, 10 - hints * 2 - wrongTries * 2) + (hints === 0 && wrongTries === 0 ? 5 : 0);
      setScore((x) => x + pts); setCorrect((x) => x + 1); setStatus('ok');
      srs.grade(cur.id, true, Date.now() - shownAt.current, 'typing', hints > 0);
      speak(cur.tr);
      setTimeout(() => advance(), 900);
    } else {
      setStatus('bad'); setWrongTries((x) => x + 1);
      setTimeout(() => { setStatus('play'); setPool((p) => [...p, ...next]); setChosen([]); }, 500);
    }
  }
  function advance() {
    if (i + 1 >= words.length) {
      onEnd({ score, correct, total: words.length, xp: Math.min(40, correct * 3), durationSec: Math.round((Date.now() - started.current) / 1000), perfect: correct === words.length, mistakes: mistakes.current,
        details: [{ label: 'So‘zlar', value: `${correct}/${words.length}` }] });
    } else setI(i + 1);
  }
  function pick(t: Tile) { if (status !== 'play') return; const next = [...chosen, t]; setChosen(next); setPool(pool.filter((x) => x.id !== t.id)); check(next); }
  function unpick(t: Tile) { if (status !== 'play') return; setChosen(chosen.filter((x) => x.id !== t.id)); setPool([...pool, t]); }
  function hint() {
    if (status !== 'play') return;
    const pos = chosen.length;
    // tanlanganlar to'g'ri emas bo'lsa — tozalash
    if (typed !== answer.slice(0, pos)) { setPool([...pool, ...chosen]); setChosen([]); setHints((h) => h + 1); return; }
    const need = answer[pos];
    const t = pool.find((x) => x.ch === need);
    if (!t) return;
    setHints((h) => h + 1);
    const next = [...chosen, t]; setChosen(next); setPool(pool.filter((x) => x.id !== t.id)); check(next);
  }
  function giveUp() {
    mistakes.current.push({ tr: cur.tr, uz: cur.uz });
    srs.grade(cur.id, false, Date.now() - shownAt.current, 'typing');
    setStatus('bad'); setChosen([...cur.tr].map((ch, k) => ({ id: 100 + k, ch }))); setPool([]);
    setTimeout(advance, 1200);
  }

  return (
    <div>
      <Hud score={score} extra={<span className="card-soft px-3 py-1.5 text-xs text-ink-300">{i + 1}/{words.length}</span>} />
      <div className="card-soft p-5 text-center">
        <div className="text-[10px] uppercase tracking-wider text-ink-400">Ma’nosi</div>
        <div className="font-display text-2xl font-bold text-ember-300">{w.uz}</div>
        <div className="mt-2 flex justify-center gap-2"><SpeakButton text={w.tr} size="sm" /><span className="chip">{w.pos}</span>{w.cognate && !w.false_friend && <span className="chip text-teal-300">🌉 {w.cognate}</span>}</div>
      </div>
      {/* javob kataklari */}
      <div className={cn('mt-5 flex min-h-16 flex-wrap justify-center gap-1.5', status === 'bad' && 'animate-shake')}>
        {Array.from({ length: answer.length }).map((_, k) => {
          const t = chosen[k];
          return (
            <button key={k} type="button" onClick={() => t && unpick(t)}
              className={cn('grid h-12 w-10 place-items-center rounded-xl border text-xl font-bold uppercase transition sm:h-14 sm:w-12',
                t ? (status === 'ok' ? 'border-teal-400 bg-teal-500/30 text-white' : status === 'bad' ? 'border-rose-500 bg-rose-500/20 text-white' : 'border-ember-400/60 bg-ember-500/20 text-white') : 'border-dashed border-white/20 bg-white/[0.03]')}>
              {t?.ch ?? ''}
            </button>
          );
        })}
      </div>
      {/* harflar */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {pool.map((t) => <button key={t.id} type="button" onClick={() => pick(t)} className="grid h-14 w-12 place-items-center rounded-2xl border border-white/15 bg-ink-800 text-2xl font-bold uppercase text-white shadow-card transition hover:border-white/40 active:scale-95">{t.ch}</button>)}
      </div>
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn-secondary" onClick={() => { const last = chosen[chosen.length - 1]; if (last) unpick(last); }} disabled={!chosen.length || status !== 'play'}><Delete size={16} /> O‘chirish</button>
        <button className="btn-secondary" onClick={hint} disabled={status !== 'play'}><Lightbulb size={16} /> Ishora (−2)</button>
        <button className="btn-ghost text-xs" onClick={giveUp} disabled={status !== 'play'}>Bilmadim</button>
      </div>
      {status === 'ok' && <div className="mt-3 text-center text-sm text-teal-300">✓ {w.tr}{w.example_tr ? ` — ${w.example_tr}` : ''}</div>}
    </div>
  );
}

export default function AnagramPage() {
  return (
    <GameShell id="anagram" title="Harf terish" icon="🔡" desc="Imlo refleksi: aralash harflardan turkcha so‘zni tering. ç ğ ı ö ş ü harflari bilan do‘stlashing." howTo={HOWTO} minWords={10}>
      {(data, onEnd) => <Anagram data={data} onEnd={onEnd} />}
    </GameShell>
  );
}
