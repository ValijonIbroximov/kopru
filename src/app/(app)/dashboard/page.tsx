'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Gift, Sparkles, Check, ChevronRight } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { ProgressRing, Bar, Skeleton } from '@/components/ui';
import Reveal, { CountUp } from '@/components/visual/Reveal';
import Tour, { tourSeen, type TourStep } from '@/components/Tour';
import Tip from '@/components/Tip';
import Feed from '@/components/social/Feed';
import { SceneName } from '@/components/visual/SceneBackground';
import { fetchStats, fetchQuests, claimQuest, fetchLessonProgress, fetchLessons, fetchUnits, fetchAiJobs, isLocal, type UserStats } from '@/lib/data';
import { fetchFriends, fetchChallenges, fetchMyClub, fetchHighScores, dailyKey } from '@/lib/social';
import { analyzeMotivation, MODES, type MotivationReport } from '@/lib/motivation';
import { buildSuggestions, dailyPlan, type Suggestion } from '@/lib/suggestions';
import type { Lesson, Quest, Unit, UserQuest } from '@/lib/types';
import { leagueIcon, leagueLabel, levelProgress, cn } from '@/lib/utils';

const TOUR: TourStep[] = [
  { target: 'goal', title: 'Kunlik maqsad', text: 'Halqa to‘lsa — kun hisobda, streak saqlanadi. 10 daqiqa yetadi. Streak muzlatish bir kunni o‘tkazib yuborishdan himoya qiladi.' },
  { target: 'plan', title: 'Bugungi reja', text: '3 qadam: takrorlash (xotira), yangi dars (bilim), bitta o‘yin (qiziqish). Tartib muhim emas — bajarilgani belgilanadi.' },
  { target: 'suggest', title: 'Murabbiy takliflari', text: 'Holatingizga qarab aqlli takliflar: navbat to‘plandi, do‘st chaqirdi, yangi o‘yin, kunlik Blitz…' },
  { target: 'quests', title: 'Vazifalar', text: 'Kunlik va haftalik questlar — qo‘shimcha XP. Bajarilgach «Olish» tugmasini bosing.' },
  { target: 'modes', title: '21 ta o‘yin', text: 'Har kuni boshqa rejim. Har o‘yinning birinchi kirishida qisqa o‘rgatuvchi chiqadi. «?» tugmasi bilan qaytarish mumkin.' },
  { target: 'nav-friends-m', title: 'Do‘stlar', text: 'Do‘st qo‘shing, chaqiriq yuboring, chat qiling, klub tuzing. Raqobat — eng kuchli motivatsiya.' },
];

const TONE: Record<Suggestion['tone'], string> = { ember: 'from-ember-500/25 to-ember-500/5 border-ember-400/30', teal: 'from-teal-500/25 to-teal-500/5 border-teal-400/30', gold: 'from-gold-400/25 to-gold-400/5 border-gold-400/30', violet: 'from-violet-500/25 to-violet-500/5 border-violet-400/30', rose: 'from-rose-500/25 to-rose-500/5 border-rose-400/30' };

function DashboardInner() {
  const params = useSearchParams();
  const { profile, settings, refresh, loading } = useProfile();
  const { push } = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [quests, setQuests] = useState<(UserQuest & { quest: Quest })[]>([]);
  const [nextLesson, setNextLesson] = useState<{ lesson: Lesson; unit: Unit | undefined } | null>(null);
  const [aiReady, setAiReady] = useState(0);
  const [social, setSocial] = useState({ friends: 0, inClub: false, pendingChallenges: 0, dailyPlayed: false, dailyTop: [] as { name: string; score: number; me: boolean }[] });
  const [ready, setReady] = useState(false);
  const [tour, setTour] = useState(false);

  useEffect(() => {
    if (loading || !profile) return;
    (async () => {
      const [s, q, lp, lessons, units, jobs, friends, chall, club, daily] = await Promise.all([fetchStats(), fetchQuests(), fetchLessonProgress(), fetchLessons(), fetchUnits(), fetchAiJobs(), fetchFriends(), fetchChallenges(), fetchMyClub(), fetchHighScores(dailyKey(), 3)]);
      setStats(s); setQuests(q);
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

  const suggestions = useMemo(() => (profile && stats ? buildSuggestions(profile, stats, settings, report, { ...social, hour: new Date().getHours() }) : []), [profile, stats, settings, report, social]);
  const plan = useMemo(() => (profile && stats ? dailyPlan(stats, profile, nextLesson?.lesson.id ?? null) : []), [profile, stats, nextLesson]);

  if (!profile || !ready || !stats) return <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-24" /><Skeleton className="h-48" /></div>;

  const minutesToday = stats.today?.minutes ?? 0;
  const goalPct = Math.min(100, (minutesToday / Math.max(1, profile.daily_goal_min)) * 100);
  const lvl = levelProgress(profile.xp, profile.level);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const comebackMult = report?.comeback ? settings.xp.comeback_multiplier : 1;
  const planDone = plan.filter((p) => p.done).length;

  async function claim(uq: UserQuest & { quest: Quest }) {
    const r = await claimQuest(uq.id);
    if (r?.ok) { push({ kind: 'xp', icon: uq.quest.icon, title: `+${uq.quest.xp_reward} XP`, body: uq.quest.title_uz }); setQuests(await fetchQuests()); await refresh(); }
  }

  return (
    <div className="space-y-5">
      <Tour id="dashboard" steps={TOUR} open={tour} onClose={() => setTour(false)} />
      {isLocal() && <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm text-gold-200">Demo rejim: progress faqat shu brauzerda. README.md → Supabase ulash (do‘stlar, klublar, reyting uchun).</div>}

      {/* Salom + kunlik maqsad */}
      <Reveal variant="fade">
        <section className="card glass p-5" data-tour="goal">
          <div className="flex items-center gap-4">
            <div className="relative">
              {goalPct >= 100 && <div className="rays absolute -inset-3 rounded-full opacity-70" />}
              <ProgressRing value={goalPct} size={96} color={goalPct >= 100 ? '#2fd1bc' : '#ff6a2a'}>
                <div className="text-center"><div className="font-display text-xl font-bold"><CountUp value={minutesToday} /></div><div className="text-[10px] text-ink-400">/ {profile.daily_goal_min} daq</div></div>
              </ProgressRing>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-ink-400">{greet}, {profile.display_name ?? profile.username} {profile.avatar} · <span className="text-ink-500"><SceneName sceneId={(profile.settings as { scene?: string })?.scene} /></span></div>
              <div className="font-display text-xl font-bold">{goalPct >= 100 ? 'Bugungi maqsad bajarildi! 🎉' : report?.comeback ? 'Qaytganingiz bilan! 🌉' : `Bugun ${Math.max(0, profile.daily_goal_min - minutesToday)} daqiqa qoldi`}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="chip">🔥 {profile.streak} kun</span>
                <span className="chip">🧊 {profile.streak_freezes}</span>
                <span className="chip">{leagueIcon(profile.league)} {leagueLabel(profile.league)} · #{stats.rank}</span>
                {comebackMult > 1 && <span className="chip border-gold-400/40 text-gold-300">XP ×{comebackMult} bugun</span>}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-ink-400"><span>Lvl {profile.level}</span><span>{profile.xp - lvl.cur} / {lvl.next - lvl.cur} XP</span></div>
            <Bar value={lvl.pct} color="bg-gradient-to-r from-gold-400 to-ember-500" />
          </div>
        </section>
      </Reveal>

      {/* Bugungi reja */}
      <Reveal delay={60}>
        <section data-tour="plan">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Bugungi reja</h2><span className="text-xs text-ink-400">{planDone}/3 · ~{plan.reduce((a, p) => a + (p.done ? 0 : p.min), 0)} daq qoldi</span></div>
          <div className="grid gap-2 sm:grid-cols-3">
            {plan.map((p, i) => (
              <Link key={p.id} href={p.href} className={cn('card-soft glass tilt flex items-center gap-3 p-3', p.done && 'opacity-70')}>
                <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl', p.done ? 'bg-teal-500/20' : 'bg-white/5')}>{p.done ? <Check size={18} className="text-teal-300" /> : p.icon}</div>
                <div className="min-w-0 flex-1"><div className={cn('text-sm font-semibold', p.done ? 'line-through text-ink-300' : 'text-white')}>{i + 1}. {p.title}</div><div className="truncate text-xs text-ink-400">{p.sub} · {p.min} daq</div></div>
                {!p.done && <ChevronRight size={16} className="text-ink-500" />}
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Takliflar */}
      {suggestions.length > 0 && (
        <Reveal delay={100}>
          <section data-tour="suggest">
            <div className="mb-2 flex items-center gap-2 font-display text-lg font-bold"><Sparkles size={18} className="text-ember-300" /> Murabbiy taklifi</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {suggestions.map((s, i) => (
                <Link key={s.id} href={s.href} className={cn('card tilt bg-gradient-to-br p-4', TONE[s.tone])} style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="text-2xl">{s.icon}</div>
                  <div className="mt-1 font-display text-base font-bold leading-tight">{s.title}</div>
                  <div className="mt-1 text-xs text-ink-200">{s.text}</div>
                  <div className="mt-2 text-xs font-semibold text-white">{s.cta} →</div>
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
            <ul className="space-y-1 text-ink-100">{report.messages.slice(0, 2).map((m, i) => <li key={i}>• {m}</li>)}</ul>
          </section>
        </Reveal>
      )}

      {/* Kunlik chaqiriq + keyingi dars */}
      <Reveal delay={140}>
        <div className="grid gap-3 sm:grid-cols-2">
          {nextLesson && (
            <Link href={`/learn/${nextLesson.lesson.id}`} className="card glass tilt relative overflow-hidden p-4">
              <div className="absolute -right-4 -top-4 text-7xl opacity-10">{nextLesson.unit?.icon}</div>
              <div className="text-xs text-ink-400">{nextLesson.unit?.icon} {nextLesson.unit?.title_uz} · {nextLesson.lesson.kind === 'boss' ? 'BOSS' : 'dars'}</div>
              <div className="mt-1 font-display text-lg font-bold">{nextLesson.lesson.title_uz}</div>
              <div className="mt-2 text-xs text-ember-300">Davom etish → +{nextLesson.lesson.xp_reward} XP</div>
            </Link>
          )}
          <Link href="/play/blitz?daily=1" className="card glass tilt relative overflow-hidden p-4">
            <div className="absolute -right-4 -top-4 text-7xl opacity-10">⚡</div>
            <div className="text-xs text-ink-400">📅 Kunlik Blitz chaqirig‘i · hamma uchun bir xil</div>
            <div className="mt-1 font-display text-lg font-bold">{social.dailyPlayed ? 'Natijangizni yaxshilang' : '60 soniya — reytingga kiring'}</div>
            <div className="mt-2 flex flex-wrap gap-1 text-xs">
              {social.dailyTop.length ? social.dailyTop.map((t, i) => <span key={i} className={cn('chip', t.me && 'border-gold-400 text-gold-300')}>{['🥇', '🥈', '🥉'][i]} {t.name} {t.score}</span>) : <span className="text-gold-300">Hali hech kim o‘ynamadi — birinchi bo‘ling!</span>}
            </div>
          </Link>
        </div>
      </Reveal>

      {stats.words.due > 0 && (
        <Reveal delay={160}>
          <Link href="/play/review" className="card glass tilt flex items-center gap-3 p-4 transition hover:border-teal-400/40">
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-teal-500/20 text-2xl pulse-ring">🧠</div>
            <div className="flex-1"><div className="font-display text-base font-bold">{stats.words.due} ta so‘z unutilish arafasida</div><div className="text-xs text-ink-300">5 daqiqada mustahkamlang — FSRS aynan hozir takrorlashni tavsiya qiladi</div></div>
            <ChevronRight className="text-teal-300" />
          </Link>
        </Reveal>
      )}

      {aiReady > 0 && (
        <Link href="/play/story" className="flex items-center gap-3 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4 text-sm">
          <span className="text-2xl">🤖</span><div><div className="font-semibold text-white">AI {aiReady} ta material tayyorladi</div><div className="text-ink-300">Limit tugaganida navbatga qo‘ygan hikoyalaringiz tayyor.</div></div>
        </Link>
      )}

      {/* Questlar */}
      {quests.length > 0 && (
        <Reveal delay={180}>
          <section data-tour="quests">
            <h2 className="mb-2 font-display text-lg font-bold">Vazifalar</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {quests.slice(0, 8).map((uq) => {
                const pct = Math.min(100, (uq.progress / uq.quest.target) * 100);
                const done = Boolean(uq.completed_at);
                return (
                  <div key={uq.quest.id + uq.period_key} className={cn('card-soft glass flex items-center gap-3 p-3', done && !uq.claimed && 'border-gold-400/40 bg-gold-400/10')}>
                    <div className="text-2xl">{uq.quest.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm"><span className="truncate font-medium">{uq.quest.title_uz}</span><span className="text-xs text-ink-400">{uq.quest.kind === 'weekly' ? 'hafta' : uq.quest.kind === 'once' ? 'bir martalik' : 'bugun'}</span></div>
                      <Bar value={pct} color={done ? 'bg-gold-400' : 'bg-teal-500'} className="mt-1.5 h-1.5" />
                      <div className="mt-1 text-xs text-ink-400">{uq.progress}/{uq.quest.target} · +{uq.quest.xp_reward} XP</div>
                    </div>
                    {done && !uq.claimed && uq.id > 0 && <button className="btn-primary px-3 py-2 text-xs" onClick={() => claim(uq)}><Gift size={14} /> Olish</button>}
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
            <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Do‘stlar nima qilyapti</h2><Link href="/friends?tab=feed" className="text-xs text-ember-300">lenta →</Link></div>
            <Tip id="feed-intro" text="Do‘stlaringiz va klubdoshlaringizning yutuqlari shu yerda. 👏 yoki 🔥 bosing — ularga bildirishnoma boradi. Siz ham ko‘rinasiz: dars, rekord, streak." />
            <Feed compact limit={8} />
          </section>
        </Reveal>
      )}

      {/* Qisqa statistika */}
      <Reveal delay={220}>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: 'So‘zlar', v: stats.words.learning + stats.words.review + stats.words.mastered, s: `${stats.words.mastered} mukammal` },
            { l: 'Darslar', v: stats.lessons.completed, s: `/ ${stats.lessons.total}` },
            { l: 'Jami daqiqa', v: stats.totals.minutes, s: `${stats.totals.active_days} faol kun` },
            { l: 'Aniqlik', v: stats.totals.reviews ? Math.round((stats.totals.correct / stats.totals.reviews) * 100) : 0, s: `${stats.totals.reviews} takrorlash`, suffix: stats.totals.reviews ? '%' : '' },
          ].map((k) => (
            <div key={k.l} className="card-soft glass p-3"><div className="text-xs text-ink-400">{k.l}</div><div className="font-display text-2xl font-bold"><CountUp value={k.v} suffix={k.suffix ?? ''} /></div><div className="text-xs text-ink-400">{k.s}</div></div>
          ))}
        </section>
      </Reveal>

      {/* Barcha rejimlar */}
      <Reveal delay={240}>
        <section data-tour="modes">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">O‘yin rejimlari</h2><Link href="/play" className="text-xs text-ember-300">barchasi ({MODES.length}) →</Link></div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {MODES.filter((m) => settings.features[m.id] !== false).map((m) => (
              <Link key={m.id} href={m.href} className="card-soft glass relative flex w-28 shrink-0 flex-col items-center gap-1 p-3 text-center text-xs transition hover:bg-white/[0.06]">
                {m.isNew && !(profile.interests ?? {})[m.id] && <span className="absolute right-1 top-1 rounded-full bg-ember-500 px-1.5 text-[9px] font-bold text-white">yangi</span>}
                <span className="text-2xl">{m.icon}</span><span className="font-medium">{m.title}</span>
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
