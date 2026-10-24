'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLang, type L } from '@/lib/i18n';

export interface TourStep { target: string; title: L; text: L; place?: 'top' | 'bottom' }

const KEY = 'kopru.tours.v1';
export function tourSeen(id: string) { try { return Boolean((JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>)[id]); } catch { return false; } }
export function markTour(id: string) { try { const o = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>; o[id] = true; localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* noop */ } }
export function resetTours() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }

/** Coach-mark tur: elementni "teshik" bilan ajratib ko'rsatadi, qisqa izoh beradi. */
export default function Tour({ id, steps, open, onClose }: { id: string; steps: TourStep[]; open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const { l, t } = useLang();
  const step = steps[i];

  useLayoutEffect(() => {
    if (!open || !step) return;
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => setRect(el.getBoundingClientRect()), 350);
    };
    find();
    const on = () => { const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`); if (el) setRect(el.getBoundingClientRect()); };
    window.addEventListener('resize', on); window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('resize', on); window.removeEventListener('scroll', on); };
  }, [open, step, i]);

  useEffect(() => { if (open) setI(0); }, [open]);
  if (!open || !step) return null;

  const finish = () => { markTour(id); onClose(); };
  const next = () => { if (i + 1 >= steps.length) finish(); else setI(i + 1); };
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = rect ? (step.place ? step.place === 'bottom' : rect.bottom < vh * 0.55) : true;
  const cardStyle: React.CSSProperties = rect
    ? below ? { top: Math.min(vh - 220, rect.bottom + 12) } : { bottom: Math.max(12, vh - rect.top + 12) }
    : { bottom: 24 };

  return (
    <div className="fixed inset-0 z-[75]" onClick={next}>
      {rect ? <div className="coach-hole absolute transition-all duration-300" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} /> : <div className="absolute inset-0 bg-black/70" />}
      <div className={cn('absolute inset-x-4 mx-auto max-w-sm animate-pop rounded-2xl border border-white/10 bg-ink-900 p-4 shadow-card')} style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-400"><span>{t('tour')} · {i + 1}/{steps.length}</span><button onClick={finish} className="hover:text-white">{t('skip').toLowerCase()}</button></div>
        <div className="font-display text-lg font-bold text-white">{l(step.title)}</div>
        <p className="mt-1 text-sm text-ink-200">{l(step.text)}</p>
        <div className="mt-3 flex gap-2">{i > 0 && <button className="btn-secondary px-3 py-2 text-sm" onClick={() => setI(i - 1)}>←</button>}<button className="btn-primary flex-1 py-2 text-sm" onClick={next}>{i + 1 >= steps.length ? t('done') : t('next')}</button></div>
      </div>
    </div>
  );
}
