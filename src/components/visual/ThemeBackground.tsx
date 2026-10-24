'use client';
import { useEffect, useRef } from 'react';
import { themeById, type Ambient, type ThemeCanvas } from '@/lib/themes';

/**
 * Canvas fon — namunaviy kod uslubida:
 *  1) Oldindan chizilgan statik qatlam: yumshoq gradient + nebula yog'dulari + nozik to'r + yulduzlar + vinyetka
 *  2) Jonli qatlam: suzuvchi nurli tugunlar (neyron tarmoq), ular orasidagi chiziqlar va impulslar,
 *     pastki ufqdagi garmonik to'lqinlar, ko'tarilayotgan turkcha harflar/so'zlar
 *  Sifat avtomatik moslashadi (FPS pasaysa tugunlar kamayadi), yashirin tabda to'xtaydi,
 *  prefers-reduced-motion yoki "Yengil" rejimda faqat statik kadr.
 */
const TAU = Math.PI * 2;
const LETTERS = ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'merhaba', 'teşekkürler', 'evet', 'köprü', 'öğrenmek', 'hoş geldiniz', 'kolay', 'güzel', 'bilmek', '✓'];

const rgba = (c: string, a: number) => `rgba(${c},${a})`;
const tas = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function urug(s: number) {
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function kanvas(cw: number, ch: number) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(cw)); c.height = Math.max(2, Math.round(ch)); return c; }
function nurSprite(rang: string) {
  const c = kanvas(64, 64); const q = c.getContext('2d')!;
  const g = q.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(rang, 0.95)); g.addColorStop(0.22, rgba(rang, 0.55)); g.addColorStop(0.55, rgba(rang, 0.14)); g.addColorStop(1, rgba(rang, 0));
  q.fillStyle = g; q.fillRect(0, 0, 64, 64);
  return c;
}

interface Node { x: number; y: number; vx: number; vy: number; r: number; tur: number; ph: number }
interface Impulse { a: Node; b: Node; u: number; sp: number }
interface Letter { x: number; u: number; sp: number; t: string; dx: number; ph: number; sz: number }

export default function ThemeBackground({ themeId, ambient = 'full' }: { themeId: string; ambient?: Ambient }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || ambient === 'off') return;
    const M: ThemeCanvas = themeById(themeId).canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const kam = ambient === 'lite' || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

    let w = 360, h = 640, dpr = 1, k = 1, telefon = true;
    let fon = kanvas(2, 2);
    let spr: HTMLCanvasElement[] = [];
    let nodes: Node[] = [], impulses: Impulse[] = [], letters: Letter[] = [];
    let vaqt = 0, raf = 0, oxirgi = 0, sifat = 1, ortacha = 1 / 60, sifatV = 0;
    let yashirin = document.hidden;
    const URUG = (Math.random() * 1e9) | 0;

    function olcham() {
      w = Math.max(1, window.innerWidth); h = Math.max(1, window.innerHeight);
      telefon = w < 640;
      dpr = Math.min(window.devicePixelRatio || 1, telefon ? 1.6 : 1.5);
      k = clamp(Math.min(w, h) / 760, 0.62, 1.32);
      canvas!.width = Math.round(w * dpr); canvas!.height = Math.round(h * dpr);
    }

    function fonQur() {
      const fw = Math.max(2, Math.round(w * 0.6)), fh = Math.max(2, Math.round(h * 0.6));
      fon = kanvas(fw, fh);
      const q = fon.getContext('2d')!; const rng = urug(URUG);
      let g = q.createLinearGradient(0, 0, fw * 0.35, fh);
      g.addColorStop(0, M.fon[0]); g.addColorStop(0.52, M.fon[1]); g.addColorStop(1, M.fon[2]);
      q.fillStyle = g; q.fillRect(0, 0, fw, fh);
      // nebula yog'dulari
      const markaz: [number, number, number][] = [[0.14, 0.22, 0.46], [0.86, 0.22, 0.46], [0.14, 0.72, 0.44], [0.86, 0.72, 0.48], [0.5, 0.48, 0.56]];
      markaz.forEach((m, i) => {
        const cx = fw * m[0], cy = fh * m[1], rr = Math.max(fw, fh) * m[2];
        const c = M.nebula[i % M.nebula.length];
        g = q.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, rgba(c, M.nebulaK)); g.addColorStop(1, rgba(c, 0));
        q.fillStyle = g; q.fillRect(0, 0, fw, fh);
      });
      // nozik to'r
      if (M.grid) {
        q.strokeStyle = rgba(M.line, 0.05); q.lineWidth = 1;
        const qadam = Math.max(28, Math.round(Math.min(fw, fh) / 11));
        q.beginPath();
        for (let gx = qadam * 0.5; gx < fw; gx += qadam) { q.moveTo(gx, 0); q.lineTo(gx, fh); }
        for (let gy = qadam * 0.5; gy < fh; gy += qadam) { q.moveTo(0, gy); q.lineTo(fw, gy); }
        q.stroke();
      }
      // yulduzlar
      if (M.stars) {
        const n = telefon ? 60 : 110;
        for (let i = 0; i < n; i++) {
          const sx = rng() * fw, sy = rng() * fh, sr = 0.4 + 1.1 * Math.pow(rng(), 2.2);
          q.fillStyle = rgba(i % 2 ? M.nodes[0] : M.letter, 0.15 + 0.35 * rng());
          q.beginPath(); q.arc(sx, sy, sr, 0, TAU); q.fill();
        }
      }
      // vinyetka
      g = q.createRadialGradient(fw * 0.5, fh * 0.5, Math.min(fw, fh) * 0.3, fw * 0.5, fh * 0.5, Math.max(fw, fh) * 0.8);
      g.addColorStop(0, rgba(M.vignette, 0)); g.addColorStop(1, rgba(M.vignette, M.vignetteK));
      q.fillStyle = g; q.fillRect(0, 0, fw, fh);
      spr = M.nodes.map(nurSprite);
    }

    function obyektlar() {
      const n = telefon ? 22 : 40;
      nodes = Array.from({ length: n }, (_, i) => ({ x: Math.random() * w, y: Math.random() * h, vx: tas(-12, 12), vy: tas(-10, 10), r: tas(1.4, 2.8) * k, tur: i % M.nodes.length, ph: tas(0, TAU) }));
      impulses = [];
      const ln = telefon ? 7 : 12;
      letters = Array.from({ length: ln }, (_, i) => ({ x: Math.random(), u: i / ln, sp: tas(0.03, 0.06), t: LETTERS[i % LETTERS.length], dx: tas(-0.4, 0.4), ph: tas(0, TAU), sz: tas(11, 17) }));
    }

    function chiz(dt: number) {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.globalAlpha = 1;
      ctx!.drawImage(fon, 0, 0, canvas!.width, canvas!.height);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = Math.round(nodes.length * sifat);
      const maxD = (telefon ? 110 : 150) * k, maxD2 = maxD * maxD;
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;
      }
      ctx!.save();
      ctx!.lineWidth = 0.85 * k;
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j]; const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            const yaqin = 1 - Math.sqrt(d2) / maxD;
            ctx!.strokeStyle = rgba(M.line, yaqin * M.lineAlpha);
            ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
            if (!kam && impulses.length < 10 && Math.random() < dt * 0.08) impulses.push({ a, b, u: 0, sp: tas(1.2, 2.4) });
          }
        }
      }
      for (let i = impulses.length - 1; i >= 0; i--) {
        const imp = impulses[i]; imp.u += dt * imp.sp;
        if (imp.u >= 1) { impulses.splice(i, 1); continue; }
        const ix = mix(imp.a.x, imp.b.x, imp.u), iy = mix(imp.a.y, imp.b.y, imp.u), ir = 3 * k;
        ctx!.globalAlpha = Math.sin(imp.u * Math.PI) * 0.85;
        ctx!.drawImage(spr[0], ix - ir * 2, iy - ir * 2, ir * 4, ir * 4);
      }
      for (let i = 0; i < n; i++) {
        const a = nodes[i]; const puls = 0.8 + 0.25 * Math.sin(vaqt * 2.2 + a.ph); const r = a.r * puls;
        ctx!.globalAlpha = 0.6;
        ctx!.drawImage(spr[a.tur], a.x - r * 2.1, a.y - r * 2.1, r * 4.2, r * 4.2);
      }
      // ko'tarilayotgan harflar
      ctx!.textAlign = 'center';
      for (const L of letters) {
        const u = (L.u + vaqt * L.sp) % 1;
        const x = L.x * w + Math.sin(vaqt * 0.6 + L.ph) * 24 * k + L.dx * 40;
        const y = h * (1.05 - u * 1.1);
        const a = Math.sin(u * Math.PI) * 0.5;
        ctx!.globalAlpha = a;
        ctx!.font = `600 ${Math.round(L.sz * k)}px Georgia, serif`;
        ctx!.fillStyle = rgba(M.letter, 1);
        ctx!.fillText(L.t, x, y);
      }
      // pastki garmonik to'lqinlar
      ctx!.globalAlpha = 1;
      const baseY = h * 0.965, amp = Math.min(w, h) * 0.022, N = telefon ? 70 : 120;
      const qat = [{ rang: M.wave[0], f: 1.6, v: 1.1, a: 0.3, lw: 1.6 }, { rang: M.wave[1], f: 2.3, v: -0.85, a: 0.22, lw: 1.2 }];
      for (const L of qat) {
        ctx!.beginPath();
        for (let i = 0; i <= N; i++) { const u = i / N; const px = u * w, py = baseY + Math.sin(u * TAU * L.f + vaqt * L.v) * amp; if (i === 0) ctx!.moveTo(px, py); else ctx!.lineTo(px, py); }
        ctx!.strokeStyle = rgba(L.rang, L.a); ctx!.lineWidth = L.lw * k; ctx!.stroke();
      }
      ctx!.restore();
    }

    function kadr(ts: number) {
      raf = 0;
      const dt = oxirgi ? Math.min(0.05, Math.max(0.001, (ts - oxirgi) / 1000)) : 1 / 60;
      oxirgi = ts; vaqt += dt;
      chiz(dt);
      ortacha = ortacha * 0.95 + dt * 0.05; sifatV += dt;
      if (sifatV > 2.5) { sifatV = 0; if (ortacha > 1 / 36 && sifat > 0.55) sifat -= 0.1; else if (ortacha < 1 / 52 && sifat < 1) sifat = Math.min(1, sifat + 0.05); }
      if (!kam && !yashirin) raf = requestAnimationFrame(kadr);
    }
    const boshla = () => { if (raf || kam || yashirin) return; oxirgi = 0; raf = requestAnimationFrame(kadr); };
    const toxta = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

    olcham(); fonQur(); obyektlar(); chiz(0); boshla();

    let tm = 0;
    const onResize = () => { clearTimeout(tm); tm = window.setTimeout(() => { olcham(); fonQur(); obyektlar(); chiz(0); }, 150); };
    const onVis = () => { yashirin = document.hidden; if (yashirin) toxta(); else boshla(); };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    return () => { toxta(); clearTimeout(tm); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); };
  }, [themeId, ambient]);

  if (ambient === 'off') return <div className="pointer-events-none fixed inset-0 -z-10 bg-ink-950" aria-hidden />;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 h-full w-full" aria-hidden />;
}
