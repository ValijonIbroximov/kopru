'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MODES } from '@/lib/motivation';
import SceneBackground, { SCENES } from '@/components/visual/SceneBackground';
import Reveal, { CountUp, ScrollProgress } from '@/components/visual/Reveal';
import { cn } from '@/lib/utils';

const PILLARS = [
  { icon: '🌉', t: 'Ko‘prik effekti', d: 'O‘zbek va turk tillari qarindosh: ko‘z→göz, qush→kuş, tog‘→dağ. Yuzlab so‘zni siz allaqachon bilasiz — biz shu ustunlikdan boshlaymiz.' },
  { icon: '🧠', t: 'FSRS xotira algoritmi', d: 'Har so‘z aynan unutish arafasida qaytadi. Anki’dagi zamonaviy algoritm — 30% kamroq vaqt, bir xil natija.' },
  { icon: '🎮', t: '21 ta o‘yin rejimi', d: 'Blitz, so‘z yomg‘iri, minora, bingo, xotira kartalari, harf terish, rol o‘yini, duel… Har kuni boshqasi.' },
  { icon: '🤝', t: 'Do‘stlar va klublar', d: 'Chaqiriq (asinxron duel), chat, faollik lentasi, klublar reytingi, kunlik chaqiriq. Raqobat — motivatsiya.' },
  { icon: '📉', t: 'Zerikish detektori', d: 'Faollik pasaysa — sessiya qisqaradi, yangi rejim taklif qilinadi, qaytganingizda XP ×2.' },
  { icon: '🤖', t: 'Bepul AI o‘qituvchi', d: '5 ta bepul provayder zanjiri: hikoya, suhbat, yozma baholash. Limit tugasa — kesh va navbat; hech narsa yo‘qolmaydi.' },
];

const STEPS = [
  { n: '01', t: '5 daqiqalik takrorlash', d: 'Algoritm bugun eslamasangiz unutiladigan so‘zlarni beradi. Tez va aniq.' },
  { n: '02', t: 'Yangi dars — 8 daqiqa', d: 'Tanishtirish → tanib olish → tinglash → yozish → jumla. 8 so‘z, 1 qoida, 1 dialog.' },
  { n: '03', t: 'Bitta o‘yin', d: 'Kun o‘yini yoki do‘st chaqirig‘i. Combo, rekord, konfetti — miya mukofot kutadi.' },
  { n: '04', t: 'Statistika va sertifikat', d: 'So‘z boyligi bosqichlari, 4 ko‘nikma aniqligi, Multi-level sinov imtihoni.' },
];

export default function Landing() {
  const [scene, setScene] = useState(0);
  useEffect(() => { const iv = setInterval(() => setScene((s) => (s + 1) % SCENES.length), 9000); return () => clearInterval(iv); }, []);

  return (
    <main className="relative">
      <ScrollProgress />
      <SceneBackground sceneId={SCENES[scene].id} dim={0.45} />
      <nav className="sticky top-0 z-30 mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2 font-display text-lg font-bold"><span className="text-2xl">🌉</span> Köprü</div>
        <div className="flex gap-2"><Link href="/login?demo=1" className="btn-ghost glass hidden sm:inline-flex">Demo</Link><Link href="/login" className="btn-primary">Kirish</Link></div>
      </nav>

      {/* HERO */}
      <section className="mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-5 text-center">
        <Reveal variant="fade"><span className="chip glass mb-5 py-1.5 text-sm">🇺🇿 → 🇹🇷 · Turk tili · Milliy sertifikat A1 → C1</span></Reveal>
        <Reveal delay={80}><h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">Turkchani <span className="aurora-text">o‘yin</span> orqali,<br className="hidden sm:block" /> zerikmasdan o‘rganing</h1></Reveal>
        <Reveal delay={160}><p className="mx-auto mt-6 max-w-2xl text-base text-ink-200 sm:text-lg">Tez boshlab, keyin shijoati so‘nib qoladiganlar uchun yaratilgan. Kuniga 5–10 daqiqa, har kuni boshqa o‘yin, do‘stlar bilan raqobat, sun’iy intellekt o‘qituvchi — va to‘liq statistika.</p></Reveal>
        <Reveal delay={240}><div className="mt-8 flex flex-wrap items-center justify-center gap-3"><Link href="/login" className="btn-primary px-7 py-4 text-base">Bepul boshlash</Link><Link href="/login?demo=1" className="btn-secondary glass px-7 py-4 text-base">Avval ko‘rib chiqish</Link></div></Reveal>
        <Reveal delay={320}><div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-ink-300"><span><b className="font-display text-xl text-white"><CountUp value={392} />+</b> so‘z</span><span><b className="font-display text-xl text-white"><CountUp value={21} /></b> o‘yin</span><span><b className="font-display text-xl text-white"><CountUp value={13} /></b> grammatika mavzusi</span><span><b className="font-display text-xl text-white">0</b> so‘m</span></div></Reveal>
        <div className="mt-14 flex items-center gap-1 text-xs text-ink-400">{SCENES.map((s, i) => <button key={s.id} onClick={() => setScene(i)} className={cn('h-1.5 rounded-full transition-all', i === scene ? 'w-6 bg-white' : 'w-1.5 bg-white/30')} title={s.name} />)}<span className="ml-2">{SCENES[scene].name}</span></div>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden border-y border-white/[0.06] py-4">
        <div className="marquee gap-3">
          {[...MODES, ...MODES].map((m, i) => <span key={m.id + i} className="chip glass shrink-0 py-2 text-sm">{m.icon} {m.title}</span>)}
        </div>
      </section>

      {/* PILLARS */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal><h2 className="title text-center text-3xl sm:text-4xl">Nega bu ishlaydi</h2></Reveal>
        <Reveal delay={80}><p className="subtitle mx-auto mt-2 max-w-xl text-center">Pedagogika + o‘yin dizayni + ijtimoiy raqobat. Hammasi bir joyda, hammasi bepul.</p></Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.t} delay={i * 70} variant={i % 2 ? 'right' : 'left'}>
              <div className="card glass tilt h-full p-6"><div className="text-4xl">{p.icon}</div><h3 className="mt-3 font-display text-lg font-bold">{p.t}</h3><p className="mt-1 text-sm text-ink-300">{p.d}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* STEPS — sticky scroll storytelling */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Reveal><h2 className="title text-3xl sm:text-4xl">Bir kun — <span className="aurora-text">15 daqiqa</span></h2></Reveal>
            <Reveal delay={80}><p className="subtitle mt-3">Ko‘p emas, har kuni. Streak, kunlik maqsad halqasi va do‘stlar sizni qaytaradi. Zerikish detektori sessiyani qisqartiradi — tashlab ketish o‘rniga davom etasiz.</p></Reveal>
            <Reveal delay={160}><div className="card glass mt-6 p-5"><div className="text-xs uppercase tracking-wider text-ink-400">Haftalik natija (A1, 10 daq/kun)</div><div className="mt-2 grid grid-cols-3 gap-3 text-center"><div><div className="font-display text-2xl font-bold text-ember-400"><CountUp value={56} /></div><div className="text-xs text-ink-400">yangi so‘z</div></div><div><div className="font-display text-2xl font-bold text-teal-400"><CountUp value={7} /></div><div className="text-xs text-ink-400">dars</div></div><div><div className="font-display text-2xl font-bold text-gold-400"><CountUp value={3} /></div><div className="text-xs text-ink-400">qoida</div></div></div></div></Reveal>
          </div>
          <ol className="space-y-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} as="li" delay={i * 60} variant="up">
                <div className="card glass tilt flex gap-4 p-5"><div className="font-display text-3xl font-extrabold text-white/15">{s.n}</div><div><h3 className="font-display text-lg font-bold">{s.t}</h3><p className="mt-1 text-sm text-ink-300">{s.d}</p></div></div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* SOCIAL */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal><h2 className="title text-center text-3xl sm:text-4xl">Yolg‘iz emas</h2></Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['⚔️', 'Chaqiriq', 'Do‘stingizga 20 savol yuboring — u o‘z vaqtida o‘ynaydi. G‘olib 40 XP.'], ['🏛️', 'Klublar', '50 kishilik jamoa, umumiy XP, klub chati, klublar reytingi.'], ['📅', 'Kunlik chaqiriq', 'Hamma uchun bir xil Blitz. Bugungi reytingda kim birinchi?'], ['💬', 'Lenta va chat', 'Do‘stlar yutuqlariga 👏🔥, turkcha yozishmalar — amaliyot.']].map(([i, t, d], k) => (
            <Reveal key={t} delay={k * 70} variant="scale"><div className="card glass tilt h-full p-5 text-center"><div className="text-4xl">{i}</div><h3 className="mt-2 font-display text-lg font-bold">{t}</h3><p className="mt-1 text-sm text-ink-300">{d}</p></div></Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-5 pb-24 pt-10 text-center">
        <Reveal variant="scale">
          <div className="card glass relative overflow-hidden p-10">
            <div className="rays absolute -inset-20 opacity-40" />
            <div className="relative">
              <div className="text-5xl animate-float">🌉</div>
              <h2 className="title mt-4 text-3xl">Bugun birinchi 8 daqiqa</h2>
              <p className="subtitle mt-2">Birinchi darsdan keyin turkcha salomlashib, o‘zingizni tanishtira olasiz. Merhaba!</p>
              <Link href="/login" className="btn-primary mt-6 px-8 py-4 text-base">Boshlash — bepul</Link>
            </div>
          </div>
        </Reveal>
      </section>
      <footer className="pb-10 text-center text-xs text-ink-400">© Valijon Ibroximov · Köprü — Turk tili akademiyasi</footer>
    </main>
  );
}
