import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { edgeSynthesize, googleSynthesize, EDGE_VOICES } from '@/lib/tts/edge';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/tts?text=Merhaba&voice=emel|ahmet&rate=slow|normal
 * Zanjir: Supabase Storage kesh → Edge neyron TTS → Google TTS → 503 (klient brauzer ovoziga o'tadi).
 * Javob: audio/mpeg, 1 yil keshlanadi (URL matn+ovoz bo'yicha deterministik).
 */
const mem = new Map<string, Buffer>(); // instansiya ichidagi tezkor kesh (Storage bo'lmasa ham ishlaydi)
const MEM_MAX = 300;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const text = (sp.get('text') ?? '').trim().slice(0, 400);
  const voiceKey = sp.get('voice') === 'ahmet' ? 'ahmet' : 'emel';
  const rateKey = sp.get('rate') === 'slow' ? 'slow' : 'normal';
  if (!text) return NextResponse.json({ error: 'text kerak' }, { status: 400 });
  if (process.env.TTS_PROVIDER === 'browser') return NextResponse.json({ error: 'server TTS o‘chirilgan' }, { status: 503 });

  const key = `${voiceKey}/${rateKey}/${createHash('sha1').update(text.toLocaleLowerCase('tr-TR')).digest('hex')}.mp3`;
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
  if (process.env.TTS_PROVIDER !== 'google') {
    try { buf = await edgeSynthesize(text, EDGE_VOICES[voiceKey], rate); } catch (e) { console.warn('[tts] edge xato:', (e as Error).message); }
  }
  if (!buf) {
    try { buf = await googleSynthesize(text); source = 'google'; } catch (e) { console.warn('[tts] google xato:', (e as Error).message); }
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
