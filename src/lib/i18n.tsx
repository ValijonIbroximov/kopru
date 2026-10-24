'use client';
/**
 * Ko'p tilli interfeys: O'zbekcha (uz) va Turkcha (tr).
 *  - l({ uz, tr })  — joyida yozilgan ikki tilli satr (tarjima matn yonida turadi, kalit kerak emas)
 *  - t('key')        — umumiy tugmalar/so'zlar lug'ati
 * Til: localStorage 'tezbil.lang' → profil sozlamasi → brauzer tili.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'uz' | 'tr';
export type L = string | { uz: string; tr: string };

export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'uz', label: 'O‘zbekcha', flag: '🇺🇿' },
  { id: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

export const DICT = {
  start: { uz: 'Boshlash →', tr: 'Başla →' },
  continue: { uz: 'Davom etish', tr: 'Devam et' },
  back: { uz: 'Orqaga', tr: 'Geri' },
  save: { uz: 'Saqlash', tr: 'Kaydet' },
  saved: { uz: 'Saqlandi', tr: 'Kaydedildi' },
  cancel: { uz: 'Bekor', tr: 'İptal' },
  close: { uz: 'Yopish', tr: 'Kapat' },
  next: { uz: 'Keyingi →', tr: 'Sonraki →' },
  skip: { uz: 'O‘tkazib yuborish', tr: 'Atla' },
  done: { uz: 'Tayyor!', tr: 'Tamam!' },
  loading: { uz: 'Yuklanmoqda…', tr: 'Yükleniyor…' },
  error: { uz: 'Xato', tr: 'Hata' },
  minutes: { uz: 'daq', tr: 'dk' },
  min_long: { uz: 'daqiqa', tr: 'dakika' },
  day: { uz: 'kun', tr: 'gün' },
  days: { uz: 'kun', tr: 'gün' },
  today: { uz: 'bugun', tr: 'bugün' },
  yesterday: { uz: 'kecha', tr: 'dün' },
  never: { uz: 'hech qachon', tr: 'hiç' },
  points: { uz: 'ball', tr: 'puan' },
  score: { uz: 'Ball', tr: 'Puan' },
  level: { uz: 'Daraja', tr: 'Seviye' },
  words: { uz: 'so‘z', tr: 'kelime' },
  lesson: { uz: 'dars', tr: 'ders' },
  lessons: { uz: 'Darslar', tr: 'Dersler' },
  games: { uz: 'O‘yinlar', tr: 'Oyunlar' },
  play: { uz: 'O‘ynash', tr: 'Oyna' },
  play_again: { uz: 'Yana o‘ynash', tr: 'Tekrar oyna' },
  how_to_play: { uz: 'Qanday o‘ynaladi', tr: 'Nasıl oynanır' },
  check: { uz: 'Tekshirish', tr: 'Kontrol et' },
  hint: { uz: 'ishora', tr: 'ipucu' },
  correct: { uz: 'to‘g‘ri', tr: 'doğru' },
  wrong: { uz: 'noto‘g‘ri', tr: 'yanlış' },
  accuracy: { uz: 'aniqlik', tr: 'doğruluk' },
  streak: { uz: 'streak', tr: 'seri' },
  xp_total: { uz: 'Jami', tr: 'Toplam' },
  record: { uz: 'Rekord', tr: 'Rekor' },
  new_record: { uz: 'Yangi rekord!', tr: 'Yeni rekor!' },
  rank: { uz: 'Reyting', tr: 'Sıralama' },
  leaderboard: { uz: 'Reyting', tr: 'Sıralama' },
  friends: { uz: 'Do‘stlar', tr: 'Arkadaşlar' },
  club: { uz: 'Klub', tr: 'Kulüp' },
  profile: { uz: 'Profil', tr: 'Profil' },
  stats: { uz: 'Statistika', tr: 'İstatistik' },
  home: { uz: 'Bosh', tr: 'Ana sayfa' },
  learn: { uz: 'O‘rganish', tr: 'Öğren' },
  plan: { uz: 'Reja', tr: 'Plan' },
  tutor: { uz: 'AI o‘qituvchi', tr: 'AI öğretmen' },
  exam: { uz: 'Sinov imtihoni', tr: 'Deneme sınavı' },
  admin: { uz: 'Admin', tr: 'Yönetici' },
  logout: { uz: 'Chiqish', tr: 'Çıkış' },
  login: { uz: 'Kirish', tr: 'Giriş' },
  demo_mode: { uz: 'Demo rejim (localStorage)', tr: 'Demo modu (localStorage)' },
  demo_banner: { uz: 'Demo rejim: progress faqat shu brauzerda. README.md → Supabase ulash (do‘stlar, klublar, reyting uchun).', tr: 'Demo modu: ilerleme yalnızca bu tarayıcıda. README.md → Supabase bağlayın (arkadaşlar, kulüpler, sıralama için).' },
  notifications: { uz: 'Bildirishnomalar', tr: 'Bildirimler' },
  no_notifications: { uz: 'Hali bildirishnoma yo‘q', tr: 'Henüz bildirim yok' },
  known_words: { uz: 'tanish so‘z', tr: 'bilinen kelime' },
  your_record: { uz: 'Rekordingiz', tr: 'Rekorunuz' },
  top_records: { uz: 'Top rekordlar', tr: 'En iyi rekorlar' },
  full_table: { uz: 'To‘liq jadval →', tr: 'Tam tablo →' },
  mistakes_work: { uz: 'Xatolar ustida ishlash', tr: 'Hatalar üzerinde çalışma' },
  great: { uz: 'Zo‘r!', tr: 'Harika!' },
  keep_going: { uz: 'Davom eting!', tr: 'Devam edin!' },
  saving: { uz: 'saqlanmoqda…', tr: 'kaydediliyor…' },
  requires_supabase: { uz: 'Supabase talab qiladi', tr: 'Supabase gerektirir' },
  tip: { uz: 'Maslahat', tr: 'İpucu' },
  tour: { uz: 'Sayohat', tr: 'Tur' },
  language: { uz: 'Til', tr: 'Dil' },
  theme: { uz: 'Dizayn', tr: 'Tasarım' },
  listen: { uz: 'Eshitish', tr: 'Dinle' },
  speak_voice: { uz: 'Ovoz', tr: 'Ses' },
  translation: { uz: 'Tarjimasi', tr: 'Çevirisi' },
  meaning: { uz: 'Ma’nosi', tr: 'Anlamı' },
  new_word: { uz: 'Yangi so‘z', tr: 'Yeni kelime' },
  understood: { uz: 'Tushundim →', tr: 'Anladım →' },
  choose_translation: { uz: 'Tarjimasini tanlang', tr: 'Çevirisini seçin' },
  choose_turkish: { uz: 'Turkchasini tanlang', tr: 'Türkçesini seçin' },
  write_turkish: { uz: 'Turkchasini yozing', tr: 'Türkçesini yazın' },
  find_pairs: { uz: 'Juftlarni toping', tr: 'Eşleri bulun' },
  order_words: { uz: 'Turkchaga tarjima qiling — so‘zlarni tartiblang', tr: 'Türkçeye çevirin — kelimeleri sıralayın' },
  listen_choose: { uz: 'Eshiting va tanlang', tr: 'Dinleyin ve seçin' },
  listen_write: { uz: 'Eshiting va yozing', tr: 'Dinleyin ve yazın' },
  slow: { uz: 'sekin', tr: 'yavaş' },
  read_aloud: { uz: 'Ovoz chiqarib o‘qing', tr: 'Sesli okuyun' },
  fill_blank: { uz: 'Bo‘sh joyni to‘ldiring', tr: 'Boşluğu doldurun' },
  true_false: { uz: 'To‘g‘ri yoki noto‘g‘ri?', tr: 'Doğru mu yanlış mı?' },
  true_: { uz: 'To‘g‘ri', tr: 'Doğru' },
  false_: { uz: 'Noto‘g‘ri', tr: 'Yanlış' },
  correct_answer: { uz: 'To‘g‘ri javob', tr: 'Doğru cevap' },
  vowel_harmony: { uz: 'Unli uyg‘unligi', tr: 'Ünlü uyumu' },
  finish: { uz: 'Yakunlash', tr: 'Bitir' },
  exit_saved: { uz: 'Chiqish (progress saqlanadi)', tr: 'Çık (ilerleme kaydedilir)' },
  finishing: { uz: 'Yakunlanmoqda…', tr: 'Tamamlanıyor…' },
  retry: { uz: 'Qayta urinish', tr: 'Tekrar dene' },
  once_more: { uz: 'Yana bir bor', tr: 'Bir kez daha' },
  next_lesson: { uz: 'Keyingi dars →', tr: 'Sonraki ders →' },
  learning_path: { uz: 'O‘rganish yo‘li', tr: 'Öğrenme yolu' },
  all: { uz: 'Hammasi', tr: 'Tümü' },
  search: { uz: 'Qidirish', tr: 'Ara' },
  send: { uz: 'Yuborish', tr: 'Gönder' },
  copy_link: { uz: 'Havolani nusxalash', tr: 'Bağlantıyı kopyala' },
  link_copied: { uz: 'Havola nusxalandi', tr: 'Bağlantı kopyalandı' },
  you: { uz: 'siz', tr: 'siz' },
  member: { uz: 'a’zo', tr: 'üye' },
  week_xp: { uz: 'XP/hafta', tr: 'XP/hafta' },
  goal: { uz: 'Maqsad', tr: 'Hedef' },
  per_day: { uz: 'kuniga', tr: 'günde' },
} as const;

export type DictKey = keyof typeof DICT;

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey) => string; l: (s: L) => string }
const LangCtx = createContext<Ctx>({ lang: 'uz', setLang: () => {}, t: (k) => DICT[k].uz, l: (s) => (typeof s === 'string' ? s : s.uz) });

export function detectLang(): Lang {
  if (typeof window === 'undefined') return 'uz';
  try {
    const saved = localStorage.getItem('tezbil.lang');
    if (saved === 'uz' || saved === 'tr') return saved;
    if (navigator.language?.toLowerCase().startsWith('tr')) return 'tr';
  } catch { /* noop */ }
  return 'uz';
}

export function LangProvider({ children, initial, onChange }: { children: React.ReactNode; initial?: Lang; onChange?: (l: Lang) => void }) {
  const [lang, setLangState] = useState<Lang>(initial ?? 'uz');
  // initial (profil sozlamasi) keyinroq kelsa — unga o'tamiz; bo'lmasa brauzer/localStorage dan aniqlaymiz
  useEffect(() => { if (initial) setLangState(initial); else setLangState(detectLang()); }, [initial]);
  useEffect(() => { try { document.documentElement.lang = lang; } catch { /* noop */ } }, [lang]);
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem('tezbil.lang', l); } catch { /* noop */ } onChange?.(l); }, [onChange]);
  const value = useMemo<Ctx>(() => ({
    lang, setLang,
    t: (k) => DICT[k]?.[lang] ?? DICT[k]?.uz ?? String(k),
    l: (s) => (typeof s === 'string' ? s : s[lang] ?? s.uz),
  }), [lang, setLang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

/** Komponent tashqarisida (statik ro'yxatlar) — joriy tilni localStorage dan oladi */
export function pick(s: L): string {
  if (typeof s === 'string') return s;
  return s[detectLang()] ?? s.uz;
}

export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-xs ${className}`}>
      {LANGS.map((x) => (
        <button key={x.id} type="button" onClick={() => setLang(x.id)} className={`rounded-full px-2.5 py-1 font-medium transition ${lang === x.id ? 'bg-white/15 text-white' : 'text-ink-400 hover:text-white'}`} title={x.label}>
          {x.flag} {x.id.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
