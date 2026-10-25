import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { loadSettings } from '@/lib/settings';
import { runAi } from '@/lib/ai/gateway';
import { learnerContext } from '@/lib/ai/learner';
import type { AiKind } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const KINDS: AiKind[] = ['story', 'tutor', 'explain', 'exercises', 'feedback', 'exam_writing', 'translate'];

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, reason: 'unauthorized', message: 'Kirish talab qilinadi' }, { status: 401 });

  let body: { kind?: AiKind; payload?: Record<string, unknown> };
  try { const raw = await req.text(); if (raw.length > 24_000) return NextResponse.json({ ok: false, reason: 'invalid', message: 'So‘rov juda katta' }, { status: 413 }); body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, reason: 'invalid', message: 'JSON xato' }, { status: 400 }); }
  if (!body || !body.kind || !KINDS.includes(body.kind)) return NextResponse.json({ ok: false, reason: 'invalid', message: 'Noma’lum kind' }, { status: 400 });

  if (body.payload != null && (typeof body.payload !== 'object' || Array.isArray(body.payload))) return NextResponse.json({ ok: false, reason: 'invalid', message: 'Payload xato' }, { status: 400 });
  const payload = { ...(body.payload ?? {}) };
  delete payload.learner;
  if (['tutor', 'story', 'exercises', 'explain'].includes(body.kind)) {
    try { const learner = await learnerContext(sb, auth.user.id); payload.learner = learner; payload.level = learner.level; if (body.kind === 'tutor' || body.kind === 'story') payload.words = learner.known; }
    catch { return NextResponse.json({ ok: false, reason: 'error', message: 'O‘quv tarixini o‘qib bo‘lmadi. Qayta urinib ko‘ring.' }, { status: 503 }); }
  }
  // Xavfsizlik: matn hajmini cheklash
  for (const k of Object.keys(payload)) {
    const v = payload[k];
    if (typeof v === 'string' && v.length > 4000) payload[k] = v.slice(0, 4000);
  }

  const settings = await loadSettings(sb);
  const admin = supabaseAdmin();
  const ctx = { user: sb, admin, userId: auth.user.id, dailyUserCap: settings.ai.daily_user_cap, queueEnabled: settings.ai.queue_enabled, enabled: settings.ai.enabled };
  const res = await runAi(body.kind, payload, ctx);

  return NextResponse.json(res, { status: res.ok ? 200 : res.reason === 'quota' ? 429 : res.reason === 'disabled' ? 503 : 500 });
}
