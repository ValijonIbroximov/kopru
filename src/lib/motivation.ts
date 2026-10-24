/**
 * Motivatsiya dvigateli — "tez boshlab, tez zerikadigan" odamlar uchun.
 * 1) Zerikish indeksi: faollik pasayishi, aniqlik tebranishi, bir xil rejim.
 * 2) Tavsiya: har kuni boshqa rejim, qisqa sessiya, "qaytish bonusi".
 * 3) Flow kanali: aniqlik 65–93% oralig'ida bo'lsin.
 */
import type { Profile, AppSettings } from './types';
import { todayKey } from './utils';

export interface DayStat { day: string; xp: number; minutes: number; reviews: number }

export type ModeId = 'review' | 'lesson' | 'match' | 'builder' | 'harmony' | 'listen' | 'speak' | 'story' | 'duel' | 'tutor' | 'grammar' | 'exam' | 'cognates';

export const MODES: { id: ModeId; title: string; icon: string; desc: string; href: string; minutes: number; skill: string; color: string }[] = [
  { id: 'review', title: 'Takrorlash', icon: '🧠', desc: 'FSRS navbati — unutish arafasidagi so‘zlar', href: '/play/review', minutes: 5, skill: 'vocab', color: 'from-teal-500/30 to-teal-500/5' },
  { id: 'lesson', title: 'Yangi dars', icon: '📘', desc: 'Keyingi dars — yangi so‘zlar va qoidalar', href: '/learn', minutes: 10, skill: 'vocab', color: 'from-ember-500/30 to-ember-500/5' },
  { id: 'match', title: 'Juftlash', icon: '🃏', desc: 'Xotira o‘yini: turkcha ↔ o‘zbekcha', href: '/play/match', minutes: 4, skill: 'vocab', color: 'from-gold-400/30 to-gold-400/5' },
  { id: 'builder', title: 'Jumla quruvchi', icon: '🧩', desc: 'So‘zlardan gap tuzing', href: '/play/builder', minutes: 6, skill: 'grammar', color: 'from-violet-500/30 to-violet-500/5' },
  { id: 'harmony', title: 'Uyg‘unlik', icon: '🎼', desc: 'Unli uyg‘unligi refleksi', href: '/play/harmony', minutes: 4, skill: 'grammar', color: 'from-sky-500/30 to-sky-500/5' },
  { id: 'listen', title: 'Tinglash', icon: '🎧', desc: 'Eshiting va tanlang/yozing', href: '/play/listen', minutes: 5, skill: 'listening', color: 'from-rose-500/30 to-rose-500/5' },
  { id: 'speak', title: 'Gapirish', icon: '🎙️', desc: 'Mikrofon orqali talaffuz', href: '/play/speak', minutes: 5, skill: 'speaking', color: 'from-emerald-500/30 to-emerald-500/5' },
  { id: 'story', title: 'AI hikoya', icon: '📖', desc: 'Darajangizga mos hikoya + test', href: '/play/story', minutes: 7, skill: 'reading', color: 'from-amber-500/30 to-amber-500/5' },
  { id: 'duel', title: 'Duel', icon: '⚔️', desc: 'Do‘stingiz bilan real vaqtda', href: '/play/duel', minutes: 4, skill: 'vocab', color: 'from-red-500/30 to-red-500/5' },
  { id: 'tutor', title: 'AI o‘qituvchi', icon: '🤖', desc: 'Turkcha suhbat, xatolarni tuzatadi', href: '/tutor', minutes: 8, skill: 'writing', color: 'from-fuchsia-500/30 to-fuchsia-500/5' },
  { id: 'grammar', title: 'Grammatika', icon: '📐', desc: 'Qoidalar bo‘yicha drillar', href: '/play/grammar', minutes: 6, skill: 'grammar', color: 'from-indigo-500/30 to-indigo-500/5' },
  { id: 'cognates', title: 'Qarindosh so‘zlar', icon: '🌉', desc: 'Siz allaqachon bilgan so‘zlar', href: '/play/cognates', minutes: 5, skill: 'vocab', color: 'from-lime-500/30 to-lime-500/5' },
  { id: 'exam', title: 'Sinov imtihoni', icon: '🎓', desc: 'Milliy sertifikat formati', href: '/exam', minutes: 25, skill: 'all', color: 'from-ink-500/40 to-ink-500/10' },
];

export interface MotivationReport {
  score: number;               // 0..100 (yuqori = sog'lom)
  risk: 'low' | 'medium' | 'high';
  boredom: number;             // 0..100
  daysInactive: number;
  comeback: boolean;
  messages: string[];
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
  if (daysInactive >= settings.motivation.risk_days) boredom += 20;
  boredom = Math.min(100, boredom);

  const consistency = activeDays14 / 14;
  const score = Math.round(Math.max(0, Math.min(100, 100 - boredom * 0.6 + consistency * 30 - Math.min(30, daysInactive * 8))));
  const risk: MotivationReport['risk'] = score >= 65 ? 'low' : score >= 40 ? 'medium' : 'high';
  const comeback = daysInactive >= settings.motivation.comeback_days;

  const messages: string[] = [];
  if (comeback) messages.push(`Qaytganingiz bilan! Bugun XP ×${settings.xp.comeback_multiplier} — faqat 5 daqiqa yetadi.`);
  if (maxShare > 0.6 && total > 5) messages.push('Siz ko‘proq bitta rejimda o‘ynayapsiz — bugun boshqa rejimni sinab ko‘ring, miya yangilikni yaxshi ko‘radi.');
  if (accuracy7d !== null && accuracy7d > settings.flow.max_accuracy) messages.push('Aniqlik juda yuqori — qiyinroq rejimga o‘tamiz (yozish, jumla quruvchi).');
  if (accuracy7d !== null && accuracy7d < settings.flow.min_accuracy) messages.push('Bir oz qiyin kelyapti — bugun yengil rejim (juftlash, tinglash) va ko‘proq takrorlash.');
  if (trend < -0.3 && !comeback) messages.push('Shijoat biroz pasaydi — bu normal. Sessiyani qisqartiramiz: 5 daqiqa, keyin xohlasangiz davom etasiz.');
  if (profile.streak >= 3) messages.push(`🔥 ${profile.streak} kunlik streak — bugun ham saqlang!`);

  // tavsiya: rotatsiya (kun raqami bo'yicha) + holatga qarab
  const dayNum = Math.floor(new Date(today + 'T00:00:00').getTime() / 86400000);
  const rotation: ModeId[] = ['match', 'harmony', 'listen', 'builder', 'story', 'speak', 'cognates'];
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

export const ENCOURAGE = [
  'Zo‘r! Davom eting.', 'Aynan shunday!', 'Harika! (ajoyib)', 'Çok iyi! (juda yaxshi)', 'Mükemmel! (mukammal)', 'Siz ko‘prikdan o‘tyapsiz 🌉', 'Bu so‘z endi sizniki.',
];
export const CONSOLE = [
  'Xato — o‘rganishning bir qismi. Yana bir bor.', 'Deyarli! Izohga qarang.', 'Bu so‘z sizni sinamoqchi. Keyingi safar yutasiz.', 'Normal — bu so‘z 5 daqiqadan keyin yana keladi.',
];
