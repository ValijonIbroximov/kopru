'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { updateProfile, isLocal, signOut } from '@/lib/data';
import { listTurkishVoices, speak } from '@/lib/speech';
import { supabaseBrowser } from '@/lib/supabase/client';
import { resetLocal } from '@/lib/local';
import { PageHeader, Skeleton } from '@/components/ui';
import { leagueIcon, leagueLabel, levelProgress, cn } from '@/lib/utils';
import type { Cefr } from '@/lib/types';
import { SCENES } from '@/components/visual/scenes';
import type { Ambient } from '@/components/visual/SceneBackground';
import { resetTips } from '@/components/Tip';
import { resetTours } from '@/components/Tour';

const AVATARS = ['🦉', '🦊', '🐺', '🦁', '🐯', '🐻', '🦅', '🐬', '🦋', '🌙', '⚡', '🌉'];
const LEVELS: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function ProfilePage() {
  const { profile, settings, refresh } = useProfile();
  const { push } = useToast();
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦉');
  const [goal, setGoal] = useState(10);
  const [level, setLevel] = useState<Cefr>('A1');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState('');
  const [fb, setFb] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [ambient, setAmbient] = useState<Ambient>('full');
  const [scene, setScene] = useState('auto');
  const [allowDm, setAllowDm] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? ''); setAvatar(profile.avatar); setGoal(profile.daily_goal_min); setLevel(profile.level_cefr);
    const ps = profile.settings as { voice?: string; ambient?: Ambient; scene?: string };
    setVoice(String(ps?.voice ?? '')); setAmbient(ps?.ambient ?? 'full'); setScene(ps?.scene ?? 'auto');
    setAllowDm((profile as unknown as { allow_dm?: boolean }).allow_dm ?? true);
    listTurkishVoices().then(setVoices);
  }, [profile]);

  if (!profile) return <Skeleton className="h-60" />;
  const lvl = levelProgress(profile.xp, profile.level);

  async function save() {
    setBusy(true);
    const patch: Record<string, unknown> = { display_name: name.trim() || null, avatar, daily_goal_min: goal, level_cefr: level, settings: { ...(profile!.settings ?? {}), voice, ambient, scene }, onboarded: true };
    if (!isLocal()) patch.allow_dm = allowDm;
    await updateProfile(patch as Partial<NonNullable<typeof profile>>);
    await refresh();
    setBusy(false);
    push({ kind: 'success', icon: '✅', title: 'Saqlandi' });
  }

  async function sendFeedback() {
    if (!fb.trim() || isLocal()) return;
    await supabaseBrowser().from('feedback').insert({ user_id: profile!.id, text: fb, rating, page: 'profile' });
    setFb(''); push({ kind: 'success', icon: '💌', title: 'Rahmat!', body: 'Fikringiz adminga yetib bordi.' });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Profil" sub={`@${profile.username} · ${profile.role === 'admin' ? 'admin' : 'o‘quvchi'}`} />
      <section className="card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-4xl">{profile.avatar}</div>
          <div className="text-sm">
            <div className="font-display text-xl font-bold">{profile.display_name ?? profile.username}</div>
            <div className="text-ink-300">Lvl {profile.level} · {profile.xp} XP · {leagueIcon(profile.league)} {leagueLabel(profile.league)}</div>
            <div className="text-ink-300">🔥 {profile.streak} (rekord {profile.best_streak}) · 🧊 {profile.streak_freezes} muzlatish</div>
            <div className="text-xs text-ink-400">Keyingi daraja: {lvl.next - profile.xp} XP</div>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div><label className="label">Ism</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">Avatar</label><div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setAvatar(a)} className={cn('h-11 w-11 rounded-xl text-2xl', avatar === a ? 'bg-ember-500/30 ring-2 ring-ember-400' : 'bg-white/5')}>{a}</button>)}</div></div>
        <div><label className="label">Kunlik maqsad (daqiqa)</label><div className="flex gap-2">{settings.goals.options.map((g) => <button key={g} onClick={() => setGoal(g)} className={cn('chip py-2 text-sm', goal === g && 'border-teal-400 bg-teal-500/20 text-white')}>{g}</button>)}</div><p className="mt-1 text-xs text-ink-400">Maslahat: 10 daqiqa — barqaror odat uchun eng yaxshi. Ko‘p emas, har kuni.</p></div>
        <div><label className="label">Maqsad daraja (sertifikat)</label><div className="flex gap-2">{LEVELS.map((l) => <button key={l} onClick={() => setLevel(l)} className={cn('chip py-2 text-sm', level === l && 'border-gold-400 bg-gold-400/20 text-white')}>{l}</button>)}</div><p className="mt-1 text-xs text-ink-400">AI hikoya, o‘qituvchi va imtihon shu darajaga moslashadi.</p></div>
        <div>
          <label className="label">Turkcha ovoz (TTS)</label>
          {voices.length ? (
            <div className="flex gap-2"><select className="input" value={voice} onChange={(e) => setVoice(e.target.value)}><option value="">Avtomatik</option>{voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}</select><button className="btn-secondary" onClick={() => speak('Merhaba! Köprü’ye hoş geldiniz.', { voiceName: voice || undefined })}>🔊</button></div>
          ) : <p className="text-sm text-ink-400">Brauzerda turkcha ovoz topilmadi. Chrome/Edge yoki tizimga "Türkçe" ovoz paketini o‘rnating.</p>}
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={busy}>Saqlash</button>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Ko‘rinish</h2>
        <div>
          <label className="label">Fon animatsiyasi</label>
          <div className="flex gap-2">{([['full', '✨ To‘liq', 'manzara + animatsiya + parallax'], ['lite', '🌙 Yengil', 'manzara, animatsiyasiz (kuchsiz telefon)'], ['off', '⬛ O‘chiq', 'oddiy qora fon']] as [Ambient, string, string][]).map(([v, l, d]) => <button key={v} onClick={() => setAmbient(v)} title={d} className={cn('chip py-2 text-sm', ambient === v && 'border-ember-400 bg-ember-500/20 text-white')}>{l}</button>)}</div>
        </div>
        <div>
          <label className="label">Manzara</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setScene('auto')} className={cn('chip py-2 text-sm', scene === 'auto' && 'border-teal-400 bg-teal-500/20 text-white')}>🎲 Har kirishda boshqa</button>
            {SCENES.map((s) => <button key={s.id} onClick={() => setScene(s.id)} className={cn('chip py-2 text-sm', scene === s.id && 'border-teal-400 bg-teal-500/20 text-white')} style={{ borderColor: scene === s.id ? s.accent : undefined }}>{s.name}</button>)}
          </div>
          <p className="mt-1 text-xs text-ink-400">Osmon rangi kun vaqtiga (tong/kun/oqshom/tun) moslashadi. Saqlashdan keyin kuchga kiradi.</p>
        </div>
        {!isLocal() && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowDm} onChange={(e) => setAllowDm(e.target.checked)} /> Do‘stlar menga shaxsiy xabar yoza oladi</label>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => { resetTips(); resetTours(); push({ kind: 'success', title: 'Maslahatlar qayta yoqildi' }); }}>💡 Maslahat va sayohatni qayta ko‘rsatish</button>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => router.push('/dashboard?tour=1')}>🧭 Bosh sahifa sayohati</button>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => router.push('/onboarding')}>🚀 Boshlang‘ich sozlash</button>
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={busy}>Saqlash</button>
      </section>

      {!isLocal() && (
        <section className="card space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Fikr-mulohaza</h2>
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map((r) => <button key={r} onClick={() => setRating(r)} className={cn('text-2xl', r <= rating ? 'text-gold-400' : 'text-ink-600')}>★</button>)}</div>
          <textarea className="input" rows={3} value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Nima yoqdi? Nima zeriktirdi? Qaysi rejim kerak?" />
          <button className="btn-secondary" onClick={sendFeedback} disabled={!fb.trim()}>Yuborish</button>
        </section>
      )}

      <section className="card p-5">
        {isLocal() ? (
          <button className="btn-secondary w-full" onClick={() => { if (confirm('Demo progress o‘chirilsinmi?')) { resetLocal(); location.reload(); } }}>Demo progressni tozalash</button>
        ) : (
          <button className="btn-secondary w-full" onClick={async () => { await signOut(); router.replace('/login'); router.refresh(); }}>Chiqish</button>
        )}
      </section>
    </div>
  );
}
