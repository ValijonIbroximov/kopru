const entries = new Map<string, { until: number; value: Promise<unknown> }>();
export function contentCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.until > Date.now()) return hit.value as Promise<T>;
  const value = load().catch(error => { if (entries.get(key)?.value === value) entries.delete(key); throw error; });
  if (entries.size > 100) entries.clear();
  entries.set(key, { until: Date.now() + 60_000, value });
  return value;
}
export function clearContentCache() { entries.clear(); }
