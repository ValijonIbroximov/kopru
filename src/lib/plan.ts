/**
 * Moslashuvchan o'quv rejasi.
 * Kirish: maqsad daraja, imtihon sanasi (ixtiyoriy), kunlik daqiqa, hozirgi holat (so'zlar, darslar, ko'nikmalar, faollik).
 * Chiqish: talab qilinadigan sur'at, holat (oldinda/orqada), haftalik 7 kunlik reja, bosqichlar, moslashuv izohlari.
 * Reja har kirishda qayta hisoblanadi — ya'ni o'z-o'zidan moslashadi.
 */
import type { Cefr, Profile, Lesson, LessonProgress } from './types';
import type { UserStats } from './data';
import type { ModeId } from './motivation';

export interface PlanSettings { target: Cefr; examDate: string | null; minutes: number; focus?: string[]; createdAt: string }

export const LEVEL_WORDS: Record<Cefr, number> = { A1: 500, A2: 1200, B1: 2500, B2: 4000, C1: 6000 };
export const LEVEL_ORDER: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export interface PlanTask { id: string; mode: ModeId | 'lesson' | 'exam' | 'story' | 'tutor'; title: { uz: string; tr: string }; sub?: { uz: string; tr: string }; minutes: number; href: string; icon: string; done?: boolean }
export interface PlanDay { date: string; weekday: number; label: { uz: string; tr: string }; tasks: PlanTask[]; minutes: number; isToday: boolean; focus: { uz: string; tr: string } }
export interface Milestone { level: Cefr; words: number; date: string | null; reached: boolean; daysFromNow: number | null }

export interface PlanReport {
  settings: PlanSettings;
  daysLeft: number | null;
  targetWords: number;
  wordsKnown: number;
  wordsRemaining: number;
  progressPct: number;
  requiredPerDay: number;          // kerakli yangi so'z/kun
  currentPace: number;             // hozirgi sur'at so'z/kun (oxirgi 14 kun)
  status: 'ahead' | 'on_track' | 'behind' | 'no_date' | 'done';
  recommendedMinutes: number;
  projectedDate: string | null;    // hozirgi sur'atda maqsadga yetish sanasi
  week: PlanDay[];
  milestones: Milestone[];
  adjustments: { uz: string; tr: string }[];
  weakSkills: string[];
}

const WD_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
const WD_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function getPlanSettings(profile: Profile | null): PlanSettings | null {
  const p = (profile?.settings as { plan?: PlanSettings } | undefined)?.plan;
  return p && p.target ? p : null;
}

export function defaultPlan(profile: Profile): PlanSettings {
  const idx = Math.min(LEVEL_ORDER.length - 1, LEVEL_ORDER.indexOf(profile.level_cefr) + 1);
  return { target: LEVEL_ORDER[Math.max(1, idx)], examDate: null, minutes: profile.daily_goal_min || 10, createdAt: new Date().toISOString() };
}

/** Ko'nikma aniqligi (0..1) yoki null */
function skillAcc(stats: UserStats, modes: string[]) {
  let c = 0, t = 0;
  for (const m of modes) { const x = stats.modes[m]; if (x) { c += x.correct; t += x.total; } }
  return t >= 8 ? c / t : null;
}

export function computePlan(settings: PlanSettings, profile: Profile, stats: UserStats, lessons: Lesson[], progress: LessonProgress[], todayStr: string): PlanReport {
  const today = new Date(todayStr + 'T00:00:00');
  const targetWords = LEVEL_WORDS[settings.target];
  const wordsKnown = stats.words.learning + stats.words.review + stats.words.mastered;
  const wordsRemaining = Math.max(0, targetWords - wordsKnown);
  const progressPct = Math.min(100, Math.round((wordsKnown / targetWords) * 100));

  // sur'at: oxirgi 14 kun faol kunlari × o'rtacha yangi so'z (taxminan: ko'rilgan so'zlar / faol kunlar)
  const last14 = stats.heatmap.filter((d) => (today.getTime() - new Date(d.day + 'T00:00:00').getTime()) / 86400000 <= 14);
  const activeDays14 = last14.filter((d) => d.xp > 0).length;
  const perActiveDay = stats.totals.active_days ? wordsKnown / Math.max(1, stats.totals.active_days) : 0;
  const currentPace = Math.round((perActiveDay * (activeDays14 / 14)) * 10) / 10;

  let daysLeft: number | null = null;
  if (settings.examDate) daysLeft = Math.max(0, Math.round((new Date(settings.examDate + 'T00:00:00').getTime() - today.getTime()) / 86400000));
  // imtihon sanasi bo'lmasa — daqiqadan kelib chiqib: 1 daqiqa ≈ 0.9 yangi so'z (takrorlash bilan birga)
  const wordsPerMinute = 0.9;
  const requiredPerDay = daysLeft && daysLeft > 0 ? Math.ceil(wordsRemaining / daysLeft) : Math.max(4, Math.round(settings.minutes * wordsPerMinute * 0.6));

  let status: PlanReport['status'] = 'no_date';
  if (wordsRemaining === 0) status = 'done';
  else if (daysLeft !== null) {
    const ratio = currentPace / Math.max(1, requiredPerDay);
    status = ratio >= 1.15 ? 'ahead' : ratio >= 0.85 ? 'on_track' : 'behind';
  }

  // tavsiya etilgan daqiqa: kerakli so'z/kun ÷ 0.9 + takrorlash yuki
  const reviewLoad = Math.min(10, Math.round(stats.words.due * 0.25));
  const recommendedMinutes = Math.max(5, Math.min(60, Math.round(requiredPerDay / wordsPerMinute + reviewLoad)));

  const projectedDate = currentPace > 0 ? iso(new Date(today.getTime() + Math.ceil(wordsRemaining / currentPace) * 86400000)) : null;

  // zaif ko'nikmalar
  const skills: Record<string, number | null> = {
    listening: skillAcc(stats, ['listen', 'bingo']),
    grammar: skillAcc(stats, ['harmony', 'grammar', 'builder', 'tower']),
    speaking: skillAcc(stats, ['speak']),
    writing: skillAcc(stats, ['anagram', 'bridge', 'lesson']),
    vocab: skillAcc(stats, ['review', 'blitz', 'match', 'memory', 'rain']),
  };
  const weakSkills = Object.entries(skills).filter(([, v]) => v !== null && v < 0.7).sort((a, b) => (a[1] ?? 1) - (b[1] ?? 1)).map(([k]) => k);
  const untried = Object.entries(skills).filter(([, v]) => v === null).map(([k]) => k);

  // keyingi dars
  const completed = new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  const lessonsLeft = lessons.filter((l) => !completed.has(l.id)).sort((a, b) => a.unit_id - b.unit_id || a.order_index - b.order_index);
  const nextLesson = lessonsLeft[0] ?? null;
  const lessonsPerWeek = status === 'behind' ? 6 : status === 'ahead' ? 3 : 5;

  // haftalik reja
  const skillGames: Record<string, { mode: ModeId; icon: string; uz: string; tr: string }> = {
    listening: { mode: 'listen', icon: '🎧', uz: 'Tinglash', tr: 'Dinleme' },
    grammar: { mode: 'harmony', icon: '🎼', uz: 'Uyg‘unlik', tr: 'Ünlü uyumu' },
    speaking: { mode: 'speak', icon: '🎙️', uz: 'Gapirish', tr: 'Konuşma' },
    writing: { mode: 'anagram', icon: '🔡', uz: 'Harf terish', tr: 'Harf dizme' },
    vocab: { mode: 'blitz', icon: '⚡', uz: 'Blitz', tr: 'Blitz' },
  };
  const fun: ModeId[] = ['rain', 'memory', 'bingo', 'tower', 'bridge', 'roleplay', 'match'];
  const funMeta: Record<string, { icon: string; uz: string; tr: string }> = { rain: { icon: '🌧️', uz: 'So‘z yomg‘iri', tr: 'Kelime yağmuru' }, memory: { icon: '🃏', uz: 'Xotira kartalari', tr: 'Hafıza kartları' }, bingo: { icon: '🎱', uz: 'Bingo', tr: 'Bingo' }, tower: { icon: '🗼', uz: 'Minora', tr: 'Kule' }, bridge: { icon: '🌉', uz: 'So‘z ko‘prigi', tr: 'Kelime köprüsü' }, roleplay: { icon: '🎭', uz: 'Rol o‘yini', tr: 'Rol oyunu' }, match: { icon: '🔗', uz: 'Juftlash', tr: 'Eşleştirme' } };
  const todayModes = stats.today?.modes ?? {};
  const week: PlanDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const wd = d.getDay();
    const dateStr = iso(d);
    const tasks: PlanTask[] = [];
    const budget = Math.max(5, settings.minutes);
    // 1) takrorlash har kuni
    tasks.push({ id: 'review', mode: 'review', icon: '🧠', title: { uz: 'Takrorlash', tr: 'Tekrar' }, sub: { uz: i === 0 && stats.words.due ? `${stats.words.due} ta navbatda` : 'FSRS navbati', tr: i === 0 && stats.words.due ? `${stats.words.due} sırada` : 'FSRS sırası' }, minutes: Math.min(6, Math.max(3, Math.round(budget * 0.3))), href: '/play/review' });
    // 2) dars (haftasiga lessonsPerWeek kun)
    const lessonDays = lessonsPerWeek >= 6 ? [1, 2, 3, 4, 5, 6] : lessonsPerWeek === 5 ? [1, 2, 3, 4, 5] : [1, 3, 5];
    const lessonDay = lessonDays.includes(wd) && nextLesson;
    if (lessonDay && budget >= 10) tasks.push({ id: 'lesson', mode: 'lesson', icon: '📘', title: { uz: 'Yangi dars', tr: 'Yeni ders' }, sub: i === 0 && nextLesson ? { uz: nextLesson.title_uz, tr: nextLesson.title_tr ?? nextLesson.title_uz } : { uz: '8 so‘z + 1 qoida', tr: '8 kelime + 1 kural' }, minutes: 8, href: i === 0 && nextLesson ? `/learn/${nextLesson.id}` : '/learn' });
    // 3) ko'nikma: zaif → ko'proq; kun bo'yicha rotatsiya
    const skillOrder = [...weakSkills, ...untried, 'vocab', 'listening', 'grammar', 'speaking', 'writing'].filter((v, k, a) => a.indexOf(v) === k);
    const sk = skillOrder[(i + (weakSkills.length ? 0 : wd)) % Math.max(1, Math.min(skillOrder.length, weakSkills.length ? 2 : 5))];
    const g = skillGames[sk] ?? skillGames.vocab;
    let focus = { uz: g.uz, tr: g.tr };
    if (wd === 0) {
      // yakshanba: sinov imtihoni yoki AI hikoya
      const examDay = settings.target !== 'A1' || (daysLeft !== null && daysLeft < 60);
      tasks.push(examDay ? { id: 'exam', mode: 'exam', icon: '🎓', title: { uz: 'Sinov imtihoni', tr: 'Deneme sınavı' }, sub: { uz: 'haftalik nazorat', tr: 'haftalık kontrol' }, minutes: 20, href: '/exam' } : { id: 'story', mode: 'story', icon: '📖', title: { uz: 'AI hikoya', tr: 'AI hikâye' }, sub: { uz: 'o‘qish + test', tr: 'okuma + test' }, minutes: 7, href: '/play/story' });
      focus = examDay ? { uz: 'Nazorat', tr: 'Kontrol' } : { uz: 'O‘qish', tr: 'Okuma' };
    } else if (wd === 6) {
      const f = fun[(i + Math.floor(today.getTime() / 604800000)) % fun.length];
      tasks.push({ id: f, mode: f, icon: funMeta[f].icon, title: funMeta[f], sub: { uz: 'o‘yin kuni', tr: 'oyun günü' }, minutes: 5, href: `/play/${f}` });
      focus = { uz: 'O‘yin', tr: 'Oyun' };
    } else {
      tasks.push({ id: g.mode, mode: g.mode, icon: g.icon, title: { uz: g.uz, tr: g.tr }, sub: weakSkills.includes(sk) ? { uz: 'zaif ko‘nikma — ustuvor', tr: 'zayıf beceri — öncelik' } : { uz: 'ko‘nikma mashqi', tr: 'beceri çalışması' }, minutes: 5, href: `/play/${g.mode}` });
      if (budget >= 20) { const f = fun[(i * 3 + wd) % fun.length]; tasks.push({ id: f, mode: f, icon: funMeta[f].icon, title: funMeta[f], sub: { uz: 'bonus', tr: 'bonus' }, minutes: 4, href: `/play/${f}` }); }
    }
    if (budget >= 30 && wd % 3 === 0) tasks.push({ id: 'tutor', mode: 'tutor', icon: '🤖', title: { uz: 'AI o‘qituvchi', tr: 'AI öğretmen' }, sub: { uz: 'turkcha suhbat', tr: 'Türkçe sohbet' }, minutes: 8, href: '/tutor' });
    if (i === 0) for (const t of tasks) t.done = Boolean(todayModes[t.mode === 'lesson' ? 'lesson' : t.mode]) || (t.mode === 'review' && (stats.today?.reviews ?? 0) >= 10);
    week.push({ date: dateStr, weekday: wd, label: { uz: WD_UZ[wd], tr: WD_TR[wd] }, tasks, minutes: tasks.reduce((a, t) => a + t.minutes, 0), isToday: i === 0, focus });
  }

  // bosqichlar
  const pace = Math.max(currentPace, requiredPerDay, 1);
  const milestones: Milestone[] = LEVEL_ORDER.filter((lv) => LEVEL_ORDER.indexOf(lv) <= LEVEL_ORDER.indexOf(settings.target)).map((lv) => {
    const need = LEVEL_WORDS[lv];
    const reached = wordsKnown >= need;
    const days = reached ? 0 : Math.ceil((need - wordsKnown) / pace);
    return { level: lv, words: need, reached, daysFromNow: reached ? 0 : days, date: reached ? null : iso(new Date(today.getTime() + days * 86400000)) };
  });

  // moslashuv izohlari
  const adjustments: { uz: string; tr: string }[] = [];
  if (status === 'behind') adjustments.push({ uz: `Sur’at kerakligidan past (${currentPace} / ${requiredPerDay} so‘z/kun). Reja: haftasiga ${lessonsPerWeek} dars, kunlik ${recommendedMinutes} daqiqa tavsiya etiladi yoki sanani ${projectedDate ?? '—'} ga suring.`, tr: `Hız gerekenden düşük (${currentPace} / ${requiredPerDay} kelime/gün). Plan: haftada ${lessonsPerWeek} ders, günde ${recommendedMinutes} dakika öneriliyor ya da tarihi ${projectedDate ?? '—'} olarak değiştirin.` });
  if (status === 'ahead') adjustments.push({ uz: 'Siz oldindasiz — reja darslarni 3 kunga kamaytirdi, o‘yin va gapirishga ko‘proq vaqt ajratdi.', tr: 'İleridesiniz — plan dersleri 3 güne indirdi, oyun ve konuşmaya daha fazla zaman ayırdı.' });
  if (stats.words.due >= 20) adjustments.push({ uz: `Takrorlash navbati katta (${stats.words.due}). Bugun avval takrorlash, yangi so‘zlar keyin.`, tr: `Tekrar sırası büyük (${stats.words.due}). Bugün önce tekrar, yeni kelimeler sonra.` });
  if (weakSkills.length) adjustments.push({ uz: `Zaif ko‘nikmalar: ${weakSkills.map((s) => skillGames[s]?.uz ?? s).join(', ')} — hafta ichida 2 marta ustuvor qo‘yildi.`, tr: `Zayıf beceriler: ${weakSkills.map((s) => skillGames[s]?.tr ?? s).join(', ')} — hafta içinde 2 kez öncelik verildi.` });
  if (untried.includes('speaking')) adjustments.push({ uz: 'Gapirish hali sinalmagan — sertifikatda alohida bo‘lim. Rejaga qo‘shildi.', tr: 'Konuşma henüz denenmedi — sertifikada ayrı bölüm. Plana eklendi.' });
  if (daysLeft !== null && daysLeft < 30 && daysLeft > 0) adjustments.push({ uz: `Imtihonga ${daysLeft} kun. Har yakshanba sinov imtihoni; so‘nggi haftada yangi so‘z o‘rniga takrorlash.`, tr: `Sınava ${daysLeft} gün. Her pazar deneme sınavı; son hafta yeni kelime yerine tekrar.` });
  if (!adjustments.length) adjustments.push({ uz: 'Reja holatingizga mos. Har kirishda qayta hisoblanadi.', tr: 'Plan durumunuza uygun. Her girişte yeniden hesaplanır.' });

  return { settings, daysLeft, targetWords, wordsKnown, wordsRemaining, progressPct, requiredPerDay, currentPace, status, recommendedMinutes, projectedDate, week, milestones, adjustments, weakSkills };
}
