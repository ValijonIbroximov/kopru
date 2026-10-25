'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { PageHeader, Skeleton } from '@/components/ui';
import { PROVIDERS } from '@/lib/ai/providers';
import type { AiProviderState, AiJob } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Health { providers: { id: string; model: string }[]; serviceRole: boolean; cronSecret: boolean }

export default function AdminAi() {
  const { push } = useToast();
  const [states, setStates] = useState<AiProviderState[] | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [cache, setCache] = useState<{ count: number; hits: number; kinds: Record<string, number> } | null>(null);
  const [ai, setAi] = useState<Record<string, unknown> | null>(null);
  const [tts, setTts] = useState<{ active: string; activeLabel: string; forced: string | null; providers: Record<string, { configured: boolean; ok: boolean; ms: number | null; error: string | null }>; storage: { configured: boolean; ok: boolean; error: string | null } } | null>(null);
  useEffect(() => { fetch('/api/tts/status').then((r) => r.json()).then(setTts).catch(() => setTts(null)); }, []);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [{ data: st }, { data: jb }, { data: ca }, { data: set }, h] = await Promise.all([
      sb.from('ai_provider_state').select('*').order('priority'),
      sb.from('ai_jobs').select('*').neq('status', 'done').order('created_at', { ascending: false }).limit(30),
      sb.from('ai_cache').select('kind, hits'),
      sb.from('app_settings').select('value').eq('key', 'ai').maybeSingle(),
      fetch('/api/health').then((r) => r.json()).catch(() => null),
    ]);
    setStates((st as AiProviderState[]) ?? []);
    setJobs((jb as AiJob[]) ?? []);
    const kinds: Record<string, number> = {};
    let hits = 0;
    for (const c of ca ?? []) { kinds[c.kind] = (kinds[c.kind] ?? 0) + 1; hits += c.hits ?? 0; }
    setCache({ count: (ca ?? []).length, hits, kinds });
    setAi((set?.value as Record<string, unknown>) ?? {});
    setHealth(h);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(id: string, p: Partial<AiProviderState>) {
    const { error } = await supabaseBrowser().from('ai_provider_state').update({ ...p, updated_at: new Date().toISOString() }).eq('provider', id);
    if (error) push({ kind: 'error', title: 'Xato', body: error.message }); else load();
  }
  async function saveAi() {
    const { error } = await supabaseBrowser().from('app_settings').upsert({ key: 'ai', value: ai, updated_at: new Date().toISOString() });
    if (error) push({ kind: 'error', title: 'Xato', body: error.message }); else push({ kind: 'success', title: 'AI sozlamalari saqlandi' });
  }
  async function clearCache(kind?: string) {
    if (!confirm('Kesh tozalansinmi? Hikoyalar qayta yaratiladi (limit sarflanadi).')) return;
    let q = supabaseBrowser().from('ai_cache').delete();
    q = kind ? q.eq('kind', kind) : q.neq('key', '');
    const { error } = await q;
    if (error) push({ kind: 'error', title: 'Xato', body: error.message }); else load();
  }
  async function runQueue() {
    const r = await fetch('/api/ai/jobs').then((x) => x.json()).catch(() => null);
    push({ kind: 'info', icon: '⚙️', title: 'Navbat ishga tushirildi', body: r?.processed ? `bajarildi: ${r.processed.done}, xato: ${r.processed.failed}` : 'natija yo‘q' });
    load();
  }

  if (!states || !cache || !ai) return <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;
  const num = (k: string) => Number(ai[k] ?? 0);

  return (
    <div className="space-y-5">
      <PageHeader title="AI boshqaruvi" sub="Provayderlar zanjiri, limitlar, kesh va navbat. Kalitlar faqat Vercel Environment Variables da." />

      {/* TTS (turkcha nutq) holati */}
      <section className="card p-4 text-sm">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">🔊 Turkcha nutq (TTS)</h2><a className="text-xs text-ember-300 underline" href="/api/tts/status" target="_blank" rel="noreferrer">/api/tts/status</a></div>
        {!tts ? <div className="text-xs text-ink-400">Tekshirilmoqda…</div> : (
          <div className="space-y-2">
            <div className={cn('rounded-xl px-3 py-2 text-xs', tts.active === 'azure' || tts.active === 'edge' ? 'bg-teal-500/10 text-teal-100' : tts.active === 'google' ? 'bg-gold-400/10 text-gold-100' : 'bg-rose-500/10 text-rose-100')}>Hozirgi manba: <b>{tts.activeLabel}</b>{tts.forced ? ` · TTS_PROVIDER=${tts.forced}` : ''}</div>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              {(['azure', 'edge', 'google'] as const).map((k) => { const pr = tts.providers[k]; return (
                <div key={k} className="card-soft p-3"><div className="font-semibold text-white">{pr.ok ? '🟢' : pr.configured ? '🔴' : '⚪'} {k === 'azure' ? 'Azure Speech (rasmiy, ixtiyoriy)' : k === 'edge' ? 'Microsoft Edge neyron' : 'Google TTS (zaxira)'}</div><div className="text-ink-400">{pr.ok ? `${pr.ms} ms` : pr.error ?? '—'}</div>{k === 'azure' && !pr.configured && <div className="mt-1 text-[11px] text-ink-500">Bepul F0: oyiga 500 000 belgi. Env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION</div>}</div>
              ); })}
            </div>
            <div className="text-xs text-ink-400">Storage kesh (bucket `tts`): {tts.storage.configured ? (tts.storage.ok ? '🟢 ishlayapti' : `🔴 ${tts.storage.error ?? 'xato'} — 003_tts_storage.sql ishga tushirilganmi?`) : '⚪ SUPABASE_SERVICE_ROLE_KEY yo‘q'}</div>
          </div>
        )}
      </section>

      {health && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={cn('chip', health.providers.length ? 'text-teal-300' : 'text-rose-300')}>{health.providers.length} ta kalit sozlangan</span>
          <span className={cn('chip', health.serviceRole ? 'text-teal-300' : 'text-gold-300')}>service role: {health.serviceRole ? 'bor' : 'yo‘q (cron/navbat cheklangan)'}</span>
          <span className={cn('chip', health.cronSecret ? 'text-teal-300' : 'text-gold-300')}>CRON_SECRET: {health.cronSecret ? 'bor' : 'yo‘q'}</span>
        </div>
      )}

      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-ink-400"><th className="px-3 py-2">Provayder</th><th className="px-3 py-2">Kalit</th><th className="px-3 py-2">Model</th><th className="px-3 py-2">Tartib</th><th className="px-3 py-2">Kunlik limit</th><th className="px-3 py-2">Bugun</th><th className="px-3 py-2">Holat</th><th className="px-3 py-2" /></tr></thead>
          <tbody>
            {PROVIDERS.map((p) => {
              const s = states.find((x) => x.provider === p.id);
              const hasKey = health?.providers.some((x) => x.id === p.id);
              const cooling = s?.cooldown_until && new Date(s.cooldown_until) > new Date();
              return (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="px-3 py-2"><div className="font-semibold text-white">{p.label}</div><div className="text-[11px] text-ink-400">{p.note} <a className="underline" href={p.signupUrl} target="_blank" rel="noreferrer">kalit olish</a></div></td>
                  <td className="px-3 py-2">{hasKey ? '🟢' : <span className="text-ink-500">yo‘q ({p.envKey})</span>}</td>
                  <td className="px-3 py-2"><input className="input w-56 py-1 text-xs" defaultValue={s?.model ?? p.defaultModel} onBlur={(e) => s && e.target.value !== s.model && patch(p.id, { model: e.target.value })} /></td>
                  <td className="px-3 py-2"><input className="input w-16 py-1 text-xs" type="number" defaultValue={s?.priority ?? 10} onBlur={(e) => s && patch(p.id, { priority: Number(e.target.value) })} /></td>
                  <td className="px-3 py-2"><input className="input w-20 py-1 text-xs" type="number" defaultValue={s?.daily_cap ?? 1000} onBlur={(e) => s && patch(p.id, { daily_cap: Number(e.target.value) })} /></td>
                  <td className="px-3 py-2 text-ink-200">{s?.day === new Date().toISOString().slice(0, 10) ? s.used_today : 0}<div className="text-[10px] text-ink-500">jami {s?.total_calls ?? 0} · xato {s?.total_errors ?? 0} · {s?.avg_latency_ms ?? '—'}ms</div></td>
                  <td className="px-3 py-2 text-xs">{!s ? '—' : !s.enabled ? '⚫ o‘chiq' : cooling ? <span className="text-gold-300">⏳ {new Date(s.cooldown_until!).toLocaleTimeString('uz-UZ')} gacha</span> : <span className="text-teal-300">🟢 tayyor</span>}{s?.last_error && <div className="max-w-56 truncate text-[10px] text-rose-300" title={s.last_error}>{s.last_error}</div>}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {s && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => patch(p.id, { enabled: !s.enabled })}>{s.enabled ? 'o‘chirish' : 'yoqish'}</button>}
                    {s && cooling && <button className="btn-ghost px-2 py-1 text-xs text-teal-300" onClick={() => patch(p.id, { cooldown_until: null, last_error: null })}>cooldown reset</button>}
                    {!s && <button className="btn-ghost px-2 py-1 text-xs" onClick={async () => { await supabaseBrowser().from('ai_provider_state').insert({ provider: p.id, model: p.defaultModel, priority: 10 }); load(); }}>qo‘shish</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 font-display font-bold">Umumiy AI sozlamalari</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(ai.enabled)} onChange={(e) => setAi({ ...ai, enabled: e.target.checked })} /> AI yoqilgan</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(ai.queue_enabled)} onChange={(e) => setAi({ ...ai, queue_enabled: e.target.checked })} /> Navbat yoqilgan</label>
            {[['daily_user_cap', 'Foydalanuvchi kunlik limiti'], ['story_words', 'Hikoya uzunligi (so‘z)'], ['tutor_max_turns', 'O‘qituvchi: XP beriladigan xabarlar'], ['cache_ttl_days', 'Kesh muddati (kun)']].map(([k, l]) => (
              <div key={k}><label className="label">{l}</label><input className="input py-2" type="number" value={num(k)} onChange={(e) => setAi({ ...ai, [k]: Number(e.target.value) })} /></div>
            ))}
          </div>
          <button className="btn-primary mt-4" onClick={saveAi}>Saqlash</button>
        </div>
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between"><span className="font-display font-bold">Kontent banki (kesh)</span><button className="btn-ghost px-2 py-1 text-xs text-rose-300" onClick={() => clearCache()}>hammasini tozalash</button></div>
          <div className="text-sm text-ink-200">{cache.count} ta yozuv · {cache.hits} marta qayta ishlatilgan (limit tejaldi)</div>
          <div className="mt-2 flex flex-wrap gap-2">{Object.entries(cache.kinds).map(([k, n]) => <button key={k} className="chip" onClick={() => clearCache(k)} title="tozalash">{k}: {n} ✕</button>)}</div>
          <div className="mt-4 flex items-center justify-between"><span className="font-display font-bold">Navbat ({jobs.length})</span><button className="btn-secondary px-3 py-1.5 text-xs" onClick={runQueue}>Hozir bajarish</button></div>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs">
            {jobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] p-2">
                <span>{j.kind} · <span className={j.status === 'failed' ? 'text-rose-300' : 'text-gold-300'}>{j.status}</span> · {j.attempts} urinish{j.error && <span className="text-ink-400"> · {j.error.slice(0, 50)}</span>}</span>
                <span className="flex gap-1">
                  {j.status === 'failed' && <button className="underline" onClick={async () => { await supabaseBrowser().from('ai_jobs').update({ status: 'queued', attempts: 0, error: null }).eq('id', j.id); load(); }}>qayta</button>}
                  <button className="text-rose-300 underline" onClick={async () => { await supabaseBrowser().from('ai_jobs').delete().eq('id', j.id); load(); }}>o‘chirish</button>
                </span>
              </div>
            ))}
            {!jobs.length && <div className="text-ink-400">Navbat bo‘sh</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
