'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, Search, RefreshCw } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

export type FieldType = 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'json' | 'tags' | 'readonly';
export interface FieldDef { key: string; label: string; type: FieldType; options?: { value: string | number; label: string }[]; list?: boolean; width?: string; help?: string }

interface Props {
  table: string;
  title: string;
  fields: FieldDef[];
  pk?: string;
  orderBy?: string;
  searchKeys?: string[];
  filter?: { key: string; value: string | number } | null;
  defaults?: Record<string, unknown>;
  pageSize?: number;
  rpcDelete?: never;
  extraActions?: (row: Record<string, unknown>, reload: () => void) => React.ReactNode;
}

type Row = Record<string, unknown>;

export default function AdminTable({ table, title, fields, pk = 'id', orderBy = 'id', searchKeys = [], filter = null, defaults = {}, pageSize = 50, extraActions }: Props) {
  const { push } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const listFields = useMemo(() => fields.filter((f) => f.list !== false && f.type !== 'json' && f.type !== 'textarea').slice(0, 7), [fields]);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    let query = sb.from(table).select('*', { count: 'exact' }).order(orderBy, { ascending: true }).range(page * pageSize, page * pageSize + pageSize - 1);
    if (filter) query = query.eq(filter.key, filter.value);
    if (q && searchKeys.length) query = query.or(searchKeys.map((k) => `${k}.ilike.%${q.replace(/[,()]/g, ' ')}%`).join(','));
    const { data, count, error } = await query;
    if (error) push({ kind: 'error', title: 'Yuklash xatosi', body: error.message });
    setRows((data as Row[]) ?? []);
    setTotal(count ?? 0);
  }, [table, orderBy, page, pageSize, filter, q, searchKeys, push]);

  useEffect(() => { load(); }, [load]);

  async function logAction(action: string, target: string, meta: unknown = {}) {
    try { const sb = supabaseBrowser(); const { data: auth } = await sb.auth.getUser(); await sb.from('admin_logs').insert({ admin_id: auth.user?.id, action, target: `${table}:${target}`, meta }); } catch { /* noop */ }
  }

  async function save(row: Row) {
    setBusy(true);
    const sb = supabaseBrowser();
    const payload: Row = {};
    for (const f of fields) {
      if (f.type === 'readonly') continue;
      let v = row[f.key];
      if (f.type === 'number') v = v === '' || v === null || v === undefined ? null : Number(v);
      if (f.type === 'json' && typeof v === 'string') { try { v = JSON.parse(v); } catch { push({ kind: 'error', title: `JSON xato: ${f.label}` }); setBusy(false); return; } }
      if (f.type === 'tags' && typeof v === 'string') v = v.split(',').map((s) => s.trim()).filter(Boolean);
      if (f.type === 'text' && v === '') v = null;
      payload[f.key] = v;
    }
    const id = row[pk];
    const res = id === undefined || id === null || id === '' ? await sb.from(table).insert(payload).select().maybeSingle() : await sb.from(table).update(payload).eq(pk, id).select().maybeSingle();
    setBusy(false);
    if (res.error) { push({ kind: 'error', title: 'Saqlash xatosi', body: res.error.message }); return; }
    push({ kind: 'success', icon: '✅', title: 'Saqlandi' });
    logAction(id ? 'update' : 'insert', String(res.data?.[pk] ?? id), payload);
    setEditing(null);
    load();
  }

  async function remove(row: Row) {
    if (!confirm('O‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.')) return;
    const { error } = await supabaseBrowser().from(table).delete().eq(pk, row[pk]);
    if (error) { push({ kind: 'error', title: 'O‘chirish xatosi', body: error.message }); return; }
    logAction('delete', String(row[pk]));
    load();
  }

  async function exportJson() {
    const sb = supabaseBrowser();
    let query = sb.from(table).select('*').order(orderBy);
    if (filter) query = query.eq(filter.key, filter.value);
    const { data } = await query;
    const blob = new Blob([JSON.stringify(data ?? [], null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${table}.json`; a.click();
  }

  async function importJson(file: File) {
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('Massiv kutilgan');
      const clean = arr.map((r: Row) => { const o: Row = {}; for (const f of fields) if (f.type !== 'readonly' && r[f.key] !== undefined) o[f.key] = r[f.key]; if (r[pk] !== undefined) o[pk] = r[pk]; return o; });
      const { error } = await supabaseBrowser().from(table).upsert(clean, { onConflict: pk });
      if (error) throw error;
      push({ kind: 'success', icon: '📥', title: `${clean.length} ta yozuv import qilindi` });
      logAction('import', `${clean.length} rows`);
      load();
    } catch (e) { push({ kind: 'error', title: 'Import xatosi', body: String((e as Error).message) }); }
  }

  const fmt = (v: unknown, f: FieldDef) => {
    if (v === null || v === undefined) return <span className="text-ink-500">—</span>;
    if (f.type === 'bool') return v ? '✅' : '—';
    if (f.type === 'tags' && Array.isArray(v)) return v.join(', ');
    if (f.type === 'select') return f.options?.find((o) => String(o.value) === String(v))?.label ?? String(v);
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.length > 60 ? s.slice(0, 60) + '…' : s;
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-bold">{title} <span className="text-sm font-normal text-ink-400">({total})</span></h2>
        <div className="ml-auto flex flex-wrap gap-2">
          {searchKeys.length > 0 && <div className="relative"><Search size={14} className="absolute left-3 top-3 text-ink-400" /><input className="input py-2 pl-8 text-sm" placeholder="qidirish…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>}
          <button className="btn-secondary px-3 py-2 text-xs" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={exportJson}><Download size={14} /> JSON</button>
          <label className="btn-secondary cursor-pointer px-3 py-2 text-xs"><Upload size={14} /> Import<input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} /></label>
          <button className="btn-primary px-3 py-2 text-xs" onClick={() => setEditing({ ...defaults, ...(filter ? { [filter.key]: filter.value } : {}) })}><Plus size={14} /> Qo‘shish</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-ink-400">{listFields.map((f) => <th key={f.key} className="px-3 py-2">{f.label}</th>)}<th className="px-3 py-2" /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r[pk])} className="border-b border-white/5 hover:bg-white/[0.03]">
                {listFields.map((f) => <td key={f.key} className="max-w-56 truncate px-3 py-2 text-ink-100">{fmt(r[f.key], f)}</td>)}
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {extraActions?.(r, load)}
                  <button className="btn-ghost px-2 py-1" onClick={() => setEditing({ ...r })}><Pencil size={14} /></button>
                  <button className="btn-ghost px-2 py-1 text-rose-400" onClick={() => remove(r)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={listFields.length + 1} className="px-3 py-6 text-center text-ink-400">Yozuvlar yo‘q</td></tr>}
          </tbody>
        </table>
      </div>
      {total > pageSize && (
        <div className="mt-2 flex items-center justify-end gap-2 text-xs text-ink-300">
          <button className="btn-ghost px-2 py-1" disabled={page === 0} onClick={() => setPage(page - 1)}>←</button>
          <span>{page + 1} / {Math.ceil(total / pageSize)}</span>
          <button className="btn-ghost px-2 py-1" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(page + 1)}>→</button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-lg font-bold">{editing[pk] ? `Tahrirlash #${editing[pk]}` : 'Yangi yozuv'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => {
                const v = editing[f.key];
                const set = (nv: unknown) => setEditing({ ...editing, [f.key]: nv });
                const wide = f.type === 'textarea' || f.type === 'json';
                return (
                  <div key={f.key} className={cn(wide && 'sm:col-span-2')}>
                    <label className="label">{f.label}{f.help && <span className="ml-1 normal-case text-ink-500">· {f.help}</span>}</label>
                    {f.type === 'readonly' && <div className="input bg-ink-900 text-ink-400">{String(v ?? '—')}</div>}
                    {f.type === 'text' && <input className="input py-2" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />}
                    {f.type === 'number' && <input className="input py-2" type="number" value={v === null || v === undefined ? '' : String(v)} onChange={(e) => set(e.target.value)} />}
                    {f.type === 'textarea' && <textarea className="input min-h-32 py-2 font-mono text-xs" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />}
                    {f.type === 'json' && <textarea className="input min-h-32 py-2 font-mono text-xs" value={typeof v === 'string' ? v : JSON.stringify(v ?? {}, null, 2)} onChange={(e) => set(e.target.value)} />}
                    {f.type === 'tags' && <input className="input py-2" value={Array.isArray(v) ? v.join(', ') : String(v ?? '')} onChange={(e) => set(e.target.value)} placeholder="a, b, c" />}
                    {f.type === 'bool' && <button type="button" className={cn('chip py-2', v ? 'border-teal-400 text-teal-300' : '')} onClick={() => set(!v)}>{v ? '✅ ha' : '— yo‘q'}</button>}
                    {f.type === 'select' && <select className="input py-2" value={String(v ?? '')} onChange={(e) => { const o = f.options?.find((x) => String(x.value) === e.target.value); set(o ? o.value : e.target.value); }}><option value="">—</option>{f.options?.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}</select>}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setEditing(null)}>Bekor</button><button className="btn-primary" disabled={busy} onClick={() => save(editing)}>Saqlash</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
