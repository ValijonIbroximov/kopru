/**
 * Microsoft Edge "Read Aloud" neyron TTS (bepul, kalitsiz). Turkcha ovozlar: tr-TR-EmelNeural (ayol), tr-TR-AhmetNeural (erkak).
 * Protokol: WebSocket → speech.config → SSML → binary audio kadrlar → "Path:turn.end".
 * Diqqat: norasmiy API — ishlamay qolsa Google TTS, so'ng brauzer ovozi ishlatiladi (speech.ts / route.ts).
 */
import { createHash, randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM = '130.0.2849.68';
const WSS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

export const EDGE_VOICES: Record<string, string> = {
  emel: 'tr-TR-EmelNeural',
  ahmet: 'tr-TR-AhmetNeural',
};

/** Sec-MS-GEC: SHA256(ticks(5 daqiqaga yaxlitlangan Windows FILETIME) + token), katta harf hex */
let clockSkewMs = 0; // server soati bilan farq (403 bo'lsa Date sarlavhasidan tuzatiladi)
function secMsGec(): string {
  const unix = Math.floor((Date.now() + clockSkewMs) / 1000) + 11644473600; // 1601 dan boshlab soniyalar
  const rounded = unix - (unix % 300);
  const ticks = BigInt(rounded) * 10_000_000n;
  return createHash('sha256').update(`${ticks}${TRUSTED_CLIENT_TOKEN}`).digest('hex').toUpperCase();
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function dateStr() {
  return new Date().toString().replace(/\(.*\)/, '(Coordinated Universal Time)');
}

/** Bir urinish; 403 bo'lsa server vaqtidan soat farqini hisoblab, chaqiruvchi qayta uradi */
function edgeSynthesizeOnce(text: string, voice: string, rate: string, pitch: string, timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const connId = randomUUID().replace(/-/g, '');
    const url = `${WSS}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=1-${CHROMIUM}&ConnectionId=${connId}`;
    const ws = new WebSocket(url, {
      headers: {
        Pragma: 'no-cache', 'Cache-Control': 'no-cache',
        Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Accept-Encoding': 'gzip, deflate, br', 'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM.split('.')[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM}`,
      },
    });
    const chunks: Buffer[] = [];
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch { /* noop */ } reject(new Error('edge-tts timeout')); } }, timeoutMs);
    const finish = (err?: Error) => { if (done) return; done = true; clearTimeout(timer); try { ws.close(); } catch { /* noop */ } if (err) reject(err); else resolve(Buffer.concat(chunks)); };

    ws.on('open', () => {
      const cfg = `X-Timestamp:${dateStr()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({ context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' }, outputFormat: 'audio-24khz-48kbitrate-mono-mp3' } } } });
      ws.send(cfg);
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='tr-TR'><voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${escapeXml(text)}</prosody></voice></speak>`;
      ws.send(`X-RequestId:${connId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${dateStr()}Z\r\nPath:ssml\r\n\r\n${ssml}`);
    });
    ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      if (isBinary) {
        if (buf.length < 2) return;
        const headerLen = buf.readUInt16BE(0);
        const header = buf.subarray(2, 2 + headerLen).toString('utf8');
        if (header.includes('Path:audio')) chunks.push(buf.subarray(2 + headerLen));
      } else {
        const txt = buf.toString('utf8');
        if (txt.includes('Path:turn.end')) finish(chunks.length ? undefined : new Error('edge-tts: bo‘sh audio'));
      }
    });
    ws.on('unexpected-response', (_req, res) => {
      // 403 — ko'pincha soat farqi (Sec-MS-GEC 5 daqiqalik oynaga bog'liq). Server Date sarlavhasidan farqni olamiz.
      const dateHdr = res.headers?.date;
      if (res.statusCode === 403 && dateHdr) { const serverMs = Date.parse(String(dateHdr)); if (Number.isFinite(serverMs)) clockSkewMs = serverMs - Date.now(); }
      finish(new Error(`edge-tts HTTP ${res.statusCode}`));
    });
    ws.on('error', (e) => finish(e instanceof Error ? e : new Error(String(e))));
    ws.on('close', () => { if (!done) finish(chunks.length ? undefined : new Error('edge-tts: ulanish yopildi')); });
  });
}

export async function edgeSynthesize(text: string, voice = EDGE_VOICES.emel, rate = '+0%', pitch = '+0Hz', timeoutMs = 12000): Promise<Buffer> {
  try { return await edgeSynthesizeOnce(text, voice, rate, pitch, timeoutMs); }
  catch (e) {
    // 403 dan keyin soat farqi tuzatilgan bo'lsa — bir marta qayta
    if (/403/.test(String((e as Error).message))) return edgeSynthesizeOnce(text, voice, rate, pitch, timeoutMs);
    throw e;
  }
}

/**
 * Azure Speech (RASMIY, bepul F0 tier: oyiga 500 000 belgi neyron ovoz). Ixtiyoriy:
 * AZURE_SPEECH_KEY + AZURE_SPEECH_REGION (masalan, westeurope). Sozlangan bo'lsa birinchi navbatda ishlatiladi —
 * Edge protokoli o'zgarsa ham ovoz sifati saqlanadi. Ovozlar aynan tr-TR-EmelNeural / tr-TR-AhmetNeural.
 */
export function azureConfigured() { return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION); }
export async function azureSynthesize(text: string, voice = EDGE_VOICES.emel, rate = '+0%', timeoutMs = 8000): Promise<Buffer> {
  const key = process.env.AZURE_SPEECH_KEY; const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error('azure: sozlanmagan');
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='tr-TR'><voice name='${voice}'><prosody rate='${rate}'>${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST', signal: AbortSignal.timeout(timeoutMs),
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'TezBil' },
    body: ssml,
  });
  if (!res.ok) throw new Error(`azure ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const ab = await res.arrayBuffer();
  if (ab.byteLength < 500) throw new Error('azure: bo‘sh audio');
  return Buffer.from(ab);
}

/** Google Translate TTS (zaxira; ≤ 200 belgi) */
export async function googleSynthesize(text: string, slow = false): Promise<Buffer> {
  const parts = text.match(/.{1,180}(?:\s|$)|\S{1,180}/gu) ?? [];
  const audio: Buffer[] = [];
  for (const q of parts) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=tr&client=tw-ob&ttsspeed=${slow ? '0.24' : '1'}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', Referer: 'https://translate.google.com/' } });
  if (!res.ok) throw new Error(`google-tts ${res.status}`);
  const ab = await res.arrayBuffer();
  if (ab.byteLength < 500) throw new Error('google-tts: bo‘sh');
  audio.push(Buffer.from(ab));
  }
  return Buffer.concat(audio);
}
