'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Check } from 'lucide-react';
import { fetchUnits, fetchLessons, fetchLessonProgress, fetchWords } from '@/lib/data';
import type { Unit, Lesson, LessonProgress } from '@/lib/types';
import { PageHeader, Skeleton, Bar } from '@/components/ui';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<string, string> = { vocab: '📘', grammar: '📐', dialog: '💬', culture: '🏛️', boss: '👑', cognates: '🌉' };

export default function LearnPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [wordCount, setWordCount] = useState<Record<number, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [u, l, p, w] = await Promise.all([fetchUnits(), fetchLessons(), fetchLessonProgress(), fetchWords()]);
      setUnits(u); setLessons(l); setProgress(p);
      const wc: Record<number, number> = {};
      for (const x of w) if (x.lesson_id) wc[x.lesson_id] = (wc[x.lesson_id] ?? 0) + 1;
      setWordCount(wc);
      setReady(true);
    })();
  }, []);

  if (!ready) return <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>;

  const pmap = new Map(progress.map((p) => [p.lesson_id, p]));
  const ordered = lessons.slice().sort((a, b) => (units.find((u) => u.id === a.unit_id)?.order_index ?? 0) - (units.find((u) => u.id === b.unit_id)?.order_index ?? 0) || a.order_index - b.order_index);
  // Ochiq darslar: tugallangan/boshlangan + birinchi tugallanmagan
  const firstOpen = ordered.find((l) => pmap.get(l.id)?.status !== 'completed');
  const isUnlocked = (l: Lesson) => { const st = pmap.get(l.id)?.status; return st === 'completed' || st === 'in_progress' || st === 'available' || l.id === firstOpen?.id; };
  const completedCount = progress.filter((p) => p.status === 'completed').length;

  return (
    <div>
      <PageHeader title="O‘rganish yo‘li" sub={`${completedCount}/${lessons.length} dars yakunlandi · A1 → A2 → (admin paneldan B1, B2 qo‘shing)`} />
      <div className="space-y-6">
        {units.map((u) => {
          const ls = ordered.filter((l) => l.unit_id === u.id);
          const done = ls.filter((l) => pmap.get(l.id)?.status === 'completed').length;
          return (
            <section key={u.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-white/[0.06] p-4" style={{ background: `linear-gradient(90deg, ${u.color}22, transparent)` }}>
                <div className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: `${u.color}33` }}>{u.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><h2 className="font-display text-lg font-bold">{u.title_uz}</h2><span className="chip">{u.cefr}</span></div>
                  <div className="truncate text-xs text-ink-300">{u.description}</div>
                  <Bar value={ls.length ? (done / ls.length) * 100 : 0} className="mt-2 h-1.5" color="bg-teal-400" />
                </div>
              </div>
              <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2">
                {ls.map((l) => {
                  const p = pmap.get(l.id);
                  const unlocked = isUnlocked(l);
                  const completed = p?.status === 'completed';
                  const inner = (
                    <div className={cn('flex items-center gap-3 bg-ink-900 p-4 transition', unlocked ? 'hover:bg-ink-800' : 'opacity-50')}>
                      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl', completed ? 'bg-teal-500/20' : l.kind === 'boss' ? 'bg-gold-400/20' : 'bg-white/5')}>{KIND_ICON[l.kind] ?? '📘'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{l.title_uz}</div>
                        <div className="text-xs text-ink-400">
                          {l.kind === 'boss' ? 'Boss sinov' : l.kind === 'grammar' ? 'Grammatika' : l.kind === 'dialog' ? 'Dialog' : l.kind === 'cognates' ? 'Qarindosh so‘zlar' : 'Lug‘at'}
                          {wordCount[l.id] ? ` · ${wordCount[l.id]} so‘z` : ''} · +{l.xp_reward} XP
                          {completed && p && <span className="text-gold-400"> · {'★'.repeat(p.stars)}{'☆'.repeat(3 - p.stars)} {p.best_score}%</span>}
                        </div>
                      </div>
                      {completed ? <Check size={18} className="text-teal-400" /> : unlocked ? <span className="text-xs text-ember-300">{p?.status === 'in_progress' ? 'davom' : 'boshlash'} →</span> : <Lock size={16} className="text-ink-500" />}
                    </div>
                  );
                  return unlocked ? <Link key={l.id} href={`/learn/${l.id}`}>{inner}</Link> : <div key={l.id}>{inner}</div>;
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
