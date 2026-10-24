import Link from 'next/link';
import { MODES } from '@/lib/motivation';

const PILLARS = [
  { icon: '🌉', t: 'Ko‘prik effekti', d: 'O‘zbek va turk tillari qarindosh: 1 000+ so‘zni siz allaqachon bilasiz. Platforma shu ustunlikdan boshlaydi.' },
  { icon: '🧠', t: 'FSRS xotira algoritmi', d: 'Har bir so‘z aynan unutish arafasida qaytadi — Anki’dagi zamonaviy algoritm.' },
  { icon: '🎮', t: '13 ta o‘yin rejimi', d: 'Har kuni boshqa rejim: juftlash, jumla quruvchi, uyg‘unlik, duel, AI hikoya, gapirish…' },
  { icon: '🔥', t: 'Zerikish detektori', d: 'Faollik pasaysa — sessiya qisqaradi, yangi rejim taklif qiladi, qaytganingizda XP ×2.' },
  { icon: '🤖', t: 'Bepul AI o‘qituvchi', d: '5 ta bepul provayder zanjiri. Limit tugasa — kesh va navbat; hech narsa yo‘qolmaydi.' },
  { icon: '🎓', t: 'Milliy sertifikat', d: 'Multi-level formatida sinov imtihoni: tinglash, o‘qish, yozish, gapirish.' },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:pt-16">
      <nav className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="text-2xl">🌉</span> Köprü
        </div>
        <Link href="/login" className="btn-secondary">Kirish</Link>
      </nav>

      <section className="text-center">
        <span className="chip mb-4">Turk tili · Milliy sertifikat A1 → C1</span>
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Turkchani <span className="bg-gradient-to-r from-ember-400 to-rose-400 bg-clip-text text-transparent">o‘yin</span> orqali,
          <br className="hidden sm:block" /> zerikmasdan o‘rganing
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-ink-300 sm:text-lg">
          Tez boshlab, keyin shijoati so‘nib qoladiganlar uchun yaratilgan. Kuniga 5–10 daqiqa, har kuni boshqa rejim,
          sun’iy intellekt o‘qituvchi va to‘liq statistika.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn-primary px-6 py-4 text-base">Bepul boshlash</Link>
          <Link href="/login?demo=1" className="btn-secondary px-6 py-4 text-base">Avval ko‘rib chiqish</Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.t} className="card p-5">
            <div className="text-3xl">{p.icon}</div>
            <h3 className="mt-3 font-display text-lg font-bold">{p.t}</h3>
            <p className="mt-1 text-sm text-ink-300">{p.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="title text-center">O‘yin rejimlari</h2>
        <p className="subtitle mt-2 text-center">Miya yangilikni yaxshi ko‘radi — shuning uchun har kuni boshqa rejim.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {MODES.map((m) => (
            <span key={m.id} className="chip py-1.5 text-sm">
              {m.icon} {m.title}
            </span>
          ))}
        </div>
      </section>

      <section className="card mt-16 p-6 sm:p-10">
        <div className="grid gap-6 sm:grid-cols-3">
          <div><div className="font-display text-3xl font-bold text-ember-400">392+</div><div className="text-sm text-ink-300">so‘z va ibora, A1–A2 (admin paneldan cheksiz kengaytiriladi)</div></div>
          <div><div className="font-display text-3xl font-bold text-teal-400">13</div><div className="text-sm text-ink-300">grammatika mavzusi, 70+ drill</div></div>
          <div><div className="font-display text-3xl font-bold text-gold-400">0 so‘m</div><div className="text-sm text-ink-300">Vercel + Supabase + bepul AI — to‘liq bepul infratuzilma</div></div>
        </div>
      </section>

      <footer className="mt-16 text-center text-xs text-ink-400">© Valijon Ibroximov · Köprü — Turk tili akademiyasi</footer>
    </main>
  );
}
