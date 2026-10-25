'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MODES } from '@/lib/motivation';
import ThemeBackground from '@/components/visual/ThemeBackground';
import Reveal, { CountUp, ScrollProgress } from '@/components/visual/Reveal';
import { LangProvider, LangSwitch, useLang } from '@/lib/i18n';
import { THEMES, applyTheme, DEFAULT_THEME } from '@/lib/themes';
import { Logo, BRAND, AUTHOR } from '@/components/AppShell';
import { cn } from '@/lib/utils';

const PILLARS = [
  { icon: '⚡', t: { uz: 'Tez boshlang — bilganingizdan', tr: 'Hızlı başlayın — bildiğinizden' }, d: { uz: 'O‘zbek va turk tillari qarindosh: ko‘z→göz, qush→kuş, tog‘→dağ. Yuzlab so‘zni siz allaqachon bilasiz — biz shu ustunlikdan boshlaymiz.', tr: 'Özbekçe ve Türkçe akraba diller: ko‘z→göz, qush→kuş, tog‘→dağ. Yüzlerce kelimeyi zaten biliyorsunuz — bu avantajla başlıyoruz.' } },
  { icon: '🧠', t: { uz: 'FSRS xotira algoritmi', tr: 'FSRS hafıza algoritması' }, d: { uz: 'Har so‘z aynan unutish arafasida qaytadi. Anki’dagi zamonaviy algoritm — 30% kamroq vaqt, bir xil natija.', tr: 'Her kelime tam unutulmak üzereyken geri gelir. Anki’deki modern algoritma — %30 daha az süre, aynı sonuç.' } },
  { icon: '🗺️', t: { uz: 'Moslashuvchan reja', tr: 'Uyarlanabilir plan' }, d: { uz: 'Imtihon sanasi va maqsad darajani kiriting — TezBil kuniga nechta so‘z, qaysi o‘yin, qachon sinov imtihoni kerakligini hisoblab, har kun qayta moslaydi.', tr: 'Sınav tarihini ve hedef seviyeyi girin — TezBil günde kaç kelime, hangi oyun, ne zaman deneme sınavı gerektiğini hesaplar ve her gün yeniden uyarlar.' } },
  { icon: '🎮', t: { uz: '21 ta o‘yin rejimi', tr: '21 oyun modu' }, d: { uz: 'Blitz, so‘z yomg‘iri, minora, bingo, xotira kartalari, harf terish, rol o‘yini, duel… Har kuni boshqasi.', tr: 'Blitz, kelime yağmuru, kule, bingo, hafıza kartları, harf dizme, rol oyunu, düello… Her gün farklı biri.' } },
  { icon: '🤝', t: { uz: 'Do‘stlar va klublar', tr: 'Arkadaşlar ve kulüpler' }, d: { uz: 'Chaqiriq (asinxron duel), chat, faollik lentasi, klublar reytingi, kunlik chaqiriq. Raqobat — motivatsiya.', tr: 'Meydan okuma (asenkron düello), sohbet, etkinlik akışı, kulüp sıralaması, günlük meydan okuma. Rekabet — motivasyon.' } },
  { icon: '🔊', t: { uz: 'Tabiiy turkcha nutq', tr: 'Doğal Türkçe konuşma' }, d: { uz: 'Neyron ovozlar (Emel, Ahmet) — har so‘z va jumla haqiqiy turk talaffuzida. Sekin rejim, tinglab yozish, gapirish mashqlari.', tr: 'Nöral sesler (Emel, Ahmet) — her kelime ve cümle gerçek Türkçe telaffuzla. Yavaş mod, dinleyip yazma, konuşma alıştırmaları.' } },
];

const STEPS = [
  { n: '01', t: { uz: '5 daqiqalik takrorlash', tr: '5 dakikalık tekrar' }, d: { uz: 'Algoritm bugun eslamasangiz unutiladigan so‘zlarni beradi. Tez va aniq.', tr: 'Algoritma bugün hatırlamazsanız unutulacak kelimeleri verir. Hızlı ve kesin.' } },
  { n: '02', t: { uz: 'Yangi dars — 8 daqiqa', tr: 'Yeni ders — 8 dakika' }, d: { uz: 'Tanishtirish → tanib olish → tinglash → yozish → jumla. 8 so‘z, 1 qoida, 1 dialog.', tr: 'Tanıtım → tanıma → dinleme → yazma → cümle. 8 kelime, 1 kural, 1 diyalog.' } },
  { n: '03', t: { uz: 'Bitta o‘yin', tr: 'Bir oyun' }, d: { uz: 'Kun o‘yini yoki do‘st chaqirig‘i. Combo, rekord, konfetti — miya mukofot kutadi.', tr: 'Günün oyunu ya da arkadaş meydan okuması. Kombo, rekor, konfeti — beyin ödül bekler.' } },
  { n: '04', t: { uz: 'Statistika va sertifikat', tr: 'İstatistik ve sertifika' }, d: { uz: 'So‘z boyligi bosqichlari, 4 ko‘nikma aniqligi, Multi-level sinov imtihoni.', tr: 'Kelime hazinesi aşamaları, 4 beceri doğruluğu, Multi-level deneme sınavı.' } },
];

const SOCIAL = [
  ['⚔️', { uz: 'Chaqiriq', tr: 'Meydan okuma' }, { uz: 'Do‘stingizga 20 savol yuboring — u o‘z vaqtida o‘ynaydi. G‘olib 40 XP.', tr: 'Arkadaşınıza 20 soru gönderin — kendi zamanında oynar. Kazanan 40 XP.' }],
  ['🏛️', { uz: 'Klublar', tr: 'Kulüpler' }, { uz: '50 kishilik jamoa, umumiy XP, klub chati, klublar reytingi.', tr: '50 kişilik takım, ortak XP, kulüp sohbeti, kulüp sıralaması.' }],
  ['📅', { uz: 'Kunlik chaqiriq', tr: 'Günlük meydan okuma' }, { uz: 'Hamma uchun bir xil Blitz. Bugungi reytingda kim birinchi?', tr: 'Herkes için aynı Blitz. Bugünkü sıralamada kim birinci?' }],
  ['💬', { uz: 'Lenta va chat', tr: 'Akış ve sohbet' }, { uz: 'Do‘stlar yutuqlariga 👏🔥, turkcha yozishmalar — amaliyot.', tr: 'Arkadaş başarılarına 👏🔥, Türkçe yazışmalar — pratik.' }],
] as const;

function LandingInner() {
  const { l, t } = useLang();
  const [theme, setTheme] = useState(DEFAULT_THEME);
  useEffect(() => { try { setTheme(localStorage.getItem('tezbil.theme') || DEFAULT_THEME); } catch {} }, []);
  function pickTheme(id: string) { setTheme(id); applyTheme(id); }

  return (
    <main className="relative">
      <ScrollProgress />
      <ThemeBackground themeId={theme} />
      <nav className="sticky top-0 z-30 mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="Bosh sahifa" className="glass rounded-2xl px-3 py-2"><Logo /></Link>
        <div className="flex items-center gap-2"><LangSwitch className="glass rounded-full" /><Link href="/login?demo=1" className="btn-ghost glass hidden sm:inline-flex">Demo</Link><Link href="/login" className="btn-primary">{t('login')}</Link></div>
      </nav>

      {/* HERO */}
      <section className="mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-5 text-center">
        <Reveal variant="fade"><span className="chip glass mb-5 py-1.5 text-sm">🇺🇿 → 🇹🇷 · {l({ uz: 'Turk tili · Milliy sertifikat A1 → C1', tr: 'Türkçe · Ulusal sertifika A1 → C1' })}</span></Reveal>
        <Reveal delay={80}><h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">{l({ uz: 'Turkchani ', tr: 'Türkçeyi ' })}<span className="aurora-text">{l({ uz: 'o‘yin', tr: 'oyunla' })}</span>{l({ uz: ' orqali,', tr: ',' })}<br className="hidden sm:block" /> {l({ uz: 'zerikmasdan o‘rganing', tr: 'sıkılmadan öğrenin' })}</h1></Reveal>
        <Reveal delay={160}><p className="mx-auto mt-6 max-w-2xl text-base text-ink-200 sm:text-lg">{l({ uz: 'Tez boshlab, keyin shijoati so‘nib qoladiganlar uchun yaratilgan. Kuniga 5–10 daqiqa, moslashuvchan reja, har kuni boshqa o‘yin, do‘stlar bilan raqobat, sun’iy intellekt o‘qituvchi — va to‘liq statistika.', tr: 'Hızlı başlayıp sonra hevesi sönenler için tasarlandı. Günde 5–10 dakika, uyarlanabilir plan, her gün farklı oyun, arkadaşlarla rekabet, yapay zekâ öğretmen — ve tam istatistik.' })}</p></Reveal>
        <Reveal delay={240}><div className="mt-8 flex flex-wrap items-center justify-center gap-3"><Link href="/login" className="btn-primary px-7 py-4 text-base">{l({ uz: 'Bepul boshlash', tr: 'Ücretsiz başla' })}</Link><Link href="/login?demo=1" className="btn-secondary glass px-7 py-4 text-base">{l({ uz: 'Avval ko‘rib chiqish', tr: 'Önce göz at' })}</Link></div></Reveal>
        <Reveal delay={320}><div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-ink-300"><span><b className="font-display text-xl text-white"><CountUp value={392} />+</b> {t('words')}</span><span><b className="font-display text-xl text-white"><CountUp value={21} /></b> {l({ uz: 'o‘yin', tr: 'oyun' })}</span><span><b className="font-display text-xl text-white"><CountUp value={13} /></b> {l({ uz: 'grammatika mavzusi', tr: 'dil bilgisi konusu' })}</span><span><b className="font-display text-xl text-white">0</b> {l({ uz: 'so‘m', tr: 'ücret' })}</span></div></Reveal>
        {/* Mavzu tanlash */}
        <Reveal delay={400}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-400">
            <span className="mr-1">🎨 {t('theme')}:</span>
            {THEMES.map((th) => (
              <button key={th.id} onClick={() => pickTheme(th.id)} title={l(th.name)} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition', theme === th.id ? 'border-white/60 bg-white/10 text-white' : 'border-white/10 hover:border-white/30')}>
                <span className="flex h-3.5 w-3.5 overflow-hidden rounded-full ring-1 ring-white/20"><span className="flex-1" style={{ background: th.swatch[0] }} /><span className="flex-1" style={{ background: th.swatch[1] }} /><span className="flex-1" style={{ background: th.swatch[2] }} /></span>
                <span className="hidden sm:inline">{l(th.name)}</span>
              </button>
            ))}
          </div>
        </Reveal>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden border-y border-white/[0.06] py-4">
        <div className="marquee gap-3">
          {[...MODES, ...MODES].map((m, i) => <span key={m.id + i} className="chip glass shrink-0 py-2 text-sm">{m.icon} {l(m.title)}</span>)}
        </div>
      </section>

      {/* PILLARS */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal><h2 className="title text-center text-3xl sm:text-4xl">{l({ uz: 'Nega bu ishlaydi', tr: 'Neden işe yarıyor' })}</h2></Reveal>
        <Reveal delay={80}><p className="subtitle mx-auto mt-2 max-w-xl text-center">{l({ uz: 'Pedagogika + o‘yin dizayni + ijtimoiy raqobat. Hammasi bir joyda, hammasi bepul.', tr: 'Pedagoji + oyun tasarımı + sosyal rekabet. Hepsi bir arada, hepsi ücretsiz.' })}</p></Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.icon} delay={i * 70} variant={i % 2 ? 'right' : 'left'}>
              <div className="card glass tilt h-full p-6"><div className="text-4xl">{p.icon}</div><h3 className="mt-3 font-display text-lg font-bold">{l(p.t)}</h3><p className="mt-1 text-sm text-ink-300">{l(p.d)}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* STEPS — sticky scroll storytelling */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Reveal><h2 className="title text-3xl sm:text-4xl">{l({ uz: 'Bir kun — ', tr: 'Bir gün — ' })}<span className="aurora-text">{l({ uz: '15 daqiqa', tr: '15 dakika' })}</span></h2></Reveal>
            <Reveal delay={80}><p className="subtitle mt-3">{l({ uz: 'Ko‘p emas, har kuni. Streak, kunlik maqsad halqasi va do‘stlar sizni qaytaradi. Zerikish detektori sessiyani qisqartiradi — tashlab ketish o‘rniga davom etasiz.', tr: 'Çok değil, her gün. Seri, günlük hedef halkası ve arkadaşlar sizi geri getirir. Sıkılma dedektörü oturumu kısaltır — bırakmak yerine devam edersiniz.' })}</p></Reveal>
            <Reveal delay={160}><div className="card glass mt-6 p-5"><div className="text-xs uppercase tracking-wider text-ink-400">{l({ uz: 'Haftalik natija (A1, 10 daq/kun)', tr: 'Haftalık sonuç (A1, 10 dk/gün)' })}</div><div className="mt-2 grid grid-cols-3 gap-3 text-center"><div><div className="font-display text-2xl font-bold text-ember-400"><CountUp value={56} /></div><div className="text-xs text-ink-400">{l({ uz: 'yangi so‘z', tr: 'yeni kelime' })}</div></div><div><div className="font-display text-2xl font-bold text-teal-400"><CountUp value={7} /></div><div className="text-xs text-ink-400">{t('lesson')}</div></div><div><div className="font-display text-2xl font-bold text-gold-400"><CountUp value={3} /></div><div className="text-xs text-ink-400">{l({ uz: 'qoida', tr: 'kural' })}</div></div></div></div></Reveal>
          </div>
          <ol className="space-y-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} as="li" delay={i * 60} variant="up">
                <div className="card glass tilt flex gap-4 p-5"><div className="font-display text-3xl font-extrabold text-white/15">{s.n}</div><div><h3 className="font-display text-lg font-bold">{l(s.t)}</h3><p className="mt-1 text-sm text-ink-300">{l(s.d)}</p></div></div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* SOCIAL */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal><h2 className="title text-center text-3xl sm:text-4xl">{l({ uz: 'Yolg‘iz emas', tr: 'Yalnız değilsiniz' })}</h2></Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOCIAL.map(([i, tt, d], k) => (
            <Reveal key={i} delay={k * 70} variant="scale"><div className="card glass tilt h-full p-5 text-center"><div className="text-4xl">{i}</div><h3 className="mt-2 font-display text-lg font-bold">{l(tt)}</h3><p className="mt-1 text-sm text-ink-300">{l(d)}</p></div></Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-5 pb-24 pt-10 text-center">
        <Reveal variant="scale">
          <div className="card glass relative overflow-hidden p-10">
            <div className="rays absolute -inset-20 opacity-40" />
            <div className="relative">
              <div className="text-5xl animate-float">⚡</div>
              <h2 className="title mt-4 text-3xl">{l({ uz: 'Bugun birinchi 8 daqiqa', tr: 'Bugün ilk 8 dakika' })}</h2>
              <p className="subtitle mt-2">{l({ uz: 'Birinchi darsdan keyin turkcha salomlashib, o‘zingizni tanishtira olasiz. Merhaba!', tr: 'İlk dersten sonra Türkçe selamlaşıp kendinizi tanıtabilirsiniz. Merhaba!' })}</p>
              <Link href="/login" className="btn-primary mt-6 px-8 py-4 text-base">{l({ uz: 'Boshlash — bepul', tr: 'Başla — ücretsiz' })}</Link>
            </div>
          </div>
        </Reveal>
      </section>
      <footer className="pb-10 text-center text-xs text-ink-400">{AUTHOR} · {BRAND} — {l({ uz: 'Turk tili akademiyasi', tr: 'Türkçe akademisi' })}</footer>
    </main>
  );
}

export default function Landing() {
  return <LangProvider><LandingInner /></LangProvider>;
}
