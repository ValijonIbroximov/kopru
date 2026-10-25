import { classifyError } from './errors';
/**
 * AI shlyuzi: provayderlar zanjiri → limit tugasa keyingisi → hammasi tugasa kesh/navbat.
 * Limit qayta tiklanganda hech narsa yo'qolmaydi: navbatdagi ishlar cron yoki keyingi
 * muvaffaqiyatli so'rovda avtomatik bajariladi, natija keshda saqlanadi.
 */
import { validTutor } from './validation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiKind, AiResponse, AiProviderState } from '@/lib/types';
import { currentModel, configuredProviders, type ProviderDef } from './providers';
import { buildPrompt, extractJson, SYSTEM_PROMPT } from './prompts';
import { hashString } from '@/lib/utils';

interface MemState { cooldownUntil: number; errors: number; usedToday: number; day: string; lastError?: string; reason?: 'quota' | 'error' }
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
  const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b)).map(([k,value]) => [k, stable(value)])) : v;
  const norm = JSON.stringify(stable(payload));
  return `v2:${kind}:${hashString(norm)}:${hashString(norm.split('').reverse().join(''))}`;
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
    const model = currentModel(c.def.id, st?.model || c.model);
    if (c.def.id === 'openrouter' && model !== 'openrouter/free' && !model.endsWith(':free')) return;
    out.push({ def: c.def, key: c.key, model, cap: st?.daily_cap ?? 1000, priority: st?.priority ?? i + 1 });
  });
  return out.sort((a, b) => a.priority - b.priority);
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

/**
 * Bepul tier uchun model "narvoni": bitta model limiti (masalan, Groq 70B — kuniga 100K token) tugasa,
 * shu provayderning boshqa bepul modeli sinab ko'riladi — faqat keyin keyingi provayderga o'tiladi.
 * Groq limitlari model bo'yicha alohida, shuning uchun bu amalda kunlik sig'imni bir necha barobar oshiradi.
 * Mavjud bo'lmagan model (404) ham xavfsiz o'tkazib yuboriladi.
 */
export const MODEL_LADDER: Record<string, string[]> = {
  groq: ['openai/gpt-oss-120b', 'meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b', 'llama-3.1-8b-instant'],
  gemini: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'],
  cerebras: ['gpt-oss-120b', 'llama3.1-8b'],
  openrouter: ['openrouter/free'],
  mistral: ['open-mistral-nemo', 'mistral-small-latest'],
};
function modelsFor(c: Candidate): string[] {
  const out: string[] = [];
  for (const m of [c.model, ...(MODEL_LADDER[c.def.id] ?? [])]) if (m && !out.includes(m)) out.push(m);
  return out;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Faqat provayderlar zanjiri (kesh/navbatsiz) */
export async function callChain(kind: AiKind, payload: Record<string, unknown>, ctx: Pick<GatewayCtx, 'admin' | 'user'>): Promise<AiResponse> {
  const spec = buildPrompt(kind, payload);
  const candidates = await loadCandidates(ctx.admin, ctx.user);
  if (!candidates.length) return { ok: false, reason: 'disabled', message: 'Hech qanday AI provayder sozlanmagan (.env dagi *_API_KEY).' };
  const now = Date.now();
  const deadline = now + 40_000;
  let earliest = Infinity;
  const errors: string[] = [];
  let failureReason: 'quota' | 'error' = 'quota';
  const tried: string[] = [];
  for (const c of candidates) {
    const m = getMem(c.def.id);
    if (m.cooldownUntil > now) { if (m.reason === 'error') failureReason = 'error'; earliest = Math.min(earliest, m.cooldownUntil); continue; }
    if (m.usedToday >= c.cap) { earliest = Math.min(earliest, nextUtcMidnight().getTime()); continue; }
    if (Date.now() >= deadline - 1000) break;

    let providerDelay = Infinity;      // provayder uchun eng kichik aniq kutish (429 lardan)
    let hardError: ReturnType<typeof classifyError> | null = null;
    let parseFailed = false;
    for (const model of modelsFor(c)) {
      if (Date.now() >= deadline - 1000) break;
      tried.push(`${c.def.id}:${model}`);
      let r = await callProvider({ ...c, model }, spec.user, spec.temperature, spec.maxTokens, Math.min(12_000, deadline - Date.now()));
      // Qisqa Retry-After (masalan, Mistral 1 so'rov/soniya) — bir marta kutib qayta uramiz
      if (!r.ok && r.status === 429) {
        const cls0 = classifyError(r.status, r.body, r.headers);
        if (cls0.explicitDelay && cls0.cooldownMs <= 3000 && Date.now() + cls0.cooldownMs < deadline - 2000) {
          await sleep(cls0.cooldownMs);
          r = await callProvider({ ...c, model }, spec.user, spec.temperature, spec.maxTokens, Math.min(12_000, deadline - Date.now()));
        }
      }
      if (r.ok) {
        const data = extractJson(r.content);
        if (data === null || (kind === 'tutor' && !validTutor(data))) { parseFailed = true; continue; } // boshqa model bilan urinib ko'ramiz
        m.usedToday += 1;
        m.errors = 0; m.cooldownUntil = 0; m.reason = undefined;
        await persistState(ctx.admin, c.def.id, { inc: true, latency: r.latency, cooldown_until: null });
        return { ok: true, data, provider: c.def.id, cached: false, model };
      }
      const cls = classifyError(r.status, r.body, r.headers);
      const modelMissing = r.status === 404 || (r.status === 400 && /model/i.test(r.body) && /not found|does not exist|unknown|invalid|decommission|unsupported/i.test(r.body));
      if (cls.reason === 'quota') { providerDelay = Math.min(providerDelay, cls.cooldownMs); m.lastError = cls.diagnostic; continue; }
      if (modelMissing) { m.lastError = cls.diagnostic; continue; }
      hardError = cls; break; // kalit/tarmoq/server xatosi — boshqa model yordam bermaydi
    }

    m.errors += 1;
    if (hardError) {
      m.reason = 'error'; failureReason = 'error';
      const backoff = hardError.cooldownMs * (hardError.explicitDelay ? 1 : Math.min(8, Math.pow(2, Math.max(0, m.errors - 1))));
      m.cooldownUntil = Date.now() + Math.min(backoff, 24 * 3600_000);
      m.lastError = hardError.diagnostic;
      errors.push(hardError.message);
    } else if (Number.isFinite(providerDelay)) {
      m.reason = 'quota';
      m.cooldownUntil = Date.now() + Math.min(providerDelay, 24 * 3600_000);
      errors.push('Bepul AI xizmatining limiti vaqtincha tugadi. Kutish muddati tugagach qayta urinib ko‘ring.');
    } else {
      // faqat "model topilmadi" / javob o'qilmadi — qisqa pauza
      m.reason = parseFailed ? 'error' : 'quota';
      if (parseFailed) { failureReason = 'error'; errors.push('AI javobini o‘qib bo‘lmadi. Qayta urinib ko‘ring.'); }
      else errors.push('AI modeli topilmadi — Admin → AI → Model nomini tekshiring.');
      m.cooldownUntil = Date.now() + 60_000;
    }
    earliest = Math.min(earliest, m.cooldownUntil);
    await persistState(ctx.admin, c.def.id, { err: true, cooldown_until: new Date(m.cooldownUntil).toISOString(), last_error: m.lastError ?? null });
  }
  const retryAt = Number.isFinite(earliest) ? new Date(earliest).toISOString() : null;
  const configured = candidates.map((c) => c.def.label).join(', ');
  const hint = candidates.length <= 1
    ? ' Maslahat: Vercel env’ga bepul GROQ_API_KEY va GEMINI_API_KEY qo‘shing — zanjir shunda deyarli to‘xtamaydi.'
    : '';
  return { ok: false, reason: failureReason, message: (errors[0] || 'AI xizmati vaqtincha band. Kutish muddati tugagach qayta urinib ko‘ring.') + hint, retryAt, detail: `Sozlangan: ${configured}. Sinaldi: ${tried.length}` };
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
