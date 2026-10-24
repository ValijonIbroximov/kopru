'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Scroll bilan paydo bo'lish (IntersectionObserver). prefers-reduced-motion hurmat qilinadi. */
export default function Reveal({ children, className, delay = 0, as = 'div', once = true, variant = 'up' }: { children: React.ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li' | 'span'; once?: boolean; variant?: 'up' | 'left' | 'right' | 'scale' | 'fade' }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setInView(true); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { setInView(true); if (once) io.unobserve(el); }
        else if (!once) setInView(false);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  const Tag = as as unknown as React.ElementType;
  return <Tag ref={ref} className={cn('reveal', `reveal-${variant}`, inView && 'in', className)} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

/** Raqamni animatsiya bilan sanash (ko'ringanda). */
export function CountUp({ value, duration = 900, className, suffix = '', prefix = '' }: { value: number; duration?: number; className?: string; suffix?: string; prefix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const e = 1 - Math.pow(1 - p, 3);
        setV(Math.round(value * e));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(value); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { run(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);
  useEffect(() => { if (started.current) setV(value); }, [value]);
  return <span ref={ref} className={className}>{prefix}{v.toLocaleString('uz-UZ')}{suffix}</span>;
}

/** Sahifa yuqorisida scroll progress chizig'i */
export function ScrollProgress({ color = 'bg-gradient-to-r from-ember-500 to-rose-500' }: { color?: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; setP(max > 0 ? (h.scrollTop / max) * 100 : 0); }); };
    on(); window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);
  return <div className="fixed inset-x-0 top-0 z-[80] h-0.5 bg-transparent"><div className={cn('h-full transition-[width] duration-150', color)} style={{ width: `${p}%` }} /></div>;
}
