export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = arr.slice();
  let rnd = Math.random;
  if (seed !== undefined) {
    let s = seed >>> 0 || 1;
    rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: T[], n: number, exclude?: (x: T) => boolean): T[] {
  const pool = exclude ? arr.filter((x) => !exclude(x)) : arr;
  return shuffle(pool).slice(0, n);
}

export function uid(prefix = 'e') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function todayKey(tz = 'Asia/Tashkent', d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(d); // YYYY-MM-DD
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} daq`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} s ${m} daq` : `${h} soat`;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n);
}

export function relativeDay(dateStr: string | null, tz = 'Asia/Tashkent', lang: 'uz' | 'tr' = 'uz') {
  const tr = lang === 'tr';
  if (!dateStr) return tr ? 'hiç' : 'hech qachon';
  const today = todayKey(tz);
  if (dateStr === today) return tr ? 'bugün' : 'bugun';
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 1) return tr ? 'dün' : 'kecha';
  if (diff < 7) return tr ? `${diff} gün önce` : `${diff} kun oldin`;
  if (diff < 30) return tr ? `${Math.floor(diff / 7)} hafta önce` : `${Math.floor(diff / 7)} hafta oldin`;
  return tr ? `${Math.floor(diff / 30)} ay önce` : `${Math.floor(diff / 30)} oy oldin`;
}

/** Oddiy, barqaror xesh (kesh kaliti uchun) */
export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function leagueLabel(l: string) {
  return ({ bronze: 'Bronza', silver: 'Kumush', gold: 'Oltin', diamond: 'Olmos' } as Record<string, string>)[l] ?? l;
}
export function leagueIcon(l: string) {
  return ({ bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎' } as Record<string, string>)[l] ?? '🏅';
}

export function xpForLevel(level: number) {
  // level = floor(sqrt(xp/75)) + 1  →  xp = 75 * (level-1)^2
  return 75 * (level - 1) * (level - 1);
}

export function levelProgress(xp: number, level: number) {
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { cur, next, pct: clamp(((xp - cur) / Math.max(1, next - cur)) * 100, 0, 100) };
}

export function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
