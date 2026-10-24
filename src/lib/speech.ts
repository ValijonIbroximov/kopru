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

let voicesCache: SpeechSynthesisVoice[] = [];
let audioEl: HTMLAudioElement | null = null;
let serverDownUntil = 0; // server TTS ishlamasa 2 daqiqa brauzerga o'tamiz

export function ttsAvailable() {
  return typeof window !== 'undefined' && ('speechSynthesis' in window || 'Audio' in window);
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve([]);
    const v = window.speechSynthesis.getVoices();
    if (v.length) { voicesCache = v; return resolve(v); }
    const t = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 800);
    window.speechSynthesis.onvoiceschanged = () => { clearTimeout(t); voicesCache = window.speechSynthesis.getVoices(); resolve(voicesCache); };
  });
}

/** Brauzerdagi eng sifatli turkcha ovoz: Natural/Online (Edge) > Google > Yelda (Apple) > boshqa */
export async function turkishVoice(preferredName?: string) {
  const voices = voicesCache.length ? voicesCache : await loadVoices();
  if (preferredName) { const p = voices.find((v) => v.name === preferredName); if (p) return p; }
  const tr = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('tr'));
  const score = (v: SpeechSynthesisVoice) => (/natural|online|neural/i.test(v.name) ? 5 : 0) + (/google/i.test(v.name) ? 4 : 0) + (/yelda|emel|ahmet|tolga|filiz/i.test(v.name) ? 3 : 0) + (v.localService ? 0 : 1);
  return tr.sort((a, b) => score(b) - score(a))[0] ?? null;
}

export async function listTurkishVoices() {
  const voices = voicesCache.length ? voicesCache : await loadVoices();
  return voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('tr'));
}

function browserSpeak(text: string, rate: number, voiceName?: string): Promise<boolean> {
  return new Promise(async (resolve) => {
    if (!('speechSynthesis' in window)) return resolve(false);
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR'; u.rate = rate;
    const v = await turkishVoice(voiceName);
    if (v) u.voice = v;
    u.onend = () => resolve(true); u.onerror = () => resolve(false);
    synth.speak(u);
  });
}

export function ttsUrl(text: string, voice: Exclude<VoicePref, 'browser'> = 'emel', slow = false) {
  return `/api/tts?text=${encodeURIComponent(text)}&voice=${voice}&rate=${slow ? 'slow' : 'normal'}`;
}

function playUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (audioEl) { audioEl.pause(); audioEl.src = ''; }
      const a = new Audio(url);
      audioEl = a;
      let settled = false;
      const ok = (v: boolean) => { if (!settled) { settled = true; resolve(v); } };
      a.onended = () => ok(true);
      a.onerror = () => ok(false);
      a.onstalled = () => setTimeout(() => { if (a.readyState < 2) ok(false); }, 4000);
      a.play().catch(() => ok(false));
      setTimeout(() => { if (a.readyState < 2) ok(false); }, 8000);
    } catch { resolve(false); }
  });
}

/** Asosiy funksiya: text ni turkcha o'qish. opts.rate 0.6 = sekin. */
export async function speak(text: string, opts: { rate?: number; voiceName?: string } = {}): Promise<boolean> {
  if (typeof window === 'undefined' || !text.trim()) return false;
  const pref = getVoicePref();
  const slow = (opts.rate ?? 0.9) < 0.75;
  if (pref !== 'browser' && Date.now() > serverDownUntil) {
    const ok = await playUrl(ttsUrl(text, pref, slow));
    if (ok) return true;
    serverDownUntil = Date.now() + 120_000; // server TTS ishlamadi — vaqtincha brauzer
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  return browserSpeak(text, opts.rate ?? 0.9, opts.voiceName);
}

/** Oldindan yuklash (keyingi so'z tez eshitilsin) */
export function prefetchSpeech(text: string) {
  const pref = getVoicePref();
  if (pref === 'browser' || typeof window === 'undefined') return;
  try { const a = new Audio(); a.preload = 'auto'; a.src = ttsUrl(text, pref); } catch { /* noop */ }
}

export function stopSpeech() {
  if (audioEl) { audioEl.pause(); }
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

interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
}
