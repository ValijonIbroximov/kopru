'use client';
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, MessageCircle, Swords, Bell, Landmark, Check, Trophy, ArrowLeft } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { PageHeader, Empty, Skeleton } from '@/components/ui';
import ChatPanel from '@/components/social/ChatPanel';
import { isLocal, fetchWords, fetchLessons, fetchLessonProgress } from '@/lib/data';
import { knownWords } from '@/components/exercises/GamePage';
import { buildBlitzQuestions } from '@/components/games/BlitzEngine';
import { fetchPublicProfile, sendFriendRequest, respondFriend, nudge, createChallenge, inviteToClub, SocialError, GAME_LABELS_L, type PublicProfile } from '@/lib/social';
import { useLang } from '@/lib/i18n';
import { leagueIcon, leagueLabel, relativeDay, cn } from '@/lib/utils';

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { profile } = useProfile();
  const { push } = useToast();
  const { l, t, lang } = useLang();
  const router = useRouter();
  const [p, setP] = useState<PublicProfile | null | undefined>(undefined);
  const [chat, setChat] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => setP(await fetchPublicProfile(decodeURIComponent(username))), [username]);
  useEffect(() => { load(); }, [load]);

  if (isLocal()) return <Empty icon="👤" title={t('requires_supabase')} body={l({ uz: 'Boshqa foydalanuvchilar profili demo rejimda mavjud emas.', tr: 'Diğer kullanıcıların profili demo modunda mevcut değil.' })} />;
  if (p === undefined || !profile) return <div className="mx-auto max-w-2xl space-y-3"><Skeleton className="h-32" /><Skeleton className="h-24" /><Skeleton className="h-40" /></div>;
  if (p === null) return <Empty icon="🔍" title={l({ uz: 'Foydalanuvchi topilmadi', tr: 'Kullanıcı bulunamadı' })} body={`@${username}`} action={<Link href="/leaderboard" className="btn-secondary">{t('leaderboard')}</Link>} />;

  const me = p.relation === 'me';
  const friend = p.relation === 'friend';
  const name = p.display_name ?? p.username;
  const active = p.last_active_date === new Date().toISOString().slice(0, 10);

  async function addFriend() {
    setBusy('friend');
    const e = await sendFriendRequest(p!.id);
    if (e) push({ kind: 'error', title: t('error'), body: e }); else { push({ kind: 'success', icon: '📨', title: l({ uz: 'So‘rov yuborildi', tr: 'İstek gönderildi' }) }); await load(); }
    setBusy(null);
  }
  async function accept() {
    if (!p!.friendship_id) return;
    setBusy('friend'); await respondFriend(p!.friendship_id, true); push({ kind: 'success', icon: '🤝', title: l({ uz: 'Do‘st qo‘shildi', tr: 'Arkadaş eklendi' }) }); await load(); setBusy(null);
  }
  async function challenge() {
    setBusy('challenge');
    try {
      const [all, lessons, lp] = await Promise.all([fetchWords(), fetchLessons(), fetchLessonProgress()]);
      const qs = buildBlitzQuestions(knownWords(all, lessons, lp, 30), 20, Math.floor(Math.random() * 1e6));
      const id = await createChallenge(p!.id, qs);
      push({ kind: 'success', icon: '⚔️', title: l({ uz: 'Chaqiriq yaratildi', tr: 'Meydan okuma oluşturuldu' }) });
      if (id) router.push(`/challenge/${id}`);
    } catch (e) { push({ kind: 'error', title: t('error'), body: e instanceof SocialError ? l(e.text) : String((e as Error).message) }); }
    setBusy(null);
  }
  async function invite() {
    if (!p!.my_club) return;
    setBusy('club'); await inviteToClub(p!.id, p!.my_club); push({ kind: 'success', icon: p!.my_club.emoji, title: l({ uz: 'Taklif yuborildi', tr: 'Davet gönderildi' }), body: l({ uz: `${name} bildirishnoma oladi; kod: ${p!.my_club.code}`, tr: `${name} bildirim alır; kod: ${p!.my_club.code}` }) }); setBusy(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button className="btn-ghost -ml-2 px-2 py-1 text-xs" onClick={() => router.back()}><ArrowLeft size={14} /> {t('back')}</button>
      <section className="card relative overflow-hidden p-5">
        <div className="absolute -right-6 -top-6 text-[120px] opacity-[0.06]">{p.avatar}</div>
        <div className="relative flex items-center gap-4">
          <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-white/5 text-5xl">{p.avatar}{active && <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-ink-900 bg-teal-400" title={l({ uz: 'bugun faol', tr: 'bugün aktif' })} />}</div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl font-bold">{name}{me && <span className="ml-2 text-sm font-normal text-ink-400">({t('you')})</span>}</div>
            <div className="text-sm text-ink-300">@{p.username} · {leagueIcon(p.league)} {leagueLabel(p.league)} · #{p.rank}</div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
              <span className="chip">Lvl {p.level}</span><span className="chip">⚡ {p.xp} XP</span><span className="chip">🔥 {p.streak} ({t('record').toLowerCase()} {p.best_streak})</span><span className="chip">{p.level_cefr}</span>
              <span className="chip text-ink-400">{relativeDay(p.last_active_date, 'Asia/Tashkent', lang)}</span>
            </div>
          </div>
        </div>

        {!me && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {p.relation === 'none' && <button className="btn-primary px-4 py-2 text-sm" disabled={busy === 'friend'} onClick={addFriend}><UserPlus size={16} /> {l({ uz: 'Do‘st qo‘shish', tr: 'Arkadaş ekle' })}</button>}
            {p.relation === 'sent' && <span className="chip py-2">📨 {l({ uz: 'So‘rov yuborilgan', tr: 'İstek gönderildi' })}</span>}
            {p.relation === 'incoming' && <button className="btn-teal px-4 py-2 text-sm" disabled={busy === 'friend'} onClick={accept}><Check size={16} /> {l({ uz: 'Do‘stlikni qabul qilish', tr: 'Arkadaşlığı kabul et' })}</button>}
            {friend && <span className="chip py-2 text-teal-300">✓ {l({ uz: 'do‘stingiz', tr: 'arkadaşınız' })}</span>}
            <button className="btn-secondary px-4 py-2 text-sm" disabled={!friend || !p.allow_dm} title={!friend ? l({ uz: 'Chat faqat do‘stlar bilan', tr: 'Sohbet yalnızca arkadaşlarla' }) : !p.allow_dm ? l({ uz: 'Foydalanuvchi xabarlarni yopib qo‘ygan', tr: 'Kullanıcı mesajları kapatmış' }) : ''} onClick={() => setChat(true)}><MessageCircle size={16} /> {l({ uz: 'Xabar yozish', tr: 'Mesaj yaz' })}</button>
            <button className="btn-secondary px-4 py-2 text-sm" disabled={!friend || busy === 'challenge'} title={!friend ? l({ uz: 'Chaqiriq faqat do‘stlarga', tr: 'Meydan okuma yalnızca arkadaşlara' }) : ''} onClick={challenge}><Swords size={16} /> {l({ uz: 'Chaqiriq', tr: 'Meydan oku' })}</button>
            {friend && <button className="btn-secondary px-4 py-2 text-sm" onClick={async () => { await nudge(p.id); push({ kind: 'success', icon: '👋', title: l({ uz: 'Eslatma yuborildi', tr: 'Hatırlatma gönderildi' }) }); }}><Bell size={16} /> Hadi!</button>}
            {p.my_club && !p.club && <button className="btn-secondary px-4 py-2 text-sm" disabled={busy === 'club'} onClick={invite}><Landmark size={16} /> {l({ uz: `Klubga taklif (${p.my_club.emoji} ${p.my_club.name})`, tr: `Kulübe davet et (${p.my_club.emoji} ${p.my_club.name})` })}</button>}
            {!p.my_club && <Link href="/club" className="btn-secondary px-4 py-2 text-sm"><Landmark size={16} /> {l({ uz: 'Guruh (klub) yaratish', tr: 'Grup (kulüp) oluştur' })}</Link>}
          </div>
        )}
        {!me && !friend && <p className="relative mt-2 text-xs text-ink-400">{l({ uz: 'Chat, chaqiriq va «Hadi!» — do‘st bo‘lgandan keyin ochiladi.', tr: 'Sohbet, meydan okuma ve «Hadi!» — arkadaş olduktan sonra açılır.' })}</p>}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: l({ uz: 'Tanish so‘zlar', tr: 'Bilinen kelimeler' }), v: p.words_known, s: `${p.words_mastered} ${l({ uz: 'mukammal', tr: 'mükemmel' })}` },
          { l: t('lessons'), v: p.lessons_done, s: l({ uz: 'yakunlangan', tr: 'tamamlandı' }) },
          { l: t('week_xp'), v: p.weekly_xp, s: `#${p.rank} ${l({ uz: 'umumiy', tr: 'genel' })}` },
          { l: l({ uz: 'Yutuqlar', tr: 'Başarılar' }), v: p.achievements.length, s: `${p.achievements.filter((a) => a.rarity === 'legendary' || a.rarity === 'epic').length} ${l({ uz: 'noyob', tr: 'nadir' })}` },
        ].map((k) => <div key={k.l} className="card-soft glass p-3"><div className="text-xs text-ink-400">{k.l}</div><div className="font-display text-2xl font-bold">{k.v}</div><div className="text-xs text-ink-400">{k.s}</div></div>)}
      </section>

      {p.club && (
        <section className="card flex items-center gap-3 p-4">
          <div className="text-3xl">{p.club.emoji}</div>
          <div className="min-w-0 flex-1"><div className="text-xs text-ink-400">{t('club')}</div><div className="font-display font-bold">{p.club.name}</div><div className="text-xs text-ink-400">{p.club.members} {t('member')}{p.club.is_public ? ` · ${l({ uz: 'ochiq', tr: 'açık' })}` : ''}</div></div>
          {!me && p.club.is_public && !p.my_club && <Link href={`/club?code=${p.club.code}`} className="btn-teal px-3 py-2 text-xs">{l({ uz: 'Qo‘shilish', tr: 'Katıl' })}</Link>}
          {me && <Link href="/club" className="btn-secondary px-3 py-2 text-xs">{t('club')} →</Link>}
        </section>
      )}

      {p.scores.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Trophy size={18} className="text-gold-400" /> {l({ uz: 'Rekordlar', tr: 'Rekorlar' })}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {p.scores.map((s) => { const g = GAME_LABELS_L[s.game]; return (
              <Link key={s.game} href={`/leaderboard?tab=games&game=${s.game}`} className="card-soft flex items-center gap-3 p-3 transition hover:border-white/20">
                <span className="text-2xl">{g?.icon ?? '🎮'}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{g ? l(g.title) : s.game}</div><div className="text-xs text-ink-400">{s.plays} {l({ uz: 'marta', tr: 'kez' })}</div></div>
                <div className="font-display text-lg font-bold text-gold-300">{s.score}<span className="ml-1 text-[10px] font-normal text-ink-400">{g ? l(g.unit) : ''}</span></div>
              </Link>
            ); })}
          </div>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-3 font-display text-lg font-bold">{l({ uz: 'Yutuqlar', tr: 'Başarılar' })} ({p.achievements.length})</h2>
        {p.achievements.length === 0 ? <p className="text-sm text-ink-400">{l({ uz: 'Hali yutuq yo‘q.', tr: 'Henüz başarı yok.' })}</p> : (
          <div className="flex flex-wrap gap-2">{p.achievements.map((a) => <span key={a.code} className={cn('chip py-1.5 text-sm', a.rarity === 'legendary' && 'border-gold-400 text-gold-300', a.rarity === 'epic' && 'border-fuchsia-400 text-fuchsia-300', a.rarity === 'rare' && 'border-teal-400 text-teal-300')}>{a.icon} {a.title}</span>)}</div>
        )}
      </section>

      {chat && <ChatPanel withUser={{ id: p.id, username: p.username, display_name: p.display_name, avatar: p.avatar, level: p.level, streak: p.streak, weekly_xp: p.weekly_xp }} title={name} onClose={() => setChat(false)} />}
    </div>
  );
}
