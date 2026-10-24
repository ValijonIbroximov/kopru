/**
 * Mavzular (dizaynlar). Har bir mavzu:
 *  - vars: CSS o'zgaruvchilar (R G B) — Tailwind `ink-*`, `white` (fg) shular orqali ishlaydi,
 *    shuning uchun butun interfeys yorug'/qorong'i rejimga avtomatik moslashadi.
 *  - canvas: fon kompozitsiyasi (yumshoq gradient, nebula yog'dulari, neyron tarmoq, to'lqinlar, harflar).
 */
export type ThemeMode = 'dark' | 'light';
export type Ambient = 'full' | 'lite' | 'off';

export interface ThemeCanvas {
  fon: [string, string, string];        // gradient
  nebula: string[];                     // 'R,G,B' — 4-5 ta
  nebulaK: number;                      // yog'du kuchi
  nodes: string[];                      // zarracha ranglari 'R,G,B'
  line: string;                         // bog'lovchi chiziq 'R,G,B'
  letter: string;                       // suzuvchi harflar 'R,G,B'
  wave: [string, string];
  grid: boolean;
  stars: boolean;
  vignette: string;
  vignetteK: number;
  lineAlpha: number;
}

export interface Theme {
  id: string;
  name: { uz: string; tr: string };
  desc: { uz: string; tr: string };
  mode: ThemeMode;
  swatch: [string, string, string];      // preview
  vars: Record<string, string>;          // --ink-950 … --fg, --accent, --accent-2
  canvas: ThemeCanvas;
}

const darkInk = (bg: string, panel: string) => ({
  '--ink-950': bg, '--ink-900': panel, '--ink-800': '20 26 36', '--ink-700': '28 36 49', '--ink-600': '42 52 68', '--ink-500': '61 74 94',
  '--ink-400': '107 122 144', '--ink-300': '154 166 184', '--ink-200': '201 209 220', '--ink-100': '232 236 241', '--fg': '255 255 255', '--overlay': '0 0 0',
});

export const THEMES: Theme[] = [
  {
    id: 'tun', mode: 'dark', swatch: ['#07090f', '#1c2a4a', '#ff8f4d'],
    name: { uz: 'Tun', tr: 'Gece' }, desc: { uz: 'Chuqur ko‘k, iliq urg‘u — klassik qorong‘i', tr: 'Derin lacivert, sıcak vurgu — klasik koyu' },
    vars: { ...darkInk('7 9 15', '13 17 23'), '--accent': '255 143 77', '--accent-2': '47 209 188' },
    canvas: { fon: ['#050b16', '#0c1930', '#142644'], nebula: ['245,180,60', '56,189,248', '52,211,153', '167,139,250', '255,106,42'], nebulaK: 0.14, nodes: ['251,191,36', '56,189,248', '52,211,153', '192,132,252'], line: '148,184,228', letter: '238,245,255', wave: ['251,191,36', '56,189,248'], grid: true, stars: true, vignette: '3,6,14', vignetteK: 0.55, lineAlpha: 0.2 },
  },
  {
    id: 'grafit', mode: 'dark', swatch: ['#0b0d10', '#262b33', '#2fd1bc'],
    name: { uz: 'Grafit', tr: 'Grafit' }, desc: { uz: 'Neytral kulrang, zumrad urg‘u — tinch va jiddiy', tr: 'Nötr gri, zümrüt vurgu — sakin ve ciddi' },
    vars: { ...darkInk('11 13 16', '18 21 26'), '--ink-800': '26 30 36', '--ink-700': '36 41 48', '--accent': '47 209 188', '--accent-2': '255 207 77' },
    canvas: { fon: ['#0a0c10', '#13171d', '#1a2029'], nebula: ['47,209,188', '120,130,150', '255,207,77', '100,116,139'], nebulaK: 0.1, nodes: ['47,209,188', '203,213,225', '255,207,77', '148,163,184'], line: '148,163,184', letter: '226,232,240', wave: ['47,209,188', '148,163,184'], grid: false, stars: true, vignette: '0,0,0', vignetteK: 0.5, lineAlpha: 0.16 },
  },
  {
    id: 'binafsha', mode: 'dark', swatch: ['#0e0a1f', '#2d1f5e', '#c084fc'],
    name: { uz: 'Binafsha tun', tr: 'Mor gece' }, desc: { uz: 'To‘q binafsha, neon pushti — o‘yin kayfiyati', tr: 'Koyu mor, neon pembe — oyun havası' },
    vars: { ...darkInk('14 10 31', '22 16 46'), '--ink-800': '32 24 64', '--ink-700': '44 34 84', '--ink-600': '64 52 112', '--accent': '244 114 182', '--accent-2': '192 132 252' },
    canvas: { fon: ['#0d0820', '#1a1040', '#2a1a5e'], nebula: ['192,132,252', '244,114,182', '56,189,248', '129,140,248'], nebulaK: 0.16, nodes: ['244,114,182', '192,132,252', '56,189,248', '250,204,21'], line: '167,139,250', letter: '237,233,254', wave: ['244,114,182', '129,140,248'], grid: true, stars: true, vignette: '5,2,18', vignetteK: 0.5, lineAlpha: 0.2 },
  },
  {
    id: 'tong', mode: 'light', swatch: ['#faf6ee', '#f2e6d3', '#c2410c'],
    name: { uz: 'Yumshoq tong', tr: 'Yumuşak sabah' }, desc: { uz: 'Krem fon, terrakota urg‘u — ko‘zga yengil', tr: 'Krem zemin, terakota vurgu — göze hafif' },
    vars: { '--ink-950': '250 246 238', '--ink-900': '255 253 248', '--ink-800': '244 238 226', '--ink-700': '232 224 208', '--ink-600': '212 202 182', '--ink-500': '160 148 130', '--ink-400': '112 101 88', '--ink-300': '84 74 62', '--ink-200': '60 52 44', '--ink-100': '36 30 25', '--fg': '30 24 18', '--overlay': '60 40 20', '--accent': '194 65 12', '--accent-2': '15 118 110' },
    canvas: { fon: ['#fbf7ef', '#f3e9d8', '#eadcc5'], nebula: ['194,65,12', '15,118,110', '217,119,6', '126,34,206'], nebulaK: 0.09, nodes: ['194,65,12', '15,118,110', '180,83,9', '126,34,206'], line: '120,90,60', letter: '90,60,30', wave: ['194,65,12', '15,118,110'], grid: true, stars: false, vignette: '90,60,30', vignetteK: 0.14, lineAlpha: 0.14 },
  },
  {
    id: 'osmon', mode: 'light', swatch: ['#eef3f9', '#d3e0f0', '#1d4ed8'],
    name: { uz: 'Osmon', tr: 'Gökyüzü' }, desc: { uz: 'Oq-ko‘k, toza va rasmiy', tr: 'Beyaz-mavi, temiz ve resmi' },
    vars: { '--ink-950': '238 243 249', '--ink-900': '255 255 255', '--ink-800': '232 238 246', '--ink-700': '216 226 238', '--ink-600': '190 204 222', '--ink-500': '140 156 178', '--ink-400': '96 112 136', '--ink-300': '70 86 110', '--ink-200': '48 62 84', '--ink-100': '26 36 54', '--fg': '15 23 42', '--overlay': '20 36 64', '--accent': '29 78 216', '--accent-2': '14 165 233' },
    canvas: { fon: ['#eef3f9', '#e1eaf5', '#d3e0f0'], nebula: ['30,64,175', '14,165,233', '15,118,110', '126,34,206'], nebulaK: 0.09, nodes: ['29,78,216', '14,165,233', '15,118,110', '126,34,206'], line: '51,85,135', letter: '20,44,92', wave: ['29,78,216', '14,165,233'], grid: true, stars: false, vignette: '20,36,64', vignetteK: 0.16, lineAlpha: 0.14 },
  },
  {
    id: 'qogoz', mode: 'light', swatch: ['#efe4cf', '#dac5a0', '#7c2d12'],
    name: { uz: 'Qog‘oz', tr: 'Kâğıt' }, desc: { uz: 'Eski kitob varag‘i — iliq va osoyishta', tr: 'Eski kitap sayfası — sıcak ve dingin' },
    vars: { '--ink-950': '240 229 207', '--ink-900': '250 243 229', '--ink-800': '236 223 198', '--ink-700': '222 206 176', '--ink-600': '200 182 148', '--ink-500': '150 130 100', '--ink-400': '110 90 62', '--ink-300': '84 66 42', '--ink-200': '60 46 28', '--ink-100': '38 28 16', '--fg': '32 19 8', '--overlay': '58 36 14', '--accent': '124 45 18', '--accent-2': '32 84 74' },
    canvas: { fon: ['#f0e5cf', '#e5d5b7', '#dac5a0'], nebula: ['146,56,14', '32,84,74', '124,45,18', '92,52,118'], nebulaK: 0.1, nodes: ['146,56,14', '32,84,74', '180,83,9', '104,44,96'], line: '96,68,38', letter: '64,38,14', wave: ['146,56,14', '32,84,74'], grid: true, stars: false, vignette: '58,36,14', vignetteK: 0.22, lineAlpha: 0.14 },
  },
  {
    id: 'yashil', mode: 'light', swatch: ['#eef5ef', '#cfe3d2', '#15803d'],
    name: { uz: 'Yashil bog‘', tr: 'Yeşil bahçe' }, desc: { uz: 'Och yashil, tabiiy — ko‘zni dam oldiradi', tr: 'Açık yeşil, doğal — gözü dinlendirir' },
    vars: { '--ink-950': '238 245 239', '--ink-900': '255 255 255', '--ink-800': '230 240 232', '--ink-700': '212 228 215', '--ink-600': '186 208 190', '--ink-500': '130 158 136', '--ink-400': '88 114 94', '--ink-300': '62 86 68', '--ink-200': '42 62 48', '--ink-100': '22 38 28', '--fg': '12 30 20', '--overlay': '20 50 30', '--accent': '21 128 61', '--accent-2': '202 138 4' },
    canvas: { fon: ['#eef5ef', '#dfece2', '#cfe3d2'], nebula: ['21,128,61', '202,138,4', '14,116,144', '101,163,13'], nebulaK: 0.1, nodes: ['21,128,61', '202,138,4', '14,116,144', '101,163,13'], line: '60,100,70', letter: '20,60,36', wave: ['21,128,61', '202,138,4'], grid: false, stars: false, vignette: '20,50,30', vignetteK: 0.14, lineAlpha: 0.14 },
  },
];

export const DEFAULT_THEME = 'tun';
export const themeById = (id?: string | null) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** <html> ga mavzuni qo'llash (CSS o'zgaruvchilar + data atributlar) */
export function applyTheme(id: string) {
  if (typeof document === 'undefined') return;
  const t = themeById(id);
  const root = document.documentElement;
  root.dataset.theme = t.id;
  root.dataset.mode = t.mode;
  root.style.colorScheme = t.mode;
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v);
  try { localStorage.setItem('tezbil.theme', t.id); } catch { /* noop */ }
  try { window.dispatchEvent(new CustomEvent('tezbil:theme', { detail: t.id })); } catch { /* noop */ }
}

/** Fon jonliligini (to'liq / yengil / o'chiq) jonli oldindan ko'rish uchun — AppShell tinglaydi */
export function applyAmbient(a: Ambient) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('tezbil.ambient', a); } catch { /* noop */ }
  try { window.dispatchEvent(new CustomEvent('tezbil:ambient', { detail: a })); } catch { /* noop */ }
}

/** Hozir qo'llanilgan mavzu id (localStorage / <html data-theme>) */
export function currentThemeId(): string {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  return document.documentElement.dataset.theme || (() => { try { return localStorage.getItem('tezbil.theme'); } catch { return null; } })() || DEFAULT_THEME;
}

/** Birinchi bo'yashdan OLDIN ishga tushadigan inline skript (layout.tsx da) — miltillashsiz */
export const THEME_BOOT_SCRIPT = `(function(){try{var T=${JSON.stringify(Object.fromEntries(THEMES.map((t) => [t.id, { m: t.mode, v: t.vars }])))};var id=localStorage.getItem('tezbil.theme')||'${DEFAULT_THEME}';var t=T[id]||T['${DEFAULT_THEME}'];var r=document.documentElement;r.dataset.theme=id;r.dataset.mode=t.m;r.style.colorScheme=t.m;for(var k in t.v){r.style.setProperty(k,t.v[k]);}var l=localStorage.getItem('tezbil.lang');if(l){r.lang=l;}}catch(e){}})();`;
