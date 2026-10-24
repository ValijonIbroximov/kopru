'use client';
import { useCallback, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, UserPlus, Swords, MessageCircle, Bell, Check, X, Trophy } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { PageHeader, Empty, Skeleton } from '@/components/ui';
import Feed from '@/components/social/Feed';
import ChatPanel from '@/components/social/ChatPanel';
import Tip from '@/components/Tip';
import { isLocal, fetchWords, fetchLessons, fetchLessonProgress } from '@/lib/data';
import { knownWords } from '@/components/exercises/GamePage';
import { buildBlitzQuestions } from '@/components/games/BlitzEngine';
import { searchUsers, sendFriendRequest, respondFriend, removeFriend, fetchFriends, fetchFriendRequests, nudge, createChallenge, fetchChallenges, declineChallenge, type Friend, type FriendRequest, type SearchResult, type Challenge, type UserLite } from '@/lib/social';
import { leagueIcon, relativeDay, cn } from '@/lib/utils';

type Tab = 'friends' | 'feed' | 'challenges' | 'requests' | 'search';

function FriendsInner() {
  const params = useSearchParams();
  const { profile } = useProfile();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'friends');
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [chat, setChat] = useState<UserLite | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [f, r, c] = await Promise.all([fetchFriends(), fetchFriendRequests(), fetchChallenges()]);
    setFriends(f); setRequests(r); setChallenges(c);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab !== 'search') return;
    const t = setTimeout(async () => setResults(q.trim().length >= 2 ? await searchUsers(q) : null), 350);
    return () => clearTimeout(t);
  }, [q, tab]);

  async function challenge(f: Friend) {
    setBusy(f.id);
    try {
      const [all, lessons, lp] = await Promise.all([fetchWords(), fetchLessons(), fetchLessonProgress()]);
      const qs = buildBlitzQuestions(knownWords(all, lessons, lp, 30), 20, Math.floor(Math.random() * 1e6));
      const id = await createChallenge(f.id, qs);
      push({ kind: 'success', icon: '⚔️', title: 'Chaqiriq yaratildi', body: 'Endi o‘zingiz o‘ynaysiz — natijangiz do‘stingizga yuboriladi.' });
      if (id) window.location.href = `/challenge/${id}`;
    } catch (e) { push({ kind: 'error', title: 'Xato', body: String((e as Error).message) }); }
    setBusy(null);
  }

  if (isLocal()) return <Empty icon="🤝" title="Ijtimoiy funksiyalar Supabase talab qiladi" body="Do‘stlar, chat, chaqiriqlar va klublar demo rejimda ishlamaydi. README.md bo‘yicha Supabase ulang va 002_social.sql ni ishga tushiring." />;
  if (!profile) return <Skeleton className="h-40" />;

  const pendingIn = challenges.filter((c) => c.status === 'pending' && c.opponent_id === profile.id && c.opponent_score === null);
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'friends', label: 'Do‘stlar', badge: friends?.length },
    { id: 'feed', label: 'Lenta' },
    { id: 'challenges', label: 'Chaqiriqlar', badge: pendingIn.length || undefined },
    { id: 'requests', label: 'So‘rovlar', badge: requests.length || undefined },
    { id: 'search', label: 'Qidirish' },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Do‘stlar" sub="Birga o‘rganish — 2 barobar motivatsiya. Chaqiring, yozishing, raqobatlashing." right={<Link href="/club" className="btn-secondary px-3 py-2 text-xs">🏛️ Klub</Link>} />
      <Tip id="friends-intro" text="Do‘stingizning foydalanuvchi nomini «Qidirish» da yozing. Qabul qilingach — chaqiriq (asinxron duel: har kim o‘z vaqtida o‘ynaydi), chat va «Hadi!» eslatma ochiladi." />
      <div className="mb-4 flex gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={cn('relative shrink-0 rounded-full px-3 py-1.5 text-sm', tab === t.id ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white')}>{t.label}{t.badge ? <span className="ml-1 rounded-full bg-ember-500 px-1.5 text-[10px] text-white">{t.badge}</span> : null}</button>)}
      </div>

      {tab === 'friends' && (
        friends === null ? <Skeleton className="h-40" /> : friends.length === 0 ? (
          <Empty icon="🌱" title="Hali do‘st yo‘q" body="Do‘stingizni qidiring yoki havolani ulashing: har ikkingiz ham ro‘yxatdan o‘tgach — chaqiriq va chat." action={<div className="flex justify-center gap-2"><button className="btn-primary" onClick={() => setTab('search')}><Search size={16} /> Qidirish</button><button className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/login?ref=${profile.username}`); push({ kind: 'success', title: 'Havola nusxalandi' }); }}>Havola ulashish</button></div>} />
        ) : (
          <div className="space-y-2">
            {friends.map((f) => {
              const active = f.last_active_date === new Date().toISOString().slice(0, 10);
              return (
                <div key={f.id} className="card-soft p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative text-3xl">{f.avatar}{active && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-teal-400" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">{f.display_name ?? f.username} <span className="text-xs font-normal text-ink-400">@{f.username}</span></div>
                      <div className="text-xs text-ink-300">Lvl {f.level} · {leagueIcon(f.league ?? 'bronze')} · 🔥{f.streak} · {f.weekly_xp} XP/hafta · {relativeDay(f.last_active_date ?? null)}</div>
                    </div>
                    <div className={cn('text-right text-xs', f.weekly_xp > profile.weekly_xp ? 'text-rose-300' : 'text-teal-300')}>{f.weekly_xp > profile.weekly_xp ? `+${f.weekly_xp - profile.weekly_xp} oldinda` : f.weekly_xp === profile.weekly_xp ? 'teng' : `${profile.weekly_xp - f.weekly_xp} orqada`}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button className="btn-secondary px-3 py-1.5 text-xs" disabled={busy === f.id} onClick={() => challenge(f)}><Swords size={14} /> Chaqiriq</button>
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setChat(f)}><MessageCircle size={14} /> Yozish</button>
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={async () => { await nudge(f.id); push({ kind: 'success', icon: '👋', title: 'Eslatma yuborildi' }); }}><Bell size={14} /> Hadi!</button>
                    <button className="btn-ghost ml-auto px-2 py-1.5 text-xs text-ink-500" onClick={async () => { if (confirm(`${f.username} do‘stlardan o‘chirilsinmi?`)) { await removeFriend(f.friendship_id); load(); } }}>o‘chirish</button>
                  </div>
                </div>
              );
            })}
            <Link href="/leaderboard?tab=friends" className="btn-secondary w-full"><Trophy size={16} /> Do‘stlar reytingi</Link>
          </div>
        )
      )}

      {tab === 'feed' && <Feed />}

      {tab === 'challenges' && (
        <div className="space-y-2">
          <Tip id="challenges-intro" text="Chaqiriq = asinxron duel. Siz 20 savolni o‘ynaysiz, do‘stingiz o‘z vaqtida bir xil savollarni o‘ynaydi. G‘olib 40 XP, mag‘lub 10 XP. 3 kun amal qiladi." />
          {challenges.length === 0 && <Empty icon="🥊" title="Chaqiriqlar yo‘q" body="Do‘stlar ro‘yxatida «Chaqiriq» tugmasini bosing." />}
          {challenges.map((c) => {
            const mine = c.challenger_id === profile.id;
            const other = mine ? c.opponent : c.challenger;
            const myScore = mine ? c.challenger_score : c.opponent_score;
            const theirScore = mine ? c.opponent_score : c.challenger_score;
            const needPlay = c.status === 'pending' && myScore === null;
            const expired = new Date(c.expires_at) < new Date() && c.status === 'pending';
            return (
              <div key={c.id} className={cn('card-soft flex items-center gap-3 p-3', needPlay && !expired && 'border-ember-400/40 bg-ember-500/10')}>
                <div className="text-3xl">{other?.avatar ?? '👤'}</div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold text-white">{mine ? 'Siz → ' : ''}{other?.display_name ?? other?.username}{!mine ? ' → Siz' : ''}</div>
                  <div className="text-xs text-ink-300">
                    {c.status === 'done' ? (c.winner_id === profile.id ? '🏆 G‘alaba' : c.winner_id ? '😤 Mag‘lubiyat' : '🤝 Durang') : expired ? 'Muddati o‘tdi' : c.status === 'declined' ? 'Rad etildi' : needPlay ? 'Sizning navbatingiz!' : 'Raqib kutilmoqda'}
                    {' · '}siz {myScore ?? '—'} : {theirScore ?? '—'} {other?.username}
                  </div>
                </div>
                {needPlay && !expired && <Link href={`/challenge/${c.id}`} className="btn-primary px-3 py-2 text-xs">O‘ynash</Link>}
                {c.status === 'done' && <Link href={`/challenge/${c.id}`} className="btn-secondary px-3 py-2 text-xs">Natija</Link>}
                {needPlay && !mine && !expired && <button className="btn-ghost px-2 py-2 text-xs" onClick={async () => { await declineChallenge(c.id); load(); }}><X size={14} /></button>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-2">
          {requests.length === 0 && <Empty icon="📭" title="So‘rovlar yo‘q" body="Kimdir sizni do‘st qilib qo‘shsa — shu yerda ko‘rinadi." />}
          {requests.map((r) => (
            <div key={r.id} className="card-soft flex items-center gap-3 p-3">
              <div className="text-3xl">{r.requester.avatar}</div>
              <div className="min-w-0 flex-1"><div className="font-semibold text-white">{r.requester.display_name ?? r.requester.username}</div><div className="text-xs text-ink-300">@{r.requester.username} · Lvl {r.requester.level} · 🔥{r.requester.streak}</div></div>
              <button className="btn-teal px-3 py-2 text-xs" onClick={async () => { await respondFriend(r.id, true); push({ kind: 'success', icon: '🤝', title: 'Do‘st qo‘shildi' }); load(); }}><Check size={14} /> Qabul</button>
              <button className="btn-ghost px-2 py-2 text-xs" onClick={async () => { await respondFriend(r.id, false); load(); }}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'search' && (
        <div>
          <div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-ink-400" /><input className="input pl-9" placeholder="foydalanuvchi nomi yoki ism…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div>
          <div className="mt-3 space-y-2">
            {results === null && <div className="text-center text-sm text-ink-400">Kamida 2 ta harf yozing. Sizning nomingiz: <b className="text-white">@{profile.username}</b> — do‘stlaringizga ayting.</div>}
            {results?.length === 0 && <div className="text-center text-sm text-ink-400">Topilmadi</div>}
            {results?.map((u) => (
              <div key={u.id} className="card-soft flex items-center gap-3 p-3">
                <div className="text-3xl">{u.avatar}</div>
                <div className="min-w-0 flex-1"><div className="font-semibold text-white">{u.display_name ?? u.username}</div><div className="text-xs text-ink-300">@{u.username} · Lvl {u.level} · {leagueIcon(u.league ?? 'bronze')} · 🔥{u.streak}</div></div>
                {u.relation === 'none' && <button className="btn-primary px-3 py-2 text-xs" onClick={async () => { const e = await sendFriendRequest(u.id); if (e) push({ kind: 'error', title: 'Xato', body: e }); else { push({ kind: 'success', icon: '📨', title: 'So‘rov yuborildi' }); setResults(results.map((x) => (x.id === u.id ? { ...x, relation: 'sent' } : x))); } }}><UserPlus size={14} /> Qo‘shish</button>}
                {u.relation === 'sent' && <span className="chip">yuborildi</span>}
                {u.relation === 'incoming' && <button className="btn-teal px-3 py-2 text-xs" onClick={() => setTab('requests')}>So‘rov bor</button>}
                {u.relation === 'friend' && <span className="chip text-teal-300">✓ do‘st</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {chat && <ChatPanel withUser={chat} title={chat.display_name ?? chat.username} onClose={() => setChat(null)} />}
    </div>
  );
}

export default function FriendsPage() {
  return <Suspense fallback={<Skeleton className="h-40" />}><FriendsInner /></Suspense>;
}
