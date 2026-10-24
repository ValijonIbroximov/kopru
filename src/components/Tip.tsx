'use client';
import { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang, type L } from '@/lib/i18n';

const KEY = 'kopru.tips.v1';
function seen(id: string) { try { return Boolean((JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>)[id]); } catch { return false; } }
function mark(id: string) { try { const o = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>; o[id] = true; localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* noop */ } }
export function resetTips() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }

/** Bir martalik kontekstli maslahat (yopilgach qaytib chiqmaydi). */
export default function Tip({ id, text, title, className, action }: { id: string; text: L; title?: L; className?: string; action?: { label: L; onClick: () => void } }) {
  const [show, setShow] = useState(false);
  const { l, t } = useLang();
  useEffect(() => { setShow(!seen(id)); }, [id]);
  if (!show) return null;
  return (
    <div className={cn('mb-4 flex items-start gap-3 rounded-2xl border border-gold-400/25 bg-gold-400/[0.08] p-3 text-sm animate-pop', className)}>
      <Lightbulb size={18} className="mt-0.5 shrink-0 text-gold-300" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-gold-200">{title ? l(title) : t('tip')}</div>
        <div className="text-ink-100">{l(text)}</div>
        {action && <button className="mt-2 text-xs font-semibold text-gold-300 underline" onClick={action.onClick}>{l(action.label)}</button>}
      </div>
      <button className="text-ink-400 hover:text-white" onClick={() => { mark(id); setShow(false); }} aria-label={t('close')}><X size={16} /></button>
    </div>
  );
}
