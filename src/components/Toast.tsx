'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ToastItem { id: number; title: string; body?: string; icon?: string; kind?: 'info' | 'success' | 'xp' | 'achievement' | 'error' }
interface ToastCtx { push: (t: Omit<ToastItem, 'id'>) => void }
const Ctx = createContext<ToastCtx>({ push: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.kind === 'achievement' ? 5000 : 3200);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-card backdrop-blur animate-pop',
            t.kind === 'achievement' ? 'border-gold-400/40 bg-gold-400/15' : t.kind === 'xp' ? 'border-ember-400/40 bg-ember-500/15' : t.kind === 'error' ? 'border-rose-500/40 bg-rose-500/15' : t.kind === 'success' ? 'border-teal-400/40 bg-teal-500/15' : 'border-white/10 bg-ink-800/90')}>
            {t.icon && <span className="text-2xl leading-none">{t.icon}</span>}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{t.title}</div>
              {t.body && <div className="text-xs text-ink-200">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
