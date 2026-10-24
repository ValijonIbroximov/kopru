'use client';
import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Exercise, GrammarTopic, Lesson, SessionSummary, Word, ListenExercise, OrderExercise, ChoiceExercise } from '@/lib/types';
import { fetchLesson, fetchWords, fetchGrammar, fetchDue, fetchActiveSession, fetchLessons, markLessonStarted, fetchUserWords } from '@/lib/data';
import { buildLessonSession, buildBossSession, buildGrammarSession, buildHarmonySession, choiceTrToUz, listenExercise, intro, speakExercise } from '@/lib/exercises';
import { SOUND_MAP } from '@/lib/turkish';
import ExerciseRunner, { type RunnerState } from '@/components/exercises/ExerciseRunner';
import SessionEnd from '@/components/exercises/SessionEnd';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { Markdown, Skeleton } from '@/components/ui';
import { shuffle, uid } from '@/lib/utils';

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const lessonId = Number(id);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [pool, setPool] = useState<Word[]>([]);
  const [grammar, setGrammar] = useState<GrammarTopic[]>([]);
  const [reviewWords, setReviewWords] = useState<Word[]>([]);
  const [unitWords, setUnitWords] = useState<Word[]>([]);
  const [unitGrammar, setUnitGrammar] = useState<GrammarTopic[]>([]);
  const [resume, setResume] = useState<{ id: string; state: RunnerState } | null>(null);
  const [phase, setPhase] = useState<'loading' | 'intro' | 'running' | 'done'>('loading');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [summary, setSummary] = useState<{ s: SessionSummary; id: string | null } | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    (async () => {
      const [l, all, g, due, active, lessons, uw] = await Promise.all([fetchLesson(lessonId), fetchWords(), fetchGrammar(), fetchDue(8, 0), fetchActiveSession('lesson', lessonId), fetchLessons(), fetchUserWords()]);
      if (!l) return;
      setLesson(l);
      setPool(all);
      // ko'rilmagan so'zlar birinchi — har sessiyada yangi so'zlar keladi
      const seen = new Set(uw.map((x) => x.word_id));
      const mine = all.filter((w) => w.lesson_id === lessonId);
      setWords([...shuffle(mine.filter((w) => !seen.has(w.id))), ...shuffle(mine.filter((w) => seen.has(w.id)))]);
      setGrammar(g.filter((x) => x.lesson_id === lessonId));
      setReviewWords(due.map((d) => d.word));
      const unitLessonIds = new Set(lessons.filter((x) => x.unit_id === l.unit_id).map((x) => x.id));
      setUnitWords(all.filter((w) => w.lesson_id && unitLessonIds.has(w.lesson_id)));
      setUnitGrammar(g.filter((x) => x.lesson_id && unitLessonIds.has(x.lesson_id)));
      const st = active?.state as RunnerState | undefined;
      if (active && st && Array.isArray(st.queue) && st.index < st.queue.length) setResume({ id: active.id, state: st });
      setPhase('intro');
    })();
  }, [lessonId]);

  const dialogExercises = useMemo((): Exercise[] => {
    if (!lesson?.content.dialog) return [];
    const lines = lesson.content.dialog;
    const ex: Exercise[] = [];
    lines.forEach((ln, i) => {
      const others = shuffle(lines.filter((_, j) => j !== i)).slice(0, 3).map((x) => x.tr);
      ex.push({ id: uid('dl'), type: 'listen', skill: 'listening', tts: ln.tr, answer: ln.tr, translation: ln.uz, options: shuffle([ln.tr, ...others]) } as ListenExercise);
    });
    lines.forEach((ln) => {
      const tokens = ln.tr.replace(/[.!?]$/, '').split(/\s+/);
      if (tokens.length >= 3 && tokens.length <= 9) ex.push({ id: uid('do'), type: 'order', skill: 'grammar', prompt: ln.uz, answer: tokens, tokens: shuffle(tokens), tts: ln.tr } as OrderExercise);
    });
    lines.slice(0, 3).forEach((ln) => {
      const others = shuffle(lines.filter((x) => x.tr !== ln.tr)).slice(0, 3).map((x) => x.uz);
      const opts = shuffle([ln.uz, ...others]);
      ex.push({ id: uid('dc'), type: 'choice', skill: 'reading', prompt: ln.tr, promptSub: 'Tarjimasini tanlang', options: opts, answer: opts.indexOf(ln.uz), tts: ln.tr } as ChoiceExercise);
    });
    return ex;
  }, [lesson]);

  function build(): Exercise[] {
    if (!lesson) return [];
    switch (lesson.kind) {
      case 'boss':
        return buildBossSession(unitWords, pool, unitGrammar, 16);
      case 'grammar': {
        const ex: Exercise[] = [];
        if (grammar.some((g) => g.code === 'vowel_harmony' || g.code === 'plural')) ex.push(...buildHarmonySession(unitWords.length >= 10 ? unitWords : pool, 8));
        ex.push(...buildGrammarSession(grammar, 12));
        for (const w of shuffle(words).slice(0, 4)) ex.push(intro(w), choiceTrToUz(w, pool));
        if (words.length) ex.push(speakExercise(words[0]));
        for (const w of reviewWords.slice(0, 4)) ex.push(listenExercise(w, pool));
        return ex;
      }
      case 'dialog': {
        const ex: Exercise[] = [];
        for (const w of shuffle(words).slice(0, 6)) ex.push(intro(w), choiceTrToUz(w, pool));
        ex.push(...dialogExercises);
        if (lesson.content.dialog?.[0]) ex.push({ id: uid('ds'), type: 'speak', skill: 'speaking', text: lesson.content.dialog[0].tr, translation: lesson.content.dialog[0].uz });
        return ex;
      }
      default:
        return buildLessonSession({ newWords: words, pool, reviewWords, grammar, lesson, maxItems: lesson.kind === 'cognates' ? 30 : 26 });
    }
  }

  const start = (useResume: boolean) => {
    if (useResume && resume) { setExercises(resume.state.queue); setPhase('running'); return; }
    setResume(null);
    setExercises(build());
    markLessonStarted(lessonId).catch(() => {});
    setPhase('running');
  };

  if (phase === 'loading' || !lesson) return <div className="mx-auto max-w-xl space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64" /></div>;

  if (phase === 'done' && summary) {
    const wrongIds = new Set(summary.s.results.filter((r) => !r.correct && r.wordId).map((r) => r.wordId));
    const mistakes = pool.filter((w) => wrongIds.has(w.id)).map((w) => ({ tr: w.tr, uz: w.uz }));
    return <SessionEnd summary={summary.s} sessionId={summary.id} lessonId={lessonId} bonusXp={lesson.xp_reward} mistakes={mistakes} nextHref="/learn" nextLabel="O‘rganish yo‘li" onRetry={() => { setSummary(null); start(false); }} />;
  }

  if (phase === 'running') {
    return <ExerciseRunner key={resume?.id ?? 'new'} exercises={exercises} mode="lesson" lessonId={lessonId} title={lesson.title_uz} exitHref="/learn" resume={resume}
      onFinish={(s, sid) => { setSummary({ s, id: sid }); setPhase('done'); }} />;
  }

  // ---------- INTRO ----------
  const c = lesson.content;
  const tabs: { label: string; node: React.ReactNode }[] = [];
  if (c.intro || c.hook) tabs.push({ label: 'Kirish', node: (
    <div className="space-y-3 text-sm">
      {c.hook && <div className="rounded-2xl bg-ember-500/10 p-3 text-ember-200">🎯 {c.hook}</div>}
      {c.intro && <p className="leading-relaxed text-ink-100">{c.intro}</p>}
      {c.tip && <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-200">💡 {c.tip}</div>}
    </div>) });
  if (grammar.length) tabs.push({ label: 'Qoida', node: (
    <div className="space-y-6">
      {grammar.map((g) => <div key={g.id}><h3 className="mb-2 font-display text-lg font-bold">{g.title_uz} <span className="text-sm font-normal text-ink-400">{g.title_tr}</span></h3><Markdown text={g.explanation_md} /></div>)}
    </div>) });
  if (c.dialog) tabs.push({ label: 'Dialog', node: (
    <div className="space-y-2">
      {c.dialog.map((ln, i) => (
        <div key={i} className={`flex items-start gap-2 ${ln.who === 'B' ? 'flex-row-reverse text-right' : ''}`}>
          <div className={`max-w-[85%] rounded-2xl p-3 ${ln.who === 'B' ? 'bg-teal-500/15' : 'bg-white/[0.05]'}`}>
            <div className="text-sm text-white">{ln.tr}</div><div className="text-xs text-ink-300">{ln.uz}</div>
          </div>
          <SpeakButton text={ln.tr} size="sm" />
        </div>
      ))}
    </div>) });
  if (lesson.kind === 'cognates') tabs.push({ label: 'Tovush mosligi', node: (
    <div className="grid gap-2 text-sm">
      {SOUND_MAP.map((s) => <div key={s.uz} className="card-soft flex items-center gap-3 p-3"><span className="w-20 shrink-0 font-bold text-ember-300">{s.uz} → {s.tr}</span><span className="text-ink-200">{s.example}</span></div>)}
    </div>) });
  if (words.length) tabs.push({ label: `So‘zlar (${words.length})`, node: (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {words.slice().sort((a, b) => a.id - b.id).map((w) => (
        <div key={w.id} className="card-soft flex items-center gap-2 p-2.5 text-sm">
          <SpeakButton text={w.tr} size="sm" />
          <div className="min-w-0 flex-1"><div className="font-semibold text-white">{w.tr}</div><div className="truncate text-xs text-ink-300">{w.uz}{w.cognate ? ` · ${w.false_friend ? '⚠️' : '🌉'} ${w.cognate}` : ''}</div></div>
        </div>
      ))}
    </div>) });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/learn" className="text-xs text-ink-400">← O‘rganish yo‘li</Link>
      <h1 className="title mt-1">{lesson.title_uz}</h1>
      <p className="subtitle">{lesson.title_tr} · +{lesson.xp_reward} XP · {lesson.kind === 'boss' ? `${unitWords.length} so‘z, ${unitGrammar.length} qoida` : `${words.length} so‘z`}</p>

      <div className="mt-4 flex gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((t, i) => <button key={t.label} onClick={() => setTab(i)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${tab === i ? 'bg-white/10 text-white' : 'text-ink-400'}`}>{t.label}</button>)}
      </div>
      <div className="card mt-3 p-4">{tabs[tab]?.node ?? <p className="text-ink-300">Mashqlarni boshlang.</p>}</div>

      <div className="sticky bottom-0 mt-4 grid gap-2 bg-ink-950/80 py-3 backdrop-blur">
        {resume && <button className="btn-primary" onClick={() => start(true)}>Davom ettirish ({resume.state.index}/{resume.state.queue.length}) →</button>}
        <button className={resume ? 'btn-secondary' : 'btn-primary'} onClick={() => start(false)}>{lesson.kind === 'boss' ? '👑 Bossga kirish' : resume ? 'Yangidan boshlash' : 'Mashqlarni boshlash →'}</button>
      </div>
    </div>
  );
}
