'use client';
/**
 * Turkcha nutq:
 *  1) Neyron TTS (/api/tts → Edge "Emel/Ahmet" → Google) — sifatli, keshlanadi
 *  2) Brauzer speechSynthesis — zaxira (eng yaxshi turkcha ovoz avtomatik tanlanadi)
 * Nutqni tanish (STT) — brauzer Web Speech API.
 */

export type VoicePref = 'emel' | 'ahmet' | 'browser';
const PREF_KEY = 'tezbil.voice';

export function getVoicePref(): VoicePref {
  try { const v = localStorage.getItem(PREF_KEY); if (v === 'emel' || v === 'ahmet' || v === 'browser') return v; } catch { /* noop */ }
  return 'emel';
}
export function setVoicePref(v: VoicePref) { try { localStorage.setItem(PREF_KEY, v); } catch { /* noop */ } }

let sequence = 0;
let cancelActive: (() => void) | null = null;
export function ttsAvailable() { return typeof window !== 'undefined' && ('speechSynthesis' in window || 'Audio' in window); }
async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) return synth.getVoices();
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', finish); resolve(synth.getVoices()); };
    const timer = setTimeout(finish, 1200);
    synth.addEventListener('voiceschanged', finish);
  });
}
export async function listTurkishVoices() { return (await loadVoices()).filter(v => /^tr(?:[-_]|$)/i.test(v.lang)); }
export async function turkishVoice(preferredName?: string) {
  const voices = await listTurkishVoices();
  return voices.find(v => v.name === preferredName) ?? voices.sort((a,b) => voiceScore(b) - voiceScore(a))[0] ?? null;
}
function voiceScore(v: SpeechSynthesisVoice) { return (/natural|neural|online/i.test(v.name) ? 5 : 0) + (/google/i.test(v.name) ? 4 : 0); }
export function ttsUrl(text: string, voice: Exclude<VoicePref, 'browser'> = 'emel', slow = false) {
  return `/api/tts?v=2&text=${encodeURIComponent(text)}&voice=${voice}&rate=${slow ? 'slow' : 'normal'}`;
}
function playUrl(url: string, token: number): Promise<boolean> {
  return new Promise(resolve => {
    const a = new Audio(url);
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return; settled = true; clearTimeout(timer);
      a.onended = null; a.onerror = null; a.onplaying = null;
      a.pause(); a.removeAttribute('src'); a.load();
      if (cancelActive === cancel) cancelActive = null;
      resolve(ok && token === sequence);
    };
    const cancel = () => finish(false);
    let timer = setTimeout(() => finish(false), 22_000);
    cancelActive = cancel;
    a.onplaying = () => { clearTimeout(timer); timer = setTimeout(() => finish(false), 90_000); };
    a.onended = () => finish(true); a.onerror = () => finish(false);
    a.play().catch(() => finish(false));
  });
}
async function browserSpeak(text: string, rate: number, token: number, name?: string): Promise<boolean> {
  const voice = await turkishVoice(name);
  // Turkcha ovoz bo'lmasa inglizcha/ruscha ovozda noto'g'ri o'qimang.
  if (!voice || token !== sequence) return false;
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR'; u.voice = voice; u.rate = Math.max(0.55, Math.min(1.15, rate));
    let done = false;
    const finish = (ok: boolean) => { if (done) return; done = true; clearTimeout(timer); if (cancelActive === cancel) cancelActive = null; resolve(ok && token === sequence); };
    const cancel = () => { finish(false); window.speechSynthesis.cancel(); };
    const timer = setTimeout(cancel, 90_000); cancelActive = cancel;
    u.onend = () => finish(true); u.onerror = () => finish(false);
    window.speechSynthesis.speak(u);
  });
}
export async function speak(text: string, opts: { rate?: number; voiceName?: string } = {}): Promise<boolean> {
  if (typeof window === 'undefined' || !text.trim()) return false;
  stopSpeech(); const token = sequence;
  const pref = getVoicePref();
  // Uzun matnni jim kesish o'rniga so'z chegarasida bo'lib o'qiymiz.
  const chunks = text.normalize('NFC').trim().match(/.{1,350}(?:\s|$)|\S{1,350}/gu) ?? [];
  for (const chunk of chunks) {
    if (token !== sequence) return false;
    let ok = false;
    if (pref !== 'browser') ok = await playUrl(ttsUrl(chunk.trim(), pref, (opts.rate ?? 0.9) < 0.75), token);
    if (token !== sequence) return false;
    if (!ok) ok = await browserSpeak(chunk.trim(), opts.rate ?? 0.9, token, opts.voiceName);
    if (!ok) return false;
  }
  return true;
}
export function prefetchSpeech(text: string) {
  if (typeof window === 'undefined' || getVoicePref() === 'browser' || text.length > 400) return;
  fetch(ttsUrl(text, getVoicePref() as 'emel' | 'ahmet'), { signal: AbortSignal.timeout(20_000) }).catch(() => {});
}
export function stopSpeech() {
  sequence++; cancelActive?.(); cancelActive = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

// ---------------- STT ----------------
export function sttAvailable() {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface SttResult { transcript: string; confidence: number }

export function listenOnce(timeoutMs = 7000): Promise<SttResult | null> {
  return new Promise((resolve) => {
    if (!sttAvailable()) return resolve(null);
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return resolve(null);
    const rec = new Ctor();
    rec.lang = 'tr-TR'; rec.interimResults = false; rec.maxAlternatives = 3;
    let done = false;
    const finish = (r: SttResult | null) => { if (done) return; done = true; try { rec.stop(); } catch { /* noop */ } resolve(r); };
    const t = setTimeout(() => finish(null), timeoutMs);
    rec.onresult = (e) => { clearTimeout(t); const alt = e.results?.[0]?.[0]; finish(alt ? { transcript: alt.transcript, confidence: alt.confidence ?? 0.5 } : null); };
    rec.onerror = () => { clearTimeout(t); finish(null); };
    rec.onend = () => { clearTimeout(t); finish(null); };
    try { rec.start(); } catch { clearTimeout(t); finish(null); }
  });
}

/**
 * Suhbat rejimi uchun tinglash: oraliq natijalar (interim) ko'rsatiladi, gap tugaganda yakuniy matn qaytadi.
 * `stop()` — foydalanuvchi to'xtatganda; `timeoutMs` — jim tursa avtomatik tugaydi.
 */
export function listenLive(opts: { onInterim?: (text: string) => void; timeoutMs?: number; lang?: string } = {}): { result: Promise<SttResult | null>; stop: () => void } {
  let stopFn = () => {};
  const result = new Promise<SttResult | null>((resolve) => {
    if (!sttAvailable()) return resolve(null);
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return resolve(null);
    const rec = new Ctor();
    rec.lang = opts.lang ?? 'tr-TR'; rec.interimResults = true; rec.maxAlternatives = 2;
    let done = false; let finalText = ''; let conf = 0.5;
    const finish = (r: SttResult | null) => { if (done) return; done = true; clearTimeout(t); try { rec.stop(); } catch { /* noop */ } resolve(r); };
    const t = setTimeout(() => finish(finalText ? { transcript: finalText, confidence: conf } : null), opts.timeoutMs ?? 12_000);
    rec.onresult = (e) => {
      let interim = '';
      const res = e.results as ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean }>;
      for (let i = 0; i < res.length; i++) {
        const alt = res[i][0]; if (!alt) continue;
        if ((res[i] as { isFinal?: boolean }).isFinal) { finalText += (finalText ? ' ' : '') + alt.transcript.trim(); conf = alt.confidence ?? conf; }
        else interim += alt.transcript;
      }
      opts.onInterim?.((finalText + ' ' + interim).trim());
      if (finalText && !interim) finish({ transcript: finalText, confidence: conf });
    };
    rec.onerror = () => finish(finalText ? { transcript: finalText, confidence: conf } : null);
    rec.onend = () => finish(finalText ? { transcript: finalText, confidence: conf } : null);
    stopFn = () => finish(finalText ? { transcript: finalText, confidence: conf } : null);
    try { rec.start(); } catch { finish(null); }
  });
  return { result, stop: () => stopFn() };
}

interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
}
