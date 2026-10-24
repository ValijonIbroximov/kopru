import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { callChain, processQueuedJobs, cacheKey } from '@/lib/ai/gateway';
import { loadSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Kunlik cron (Vercel Cron → 01:00 UTC = 06:00 Toshkent).
 * 1) AI navbatini bajarish  2) "Kun hikoyasi"ni oldindan tayyorlash (A1, A2)
 * 3) Dushanba — haftalik ligalarni yangilash  4) Eski sessiyalar/keshni tozalash
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY yo‘q' }, { status: 500 });
  const log: Record<string, unknown> = {};
  const settings = await loadSettings(admin);

  // 1) navbat
  try { log.queue = await processQueuedJobs({ user: admin, admin, userId: null }, 15); } catch (e) { log.queueError = String(e); }

  // 2) kun hikoyasi (kontent banki)
  if (settings.ai.enabled) {
    const dayNum = Math.floor(Date.now() / 86400000);
    const topics = ['kundalik hayot', 'sayohat', 'oila', 'shahar', 'sport', 'ish va o‘qish', 'texnologiya'];
    const topic = topics[dayNum % topics.length];
    const { data: words } = await admin.from('words').select('tr, cefr').limit(400);
    const made: string[] = [];
    for (const level of ['A1', 'A2']) {
      const known = (words ?? []).filter((w) => w.cefr === level || level === 'A2').slice(0, 60).map((w) => w.tr);
      const payload = { level, topic, words: known, seed: `${dayNum}-0`, length: settings.ai.story_words };
      const key = cacheKey('story', payload);
      const { data: hit } = await admin.from('ai_cache').select('key').eq('key', key).maybeSingle();
      if (hit) continue;
      const res = await callChain('story', payload, { admin, user: admin });
      if (res.ok) { await admin.from('ai_cache').upsert({ key, kind: 'story', request: payload, response: res.data, provider: res.provider }, { onConflict: 'key' }); made.push(level); }
      else { log.storyError = res.message; break; }
    }
    log.stories = made;
  }

  // 3) dushanba — ligalar
  const dow = new Date().getUTCDay();
  if (dow === 1) {
    const { data, error } = await admin.rpc('reset_weekly_leagues');
    log.leagues = error ? error.message : data;
  }

  // 4) tozalash
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  await admin.from('sessions').update({ status: 'abandoned' }).eq('status', 'active').lt('updated_at', weekAgo);
  const ttl = new Date(Date.now() - settings.ai.cache_ttl_days * 86400000).toISOString();
  await admin.from('ai_cache').delete().lt('created_at', ttl).eq('hits', 0);
  await admin.from('ai_jobs').delete().eq('status', 'done').is('result', null).lt('created_at', weekAgo);
  await admin.from('duels').delete().in('status', ['waiting', 'cancelled']).lt('created_at', weekAgo);

  log.ok = true;
  log.at = new Date().toISOString();
  return NextResponse.json(log);
}
