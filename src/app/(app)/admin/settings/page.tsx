'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { PageHeader, Skeleton } from '@/components/ui';
import { DEFAULT_SETTINGS } from '@/lib/settings';

interface Row { key: string; value: unknown; description: string | null; updated_at: string }

const HELP: Record<string, string> = {
  xp: 'correct — har to‘g‘ri javob; lesson/boss — dars bonusi; perfect_bonus — xatosiz sessiya; duel_win/lose; story; tutor_turn; exam; comeback_multiplier — qaytganda.',
  goals: 'options — foydalanuvchi tanlaydigan daqiqalar; default — standart.',
  srs: 'desired_retention 0.85–0.95 (0.9 tavsiya); max_new_per_day — kuniga yangi so‘zlar; mastered_stability_days — "mukammal" chegarasi.',
  flow: 'target/min/max_accuracy — qiyinlik moslashuvi kanali; session_min/max_items.',
  features: 'Rejimlarni yoqish/o‘chirish: true/false.',
  motivation: 'risk_days — necha kun faol bo‘lmasa xavf; comeback_days — qaytish bonusi; variety_rotation — kunlik rejim almashinuvi.',
  ai: 'AI sahifasida ham tahrirlanadi.',
  exam: 'Sinov imtihoni bo‘limlaridagi topshiriqlar soni va vaqt.',
};

export default function AdminSettings() {
  const { push } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabaseBrowser().from('app_settings').select('*').order('key');
    const r = (data as Row[]) ?? [];
    setRows(r);
    const d: Record<string, string> = {};
    for (const x of r) d[x.key] = JSON.stringify(x.value, null, 2);
    setDraft(d);
  };
  useEffect(() => { load(); }, []);

  async function save(key: string) {
    try {
      const value = JSON.parse(draft[key]);
      const { error } = await supabaseBrowser().from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      push({ kind: 'success', title: `"${key}" saqlandi` });
      load();
    } catch (e) { push({ kind: 'error', title: 'Xato', body: String((e as Error).message) }); }
  }
  async function restore(key: string) {
    const def = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[key];
    if (!def) return;
    setDraft({ ...draft, [key]: JSON.stringify(def, null, 2) });
  }
  async function addMissing() {
    const have = new Set((rows ?? []).map((r) => r.key));
    const missing = Object.entries(DEFAULT_SETTINGS).filter(([k]) => !have.has(k)).map(([key, value]) => ({ key, value }));
    if (!missing.length) return push({ kind: 'info', title: 'Hammasi mavjud' });
    await supabaseBrowser().from('app_settings').upsert(missing);
    load();
  }

  if (!rows) return <Skeleton className="h-60" />;
  return (
    <div>
      <PageHeader title="Tizim sozlamalari" sub="XP qiymatlari, maqsadlar, SRS, flow kanali, funksiyalar, motivatsiya, imtihon — JSON ko‘rinishida." right={<button className="btn-secondary px-3 py-2 text-xs" onClick={addMissing}>Yetishmayotganlarni qo‘shish</button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => (
          <div key={r.key} className="card p-4">
            <div className="mb-1 flex items-center justify-between"><div className="font-display font-bold">{r.key}</div><div className="text-[10px] text-ink-500">{new Date(r.updated_at).toLocaleString('uz-UZ')}</div></div>
            <div className="mb-2 text-xs text-ink-400">{r.description} {HELP[r.key] && <span className="text-ink-500">· {HELP[r.key]}</span>}</div>
            <textarea className="input min-h-40 font-mono text-xs" value={draft[r.key] ?? ''} onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })} />
            <div className="mt-2 flex gap-2"><button className="btn-primary px-3 py-2 text-xs" onClick={() => save(r.key)}>Saqlash</button><button className="btn-ghost px-3 py-2 text-xs" onClick={() => restore(r.key)}>Standart</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
