'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameShell, { Hud, type GameData, type GameResult } from '@/components/games/GameShell';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { SrsSession } from '@/lib/srs-client';
import type { Word } from '@/lib/types';
import { shuffle, cn } from '@/lib/utils';
import { speak, ttsAvailable } from '@/lib/speech';
import { useLang } from '@/lib/i18n';

const HOWTO = [
  { icon: '🎱', title: { uz: '4×4 karta', tr: '4×4 kart' }, text: { uz: 'Kartada 16 ta turkcha so‘z. Yuqorida navbat bilan chaqiruv: o‘zbekcha ma’no yoki faqat 🔊 ovoz.', tr: 'Kartta 16 Türkçe kelime. Üstte sırayla çağrı: Özbekçe anlam ya da sadece 🔊 ses.' } },
  { icon: '⏱️', title: { uz: 'Vaqt chizig‘i', tr: 'Süre çizgisi' }, text: { uz: 'Har chaqiruvga ~6 soniya. Mos so‘zni bosing. To‘g‘ri = +10, xato = −5.', tr: 'Her çağrıya ~6 saniye. Uygun kelimeye basın. Doğru = +10, hata = −5.' } },
  { icon: '🏁', title: { uz: 'BINGO!', tr: 'BINGO!' }, text: { uz: 'Qator, ustun yoki diagonal = BINGO (+25). 2 ta BINGO yoki chaqiruvlar tugashi bilan o‘yin yakunlanadi.', tr: 'Satır, sütun ya da köşegen = BINGO (+25). 2 BINGO ya da çağrılar bitince oyun biter.' } },
];

const LINES = [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],[0,5,10,15],[3,6,9,12]];

function Bingo({ data, onEnd }: { data: GameData; onEnd: (r: GameResult) => void }) {
  const grid = useMemo<Word[]>(() => shuffle(data.words.length >= 16 ? data.words : data.allWords).slice(0, 16), [data]);
  const order = useMemo(() => shuffle(grid.map((_, i) => i)), [grid]);
  const [callIdx, setCallIdx] = useState(0);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [bingos, setBingos] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(100);
  const [audioOnly, setAudioOnly] = useState(false);
  const [flashLine, setFlashLine] = useState<number[] | null>(null);
  const started = useRef(Date.now());
  const callStart = useRef(Date.now());
  const st = useRef({ correct: 0, wrong: 0, score: 0, ended: false, mistakes: [] as { tr: string; uz: string }[] });
  const srs = useMemo(() => new SrsSession('bingo'), []);
  const CALL_MS = 6500;
  const tts = ttsAvailable();
  const { l } = useLang();

  useEffect(() => { srs.load(); }, [srs]);

  const target = order[callIdx] !== undefined ? grid[order[callIdx]] : null;

  const finish = useCallback((extraScore = 0) => {
    if (st.current.ended) return;
    st.current.ended = true;
    const s = st.current;
    onEnd({ score: s.score + extraScore, correct: s.correct, total: s.correct + s.wrong, xp: Math.min(45, s.correct * 2 + bingos.length * 5), durationSec: Math.round((Date.now() - started.current) / 1000), perfect: s.wrong === 0 && s.correct >= 12,
      details: [{ label: 'BINGO', value: bingos.length }, { label: { uz: 'To‘g‘ri', tr: 'Doğru' }, value: s.correct }, { label: { uz: 'Xato', tr: 'Hata' }, value: s.wrong }], mistakes: s.mistakes });
  }, [onEnd, bingos.length]);

  const nextCall = useCallback(() => {
    setCallIdx((i) => {
      if (i + 1 >= order.length) { setTimeout(() => finish(), 300); return i; }
      return i + 1;
    });
    callStart.current = Date.now(); setTimeLeft(100);
  }, [order.length, finish]);

  // chaqiruv: ovoz + taymer
  useEffect(() => {
    if (!target || st.current.ended) return;
    const useAudio = tts && callIdx > 0 && callIdx % 3 === 2;
    setAudioOnly(useAudio);
    if (tts) speak(target.tr);
    callStart.current = Date.now();
    const iv = setInterval(() => {
      const left = 100 - ((Date.now() - callStart.current) / CALL_MS) * 100;
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(iv);
        st.current.wrong += 1; st.current.mistakes.push({ tr: target.tr, uz: target.uz });
        srs.grade(target.id, false, CALL_MS, 'choice');
        nextCall();
      }
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callIdx, target]);

  function tap(i: number) {
    if (!target || marked.has(i) || st.current.ended) return;
    const ms = Date.now() - callStart.current;
    if (grid[i].id === target.id) {
      const nm = new Set(marked); nm.add(i); setMarked(nm);
      st.current.correct += 1; st.current.score += 10 + (ms < 2000 ? 3 : 0); setScore(st.current.score);
      srs.grade(target.id, true, ms, 'choice');
      const newLines = LINES.map((l, k) => ({ l, k })).filter(({ l, k }) => !bingos.includes(k) && l.every((c) => nm.has(c)));
      if (newLines.length) {
        const nb = [...bingos, ...newLines.map((x) => x.k)]; setBingos(nb);
        st.current.score += 25 * newLines.length; setScore(st.current.score);
        setFlashLine(newLines[0].l); setTimeout(() => setFlashLine(null), 1200);
        if (nb.length >= 2) { setTimeout(() => finish(), 1300); return; }
      }
      nextCall();
    } else {
      st.current.wrong += 1; st.current.score = Math.max(0, st.current.score - 5); setScore(st.current.score);
      st.current.mistakes.push({ tr: target.tr, uz: target.uz });
      srs.grade(target.id, false, ms, 'choice');
      setWrong(i); setTimeout(() => setWrong(null), 400);
    }
  }

  if (!target) return null;
  return (
    <div>
      <Hud score={score} extra={<><span className="card-soft px-3 py-1.5 text-xs text-ink-300">{l({ uz: 'Chaqiruv', tr: 'Çağrı' })} {Math.min(callIdx + 1, order.length)}/{order.length}</span><span className="card-soft px-3 py-1.5 text-xs text-gold-300">BINGO {bingos.length}/2</span></>} />
      <div className="card-soft p-4 text-center">
        <div className="text-[10px] uppercase tracking-wider text-ink-400">{audioOnly ? l({ uz: 'Faqat eshiting 🎧', tr: 'Sadece dinleyin 🎧' }) : l({ uz: 'Qidiring', tr: 'Bulun' })}</div>
        <div className="mt-1 flex items-center justify-center gap-3">
          {!audioOnly && <div className="font-display text-2xl font-bold text-ember-300">{target.uz}</div>}
          <SpeakButton text={target.tr} size={audioOnly ? 'lg' : 'sm'} />
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className={cn('h-full rounded-full transition-[width] duration-100', timeLeft < 30 ? 'bg-rose-500' : 'bg-teal-400')} style={{ width: `${timeLeft}%` }} /></div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {grid.map((w, i) => (
          <button key={w.id} type="button" onClick={() => tap(i)} disabled={marked.has(i)}
            className={cn('aspect-square rounded-2xl border p-1 text-center text-sm font-semibold leading-tight transition active:scale-95',
              marked.has(i) ? 'border-teal-400 bg-teal-500/30 text-white' : 'border-white/10 bg-ink-800 text-white hover:border-ember-400/50',
              wrong === i && 'option-wrong', flashLine?.includes(i) && 'ring-2 ring-gold-400 bg-gold-400/30')}>
            <span className="break-words">{marked.has(i) ? '✓' : w.tr}</span>
          </button>
        ))}
      </div>
      {flashLine && <div className="mt-3 animate-pop text-center font-display text-3xl font-extrabold text-gold-400">BINGO! +25</div>}
    </div>
  );
}

export default function BingoPage() {
  return (
    <GameShell id="bingo" title={{ uz: 'Bingo', tr: 'Bingo' }} icon="🎱" desc={{ uz: 'Tinglash + tez qidirish: chaqiruvga mos so‘zni 4×4 kartadan toping, qatorlarni yoping — BINGO!', tr: 'Dinleme + hızlı arama: çağrıya uygun kelimeyi 4×4 kartta bulun, satırları kapatın — BINGO!' }} howTo={HOWTO} minWords={16}>
      {(data, onEnd) => <Bingo data={data} onEnd={onEnd} />}
    </GameShell>
  );
}
