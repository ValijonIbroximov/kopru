'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { ThemePicker, AmbientPicker } from '@/components/ThemePicker';
import { VoicePicker } from '@/components/VoicePicker';
import { updateProfile, isLocal, signOut } from '@/lib/data';
import { getVoicePref, type VoicePref } from '@/lib/speech';
import { supabaseBrowser } from '@/lib/supabase/client';
import { resetLocal } from '@/lib/local';
import { PageHeader, Skeleton } from '@/components/ui';
import { leagueIcon, leagueLabel, levelProgress, cn } from '@/lib/utils';
import type { Cefr } from '@/lib/types';
import { currentThemeId, applyTheme, applyAmbient, type Ambient } from '@/lib/themes';
import { LANGS, useLang, type Lang } from '@/lib/i18n';
import { resetTips } from '@/components/Tip';
import { resetTours } from '@/components/Tour';

const AVATARS = ['🦉', '🦊', '🐺', '🦁', '🐯', '🐻', '🦅', '🐬', '🦋', '🌙', '⚡', '🌉'];
const LEVELS: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function ProfilePage() {
  const { profile, settings, refresh } = useProfile();
  const { push } = useToast();
  const { l, t, lang, setLang } = useLang();
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦉');
  const [goal, setGoal] = useState(10);
  const [level, setLevel] = useState<Cefr>('A1');
  const [voice, setVoice] = useState<VoicePref>('emel');
  const [fb, setFb] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [ambient, setAmbient] = useState<Ambient>('full');
  const [theme, setTheme] = useState(currentThemeId());
  const [allowDm, setAllowDm] = useState(true);
  const [dirtyLook, setDirtyLook] = useState(false);

  // Formani profil yuklanganda BIR MARTA to'ldiramiz (keyingi profil yangilanishlari — til almashishi va h.k. — saqlanmagan tanlovlarni o'chirmasin)
  const initedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || initedFor.current === profile.id) return;
    initedFor.current = profile.id;
    setName(profile.display_name ?? ''); setAvatar(profile.avatar); setGoal(profile.daily_goal_min); setLevel(profile.level_cefr);
    const ps = profile.settings as { voice?: VoicePref; ambient?: Ambient; theme?: string };
    setVoice(ps?.voice ?? getVoicePref()); setAmbient(ps?.ambient ?? 'full'); setTheme(ps?.theme ?? currentThemeId());
    setAllowDm((profile as unknown as { allow_dm?: boolean }).allow_dm ?? true);
  }, [profile]);

  if (!profile) return <Skeleton className="h-60" />;
  const lvl = levelProgress(profile.xp, profile.level);

  async function save() {
    setBusy(true);
    const patch: Record<string, unknown> = { display_name: name.trim() || null, avatar, daily_goal_min: goal, level_cefr: level, settings: { ...(profile!.settings ?? {}), voice, ambient, theme, lang }, onboarded: true };
    if (!isLocal()) patch.allow_dm = allowDm;
    await updateProfile(patch as Partial<NonNullable<typeof profile>>);
    await refresh();
    setBusy(false); setDirtyLook(false);
    push({ kind: 'success', icon: '✅', title: t('saved') });
  }

  function cancelLook() {
    const ps = profile!.settings as { ambient?: Ambient; theme?: string };
    const th = ps?.theme ?? currentThemeId(); const am = ps?.ambient ?? 'full';
    applyTheme(th); applyAmbient(am); setTheme(th); setAmbient(am); setDirtyLook(false);
  }

  async function sendFeedback() {
    if (!fb.trim() || isLocal()) return;
    await supabaseBrowser().from('feedback').insert({ user_id: profile!.id, text: fb, rating, page: 'profile' });
    setFb(''); push({ kind: 'success', icon: '💌', title: l({ uz: 'Rahmat!', tr: 'Teşekkürler!' }), body: l({ uz: 'Fikringiz adminga yetib bordi.', tr: 'Görüşünüz yöneticiye ulaştı.' }) });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={t('profile')} sub={`@${profile.username} · ${profile.role === 'admin' ? 'admin' : l({ uz: 'o‘quvchi', tr: 'öğrenci' })}`} />
      <section className="card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-4xl">{profile.avatar}</div>
          <div className="text-sm">
            <div className="font-display text-xl font-bold">{profile.display_name ?? profile.username}</div>
            <div className="text-ink-300">Lvl {profile.level} · {profile.xp} XP · {leagueIcon(profile.league)} {leagueLabel(profile.league)}</div>
            <div className="text-ink-300">🔥 {profile.streak} ({t('record').toLowerCase()} {profile.best_streak}) · 🧊 {profile.streak_freezes} {l({ uz: 'muzlatish', tr: 'dondurma' })}</div>
            <div className="text-xs text-ink-400">{l({ uz: 'Keyingi daraja', tr: 'Sonraki seviye' })}: {lvl.next - profile.xp} XP</div>
          </div>
        </div>
      </section>

      {/* Ko'rinish: dizayn + fon + til */}
      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">🎨 {l({ uz: 'Ko‘rinish', tr: 'Görünüm' })}</h2>{dirtyLook && <button className="text-xs text-ink-400 hover:text-white" onClick={cancelLook}>{t('cancel')}</button>}</div>
        <div>
          <label className="label">{t('theme')}</label>
          <ThemePicker value={theme} onChange={(id) => { setTheme(id); setDirtyLook(true); }} />
          <p className="mt-1 text-xs text-ink-400">{l({ uz: 'Bosilganda darhol qo‘llanadi. Boshqa qurilmalarda ham shu dizayn bo‘lishi uchun «Saqlash»ni bosing.', tr: 'Basınca anında uygulanır. Diğer cihazlarda da aynı tasarım için «Kaydet»e basın.' })}</p>
        </div>
        <div>
          <label className="label">{l({ uz: 'Orqa fon jonliligi', tr: 'Arka plan canlılığı' })}</label>
          <AmbientPicker value={ambient} onChange={(a) => { setAmbient(a); setDirtyLook(true); }} />
        </div>
        <div>
          <label className="label">{t('language')}</label>
          <div className="flex gap-2">{LANGS.map((x) => <button key={x.id} onClick={() => setLang(x.id as Lang)} className={cn('chip py-2 text-sm', lang === x.id && 'border-accent bg-accent/15 text-white')}>{x.flag} {x.label}</button>)}</div>
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={busy}>{t('save')}</button>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">👤 {l({ uz: 'Shaxsiy', tr: 'Kişisel' })}</h2>
        <div><label className="label">{l({ uz: 'Ism', tr: 'İsim' })}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">Avatar</label><div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setAvatar(a)} className={cn('h-11 w-11 rounded-xl text-2xl', avatar === a ? 'bg-accent/30 ring-2 ring-accent' : 'bg-white/5')}>{a}</button>)}</div></div>
        <div><label className="label">{l({ uz: 'Kunlik maqsad (daqiqa)', tr: 'Günlük hedef (dakika)' })}</label><div className="flex gap-2">{settings.goals.options.map((g) => <button key={g} onClick={() => setGoal(g)} className={cn('chip py-2 text-sm', goal === g && 'border-teal-400 bg-teal-500/20 text-white')}>{g}</button>)}</div><p className="mt-1 text-xs text-ink-400">{l({ uz: 'Maslahat: 10 daqiqa — barqaror odat uchun eng yaxshi. Ko‘p emas, har kuni.', tr: 'Öneri: 10 dakika — kalıcı alışkanlık için en iyisi. Çok değil, her gün.' })}</p></div>
        <div><label className="label">{l({ uz: 'Hozirgi daraja', tr: 'Şu anki seviye' })}</label><div className="flex gap-2">{LEVELS.map((lv) => <button key={lv} onClick={() => setLevel(lv)} className={cn('chip py-2 text-sm', level === lv && 'border-gold-400 bg-gold-400/20 text-white')}>{lv}</button>)}</div><p className="mt-1 text-xs text-ink-400">{l({ uz: 'AI hikoya, o‘qituvchi va imtihon shu darajaga moslashadi. Maqsad daraja va imtihon sanasi — ', tr: 'AI hikâye, öğretmen ve sınav bu seviyeye uyarlanır. Hedef seviye ve sınav tarihi — ' })}<Link href="/plan" className="text-teal-300">{l({ uz: 'Reja bo‘limida', tr: 'Plan bölümünde' })} →</Link></p></div>
        <div>
          <label className="label">🔊 {l({ uz: 'Turkcha ovoz (TTS)', tr: 'Türkçe ses (TTS)' })}</label>
          <VoicePicker value={voice} onChange={setVoice} />
          <p className="mt-1 text-xs text-ink-400">{l({ uz: 'Neyron ovozlar server orqali tayyorlanadi va keshlanadi; internet bo‘lmasa brauzer ovozi ishlaydi.', tr: 'Nöral sesler sunucu üzerinden hazırlanır ve önbelleğe alınır; internet yoksa tarayıcı sesi çalışır.' })}</p>
        </div>
        {!isLocal() && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowDm} onChange={(e) => setAllowDm(e.target.checked)} /> {l({ uz: 'Do‘stlar menga shaxsiy xabar yoza oladi', tr: 'Arkadaşlar bana özel mesaj yazabilir' })}</label>}
        <button className="btn-primary w-full" onClick={save} disabled={busy}>{t('save')}</button>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-bold">🧭 {l({ uz: 'Yordam', tr: 'Yardım' })}</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => { resetTips(); resetTours(); push({ kind: 'success', title: l({ uz: 'Maslahatlar qayta yoqildi', tr: 'İpuçları yeniden açıldı' }) }); }}>💡 {l({ uz: 'Maslahat va sayohatni qayta ko‘rsatish', tr: 'İpuçlarını ve turu yeniden göster' })}</button>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => router.push('/dashboard?tour=1')}>🧭 {l({ uz: 'Bosh sahifa sayohati', tr: 'Ana sayfa turu' })}</button>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => router.push('/onboarding')}>🚀 {l({ uz: 'Boshlang‘ich sozlash', tr: 'Başlangıç kurulumu' })}</button>
        </div>
      </section>

      {!isLocal() && (
        <section className="card space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">{l({ uz: 'Fikr-mulohaza', tr: 'Geri bildirim' })}</h2>
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map((r) => <button key={r} onClick={() => setRating(r)} className={cn('text-2xl', r <= rating ? 'text-gold-400' : 'text-ink-600')}>★</button>)}</div>
          <textarea className="input" rows={3} value={fb} onChange={(e) => setFb(e.target.value)} placeholder={l({ uz: 'Nima yoqdi? Nima zeriktirdi? Qaysi rejim kerak?', tr: 'Ne hoşunuza gitti? Ne sıkıcıydı? Hangi mod gerekli?' })} />
          <button className="btn-secondary" onClick={sendFeedback} disabled={!fb.trim()}>{t('send')}</button>
        </section>
      )}

      <section className="card p-5">
        {isLocal() ? (
          <button className="btn-secondary w-full" onClick={() => { if (confirm(l({ uz: 'Demo progress o‘chirilsinmi?', tr: 'Demo ilerleme silinsin mi?' }))) { resetLocal(); location.reload(); } }}>{l({ uz: 'Demo progressni tozalash', tr: 'Demo ilerlemeyi temizle' })}</button>
        ) : (
          <button className="btn-secondary w-full" onClick={async () => { await signOut(); router.replace('/login'); router.refresh(); }}>{t('logout')}</button>
        )}
      </section>
    </div>
  );
}
