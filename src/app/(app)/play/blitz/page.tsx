'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import BlitzEngine, { buildBlitzQuestions } from '@/components/games/BlitzEngine';
import { dailyKey, fetchHighScores, type HighScore } from '@/lib/social';
import { useProfile } from '@/components/AppShell';
import { cn } from '@/lib/utils';

const HOWTO = [
  { icon: '⚡', title: '60 soniya — maksimal ball', text: 'Savol chiqadi, 4 variantdan to‘g‘risini bosing (yoki 1–4 tugmalari). Har to‘g‘ri javob 10 ball.' },
  { icon: '🏃', title: 'Tezlik ball beradi', text: '1,5 soniyadan tez javob — +5 ball, 3 soniyadan tez — +2. Xato ball olib qo‘ymaydi, lekin combo yonadi.' },
  { icon: '🔥', title: 'Combo va vaqt bonusi', text: '3 ketma-ket to‘g‘ri — har javobga +5. Har 5 ketma-ket — +3 soniya vaqt. Rekordingiz jadvalda saqlanadi.' },
  { icon: '📅', title: 'Kunlik chaqiriq', text: 'Har kuni hamma uchun BIR XIL savollar to‘plami — adolatli raqobat. Kunlik reytingda o‘rningizni ko‘ring.' },
];

function BlitzInner() {
  const params = useSearchParams();
  const { profile } = useProfile();
  const [variant, setVariant] = useState<'free' | 'daily'>(params.get('daily') ? 'daily' : 'free');
  const [dailyTop, setDailyTop] = useState<HighScore[]>([]);
  const dKey = dailyKey();
  const daySeed = useMemo(() => Math.floor(Date.now() / 86400000), []);

  useEffect(() => { fetchHighScores(dKey, 10).then(setDailyTop); }, [dKey]);
  const myDaily = dailyTop.find((h) => h.user_id === profile?.id);

  return (
    <GameShell key={variant} id="blitz" scoreKey={variant === 'daily' ? dKey : 'blitz'} title={variant === 'daily' ? 'Blitz — kunlik chaqiriq' : 'Blitz'} icon="⚡"
      desc={variant === 'daily' ? 'Bugun hamma uchun bir xil 40 savol. Bir kunda bir necha marta urinish mumkin — eng yaxshisi hisoblanadi.' : '60 soniya, tez javoblar, combo. Rekordingizni yangilang.'}
      howTo={HOWTO} minWords={12}
      headerExtra={
        <div className="flex w-full flex-wrap items-center gap-2 pt-2">
          <div className="flex gap-1 rounded-full bg-white/[0.05] p-1">
            <button className={cn('rounded-full px-3 py-1 text-xs', variant === 'free' ? 'bg-ember-500 text-white' : 'text-ink-300')} onClick={() => setVariant('free')}>Erkin</button>
            <button className={cn('rounded-full px-3 py-1 text-xs', variant === 'daily' ? 'bg-gold-400 text-ink-950' : 'text-ink-300')} onClick={() => setVariant('daily')}>📅 Kunlik</button>
          </div>
          {variant === 'daily' && <span className="chip">{dailyTop.length} kishi o‘ynadi{myDaily ? ` · sizniki ${myDaily.score}` : ''}</span>}
        </div>
      }>
      {(data, onEnd) => {
        const seed = variant === 'daily' ? daySeed : undefined;
        const pool = variant === 'daily' ? data.allWords.filter((w) => w.cefr === 'A1') : data.words;
        const qs = buildBlitzQuestions(pool.length >= 8 ? pool : data.allWords, 40, seed);
        return <BlitzEngine questions={qs} seconds={60} onEnd={onEnd} mode="blitz" allWords={data.allWords} />;
      }}
    </GameShell>
  );
}

export default function BlitzPage() {
  return <Suspense fallback={null}><BlitzInner /></Suspense>;
}
