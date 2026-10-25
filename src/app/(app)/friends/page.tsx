'use client';
import { useCallback, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { searchUsers, sendFriendRequest, respondFriend, removeFriend, fetchFriends, fetchFriendRequests, nudge, createChallenge, fetchChallenges, declineChallenge, SocialError, type Friend, type FriendRequest, type SearchResult, type Challenge, type UserLite } from '@/lib/social';
import { useLang, type L } from '@/lib/i18n';
import { leagueIcon, relativeDay, cn } from '@/lib/utils';

type Tab = 'friends' | 'feed' | 'challenges' | 'requests' | 'search';

function FriendsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useProfile();
  const { push } = useToast();
  const { l, t, lang } = useLang();
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
      push({ kind: 'success', icon: '⚔️', title: l({ uz: 'Chaqiriq yaratildi', tr: 'Meydan okuma oluşturuldu' }), body: l({ uz: 'Endi o‘zingiz o‘ynaysiz — natijangiz do‘stingizga yuboriladi.', tr: 'Şimdi kendiniz oynayacaksınız — sonucunuz arkadaşınıza gönderilecek.' }) });
      if (id) router.push(`/challenge/${id}`);
    } catch (e) { push({ kind: 'error', title: t('error'), body: e instanceof SocialError ? l(e.text) : String((e as Error).message) }); }
    setBusy(null);
  }

  if (isLocal()) return <Empty icon="🤝" title={l({ uz: 'Ijtimoiy funksiyalar Supabase talab qiladi', tr: 'Sosyal özellikler Supabase gerektirir' })} body={l({ uz: 'Do‘stlar, chat, chaqiriqlar va klublar demo rejimda ishlamaydi. README.md bo‘yicha Supabase ulang va 002_social.sql ni ishga tushiring.', tr: 'Arkadaşlar, sohbet, meydan okumalar ve kulüpler demo modunda çalışmaz. README.md’ye göre Supabase bağlayın ve 002_social.sql dosyasını çalıştırın.' })} />;
  if (!profile) return <Skeleton className="h-40" />;

  const pendingIn = challenges.filter((c) => c.status === 'pending' && c.opponent_id === profile.id && c.opponent_score === null);
  const TABS: { id: Tab; label: L; badge?: number }[] = [
    { id: 'friends', label: t('friends'), badge: friends?.length },
    { id: 'feed', label: { uz: 'Lenta', tr: 'Akış' } },
    { id: 'challenges', label: { uz: 'Chaqiriqlar', tr: 'Meydan okumalar' }, badge: pendingIn.length || undefined },
    { id: 'requests', label: { uz: 'So‘rovlar', tr: 'İstekler' }, badge: requests.length || undefined },
    { id: 'search', label: t('search') },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('friends')} sub={l({ uz: 'Birga o‘rganish — 2 barobar motivatsiya. Chaqiring, yozishing, raqobatlashing.', tr: 'Birlikte öğrenmek — 2 kat motivasyon. Meydan okuyun, yazışın, yarışın.' })} right={<Link href="/club" className="btn-secondary px-3 py-2 text-xs">🏛️ {t('club')}</Link>} />
      <Tip id="friends-intro" text={{ uz: 'Do‘stingizning foydalanuvchi nomini «Qidirish» da yozing. Qabul qilingach — chaqiriq (asinxron duel: har kim o‘z vaqtida o‘ynaydi), chat va «Hadi!» eslatma ochiladi.', tr: 'Arkadaşınızın kullanıcı adını «Ara» bölümüne yazın. Kabul edilince — meydan okuma (asenkron düello: herkes kendi zamanında oynar), sohbet ve «Hadi!» hatırlatması açılır.' }} />
      <div className="mb-4 flex gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((tb) => <button key={tb.id} onClick={() => setTab(tb.id)} className={cn('relative shrink-0 rounded-full px-3 py-1.5 text-sm', tab === tb.id ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white')}>{l(tb.label)}{tb.badge ? <span className="ml-1 rounded-full bg-ember-500 px-1.5 text-[10px] text-white">{tb.badge}</span> : null}</button>)}
      </div>

      {tab === 'friends' && (
        friends === null ? <Skeleton className="h-40" /> : friends.length === 0 ? (
          <Empty icon="🌱" title={l({ uz: 'Hali do‘st yo‘q', tr: 'Henüz arkadaş yok' })} body={l({ uz: 'Do‘stingizni qidiring yoki havolani ulashing: har ikkingiz ham ro‘yxatdan o‘tgach — chaqiriq va chat.', tr: 'Arkadaşınızı arayın ya da bağlantıyı paylaşın: ikiniz de kayıt olunca — meydan okuma ve sohbet.' })} action={<div className="flex justify-center gap-2"><button className="btn-primary" onClick={() => setTab('search')}><Search size={16} /> {t('search')}</button><button className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/login?ref=${profile.username}`); push({ kind: 'success', title: t('link_copied') }); }}>{l({ uz: 'Havola ulashish', tr: 'Bağlantıyı paylaş' })}</button></div>} />
        ) : (
          <div className="space-y-2">
            {friends.map((f) => {
              const active = f.last_active_date === new Date().toISOString().slice(0, 10);
              return (
                <div key={f.id} className="card-soft p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative text-3xl">{f.avatar}{active && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-teal-400" />}</div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/u/${f.username}`} className="block truncate font-semibold text-white hover:underline">{f.display_name ?? f.username} <span className="text-xs font-normal text-ink-400">@{f.username}</span></Link>
                      <div className="text-xs text-ink-300">Lvl {f.level} · {leagueIcon(f.league ?? 'bronze')} · 🔥{f.streak} · {f.weekly_xp} {t('week_xp')} · {relativeDay(f.last_active_date ?? null, 'Asia/Tashkent', lang)}</div>
                    </div>
                    <div className={cn('text-right text-xs', f.weekly_xp > profile.weekly_xp ? 'text-rose-300' : 'text-teal-300')}>{f.weekly_xp > profile.weekly_xp ? l({ uz: `+${f.weekly_xp - profile.weekly_xp} oldinda`, tr: `+${f.weekly_xp - profile.weekly_xp} önde` }) : f.weekly_xp === profile.weekly_xp ? l({ uz: 'teng', tr: 'eşit' }) : l({ uz: `${profile.weekly_xp - f.weekly_xp} orqada`, tr: `${profile.weekly_xp - f.weekly_xp} geride` })}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button className="btn-secondary px-3 py-1.5 text-xs" disabled={busy === f.id} onClick={() => challenge(f)}><Swords size={14} /> {l({ uz: 'Chaqiriq', tr: 'Meydan oku' })}</button>
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setChat(f)}><MessageCircle size={14} /> {l({ uz: 'Yozish', tr: 'Yaz' })}</button>
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={async () => { await nudge(f.id); push({ kind: 'success', icon: '👋', title: l({ uz: 'Eslatma yuborildi', tr: 'Hatırlatma gönderildi' }) }); }}><Bell size={14} /> Hadi!</button>
                    <button className="btn-ghost ml-auto px-2 py-1.5 text-xs text-ink-500" onClick={async () => { if (confirm(l({ uz: `${f.username} do‘stlardan o‘chirilsinmi?`, tr: `${f.username} arkadaşlardan çıkarılsın mı?` }))) { await removeFriend(f.friendship_id); load(); } }}>{l({ uz: 'o‘chirish', tr: 'çıkar' })}</button>
                  </div>
                </div>
              );
            })}
            <Link href="/leaderboard?tab=friends" className="btn-secondary w-full"><Trophy size={16} /> {l({ uz: 'Do‘stlar reytingi', tr: 'Arkadaş sıralaması' })}</Link>
          </div>
        )
      )}

      {tab === 'feed' && <Feed />}

      {tab === 'challenges' && (
        <div className="space-y-2">
          <Tip id="challenges-intro" text={{ uz: 'Chaqiriq = asinxron duel. Siz 20 savolni o‘ynaysiz, do‘stingiz o‘z vaqtida bir xil savollarni o‘ynaydi. G‘olib 40 XP, mag‘lub 10 XP. 3 kun amal qiladi.', tr: 'Meydan okuma = asenkron düello. Siz 20 soruyu oynarsınız, arkadaşınız kendi zamanında aynı soruları oynar. Kazanan 40 XP, kaybeden 10 XP. 3 gün geçerli.' }} />
          {challenges.length === 0 && <Empty icon="🥊" title={l({ uz: 'Chaqiriqlar yo‘q', tr: 'Meydan okuma yok' })} body={l({ uz: 'Do‘stlar ro‘yxatida «Chaqiriq» tugmasini bosing.', tr: 'Arkadaş listesinde «Meydan oku» düğmesine basın.' })} />}
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
                  <div className="font-semibold text-white">{mine ? `${l({ uz: 'Siz', tr: 'Siz' })} → ` : ''}{other?.display_name ?? other?.username}{!mine ? ` → ${l({ uz: 'Siz', tr: 'Siz' })}` : ''}</div>
                  <div className="text-xs text-ink-300">
                    {c.status === 'done' ? (c.winner_id === profile.id ? l({ uz: '🏆 G‘alaba', tr: '🏆 Galibiyet' }) : c.winner_id ? l({ uz: '😤 Mag‘lubiyat', tr: '😤 Mağlubiyet' }) : l({ uz: '🤝 Durang', tr: '🤝 Berabere' })) : expired ? l({ uz: 'Muddati o‘tdi', tr: 'Süresi doldu' }) : c.status === 'declined' ? l({ uz: 'Rad etildi', tr: 'Reddedildi' }) : needPlay ? l({ uz: 'Sizning navbatingiz!', tr: 'Sıra sizde!' }) : l({ uz: 'Raqib kutilmoqda', tr: 'Rakip bekleniyor' })}
                    {' · '}{t('you')} {myScore ?? '—'} : {theirScore ?? '—'} {other?.username}
                  </div>
                </div>
                {needPlay && !expired && <Link href={`/challenge/${c.id}`} className="btn-primary px-3 py-2 text-xs">{t('play')}</Link>}
                {c.status === 'done' && <Link href={`/challenge/${c.id}`} className="btn-secondary px-3 py-2 text-xs">{l({ uz: 'Natija', tr: 'Sonuç' })}</Link>}
                {needPlay && !mine && !expired && <button className="btn-ghost px-2 py-2 text-xs" onClick={async () => { await declineChallenge(c.id); load(); }}><X size={14} /></button>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-2">
          {requests.length === 0 && <Empty icon="📭" title={l({ uz: 'So‘rovlar yo‘q', tr: 'İstek yok' })} body={l({ uz: 'Kimdir sizni do‘st qilib qo‘shsa — shu yerda ko‘rinadi.', tr: 'Biri sizi arkadaş olarak eklerse — burada görünür.' })} />}
          {requests.map((r) => (
            <div key={r.id} className="card-soft flex items-center gap-3 p-3">
              <div className="text-3xl">{r.requester.avatar}</div>
              <div className="min-w-0 flex-1"><Link href={`/u/${r.requester.username}`} className="font-semibold text-white hover:underline">{r.requester.display_name ?? r.requester.username}</Link><div className="text-xs text-ink-300">@{r.requester.username} · Lvl {r.requester.level} · 🔥{r.requester.streak}</div></div>
              <button className="btn-teal px-3 py-2 text-xs" onClick={async () => { await respondFriend(r.id, true); push({ kind: 'success', icon: '🤝', title: l({ uz: 'Do‘st qo‘shildi', tr: 'Arkadaş eklendi' }) }); load(); }}><Check size={14} /> {l({ uz: 'Qabul', tr: 'Kabul' })}</button>
              <button className="btn-ghost px-2 py-2 text-xs" onClick={async () => { await respondFriend(r.id, false); load(); }}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'search' && (
        <div>
          <div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-ink-400" /><input className="input pl-9" placeholder={l({ uz: 'foydalanuvchi nomi yoki ism…', tr: 'kullanıcı adı veya isim…' })} value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div>
          <div className="mt-3 space-y-2">
            {results === null && <div className="text-center text-sm text-ink-400">{l({ uz: 'Kamida 2 ta harf yozing. Sizning nomingiz: ', tr: 'En az 2 harf yazın. Kullanıcı adınız: ' })}<b className="text-white">@{profile.username}</b>{l({ uz: ' — do‘stlaringizga ayting.', tr: ' — arkadaşlarınıza söyleyin.' })}</div>}
            {results?.length === 0 && <div className="text-center text-sm text-ink-400">{l({ uz: 'Topilmadi', tr: 'Bulunamadı' })}</div>}
            {results?.map((u) => (
              <div key={u.id} className="card-soft flex items-center gap-3 p-3">
                <div className="text-3xl">{u.avatar}</div>
                <div className="min-w-0 flex-1"><Link href={`/u/${u.username}`} className="font-semibold text-white hover:underline">{u.display_name ?? u.username}</Link><div className="text-xs text-ink-300">@{u.username} · Lvl {u.level} · {leagueIcon(u.league ?? 'bronze')} · 🔥{u.streak}</div></div>
                {u.relation === 'none' && <button className="btn-primary px-3 py-2 text-xs" onClick={async () => { const e = await sendFriendRequest(u.id); if (e) push({ kind: 'error', title: t('error'), body: e }); else { push({ kind: 'success', icon: '📨', title: l({ uz: 'So‘rov yuborildi', tr: 'İstek gönderildi' }) }); setResults(results.map((x) => (x.id === u.id ? { ...x, relation: 'sent' } : x))); } }}><UserPlus size={14} /> {l({ uz: 'Qo‘shish', tr: 'Ekle' })}</button>}
                {u.relation === 'sent' && <span className="chip">{l({ uz: 'yuborildi', tr: 'gönderildi' })}</span>}
                {u.relation === 'incoming' && <button className="btn-teal px-3 py-2 text-xs" onClick={() => setTab('requests')}>{l({ uz: 'So‘rov bor', tr: 'İstek var' })}</button>}
                {u.relation === 'friend' && <span className="chip text-teal-300">✓ {l({ uz: 'do‘st', tr: 'arkadaş' })}</span>}
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
