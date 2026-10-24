'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface HowToStep { icon: string; title: string; text: string; demo?: React.ReactNode }

const KEY = 'kopru.howto.v1';

export function hasSeenHowTo(id: string) {
  try { return Boolean((JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>)[id]); } catch { return false; }
}
export function markHowToSeen(id: string) {
  try { const o = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>; o[id] = true; localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* noop */ }
}

/** Qisqa o'rgatuvchi: 2–4 qadam, kartochka ko'rinishida. Birinchi marta avtomatik, keyin "?" tugmasi orqali. */
export default function HowToPlay({ id, title, steps, onDone, open }: { id: string; title: string; steps: HowToStep[]; onDone: () => void; open: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (open) setI(0); }, [open]);
  if (!open) return null;
  const s = steps[i];
  const last = i === steps.length - 1;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => { markHowToSeen(id); onDone(); }}>
      <div className="w-full max-w-md animate-pop rounded-t-3xl border border-white/10 bg-ink-900 p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between text-xs text-ink-400"><span>Qanday o‘ynaladi · {title}</span><span>{i + 1}/{steps.length}</span></div>
        <div className="flex gap-1">{steps.map((_, k) => <div key={k} className={cn('h-1 flex-1 rounded-full', k <= i ? 'bg-ember-500' : 'bg-white/10')} />)}</div>
        <div key={i} className="mt-5 animate-pop text-center">
          <div className="text-5xl">{s.icon}</div>
          <h3 className="mt-3 font-display text-xl font-bold text-white">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-200">{s.text}</p>
          {s.demo && <div className="mt-4">{s.demo}</div>}
        </div>
        <div className="mt-6 flex gap-2">
          {i > 0 && <button className="btn-secondary" onClick={() => setI(i - 1)}>←</button>}
          <button className="btn-primary flex-1" onClick={() => { if (last) { markHowToSeen(id); onDone(); } else setI(i + 1); }}>{last ? 'Tushundim, boshlaymiz!' : 'Keyingi →'}</button>
        </div>
        {!last && <button className="mt-2 w-full text-xs text-ink-400 hover:text-white" onClick={() => { markHowToSeen(id); onDone(); }}>O‘tkazib yuborish</button>}
      </div>
    </div>
  );
}
