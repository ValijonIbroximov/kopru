'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { callAi, fetchWords, fetchLessonProgress, fetchLessons, addXp, finishSession, checkAchievements, fetchAiJobs, isLocal } from '@/lib/data';
import { supabaseBrowser } from '@/lib/supabase/client';
import { knownWords } from '@/components/exercises/GamePage';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { Skeleton, PageHeader } from '@/components/ui';
import type { StoryData, AiFailure } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n';

const TOPICS: { uz: string; tr: string }[] = [{ uz: 'kundalik hayot', tr: 'günlük hayat' }, { uz: 'sayohat', tr: 'seyahat' }, { uz: 'oila', tr: 'aile' }, { uz: 'bozor va ovqat', tr: 'pazar ve yemek' }, { uz: 'shahar', tr: 'şehir' }, { uz: 'sport', tr: 'spor' }, { uz: 'ish va o‘qish', tr: 'iş ve eğitim' }, { uz: 'askar hayoti va aloqa', tr: 'asker hayatı ve iletişim' }, { uz: 'texnologiya', tr: 'teknoloji' }, { uz: 'do‘stlik', tr: 'arkadaşlık' }];

export default function StoryPage() {
  const { profile, settings } = useProfile();
  const { push } = useToast();
  const { l, t } = useLang();
  const [topic, setTopic] = useState(TOPICS[0].uz);
  const [story, setStory] = useState<StoryData | null>(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<AiFailure | null>(null);
  const [bank, setBank] = useState<{ key: string; response: StoryData; created_at: string }[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());

  useEffect(() => {
    if (isLocal()) return;
    (async () => {
      const [{ data }, jobs] = await Promise.all([
        supabaseBrowser().from('ai_cache').select('key, response, created_at').eq('kind', 'story').order('created_at', { ascending: false }).limit(12),
        fetchAiJobs(),
      ]);
      const fromJobs = jobs.filter((j) => j.kind === 'story' && j.status === 'done' && j.result).map((j) => ({ key: j.id, response: j.result as StoryData, created_at: j.created_at }));
      setBank([...fromJobs, ...((data ?? []) as { key: string; response: StoryData; created_at: string }[])]);
    })();
  }, []);

  async function generate(variant = 0) {
    setBusy(true); setFail(null); setStory(null); setAnswers({}); setRevealed(new Set()); setFinished(false);
    const [all, lp, lessons] = await Promise.all([fetchWords(), fetchLessonProgress(), fetchLessons()]);
    const known = knownWords(all, lessons, lp, 40).map((w) => w.tr).slice(0, 60);
    const dayNum = Math.floor(Date.now() / 86400000);
    const res = await callAi<StoryData>('story', { level: profile?.level_cefr ?? 'A1', topic, words: known, seed: `${dayNum}-${variant}`, length: settings.ai.story_words });
    setBusy(false);
    if (res.ok) { setStory(res.data); setStartedAt(Date.now()); if (res.cached) push({ kind: 'info', icon: '📚', title: l({ uz: 'Kontent bankidan', tr: 'İçerik bankasından' }), body: l({ uz: 'Bu hikoya oldin yaratilgan — AI limiti sarflanmadi.', tr: 'Bu hikâye daha önce oluşturulmuş — AI limiti harcanmadı.' }) }); }
    else setFail(res);
  }

  async function finish() {
    if (!story || finished) return;
    const correct = story.questions.filter((q, i) => answers[i] === q.answer).length;
    const xp = Math.round((settings.xp.story ?? 20) * (0.5 + (0.5 * correct) / Math.max(1, story.questions.length)));
    setFinished(true);
    await finishSession(null, 'story', Math.max(1, Math.round((Date.now() - startedAt) / 60000)), correct === story.questions.length);
    const r = await addXp(xp, 'story', { topic, correct });
    push({ kind: 'xp', icon: '📖', title: `+${xp} XP`, body: `${correct}/${story.questions.length} ${t('correct')}${r?.leveled_up ? ` · ${l({ uz: 'Yangi daraja!', tr: 'Yeni seviye!' })}` : ''}` });
    const ach = await checkAchievements();
    for (const a of ach) push({ kind: 'achievement', icon: a.icon, title: `${l({ uz: 'Yutuq', tr: 'Başarı' })}: ${a.title}`, body: `+${a.xp} XP` });
  }

  if (!story) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={l({ uz: '📖 AI hikoya', tr: '📖 AI hikâye' })} sub={l({ uz: 'Darajangizga va bilgan so‘zlaringizga mos qisqa hikoya + tushunish testi. Har hikoya kontent bankida saqlanadi — limit sarflanmaydi.', tr: 'Seviyenize ve bildiğiniz kelimelere uygun kısa hikâye + anlama testi. Her hikâye içerik bankasında saklanır — limit harcanmaz.' })} />
        <div className="card p-5">
          <div className="label">{l({ uz: 'Mavzu', tr: 'Konu' })}</div>
          <div className="flex flex-wrap gap-2">{TOPICS.map((tp) => <button key={tp.uz} onClick={() => setTopic(tp.uz)} className={cn('chip py-1.5 text-sm', topic === tp.uz && 'border-ember-400 bg-ember-500/20 text-white')}>{l(tp)}</button>)}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button className="btn-primary" disabled={busy} onClick={() => generate(0)}>{busy ? l({ uz: 'AI yozmoqda…', tr: 'AI yazıyor…' }) : l({ uz: 'Bugungi hikoya ✨', tr: 'Bugünkü hikâye ✨' })}</button>
            <button className="btn-secondary" disabled={busy} onClick={() => generate(Math.floor(Math.random() * 1000))}>{l({ uz: 'Yangi variant 🎲', tr: 'Yeni varyant 🎲' })}</button>
          </div>
          {busy && <div className="mt-4 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4" /><Skeleton className="h-4 w-5/6" /></div>}
          {fail && (
            <div className="mt-4 rounded-2xl border border-gold-400/30 bg-gold-400/10 p-4 text-sm text-gold-100">
              <div className="font-semibold">{fail.reason === 'quota' ? l({ uz: '⏳ AI dam olmoqda', tr: '⏳ AI dinleniyor' }) : fail.reason === 'disabled' ? l({ uz: '🔌 AI sozlanmagan', tr: '🔌 AI ayarlanmamış' }) : `⚠️ ${t('error')}`}</div>
              <div className="mt-1 text-gold-200/90">{fail.message}</div>
              {fail.retryAt && <div className="mt-1 text-xs">{l({ uz: 'Qayta', tr: 'Tekrar' })}: {new Date(fail.retryAt).toLocaleString('uz-UZ')}</div>}
              {fail.queued && <div className="mt-2 rounded-xl bg-white/10 p-2 text-xs">{l({ uz: '✅ So‘rovingiz navbatga qo‘yildi. Limit tiklangach avtomatik tayyorlanadi — Bosh sahifada "AI material tayyorladi" bildirishnomasi chiqadi.', tr: '✅ İsteğiniz sıraya alındı. Limit yenilenince otomatik hazırlanır — Ana sayfada "AI materyal hazırladı" bildirimi çıkar.' })}</div>}
              <div className="mt-2 text-xs">{l({ uz: 'Shu paytda: pastdagi kontent bankidan hikoya o‘qing yoki ', tr: 'Bu arada: aşağıdaki içerik bankasından hikâye okuyun ya da ' })}<Link className="underline" href="/play/review">{l({ uz: 'takrorlash', tr: 'tekrar' })}</Link>{l({ uz: 'ni o‘ynang.', tr: ' oynayın.' })}</div>
            </div>
          )}
        </div>
        {bank.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 font-display text-lg font-bold">{l({ uz: 'Kontent banki', tr: 'İçerik bankası' })} ({bank.length})</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {bank.map((b) => (
                <button key={b.key} className="card-soft p-3 text-left hover:bg-white/[0.06]" onClick={() => { setStory(b.response); setAnswers({}); setRevealed(new Set()); setFinished(false); setStartedAt(Date.now()); }}>
                  <div className="text-sm font-semibold text-white">{b.response?.title_tr}</div>
                  <div className="text-xs text-ink-300">{b.response?.title_uz} · {b.response?.level}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const score = story.questions.filter((q, i) => answers[i] === q.answer).length;
  return (
    <div className="mx-auto max-w-2xl">
      <button className="text-xs text-ink-400" onClick={() => setStory(null)}>← {l({ uz: 'Hikoyalar', tr: 'Hikâyeler' })}</button>
      <h1 className="title mt-1">{story.title_tr}</h1>
      <p className="subtitle">{story.title_uz} · {story.level} · {l({ uz: 'paragrafni bosing — tarjimasi ochiladi', tr: 'paragrafa basın — çevirisi açılır' })}</p>
      <div className="card mt-4 space-y-3 p-5">
        {story.paragraphs.map((p, i) => (
          <div key={i} className="flex gap-2">
            <SpeakButton text={p.tr} size="sm" className="mt-0.5 shrink-0" />
            <div className="cursor-pointer" onClick={() => setRevealed((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
              <p className="leading-relaxed text-white">{p.tr}</p>
              {revealed.has(i) && <p className="mt-1 text-sm text-teal-200">{p.uz}</p>}
            </div>
          </div>
        ))}
      </div>
      {story.glossary?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">{story.glossary.map((g, i) => <span key={i} className="chip">{g.tr} — {g.uz}</span>)}</div>
      )}
      <div className="card mt-4 p-5">
        <h2 className="mb-3 font-display text-lg font-bold">{l({ uz: 'Tushunish testi', tr: 'Anlama testi' })}</h2>
        <div className="space-y-4">
          {story.questions.map((q, i) => (
            <div key={i}>
              <div className="mb-2 text-sm font-medium text-white">{i + 1}. {q.q}</div>
              <div className="grid gap-1.5">
                {q.options.map((o, j) => (
                  <button key={j} disabled={answers[i] !== undefined} onClick={() => setAnswers({ ...answers, [i]: j })}
                    className={cn('option py-2.5 text-sm', answers[i] !== undefined && j === q.answer && 'option-correct', answers[i] === j && j !== q.answer && 'option-wrong')}>{o}</button>
                ))}
              </div>
              {answers[i] !== undefined && q.explain && <div className="mt-1 text-xs text-ink-300">{q.explain}</div>}
            </div>
          ))}
        </div>
        {Object.keys(answers).length === story.questions.length && !finished && <button className="btn-primary mt-5 w-full" onClick={finish}>{t('finish')} ({score}/{story.questions.length})</button>}
        {finished && <div className="mt-5 grid gap-2"><button className="btn-primary" onClick={() => generate(Math.floor(Math.random() * 1000))}>{l({ uz: 'Yana bir hikoya 🎲', tr: 'Bir hikâye daha 🎲' })}</button><Link href="/dashboard" className="btn-secondary">{t('home')}</Link></div>}
      </div>
    </div>
  );
}
