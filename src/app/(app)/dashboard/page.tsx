'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gift, Sparkles } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { ProgressRing, Bar, Skeleton } from '@/components/ui';
import { fetchStats, fetchQuests, claimQuest, fetchLessonProgress, fetchLessons, fetchUnits, fetchAiJobs, isLocal, type UserStats } from '@/lib/data';
import { analyzeMotivation, MODES, type MotivationReport } from '@/lib/motivation';
import type { Lesson, Quest, Unit, UserQuest } from '@/lib/types';
import { leagueIcon, leagueLabel, levelProgress, cn } from '@/lib/utils';

export default function Dashboard() {
  const { profile, settings, refresh, loading } = useProfile();
  const { push } = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [quests, setQuests] = useState<(UserQuest & { quest: Quest })[]>([]);
  const [nextLesson, setNextLesson] = useState<{ lesson: Lesson; unit: Unit | undefined } | null>(null);
  const [aiReady, setAiReady] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    (async () => {
      const [s, q, lp, lessons, units, jobs] = await Promise.all([fetchStats(), fetchQuests(), fetchLessonProgress(), fetchLessons(), fetchUnits(), fetchAiJobs()]);
      setStats(s);
      setQuests(q);
      const order = lessons.slice().sort((a, b) => (units.find((u) => u.id === a.unit_id)?.order_index ?? 0) - (units.find((u) => u.id === b.unit_id)?.order_index ?? 0) || a.order_index - b.order_index);
      const completed = new Set(lp.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
      const inProgress = lp.find((p) => p.status === 'in_progress');
      const nl = (inProgress && order.find((l) => l.id === inProgress.lesson_id)) || order.find((l) => !completed.has(l.id)) || null;
      setNextLesson(nl ? { lesson: nl, unit: units.find((u) => u.id === nl.unit_id) } : null);
      setAiReady(jobs.filter((j) => j.status === 'done' && j.result).length);
      setReady(true);
    })();
  }, [loading]);

  const report: MotivationReport | null = useMemo(() => {
    if (!profile || !stats) return null;
    const recent = stats.heatmap.slice(-7);
    const rv = recent.reduce((a, d) => a + d.reviews, 0);
    const acc7 = rv > 0 ? Object.values(stats.modes).reduce((a, m) => a + m.correct, 0) / Math.max(1, Object.values(stats.modes).reduce((a, m) => a + m.total, 0)) : null;
    return analyzeMotivation(profile, stats.heatmap, settings, acc7);
  }, [profile, stats, settings]);

  if (!profile || !ready || !stats) {
    return <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-24" /><Skeleton className="h-48" /></div>;
  }

  const minutesToday = stats.today?.minutes ?? 0;
  const goalPct = Math.min(100, (minutesToday / Math.max(1, profile.daily_goal_min)) * 100);
  const lvl = levelProgress(profile.xp, profile.level);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const comebackMult = report?.comeback ? settings.xp.comeback_multiplier : 1;

  async function claim(uq: UserQuest & { quest: Quest }) {
    const r = await claimQuest(uq.id);
    if (r?.ok) {
      push({ kind: 'xp', icon: uq.quest.icon, title: `+${uq.quest.xp_reward} XP`, body: uq.quest.title_uz });
      setQuests(await fetchQuests());
      await refresh();
    }
  }

  return (
    <div className="space-y-5">
      {isLocal() && <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm text-gold-200">Demo rejim: progress faqat shu brauzerda saqlanadi. README.md → Supabase ulash.</div>}

      {/* Salom + kunlik maqsad */}
      <section className="card p-5">
        <div className="flex items-center gap-4">
          <ProgressRing value={goalPct} size={96} color={goalPct >= 100 ? '#2fd1bc' : '#ff6a2a'}>
            <div className="text-center"><div className="font-display text-xl font-bold">{minutesToday}</div><div className="text-[10px] text-ink-400">/ {profile.daily_goal_min} daq</div></div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-ink-400">{greet}, {profile.display_name ?? profile.username} {profile.avatar}</div>
            <div className="font-display text-xl font-bold">{goalPct >= 100 ? 'Bugungi maqsad bajarildi! 🎉' : report?.comeback ? 'Qaytganingiz bilan! 🌉' : `Bugun ${Math.max(0, profile.daily_goal_min - minutesToday)} daqiqa qoldi`}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="chip">🔥 {profile.streak} kun</span>
              <span className="chip">🧊 {profile.streak_freezes} muzlatish</span>
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

      {/* Motivatsiya xabarlari */}
      {report && report.messages.length > 0 && (
        <section className="rounded-2xl border border-ember-400/20 bg-ember-500/[0.07] p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 font-semibold text-ember-300"><Sparkles size={16} /> Murabbiy</div>
          <ul className="space-y-1 text-ink-100">{report.messages.slice(0, 3).map((m, i) => <li key={i}>• {m}</li>)}</ul>
        </section>
      )}

      {/* Bugungi tavsiya */}
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Bugungi tavsiya</h2><span className="text-xs text-ink-400">~{report?.sessionMinutes ?? 10} daqiqa</span></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {nextLesson && (
            <Link href={`/learn/${nextLesson.lesson.id}`} className="card group relative overflow-hidden p-4 transition hover:border-ember-400/40">
              <div className="text-xs text-ink-400">{nextLesson.unit?.icon} {nextLesson.unit?.title_uz} · {nextLesson.lesson.kind === 'boss' ? 'BOSS' : 'dars'}</div>
              <div className="mt-1 font-display text-lg font-bold">{nextLesson.lesson.title_uz}</div>
              <div className="mt-2 text-xs text-ember-300">Davom etish →</div>
            </Link>
          )}
          {stats.words.due > 0 && (
            <Link href="/play/review" className="card p-4 transition hover:border-teal-400/40">
              <div className="text-xs text-ink-400">🧠 Takrorlash navbati</div>
              <div className="mt-1 font-display text-lg font-bold">{stats.words.due} ta so‘z unutilish arafasida</div>
              <div className="mt-2 text-xs text-teal-300">5 daqiqada mustahkamlang →</div>
            </Link>
          )}
          {(report?.recommended ?? []).filter((id) => id !== 'lesson' && (id !== 'review' || stats.words.due === 0)).slice(0, 2).map((id) => {
            const m = MODES.find((x) => x.id === id)!;
            return (
              <Link key={id} href={m.href} className={cn('card bg-gradient-to-br p-4 transition hover:border-white/20', m.color)}>
                <div className="text-2xl">{m.icon}</div>
                <div className="mt-1 font-display text-lg font-bold">{m.title}</div>
                <div className="text-xs text-ink-300">{m.desc} · ~{m.minutes} daq</div>
              </Link>
            );
          })}
        </div>
      </section>

      {aiReady > 0 && (
        <Link href="/play/story" className="flex items-center gap-3 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4 text-sm">
          <span className="text-2xl">🤖</span><div><div className="font-semibold text-white">AI {aiReady} ta material tayyorladi</div><div className="text-ink-300">Limit tugaganida navbatga qo‘ygan hikoyalaringiz tayyor.</div></div>
        </Link>
      )}

      {/* Questlar */}
      {quests.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Bugungi vazifalar</h2>
          <div className="grid gap-2">
            {quests.filter((q) => q.quest.kind !== 'weekly' || true).slice(0, 7).map((uq) => {
              const pct = Math.min(100, (uq.progress / uq.quest.target) * 100);
              const done = Boolean(uq.completed_at);
              return (
                <div key={uq.quest.id + uq.period_key} className={cn('card-soft flex items-center gap-3 p-3', done && !uq.claimed && 'border-gold-400/40 bg-gold-400/10')}>
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
      )}

      {/* Qisqa statistika */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: 'So‘zlar', v: stats.words.learning + stats.words.review + stats.words.mastered, s: `${stats.words.mastered} mukammal` },
          { l: 'Darslar', v: stats.lessons.completed, s: `/ ${stats.lessons.total}` },
          { l: 'Jami daqiqa', v: stats.totals.minutes, s: `${stats.totals.active_days} faol kun` },
          { l: 'Aniqlik', v: stats.totals.reviews ? Math.round((stats.totals.correct / stats.totals.reviews) * 100) + '%' : '—', s: `${stats.totals.reviews} takrorlash` },
        ].map((k) => (
          <div key={k.l} className="card-soft p-3"><div className="text-xs text-ink-400">{k.l}</div><div className="font-display text-2xl font-bold">{k.v}</div><div className="text-xs text-ink-400">{k.s}</div></div>
        ))}
      </section>

      {/* Barcha rejimlar */}
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">O‘yin rejimlari</h2><Link href="/play" className="text-xs text-ember-300">barchasi →</Link></div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {MODES.filter((m) => settings.features[m.id] !== false).map((m) => (
            <Link key={m.id} href={m.href} className="card-soft flex w-28 shrink-0 flex-col items-center gap-1 p-3 text-center text-xs hover:bg-white/[0.06]">
              <span className="text-2xl">{m.icon}</span><span className="font-medium">{m.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
