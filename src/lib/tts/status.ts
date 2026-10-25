/**
 * TTS manbalari holati (instansiya xotirasida): oxirgi natija, o'rtacha vaqt, xato matni.
 * /api/tts/status shu yerdan o'qiydi; Profil → Ovoz bo'limi "hozirgi manba"ni ko'rsatadi.
 */
export type TtsSource = 'azure' | 'edge' | 'google';
export interface SourceStat { ok: number; fail: number; lastOk: string | null; lastFail: string | null; lastError: string | null; avgMs: number | null }
const stats: Record<TtsSource, SourceStat> = {
  azure: { ok: 0, fail: 0, lastOk: null, lastFail: null, lastError: null, avgMs: null },
  edge: { ok: 0, fail: 0, lastOk: null, lastFail: null, lastError: null, avgMs: null },
  google: { ok: 0, fail: 0, lastOk: null, lastFail: null, lastError: null, avgMs: null },
};
export function noteTtsResult(src: TtsSource, ok: boolean, ms: number, error?: string) {
  const s = stats[src];
  const now = new Date().toISOString();
  if (ok) { s.ok += 1; s.lastOk = now; s.avgMs = s.avgMs === null ? ms : Math.round(s.avgMs * 0.7 + ms * 0.3); }
  else { s.fail += 1; s.lastFail = now; s.lastError = (error ?? 'xato').slice(0, 160); }
}
export function ttsStats() { return stats; }
