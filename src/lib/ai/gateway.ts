/**
 * AI shlyuzi: provayderlar zanjiri → limit tugasa keyingisi → hammasi tugasa kesh/navbat.
 * Limit qayta tiklanganda hech narsa yo'qolmaydi: navbatdagi ishlar cron yoki keyingi
 * muvaffaqiyatli so'rovda avtomatik bajariladi, natija keshda saqlanadi.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiKind, AiResponse, AiProviderState } from '@/lib/types';
import { configuredProviders, type ProviderDef } from './providers';
import { buildPrompt, extractJson, SYSTEM_PROMPT } from './prompts';
import { hashString } from '@/lib/utils';

interface MemState { cooldownUntil: number; errors: number; usedToday: number; day: string; lastError?: string }
const mem = new Map<string, MemState>();
const QUEUEABLE: AiKind[] = ['story', 'exercises', 'explain', 'translate'];

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}
function nextUtcMidnight() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}
function getMem(id: string): MemState {
  const today = utcDay();
  let s = mem.get(id);
  if (!s) {
    s = { cooldownUntil: 0, errors: 0, usedToday: 0, day: today };
    mem.set(id, s);
  }
  if (s.day !== today) {
    s.day = today;
    s.usedToday = 0;
    s.errors = 0;
    s.cooldownUntil = 0;
  }
  return s;
}

export function cacheKey(kind: AiKind, payload: Record<string, unknown>) {
  const norm = JSON.stringify(payload, Object.keys(payload).sort());
  return `${kind}:${hashString(norm)}:${hashString(norm.split('').reverse().join(''))}`;
}

interface Candidate { def: ProviderDef; key: string; model: string; cap: number; priority: number }

async function loadCandidates(admin: SupabaseClient | null, reader: SupabaseClient | null): Promise<Candidate[]> {
  const configured = configuredProviders();
  let states: AiProviderState[] = [];
  const client = admin ?? reader;
  if (client) {
    const { data } = await client.from('ai_provider_state').select('*');
    states = (data as AiProviderState[]) ?? [];
  }
  const out: Candidate[] = [];
  configured.forEach((c, i) => {
    const st = states.find((s) => s.provider === c.def.id);
    if (st && !st.enabled) return;
    const m = getMem(c.def.id);
    // DB dagi cooldown (boshqa instansiyadan) — xotiraga ko'chirish
    if (st?.cooldown_until) {
      const t = new Date(st.cooldown_until).getTime();
      if (t > m.cooldownUntil) m.cooldownUntil = t;
    }
    if (st && st.day === utcDay() && st.used_today > m.usedToday) m.usedToday = st.used_today;
    out.push({ def: c.def, key: c.key, model: st?.model || c.model, cap: st?.daily_cap ?? 1000, priority: st?.priority ?? i + 1 });
  });
  return out.sort((a, b) => a.priority - b.priority);
}

function classifyError(status: number, body: string, headers: Headers): { cooldownMs: number; message: string } {
  const lower = body.toLowerCase();
  const retryAfter = Number(headers.get('retry-after'));
  const m = lower.match(/try again in ([\d.]+)\s*(ms|s|m|h)/);
  let ms = 0;
  if (m) {
    const v = parseFloat(m[1]);
    ms = m[2] === 'ms' ? v : m[2] === 's' ? v * 1000 : m[2] === 'm' ? v * 60000 : v * 3600000;
  } else if (retryAfter > 0) {
    ms = retryAfter * 1000;
  }
  const daily = /per day|daily|tokens per day|requests per day|tpd|rpd|quota exceeded|resource_exhausted|exceeded your current quota/.test(lower);
  if (status === 429 || status === 402 || daily) {
    if (daily && ms === 0) ms = nextUtcMidnight().getTime() - Date.now();
    return { cooldownMs: Math.max(ms, 60_000), message: `Limit (${status}): ${body.slice(0, 160)}` };
  }
  if (status === 401 || status === 403) return { cooldownMs: 6 * 3600_000, message: `Kalit xatosi (${status})` };
  if (status === 404 || status === 400) return { cooldownMs: 3600_000, message: `Model/so'rov xatosi (${status}): ${body.slice(0, 160)}` };
  return { cooldownMs: 120_000, message: `Xato (${status}): ${body.slice(0, 160)}` };
}

async function callProvider(c: Candidate, userPrompt: string, temperature: number, maxTokens: number, timeoutMs = 28_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(c.def.url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}`, ...(c.def.extraHeaders ?? {}) },
      body: JSON.stringify({
        model: c.model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const text = await res.text();
    const latency = Date.now() - started;
    if (!res.ok) return { ok: false as const, status: res.status, body: text, headers: res.headers, latency };
    let content = '';
    try {
      const j = JSON.parse(text);
      content = j?.choices?.[0]?.message?.content ?? '';
    } catch {
      content = text;
    }
    return { ok: true as const, content, latency };
  } catch (e) {
    return { ok: false as const, status: 0, body: String((e as Error).message ?? e), headers: new Headers(), latency: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function persistState(admin: SupabaseClient | null, id: string, patch: Partial<AiProviderState> & { inc?: boolean; err?: boolean; latency?: number }) {
  if (!admin) return;
  try {
    const { data } = await admin.from('ai_provider_state').select('*').eq('provider', id).maybeSingle();
    const row = (data as AiProviderState | null) ?? null;
    const today = utcDay();
    const used = row && row.day === today ? row.used_today : 0;
    const update: Record<string, unknown> = {
      day: today,
      used_today: used + (patch.inc ? 1 : 0),
      total_calls: (row?.total_calls ?? 0) + (patch.inc ? 1 : 0),
      total_errors: (row?.total_errors ?? 0) + (patch.err ? 1 : 0),
      updated_at: new Date().toISOString(),
    };
    if (patch.cooldown_until !== undefined) update.cooldown_until = patch.cooldown_until;
    if (patch.last_error !== undefined) update.last_error = patch.last_error;
    if (patch.latency) update.avg_latency_ms = row?.avg_latency_ms ? Math.round(row.avg_latency_ms * 0.8 + patch.latency * 0.2) : patch.latency;
    if (row) await admin.from('ai_provider_state').update(update).eq('provider', id);
    else await admin.from('ai_provider_state').insert({ provider: id, ...update });
  } catch {
    /* holat saqlanmasa ham ish davom etadi */
  }
}

export interface GatewayCtx {
  user: SupabaseClient;         // foydalanuvchi sessiyasi (RLS)
  admin: SupabaseClient | null; // service role (ixtiyoriy)
  userId: string | null;
  dailyUserCap?: number;
  queueEnabled?: boolean;
  enabled?: boolean;
}

/** Faqat provayderlar zanjiri (kesh/navbatsiz) */
export async function callChain(kind: AiKind, payload: Record<string, unknown>, ctx: Pick<GatewayCtx, 'admin' | 'user'>): Promise<AiResponse> {
  const spec = buildPrompt(kind, payload);
  const candidates = await loadCandidates(ctx.admin, ctx.user);
  if (!candidates.length) return { ok: false, reason: 'disabled', message: 'Hech qanday AI provayder sozlanmagan (.env dagi *_API_KEY).' };
  const now = Date.now();
  let earliest = Infinity;
  const errors: string[] = [];
  for (const c of candidates) {
    const m = getMem(c.def.id);
    if (m.cooldownUntil > now) { earliest = Math.min(earliest, m.cooldownUntil); continue; }
    if (m.usedToday >= c.cap) { earliest = Math.min(earliest, nextUtcMidnight().getTime()); continue; }
    const r = await callProvider(c, spec.user, spec.temperature, spec.maxTokens);
    if (r.ok) {
      const data = extractJson(r.content);
      if (data === null) {
        errors.push(`${c.def.id}: JSON o'qilmadi`);
        m.errors += 1;
        continue;
      }
      m.usedToday += 1;
      m.errors = 0;
      await persistState(ctx.admin, c.def.id, { inc: true, latency: r.latency, cooldown_until: null });
      return { ok: true, data, provider: c.def.id, cached: false };
    }
    const cls = classifyError(r.status, r.body, r.headers);
    m.errors += 1;
    const backoff = cls.cooldownMs * Math.min(8, Math.pow(2, Math.max(0, m.errors - 1)));
    m.cooldownUntil = Date.now() + Math.min(backoff, 24 * 3600_000);
    m.lastError = cls.message;
    earliest = Math.min(earliest, m.cooldownUntil);
    errors.push(`${c.def.id}: ${cls.message}`);
    await persistState(ctx.admin, c.def.id, { err: true, cooldown_until: new Date(m.cooldownUntil).toISOString(), last_error: cls.message });
  }
  const retryAt = Number.isFinite(earliest) ? new Date(earliest).toISOString() : null;
  return { ok: false, reason: 'quota', message: errors.join(' | ') || 'Barcha provayderlar band', retryAt };
}

/** To'liq oqim: kesh → foydalanuvchi limiti → zanjir → navbat */
export async function runAi<T = unknown>(kind: AiKind, payload: Record<string, unknown>, ctx: GatewayCtx): Promise<AiResponse<T>> {
  if (ctx.enabled === false) return { ok: false, reason: 'disabled', message: 'AI admin tomonidan o‘chirilgan.' };
  const spec = buildPrompt(kind, payload);
  const key = spec.cacheable ? cacheKey(kind, payload) : null;

  // 1) kesh (umumiy kontent banki — bir kishi uchun yaratilgan hikoya hammaga xizmat qiladi)
  if (key) {
    const { data } = await ctx.user.from('ai_cache').select('response, hits, provider').eq('key', key).maybeSingle();
    if (data?.response) {
      await ctx.user.from('ai_cache').update({ hits: (data.hits ?? 0) + 1 }).eq('key', key);
      return { ok: true, data: data.response as T, provider: data.provider ?? 'cache', cached: true };
    }
  }

  // 2) foydalanuvchi kunlik limiti
  if (ctx.userId && ctx.dailyUserCap) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count } = await ctx.user.from('ai_jobs').select('id', { count: 'exact', head: true }).eq('user_id', ctx.userId).eq('status', 'done').gte('created_at', since.toISOString());
    if ((count ?? 0) >= ctx.dailyUserCap) {
      return { ok: false, reason: 'quota', message: `Bugungi shaxsiy AI limitingiz (${ctx.dailyUserCap}) tugadi. Ertaga davom etasiz — mashqlar AI'siz ham ishlaydi.`, retryAt: nextUtcMidnight().toISOString() };
    }
  }

  // 3) zanjir
  const res = await callChain(kind, payload, ctx);
  if (res.ok) {
    if (key) await ctx.user.from('ai_cache').upsert({ key, kind, request: payload, response: res.data, provider: res.provider }, { onConflict: 'key' });
    if (ctx.userId) await ctx.user.from('ai_jobs').insert({ user_id: ctx.userId, kind, payload: { k: key ?? kind }, status: 'done', result: null, attempts: 1 });
    return res as AiResponse<T>;
  }

  // 4) navbat
  if (res.reason === 'quota' && ctx.queueEnabled !== false && ctx.userId && QUEUEABLE.includes(kind)) {
    const { data: job } = await ctx.user.from('ai_jobs').insert({ user_id: ctx.userId, kind, payload: { ...payload, _cacheKey: key }, status: 'queued' }).select('id').maybeSingle();
    return { ...res, queued: true, jobId: job?.id };
  }
  return res;
}

/** Navbatdagi ishlarni bajarish (cron yoki piggyback). Admin klient bo'lsa hamma, bo'lmasa faqat o'zinikilar. */
export async function processQueuedJobs(ctx: Pick<GatewayCtx, 'admin' | 'user' | 'userId'>, limit = 5): Promise<{ done: number; failed: number }> {
  const client = ctx.admin ?? ctx.user;
  let q = client.from('ai_jobs').select('*').eq('status', 'queued').lt('attempts', 4).order('created_at', { ascending: true }).limit(limit);
  if (!ctx.admin && ctx.userId) q = q.eq('user_id', ctx.userId);
  const { data: jobs } = await q;
  let done = 0, failed = 0;
  for (const job of jobs ?? []) {
    const payload = { ...(job.payload as Record<string, unknown>) };
    const key = (payload._cacheKey as string | null) ?? null;
    delete payload._cacheKey;
    await client.from('ai_jobs').update({ status: 'running', attempts: job.attempts + 1, updated_at: new Date().toISOString() }).eq('id', job.id);
    const res = await callChain(job.kind as AiKind, payload, ctx);
    if (res.ok) {
      await client.from('ai_jobs').update({ status: 'done', result: res.data, updated_at: new Date().toISOString() }).eq('id', job.id);
      if (key) await client.from('ai_cache').upsert({ key, kind: job.kind, request: payload, response: res.data, provider: res.provider }, { onConflict: 'key' });
      done++;
    } else {
      await client.from('ai_jobs').update({ status: job.attempts + 1 >= 4 ? 'failed' : 'queued', error: res.message, updated_at: new Date().toISOString() }).eq('id', job.id);
      failed++;
      if (res.reason === 'quota') break; // hamma provayder band — keyinroq
    }
  }
  return { done, failed };
}

export function providerSnapshot() {
  return [...mem.entries()].map(([id, s]) => ({ id, ...s, cooldownIso: s.cooldownUntil ? new Date(s.cooldownUntil).toISOString() : null }));
}
