'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader, Skeleton } from '@/components/ui';
import type { AiProviderState } from '@/lib/types';

interface Overview {
  users: number; admins: number; dau: number; wau: number; at_risk: number; churned: number; reviews_today: number; minutes_today: number; xp_today: number;
  words: number; lessons: number; units: number; ai_cache: number; ai_cache_hits: number; ai_jobs_queued: number; ai_jobs_failed: number; sessions_today: number;
  daily_series: { day: string; users: number; xp: number; minutes: number }[]; modes: Record<string, number>; providers: AiProviderState[];
}

function Spark({ data, color = '#2fd1bc' }: { data: number[]; color?: string }) {
  const max = Math.max(1, ...data);
  const w = 300, h = 60;
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full"><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" /></svg>;
}

export default function AdminHome() {
  const [o, setO] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { supabaseBrowser().rpc('admin_overview').then(({ data, error }) => { if (error) setErr(error.message); else setO(data as Overview); }); }, []);
  if (err) return <div className="card p-4 text-rose-300">{err}</div>;
  if (!o) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>;

  const series = o.daily_series ?? [];
  const K = [
    ['Foydalanuvchilar', o.users, `${o.admins} admin`], ['DAU / WAU', `${o.dau} / ${o.wau}`, 'bugun / 7 kun'], ['Xavf ostida', o.at_risk, '2–6 kun faol emas'], ['Ketganlar', o.churned, '7+ kun'],
    ['Bugun XP', o.xp_today, `${o.sessions_today} sessiya`], ['Bugun daqiqa', o.minutes_today, `${o.reviews_today} takrorlash`], ['Kontent', `${o.words} so‘z`, `${o.lessons} dars · ${o.units} bo‘lim`], ['AI kesh', o.ai_cache, `${o.ai_cache_hits} hit · navbat ${o.ai_jobs_queued} · xato ${o.ai_jobs_failed}`],
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Admin: umumiy ko‘rinish" sub="Real vaqt KPI, 30 kunlik faollik, AI holati." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {K.map(([l, v, s]) => <div key={String(l)} className="card-soft p-3"><div className="text-xs text-ink-400">{l}</div><div className="font-display text-2xl font-bold">{v}</div><div className="text-xs text-ink-400">{s}</div></div>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-ink-400">Faol foydalanuvchilar (30 kun)</div><Spark data={series.map((d) => d.users)} /></div>
        <div className="card p-4"><div className="text-xs text-ink-400">XP (30 kun)</div><Spark data={series.map((d) => d.xp)} color="#ff6a2a" /></div>
        <div className="card p-4"><div className="text-xs text-ink-400">Daqiqalar (30 kun)</div><Spark data={series.map((d) => d.minutes)} color="#ffcf4d" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 font-display font-bold">Rejimlar (30 kun, takrorlashlar)</div>
          {Object.entries(o.modes ?? {}).sort((a, b) => b[1] - a[1]).map(([m, n]) => <div key={m} className="flex justify-between border-b border-white/5 py-1 text-sm"><span>{m}</span><span className="text-ink-300">{n}</span></div>)}
          {!Object.keys(o.modes ?? {}).length && <div className="text-sm text-ink-400">Ma’lumot yo‘q</div>}
        </div>
        <div className="card p-4">
          <div className="mb-2 font-display font-bold">AI provayderlar</div>
          {(o.providers ?? []).map((p) => (
            <div key={p.provider} className="flex items-center justify-between border-b border-white/5 py-1.5 text-sm">
              <span>{p.enabled ? '🟢' : '⚫'} {p.provider} <span className="text-xs text-ink-400">{p.model}</span></span>
              <span className="text-xs text-ink-300">{p.used_today}/{p.daily_cap}{p.cooldown_until && new Date(p.cooldown_until) > new Date() ? ' · ⏳' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
