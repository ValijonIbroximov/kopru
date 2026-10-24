/**
 * Motivatsiya dvigateli — "tez boshlab, tez zerikadigan" odamlar uchun.
 * 1) Zerikish indeksi: faollik pasayishi, aniqlik tebranishi, bir xil rejim.
 * 2) Tavsiya: har kuni boshqa rejim, qisqa sessiya, "qaytish bonusi".
 * 3) Flow kanali: aniqlik 65–93% oralig'ida bo'lsin.
 */
import type { Profile, AppSettings } from './types';
import { todayKey } from './utils';

export interface DayStat { day: string; xp: number; minutes: number; reviews: number }

export type ModeId =
  | 'review' | 'lesson' | 'match' | 'builder' | 'harmony' | 'listen' | 'speak' | 'story' | 'duel' | 'tutor' | 'grammar' | 'exam' | 'cognates'
  | 'blitz' | 'rain' | 'anagram' | 'memory' | 'bingo' | 'tower' | 'roleplay' | 'bridge';

export type ModeCategory = 'core' | 'arcade' | 'brain' | 'social' | 'ai' | 'exam';

type L2 = { uz: string; tr: string };
export interface ModeDef { id: ModeId; title: L2; icon: string; desc: L2; href: string; minutes: number; skill: string; color: string; category: ModeCategory; isNew?: boolean }

export const MODES: ModeDef[] = [
  { id: 'review', title: { uz: 'Takrorlash', tr: 'Tekrar' }, icon: '🧠', desc: { uz: 'FSRS navbati — unutish arafasidagi so‘zlar', tr: 'FSRS sırası — unutulmak üzere olan kelimeler' }, href: '/play/review', minutes: 5, skill: 'vocab', color: 'from-teal-500/30 to-teal-500/5', category: 'core' },
  { id: 'lesson', title: { uz: 'Yangi dars', tr: 'Yeni ders' }, icon: '📘', desc: { uz: 'Keyingi dars — yangi so‘zlar va qoidalar', tr: 'Sonraki ders — yeni kelimeler ve kurallar' }, href: '/learn', minutes: 10, skill: 'vocab', color: 'from-ember-500/30 to-ember-500/5', category: 'core' },
  { id: 'blitz', title: { uz: 'Blitz', tr: 'Blitz' }, icon: '⚡', desc: { uz: '60 soniya, maksimal ball. Kunlik chaqiriq va rekordlar', tr: '60 saniye, maksimum puan. Günlük meydan okuma ve rekorlar' }, href: '/play/blitz', minutes: 2, skill: 'vocab', color: 'from-yellow-400/30 to-yellow-400/5', category: 'arcade', isNew: true },
  { id: 'rain', title: { uz: 'So‘z yomg‘iri', tr: 'Kelime yağmuru' }, icon: '🌧️', desc: { uz: 'Tushayotgan so‘zlardan to‘g‘risini ushlang', tr: 'Düşen kelimelerden doğrusunu yakalayın' }, href: '/play/rain', minutes: 3, skill: 'vocab', color: 'from-cyan-500/30 to-cyan-500/5', category: 'arcade', isNew: true },
  { id: 'tower', title: { uz: 'Minora', tr: 'Kule' }, icon: '🗼', desc: { uz: 'Qavatma-qavat yuqoriga: har qavat qiyinroq, 3 jon', tr: 'Kat kat yukarı: her kat daha zor, 3 can' }, href: '/play/tower', minutes: 6, skill: 'all', color: 'from-orange-500/30 to-orange-500/5', category: 'arcade', isNew: true },
  { id: 'bingo', title: { uz: 'Bingo', tr: 'Bingo' }, icon: '🎱', desc: { uz: 'Eshiting/o‘qing va kartadagi so‘zni bosing — qator = BINGO', tr: 'Dinleyin/okuyun ve karttaki kelimeye basın — sıra = BINGO' }, href: '/play/bingo', minutes: 4, skill: 'listening', color: 'from-pink-500/30 to-pink-500/5', category: 'arcade', isNew: true },
  { id: 'memory', title: { uz: 'Xotira kartalari', tr: 'Hafıza kartları' }, icon: '🃏', desc: { uz: 'Kartalarni ochib juftini toping — kam yurish, ko‘p ball', tr: 'Kartları açıp eşini bulun — az hamle, çok puan' }, href: '/play/memory', minutes: 4, skill: 'vocab', color: 'from-purple-500/30 to-purple-500/5', category: 'brain', isNew: true },
  { id: 'anagram', title: { uz: 'Harf terish', tr: 'Harf dizme' }, icon: '🔡', desc: { uz: 'Aralash harflardan turkcha so‘zni tering — imlo refleksi', tr: 'Karışık harflerden Türkçe kelimeyi dizin — yazım refleksi' }, href: '/play/anagram', minutes: 4, skill: 'writing', color: 'from-lime-500/30 to-lime-500/5', category: 'brain', isNew: true },
  { id: 'bridge', title: { uz: 'So‘z ko‘prigi', tr: 'Kelime köprüsü' }, icon: '🌉', desc: { uz: 'Harflarni toping, ko‘prik buzilmasin (hangman uslubi)', tr: 'Harfleri bulun, köprü yıkılmasın (adam asmaca tarzı)' }, href: '/play/bridge', minutes: 4, skill: 'writing', color: 'from-amber-500/30 to-amber-500/5', category: 'brain', isNew: true },
  { id: 'match', title: { uz: 'Juftlash', tr: 'Eşleştirme' }, icon: '🔗', desc: { uz: 'Turkcha ↔ o‘zbekcha juftlarni ulang', tr: 'Türkçe ↔ Özbekçe eşleri bağlayın' }, href: '/play/match', minutes: 4, skill: 'vocab', color: 'from-gold-400/30 to-gold-400/5', category: 'brain' },
  { id: 'builder', title: { uz: 'Jumla quruvchi', tr: 'Cümle kurucu' }, icon: '🧩', desc: { uz: 'So‘zlardan gap tuzing', tr: 'Kelimelerden cümle kurun' }, href: '/play/builder', minutes: 6, skill: 'grammar', color: 'from-violet-500/30 to-violet-500/5', category: 'core' },
  { id: 'harmony', title: { uz: 'Uyg‘unlik', tr: 'Ünlü uyumu' }, icon: '🎼', desc: { uz: 'Unli uyg‘unligi refleksi', tr: 'Ünlü uyumu refleksi' }, href: '/play/harmony', minutes: 4, skill: 'grammar', color: 'from-sky-500/30 to-sky-500/5', category: 'core' },
  { id: 'listen', title: { uz: 'Tinglash', tr: 'Dinleme' }, icon: '🎧', desc: { uz: 'Eshiting va tanlang/yozing', tr: 'Dinleyin ve seçin/yazın' }, href: '/play/listen', minutes: 5, skill: 'listening', color: 'from-rose-500/30 to-rose-500/5', category: 'core' },
  { id: 'speak', title: { uz: 'Gapirish', tr: 'Konuşma' }, icon: '🎙️', desc: { uz: 'Mikrofon orqali talaffuz', tr: 'Mikrofonla telaffuz' }, href: '/play/speak', minutes: 5, skill: 'speaking', color: 'from-emerald-500/30 to-emerald-500/5', category: 'core' },
  { id: 'roleplay', title: { uz: 'Rol o‘yini', tr: 'Rol oyunu' }, icon: '🎭', desc: { uz: 'Dialogda to‘g‘ri javobni tanlang — bozor, shifokor, yo‘l…', tr: 'Diyalogda doğru cevabı seçin — pazar, doktor, yol…' }, href: '/play/roleplay', minutes: 5, skill: 'reading', color: 'from-fuchsia-500/30 to-fuchsia-500/5', category: 'brain', isNew: true },
  { id: 'grammar', title: { uz: 'Grammatika', tr: 'Dil bilgisi' }, icon: '📐', desc: { uz: 'Qoidalar bo‘yicha drillar', tr: 'Kurallara göre alıştırmalar' }, href: '/play/grammar', minutes: 6, skill: 'grammar', color: 'from-indigo-500/30 to-indigo-500/5', category: 'core' },
  { id: 'cognates', title: { uz: 'Qarindosh so‘zlar', tr: 'Akraba kelimeler' }, icon: '🪢', desc: { uz: 'Siz allaqachon bilgan so‘zlar', tr: 'Zaten bildiğiniz kelimeler' }, href: '/play/cognates', minutes: 5, skill: 'vocab', color: 'from-lime-500/30 to-lime-500/5', category: 'core' },
  { id: 'duel', title: { uz: 'Duel', tr: 'Düello' }, icon: '⚔️', desc: { uz: 'Do‘stingiz bilan real vaqtda', tr: 'Arkadaşınızla gerçek zamanlı' }, href: '/play/duel', minutes: 4, skill: 'vocab', color: 'from-red-500/30 to-red-500/5', category: 'social' },
  { id: 'story', title: { uz: 'AI hikoya', tr: 'AI hikâye' }, icon: '📖', desc: { uz: 'Darajangizga mos hikoya + test', tr: 'Seviyenize uygun hikâye + test' }, href: '/play/story', minutes: 7, skill: 'reading', color: 'from-amber-500/30 to-amber-500/5', category: 'ai' },
  { id: 'tutor', title: { uz: 'AI o‘qituvchi', tr: 'AI öğretmen' }, icon: '🤖', desc: { uz: 'Turkcha suhbat, xatolarni tuzatadi', tr: 'Türkçe sohbet, hataları düzeltir' }, href: '/tutor', minutes: 8, skill: 'writing', color: 'from-fuchsia-500/30 to-fuchsia-500/5', category: 'ai' },
  { id: 'exam', title: { uz: 'Sinov imtihoni', tr: 'Deneme sınavı' }, icon: '🎓', desc: { uz: 'Milliy sertifikat formati', tr: 'Ulusal sertifika formatı' }, href: '/exam', minutes: 25, skill: 'all', color: 'from-ink-500/40 to-ink-500/10', category: 'exam' },
];

export const MODE_CATEGORIES: { id: ModeCategory; title: L2; desc: L2 }[] = [
  { id: 'arcade', title: { uz: '⚡ Arkada', tr: '⚡ Arcade' }, desc: { uz: 'Tez, reaksiya, rekordlar', tr: 'Hız, refleks, rekorlar' } },
  { id: 'brain', title: { uz: '🧩 Miya o‘yinlari', tr: '🧩 Zekâ oyunları' }, desc: { uz: 'Xotira, imlo, dialog', tr: 'Hafıza, yazım, diyalog' } },
  { id: 'core', title: { uz: '📘 Asosiy mashg‘ulot', tr: '📘 Temel çalışma' }, desc: { uz: 'Dars, takrorlash, grammatika', tr: 'Ders, tekrar, dil bilgisi' } },
  { id: 'social', title: { uz: '🤝 Ijtimoiy', tr: '🤝 Sosyal' }, desc: { uz: 'Do‘stlar bilan', tr: 'Arkadaşlarla' } },
  { id: 'ai', title: { uz: '🤖 Sun‘iy intellekt', tr: '🤖 Yapay zekâ' }, desc: { uz: 'Hikoya, o‘qituvchi', tr: 'Hikâye, öğretmen' } },
  { id: 'exam', title: { uz: '🎓 Imtihon', tr: '🎓 Sınav' }, desc: { uz: 'Sertifikat formati', tr: 'Sertifika formatı' } },
];

export interface MotivationReport {
  score: number;               // 0..100 (yuqori = sog'lom)
  risk: 'low' | 'medium' | 'high';
  boredom: number;             // 0..100
  daysInactive: number;
  comeback: boolean;
  messages: L2[];
  recommended: ModeId[];
  sessionMinutes: number;
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

export function analyzeMotivation(profile: Profile, days: DayStat[], settings: AppSettings, accuracy7d: number | null): MotivationReport {
  const today = todayKey(profile.tz);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - (13 - i));
    const k = d.toISOString().slice(0, 10);
    return byDay.get(k) ?? { day: k, xp: 0, minutes: 0, reviews: 0 };
  });
  const activeDays14 = last14.filter((d) => d.xp > 0).length;
  const firstWeek = last14.slice(0, 7).reduce((s, d) => s + d.minutes, 0);
  const secondWeek = last14.slice(7).reduce((s, d) => s + d.minutes, 0);
  const trend = firstWeek > 0 ? (secondWeek - firstWeek) / firstWeek : secondWeek > 0 ? 1 : 0;
  const daysInactive = profile.last_active_date ? Math.max(0, daysBetween(profile.last_active_date, today)) : 99;

  // bir xil rejim ustunligi (monotoniya)
  const interests = Object.values(profile.interests ?? {});
  const total = interests.reduce((a, b) => a + b, 0);
  const maxShare = total ? Math.max(...interests) / total : 0;

  let boredom = 0;
  if (trend < -0.3) boredom += 30;
  if (trend < -0.6) boredom += 15;
  if (maxShare > 0.6 && total > 5) boredom += 25;
  if (accuracy7d !== null && accuracy7d > settings.flow.max_accuracy) boredom += 15; // juda oson
  if (accuracy7d !== null && accuracy7d < settings.flow.min_accuracy) boredom += 20; // juda qiyin
  const isNew = !profile.last_active_date;
  if (!isNew && daysInactive >= settings.motivation.risk_days) boredom += 20;
  boredom = Math.min(100, boredom);

  const consistency = activeDays14 / 14;
  const score = isNew ? 70 : Math.round(Math.max(0, Math.min(100, 100 - boredom * 0.6 + consistency * 30 - Math.min(30, daysInactive * 8))));
  const risk: MotivationReport['risk'] = score >= 65 ? 'low' : score >= 40 ? 'medium' : 'high';
  // qaytish bonusi faqat avval faol bo'lganlar uchun (yangi foydalanuvchi emas)
  const comeback = Boolean(profile.last_active_date) && daysInactive >= settings.motivation.comeback_days;

  const messages: L2[] = [];
  if (comeback) messages.push({ uz: `Qaytganingiz bilan! Bugun XP ×${settings.xp.comeback_multiplier} — faqat 5 daqiqa yetadi.`, tr: `Tekrar hoş geldiniz! Bugün XP ×${settings.xp.comeback_multiplier} — sadece 5 dakika yeter.` });
  if (maxShare > 0.6 && total > 5) messages.push({ uz: 'Siz ko‘proq bitta rejimda o‘ynayapsiz — bugun boshqa rejimni sinab ko‘ring, miya yangilikni yaxshi ko‘radi.', tr: 'Daha çok tek modda oynuyorsunuz — bugün başka bir mod deneyin, beyin yeniliği sever.' });
  if (accuracy7d !== null && accuracy7d > settings.flow.max_accuracy) messages.push({ uz: 'Aniqlik juda yuqori — qiyinroq rejimga o‘tamiz (yozish, jumla quruvchi).', tr: 'Doğruluk çok yüksek — daha zor moda geçiyoruz (yazma, cümle kurucu).' });
  if (accuracy7d !== null && accuracy7d < settings.flow.min_accuracy) messages.push({ uz: 'Bir oz qiyin kelyapti — bugun yengil rejim (juftlash, tinglash) va ko‘proq takrorlash.', tr: 'Biraz zor geliyor — bugün hafif mod (eşleştirme, dinleme) ve daha çok tekrar.' });
  if (trend < -0.3 && !comeback) messages.push({ uz: 'Shijoat biroz pasaydi — bu normal. Sessiyani qisqartiramiz: 5 daqiqa, keyin xohlasangiz davom etasiz.', tr: 'Motivasyon biraz düştü — normal. Oturumu kısaltıyoruz: 5 dakika, sonra isterseniz devam edersiniz.' });
  if (profile.streak >= 3) messages.push({ uz: `🔥 ${profile.streak} kunlik streak — bugun ham saqlang!`, tr: `🔥 ${profile.streak} günlük seri — bugün de koruyun!` });

  // tavsiya: rotatsiya (kun raqami bo'yicha) + holatga qarab
  const dayNum = Math.floor(new Date(today + 'T00:00:00').getTime() / 86400000);
  const rotation: ModeId[] = ['blitz', 'match', 'rain', 'harmony', 'memory', 'listen', 'bingo', 'builder', 'anagram', 'story', 'tower', 'speak', 'roleplay', 'cognates', 'bridge'];
  const spice = rotation[dayNum % rotation.length];
  const recommended: ModeId[] = ['review'];
  if (accuracy7d !== null && accuracy7d > settings.flow.max_accuracy) recommended.push('builder', 'tutor');
  else if (accuracy7d !== null && accuracy7d < settings.flow.min_accuracy) recommended.push('match', 'listen');
  else recommended.push('lesson');
  if (!recommended.includes(spice)) recommended.push(spice);
  const least = MODES.map((m) => m.id).filter((id) => !(profile.interests ?? {})[id]).find((id) => !recommended.includes(id));
  if (least) recommended.push(least);

  const sessionMinutes = risk === 'high' ? 5 : risk === 'medium' ? Math.min(profile.daily_goal_min, 10) : profile.daily_goal_min;
  return { score, risk, boredom, daysInactive, comeback, messages, recommended: recommended.slice(0, 4), sessionMinutes };
}

/** Flow kanali: sessiya ichida qiyinlikni moslashtirish */
export function nextDifficulty(recent: boolean[], current: 1 | 2 | 3, settings: AppSettings): 1 | 2 | 3 {
  if (recent.length < 4) return current;
  const acc = recent.slice(-6).filter(Boolean).length / Math.min(6, recent.length);
  if (acc > settings.flow.max_accuracy && current < 3) return (current + 1) as 1 | 2 | 3;
  if (acc < settings.flow.min_accuracy && current > 1) return (current - 1) as 1 | 2 | 3;
  return current;
}

export const ENCOURAGE: L2[] = [
  { uz: 'Zo‘r! Davom eting.', tr: 'Harika! Devam edin.' }, { uz: 'Aynan shunday!', tr: 'Tam olarak böyle!' }, { uz: 'Harika! (ajoyib)', tr: 'Harika!' }, { uz: 'Çok iyi! (juda yaxshi)', tr: 'Çok iyi!' },
  { uz: 'Mükemmel! (mukammal)', tr: 'Mükemmel!' }, { uz: 'Tez bilyapsiz ⚡', tr: 'Hızlı öğreniyorsunuz ⚡' }, { uz: 'Bu so‘z endi sizniki.', tr: 'Bu kelime artık sizin.' },
];
export const CONSOLE: L2[] = [
  { uz: 'Xato — o‘rganishning bir qismi. Yana bir bor.', tr: 'Hata — öğrenmenin parçası. Bir kez daha.' }, { uz: 'Deyarli! Izohga qarang.', tr: 'Neredeyse! Açıklamaya bakın.' },
  { uz: 'Bu so‘z sizni sinamoqchi. Keyingi safar yutasiz.', tr: 'Bu kelime sizi sınıyor. Bir dahakine kazanırsınız.' }, { uz: 'Normal — bu so‘z 5 daqiqadan keyin yana keladi.', tr: 'Normal — bu kelime 5 dakika sonra tekrar gelecek.' },
];
