/** Provider diagnostics stay on the server; clients receive actionable messages. */
export function classifyError(status: number, body: string, headers: Headers, now = Date.now()) {
  const value = headers.get('retry-after');
  const seconds = value === null ? NaN : Number(value);
  const date = value === null ? NaN : Date.parse(value);
  let delay = Number.isFinite(seconds) ? seconds * 1000 : Number.isFinite(date) ? date - now : 0;
  const hint = body.toLowerCase().match(/try again in ([\d.]+)\s*(ms|s|m|h)/);
  if (delay <= 0 && hint) delay = Number(hint[1]) * ({ms:1,s:1000,m:60000,h:3600000}[hint[2]] ?? 1000);
  const daily = /per day|daily|\btpd\b|\brpd\b/.test(body.toLowerCase());
  if (daily && delay <= 0) { const end = new Date(now); end.setUTCHours(24,0,0,0); delay = end.getTime() - now; }
  const quota = status === 429 || status === 402;
  return {
    reason: quota ? 'quota' as const : 'error' as const,
    explicitDelay: delay > 0,
    cooldownMs: Math.min(86400000, Math.max(1000, delay || (quota ? 60000 : status === 401 || status === 403 ? 21600000 : 120000))),
    message: quota ? 'Bepul AI xizmatining limiti vaqtincha tugadi. Kutish muddati tugagach qayta urinib ko‘ring.' : 'AI xizmati javob bera olmadi. Keyinroq qayta urinib ko‘ring.',
    diagnostic: `HTTP ${status}: ${body.slice(0, 300)}`,
  };
}
