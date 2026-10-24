/**
 * Aqlli takliflar: foydalanuvchi holatidan kelib chiqib "hozir nima qilsam bo'ladi?"
 * Dashboard'da 1–3 ta karta sifatida ko'rsatiladi.
 */
import type { Profile, AppSettings } from './types';
import type { UserStats } from './data';
import type { MotivationReport } from './motivation';

export interface Suggestion { id: string; icon: string; title: string; text: string; href: string; cta: string; tone: 'ember' | 'teal' | 'gold' | 'violet' | 'rose'; priority: number }

export function buildSuggestions(p: Profile, s: UserStats, settings: AppSettings, report: MotivationReport | null, extra: { friends: number; inClub: boolean; dailyPlayed: boolean; pendingChallenges: number; hour: number }): Suggestion[] {
  const out: Suggestion[] = [];
  const todayMin = s.today?.minutes ?? 0;
  const goalLeft = Math.max(0, p.daily_goal_min - todayMin);
  const interests = p.interests ?? {};
  const modesTried = Object.keys(interests);

  if (extra.pendingChallenges > 0) out.push({ id: 'challenge', icon: '⚔️', title: `${extra.pendingChallenges} ta chaqiriq kutmoqda`, text: 'Do‘stingiz sizni chaqirdi — bir xil savollar, 60 soniya. G‘olib 40 XP.', href: '/friends?tab=challenges', cta: 'O‘ynash', tone: 'rose', priority: 100 });
  if (report?.comeback) out.push({ id: 'comeback', icon: '🌉', title: 'Qaytganingiz bilan!', text: `Bugun XP ×${settings.xp.comeback_multiplier}. Eng oson yo‘l — 5 daqiqalik takrorlash.`, href: '/play/review', cta: '5 daqiqa', tone: 'gold', priority: 95 });
  if (s.words.due >= 20) out.push({ id: 'due', icon: '🧠', title: `${s.words.due} ta so‘z unutilish arafasida`, text: 'Navbat to‘planib qoldi. 1 sessiya = 20 so‘z. Bugun tozalab qo‘ying.', href: '/play/review', cta: 'Takrorlash', tone: 'teal', priority: 90 });
  if (!extra.dailyPlayed) out.push({ id: 'daily', icon: '📅', title: 'Kunlik Blitz chaqirig‘i', text: 'Bugun hamma uchun bir xil 40 savol. 60 soniya — reytingda o‘rningizni ko‘ring.', href: '/play/blitz?daily=1', cta: '60 soniya', tone: 'gold', priority: 80 });
  if (goalLeft > 0 && extra.hour >= 19) out.push({ id: 'evening', icon: '🌙', title: `Kun tugashiga ${goalLeft} daqiqa yetadi`, text: 'Streakni saqlash uchun kichik sessiya kifoya — juftlash yoki blitz.', href: '/play/match', cta: 'Juftlash', tone: 'ember', priority: 85 });
  if (extra.friends === 0) out.push({ id: 'friends', icon: '🤝', title: 'Do‘st qo‘shing', text: 'Do‘sti bor o‘quvchilar 2 barobar ko‘proq davom etadi. Chaqiriq, chat, lenta — hammasi do‘stlar bilan.', href: '/friends?tab=search', cta: 'Qidirish', tone: 'violet', priority: 60 });
  if (!extra.inClub && extra.friends > 0) out.push({ id: 'club', icon: '🏛️', title: 'Klub tuzing yoki qo‘shiling', text: 'Jamoaviy haftalik XP, klub chati, klublar reytingi. Kurs yoki guruhingiz uchun ideal.', href: '/club', cta: 'Klub', tone: 'violet', priority: 50 });
  const skills = s.modes;
  const grammarAcc = (() => { let c = 0, t = 0; for (const m of ['harmony', 'grammar', 'builder']) { const x = skills[m]; if (x) { c += x.correct; t += x.total; } } return t >= 10 ? c / t : null; })();
  if (grammarAcc !== null && grammarAcc < 0.65) out.push({ id: 'grammar', icon: '🎼', title: 'Grammatika qoqilyapti', text: `Aniqlik ${Math.round(grammarAcc * 100)}%. Uyg‘unlik o‘yini 4 daqiqada refleksni tiklaydi.`, href: '/play/harmony', cta: 'Uyg‘unlik', tone: 'teal', priority: 70 });
  if (!modesTried.includes('speak') && (s.lessons.completed ?? 0) >= 2) out.push({ id: 'speak', icon: '🎙️', title: 'Hali gapirmadingiz', text: 'Sertifikatda gapirish bo‘limi bor. Mikrofon bilan 5 daqiqa — talaffuz xotirani 2 barobar mustahkamlaydi.', href: '/play/speak', cta: 'Sinab ko‘rish', tone: 'ember', priority: 55 });
  const newModes = ['blitz', 'rain', 'tower', 'bingo', 'memory', 'anagram', 'bridge', 'roleplay'].filter((m) => !modesTried.includes(m));
  if (newModes.length) { const m = newModes[Math.floor(Date.now() / 86400000) % newModes.length]; const names: Record<string, string> = { blitz: '⚡ Blitz', rain: '🌧️ So‘z yomg‘iri', tower: '🗼 Minora', bingo: '🎱 Bingo', memory: '🃏 Xotira kartalari', anagram: '🔡 Harf terish', bridge: '🌉 So‘z ko‘prigi', roleplay: '🎭 Rol o‘yini' }; out.push({ id: 'new-' + m, icon: '✨', title: `Yangi o‘yin: ${names[m]}`, text: 'Hali sinab ko‘rmagan rejim. Miya yangilikni yaxshi ko‘radi — 4 daqiqa.', href: `/play/${m}`, cta: 'Sinab ko‘rish', tone: 'violet', priority: 45 }); }
  if ((s.lessons.completed ?? 0) === 0) out.push({ id: 'first', icon: '📘', title: 'Birinchi dars — 8 daqiqa', text: 'Salomlashuv: merhaba, teşekkürler, hayır (= yo‘q!). Birinchi darsdan keyin tanishib gaplashasiz.', href: '/learn/1', cta: 'Boshlash', tone: 'ember', priority: 99 });
  return out.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

/** Kunlik reja — 3 qadam, bajarilganlari belgilanadi */
export function dailyPlan(s: UserStats, p: Profile, nextLessonId: number | null) {
  const modesToday = s.today?.modes ?? {};
  const did = (m: string) => Boolean(modesToday[m]);
  const reviewed = did('review') || (s.today?.reviews ?? 0) >= 10;
  const lessoned = did('lesson');
  const played = Object.keys(modesToday).some((m) => !['review', 'lesson'].includes(m));
  return [
    { id: 'review', icon: '🧠', title: 'Takrorlash', sub: s.words.due ? `${s.words.due} ta navbatda` : 'navbat bo‘sh — zo‘r', min: 5, done: reviewed, href: '/play/review' },
    { id: 'lesson', icon: '📘', title: 'Yangi dars', sub: nextLessonId ? 'keyingi dars tayyor' : 'barcha darslar yakunlangan', min: 8, done: lessoned, href: nextLessonId ? `/learn/${nextLessonId}` : '/learn' },
    { id: 'play', icon: '🎮', title: 'Bitta o‘yin', sub: 'bugun boshqa rejim', min: 4, done: played, href: '/play' },
  ];
}
