'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile, BRAND, Logo } from '@/components/AppShell';
import { ThemePicker, AmbientPicker } from '@/components/ThemePicker';
import { VoicePicker } from '@/components/VoicePicker';
import { updateProfile } from '@/lib/data';
import { LANGS, useLang, type Lang } from '@/lib/i18n';
import { currentThemeId, type Ambient } from '@/lib/themes';
import { getVoicePref, speak, ttsAvailable, type VoicePref } from '@/lib/speech';
import { LEVEL_ORDER, LEVEL_WORDS } from '@/lib/plan';
import type { Cefr } from '@/lib/types';
import { cn } from '@/lib/utils';

const AVATARS = ['🦉', '🦊', '🐺', '🦁', '🐯', '🐻', '🦅', '🐬', '🦋', '🌙', '⚡', '🌉'];
const LEVELS: { id: Cefr; t: { uz: string; tr: string }; d: { uz: string; tr: string } }[] = [
  { id: 'A1', t: { uz: 'A1 — noldan', tr: 'A1 — sıfırdan' }, d: { uz: 'Turkchani bilmayman yoki juda kam bilaman', tr: 'Türkçe bilmiyorum ya da çok az biliyorum' } },
  { id: 'A2', t: { uz: 'A2 — boshlang‘ich', tr: 'A2 — başlangıç' }, d: { uz: 'Oddiy gaplarni tushunaman, salomlashaman', tr: 'Basit cümleleri anlıyorum, selamlaşıyorum' } },
  { id: 'B1', t: { uz: 'B1 — o‘rta', tr: 'B1 — orta' }, d: { uz: 'Kundalik mavzularda gaplasha olaman', tr: 'Günlük konularda konuşabiliyorum' } },
  { id: 'B2', t: { uz: 'B2 — sertifikat maqsadi', tr: 'B2 — sertifika hedefi' }, d: { uz: 'Universitet/magistratura uchun kerak', tr: 'Üniversite/yüksek lisans için gerekli' } },
  { id: 'C1', t: { uz: 'C1 — ilg‘or', tr: 'C1 — ileri' }, d: { uz: 'Erkin gapiraman, akademik til kerak', tr: 'Akıcı konuşuyorum, akademik dil gerekli' } },
];
const WHY = [
  { id: 'cert', t: { uz: '🎓 Milliy sertifikat', tr: '🎓 Ulusal sertifika' }, d: { uz: 'Imtihon formati va mashqlar', tr: 'Sınav formatı ve alıştırmalar' } },
  { id: 'travel', t: { uz: '✈️ Sayohat', tr: '✈️ Seyahat' }, d: { uz: 'Dialoglar, bozor, yo‘l so‘rash', tr: 'Diyaloglar, pazar, yol sorma' } },
  { id: 'work', t: { uz: '💼 Ish / xizmat', tr: '💼 İş / hizmet' }, d: { uz: 'Kasblar, aloqa, texnika lug‘ati', tr: 'Meslekler, iletişim, teknik sözlük' } },
  { id: 'fun', t: { uz: '🎬 Qiziqish', tr: '🎬 İlgi' }, d: { uz: 'Seriallar, musiqa, madaniyat', tr: 'Diziler, müzik, kültür' } },
];

export default function Onboarding() {
  const { profile, settings, refresh } = useProfile();
  const { l, lang, setLang } = useLang();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState(currentThemeId());
  const [ambient, setAmbient] = useState<Ambient>('lite');
  const [level, setLevel] = useState<Cefr>('A1');
  const [target, setTarget] = useState<Cefr>('A2');
  const [examDate, setExamDate] = useState<string>('');
  const [why, setWhy] = useState<string[]>(['cert']);
  const [goal, setGoal] = useState(10);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '🦉');
  const [voice, setVoice] = useState<VoicePref>('emel');
  const [busy, setBusy] = useState(false);
  const total = 7;
  useEffect(() => { setTheme(currentThemeId()); setVoice(getVoicePref()); }, []);
  useEffect(() => { if (profile?.display_name && !name) setName(profile.display_name); }, [profile, name]);

  // maqsad daraja — hozirgi darajadan bir pog'ona yuqori (kamida A2)
  useEffect(() => { const i = LEVEL_ORDER.indexOf(level); setTarget(LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, Math.max(1, i + 1))]); }, [level]);

  const minDate = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);

  async function finish(skip = false) {
    setBusy(true);
    const plan = skip ? undefined : { target, examDate: examDate || null, minutes: goal, focus: why, createdAt: new Date().toISOString() };
    await updateProfile({
      display_name: name.trim() || profile?.display_name || null, avatar, daily_goal_min: goal, level_cefr: level, onboarded: true,
      settings: { ...(profile?.settings ?? {}), why, theme, ambient, lang, voice, ...(plan ? { plan } : {}) },
    });
    await refresh();
    router.replace('/dashboard?tour=1');
  }

  const Dots = () => <div className="mb-6 flex gap-1.5">{Array.from({ length: total }).map((_, i) => <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', i <= step ? 'bg-accent' : 'bg-white/10')} />)}</div>;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center">
      <div className="card glass animate-pop p-6">
        <Dots />

        {/* 0 — Xush kelibsiz + til */}
        {step === 0 && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center animate-float"><Logo /></div>
            <h1 className="title mt-3">{l({ uz: `${BRAND}’ga xush kelibsiz!`, tr: `${BRAND}’e hoş geldiniz!` })}</h1>
            <p className="subtitle mt-2">{l({ uz: 'O‘zbek va turk tillari — bir oilaning farzandlari. Siz allaqachon yuzlab turkcha so‘zni bilasiz; biz shu ustunlikdan tez boshlaymiz.', tr: 'Özbekçe ve Türkçe — aynı ailenin çocukları. Zaten yüzlerce Türkçe kelime biliyorsunuz; bu avantajla hızlı başlıyoruz.' })}</p>
            <div className="mt-5">
              <div className="label text-center">{l({ uz: 'Interfeys tili', tr: 'Arayüz dili' })}</div>
              <div className="grid grid-cols-2 gap-2">
                {LANGS.map((x) => <button key={x.id} onClick={() => setLang(x.id as Lang)} className={cn('option py-4 text-center', lang === x.id && 'border-accent bg-accent/15')}><div className="text-2xl">{x.flag}</div><div className="font-semibold">{x.label}</div></button>)}
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-left text-sm">
              {[['🧠', { uz: 'Xotira algoritmi so‘zni aynan unutish arafasida qaytaradi', tr: 'Hafıza algoritması kelimeyi tam unutulmak üzereyken geri getirir' }], ['🗺️', { uz: 'Moslashuvchan reja — imtihon sanasiga qarab har kun qayta hisoblanadi', tr: 'Uyarlanabilir plan — sınav tarihine göre her gün yeniden hesaplanır' }], ['🎮', { uz: '21 ta o‘yin rejimi — har kuni boshqasi, zerikmaysiz', tr: '21 oyun modu — her gün farklı biri, sıkılmazsınız' }], ['🤝', { uz: 'Do‘stlar, klublar, chaqiriqlar — birga tezroq', tr: 'Arkadaşlar, kulüpler, meydan okumalar — birlikte daha hızlı' }]].map(([i, tx]) => <div key={String(i)} className="card-soft flex items-center gap-3 p-3"><span className="text-2xl">{i as string}</span><span className="text-ink-100">{l(tx as { uz: string; tr: string })}</span></div>)}
            </div>
            {ttsAvailable() && <button className="btn-secondary mt-4" onClick={() => speak(`Merhaba! ${BRAND}’e hoş geldiniz.`)}>🔊 Merhaba! {BRAND}’e hoş geldiniz.</button>}
          </div>
        )}

        {/* 1 — Dizayn */}
        {step === 1 && (
          <div>
            <h2 className="title">{l({ uz: 'O‘zingizga qulay dizaynni tanlang', tr: 'Size uygun tasarımı seçin' })}</h2>
            <p className="subtitle mt-1">{l({ uz: 'Yumshoq ranglar, qorong‘i yoki yorug‘ rejim — bosing, butun sahifa darhol o‘zgaradi. Keyin profilda almashtirish mumkin.', tr: 'Yumuşak renkler, karanlık ya da aydınlık mod — basın, sayfa anında değişir. Daha sonra profilden değiştirebilirsiniz.' })}</p>
            <div className="mt-4"><ThemePicker value={theme} onChange={setTheme} /></div>
            <div className="mt-4"><div className="label">{l({ uz: 'Orqa fon jonliligi', tr: 'Arka plan canlılığı' })}</div><AmbientPicker value={ambient} onChange={setAmbient} /></div>
          </div>
        )}

        {/* 2 — Daraja */}
        {step === 2 && (
          <div>
            <h2 className="title">{l({ uz: 'Hozirgi darajangiz?', tr: 'Şu anki seviyeniz?' })}</h2>
            <p className="subtitle mt-1">{l({ uz: 'AI hikoya, o‘qituvchi va imtihon shu darajaga moslashadi. Keyin profilda o‘zgartirish mumkin.', tr: 'AI hikâye, öğretmen ve sınav bu seviyeye uyarlanır. Daha sonra profilden değiştirilebilir.' })}</p>
            <div className="mt-4 grid gap-2">{LEVELS.map((lv) => <button key={lv.id} onClick={() => setLevel(lv.id)} className={cn('option text-left', level === lv.id && 'border-accent bg-accent/15')}><div className="font-semibold">{l(lv.t)}</div><div className="text-xs font-normal text-ink-300">{l(lv.d)}</div></button>)}</div>
          </div>
        )}

        {/* 3 — Nima uchun */}
        {step === 3 && (
          <div>
            <h2 className="title">{l({ uz: 'Nima uchun o‘rganyapsiz?', tr: 'Neden öğreniyorsunuz?' })}</h2>
            <p className="subtitle mt-1">{l({ uz: 'Bir nechtasini tanlash mumkin — tavsiyalar va reja shunga moslashadi.', tr: 'Birkaçını seçebilirsiniz — öneriler ve plan buna uyarlanır.' })}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">{WHY.map((w) => <button key={w.id} onClick={() => setWhy((s) => (s.includes(w.id) ? s.filter((x) => x !== w.id) : [...s, w.id]))} className={cn('option text-left', why.includes(w.id) && 'border-teal-400 bg-teal-500/20')}><div className="font-semibold">{l(w.t)}</div><div className="text-xs font-normal text-ink-300">{l(w.d)}</div></button>)}</div>
          </div>
        )}

        {/* 4 — Kunlik maqsad */}
        {step === 4 && (
          <div>
            <h2 className="title">{l({ uz: 'Kunlik maqsad', tr: 'Günlük hedef' })}</h2>
            <p className="subtitle mt-1">{l({ uz: 'Barqaror odat uchun 10 daqiqa — eng yaxshi tanlov. Ko‘proq xohlasangiz — keyin oshirasiz.', tr: 'Kalıcı alışkanlık için 10 dakika — en iyi seçim. Daha fazlasını isterseniz sonra artırırsınız.' })}</p>
            <div className="mt-4 grid grid-cols-5 gap-2">{settings.goals.options.map((g) => <button key={g} onClick={() => setGoal(g)} className={cn('option py-4 text-center', goal === g && 'border-gold-400 bg-gold-400/20')}><div className="font-display text-xl font-bold">{g}</div><div className="text-[10px] text-ink-300">{l({ uz: 'daq', tr: 'dk' })}</div></button>)}</div>
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-sm text-ink-200">{goal <= 5 ? l({ uz: '😌 Yengil: 1 takrorlash sessiyasi. Streak saqlanadi.', tr: '😌 Hafif: 1 tekrar oturumu. Seri korunur.' }) : goal <= 10 ? l({ uz: '🎯 Tavsiya: takrorlash + 1 o‘yin yoki 1 dars.', tr: '🎯 Öneri: tekrar + 1 oyun ya da 1 ders.' }) : goal <= 20 ? l({ uz: '💪 Jiddiy: dars + takrorlash + o‘yin. 3 oyda A2.', tr: '💪 Ciddi: ders + tekrar + oyun. 3 ayda A2.' }) : l({ uz: '🔥 Intensiv: imtihonga tayyorgarlik rejimi.', tr: '🔥 Yoğun: sınava hazırlık modu.' })}</div>
          </div>
        )}

        {/* 5 — Reja: maqsad daraja + imtihon sanasi */}
        {step === 5 && (
          <div>
            <h2 className="title">{l({ uz: '🗺️ Moslashuvchan reja', tr: '🗺️ Uyarlanabilir plan' })}</h2>
            <p className="subtitle mt-1">{l({ uz: 'Maqsad daraja va (bo‘lsa) imtihon sanasini kiriting. TezBil kuniga nechta so‘z, qaysi o‘yin va qachon sinov imtihoni kerakligini hisoblab, har kun qayta moslaydi.', tr: 'Hedef seviyeyi ve (varsa) sınav tarihini girin. TezBil günde kaç kelime, hangi oyun ve ne zaman deneme sınavı gerektiğini hesaplar, her gün yeniden uyarlar.' })}</p>
            <div className="mt-4"><div className="label">{l({ uz: 'Maqsad daraja', tr: 'Hedef seviye' })}</div>
              <div className="flex flex-wrap gap-2">{LEVEL_ORDER.filter((lv) => LEVEL_ORDER.indexOf(lv) >= Math.max(1, LEVEL_ORDER.indexOf(level))).map((lv) => <button key={lv} onClick={() => setTarget(lv)} className={cn('chip py-2 text-sm', target === lv && 'border-gold-400 bg-gold-400/20 text-white')}>{lv} <span className="text-ink-400">· {LEVEL_WORDS[lv]} {l({ uz: 'so‘z', tr: 'kelime' })}</span></button>)}</div>
            </div>
            <div className="mt-4"><div className="label">{l({ uz: 'Imtihon sanasi (ixtiyoriy)', tr: 'Sınav tarihi (isteğe bağlı)' })}</div>
              <div className="flex gap-2"><input type="date" className="input" min={minDate} value={examDate} onChange={(e) => setExamDate(e.target.value)} />{examDate && <button className="btn-secondary" onClick={() => setExamDate('')}>✕</button>}</div>
              <div className="mt-2 text-xs text-ink-400">{examDate ? l({ uz: `${Math.max(0, Math.round((new Date(examDate).getTime() - Date.now()) / 86400000))} kun qoldi — reja shu muddatga bo‘linadi.`, tr: `${Math.max(0, Math.round((new Date(examDate).getTime() - Date.now()) / 86400000))} gün kaldı — plan bu süreye bölünür.` }) : l({ uz: 'Sana bo‘lmasa reja kunlik daqiqadan kelib chiqib tuziladi.', tr: 'Tarih yoksa plan günlük dakikaya göre oluşturulur.' })}</div>
            </div>
          </div>
        )}

        {/* 6 — Ism, avatar, ovoz */}
        {step === 6 && (
          <div>
            <h2 className="title">{l({ uz: 'Sizni qanday chaqiramiz?', tr: 'Size nasıl hitap edelim?' })}</h2>
            <div className="mt-4"><label className="label">{l({ uz: 'Ism', tr: 'İsim' })}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={profile?.username ?? 'ism'} /></div>
            <div className="mt-3"><label className="label">Avatar</label><div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setAvatar(a)} className={cn('h-11 w-11 rounded-xl text-2xl', avatar === a ? 'bg-accent/30 ring-2 ring-accent' : 'bg-white/5')}>{a}</button>)}</div></div>
            <div className="mt-4"><label className="label">{l({ uz: '🔊 Turkcha ovoz', tr: '🔊 Türkçe ses' })}</label><VoicePicker value={voice} onChange={setVoice} /></div>
            <div className="mt-4 rounded-2xl bg-teal-500/10 p-3 text-sm text-teal-100">{l({ uz: 'Tayyor! Birinchi dars 8 daqiqa: salomlashuv va siz allaqachon bilgan so‘zlar. Keyin qisqa sayohat bosh sahifani ko‘rsatadi.', tr: 'Hazır! İlk ders 8 dakika: selamlaşma ve zaten bildiğiniz kelimeler. Sonra kısa bir tur ana sayfayı gösterir.' })}</div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {step > 0 && <button className="btn-secondary" onClick={() => setStep(step - 1)}>←</button>}
          {step < total - 1 ? <button className="btn-primary flex-1" onClick={() => setStep(step + 1)}>{l({ uz: 'Davom →', tr: 'Devam →' })}</button> : <button className="btn-primary flex-1 py-4 text-base" disabled={busy} onClick={() => finish(false)}>{busy ? '…' : l({ uz: '🚀 Boshlaymiz!', tr: '🚀 Başlıyoruz!' })}</button>}
        </div>
        {step === 0 && <button className="mt-2 w-full text-xs text-ink-400 hover:text-white" onClick={() => finish(true)}>{l({ uz: 'O‘tkazib yuborish', tr: 'Atla' })}</button>}
      </div>
    </div>
  );
}
