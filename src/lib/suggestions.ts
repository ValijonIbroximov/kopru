/**
 * Aqlli takliflar: foydalanuvchi holatidan kelib chiqib "hozir nima qilsam bo'ladi?"
 * Dashboard'da 1–3 ta karta sifatida ko'rsatiladi. Matnlar ikki tilda (uz/tr).
 */
import type { Profile, AppSettings } from './types';
import type { UserStats } from './data';
import type { MotivationReport } from './motivation';

type L2 = { uz: string; tr: string };
export interface Suggestion { id: string; icon: string; title: L2; text: L2; href: string; cta: L2; tone: 'ember' | 'teal' | 'gold' | 'violet' | 'rose'; priority: number }

export function buildSuggestions(p: Profile, s: UserStats, settings: AppSettings, report: MotivationReport | null, extra: { friends: number; inClub: boolean; dailyPlayed: boolean; pendingChallenges: number; hour: number; hasPlan?: boolean }): Suggestion[] {
  const out: Suggestion[] = [];
  const todayMin = s.today?.minutes ?? 0;
  const goalLeft = Math.max(0, p.daily_goal_min - todayMin);
  const interests = p.interests ?? {};
  const modesTried = Object.keys(interests);

  if (extra.pendingChallenges > 0) out.push({ id: 'challenge', icon: '⚔️', title: { uz: `${extra.pendingChallenges} ta chaqiriq kutmoqda`, tr: `${extra.pendingChallenges} meydan okuma bekliyor` }, text: { uz: 'Do‘stingiz sizni chaqirdi — bir xil savollar, 60 soniya. G‘olib 40 XP.', tr: 'Arkadaşınız sizi davet etti — aynı sorular, 60 saniye. Kazanan 40 XP.' }, href: '/friends?tab=challenges', cta: { uz: 'O‘ynash', tr: 'Oyna' }, tone: 'rose', priority: 100 });
  if (report?.comeback) out.push({ id: 'comeback', icon: '⚡', title: { uz: 'Qaytganingiz bilan!', tr: 'Tekrar hoş geldiniz!' }, text: { uz: `Bugun XP ×${settings.xp.comeback_multiplier}. Eng oson yo‘l — 5 daqiqalik takrorlash.`, tr: `Bugün XP ×${settings.xp.comeback_multiplier}. En kolay yol — 5 dakikalık tekrar.` }, href: '/play/review', cta: { uz: '5 daqiqa', tr: '5 dakika' }, tone: 'gold', priority: 95 });
  if (s.words.due >= 20) out.push({ id: 'due', icon: '🧠', title: { uz: `${s.words.due} ta so‘z unutilish arafasida`, tr: `${s.words.due} kelime unutulmak üzere` }, text: { uz: 'Navbat to‘planib qoldi. 1 sessiya = 20 so‘z. Bugun tozalab qo‘ying.', tr: 'Sıra birikti. 1 oturum = 20 kelime. Bugün temizleyin.' }, href: '/play/review', cta: { uz: 'Takrorlash', tr: 'Tekrar' }, tone: 'teal', priority: 90 });
  if (!extra.dailyPlayed) out.push({ id: 'daily', icon: '📅', title: { uz: 'Kunlik Blitz chaqirig‘i', tr: 'Günlük Blitz meydan okuması' }, text: { uz: 'Bugun hamma uchun bir xil 40 savol. 60 soniya — reytingda o‘rningizni ko‘ring.', tr: 'Bugün herkes için aynı 40 soru. 60 saniye — sıralamadaki yerinizi görün.' }, href: '/play/blitz?daily=1', cta: { uz: '60 soniya', tr: '60 saniye' }, tone: 'gold', priority: 80 });
  if (goalLeft > 0 && extra.hour >= 19) out.push({ id: 'evening', icon: '🌙', title: { uz: `Kun tugashiga ${goalLeft} daqiqa yetadi`, tr: `Gün bitmeden ${goalLeft} dakika yeter` }, text: { uz: 'Streakni saqlash uchun kichik sessiya kifoya — juftlash yoki blitz.', tr: 'Seriyi korumak için kısa bir oturum yeter — eşleştirme ya da blitz.' }, href: '/play/match', cta: { uz: 'Juftlash', tr: 'Eşleştir' }, tone: 'ember', priority: 85 });
  if (extra.hasPlan === false && (s.lessons.completed ?? 0) >= 1) out.push({ id: 'plan', icon: '🗺️', title: { uz: 'Shaxsiy reja tuzing', tr: 'Kişisel plan oluşturun' }, text: { uz: 'Imtihon sanasi va maqsad darajani kiriting — TezBil har kun uchun moslashuvchan reja tuzadi.', tr: 'Sınav tarihini ve hedef seviyeyi girin — TezBil her gün için uyarlanabilir bir plan oluşturur.' }, href: '/plan', cta: { uz: 'Reja tuzish', tr: 'Plan oluştur' }, tone: 'teal', priority: 75 });
  if (extra.friends === 0) out.push({ id: 'friends', icon: '🤝', title: { uz: 'Do‘st qo‘shing', tr: 'Arkadaş ekleyin' }, text: { uz: 'Do‘sti bor o‘quvchilar 2 barobar ko‘proq davom etadi. Chaqiriq, chat, lenta — hammasi do‘stlar bilan.', tr: 'Arkadaşı olan öğrenciler 2 kat daha uzun devam eder. Meydan okuma, sohbet, akış — hepsi arkadaşlarla.' }, href: '/friends?tab=search', cta: { uz: 'Qidirish', tr: 'Ara' }, tone: 'violet', priority: 60 });
  if (!extra.inClub && extra.friends > 0) out.push({ id: 'club', icon: '🏛️', title: { uz: 'Klub tuzing yoki qo‘shiling', tr: 'Kulüp kurun ya da katılın' }, text: { uz: 'Jamoaviy haftalik XP, klub chati, klublar reytingi. Kurs yoki guruhingiz uchun ideal.', tr: 'Takım haftalık XP, kulüp sohbeti, kulüp sıralaması. Kursunuz ya da grubunuz için ideal.' }, href: '/club', cta: { uz: 'Klub', tr: 'Kulüp' }, tone: 'violet', priority: 50 });
  const skills = s.modes;
  const grammarAcc = (() => { let c = 0, t = 0; for (const m of ['harmony', 'grammar', 'builder']) { const x = skills[m]; if (x) { c += x.correct; t += x.total; } } return t >= 10 ? c / t : null; })();
  if (grammarAcc !== null && grammarAcc < 0.65) out.push({ id: 'grammar', icon: '🎼', title: { uz: 'Grammatika qoqilyapti', tr: 'Dil bilgisi tökezliyor' }, text: { uz: `Aniqlik ${Math.round(grammarAcc * 100)}%. Uyg‘unlik o‘yini 4 daqiqada refleksni tiklaydi.`, tr: `Doğruluk %${Math.round(grammarAcc * 100)}. Ünlü uyumu oyunu 4 dakikada refleksi geri getirir.` }, href: '/play/harmony', cta: { uz: 'Uyg‘unlik', tr: 'Ünlü uyumu' }, tone: 'teal', priority: 70 });
  if (!modesTried.includes('speak') && (s.lessons.completed ?? 0) >= 2) out.push({ id: 'speak', icon: '🎙️', title: { uz: 'Hali gapirmadingiz', tr: 'Henüz konuşmadınız' }, text: { uz: 'Sertifikatda gapirish bo‘limi bor. Mikrofon bilan 5 daqiqa — talaffuz xotirani 2 barobar mustahkamlaydi.', tr: 'Sertifikada konuşma bölümü var. Mikrofonla 5 dakika — telaffuz hafızayı 2 kat güçlendirir.' }, href: '/play/speak', cta: { uz: 'Sinab ko‘rish', tr: 'Dene' }, tone: 'ember', priority: 55 });
  const newModes = ['blitz', 'rain', 'tower', 'bingo', 'memory', 'anagram', 'bridge', 'roleplay'].filter((m) => !modesTried.includes(m));
  if (newModes.length) {
    const m = newModes[Math.floor(Date.now() / 86400000) % newModes.length];
    const names: Record<string, L2> = { blitz: { uz: '⚡ Blitz', tr: '⚡ Blitz' }, rain: { uz: '🌧️ So‘z yomg‘iri', tr: '🌧️ Kelime yağmuru' }, tower: { uz: '🗼 Minora', tr: '🗼 Kule' }, bingo: { uz: '🎱 Bingo', tr: '🎱 Bingo' }, memory: { uz: '🃏 Xotira kartalari', tr: '🃏 Hafıza kartları' }, anagram: { uz: '🔡 Harf terish', tr: '🔡 Harf dizme' }, bridge: { uz: '🌉 So‘z ko‘prigi', tr: '🌉 Kelime köprüsü' }, roleplay: { uz: '🎭 Rol o‘yini', tr: '🎭 Rol oyunu' } };
    out.push({ id: 'new-' + m, icon: '✨', title: { uz: `Yangi o‘yin: ${names[m].uz}`, tr: `Yeni oyun: ${names[m].tr}` }, text: { uz: 'Hali sinab ko‘rmagan rejim. Miya yangilikni yaxshi ko‘radi — 4 daqiqa.', tr: 'Henüz denemediğiniz mod. Beyin yeniliği sever — 4 dakika.' }, href: `/play/${m}`, cta: { uz: 'Sinab ko‘rish', tr: 'Dene' }, tone: 'violet', priority: 45 });
  }
  if ((s.lessons.completed ?? 0) === 0) out.push({ id: 'first', icon: '📘', title: { uz: 'Birinchi dars — 8 daqiqa', tr: 'İlk ders — 8 dakika' }, text: { uz: 'Salomlashuv: merhaba, teşekkürler, hayır (= yo‘q!). Birinchi darsdan keyin tanishib gaplashasiz.', tr: 'Selamlaşma: merhaba, teşekkürler, hayır. İlk dersten sonra tanışıp konuşursunuz.' }, href: '/learn/1', cta: { uz: 'Boshlash', tr: 'Başla' }, tone: 'ember', priority: 99 });
  return out.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

/** Kunlik reja — 3 qadam, bajarilganlari belgilanadi (reja sozlanmagan foydalanuvchilar uchun) */
export function dailyPlan(s: UserStats, p: Profile, nextLessonId: number | null) {
  const modesToday = s.today?.modes ?? {};
  const did = (m: string) => Boolean(modesToday[m]);
  const reviewed = did('review') || (s.today?.reviews ?? 0) >= 10;
  const lessoned = did('lesson');
  const played = Object.keys(modesToday).some((m) => !['review', 'lesson'].includes(m));
  return [
    { id: 'review', icon: '🧠', title: { uz: 'Takrorlash', tr: 'Tekrar' }, sub: s.words.due ? { uz: `${s.words.due} ta navbatda`, tr: `${s.words.due} sırada` } : { uz: 'navbat bo‘sh — zo‘r', tr: 'sıra boş — harika' }, min: 5, done: reviewed, href: '/play/review' },
    { id: 'lesson', icon: '📘', title: { uz: 'Yangi dars', tr: 'Yeni ders' }, sub: nextLessonId ? { uz: 'keyingi dars tayyor', tr: 'sonraki ders hazır' } : { uz: 'barcha darslar yakunlangan', tr: 'tüm dersler tamamlandı' }, min: 8, done: lessoned, href: nextLessonId ? `/learn/${nextLessonId}` : '/learn' },
    { id: 'play', icon: '🎮', title: { uz: 'Bitta o‘yin', tr: 'Bir oyun' }, sub: { uz: 'bugun boshqa rejim', tr: 'bugün farklı bir mod' }, min: 4, done: played, href: '/play' },
  ];
}
