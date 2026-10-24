'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, LogOut, Copy, Crown, UserMinus } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { PageHeader, Empty, Skeleton, Bar } from '@/components/ui';
import ChatPanel from '@/components/social/ChatPanel';
import Tip from '@/components/Tip';
import { isLocal } from '@/lib/data';
import { fetchMyClub, createClub, joinClub, leaveClub, fetchClubsLeaderboard, kickMember, updateClub, type Club, type ClubMember, type ClubRow, type UserLite } from '@/lib/social';
import { cn, relativeDay } from '@/lib/utils';
import { useLang } from '@/lib/i18n';

const EMOJIS = ['🏛️', '🦅', '🐺', '🔥', '⚡', '🌙', '🛡️', '🚀', '🌉', '🎯', '🦁', '🏔️'];

export default function ClubPage() {
  const { profile, refresh } = useProfile();
  const { push } = useToast();
  const { l, t, lang } = useLang();
  const [mine, setMine] = useState<{ club: Club; members: ClubMember[]; myRole: string } | null | undefined>(undefined);
  const [board, setBoard] = useState<ClubRow[]>([]);
  const [chat, setChat] = useState(false);
  const [mode, setMode] = useState<'browse' | 'create' | 'join'>('browse');
  const [form, setForm] = useState({ name: '', emoji: '🏛️', description: '', isPublic: true });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { const [m, b] = await Promise.all([fetchMyClub(), fetchClubsLeaderboard()]); setMine(m); setBoard(b); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code');
    if (c) { setCode(c.toUpperCase()); setMode('join'); }
  }, []);

  if (isLocal()) return <Empty icon="🏛️" title={l({ uz: 'Klublar Supabase talab qiladi', tr: 'Kulüpler Supabase gerektirir' })} body={l({ uz: '002_social.sql migratsiyasini ishga tushiring.', tr: '002_social.sql geçişini çalıştırın.' })} />;
  if (mine === undefined || !profile) return <Skeleton className="h-60" />;

  async function doCreate() {
    if (form.name.trim().length < 2) return;
    setBusy(true);
    try { await createClub(form.name.trim(), form.emoji, form.description.trim(), form.isPublic); push({ kind: 'success', icon: form.emoji, title: l({ uz: 'Klub yaratildi!', tr: 'Kulüp oluşturuldu!' }) }); await load(); await refresh(); }
    catch (e) { push({ kind: 'error', title: t('error'), body: String((e as Error).message) }); }
    setBusy(false);
  }
  async function doJoin(c: string) {
    setBusy(true);
    try { const r = await joinClub(c); push({ kind: 'success', icon: '🏛️', title: l({ uz: `"${r.name}" klubiga qo‘shildingiz`, tr: `"${r.name}" kulübüne katıldınız` }) }); await load(); await refresh(); }
    catch (e) { push({ kind: 'error', title: t('error'), body: String((e as Error).message) }); }
    setBusy(false);
  }

  if (!mine) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={l({ uz: 'Klublar', tr: 'Kulüpler' })} sub={l({ uz: '50 kishigacha jamoa: umumiy haftalik XP, klub chati, klublar reytingi. Guruh, kurs yoki do‘stlar bilan.', tr: '50 kişiye kadar takım: ortak haftalık XP, kulüp sohbeti, kulüp sıralaması. Grup, kurs ya da arkadaşlarla.' })} />
        <Tip id="club-intro" text={{ uz: 'Klub — kichik jamoa (sinf, kurs, oila). Hamma a’zolarning haftalik XP yig‘indisi klublar reytingini belgilaydi. Yaratuvchi kodni ulashadi; yopiq klubga faqat kod bilan kirish mumkin.', tr: 'Kulüp — küçük takım (sınıf, kurs, aile). Tüm üyelerin haftalık XP toplamı kulüp sıralamasını belirler. Kurucu kodu paylaşır; kapalı kulübe yalnızca kodla girilir.' }} />
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button className={cn('card p-4 text-left', mode === 'create' && 'border-ember-400/50')} onClick={() => setMode('create')}><div className="text-2xl">✨</div><div className="font-display font-bold">{l({ uz: 'Klub yaratish', tr: 'Kulüp oluştur' })}</div><div className="text-xs text-ink-300">{l({ uz: 'Siz egasi bo‘lasiz, kod olasiz', tr: 'Sahibi siz olursunuz, kod alırsınız' })}</div></button>
          <button className={cn('card p-4 text-left', mode === 'join' && 'border-teal-400/50')} onClick={() => setMode('join')}><div className="text-2xl">🔑</div><div className="font-display font-bold">{l({ uz: 'Kod bilan kirish', tr: 'Kodla katıl' })}</div><div className="text-xs text-ink-300">{l({ uz: '6 belgili kod', tr: '6 karakterli kod' })}</div></button>
        </div>
        {mode === 'create' && (
          <div className="card mb-4 space-y-3 p-4">
            <div><label className="label">{l({ uz: 'Nomi', tr: 'Adı' })}</label><input className="input" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={l({ uz: 'masalan: 5-kurs Türkçe', tr: 'örnek: 5. sınıf Türkçe' })} /></div>
            <div><label className="label">{l({ uz: 'Belgi', tr: 'Simge' })}</label><div className="flex flex-wrap gap-2">{EMOJIS.map((e) => <button key={e} className={cn('h-10 w-10 rounded-xl text-xl', form.emoji === e ? 'bg-ember-500/30 ring-2 ring-ember-400' : 'bg-white/5')} onClick={() => setForm({ ...form, emoji: e })}>{e}</button>)}</div></div>
            <div><label className="label">{l({ uz: 'Tavsif', tr: 'Açıklama' })}</label><input className="input" maxLength={120} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={l({ uz: 'Kim uchun, maqsad…', tr: 'Kim için, amaç…' })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /> {l({ uz: 'Ochiq klub (reytingda ko‘rinadi, hamma qo‘shila oladi)', tr: 'Açık kulüp (sıralamada görünür, herkes katılabilir)' })}</label>
            <button className="btn-primary w-full" disabled={busy || form.name.trim().length < 2} onClick={doCreate}>{l({ uz: 'Yaratish', tr: 'Oluştur' })}</button>
          </div>
        )}
        {mode === 'join' && (
          <div className="card mb-4 flex gap-2 p-4"><input className="input uppercase tracking-widest" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC123" /><button className="btn-primary" disabled={busy || code.length < 6} onClick={() => doJoin(code)}>{l({ uz: 'Kirish', tr: 'Katıl' })}</button></div>
        )}
        <h2 className="mb-2 font-display text-lg font-bold">{l({ uz: 'Ochiq klublar', tr: 'Açık kulüpler' })}</h2>
        <div className="space-y-2">
          {board.filter((c) => c.is_public).map((c, i) => (
            <div key={c.id} className="card-soft flex items-center gap-3 p-3">
              <div className="w-6 text-center font-display font-bold text-ink-400">{i + 1}</div><div className="text-2xl">{c.emoji}</div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{c.name}</div><div className="text-xs text-ink-300">{c.members} {t('member')} · {c.weekly_xp} {t('week_xp')} · 🔥 {l({ uz: 'o‘rtacha', tr: 'ortalama' })} {c.streak_avg}</div></div>
              <button className="btn-secondary px-3 py-1.5 text-xs" disabled={busy || c.members >= 50} onClick={() => doJoin(c.code)}>{l({ uz: 'Qo‘shilish', tr: 'Katıl' })}</button>
            </div>
          ))}
          {!board.filter((c) => c.is_public).length && <div className="text-sm text-ink-400">{l({ uz: 'Hali ochiq klub yo‘q — birinchisini siz yarating!', tr: 'Henüz açık kulüp yok — ilkini siz oluşturun!' })}</div>}
        </div>
      </div>
    );
  }

  const { club, members, myRole } = mine;
  const weekly = members.reduce((a, m) => a + m.weekly_xp, 0);
  const rank = board.findIndex((c) => c.id === club.id) + 1;
  const memberMap: Record<string, UserLite> = Object.fromEntries(members.map((m) => [m.id, m]));
  const maxXp = Math.max(1, ...members.map((m) => m.weekly_xp));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`${club.emoji} ${club.name}`} sub={club.description ?? t('club')} right={<button className="btn-primary px-3 py-2 text-xs" onClick={() => setChat(true)}><MessageCircle size={14} /> {l({ uz: 'Chat', tr: 'Sohbet' })}</button>} />
      <div className="grid grid-cols-3 gap-2">
        <div className="card-soft p-3"><div className="text-xs text-ink-400">{l({ uz: 'Haftalik XP', tr: 'Haftalık XP' })}</div><div className="font-display text-2xl font-bold text-ember-400">{weekly}</div></div>
        <div className="card-soft p-3"><div className="text-xs text-ink-400">{t('rank')}</div><div className="font-display text-2xl font-bold">#{rank || '—'}</div></div>
        <div className="card-soft p-3"><div className="text-xs text-ink-400">{l({ uz: 'A’zolar', tr: 'Üyeler' })}</div><div className="font-display text-2xl font-bold">{members.length}/50</div></div>
      </div>
      <div className="card mt-3 flex items-center gap-3 p-3 text-sm">
        <span className="text-ink-300">{l({ uz: 'Kirish kodi', tr: 'Katılım kodu' })}:</span><b className="font-mono tracking-widest text-gold-300">{club.code}</b>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/club?code=${club.code}`); push({ kind: 'success', title: t('link_copied') }); }}><Copy size={14} /> {l({ uz: 'ulashish', tr: 'paylaş' })}</button>
        {myRole === 'owner' && <button className="btn-ghost ml-auto px-2 py-1 text-xs" onClick={async () => { await updateClub(club.id, { is_public: !club.is_public }); load(); }}>{club.is_public ? l({ uz: '🔓 ochiq', tr: '🔓 açık' }) : l({ uz: '🔒 yopiq', tr: '🔒 kapalı' })}</button>}
      </div>
      <Tip id="club-invite" text={{ uz: 'A’zo qo‘shish: kodni ulashing yoki Reyting / Do‘stlar bo‘limida foydalanuvchi profiliga kirib «Klubga taklif» tugmasini bosing — unga bildirishnoma boradi.', tr: 'Üye ekleme: kodu paylaşın ya da Sıralama / Arkadaşlar bölümünde kullanıcı profiline girip «Kulübe davet et» düğmesine basın — ona bildirim gider.' }} />
      <h2 className="mb-2 mt-5 font-display text-lg font-bold">{l({ uz: 'A’zolar — bu hafta', tr: 'Üyeler — bu hafta' })}</h2>
      <div className="card divide-y divide-white/[0.06]">
        {members.map((m, i) => (
          <div key={m.id} className={cn('flex items-center gap-3 p-3', m.id === profile.id && 'bg-ember-500/10')}>
            <div className="w-6 text-center font-display font-bold text-ink-400">{i + 1}</div>
            <div className="text-2xl">{m.avatar}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate font-semibold text-white"><Link href={m.id === profile.id ? '/profile' : `/u/${m.username}`} className="hover:underline">{m.display_name ?? m.username}</Link>{m.role === 'owner' && <Crown size={12} className="text-gold-400" />}{m.id === profile.id && <span className="text-xs font-normal text-ink-400">({t('you')})</span>}</div>
              <div className="text-xs text-ink-400">Lvl {m.level} · 🔥{m.streak} · {relativeDay(m.last_active_date ?? null, 'Asia/Tashkent', lang)}</div>
              <Bar value={(m.weekly_xp / maxXp) * 100} color="bg-teal-500" className="mt-1 h-1" />
            </div>
            <div className="font-display text-lg font-bold text-ember-400">{m.weekly_xp}</div>
            {myRole === 'owner' && m.id !== profile.id && <button className="btn-ghost px-2 py-1 text-ink-500" title={l({ uz: 'Chiqarish', tr: 'Çıkar' })} onClick={async () => { if (confirm(l({ uz: `${m.username} klubdan chiqarilsinmi?`, tr: `${m.username} kulüpten çıkarılsın mı?` }))) { await kickMember(club.id, m.id); load(); } }}><UserMinus size={14} /></button>}
          </div>
        ))}
      </div>
      <h2 className="mb-2 mt-5 font-display text-lg font-bold">{l({ uz: 'Klublar reytingi', tr: 'Kulüp sıralaması' })}</h2>
      <div className="card divide-y divide-white/[0.06]">
        {board.slice(0, 20).map((c, i) => (
          <div key={c.id} className={cn('flex items-center gap-3 p-3 text-sm', c.id === club.id && 'bg-teal-500/10')}>
            <div className="w-6 text-center font-display font-bold text-ink-400">{i + 1}</div><div className="text-xl">{c.emoji}</div>
            <div className="min-w-0 flex-1 truncate font-semibold text-white">{c.name} <span className="text-xs font-normal text-ink-400">· {c.members} {t('member')}</span></div>
            <div className="font-display font-bold text-ember-400">{c.weekly_xp}</div>
          </div>
        ))}
      </div>
      <button className="btn-ghost mt-4 w-full text-rose-300" onClick={async () => { if (confirm(l({ uz: 'Klubdan chiqasizmi?', tr: 'Kulüpten ayrılıyor musunuz?' }))) { await leaveClub(); await load(); } }}><LogOut size={14} /> {l({ uz: 'Klubdan chiqish', tr: 'Kulüpten ayrıl' })}</button>
      {chat && <ChatPanel clubId={club.id} title={`${club.emoji} ${club.name}`} onClose={() => setChat(false)} members={memberMap} />}
      <Link href="/friends" className="mt-3 block text-center text-xs text-ink-400">← {t('friends')}</Link>
    </div>
  );
}
