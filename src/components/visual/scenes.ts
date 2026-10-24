/**
 * Manzaralar — Turkiya va Ipak yo'li: har kirishda boshqa fon.
 * SVG silhouette qatlamlari (viewBox 0 0 1440 400), parallax koeffitsiyentlari bilan.
 */
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface Layer { d: string; color: string; factor: number; opacity?: number }
export interface Scene {
  id: string;
  name: string;
  nameTr: string;
  sky: Record<TimeOfDay, [string, string, string]>;  // 3 gradient stop
  layers: Layer[];
  features: { stars?: boolean; moon?: boolean; sun?: boolean; balloons?: boolean; clouds?: boolean; waves?: boolean; birds?: boolean; fog?: boolean; shooting?: boolean; lights?: boolean };
  accent: string;
}

const hills = (seed: number, base: number, amp: number, n = 7) => {
  let d = `M0 400 L0 ${base}`;
  for (let i = 0; i <= n; i++) {
    const x = (1440 / n) * i;
    const y = base - Math.abs(Math.sin(seed + i * 1.7)) * amp - Math.abs(Math.cos(seed * 2 + i)) * (amp / 2);
    const cx = x - 1440 / n / 2;
    d += ` Q${cx} ${y - amp / 3} ${x} ${y}`;
  }
  return d + ' L1440 400 Z';
};

const peaks = (seed: number, base: number, amp: number, n = 9) => {
  let d = `M0 400 L0 ${base}`;
  for (let i = 1; i <= n; i++) {
    const x = (1440 / n) * i - 1440 / n / 2;
    const y = base - amp * (0.55 + 0.45 * Math.abs(Math.sin(seed + i * 2.3)));
    d += ` L${x} ${y} L${(1440 / n) * i} ${base - amp * 0.2 * Math.abs(Math.cos(seed + i))}`;
  }
  return d + ' L1440 400 Z';
};

export const SCENES: Scene[] = [
  {
    id: 'bosphorus', name: 'Bosfor ko‘prigi', nameTr: 'Boğaz Köprüsü', accent: '#ff8f4d',
    sky: { dawn: ['#1b1a3a', '#7a3b5e', '#ffb27a'], day: ['#1e3a8a', '#3b82f6', '#bfdbfe'], dusk: ['#1a1033', '#7c2d4f', '#ff8f4d'], night: ['#05070f', '#0b1327', '#1c2a4a'] },
    layers: [
      { factor: 0.12, color: '#0f172a', opacity: 0.92, d: 'M0 400 L0 302 L40 302 L40 290 L52 290 L52 302 L120 302 L122 262 L125 252 L128 262 L130 302 L200 302 L200 292 Q232 262 264 292 L264 302 L330 302 L332 246 L335 236 L338 246 L340 302 L400 302 L402 288 L420 288 L422 302 L480 302 L480 290 Q520 250 560 290 L560 302 L600 302 L600 296 L640 296 L640 302 L700 302 L702 258 L705 248 L708 258 L710 302 L760 302 L760 294 Q796 268 832 294 L832 302 L900 302 L902 240 L905 230 L908 240 L910 302 L980 302 L980 290 L1010 290 L1010 302 L1080 302 L1080 292 Q1112 264 1144 292 L1144 302 L1200 302 L1200 296 L1250 296 L1250 302 L1300 302 L1302 256 L1305 246 L1308 256 L1310 302 L1440 302 L1440 400 Z' },
      { factor: 0.25, color: '#0a1020', d: 'M0 400 L0 330 L1440 330 L1440 400 Z' },
      // ko'prik
      { factor: 0.35, color: '#f8d4b8', opacity: 0.85, d: 'M180 330 L180 150 L192 150 L192 330 Z M1248 330 L1248 150 L1260 150 L1260 330 Z M0 230 Q186 120 420 160 Q720 300 1020 160 Q1254 120 1440 230 L1440 236 Q1254 128 1020 168 Q720 308 420 168 Q186 128 0 236 Z M0 312 L1440 312 L1440 318 L0 318 Z' },
    ],
    features: { stars: true, moon: true, waves: true, lights: true, birds: true },
  },
  {
    id: 'cappadocia', name: 'Kapadokiya sharlari', nameTr: 'Kapadokya', accent: '#f5b400',
    sky: { dawn: ['#2d1b4e', '#c2567a', '#ffd3a0'], day: ['#2563eb', '#60a5fa', '#e0f2fe'], dusk: ['#3b1d5e', '#b5496b', '#ffb27a'], night: ['#070a1a', '#121a3a', '#2a2f5e'] },
    layers: [
      { factor: 0.1, color: '#5b3a3a', opacity: 0.8, d: hills(1.2, 320, 60) },
      { factor: 0.22, color: '#7a4a3f', opacity: 0.9, d: 'M0 400 L0 340 L80 340 L95 300 L100 260 L108 240 L116 260 L120 300 L135 340 L220 340 L240 290 L250 250 L258 235 L266 250 L276 290 L296 340 L380 340 L395 310 L402 270 L410 258 L418 270 L425 310 L440 340 L560 340 L575 300 L582 250 L590 232 L598 250 L605 300 L620 340 L720 340 L740 300 L748 270 L756 258 L764 270 L772 300 L792 340 L900 340 L915 305 L922 265 L930 250 L938 265 L945 305 L960 340 L1060 340 L1080 290 L1090 245 L1098 230 L1106 245 L1116 290 L1136 340 L1240 340 L1255 305 L1262 270 L1270 255 L1278 270 L1285 305 L1300 340 L1440 340 L1440 400 Z' },
      { factor: 0.4, color: '#4a2c28', d: hills(3.1, 385, 30, 5) },
    ],
    features: { balloons: true, sun: true, clouds: true, stars: true },
  },
  {
    id: 'pamukkale', name: 'Pamukkale terrasalari', nameTr: 'Pamukkale', accent: '#6ee7d8',
    sky: { dawn: ['#3b2a5e', '#c97b9a', '#ffe0c2'], day: ['#0ea5e9', '#7dd3fc', '#f0f9ff'], dusk: ['#2a1a4e', '#a8557a', '#ffc08a'], night: ['#06091a', '#0f1a3a', '#1e3a5f'] },
    layers: [
      { factor: 0.1, color: '#cfeafd', opacity: 0.55, d: hills(0.4, 250, 50, 6) },
      { factor: 0.2, color: '#e9f6ff', opacity: 0.85, d: 'M0 400 L0 290 Q120 270 240 290 Q360 310 480 290 Q600 270 720 290 Q840 310 960 290 Q1080 270 1200 290 Q1320 310 1440 290 L1440 400 Z' },
      { factor: 0.3, color: '#5eead4', opacity: 0.5, d: 'M0 400 L0 318 Q180 300 360 318 Q540 336 720 318 Q900 300 1080 318 Q1260 336 1440 318 L1440 400 Z' },
      { factor: 0.42, color: '#f8fcff', opacity: 0.9, d: 'M0 400 L0 350 Q150 330 300 350 Q450 370 600 350 Q750 330 900 350 Q1050 370 1200 350 Q1320 336 1440 350 L1440 400 Z' },
    ],
    features: { sun: true, clouds: true, stars: true },
  },
  {
    id: 'antalya', name: 'O‘rta yer dengizi', nameTr: 'Antalya', accent: '#2fd1bc',
    sky: { dawn: ['#1e1b4b', '#7e3b66', '#fdba74'], day: ['#0369a1', '#38bdf8', '#dbeafe'], dusk: ['#1e1b4b', '#9f3b5e', '#fb923c'], night: ['#030712', '#0c1a33', '#164e63'] },
    layers: [
      { factor: 0.1, color: '#1e3a5f', opacity: 0.6, d: hills(2.2, 300, 70, 5) },
      { factor: 0.2, color: '#0e7490', opacity: 0.85, d: 'M0 400 L0 320 L1440 320 L1440 400 Z' },
      // palmalar
      { factor: 0.45, color: '#06141f', d: 'M0 400 L0 380 L1440 380 L1440 400 Z M120 380 L124 300 L128 380 Z M126 300 Q90 280 70 300 Q100 290 126 304 Q150 280 185 296 Q150 292 126 304 Q110 270 126 250 Q130 275 126 304 Q150 265 170 272 Q145 280 126 304 Z M1290 380 L1294 290 L1298 380 Z M1296 290 Q1260 270 1240 290 Q1270 280 1296 294 Q1320 270 1355 286 Q1320 282 1296 294 Q1280 260 1296 240 Q1300 265 1296 294 Q1320 255 1340 262 Q1315 270 1296 294 Z' },
    ],
    features: { sun: true, waves: true, birds: true, stars: true, moon: true },
  },
  {
    id: 'toros', name: 'Toros tog‘lari', nameTr: 'Toros Dağları', accent: '#c9d1dc',
    sky: { dawn: ['#1f1d3a', '#5a4b7a', '#f6c28b'], day: ['#1d4ed8', '#60a5fa', '#e0e7ff'], dusk: ['#1a1433', '#5b3a6e', '#f59e6b'], night: ['#04060f', '#0a1024', '#1a2342'] },
    layers: [
      { factor: 0.08, color: '#334155', opacity: 0.7, d: peaks(0.7, 330, 190, 7) },
      { factor: 0.18, color: '#1e293b', opacity: 0.9, d: peaks(2.9, 350, 140, 9) },
      { factor: 0.32, color: '#0f172a', d: peaks(5.1, 380, 90, 11) },
    ],
    features: { clouds: true, stars: true, moon: true, fog: true, birds: true },
  },
  {
    id: 'anatolia', name: 'Anado‘li tunlari', nameTr: 'Anadolu', accent: '#a78bfa',
    sky: { dawn: ['#1e1b3a', '#6b3f7a', '#f9c784'], day: ['#3b4fd8', '#818cf8', '#e0e7ff'], dusk: ['#1b1238', '#6d2e5c', '#f97316'], night: ['#020308', '#070b1e', '#14183a'] },
    layers: [
      { factor: 0.1, color: '#1b1f3b', opacity: 0.8, d: hills(4.4, 330, 40, 6) },
      { factor: 0.25, color: '#101428', d: hills(6.6, 365, 35, 8) },
      // qishloq: uylar va masjid
      { factor: 0.4, color: '#070912', d: 'M0 400 L0 385 L600 385 L600 365 L640 365 L640 385 L650 385 L652 330 L656 318 L660 330 L662 385 L700 385 L700 370 Q720 350 740 370 L740 385 L780 385 L780 368 L810 368 L810 385 L1440 385 L1440 400 Z' },
    ],
    features: { stars: true, shooting: true, moon: true, lights: true },
  },
  {
    id: 'silkroad', name: 'Ipak yo‘li karvoni', nameTr: 'İpek Yolu', accent: '#ffcf4d',
    sky: { dawn: ['#2a1a3a', '#9a4a5e', '#ffd9a0'], day: ['#c2410c', '#fb923c', '#fde68a'], dusk: ['#2b1030', '#a33a4a', '#ffb060'], night: ['#060410', '#140c22', '#2a1a3a'] },
    layers: [
      { factor: 0.1, color: '#9a5b2e', opacity: 0.55, d: hills(1.9, 320, 70, 4) },
      { factor: 0.22, color: '#7c4a22', opacity: 0.85, d: hills(3.3, 350, 50, 5) },
      // karvon
      { factor: 0.4, color: '#2b1608', d: 'M0 400 L0 372 L1440 372 L1440 400 Z M300 372 L302 352 L306 348 L312 352 L312 340 Q320 330 330 340 Q340 328 350 340 L352 352 L358 348 L362 352 L364 372 L358 372 L356 358 L350 358 L348 372 L342 372 L340 358 L326 358 L324 372 L318 372 L316 358 L310 358 L308 372 Z M400 372 L402 354 L406 350 L412 354 L412 342 Q420 332 430 342 Q440 330 450 342 L452 354 L458 350 L462 354 L464 372 L458 372 L456 360 L450 360 L448 372 L442 372 L440 360 L426 360 L424 372 L418 372 L416 360 L410 360 L408 372 Z M490 372 L492 356 L495 345 L498 356 L499 372 Z' },
    ],
    features: { sun: true, moon: true, stars: true },
  },
  {
    id: 'blacksea', name: 'Qora dengiz choyzorlari', nameTr: 'Karadeniz', accent: '#4ade80',
    sky: { dawn: ['#1f2a3a', '#6b7a8a', '#ffe4c4'], day: ['#0f766e', '#5eead4', '#ecfeff'], dusk: ['#1a2238', '#5a6a7a', '#f6c28b'], night: ['#03070a', '#0a1a14', '#153a2a'] },
    layers: [
      { factor: 0.1, color: '#14532d', opacity: 0.6, d: hills(2.7, 300, 80, 5) },
      { factor: 0.2, color: '#166534', opacity: 0.85, d: hills(4.9, 340, 60, 7) },
      { factor: 0.35, color: '#052e16', d: hills(7.3, 375, 40, 9) },
    ],
    features: { fog: true, clouds: true, birds: true, stars: true },
  },
];

export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

/** Har kirishda boshqa manzara: sessionStorage da saqlanadi (yangi tab/sessiya = yangi manzara). */
export function pickScene(forceId?: string): Scene {
  if (forceId && forceId !== 'auto') { const s = SCENES.find((x) => x.id === forceId); if (s) return s; }
  if (typeof window === 'undefined') return SCENES[0];
  try {
    const key = 'kopru.scene.v1';
    const saved = sessionStorage.getItem(key);
    if (saved) { const s = SCENES.find((x) => x.id === saved); if (s) return s; }
    const last = localStorage.getItem('kopru.scene.last');
    const cands = SCENES.filter((s) => s.id !== last);
    const s = cands[Math.floor(Math.random() * cands.length)];
    sessionStorage.setItem(key, s.id); localStorage.setItem('kopru.scene.last', s.id);
    return s;
  } catch { return SCENES[Math.floor(Math.random() * SCENES.length)]; }
}
