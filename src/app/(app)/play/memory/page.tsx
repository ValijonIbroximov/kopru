'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import GameShell, { Hud, type GameData, type GameResult } from '@/components/games/GameShell';
import { SrsSession } from '@/lib/srs-client';
import { shuffle, cn } from '@/lib/utils';
import { speak } from '@/lib/speech';
import { useLang } from '@/lib/i18n';

const HOWTO = [
  { icon: '🃏', title: { uz: '16 ta yopiq karta', tr: '16 kapalı kart' }, text: { uz: '8 ta turkcha va 8 ta o‘zbekcha so‘z yopiq. Ikkitasini ochib, tarjima juftini toping.', tr: '8 Türkçe ve 8 Özbekçe kelime kapalı. İkisini açıp çeviri eşini bulun.' } },
  { icon: '🧠', title: { uz: 'Eslab qoling', tr: 'Hatırlayın' }, text: { uz: 'Juft bo‘lmasa kartalar yopiladi — qayerda nima turganini eslang.', tr: 'Eş değilse kartlar kapanır — neyin nerede olduğunu hatırlayın.' } },
  { icon: '⭐', title: { uz: 'Kam yurish — ko‘p ball', tr: 'Az hamle — çok puan' }, text: { uz: 'Har juft +10. 20 yurishdan kam bo‘lsa bonus. 3 raund.', tr: 'Her eş +10. 20 hamleden azsa bonus. 3 tur.' } },
];

interface Card { id: number; pairId: number; text: string; side: 'tr' | 'uz'; wordId: number }

function Memory({ data, onEnd }: { data: GameData; onEnd: (r: GameResult) => void }) {
  const pairs = 8;
  // raundlar soni o'rganilgan so'zlar soniga qarab: 8 → 1, 16 → 2, 24+ → 3 (yangi so'zlar aralashmaydi)
  const rounds = Math.max(1, Math.min(3, Math.floor(data.words.length / pairs)));
  const deck = useMemo(() => shuffle(data.words.length >= pairs ? data.words : data.allWords).slice(0, pairs * rounds), [data, rounds]);
  const [round, setRound] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [lock, setLock] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const started = useRef(Date.now());
  const roundStart = useRef(Date.now());
  const totalMoves = useRef(0);
  const totalPairs = useRef(0);
  const srs = useMemo(() => new SrsSession('memory'), []);
  const seenPair = useRef<Map<number, number>>(new Map());
  const { l } = useLang();

  useEffect(() => { srs.load(); }, [srs]);
  useEffect(() => {
    const ws = deck.slice(round * pairs, round * pairs + pairs);
    const cs: Card[] = [];
    ws.forEach((w, k) => { cs.push({ id: k * 2, pairId: k, text: w.tr, side: 'tr', wordId: w.id }); cs.push({ id: k * 2 + 1, pairId: k, text: w.uz, side: 'uz', wordId: w.id }); });
    setCards(shuffle(cs)); setOpen([]); setMatched(new Set()); setMoves(0); roundStart.current = Date.now(); seenPair.current = new Map();
  }, [round, deck]);

  function flip(c: Card) {
    if (lock || open.includes(c.id) || matched.has(c.pairId)) return;
    const next = [...open, c.id];
    setOpen(next);
    if (c.side === 'tr') speak(c.text);
    if (next.length === 2) {
      setLock(true); setMoves((m) => m + 1); totalMoves.current += 1;
      const [a, b] = next.map((id) => cards.find((x) => x.id === id)!);
      const ok = a.pairId === b.pairId;
      setTimeout(() => {
        if (ok) {
          const nm = new Set(matched); nm.add(a.pairId); setMatched(nm);
          const tries = (seenPair.current.get(a.pairId) ?? 0);
          setScore((s) => s + 10 + (tries === 0 ? 5 : 0));
          totalPairs.current += 1;
          srs.grade(a.wordId, tries <= 1, 3000, 'choice');
          if (nm.size === pairs) {
            const secs = (Date.now() - roundStart.current) / 1000;
            const bonus = Math.max(0, 20 - moves - 1) * 2 + (secs < 60 ? 10 : 0);
            setScore((s) => s + bonus);
            setTimeout(() => {
              if (round + 1 >= rounds) {
                onEnd({ score: score + 10 + (tries === 0 ? 5 : 0) + bonus, correct: totalPairs.current, total: totalPairs.current + Math.max(0, totalMoves.current - totalPairs.current), xp: Math.min(45, 15 + totalPairs.current), durationSec: Math.round((Date.now() - started.current) / 1000),
                  details: [{ label: { uz: 'Juftlar', tr: 'Eşler' }, value: totalPairs.current }, { label: { uz: 'Yurishlar', tr: 'Hamleler' }, value: totalMoves.current }, { label: { uz: 'Samaradorlik', tr: 'Verimlilik' }, value: Math.round((totalPairs.current / Math.max(1, totalMoves.current)) * 100) + '%' }] });
              } else setRound(round + 1);
            }, 700);
          }
        } else {
          seenPair.current.set(a.pairId, (seenPair.current.get(a.pairId) ?? 0) + 1);
          seenPair.current.set(b.pairId, (seenPair.current.get(b.pairId) ?? 0) + 1);
          setWrongFlash(true); setTimeout(() => setWrongFlash(false), 300);
        }
        setOpen([]); setLock(false);
      }, ok ? 450 : 900);
    }
  }

  return (
    <div>
      <Hud score={score} extra={<><span className="card-soft px-3 py-1.5 text-xs text-ink-300">{l({ uz: 'Raund', tr: 'Tur' })} {round + 1}/{rounds}</span><span className="card-soft px-3 py-1.5 text-xs text-ink-300">{l({ uz: 'Yurish', tr: 'Hamle' })} {moves}</span><span className="card-soft px-3 py-1.5 text-xs text-ink-300">{l({ uz: 'Juft', tr: 'Eş' })} {matched.size}/{pairs}</span></>} />
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c) => {
          const isOpen = open.includes(c.id) || matched.has(c.pairId);
          return (
            <button key={c.id} type="button" onClick={() => flip(c)} className="aspect-[3/4] [perspective:800px]" disabled={matched.has(c.pairId)}>
              <div className={cn('relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]', isOpen && '[transform:rotateY(180deg)]')}>
                <div className="absolute inset-0 grid place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-ink-700 to-ink-800 text-2xl [backface-visibility:hidden]">🌉</div>
                <div className={cn('absolute inset-0 grid place-items-center rounded-2xl border p-1 text-center text-sm font-semibold leading-tight [backface-visibility:hidden] [transform:rotateY(180deg)]',
                  matched.has(c.pairId) ? 'border-teal-400 bg-teal-500/25 text-white' : wrongFlash && open.includes(c.id) ? 'border-rose-500 bg-rose-500/20 text-white' : c.side === 'tr' ? 'border-ember-400/50 bg-ember-500/15 text-white' : 'border-sky-400/50 bg-sky-500/15 text-white')}>
                  <span className="break-words">{c.text}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-center text-xs text-ink-500">{l({ uz: '🟠 turkcha · 🔵 o‘zbekcha · birinchi urinishda topilgan juft +5', tr: '🟠 Türkçe · 🔵 Özbekçe · ilk denemede bulunan eş +5' })}</div>
    </div>
  );
}

export default function MemoryPage() {
  return (
    <GameShell id="memory" title={{ uz: 'Xotira kartalari', tr: 'Hafıza kartları' }} icon="🃏" desc={{ uz: 'Klassik xotira o‘yini — turkcha va o‘zbekcha so‘z juftlarini yopiq kartalar orasidan toping. 3 raund, 24 so‘z.', tr: 'Klasik hafıza oyunu — Türkçe ve Özbekçe kelime eşlerini kapalı kartlar arasından bulun. 3 tur, 24 kelime.' }} howTo={HOWTO} minWords={8}>
      {(data, onEnd) => <Memory data={data} onEnd={onEnd} />}
    </GameShell>
  );
}
