export function validTutor(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const d = v as Record<string, unknown>;
  const text = (x: unknown) => typeof x === 'string' && x.length <= 6000;
  if (!text(d.reply_tr) || !text(d.reply_uz)) return false;
  for (const [key, fields] of [['corrections', ['wrong','right','why']], ['new_words', ['tr','uz']]] as const) {
    if (d[key] !== undefined && (!Array.isArray(d[key]) || (d[key] as unknown[]).length > 20 || !(d[key] as unknown[]).every(x => x && typeof x === 'object' && fields.every(f => text((x as Record<string, unknown>)[f]))))) return false;
  }
  return d.praise === undefined || text(d.praise);
}
