'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameShell, { Hud, type GameData, type GameResult } from '@/components/games/GameShell';
import { SrsSession } from '@/lib/srs-client';
import type { Word } from '@/lib/types';
import { shuffle, cn } from '@/lib/utils';
import { speak } from '@/lib/speech';
import { useLang } from '@/lib/i18n';

const HOWTO = [
  { icon: '🌧️', title: { uz: 'So‘zlar yog‘yapti', tr: 'Kelimeler yağıyor' }, text: { uz: 'Tepada o‘zbekcha so‘z. Yuqoridan turkcha so‘zlar tushadi — TO‘G‘RI tarjimani bosing.', tr: 'Üstte Özbekçe kelime. Yukarıdan Türkçe kelimeler düşer — DOĞRU çeviriye basın.' } },
  { icon: '❤️', title: { uz: '3 jon', tr: '3 can' }, text: { uz: 'Noto‘g‘ri so‘zni bossangiz yoki to‘g‘ri so‘z pastga tushib ketsa — 1 jon ketadi.', tr: 'Yanlış kelimeye basarsanız ya da doğru kelime aşağı düşerse — 1 can gider.' } },
  { icon: '🚀', title: { uz: 'Tezlashadi', tr: 'Hızlanır' }, text: { uz: 'Har 5 to‘g‘ridan keyin yomg‘ir tezlashadi. 25 so‘z — g‘alaba! Yuqorida ushlasangiz ko‘proq ball.', tr: 'Her 5 doğrudan sonra yağmur hızlanır. 25 kelime — zafer! Yukarıda yakalarsanız daha çok puan.' } },
];

interface Drop { id: number; word: Word; x: number; y: number; speed: number; correct: boolean; dying?: 'ok' | 'bad' }

function Rain({ data, onEnd }: { data: GameData; onEnd: (r: GameResult) => void }) {
  const pool = useMemo(() => shuffle(data.words.length >= 8 ? data.words : data.allWords), [data]);
  const [target, setTarget] = useState<Word>(pool[0]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [caught, setCaught] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shake, setShake] = useState(false);
  const st = useRef({ score: 0, lives: 3, caught: 0, combo: 0, level: 1, nextId: 1, lastSpawn: 0, started: Date.now(), target: pool[0], ended: false, mistakes: [] as { tr: string; uz: string }[], wrongTaps: 0 });
  const dropsRef = useRef<Drop[]>([]);
  const srs = useMemo(() => new SrsSession('rain'), []);
  const targetShown = useRef(Date.now());
  const { l } = useLang();

  useEffect(() => { srs.load(); }, [srs]);

  const pickTarget = useCallback((exclude?: number) => {
    const cands = pool.filter((w) => w.id !== exclude);
    const t = cands[Math.floor(Math.random() * cands.length)];
    st.current.target = t; setTarget(t); targetShown.current = Date.now();
  }, [pool]);

  const finish = useCallback(() => {
    if (st.current.ended) return;
    st.current.ended = true;
    const s = st.current;
    onEnd({ score: s.score, correct: s.caught, total: s.caught + s.wrongTaps + (3 - s.lives), xp: Math.min(50, s.caught * 2), durationSec: Math.round((Date.now() - s.started) / 1000), perfect: s.caught >= 25 && s.lives === 3,
      details: [{ label: { uz: 'Ushlangan', tr: 'Yakalanan' }, value: s.caught }, { label: { uz: 'Daraja', tr: 'Seviye' }, value: s.level }, { label: { uz: 'Jon', tr: 'Can' }, value: s.lives }], mistakes: s.mistakes });
  }, [onEnd]);

  // o'yin sikli
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last) / 1000; last = now;
      const s = st.current;
      if (s.ended) return;
      const spawnEvery = Math.max(0.55, 1.5 - (s.level - 1) * 0.12);
      if (now - s.lastSpawn > spawnEvery * 1000 && dropsRef.current.filter((d) => !d.dying).length < 5) {
        s.lastSpawn = now;
        const hasCorrect = dropsRef.current.some((d) => d.correct && !d.dying);
        const makeCorrect = !hasCorrect && Math.random() < 0.55;
        const word = makeCorrect ? s.target : pool.filter((w) => w.id !== s.target.id)[Math.floor(Math.random() * (pool.length - 1))];
        const lanes = [6, 24, 42, 60, 78];
        const used = new Set(dropsRef.current.filter((d) => d.y < 25).map((d) => Math.round(d.x)));
        const free = lanes.filter((l) => !used.has(l));
        const x = (free.length ? free : lanes)[Math.floor(Math.random() * (free.length ? free.length : lanes.length))];
        dropsRef.current = [...dropsRef.current, { id: s.nextId++, word, x, y: -8, speed: (9 + (s.level - 1) * 1.6) * (0.9 + Math.random() * 0.25), correct: word.id === s.target.id }];
      }
      let lifeLost = false;
      dropsRef.current = dropsRef.current.map((d) => (d.dying ? d : { ...d, y: d.y + d.speed * dt })).filter((d) => {
        if (d.dying) return true;
        if (d.y > 100) { if (d.correct) { lifeLost = true; s.mistakes.push({ tr: d.word.tr, uz: d.word.uz }); srs.grade(d.word.id, false, 6000, 'choice'); } return false; }
        return true;
      });
      if (lifeLost) {
        s.lives -= 1; s.combo = 0; setLives(s.lives); setCombo(0); setShake(true); setTimeout(() => setShake(false), 350);
        if (s.lives <= 0) { setDrops(dropsRef.current); finish(); return; }
        pickTarget(s.target.id);
      }
      setDrops(dropsRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pool, pickTarget, finish, srs]);

  function tap(d: Drop) {
    const s = st.current;
    if (s.ended || d.dying) return;
    const ms = Date.now() - targetShown.current;
    if (d.correct) {
      const heightBonus = Math.max(0, Math.round((100 - d.y) / 20)); // yuqorida ushlasa ko'proq
      s.combo += 1; s.caught += 1; s.score += 10 + heightBonus + (s.combo >= 3 ? 5 : 0);
      if (s.caught % 5 === 0) s.level += 1;
      srs.grade(d.word.id, true, ms, 'choice');
      speak(d.word.tr);
      dropsRef.current = dropsRef.current.map((x) => (x.id === d.id ? { ...x, dying: 'ok' } : { ...x, correct: false }));
      setTimeout(() => { dropsRef.current = dropsRef.current.filter((x) => x.id !== d.id); }, 300);
      setScore(s.score); setCaught(s.caught); setCombo(s.combo);
      if (s.caught >= 25) { setDrops(dropsRef.current); setTimeout(finish, 350); return; }
      pickTarget(d.word.id);
    } else {
      s.lives -= 1; s.combo = 0; s.wrongTaps += 1; s.mistakes.push({ tr: s.target.tr, uz: s.target.uz });
      srs.grade(s.target.id, false, ms, 'choice');
      dropsRef.current = dropsRef.current.map((x) => (x.id === d.id ? { ...x, dying: 'bad' } : x));
      setTimeout(() => { dropsRef.current = dropsRef.current.filter((x) => x.id !== d.id); }, 350);
      setLives(s.lives); setCombo(0); setShake(true); setTimeout(() => setShake(false), 350);
      if (s.lives <= 0) { setDrops(dropsRef.current); setTimeout(finish, 350); }
    }
  }

  return (
    <div>
      <Hud score={score} lives={lives} combo={combo} extra={<span className="card-soft px-3 py-1.5 text-xs text-ink-300">🎯 {caught}/25 · L{st.current.level}</span>} />
      <div className={cn('card-soft mb-2 p-3 text-center', shake && 'animate-shake border-rose-500/50')}>
        <div className="text-[10px] uppercase tracking-wider text-ink-400">{l({ uz: 'Toping (turkchasi)', tr: 'Bulun (Türkçesi)' })}</div>
        <div className="font-display text-2xl font-bold text-ember-300">{target.uz}</div>
      </div>
      <div className="relative h-[58vh] min-h-[380px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-sky-950/60 via-ink-900 to-ink-950">
        {/* yomg'ir chiziqlari */}
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(100deg, transparent 0 18px, rgba(255,255,255,0.08) 18px 19px)', animation: 'rainShift 0.9s linear infinite' }} />
        {drops.map((d) => (
          <button key={d.id} type="button" onPointerDown={() => tap(d)}
            className={cn('absolute -translate-x-1/2 select-none rounded-2xl border px-3 py-2 text-base font-semibold shadow-card transition-transform active:scale-95',
              d.dying === 'ok' ? 'scale-125 border-teal-400 bg-teal-500/40 text-white' : d.dying === 'bad' ? 'border-rose-500 bg-rose-500/40 text-white animate-shake' : 'border-white/15 bg-ink-800/90 text-white hover:border-ember-400/60')}
            style={{ left: `${d.x + 8}%`, top: `${d.y}%`, transition: d.dying ? 'transform .25s, background .2s' : 'none' }}>
            {d.word.tr}
          </button>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-rose-900/50 to-transparent" />
        <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-rose-300/70">{l({ uz: '— pastga tushsa jon ketadi —', tr: '— aşağı düşerse can gider —' })}</div>
      </div>
    </div>
  );
}

export default function RainPage() {
  return (
    <GameShell id="rain" title={{ uz: 'So‘z yomg‘iri', tr: 'Kelime yağmuru' }} icon="🌧️" desc={{ uz: 'Reaksiya o‘yini: tushayotgan turkcha so‘zlardan ko‘rsatilgan o‘zbekcha so‘zning tarjimasini ushlang. 3 jon, 25 so‘z.', tr: 'Refleks oyunu: düşen Türkçe kelimelerden gösterilen Özbekçe kelimenin çevirisini yakalayın. 3 can, 25 kelime.' }} howTo={HOWTO} minWords={8}>
      {(data, onEnd) => <Rain data={data} onEnd={onEnd} />}
    </GameShell>
  );
}
