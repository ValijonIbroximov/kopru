'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SCENES, pickScene, timeOfDay, type Scene, type TimeOfDay } from './scenes';
import { cn } from '@/lib/utils';

export type Ambient = 'full' | 'lite' | 'off';

interface Props { sceneId?: string; ambient?: Ambient; dim?: number; className?: string; parallax?: boolean }

function seeded(n: number, salt = 1) { const x = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453; return x - Math.floor(x); }

/**
 * Fonda animatsion manzara.
 *  - Osmon: kun vaqtiga mos gradient (tong/kun/oqshom/tun)
 *  - Osmon obyektlari (yulduz, oy, quyosh, bulut, shar, qush): to'liq ekran SVG
 *  - Landshaft qatlamlari: pastga yopishgan SVG, portretda markaziy qism ko'rsatiladi, scroll parallax
 */
export default function SceneBackground({ sceneId, ambient = 'full', dim = 0.55, className, parallax = true }: Props) {
  const [scene, setScene] = useState<Scene | null>(null);
  const [tod, setTod] = useState<TimeOfDay>('night');
  const [reduced, setReduced] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScene(pickScene(sceneId));
    setTod(timeOfDay());
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const onR = () => setPortrait(window.innerWidth < window.innerHeight * 0.9);
    onR(); window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, [sceneId]);

  useEffect(() => {
    if (!parallax || ambient === 'off' || reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; ref.current?.style.setProperty('--sy', String(window.scrollY)); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [parallax, ambient, reduced]);

  const stars = useMemo(() => Array.from({ length: 90 }, (_, i) => ({ x: seeded(i, 1) * 1440, y: seeded(i, 2) * 520, r: 0.6 + seeded(i, 3) * 1.5, d: seeded(i, 4) * 4 })), []);
  const balloons = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ x: 120 + seeded(i, 5) * 1200, y: 120 + seeded(i, 6) * 260, s: 0.6 + seeded(i, 7) * 0.9, d: seeded(i, 8) * 6, hue: Math.floor(seeded(i, 9) * 360) })), []);
  const clouds = useMemo(() => Array.from({ length: 4 }, (_, i) => ({ y: 60 + seeded(i, 10) * 260, s: 0.8 + seeded(i, 11) * 1.1, d: i * 11, o: 0.22 + seeded(i, 12) * 0.3 })), []);

  if (!scene || ambient === 'off') return <div className={cn('pointer-events-none fixed inset-0 -z-10 bg-ink-950', className)} />;
  const [c1, c2, c3] = scene.sky[tod];
  const night = tod === 'night' || tod === 'dusk';
  const anim = ambient === 'full' && !reduced;
  const f = scene.features;
  // portretda markaziy 760px ko'rsatiladi (landshaft to'liq sig'adi)
  const vw = portrait ? 760 : 1440;
  const vx = (1440 - vw) / 2;
  const sunX = portrait ? 980 : 1100;

  return (
    <div ref={ref} className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)} style={{ background: `linear-gradient(180deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`, ['--sy' as string]: '0' }} aria-hidden>
      {/* OSMON OBYEKTLARI */}
      <svg viewBox="0 0 1440 800" preserveAspectRatio="xMidYMin slice" className="absolute inset-0 h-full w-full" style={{ transform: 'translateY(calc(var(--sy) * -0.04px))' }}>
        <defs>
          <radialGradient id="sunG" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff7d6" /><stop offset="0.4" stopColor="#ffcf4d" /><stop offset="1" stopColor="#ff6a2a" stopOpacity="0" /></radialGradient>
          <radialGradient id="moonG" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffffff" /><stop offset="0.5" stopColor="#e8ecf1" /><stop offset="1" stopColor="#e8ecf1" stopOpacity="0" /></radialGradient>
        </defs>
        {f.stars && night && stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.75} className={anim ? 'scene-twinkle' : ''} style={{ animationDelay: `${s.d}s` }} />)}
        {f.shooting && night && anim && <line x1="200" y1="60" x2="270" y2="95" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" className="scene-shooting" />}
        {f.sun && !night && <g><circle cx={sunX} cy={tod === 'dawn' ? 300 : 150} r={150} fill="url(#sunG)" opacity={0.85} /><circle cx={sunX} cy={tod === 'dawn' ? 300 : 150} r={44} fill="#fff4c2" /></g>}
        {f.moon && night && <g><circle cx={sunX + 60} cy={130} r={90} fill="url(#moonG)" opacity={0.3} /><circle cx={sunX + 60} cy={130} r={32} fill="#f3f4f6" /><circle cx={sunX + 46} cy={120} r={6} fill="#d1d5db" opacity={0.6} /><circle cx={sunX + 72} cy={142} r={4} fill="#d1d5db" opacity={0.6} /></g>}
        {f.clouds && clouds.map((c, i) => (
          <g key={i} className={anim ? 'scene-drift' : ''} style={{ animationDelay: `-${c.d}s`, animationDuration: `${60 + i * 15}s` }} opacity={night ? c.o * 0.5 : c.o}>
            <g transform={`translate(0 ${c.y}) scale(${c.s})`}><ellipse cx="80" cy="30" rx="80" ry="22" fill="#fff" /><ellipse cx="140" cy="20" rx="60" ry="28" fill="#fff" /><ellipse cx="200" cy="32" rx="70" ry="20" fill="#fff" /></g>
          </g>
        ))}
        {f.balloons && balloons.map((b, i) => (
          <g key={i} className={anim ? 'scene-float' : ''} style={{ animationDelay: `-${b.d}s`, animationDuration: `${7 + i}s`, transform: `translate(${b.x}px, ${b.y}px) scale(${b.s})` }}>
            <path d="M0 -40 C -26 -40 -34 -14 -22 4 L -8 24 L 8 24 L 22 4 C 34 -14 26 -40 0 -40 Z" fill={`hsl(${b.hue} 80% 60%)`} />
            <path d="M-8 -40 C -16 -20 -14 0 -6 24 M8 -40 C 16 -20 14 0 6 24" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" />
            <rect x="-6" y="28" width="12" height="9" rx="2" fill="#5b3a29" /><line x1="-7" y1="24" x2="-5" y2="28" stroke="#5b3a29" /><line x1="7" y1="24" x2="5" y2="28" stroke="#5b3a29" />
          </g>
        ))}
        {f.birds && anim && tod !== 'night' && (
          <g className="scene-birds" opacity={0.6}>{[0, 1, 2].map((i) => <path key={i} d={`M${i * 28} ${i * 6 + 200} q 8 -8 16 0 q 8 -8 16 0`} stroke={night ? '#cbd5e1' : '#0f172a'} strokeWidth="1.5" fill="none" />)}</g>
        )}
      </svg>

      {/* LANDSHAFT */}
      <svg viewBox={`${vx} 0 ${vw} 400`} preserveAspectRatio="xMidYMax meet" className="absolute inset-x-0 bottom-0 w-full" style={{ height: 'auto', maxHeight: '70vh' }}>
        <defs><linearGradient id="fogG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0" /><stop offset="1" stopColor="#ffffff" stopOpacity="0.25" /></linearGradient></defs>
        {scene.layers.map((l, i) => <path key={i} d={l.d} fill={l.color} opacity={l.opacity ?? 1} style={{ transform: `translateY(calc(var(--sy) * ${-l.factor * 0.25}px))` }} />)}
        {f.waves && (
          <g opacity={0.35} className={anim ? 'scene-waves' : ''}>
            <path d="M-200 345 Q-100 335 0 345 T200 345 T400 345 T600 345 T800 345 T1000 345 T1200 345 T1400 345 T1600 345 T1800 345" stroke="#bfe9ff" strokeWidth="2" fill="none" />
            <path d="M-200 362 Q-100 352 0 362 T200 362 T400 362 T600 362 T800 362 T1000 362 T1200 362 T1400 362 T1600 362 T1800 362" stroke="#bfe9ff" strokeWidth="1.5" fill="none" opacity={0.6} />
          </g>
        )}
        {f.lights && night && [240, 420, 520, 700, 840, 1010, 1130].map((x, i) => <circle key={i} cx={x} cy={296} r={1.6} fill="#ffd27a" className={anim ? 'scene-twinkle' : ''} style={{ animationDelay: `${i * 0.7}s` }} />)}
        {f.fog && <rect x="0" y="250" width="1440" height="150" fill="url(#fogG)" className={anim ? 'scene-fog' : ''} />}
      </svg>
      {/* o'qilishi uchun qoraytirish */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(7,9,15,${dim * 0.7}) 0%, rgba(7,9,15,${dim}) 45%, rgba(7,9,15,${Math.min(0.95, dim + 0.3)}) 100%)` }} />
    </div>
  );
}

export function SceneName({ sceneId }: { sceneId?: string }) {
  const [s, setS] = useState<Scene | null>(null);
  useEffect(() => { setS(pickScene(sceneId)); }, [sceneId]);
  if (!s) return null;
  return <span title={s.nameTr}>{s.name}</span>;
}

export { SCENES };
