'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/components/AppShell';
import { updateProfile } from '@/lib/data';
import type { Cefr } from '@/lib/types';
import { cn } from '@/lib/utils';
import { speak, ttsAvailable } from '@/lib/speech';

const AVATARS = ['🦉', '🦊', '🐺', '🦁', '🐯', '🐻', '🦅', '🐬', '🦋', '🌙', '⚡', '🌉'];
const LEVELS: { id: Cefr; t: string; d: string }[] = [
  { id: 'A1', t: 'A1 — noldan', d: 'Turkchani bilmayman yoki juda kam bilaman' },
  { id: 'A2', t: 'A2 — boshlang‘ich', d: 'Oddiy gaplarni tushunaman, salomlashaman' },
  { id: 'B1', t: 'B1 — o‘rta', d: 'Kundalik mavzularda gaplasha olaman' },
  { id: 'B2', t: 'B2 — sertifikat maqsadi', d: 'Universitet/magistratura uchun kerak' },
  { id: 'C1', t: 'C1 — ilg‘or', d: 'Erkin gapiraman, akademik til kerak' },
];
const WHY = [
  { id: 'cert', t: '🎓 Milliy sertifikat', d: 'Imtihon formati va mashqlar' },
  { id: 'travel', t: '✈️ Sayohat', d: 'Dialoglar, bozor, yo‘l so‘rash' },
  { id: 'work', t: '💼 Ish / xizmat', d: 'Kasblar, aloqa, texnika lug‘ati' },
  { id: 'fun', t: '🎬 Qiziqish', d: 'Seriallar, musiqa, madaniyat' },
];

export default function Onboarding() {
  const { profile, settings, refresh } = useProfile();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Cefr>('A1');
  const [why, setWhy] = useState<string[]>(['cert']);
  const [goal, setGoal] = useState(10);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '🦉');
  const [busy, setBusy] = useState(false);
  const total = 5;

  async function finish() {
    setBusy(true);
    await updateProfile({ display_name: name.trim() || profile?.display_name || null, avatar, daily_goal_min: goal, level_cefr: level, onboarded: true, settings: { ...(profile?.settings ?? {}), why, ambient: 'full' } });
    await refresh();
    router.replace('/dashboard?tour=1');
  }

  const Dots = () => <div className="mb-6 flex gap-1.5">{Array.from({ length: total }).map((_, i) => <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', i <= step ? 'bg-ember-500' : 'bg-white/10')} />)}</div>;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center">
      <div className="card glass animate-pop p-6">
        <Dots />
        {step === 0 && (
          <div className="text-center">
            <div className="text-6xl animate-float">🌉</div>
            <h1 className="title mt-4">Köprü’ga xush kelibsiz!</h1>
            <p className="subtitle mt-2">O‘zbek va turk tillari — bir oilaning farzandlari. Siz allaqachon yuzlab turkcha so‘zni bilasiz; biz shu ko‘prikdan boshlaymiz.</p>
            <div className="mt-5 grid gap-2 text-left text-sm">
              {[['🧠', 'Xotira algoritmi so‘zni aynan unutish arafasida qaytaradi'], ['🎮', '21 ta o‘yin rejimi — har kuni boshqasi, zerikmaysiz'], ['🤝', 'Do‘stlar, klublar, chaqiriqlar — birga tezroq'], ['⏱️', 'Kuniga 5–10 daqiqa yetadi. Ko‘p emas, har kuni.']].map(([i, t]) => <div key={t} className="card-soft flex items-center gap-3 p-3"><span className="text-2xl">{i}</span><span className="text-ink-100">{t}</span></div>)}
            </div>
            {ttsAvailable() && <button className="btn-secondary mt-4" onClick={() => speak('Merhaba! Köprü’ye hoş geldiniz.')}>🔊 Merhaba! Köprü’ye hoş geldiniz.</button>}
          </div>
        )}
        {step === 1 && (
          <div>
            <h2 className="title">Hozirgi darajangiz?</h2>
            <p className="subtitle mt-1">AI hikoya, o‘qituvchi va imtihon shu darajaga moslashadi. Keyin profilda o‘zgartirish mumkin.</p>
            <div className="mt-4 grid gap-2">{LEVELS.map((l) => <button key={l.id} onClick={() => setLevel(l.id)} className={cn('option text-left', level === l.id && 'border-ember-400 bg-ember-500/20')}><div className="font-semibold">{l.t}</div><div className="text-xs font-normal text-ink-300">{l.d}</div></button>)}</div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="title">Nima uchun o‘rganyapsiz?</h2>
            <p className="subtitle mt-1">Bir nechtasini tanlash mumkin — tavsiyalar shunga moslashadi.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">{WHY.map((w) => <button key={w.id} onClick={() => setWhy((s) => (s.includes(w.id) ? s.filter((x) => x !== w.id) : [...s, w.id]))} className={cn('option text-left', why.includes(w.id) && 'border-teal-400 bg-teal-500/20')}><div className="font-semibold">{w.t}</div><div className="text-xs font-normal text-ink-300">{w.d}</div></button>)}</div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="title">Kunlik maqsad</h2>
            <p className="subtitle mt-1">Barqaror odat uchun 10 daqiqa — eng yaxshi tanlov. Ko‘proq xohlasangiz — keyin oshirasiz.</p>
            <div className="mt-4 grid grid-cols-5 gap-2">{settings.goals.options.map((g) => <button key={g} onClick={() => setGoal(g)} className={cn('option py-4 text-center', goal === g && 'border-gold-400 bg-gold-400/20')}><div className="font-display text-xl font-bold">{g}</div><div className="text-[10px] text-ink-300">daq</div></button>)}</div>
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-sm text-ink-200">{goal <= 5 ? '😌 Yengil: 1 takrorlash sessiyasi. Streak saqlanadi.' : goal <= 10 ? '🎯 Tavsiya: takrorlash + 1 o‘yin yoki 1 dars.' : goal <= 20 ? '💪 Jiddiy: dars + takrorlash + o‘yin. 3 oyda A2.' : '🔥 Intensiv: imtihonga tayyorgarlik rejimi.'}</div>
          </div>
        )}
        {step === 4 && (
          <div>
            <h2 className="title">Sizni qanday chaqiramiz?</h2>
            <div className="mt-4"><label className="label">Ism</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={profile?.username ?? 'ism'} /></div>
            <div className="mt-3"><label className="label">Avatar</label><div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setAvatar(a)} className={cn('h-11 w-11 rounded-xl text-2xl', avatar === a ? 'bg-ember-500/30 ring-2 ring-ember-400' : 'bg-white/5')}>{a}</button>)}</div></div>
            <div className="mt-4 rounded-2xl bg-teal-500/10 p-3 text-sm text-teal-100">Tayyor! Birinchi dars 8 daqiqa: salomlashuv va siz allaqachon bilgan so‘zlar. Keyin qisqa sayohat bosh sahifani ko‘rsatadi.</div>
          </div>
        )}
        <div className="mt-6 flex gap-2">
          {step > 0 && <button className="btn-secondary" onClick={() => setStep(step - 1)}>←</button>}
          {step < total - 1 ? <button className="btn-primary flex-1" onClick={() => setStep(step + 1)}>Davom →</button> : <button className="btn-primary flex-1 py-4 text-base" disabled={busy} onClick={finish}>{busy ? '…' : '🚀 Boshlaymiz!'}</button>}
        </div>
        {step === 0 && <button className="mt-2 w-full text-xs text-ink-400 hover:text-white" onClick={finish}>O‘tkazib yuborish</button>}
      </div>
    </div>
  );
}
