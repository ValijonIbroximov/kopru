import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { edgeSynthesize, googleSynthesize, azureSynthesize, azureConfigured, EDGE_VOICES } from '@/lib/tts/edge';
import { ttsStats, noteTtsResult, type TtsSource } from '@/lib/tts/status';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/tts/status — TTS zanjiri diagnostikasi (60 s keshlanadi).
 * Har manbani qisqa matn bilan sinab ko'radi: qaysi biri ishlayapti, qancha vaqt oladi, xato nima.
 * `active` — hozir foydalanuvchilar eshitadigan manba (zanjirdagi birinchi ishlayotgani).
 */
interface Probe { configured: boolean; ok: boolean; ms: number | null; error: string | null }
let cached: { at: number; body: unknown } | null = null;

async function probe(src: TtsSource): Promise<Probe> {
  const t0 = Date.now();
  try {
    if (src === 'azure') { if (!azureConfigured()) return { configured: false, ok: false, ms: null, error: 'AZURE_SPEECH_KEY / AZURE_SPEECH_REGION yo‘q (ixtiyoriy)' }; await azureSynthesize('Merhaba', EDGE_VOICES.emel, '+0%', 6000); }
    else if (src === 'edge') { await edgeSynthesize('Merhaba', EDGE_VOICES.emel, '+0%', '+0Hz', 6500); }
    else { await googleSynthesize('Merhaba'); }
    const ms = Date.now() - t0; noteTtsResult(src, true, ms);
    return { configured: true, ok: true, ms, error: null };
  } catch (e) {
    const ms = Date.now() - t0; const err = String((e as Error).message ?? e).slice(0, 160);
    noteTtsResult(src, false, ms, err);
    return { configured: true, ok: false, ms, error: err };
  }
}

export async function GET() {
  if (cached && Date.now() - cached.at < 60_000) return NextResponse.json(cached.body, { headers: { 'Cache-Control': 'no-store' } });
  const forced = process.env.TTS_PROVIDER ?? null;
  const [azure, edge, google] = await Promise.all([probe('azure'), probe('edge'), probe('google')]);
  const admin = supabaseAdmin();
  let storage: { configured: boolean; ok: boolean; error: string | null } = { configured: Boolean(admin), ok: false, error: null };
  if (admin) {
    try { const { error } = await admin.storage.from('tts').list('', { limit: 1 }); storage = { configured: true, ok: !error, error: error?.message ?? null }; }
    catch (e) { storage = { configured: true, ok: false, error: String((e as Error).message) }; }
  }
  const order: TtsSource[] = forced === 'google' ? ['google'] : forced === 'azure' ? ['azure'] : ['azure', 'edge', 'google'];
  const results = { azure, edge, google };
  const active = forced === 'browser' ? 'browser' : (order.find((s) => results[s].ok) ?? 'browser');
  const body = {
    ok: active !== 'browser',
    active,                      // azure | edge | google | browser
    activeLabel: { azure: 'Microsoft Azure neyron (rasmiy)', edge: 'Microsoft neyron (Edge)', google: 'Google TTS (zaxira)', browser: 'Brauzer ovozi (server TTS ishlamayapti)' }[active],
    forced,
    providers: results,
    storage,
    stats: ttsStats(),
    checkedAt: new Date().toISOString(),
  };
  cached = { at: Date.now(), body };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
