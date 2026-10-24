'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { UserPlus, MessageCircle } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { fetchLeaderboard, isLocal } from '@/lib/data';
import { fetchFriends, fetchClubsLeaderboard, fetchHighScores, sendFriendRequest, dailyKey, GAME_LABELS_L, type Friend, type ClubRow, type HighScore, type UserLite } from '@/lib/social';
import ChatPanel from '@/components/social/ChatPanel';
import { PageHeader, Skeleton, Empty } from '@/components/ui';
import Tip from '@/components/Tip';
import { useLang, type L } from '@/lib/i18n';
import { leagueIcon, leagueLabel, cn } from '@/lib/utils';

type Tab = 'league' | 'all' | 'friends' | 'clubs' | 'games' | 'daily';
type Row = { id: string; username: string; display_name: string | null; avatar: string; level: number; league?: string; weekly_xp: number; streak: number };

function LeaderboardInner() {
  const params = useSearchParams();
  const { profile } = useProfile();
  const { push } = useToast();
  const { l, t } = useLang();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchLeaderboard>> | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [scores, setScores] = useState<HighScore[]>([]);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'league');
  const [game, setGame] = useState(params.get('game') || 'blitz');
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [chat, setChat] = useState<UserLite | null>(null);

  useEffect(() => { Promise.all([fetchLeaderboard(100), fetchFriends(), fetchClubsLeaderboard()]).then(([r, f, c]) => { setRows(r); setFriends(f); setClubs(c); }); }, []);
  useEffect(() => { if (tab === 'games') fetchHighScores(game, 50).then(setScores); if (tab === 'daily') fetchHighScores(dailyKey(), 50).then(setScores); }, [tab, game]);

  if (isLocal()) return <Empty icon="🏆" title={l({ uz: 'Liderlar jadvali Supabase talab qiladi', tr: 'Sıralama Supabase gerektirir' })} body={l({ uz: 'Demo rejimda boshqa foydalanuvchilar yo‘q.', tr: 'Demo modunda başka kullanıcı yok.' })} />;
  if (!rows || !profile) return <div className="space-y-2"><Skeleton className="h-10 w-1/2" />{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>;

  const friendIds = new Set(friends.map((f) => f.id));
  const TABS: { id: Tab; label: L }[] = [
    { id: 'league', label: `${leagueIcon(profile.league)} ${l({ uz: 'Liga', tr: 'Lig' })}` }, { id: 'friends', label: `🤝 ${t('friends')}` }, { id: 'daily', label: { uz: '📅 Kunlik', tr: '📅 Günlük' } }, { id: 'games', label: { uz: '🎮 Rekordlar', tr: '🎮 Rekorlar' } }, { id: 'clubs', label: { uz: '🏛️ Klublar', tr: '🏛️ Kulüpler' } }, { id: 'all', label: { uz: '🌍 Hammasi', tr: '🌍 Herkes' } },
  ];

  async function addFriend(u: Row) {
    const e = await sendFriendRequest(u.id);
    if (e) push({ kind: 'error', title: t('error'), body: e });
    else { push({ kind: 'success', icon: '📨', title: l({ uz: 'So‘rov yuborildi', tr: 'İstek gönderildi' }), body: `@${u.username}` }); setSent((s) => new Set(s).add(u.id)); }
  }

  /** Foydalanuvchi qatori: nomi → profil; tez tugmalar: do'st qo'shish / yozish */
  const UserActions = ({ r }: { r: Row }) => {
    if (r.id === profile.id) return null;
    const isFriend = friendIds.has(r.id);
    return (
      <div className="flex shrink-0 gap-1">
        {isFriend ? (
          <button className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-teal-300 hover:bg-white/10" title={l({ uz: 'Xabar yozish', tr: 'Mesaj yaz' })} onClick={(e) => { e.preventDefault(); setChat({ id: r.id, username: r.username, display_name: r.display_name, avatar: r.avatar, level: r.level, streak: r.streak, weekly_xp: r.weekly_xp }); }}><MessageCircle size={14} /></button>
        ) : sent.has(r.id) ? (
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-xs text-ink-400" title={l({ uz: 'So‘rov yuborilgan', tr: 'İstek gönderildi' })}>📨</span>
        ) : (
          <button className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-ember-300 hover:bg-white/10" title={l({ uz: 'Do‘st qo‘shish', tr: 'Arkadaş ekle' })} onClick={(e) => { e.preventDefault(); addFriend(r); }}><UserPlus size={14} /></button>
        )}
      </div>
    );
  };

  const renderUsers = (list: Row[], zoneTab = false) => (
    <div className="card divide-y divide-white/[0.06]">
      {list.map((r, i) => {
        const me = r.id === profile.id;
        const zone = zoneTab ? (i < Math.max(1, Math.ceil(list.length * 0.2)) ? 'up' : list.length >= 5 && i >= list.length - Math.ceil(list.length * 0.15) ? 'down' : '') : '';
        return (
          <div key={r.id} className={cn('flex items-center gap-3 p-3', me && 'bg-ember-500/10')}>
            <div className={cn('w-8 text-center font-display text-lg font-bold', i === 0 ? 'text-gold-400' : i === 1 ? 'text-ink-200' : i === 2 ? 'text-ember-300' : 'text-ink-400')}>{i + 1}</div>
            <Link href={me ? '/profile' : `/u/${r.username}`} className="text-2xl">{r.avatar}</Link>
            <div className="min-w-0 flex-1">
              <Link href={me ? '/profile' : `/u/${r.username}`} className="block truncate font-semibold text-white hover:underline">{r.display_name ?? r.username}{me && ` (${t('you')})`}</Link>
              <div className="text-xs text-ink-400">Lvl {r.level} · 🔥{r.streak}{r.league ? ` · ${leagueIcon(r.league)}` : ''}{friendIds.has(r.id) ? ` · ${l({ uz: 'do‘st', tr: 'arkadaş' })}` : ''}</div>
            </div>
            <div className="text-right"><div className="font-display text-lg font-bold text-ember-400">{r.weekly_xp}</div><div className="text-[10px] text-ink-400">{zone === 'up' ? l({ uz: '▲ ko‘tariladi', tr: '▲ yükselir' }) : zone === 'down' ? l({ uz: '▼ tushadi', tr: '▼ düşer' }) : t('week_xp')}</div></div>
            <UserActions r={r} />
          </div>
        );
      })}
      {list.length === 0 && <div className="p-6 text-center text-sm text-ink-400">{l({ uz: 'Hali hech kim yo‘q', tr: 'Henüz kimse yok' })}</div>}
    </div>
  );

  const renderScores = (list: HighScore[], unit: string) => (
    <div className="card divide-y divide-white/[0.06]">
      {list.map((h, i) => {
        const me = h.user_id === profile.id;
        const u = h.profile;
        return (
          <div key={h.user_id} className={cn('flex items-center gap-3 p-3', me && 'bg-ember-500/10')}>
            <div className={cn('w-8 text-center font-display text-lg font-bold', i === 0 ? 'text-gold-400' : i === 1 ? 'text-ink-200' : i === 2 ? 'text-ember-300' : 'text-ink-400')}>{i + 1}</div>
            <div className="text-2xl">{u?.avatar}</div>
            <div className="min-w-0 flex-1">
              {u ? <Link href={me ? '/profile' : `/u/${u.username}`} className="block truncate font-semibold text-white hover:underline">{u.display_name ?? u.username}{me && ` (${t('you')})`}</Link> : <div className="truncate font-semibold text-white">—</div>}
              <div className="text-xs text-ink-400">Lvl {u?.level} · {h.plays} {l({ uz: 'marta o‘ynagan', tr: 'kez oynadı' })}</div>
            </div>
            <div className="text-right"><div className="font-display text-lg font-bold text-gold-300">{h.score}</div><div className="text-[10px] text-ink-400">{unit}</div></div>
            {u && <UserActions r={{ id: u.id, username: u.username, display_name: u.display_name, avatar: u.avatar, level: u.level, league: u.league, weekly_xp: u.weekly_xp, streak: u.streak }} />}
          </div>
        );
      })}
      {list.length === 0 && <div className="p-6 text-center text-sm text-ink-400">{l({ uz: 'Hali rekord yo‘q — birinchi bo‘ling!', tr: 'Henüz rekor yok — ilk siz olun!' })}</div>}
    </div>
  );

  const g = GAME_LABELS_L[game];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('leaderboard')} sub={l({ uz: 'Haftalik XP, do‘stlar, kunlik chaqiriq, o‘yin rekordlari va klublar. Nomni bosing — profil, do‘stlik, chat.', tr: 'Haftalık XP, arkadaşlar, günlük meydan okuma, oyun rekorları ve kulüpler. İsme basın — profil, arkadaşlık, sohbet.' })} />
      <Tip id="leaderboard-intro" text={{ uz: 'Liga: dushanba kuni top 20% yuqori ligaga ko‘tariladi, pastki 15% tushadi. «Kunlik» — bugungi Blitz chaqirig‘i: hamma uchun bir xil savollar. Har qatordagi ➕ — do‘stlik so‘rovi, 💬 — chat (do‘stlar bilan).', tr: 'Lig: pazartesi günü ilk %20 üst lige yükselir, son %15 düşer. «Günlük» — bugünkü Blitz meydan okuması: herkes için aynı sorular. Her satırdaki ➕ — arkadaşlık isteği, 💬 — sohbet (arkadaşlarla).' }} />
      <div className="mb-3 flex gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((tb) => <button key={tb.id} onClick={() => setTab(tb.id)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-sm', tab === tb.id ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white')}>{l(tb.label)}</button>)}
      </div>
      {tab === 'league' && <><div className="mb-2 text-xs text-ink-400">{leagueLabel(profile.league)} {l({ uz: 'ligasi', tr: 'ligi' })} · {rows.filter((r) => r.league === profile.league).length} {l({ uz: 'kishi', tr: 'kişi' })}</div>{renderUsers(rows.filter((r) => r.league === profile.league), true)}</>}
      {tab === 'all' && renderUsers(rows)}
      {tab === 'friends' && (friends.length ? renderUsers([...friends, { ...profile, league: profile.league }].sort((a, b) => b.weekly_xp - a.weekly_xp)) : <Empty icon="🤝" title={l({ uz: 'Do‘stlar yo‘q', tr: 'Arkadaş yok' })} body={l({ uz: 'Do‘st qo‘shsangiz — shu yerda kim oldinda ekanini ko‘rasiz. «Hammasi» bo‘limida ➕ bosing.', tr: 'Arkadaş eklerseniz — kimin önde olduğunu burada görürsünüz. «Herkes» bölümünde ➕ basın.' })} action={<div className="flex justify-center gap-2"><button className="btn-primary" onClick={() => setTab('all')}>🌍 {l({ uz: 'Hammasi', tr: 'Herkes' })}</button><Link href="/friends?tab=search" className="btn-secondary">{l({ uz: 'Do‘st qidirish', tr: 'Arkadaş ara' })}</Link></div>} />)}
      {tab === 'daily' && <><div className="mb-2 flex items-center justify-between text-xs text-ink-400"><span>{l({ uz: 'Bugungi Blitz chaqirig‘i — hamma uchun bir xil savollar', tr: 'Bugünkü Blitz meydan okuması — herkes için aynı sorular' })}</span><Link href="/play/blitz?daily=1" className="btn-primary px-3 py-1.5 text-xs">⚡ {t('play')}</Link></div>{renderScores(scores, t('points'))}</>}
      {tab === 'games' && (
        <>
          <div className="mb-3 flex gap-1.5 overflow-x-auto scrollbar-none">{Object.entries(GAME_LABELS_L).map(([k, gg]) => <button key={k} onClick={() => setGame(k)} className={cn('chip shrink-0 py-1.5', game === k && 'border-gold-400 bg-gold-400/20 text-white')}>{gg.icon} {l(gg.title)}</button>)}</div>
          {renderScores(scores, g ? l(g.unit) : t('points'))}
          <Link href={`/play/${game}`} className="btn-secondary mt-3 w-full">{g?.icon} {g ? l(g.title) : game} — {t('play')}</Link>
        </>
      )}
      {tab === 'clubs' && (
        <div className="card divide-y divide-white/[0.06]">
          {clubs.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <div className="w-8 text-center font-display text-lg font-bold text-ink-400">{i + 1}</div><div className="text-2xl">{c.emoji}</div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{c.name}</div><div className="text-xs text-ink-400">{c.members} {t('member')} · 🔥 {l({ uz: 'o‘rtacha', tr: 'ortalama' })} {c.streak_avg}</div></div>
              <div className="font-display text-lg font-bold text-ember-400">{c.weekly_xp}</div>
              {c.is_public && <Link href={`/club?code=${c.code}`} className="chip py-1.5 text-teal-300">{l({ uz: 'Qo‘shilish', tr: 'Katıl' })}</Link>}
            </div>
          ))}
          {clubs.length === 0 && <div className="p-6 text-center text-sm text-ink-400">{l({ uz: 'Hali klub yo‘q. ', tr: 'Henüz kulüp yok. ' })}<Link className="underline" href="/club">{l({ uz: 'Birinchisini yarating', tr: 'İlkini siz oluşturun' })}</Link></div>}
        </div>
      )}
      {chat && <ChatPanel withUser={chat} title={chat.display_name ?? chat.username} onClose={() => setChat(null)} />}
    </div>
  );
}

export default function LeaderboardPage() {
  return <Suspense fallback={<Skeleton className="h-40" />}><LeaderboardInner /></Suspense>;
}
