'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader, Skeleton } from '@/components/ui';

interface Log { id: number; admin_id: string | null; action: string; target: string | null; meta: unknown; created_at: string }
interface Fb { id: number; user_id: string | null; rating: number | null; text: string | null; page: string | null; created_at: string }

export default function AdminLogs() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [fb, setFb] = useState<Fb[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const [{ data: l }, { data: f }, { data: p }] = await Promise.all([
        sb.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100),
        sb.from('feedback').select('*').order('created_at', { ascending: false }).limit(100),
        sb.from('profiles').select('id, username'),
      ]);
      setLogs((l as Log[]) ?? []); setFb((f as Fb[]) ?? []);
      setNames(Object.fromEntries((p ?? []).map((x) => [x.id, x.username])));
    })();
  }, []);
  if (!logs || !fb) return <Skeleton className="h-60" />;
  return (
    <div className="space-y-5">
      <PageHeader title="Loglar va fikrlar" />
      <section className="card p-4">
        <div className="mb-2 font-display font-bold">Foydalanuvchi fikrlari ({fb.length})</div>
        <div className="space-y-2 text-sm">
          {fb.map((f) => <div key={f.id} className="rounded-xl bg-white/[0.04] p-2"><div className="flex justify-between text-xs text-ink-400"><span>@{names[f.user_id ?? ''] ?? '—'} · {'★'.repeat(f.rating ?? 0)}</span><span>{new Date(f.created_at).toLocaleString('uz-UZ')}</span></div><div className="text-ink-100">{f.text}</div></div>)}
          {!fb.length && <div className="text-ink-400">Hali fikr yo‘q</div>}
        </div>
      </section>
      <section className="card p-4">
        <div className="mb-2 font-display font-bold">Admin amallari ({logs.length})</div>
        <div className="max-h-96 space-y-1 overflow-y-auto text-xs">
          {logs.map((l) => <div key={l.id} className="flex justify-between gap-2 border-b border-white/5 py-1"><span className="text-ink-200">@{names[l.admin_id ?? ''] ?? '—'} · <b>{l.action}</b> · {l.target}</span><span className="shrink-0 text-ink-500">{new Date(l.created_at).toLocaleString('uz-UZ')}</span></div>)}
          {!logs.length && <div className="text-ink-400">Hali log yo‘q</div>}
        </div>
      </section>
    </div>
  );
}
