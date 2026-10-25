'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { orderedLessons, lessonIsOpen } from '@/lib/game-policy';
import { Lock, Check } from 'lucide-react';
import { fetchUnits, fetchLessons, fetchLessonProgress, fetchWords } from '@/lib/data';
import type { Unit, Lesson, LessonProgress } from '@/lib/types';
import { PageHeader, Skeleton, Bar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n';

const KIND_ICON: Record<string, string> = { vocab: '📘', grammar: '📐', dialog: '💬', culture: '🏛️', boss: '👑', cognates: '🌉' };
const KIND_LABEL: Record<string, { uz: string; tr: string }> = {
  boss: { uz: 'Boss sinov', tr: 'Boss sınavı' },
  grammar: { uz: 'Grammatika', tr: 'Dil bilgisi' },
  dialog: { uz: 'Dialog', tr: 'Diyalog' },
  cognates: { uz: 'Qarindosh so‘zlar', tr: 'Ortak kelimeler' },
  vocab: { uz: 'Lug‘at', tr: 'Kelimeler' },
};

export default function LearnPage() {
  const { l, t, lang } = useLang();
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
  const ordered = orderedLessons(lessons, units);
  const isUnlocked = (lesson: Lesson) => lessonIsOpen(lesson.id, ordered, progress);
  const completedCount = progress.filter((p) => p.status === 'completed').length;

  return (
    <div>
      <PageHeader title={t('learning_path')} sub={l({ uz: `${completedCount}/${lessons.length} dars yakunlandi · Bosqichma-bosqich o‘rganish`, tr: `${completedCount}/${lessons.length} ders tamamlandı · Adım adım öğrenme` })} />
      <div className="space-y-6">
        {units.map((u) => {
          const ls = ordered.filter((l) => l.unit_id === u.id);
          const done = ls.filter((l) => pmap.get(l.id)?.status === 'completed').length;
          return (
            <section key={u.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-white/[0.06] p-4" style={{ background: `linear-gradient(90deg, ${u.color}22, transparent)` }}>
                <div className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: `${u.color}33` }}>{u.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><h2 className="font-display text-lg font-bold">{lang === 'tr' && u.title_tr ? u.title_tr : u.title_uz}</h2><span className="chip">{u.cefr}</span></div>
                  <div className="truncate text-xs text-ink-300">{u.description}</div>
                  <Bar value={ls.length ? (done / ls.length) * 100 : 0} className="mt-2 h-1.5" color="bg-teal-400" />
                </div>
              </div>
              <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2">
                {ls.map((lesson) => {
                  const p = pmap.get(lesson.id);
                  const unlocked = isUnlocked(lesson);
                  const completed = p?.status === 'completed';
                  const inner = (
                    <div className={cn('flex items-center gap-3 bg-ink-900 p-4 transition', unlocked ? 'hover:bg-ink-800' : 'opacity-50')}>
                      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl', completed ? 'bg-teal-500/20' : lesson.kind === 'boss' ? 'bg-gold-400/20' : 'bg-white/5')}>{KIND_ICON[lesson.kind] ?? '📘'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{lang === 'tr' && lesson.title_tr ? lesson.title_tr : lesson.title_uz}</div>
                        <div className="text-xs text-ink-400">
                          {l(KIND_LABEL[lesson.kind] ?? KIND_LABEL.vocab)}
                          {wordCount[lesson.id] ? ` · ${wordCount[lesson.id]} ${t('words')}` : ''} · +{lesson.xp_reward} XP
                          {completed && p && <span className="text-gold-400"> · {'★'.repeat(p.stars)}{'☆'.repeat(3 - p.stars)} {p.best_score}%</span>}
                        </div>
                      </div>
                      {completed ? <Check size={18} className="text-teal-400" /> : unlocked ? <span className="text-xs text-ember-300">{p?.status === 'in_progress' ? l({ uz: 'davom', tr: 'devam' }) : l({ uz: 'boshlash', tr: 'başla' })} →</span> : <Lock size={16} className="text-ink-500" />}
                    </div>
                  );
                  return unlocked ? <Link key={lesson.id} href={`/learn/${lesson.id}`}>{inner}</Link> : <div key={lesson.id}>{inner}</div>;
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
