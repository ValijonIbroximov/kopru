/**
 * Kontent keshi (so'zlar, darslar, bo'limlar, grammatika — kam o'zgaradigan ma'lumot).
 *  1) Xotira: 60 s — bir paytdagi takroriy so'rovlar birlashtiriladi (bitta Promise).
 *  2) localStorage: 30 daqiqa "stale-while-revalidate" — sahifa qayta yuklanganda yoki
 *     ilovaga qayta kirilganda kontent DARHOL keshdan chiqadi, yangisi fonda yuklanib keshni yangilaydi.
 *  Profil / SRS / ijtimoiy ma'lumotlar bu keshga KIRMAYDI (ular har safar yangi).
 */
const entries = new Map<string, { until: number; value: Promise<unknown> }>();
const LS_PREFIX = 'tezbil.cc.v1:';
const LS_TTL = 30 * 60_000;        // 30 daqiqa — shundan keyin ham eskisi ko'rsatiladi, lekin fonda yangilanadi
const LS_HARD = 24 * 3600_000;      // 1 kundan eski kesh ishlatilmaydi

function lsGet<T>(key: string): { value: T; at: number } | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const j = JSON.parse(raw) as { value: T; at: number };
    if (!j || typeof j.at !== 'number' || Date.now() - j.at > LS_HARD) return null;
    return j;
  } catch { return null; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify({ value, at: Date.now() })); }
  catch { /* joy yetmasa — e'tiborsiz */ }
}

export function contentCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.until > Date.now()) return hit.value as Promise<T>;

  const fresh = () => {
    const p = load().then((v) => { lsSet(key, v); return v; });
    p.catch(() => { if (entries.get(key)?.value === p) entries.delete(key); });
    return p;
  };

  let value: Promise<T>;
  const stored = typeof window !== 'undefined' ? lsGet<T>(key) : null;
  const usable = Boolean(stored) && !(Array.isArray(stored!.value) && (stored!.value as unknown[]).length === 0);
  if (usable) {
    // darhol keshdan (tarmoqsiz); eskirgan bo'lsa fonda yangilanadi
    value = Promise.resolve(stored!.value);
    if (Date.now() - stored!.at >= LS_TTL) fresh().then((v) => { entries.set(key, { until: Date.now() + 60_000, value: Promise.resolve(v) }); }).catch(() => {});
  } else {
    value = fresh();
  }
  if (entries.size > 100) entries.clear();
  entries.set(key, { until: Date.now() + 60_000, value });
  return value;
}

export function clearContentCache() {
  entries.clear();
  try { Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch { /* noop */ }
}
