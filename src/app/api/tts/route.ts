import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { edgeSynthesize, googleSynthesize, azureSynthesize, azureConfigured, EDGE_VOICES } from '@/lib/tts/edge';
import { noteTtsResult } from '@/lib/tts/status';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/tts?text=Merhaba&voice=emel|ahmet&rate=slow|normal
 * Zanjir: Supabase Storage kesh → Azure Speech (rasmiy, ixtiyoriy kalit) → Edge neyron TTS → Google TTS → 503 (klient brauzer ovoziga o'tadi).
 * Har natija src/lib/tts/status.ts ga yoziladi — /api/tts/status va Profil → Ovoz bo'limi qaysi manba ishlayotganini ko'rsatadi.
 * Javob: audio/mpeg, 1 yil keshlanadi (URL matn+ovoz bo'yicha deterministik).
 */
const mem = new Map<string, Buffer>(); // instansiya ichidagi tezkor kesh (Storage bo'lmasa ham ishlaydi)
const MEM_MAX = 300;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const text = (sp.get('text') ?? '').normalize('NFC').trim();
  const voiceKey = sp.get('voice') === 'ahmet' ? 'ahmet' : 'emel';
  const rateKey = sp.get('rate') === 'slow' ? 'slow' : 'normal';
  if (text.length > 400) return NextResponse.json({ error: 'Matn 400 belgidan oshmasin' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'text kerak' }, { status: 400 });
  if (process.env.TTS_PROVIDER === 'browser') return NextResponse.json({ error: 'server TTS o‘chirilgan' }, { status: 503 });

  const key = `v2/${voiceKey}/${rateKey}/${createHash('sha1').update(text).digest('hex')}.mp3`;
  const headers = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-TTS-Source': 'cache' };

  const hit = mem.get(key);
  if (hit) return new NextResponse(new Uint8Array(hit), { headers });

  const admin = supabaseAdmin();
  if (admin) {
    try {
      const { data } = await admin.storage.from('tts').download(key);
      if (data) { const buf = Buffer.from(await data.arrayBuffer()); remember(key, buf); return new NextResponse(new Uint8Array(buf), { headers: { ...headers, 'X-TTS-Source': 'storage' } }); }
    } catch { /* kesh yo'q — sintez qilamiz */ }
  }

  let buf: Buffer | null = null; let source = 'edge';
  const rate = rateKey === 'slow' ? '-30%' : '+0%';
  const forced = process.env.TTS_PROVIDER; // 'azure' | 'edge' | 'google' | undefined
  if (azureConfigured() && (!forced || forced === 'azure')) {
    const t0 = Date.now();
    try { buf = await azureSynthesize(text, EDGE_VOICES[voiceKey], rate); source = 'azure'; noteTtsResult('azure', true, Date.now() - t0); }
    catch (e) { noteTtsResult('azure', false, Date.now() - t0, (e as Error).message); console.warn('[tts] azure xato:', (e as Error).message); }
  }
  if (!buf && forced !== 'google' && forced !== 'azure') {
    const t0 = Date.now();
    try { buf = await edgeSynthesize(text, EDGE_VOICES[voiceKey], rate, '+0Hz', 6500); source = 'edge'; noteTtsResult('edge', true, Date.now() - t0); }
    catch (e) { noteTtsResult('edge', false, Date.now() - t0, (e as Error).message); console.warn('[tts] edge xato:', (e as Error).message); }
  }
  if (!buf) {
    const t0 = Date.now();
    try { buf = await googleSynthesize(text, rateKey === 'slow'); source = 'google'; noteTtsResult('google', true, Date.now() - t0); }
    catch (e) { noteTtsResult('google', false, Date.now() - t0, (e as Error).message); console.warn('[tts] google xato:', (e as Error).message); }
  }
  if (!buf) return NextResponse.json({ error: 'TTS vaqtincha mavjud emas' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  remember(key, buf);
  // Serverless funksiyada javobdan keyingi ish kafolatlanmaydi — yuklashni kutamiz (eng ko'pi 2.5 s)
  if (admin) {
    const up = admin.storage.from('tts').upload(key, buf, { contentType: 'audio/mpeg', upsert: true }).then(({ error }) => { if (error) console.warn('[tts] storage upload:', error.message); }).catch(() => {});
    await Promise.race([up, new Promise((r) => setTimeout(r, 2500))]);
  }
  return new NextResponse(new Uint8Array(buf), { headers: { ...headers, 'X-TTS-Source': source } });
}

function remember(key: string, buf: Buffer) {
  if (mem.size >= MEM_MAX) { const first = mem.keys().next().value; if (first) mem.delete(first); }
  mem.set(key, buf);
}
