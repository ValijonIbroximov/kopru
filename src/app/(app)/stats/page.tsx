'use client';
import { useEffect, useMemo, useState } from 'react';
import { useProfile } from '@/components/AppShell';
import { fetchStats, type UserStats } from '@/lib/data';
import { analyzeMotivation, MODES } from '@/lib/motivation';
import { PageHeader, Skeleton, Bar, ProgressRing } from '@/components/ui';
import { todayKey, formatMinutes, cn } from '@/lib/utils';

function Heatmap({ days, tz }: { days: { day: string; xp: number }[]; tz: string }) {
  const map = new Map(days.map((d) => [d.day, d.xp]));
  const today = new Date(todayKey(tz) + 'T00:00:00');
  const weeks = 17;
  const cells: { day: string; xp: number; col: number; row: number }[] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1) - ((today.getDay() + 6) % 7));
  for (let i = 0; i < weeks * 7 + 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (d > today) break;
    const key = d.toISOString().slice(0, 10);
    cells.push({ day: key, xp: map.get(key) ?? 0, col: Math.floor(i / 7), row: i % 7 });
  }
  const max = Math.max(1, ...cells.map((c) => c.xp));
  const color = (xp: number) => (xp === 0 ? 'rgba(255,255,255,0.06)' : `rgba(47,209,188,${0.25 + 0.75 * Math.min(1, xp / max)})`);
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  return (
    <svg viewBox={`0 0 ${cols * 14} ${7 * 14}`} className="w-full">
      {cells.map((c) => <rect key={c.day} x={c.col * 14} y={c.row * 14} width={12} height={12} rx={3} fill={color(c.xp)}><title>{c.day}: {c.xp} XP</title></rect>)}
    </svg>
  );
}

export default function StatsPage() {
  const { profile, settings } = useProfile();
  const [s, setS] = useState<UserStats | null>(null);
  useEffect(() => { fetchStats().then(setS); }, []);

  const skills = useMemo(() => {
    if (!s) return null;
    const acc = (modes: string[]) => { let c = 0, t = 0; for (const m of modes) { const x = s.modes[m]; if (x) { c += x.correct; t += x.total; } } return t ? { pct: Math.round((c / t) * 100), n: t } : { pct: 0, n: 0 }; };
    return {
      'Tinglash': acc(['listen', 'exam']),
      'O‘qish': acc(['review', 'lesson', 'match', 'cognates', 'story']),
      'Grammatika': acc(['harmony', 'grammar', 'builder']),
      'Gapirish': acc(['speak']),
    };
  }, [s]);

  const report = useMemo(() => (profile && s ? analyzeMotivation(profile, s.heatmap, settings, s.totals.reviews ? s.totals.correct / s.totals.reviews : null) : null), [profile, s, settings]);

  if (!s || !profile) return <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;

  const wordsTotal = s.words.learning + s.words.review + s.words.mastered + s.words.new;
  const interests = profile.interests ?? {};
  const totalPlays = Object.values(interests).reduce((a, b) => a + b, 0);
  // Sertifikatga tayyorlik (taxminiy): so'zlar + darslar + ko'nikmalar
  const vocabTarget = profile.level_cefr === 'A1' ? 500 : profile.level_cefr === 'A2' ? 1200 : 2500;
  const readiness = Math.round(Math.min(100, (s.words.mastered + s.words.review * 0.5) / vocabTarget * 60 + (s.lessons.total ? (s.lessons.completed / s.lessons.total) * 40 : 0)));

  return (
    <div className="space-y-5">
      <PageHeader title="Statistika" sub="Bilim darajangiz, faollik, qiziqishlar va zaif joylar." />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-4">
          <ProgressRing value={readiness} size={84} color="#ffcf4d"><div className="text-center"><div className="font-display text-lg font-bold">{readiness}%</div></div></ProgressRing>
          <div><div className="text-xs text-ink-400">Sertifikatga tayyorlik ({profile.level_cefr})</div><div className="text-sm text-ink-200">{s.words.mastered} mukammal so‘z · {s.lessons.completed}/{s.lessons.total} dars</div></div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <ProgressRing value={report?.score ?? 0} size={84} color={report?.risk === 'high' ? '#f43f6e' : report?.risk === 'medium' ? '#ff6a2a' : '#2fd1bc'}><div className="font-display text-lg font-bold">{report?.score}</div></ProgressRing>
          <div><div className="text-xs text-ink-400">Motivatsiya indeksi</div><div className="text-sm text-ink-200">xavf: {report?.risk === 'high' ? 'yuqori' : report?.risk === 'medium' ? 'o‘rta' : 'past'} · zerikish {report?.boredom}%</div></div>
        </div>
        <div className="card p-4 text-sm">
          <div className="text-xs text-ink-400">Jami</div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-ink-200">
            <span>⏱ {formatMinutes(s.totals.minutes)}</span><span>📅 {s.totals.active_days} faol kun</span>
            <span>🔁 {s.totals.reviews} takrorlash</span><span>🎮 {s.totals.sessions} sessiya</span>
            <span>🔥 eng uzun: {profile.best_streak}</span><span>⚔️ {s.totals.duels_won}/{s.totals.duels} duel</span>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Faollik (oxirgi 17 hafta)</h2><span className="text-xs text-ink-400">XP bo‘yicha</span></div>
        <Heatmap days={s.heatmap} tz={profile.tz} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">So‘z boyligi</h2>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10">
            {[['mastered', 'bg-gold-400'], ['review', 'bg-teal-500'], ['learning', 'bg-ember-500'], ['new', 'bg-ink-500']].map(([k, c]) => (
              <div key={k} className={cn(c)} style={{ width: `${wordsTotal ? ((s.words[k as keyof typeof s.words] as number) / wordsTotal) * 100 : 0}%` }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-gold-400" />Mukammal: <b>{s.words.mastered}</b></div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-500" />Takrorlashda: <b>{s.words.review}</b></div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-ember-500" />O‘rganilmoqda: <b>{s.words.learning}</b></div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-ink-500" />Yangi: <b>{s.words.new}</b></div>
          </div>
          <div className="mt-2 text-xs text-ink-400">Bazada {s.words.total_words} so‘z · bugun navbatda {s.words.due}</div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">Ko‘nikmalar (aniqlik)</h2>
          <div className="space-y-3">
            {skills && Object.entries(skills).map(([k, v]) => (
              <div key={k}><div className="mb-1 flex justify-between text-sm"><span>{k}</span><span className="text-ink-300">{v.n ? `${v.pct}% · ${v.n}` : 'ma’lumot yo‘q'}</span></div><Bar value={v.pct} color={v.pct >= 80 ? 'bg-teal-400' : v.pct >= 60 ? 'bg-gold-400' : 'bg-rose-500'} /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">Qiziqishlar (rejimlar)</h2>
          {totalPlays === 0 ? <p className="text-sm text-ink-400">Hali o‘yin o‘ynalmagan.</p> : (
            <div className="space-y-2">
              {MODES.map((m) => ({ m, n: interests[m.id] ?? 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map(({ m, n }) => (
                <div key={m.id} className="flex items-center gap-2 text-sm"><span className="w-6">{m.icon}</span><span className="w-28 truncate">{m.title}</span><Bar value={(n / totalPlays) * 100} color="bg-fuchsia-500" className="flex-1" /><span className="w-10 text-right text-xs text-ink-300">{n}</span></div>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs text-ink-400">Rejimlar bo‘yicha aniqlik: {Object.entries(s.modes).map(([m, v]) => `${m} ${Math.round((v.correct / Math.max(1, v.total)) * 100)}%`).join(' · ') || '—'}</div>
        </div>
        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">Eng ko‘p xato so‘zlar</h2>
          {s.recent_errors.length === 0 ? <p className="text-sm text-ink-400">Xatolar yo‘q — ajoyib!</p> : (
            <div className="space-y-1 text-sm">{s.recent_errors.map((e, i) => <div key={i} className="flex justify-between"><span className="text-white">{e.tr}</span><span className="text-ink-300">{e.uz}</span><span className="text-rose-300">×{e.lapses}</span></div>)}</div>
          )}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-display text-lg font-bold">Yutuqlar ({s.achievements.length})</h2>
        {s.achievements.length === 0 ? <p className="text-sm text-ink-400">Birinchi yutuq — birinchi dars!</p> : (
          <div className="flex flex-wrap gap-2">{s.achievements.map((a) => <span key={a.code} className={cn('chip py-1.5 text-sm', a.rarity === 'legendary' && 'border-gold-400 text-gold-300', a.rarity === 'epic' && 'border-fuchsia-400 text-fuchsia-300', a.rarity === 'rare' && 'border-teal-400 text-teal-300')}>{a.icon} {a.title}</span>)}</div>
        )}
      </section>
    </div>
  );
}
