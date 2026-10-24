'use client';
/** Brauzer TTS (turkcha ovoz) va nutqni tanish — bepul, serverga yuk yo'q. */

let voicesCache: SpeechSynthesisVoice[] = [];

export function ttsAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!ttsAvailable()) return resolve([]);
    const v = window.speechSynthesis.getVoices();
    if (v.length) {
      voicesCache = v;
      return resolve(v);
    }
    const t = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 800);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(t);
      voicesCache = window.speechSynthesis.getVoices();
      resolve(voicesCache);
    };
  });
}

export async function turkishVoice(preferredName?: string) {
  const voices = voicesCache.length ? voicesCache : await loadVoices();
  if (preferredName) {
    const p = voices.find((v) => v.name === preferredName);
    if (p) return p;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith('tr') && /google|natural|neural|premium/i.test(v.name))
    ?? voices.find((v) => v.lang.toLowerCase().startsWith('tr'))
    ?? null;
}

export async function listTurkishVoices() {
  const voices = voicesCache.length ? voicesCache : await loadVoices();
  return voices.filter((v) => v.lang.toLowerCase().startsWith('tr'));
}

export async function speak(text: string, opts: { rate?: number; voiceName?: string } = {}): Promise<boolean> {
  if (!ttsAvailable()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'tr-TR';
  u.rate = opts.rate ?? 0.9;
  const v = await turkishVoice(opts.voiceName);
  if (v) u.voice = v;
  return new Promise((resolve) => {
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth.speak(u);
  });
}

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
    rec.lang = 'tr-TR';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    let done = false;
    const finish = (r: SttResult | null) => {
      if (done) return;
      done = true;
      try { rec.stop(); } catch { /* noop */ }
      resolve(r);
    };
    const t = setTimeout(() => finish(null), timeoutMs);
    rec.onresult = (e) => {
      clearTimeout(t);
      const alt = e.results?.[0]?.[0];
      finish(alt ? { transcript: alt.transcript, confidence: alt.confidence ?? 0.5 } : null);
    };
    rec.onerror = () => { clearTimeout(t); finish(null); };
    rec.onend = () => { clearTimeout(t); finish(null); };
    try { rec.start(); } catch { clearTimeout(t); finish(null); }
  });
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
