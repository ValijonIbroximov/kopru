'use client';
import { useEffect, useState } from 'react';
import { useProfile } from '@/components/AppShell';
import { fetchLeaderboard, isLocal } from '@/lib/data';
import { PageHeader, Skeleton, Empty } from '@/components/ui';
import { leagueIcon, leagueLabel, cn } from '@/lib/utils';

export default function LeaderboardPage() {
  const { profile } = useProfile();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchLeaderboard>> | null>(null);
  const [tab, setTab] = useState<'league' | 'all'>('league');
  useEffect(() => { fetchLeaderboard(100).then(setRows); }, []);

  if (isLocal()) return <Empty icon="🏆" title="Liderlar jadvali Supabase talab qiladi" body="Demo rejimda boshqa foydalanuvchilar yo‘q." />;
  if (!rows || !profile) return <div className="space-y-2"><Skeleton className="h-10 w-1/2" />{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>;

  const list = tab === 'league' ? rows.filter((r) => r.league === profile.league) : rows;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Liderlar jadvali" sub="Haftalik XP. Dushanba kuni: top 20% yuqori ligaga, pastki 15% quyi ligaga." />
      <div className="mb-3 flex gap-2">
        <button onClick={() => setTab('league')} className={cn('chip py-1.5 text-sm', tab === 'league' && 'border-ember-400 bg-ember-500/20 text-white')}>{leagueIcon(profile.league)} {leagueLabel(profile.league)} ligasi</button>
        <button onClick={() => setTab('all')} className={cn('chip py-1.5 text-sm', tab === 'all' && 'border-ember-400 bg-ember-500/20 text-white')}>🌍 Hammasi</button>
      </div>
      <div className="card divide-y divide-white/[0.06]">
        {list.map((r, i) => {
          const me = r.id === profile.id;
          const zone = tab === 'league' ? (i < Math.max(1, Math.ceil(list.length * 0.2)) ? 'up' : list.length >= 5 && i >= list.length - Math.ceil(list.length * 0.15) ? 'down' : '') : '';
          return (
            <div key={r.id} className={cn('flex items-center gap-3 p-3', me && 'bg-ember-500/10')}>
              <div className={cn('w-8 text-center font-display text-lg font-bold', i === 0 ? 'text-gold-400' : i === 1 ? 'text-ink-200' : i === 2 ? 'text-ember-300' : 'text-ink-400')}>{i + 1}</div>
              <div className="text-2xl">{r.avatar}</div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{r.display_name ?? r.username}{me && ' (siz)'}</div><div className="text-xs text-ink-400">Lvl {r.level} · 🔥{r.streak} · {leagueIcon(r.league)}</div></div>
              <div className="text-right"><div className="font-display text-lg font-bold text-ember-400">{r.weekly_xp}</div><div className="text-[10px] text-ink-400">{zone === 'up' ? '▲ ko‘tariladi' : zone === 'down' ? '▼ tushadi' : 'XP'}</div></div>
            </div>
          );
        })}
        {list.length === 0 && <div className="p-6 text-center text-sm text-ink-400">Hali hech kim yo‘q — birinchi bo‘ling!</div>}
      </div>
    </div>
  );
}
