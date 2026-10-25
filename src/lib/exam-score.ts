export function practiceAverage(values: (number | null)[]) {
  const scored = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return scored.length ? Math.round(scored.reduce((a,b) => a+b,0) / scored.length) : 0;
}
export function validWriting(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.score === 'number' && Number.isFinite(v.score) && v.score >= 0 && v.score <= 10 &&
    ['band','corrected','summary_uz'].every(k => typeof v[k] === 'string') && Array.isArray(v.comments) &&
    v.comments.every(c => c && ['wrong','right','why'].every(k => typeof c[k] === 'string'));
}
