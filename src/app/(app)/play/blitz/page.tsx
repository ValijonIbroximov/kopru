'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import BlitzEngine, { buildBlitzQuestions } from '@/components/games/BlitzEngine';
import { dailyKey, fetchHighScores, type HighScore } from '@/lib/social';
import { useProfile } from '@/components/AppShell';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n';

const HOWTO = [
  { icon: '⚡', title: { uz: '60 soniya — maksimal ball', tr: '60 saniye — maksimum puan' }, text: { uz: 'Savol chiqadi, 4 variantdan to‘g‘risini bosing (yoki 1–4 tugmalari). Har to‘g‘ri javob 10 ball.', tr: 'Soru çıkar, 4 seçenekten doğrusuna basın (ya da 1–4 tuşları). Her doğru cevap 10 puan.' } },
  { icon: '🏃', title: { uz: 'Tezlik ball beradi', tr: 'Hız puan kazandırır' }, text: { uz: '1,5 soniyadan tez javob — +5, 3 soniyadan tez — +2. Xato ball olib qo‘ymaydi, lekin combo yonadi.', tr: '1,5 saniyeden hızlı cevap — +5, 3 saniyeden hızlı — +2. Hata puan götürmez ama kombo sıfırlanır.' } },
  { icon: '🔥', title: { uz: 'Combo va vaqt bonusi', tr: 'Kombo ve süre bonusu' }, text: { uz: '3 ketma-ket to‘g‘ri — har javobga +5. Har 5 ketma-ket — +3 soniya vaqt.', tr: 'Art arda 3 doğru — her cevaba +5. Her 5 art arda — +3 saniye.' } },
  { icon: '📅', title: { uz: 'Kunlik chaqiriq', tr: 'Günlük meydan okuma' }, text: { uz: 'Har kuni hamma uchun BIR XIL savollar — adolatli raqobat. Kunlik reytingda o‘rningizni ko‘ring.', tr: 'Her gün herkes için AYNI sorular — adil rekabet. Günlük sıralamada yerinizi görün.' } },
];

function BlitzInner() {
  const params = useSearchParams();
  const { profile } = useProfile();
  const { l } = useLang();
  const [variant, setVariant] = useState<'free' | 'daily'>(params.get('daily') ? 'daily' : 'free');
  const [dailyTop, setDailyTop] = useState<HighScore[]>([]);
  const dKey = dailyKey();
  const daySeed = useMemo(() => Math.floor(Date.now() / 86400000), []);

  useEffect(() => { fetchHighScores(dKey, 10).then(setDailyTop); }, [dKey]);
  const myDaily = dailyTop.find((h) => h.user_id === profile?.id);

  return (
    <GameShell key={variant} id="blitz" scoreKey={variant === 'daily' ? dKey : 'blitz'} title={variant === 'daily' ? { uz: 'Blitz — kunlik chaqiriq', tr: 'Blitz — günlük meydan okuma' } : 'Blitz'} icon="⚡"
      desc={variant === 'daily' ? { uz: 'Umumiy A1 musobaqasi: hali o‘tilmagan so‘zlar ham bo‘lishi mumkin. Shaxsiy mashq uchun «Erkin» rejimini tanlang. Bugun hamma uchun bir xil 40 savol. Bir kunda bir necha marta urinish mumkin — eng yaxshisi hisoblanadi.', tr: 'Bugün herkes için aynı 40 soru. Günde birkaç deneme yapılabilir — en iyisi sayılır.' } : { uz: '60 soniya, tez javoblar, combo. Rekordingizni yangilang.', tr: '60 saniye, hızlı cevaplar, kombo. Rekorunuzu yenileyin.' }}
      howTo={HOWTO} minWords={variant === 'daily' ? 0 : 8}
      headerExtra={
        <div className="flex w-full flex-wrap items-center gap-2 pt-2">
          <div className="flex gap-1 rounded-full bg-white/[0.05] p-1">
            <button className={cn('rounded-full px-3 py-1 text-xs', variant === 'free' ? 'bg-ember-500 text-white' : 'text-ink-300')} onClick={() => setVariant('free')}>{l({ uz: 'Erkin', tr: 'Serbest' })}</button>
            <button className={cn('rounded-full px-3 py-1 text-xs', variant === 'daily' ? 'bg-gold-400 text-ink-950' : 'text-ink-300')} onClick={() => setVariant('daily')}>📅 {l({ uz: 'Kunlik', tr: 'Günlük' })}</button>
          </div>
          {variant === 'daily' && <span className="chip">{dailyTop.length} {l({ uz: 'kishi o‘ynadi', tr: 'kişi oynadı' })}{myDaily ? ` · ${l({ uz: 'sizniki', tr: 'sizinki' })} ${myDaily.score}` : ''}</span>}
        </div>
      }>
      {(data, onEnd) => {
        const seed = variant === 'daily' ? daySeed : undefined;
        const pool = variant === 'daily' ? data.allWords.filter((w) => w.cefr === 'A1') : data.words;
        const qs = buildBlitzQuestions(pool, 40, seed);
        return <BlitzEngine questions={qs} seconds={60} onEnd={onEnd} mode="blitz" allWords={data.allWords} />;
      }}
    </GameShell>
  );
}

export default function BlitzPage() {
  return <Suspense fallback={null}><BlitzInner /></Suspense>;
}
