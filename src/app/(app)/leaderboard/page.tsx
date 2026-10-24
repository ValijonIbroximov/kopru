'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProfile } from '@/components/AppShell';
import { fetchLeaderboard, isLocal } from '@/lib/data';
import { fetchFriends, fetchClubsLeaderboard, fetchHighScores, dailyKey, GAME_LABELS, type Friend, type ClubRow, type HighScore } from '@/lib/social';
import { PageHeader, Skeleton, Empty } from '@/components/ui';
import Tip from '@/components/Tip';
import { leagueIcon, leagueLabel, cn } from '@/lib/utils';

type Tab = 'league' | 'all' | 'friends' | 'clubs' | 'games' | 'daily';

function LeaderboardInner() {
  const params = useSearchParams();
  const { profile } = useProfile();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchLeaderboard>> | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [scores, setScores] = useState<HighScore[]>([]);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'league');
  const [game, setGame] = useState(params.get('game') || 'blitz');

  useEffect(() => { Promise.all([fetchLeaderboard(100), fetchFriends(), fetchClubsLeaderboard()]).then(([r, f, c]) => { setRows(r); setFriends(f); setClubs(c); }); }, []);
  useEffect(() => { if (tab === 'games') fetchHighScores(game, 50).then(setScores); if (tab === 'daily') fetchHighScores(dailyKey(), 50).then(setScores); }, [tab, game]);

  if (isLocal()) return <Empty icon="🏆" title="Liderlar jadvali Supabase talab qiladi" body="Demo rejimda boshqa foydalanuvchilar yo‘q." />;
  if (!rows || !profile) return <div className="space-y-2"><Skeleton className="h-10 w-1/2" />{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'league', label: `${leagueIcon(profile.league)} Liga` }, { id: 'friends', label: '🤝 Do‘stlar' }, { id: 'daily', label: '📅 Kunlik' }, { id: 'games', label: '🎮 Rekordlar' }, { id: 'clubs', label: '🏛️ Klublar' }, { id: 'all', label: '🌍 Hammasi' },
  ];

  const renderUsers = (list: { id: string; username: string; display_name: string | null; avatar: string; level: number; league?: string; weekly_xp: number; streak: number }[], zoneTab = false) => (
    <div className="card divide-y divide-white/[0.06]">
      {list.map((r, i) => {
        const me = r.id === profile.id;
        const zone = zoneTab ? (i < Math.max(1, Math.ceil(list.length * 0.2)) ? 'up' : list.length >= 5 && i >= list.length - Math.ceil(list.length * 0.15) ? 'down' : '') : '';
        return (
          <div key={r.id} className={cn('flex items-center gap-3 p-3', me && 'bg-ember-500/10')}>
            <div className={cn('w-8 text-center font-display text-lg font-bold', i === 0 ? 'text-gold-400' : i === 1 ? 'text-ink-200' : i === 2 ? 'text-ember-300' : 'text-ink-400')}>{i + 1}</div>
            <div className="text-2xl">{r.avatar}</div>
            <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{r.display_name ?? r.username}{me && ' (siz)'}</div><div className="text-xs text-ink-400">Lvl {r.level} · 🔥{r.streak}{r.league ? ` · ${leagueIcon(r.league)}` : ''}</div></div>
            <div className="text-right"><div className="font-display text-lg font-bold text-ember-400">{r.weekly_xp}</div><div className="text-[10px] text-ink-400">{zone === 'up' ? '▲ ko‘tariladi' : zone === 'down' ? '▼ tushadi' : 'XP/hafta'}</div></div>
          </div>
        );
      })}
      {list.length === 0 && <div className="p-6 text-center text-sm text-ink-400">Hali hech kim yo‘q</div>}
    </div>
  );

  const renderScores = (list: HighScore[], unit: string) => (
    <div className="card divide-y divide-white/[0.06]">
      {list.map((h, i) => (
        <div key={h.user_id} className={cn('flex items-center gap-3 p-3', h.user_id === profile.id && 'bg-ember-500/10')}>
          <div className={cn('w-8 text-center font-display text-lg font-bold', i === 0 ? 'text-gold-400' : i === 1 ? 'text-ink-200' : i === 2 ? 'text-ember-300' : 'text-ink-400')}>{i + 1}</div>
          <div className="text-2xl">{h.profile?.avatar}</div>
          <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{h.profile?.display_name ?? h.profile?.username}{h.user_id === profile.id && ' (siz)'}</div><div className="text-xs text-ink-400">Lvl {h.profile?.level} · {h.plays} marta o‘ynagan</div></div>
          <div className="text-right"><div className="font-display text-lg font-bold text-gold-300">{h.score}</div><div className="text-[10px] text-ink-400">{unit}</div></div>
        </div>
      ))}
      {list.length === 0 && <div className="p-6 text-center text-sm text-ink-400">Hali rekord yo‘q — birinchi bo‘ling!</div>}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Reyting" sub="Haftalik XP, do‘stlar, kunlik chaqiriq, o‘yin rekordlari va klublar." />
      <Tip id="leaderboard-intro" text="Liga: dushanba kuni top 20% yuqori ligaga ko‘tariladi, pastki 15% tushadi. «Kunlik» — bugungi Blitz chaqirig‘i: hamma uchun bir xil savollar." />
      <div className="mb-3 flex gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-sm', tab === t.id ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white')}>{t.label}</button>)}
      </div>
      {tab === 'league' && <><div className="mb-2 text-xs text-ink-400">{leagueLabel(profile.league)} ligasi · {rows.filter((r) => r.league === profile.league).length} kishi</div>{renderUsers(rows.filter((r) => r.league === profile.league), true)}</>}
      {tab === 'all' && renderUsers(rows)}
      {tab === 'friends' && (friends.length ? renderUsers([...friends, { ...profile, league: profile.league }].sort((a, b) => b.weekly_xp - a.weekly_xp)) : <Empty icon="🤝" title="Do‘stlar yo‘q" body="Do‘st qo‘shsangiz — shu yerda kim oldinda ekanini ko‘rasiz." action={<Link href="/friends?tab=search" className="btn-primary">Do‘st qidirish</Link>} />)}
      {tab === 'daily' && <><div className="mb-2 flex items-center justify-between text-xs text-ink-400"><span>Bugungi Blitz chaqirig‘i — hamma uchun bir xil savollar</span><Link href="/play/blitz?daily=1" className="btn-primary px-3 py-1.5 text-xs">⚡ O‘ynash</Link></div>{renderScores(scores, 'ball')}</>}
      {tab === 'games' && (
        <>
          <div className="mb-3 flex gap-1.5 overflow-x-auto scrollbar-none">{Object.entries(GAME_LABELS).map(([k, g]) => <button key={k} onClick={() => setGame(k)} className={cn('chip shrink-0 py-1.5', game === k && 'border-gold-400 bg-gold-400/20 text-white')}>{g.icon} {g.title}</button>)}</div>
          {renderScores(scores, GAME_LABELS[game]?.unit ?? 'ball')}
          <Link href={`/play/${game}`} className="btn-secondary mt-3 w-full">{GAME_LABELS[game]?.icon} {GAME_LABELS[game]?.title} o‘ynash</Link>
        </>
      )}
      {tab === 'clubs' && (
        <div className="card divide-y divide-white/[0.06]">
          {clubs.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <div className="w-8 text-center font-display text-lg font-bold text-ink-400">{i + 1}</div><div className="text-2xl">{c.emoji}</div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{c.name}</div><div className="text-xs text-ink-400">{c.members} a’zo · 🔥 o‘rtacha {c.streak_avg}</div></div>
              <div className="font-display text-lg font-bold text-ember-400">{c.weekly_xp}</div>
            </div>
          ))}
          {clubs.length === 0 && <div className="p-6 text-center text-sm text-ink-400">Hali klub yo‘q. <Link className="underline" href="/club">Birinchisini yarating</Link></div>}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return <Suspense fallback={<Skeleton className="h-40" />}><LeaderboardInner /></Suspense>;
}
