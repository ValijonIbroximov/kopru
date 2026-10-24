'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Gift, Sparkles, Check, ChevronRight, Map } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { ProgressRing, Bar, Skeleton } from '@/components/ui';
import Reveal, { CountUp } from '@/components/visual/Reveal';
import Tour, { tourSeen, type TourStep } from '@/components/Tour';
import Tip from '@/components/Tip';
import Feed from '@/components/social/Feed';
import { fetchStats, fetchQuests, claimQuest, fetchLessonProgress, fetchLessons, fetchUnits, fetchAiJobs, isLocal, type UserStats } from '@/lib/data';
import { fetchFriends, fetchChallenges, fetchMyClub, fetchHighScores, dailyKey } from '@/lib/social';
import { analyzeMotivation, MODES, type MotivationReport } from '@/lib/motivation';
import { buildSuggestions, dailyPlan, type Suggestion } from '@/lib/suggestions';
import { computePlan, getPlanSettings, type PlanReport } from '@/lib/plan';
import { useLang } from '@/lib/i18n';
import { themeById } from '@/lib/themes';
import type { Lesson, LessonProgress, Quest, Unit, UserQuest } from '@/lib/types';
import { leagueIcon, leagueLabel, levelProgress, cn } from '@/lib/utils';

const TOUR: TourStep[] = [
  { target: 'goal', title: { uz: 'Kunlik maqsad', tr: 'Günlük hedef' }, text: { uz: 'Halqa to‘lsa — kun hisobda, streak saqlanadi. 10 daqiqa yetadi. Streak muzlatish bir kunni o‘tkazib yuborishdan himoya qiladi.', tr: 'Halka dolunca gün sayılır, seri korunur. 10 dakika yeter. Seri dondurma bir günü kaçırmaktan korur.' } },
  { target: 'plan', title: { uz: 'Bugungi reja', tr: 'Bugünkü plan' }, text: { uz: 'Moslashuvchan reja: takrorlash (xotira), dars (bilim), o‘yin (qiziqish). Imtihon sanasini «Reja» bo‘limida kiriting — har kun avtomatik qayta hisoblanadi.', tr: 'Uyarlanabilir plan: tekrar (hafıza), ders (bilgi), oyun (ilgi). Sınav tarihini «Plan» bölümünde girin — her gün otomatik yeniden hesaplanır.' } },
  { target: 'suggest', title: { uz: 'Murabbiy takliflari', tr: 'Koç önerileri' }, text: { uz: 'Holatingizga qarab aqlli takliflar: navbat to‘plandi, do‘st chaqirdi, yangi o‘yin, kunlik Blitz…', tr: 'Durumunuza göre akıllı öneriler: sıra birikti, arkadaş davet etti, yeni oyun, günlük Blitz…' } },
  { target: 'quests', title: { uz: 'Vazifalar', tr: 'Görevler' }, text: { uz: 'Kunlik va haftalik questlar — qo‘shimcha XP. Bajarilgach «Olish» tugmasini bosing.', tr: 'Günlük ve haftalık görevler — ekstra XP. Tamamlanınca «Al» düğmesine basın.' } },
  { target: 'modes', title: { uz: '21 ta o‘yin', tr: '21 oyun' }, text: { uz: 'Har kuni boshqa rejim. Har o‘yinning birinchi kirishida qisqa o‘rgatuvchi chiqadi. «?» tugmasi bilan qaytarish mumkin.', tr: 'Her gün farklı bir mod. Her oyuna ilk girişte kısa bir öğretici çıkar. «?» ile tekrar açılabilir.' } },
  { target: 'nav-friends-m', title: { uz: 'Do‘stlar', tr: 'Arkadaşlar' }, text: { uz: 'Do‘st qo‘shing, chaqiriq yuboring, chat qiling, klub tuzing. Raqobat — eng kuchli motivatsiya.', tr: 'Arkadaş ekleyin, meydan okuyun, sohbet edin, kulüp kurun. Rekabet — en güçlü motivasyon.' } },
];

const TONE: Record<Suggestion['tone'], string> = { ember: 'from-ember-500/25 to-ember-500/5 border-ember-400/30', teal: 'from-teal-500/25 to-teal-500/5 border-teal-400/30', gold: 'from-gold-400/25 to-gold-400/5 border-gold-400/30', violet: 'from-violet-500/25 to-violet-500/5 border-violet-400/30', rose: 'from-rose-500/25 to-rose-500/5 border-rose-400/30' };

const STATUS_STYLE: Record<PlanReport['status'], string> = { ahead: 'text-teal-300', on_track: 'text-teal-300', behind: 'text-ember-300', no_date: 'text-ink-300', done: 'text-gold-300' };

function DashboardInner() {
  const params = useSearchParams();
  const { profile, settings, refresh, loading } = useProfile();
  const { push } = useToast();
  const { t, l, lang } = useLang();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [quests, setQuests] = useState<(UserQuest & { quest: Quest })[]>([]);
  const [nextLesson, setNextLesson] = useState<{ lesson: Lesson; unit: Unit | undefined } | null>(null);
  const [lessonData, setLessonData] = useState<{ lessons: Lesson[]; progress: LessonProgress[] }>({ lessons: [], progress: [] });
  const [aiReady, setAiReady] = useState(0);
  const [social, setSocial] = useState({ friends: 0, inClub: false, pendingChallenges: 0, dailyPlayed: false, dailyTop: [] as { name: string; score: number; me: boolean }[] });
  const [ready, setReady] = useState(false);
  const [tour, setTour] = useState(false);

  useEffect(() => {
    if (loading || !profile) return;
    (async () => {
      const [s, q, lp, lessons, units, jobs, friends, chall, club, daily] = await Promise.all([fetchStats(), fetchQuests(), fetchLessonProgress(), fetchLessons(), fetchUnits(), fetchAiJobs(), fetchFriends(), fetchChallenges(), fetchMyClub(), fetchHighScores(dailyKey(), 3)]);
      setStats(s); setQuests(q); setLessonData({ lessons, progress: lp });
      const order = lessons.slice().sort((a, b) => (units.find((u) => u.id === a.unit_id)?.order_index ?? 0) - (units.find((u) => u.id === b.unit_id)?.order_index ?? 0) || a.order_index - b.order_index);
      const completed = new Set(lp.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
      const inProgress = lp.find((p) => p.status === 'in_progress');
      const nl = (inProgress && order.find((l) => l.id === inProgress.lesson_id)) || order.find((l) => !completed.has(l.id)) || null;
      setNextLesson(nl ? { lesson: nl, unit: units.find((u) => u.id === nl.unit_id) } : null);
      setAiReady(jobs.filter((j) => j.status === 'done' && j.result).length);
      setSocial({
        friends: friends.length, inClub: Boolean(club),
        pendingChallenges: chall.filter((c) => c.status === 'pending' && c.opponent_id === profile.id && c.opponent_score === null && new Date(c.expires_at) > new Date()).length,
        dailyPlayed: daily.some((h) => h.user_id === profile.id),
        dailyTop: daily.map((h) => ({ name: h.profile?.display_name ?? h.profile?.username ?? '', score: h.score, me: h.user_id === profile.id })),
      });
      setReady(true);
      if (params.get('tour') === '1' || (!tourSeen('dashboard') && profile.onboarded)) setTimeout(() => setTour(true), 600);
    })();
  }, [loading, profile, params]);

  const report: MotivationReport | null = useMemo(() => {
    if (!profile || !stats) return null;
    const totals = Object.values(stats.modes).reduce((a, m) => ({ c: a.c + m.correct, t: a.t + m.total }), { c: 0, t: 0 });
    return analyzeMotivation(profile, stats.heatmap, settings, totals.t >= 10 ? totals.c / totals.t : null);
  }, [profile, stats, settings]);

  const planSettings = useMemo(() => getPlanSettings(profile), [profile]);
  const planReport = useMemo(() => {
    if (!profile || !stats || !planSettings) return null;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try { return computePlan(planSettings, profile, stats, lessonData.lessons, lessonData.progress, todayStr); } catch { return null; }
  }, [profile, stats, planSettings, lessonData]);

  const suggestions = useMemo(() => (profile && stats ? buildSuggestions(profile, stats, settings, report, { ...social, hour: new Date().getHours(), hasPlan: Boolean(planSettings) }) : []), [profile, stats, settings, report, social, planSettings]);
  const simplePlan = useMemo(() => (profile && stats ? dailyPlan(stats, profile, nextLesson?.lesson.id ?? null) : []), [profile, stats, nextLesson]);

  if (!profile || !ready || !stats) return <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-24" /><Skeleton className="h-48" /></div>;

  // Bugungi vazifalar: moslashuvchan reja bo'lsa — undan, bo'lmasa 3 qadamli oddiy reja
  const todayPlan = planReport?.week.find((d) => d.isToday);
  const tasks = todayPlan
    ? todayPlan.tasks.map((x) => ({ id: x.id, icon: x.icon, title: x.title, sub: x.sub ?? { uz: '', tr: '' }, min: x.minutes, done: Boolean(x.done), href: x.href }))
    : simplePlan;
  const planDone = tasks.filter((p) => p.done).length;
  const planLeft = tasks.reduce((a, p) => a + (p.done ? 0 : p.min), 0);

  const minutesToday = stats.today?.minutes ?? 0;
  const goalPct = Math.min(100, (minutesToday / Math.max(1, profile.daily_goal_min)) * 100);
  const lvl = levelProgress(profile.xp, profile.level);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const comebackMult = report?.comeback ? settings.xp.comeback_multiplier : 1;
  const theme = themeById((profile.settings as { theme?: string })?.theme);

  async function claim(uq: UserQuest & { quest: Quest }) {
    const r = await claimQuest(uq.id);
    if (r?.ok) { push({ kind: 'xp', icon: uq.quest.icon, title: `+${uq.quest.xp_reward} XP`, body: uq.quest.title_uz }); setQuests(await fetchQuests()); await refresh(); }
  }

  return (
    <div className="space-y-5">
      <Tour id="dashboard" steps={TOUR} open={tour} onClose={() => setTour(false)} />
      {isLocal() && <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm text-gold-200">{t('demo_banner')}</div>}

      {/* Salom + kunlik maqsad */}
      <Reveal variant="fade">
        <section className="card glass p-5" data-tour="goal">
          <div className="flex items-center gap-4">
            <div className="relative">
              {goalPct >= 100 && <div className="rays absolute -inset-3 rounded-full opacity-70" />}
              <ProgressRing value={goalPct} size={96} color={goalPct >= 100 ? '#2fd1bc' : '#ff6a2a'}>
                <div className="text-center"><div className="font-display text-xl font-bold"><CountUp value={minutesToday} /></div><div className="text-[10px] text-ink-400">/ {profile.daily_goal_min} {t('minutes')}</div></div>
              </ProgressRing>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-ink-400">{greet}, {profile.display_name ?? profile.username} {profile.avatar} · <Link href="/profile" className="text-ink-500 hover:text-ink-300">🎨 {l(theme.name)}</Link></div>
              <div className="font-display text-xl font-bold">{goalPct >= 100 ? l({ uz: 'Bugungi maqsad bajarildi! 🎉', tr: 'Bugünkü hedef tamamlandı! 🎉' }) : report?.comeback ? l({ uz: 'Qaytganingiz bilan! ⚡', tr: 'Tekrar hoş geldiniz! ⚡' }) : l({ uz: `Bugun ${Math.max(0, profile.daily_goal_min - minutesToday)} daqiqa qoldi`, tr: `Bugün ${Math.max(0, profile.daily_goal_min - minutesToday)} dakika kaldı` })}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="chip">🔥 {profile.streak} {t('day')}</span>
                <span className="chip">🧊 {profile.streak_freezes}</span>
                <span className="chip">{leagueIcon(profile.league)} {leagueLabel(profile.league)} · #{stats.rank}</span>
                {comebackMult > 1 && <span className="chip border-gold-400/40 text-gold-300">XP ×{comebackMult} {t('today')}</span>}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-ink-400"><span>Lvl {profile.level}</span><span>{profile.xp - lvl.cur} / {lvl.next - lvl.cur} XP</span></div>
            <Bar value={lvl.pct} color="bg-gradient-to-r from-gold-400 to-ember-500" />
          </div>
        </section>
      </Reveal>

      {/* Bugungi reja (moslashuvchan) */}
      <Reveal delay={60}>
        <section data-tour="plan">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{l({ uz: 'Bugungi reja', tr: 'Bugünkü plan' })}{todayPlan && <span className="ml-2 text-xs font-normal text-ink-400">· {l(todayPlan.focus)}</span>}</h2>
            <span className="text-xs text-ink-400">{planDone}/{tasks.length} · ~{planLeft} {t('minutes')} {l({ uz: 'qoldi', tr: 'kaldı' })}</span>
          </div>
          <div className={cn('grid gap-2', tasks.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4')}>
            {tasks.map((p, i) => (
              <Link key={p.id} href={p.href} className={cn('card-soft glass tilt flex items-center gap-3 p-3', p.done && 'opacity-70')}>
                <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl', p.done ? 'bg-teal-500/20' : 'bg-white/5')}>{p.done ? <Check size={18} className="text-teal-300" /> : p.icon}</div>
                <div className="min-w-0 flex-1"><div className={cn('text-sm font-semibold', p.done ? 'line-through text-ink-300' : 'text-white')}>{i + 1}. {l(p.title)}</div><div className="truncate text-xs text-ink-400">{l(p.sub)}{l(p.sub) ? ' · ' : ''}{p.min} {t('minutes')}</div></div>
                {!p.done && <ChevronRight size={16} className="text-ink-500" />}
              </Link>
            ))}
          </div>
          {planReport ? (
            <Link href="/plan" className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs">
              <span className="flex items-center gap-2 text-ink-300"><Map size={14} className="text-teal-300" /> {planReport.settings.target} · {planReport.progressPct}% · <span className={STATUS_STYLE[planReport.status]}>{l({ ahead: { uz: 'rejadan oldinda', tr: 'planın önünde' }, on_track: { uz: 'reja bo‘yicha', tr: 'planda' }, behind: { uz: 'reja ortida', tr: 'planın gerisinde' }, no_date: { uz: 'imtihon sanasi yo‘q', tr: 'sınav tarihi yok' }, done: { uz: 'maqsadga yetildi', tr: 'hedefe ulaşıldı' } }[planReport.status])}</span>{planReport.daysLeft !== null && <span className="text-ink-500">· {planReport.daysLeft} {t('day')}</span>}</span>
              <span className="text-ember-300">{l({ uz: 'to‘liq reja →', tr: 'tam plan →' })}</span>
            </Link>
          ) : (
            <Link href="/plan" className="mt-2 flex items-center justify-between rounded-2xl border border-teal-400/20 bg-teal-500/[0.07] px-4 py-2.5 text-xs">
              <span className="flex items-center gap-2 text-ink-200"><Map size={14} className="text-teal-300" /> {l({ uz: 'Imtihon sanasi va maqsad darajani kiriting — reja har kun sizga moslashadi', tr: 'Sınav tarihini ve hedef seviyeyi girin — plan her gün size uyarlanır' })}</span>
              <span className="shrink-0 text-teal-300">{l({ uz: 'Reja tuzish →', tr: 'Plan oluştur →' })}</span>
            </Link>
          )}
        </section>
      </Reveal>

      {/* Takliflar */}
      {suggestions.length > 0 && (
        <Reveal delay={100}>
          <section data-tour="suggest">
            <div className="mb-2 flex items-center gap-2 font-display text-lg font-bold"><Sparkles size={18} className="text-ember-300" /> {l({ uz: 'Murabbiy taklifi', tr: 'Koç önerisi' })}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {suggestions.map((s, i) => (
                <Link key={s.id} href={s.href} className={cn('card tilt bg-gradient-to-br p-4', TONE[s.tone])} style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="text-2xl">{s.icon}</div>
                  <div className="mt-1 font-display text-base font-bold leading-tight">{l(s.title)}</div>
                  <div className="mt-1 text-xs text-ink-200">{l(s.text)}</div>
                  <div className="mt-2 text-xs font-semibold text-white">{l(s.cta)} →</div>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* Motivatsiya xabarlari */}
      {report && report.messages.length > 0 && (
        <Reveal delay={120}>
          <section className="rounded-2xl border border-ember-400/20 bg-ember-500/[0.07] p-4 text-sm">
            <ul className="space-y-1 text-ink-100">{report.messages.slice(0, 2).map((m, i) => <li key={i}>• {l(m)}</li>)}</ul>
          </section>
        </Reveal>
      )}

      {/* Kunlik chaqiriq + keyingi dars */}
      <Reveal delay={140}>
        <div className="grid gap-3 sm:grid-cols-2">
          {nextLesson && (
            <Link href={`/learn/${nextLesson.lesson.id}`} className="card glass tilt relative overflow-hidden p-4">
              <div className="absolute -right-4 -top-4 text-7xl opacity-10">{nextLesson.unit?.icon}</div>
              <div className="text-xs text-ink-400">{nextLesson.unit?.icon} {lang === 'tr' && nextLesson.unit?.title_tr ? nextLesson.unit.title_tr : nextLesson.unit?.title_uz} · {nextLesson.lesson.kind === 'boss' ? 'BOSS' : t('lesson')}</div>
              <div className="mt-1 font-display text-lg font-bold">{lang === 'tr' && nextLesson.lesson.title_tr ? nextLesson.lesson.title_tr : nextLesson.lesson.title_uz}</div>
              <div className="mt-2 text-xs text-ember-300">{t('continue')} → +{nextLesson.lesson.xp_reward} XP</div>
            </Link>
          )}
          <Link href="/play/blitz?daily=1" className="card glass tilt relative overflow-hidden p-4">
            <div className="absolute -right-4 -top-4 text-7xl opacity-10">⚡</div>
            <div className="text-xs text-ink-400">📅 {l({ uz: 'Kunlik Blitz chaqirig‘i · hamma uchun bir xil', tr: 'Günlük Blitz meydan okuması · herkes için aynı' })}</div>
            <div className="mt-1 font-display text-lg font-bold">{social.dailyPlayed ? l({ uz: 'Natijangizni yaxshilang', tr: 'Sonucunuzu geliştirin' }) : l({ uz: '60 soniya — reytingga kiring', tr: '60 saniye — sıralamaya girin' })}</div>
            <div className="mt-2 flex flex-wrap gap-1 text-xs">
              {social.dailyTop.length ? social.dailyTop.map((x, i) => <span key={i} className={cn('chip', x.me && 'border-gold-400 text-gold-300')}>{['🥇', '🥈', '🥉'][i]} {x.name} {x.score}</span>) : <span className="text-gold-300">{l({ uz: 'Hali hech kim o‘ynamadi — birinchi bo‘ling!', tr: 'Henüz kimse oynamadı — ilk siz olun!' })}</span>}
            </div>
          </Link>
        </div>
      </Reveal>

      {stats.words.due > 0 && (
        <Reveal delay={160}>
          <Link href="/play/review" className="card glass tilt flex items-center gap-3 p-4 transition hover:border-teal-400/40">
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-teal-500/20 text-2xl pulse-ring">🧠</div>
            <div className="flex-1"><div className="font-display text-base font-bold">{l({ uz: `${stats.words.due} ta so‘z unutilish arafasida`, tr: `${stats.words.due} kelime unutulmak üzere` })}</div><div className="text-xs text-ink-300">{l({ uz: '5 daqiqada mustahkamlang — FSRS aynan hozir takrorlashni tavsiya qiladi', tr: '5 dakikada pekiştirin — FSRS tam şimdi tekrar öneriyor' })}</div></div>
            <ChevronRight className="text-teal-300" />
          </Link>
        </Reveal>
      )}

      {aiReady > 0 && (
        <Link href="/play/story" className="flex items-center gap-3 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4 text-sm">
          <span className="text-2xl">🤖</span><div><div className="font-semibold text-white">{l({ uz: `AI ${aiReady} ta material tayyorladi`, tr: `AI ${aiReady} materyal hazırladı` })}</div><div className="text-ink-300">{l({ uz: 'Limit tugaganida navbatga qo‘ygan hikoyalaringiz tayyor.', tr: 'Limit bitince sıraya aldığınız hikayeler hazır.' })}</div></div>
        </Link>
      )}

      {/* Questlar */}
      {quests.length > 0 && (
        <Reveal delay={180}>
          <section data-tour="quests">
            <h2 className="mb-2 font-display text-lg font-bold">{l({ uz: 'Vazifalar', tr: 'Görevler' })}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {quests.slice(0, 8).map((uq) => {
                const pct = Math.min(100, (uq.progress / uq.quest.target) * 100);
                const done = Boolean(uq.completed_at);
                return (
                  <div key={uq.quest.id + uq.period_key} className={cn('card-soft glass flex items-center gap-3 p-3', done && !uq.claimed && 'border-gold-400/40 bg-gold-400/10')}>
                    <div className="text-2xl">{uq.quest.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm"><span className="truncate font-medium">{uq.quest.title_uz}</span><span className="text-xs text-ink-400">{uq.quest.kind === 'weekly' ? l({ uz: 'hafta', tr: 'hafta' }) : uq.quest.kind === 'once' ? l({ uz: 'bir martalik', tr: 'tek seferlik' }) : t('today')}</span></div>
                      <Bar value={pct} color={done ? 'bg-gold-400' : 'bg-teal-500'} className="mt-1.5 h-1.5" />
                      <div className="mt-1 text-xs text-ink-400">{uq.progress}/{uq.quest.target} · +{uq.quest.xp_reward} XP</div>
                    </div>
                    {done && !uq.claimed && uq.id > 0 && <button className="btn-primary px-3 py-2 text-xs" onClick={() => claim(uq)}><Gift size={14} /> {l({ uz: 'Olish', tr: 'Al' })}</button>}
                    {uq.claimed && <span className="text-xs text-teal-300">✓</span>}
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>
      )}

      {/* Do'stlar lentasi */}
      {!isLocal() && (
        <Reveal delay={200}>
          <section>
            <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">{l({ uz: 'Do‘stlar nima qilyapti', tr: 'Arkadaşlar ne yapıyor' })}</h2><Link href="/friends?tab=feed" className="text-xs text-ember-300">{l({ uz: 'lenta →', tr: 'akış →' })}</Link></div>
            <Tip id="feed-intro" text={{ uz: 'Do‘stlaringiz va klubdoshlaringizning yutuqlari shu yerda. 👏 yoki 🔥 bosing — ularga bildirishnoma boradi. Siz ham ko‘rinasiz: dars, rekord, streak.', tr: 'Arkadaşlarınızın ve kulüp üyelerinizin başarıları burada. 👏 ya da 🔥 basın — onlara bildirim gider. Siz de görünürsünüz: ders, rekor, seri.' }} />
            <Feed compact limit={8} />
          </section>
        </Reveal>
      )}

      {/* Qisqa statistika */}
      <Reveal delay={220}>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: l({ uz: 'So‘zlar', tr: 'Kelimeler' }), v: stats.words.learning + stats.words.review + stats.words.mastered, s: `${stats.words.mastered} ${l({ uz: 'mukammal', tr: 'mükemmel' })}` },
            { l: t('lessons'), v: stats.lessons.completed, s: `/ ${stats.lessons.total}` },
            { l: l({ uz: 'Jami daqiqa', tr: 'Toplam dakika' }), v: stats.totals.minutes, s: `${stats.totals.active_days} ${l({ uz: 'faol kun', tr: 'aktif gün' })}` },
            { l: l({ uz: 'Aniqlik', tr: 'Doğruluk' }), v: stats.totals.reviews ? Math.round((stats.totals.correct / stats.totals.reviews) * 100) : 0, s: `${stats.totals.reviews} ${l({ uz: 'takrorlash', tr: 'tekrar' })}`, suffix: stats.totals.reviews ? '%' : '' },
          ].map((k) => (
            <div key={k.l} className="card-soft glass p-3"><div className="text-xs text-ink-400">{k.l}</div><div className="font-display text-2xl font-bold"><CountUp value={k.v} suffix={k.suffix ?? ''} /></div><div className="text-xs text-ink-400">{k.s}</div></div>
          ))}
        </section>
      </Reveal>

      {/* Barcha rejimlar */}
      <Reveal delay={240}>
        <section data-tour="modes">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">{l({ uz: 'O‘yin rejimlari', tr: 'Oyun modları' })}</h2><Link href="/play" className="text-xs text-ember-300">{l({ uz: 'barchasi', tr: 'tümü' })} ({MODES.length}) →</Link></div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {MODES.filter((m) => settings.features[m.id] !== false).map((m) => (
              <Link key={m.id} href={m.href} className="card-soft glass relative flex w-28 shrink-0 flex-col items-center gap-1 p-3 text-center text-xs transition hover:bg-white/[0.06]">
                {m.isNew && !(profile.interests ?? {})[m.id] && <span className="absolute right-1 top-1 rounded-full bg-ember-500 px-1.5 text-[9px] font-bold text-white">{l({ uz: 'yangi', tr: 'yeni' })}</span>}
                <span className="text-2xl">{m.icon}</span><span className="font-medium">{l(m.title)}</span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}

export default function Dashboard() {
  return <Suspense fallback={<div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-24" /></div>}><DashboardInner /></Suspense>;
}
