'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { fetchUserWords, fetchWords, fetchGrammar, fetchLessonProgress, fetchLessons, callAi, addXp, finishSession, isLocal } from '@/lib/data';
import { practiceAverage, validWriting } from '@/lib/exam-score';
import { knownWords } from '@/components/exercises/GamePage';
import { buildExamSections } from '@/lib/exercises';
import ExerciseRunner from '@/components/exercises/ExerciseRunner';
import { TurkishKeys } from '@/components/exercises/ExerciseViews';
import { PageHeader, ProgressRing, Skeleton } from '@/components/ui';
import { useLang } from '@/lib/i18n';
import type { Exercise, SessionSummary } from '@/lib/types';

const WRITING_TASKS: Record<string, string> = {
  A1: 'Kendinizi tanıtın: adınız, nerelisiniz, mesleğiniz, hobileriniz. (40–60 kelime)',
  A2: 'Geçen hafta sonu ne yaptınız? Geçmiş zaman kullanarak anlatın. (60–90 kelime)',
  B1: 'Şehrinizdeki ulaşım sorunları hakkında bir e-posta yazın ve çözüm önerin. (120–150 kelime)',
  B2: '"Teknoloji insanları yalnızlaştırıyor mu?" konusunda görüşünüzü gerekçelerle yazın. (180–220 kelime)',
  C1: 'Eğitimde yapay zekânın rolü üzerine bir makale yazın. (250+ kelime)',
};
interface Feedback { score: number; band: string; corrected: string; comments: { wrong: string; right: string; why: string }[]; summary_uz: string }

export default function ExamPage() {
  const { profile, settings } = useProfile();
  const { push } = useToast();
  const { l, t } = useLang();
  const [phase, setPhase] = useState<'intro' | 'objective' | 'writing' | 'report'>('intro');
  const [ex, setEx] = useState<Exercise[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [text, setText] = useState('');
  const [fb, setFb] = useState<Feedback | null>(null);
  const [fbErr, setFbErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selfScore, setSelfScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const awarded = useRef(false);
  const [startError, setStartError] = useState('');
  const level = profile?.level_cefr ?? 'A1';

  async function start() {
    setLoading(true);
    setStartError(''); awarded.current = false;
    try {
      const [all, g, lp, lessons, uw] = await Promise.all([fetchWords(), fetchGrammar(), fetchLessonProgress(), fetchLessons(), fetchUserWords()]);
      const words = knownWords(all, lessons, lp, 40, uw);
      if (words.length < 4) { setStartError('Avval darslarda kamida 4 ta so‘z bilan mashq qiling. Yoki quyidagi to‘rt ko‘nikma mashqlarini oching.'); return; }
      const completed = new Set(lp.filter(x => x.status === 'completed').map(x => x.lesson_id));
      const s = buildExamSections(words, g.filter(x => x.lesson_id !== null && completed.has(x.lesson_id)), settings.exam);
      const exercises = [...s.listening, ...s.reading, ...s.speaking];
      if (!exercises.length) { setStartError('Mos mashqlar topilmadi. To‘rt ko‘nikma sahifasidan foydalaning.'); return; }
      setEx(exercises); setPhase('objective');
    } catch { setStartError('Mashqlar yuklanmadi. Internetni tekshirib, qayta urinib ko‘ring.'); }
    finally { setLoading(false); }
  }

  async function submitWriting() {
    if (!text.trim()) return;
    setBusy(true); setFbErr(null);
    const res = await callAi<Feedback>('exam_writing', { level, task: WRITING_TASKS[level], text });
    setBusy(false);
    if (res.ok && validWriting(res.data)) setFb(res.data);
    else setFbErr(res.ok ? 'AI javobi baholash talablariga mos kelmadi.' : res.message);
    setPhase('report');
  }

  const sections = useMemo(() => {
    if (!summary) return null;
    const by = (skill: string) => { const r = summary.results.filter((x) => (ex.find((e) => e.id === x.exerciseId || e.id + '_r' === x.exerciseId)?.skill ?? '') === skill); return { c: r.filter((x) => x.correct).length, t: r.length }; };
    return { listening: by('listening'), reading: { c: by('reading').c + by('grammar').c, t: by('reading').t + by('grammar').t }, speaking: by('speaking') };
  }, [summary, ex]);

  useEffect(() => {
    if (phase !== 'report' || !summary || !sections || awarded.current) return;
    awarded.current = true;
    (async () => {
      const w = fb ? fb.score * 10 : isLocal() ? selfScore * 20 : null;
      const pct = (s: { c: number; t: number }) => (s.t ? 100 * s.c / s.t : null);
      const overall = practiceAverage([pct(sections.listening), pct(sections.reading), pct(sections.speaking), w]);
      await finishSession(null, 'exam', Math.max(5, Math.round(summary.durationSec / 60)), false);
      const xp = Math.round((settings.xp.exam ?? 50) * Math.max(0.3, overall / 100));
      await addXp(xp, 'exam', { overall });
      push({ kind: 'xp', icon: '🎓', title: `+${xp} XP`, body: l({ uz: `Imtihon natijasi: ${overall}%`, tr: `Sınav sonucu: ${overall}%` }) });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={`🎓 ${t('exam')}`} sub={l({ uz: 'Qisqa mashq sinovi, rasmiy imtihon simulyatori emas: Tinglash → O‘qish → Gapirish → Yozish. Haqiqiy imtihon tartibi va ballarini rasmiy uzbmb.uz saytidan tekshiring.', tr: 'Kısa alıştırma testi; resmi sınav simülasyonu değildir: Dinleme → Okuma → Konuşma → Yazma. Gerçek sınav düzenini ve puanlarını resmi uzbmb.uz sitesinden kontrol edin.' })} />
        <div className="card p-5">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[[l({ uz: '🎧 Tinglash', tr: '🎧 Dinleme' }), settings.exam.listening], [l({ uz: '📖 O‘qish', tr: '📖 Okuma' }), settings.exam.reading], [l({ uz: '🎙️ Gapirish', tr: '🎙️ Konuşma' }), settings.exam.speaking], [l({ uz: '✍️ Yozish', tr: '✍️ Yazma' }), 1]].map(([label, n]) => (
              <div key={String(label)} className="card-soft p-3"><div className="text-ink-300">{label}</div><div className="font-display text-2xl font-bold">{n}</div><div className="text-xs text-ink-400">{l({ uz: 'topshiriq', tr: 'görev' })}</div></div>
            ))}
          </div>
          <div className="mt-4 text-sm text-ink-200">{t('level')}: <b className="text-white">{level}</b> {l({ uz: '(profilda o‘zgartiring).', tr: '(profilden değiştirin).' })} {l({ uz: `Taxminiy vaqt: ${settings.exam.time_min} daqiqa. Yozma qism AI tomonidan baholanadi; AI mavjud bo‘lmasa — o‘z-o‘zini baholash ro‘yxati.`, tr: `Tahmini süre: ${settings.exam.time_min} dakika. Yazma bölümü AI tarafından değerlendirilir; AI yoksa — öz değerlendirme listesi.` })}</div>
          <Link href="/certificate" className="btn-secondary mt-4 w-full">To‘rt ko‘nikma: matn, audio, yozish va gapirish →</Link>
          {startError && <p role="alert" className="mt-3 text-rose-200">{startError}</p>}
          <button className="btn-primary mt-5 w-full" onClick={start} disabled={loading}>{loading ? l({ uz: 'Tayyorlanmoqda…', tr: 'Hazırlanıyor…' }) : l({ uz: 'Imtihonni boshlash →', tr: 'Sınava başla →' })}</button>
        </div>
      </div>
    );
  }

  if (phase === 'objective') {
    return <ExerciseRunner key="exam" exercises={ex} mode="exam" title={t('exam')} exitHref="/exam" requeueWrong={false} onFinish={(s) => { setSummary(s); setPhase('writing'); }} />;
  }

  if (phase === 'writing') {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={l({ uz: '✍️ Yozish', tr: '✍️ Yazma' })} sub={`${t('level')} ${level}`} />
        <div className="card p-5">
          <div className="rounded-2xl bg-white/[0.04] p-3 text-sm text-white">{WRITING_TASKS[level]}</div>
          <textarea aria-label="Yozma javob" maxLength={4000} className="input mt-3 min-h-40" value={text} onChange={(e) => setText(e.target.value)} placeholder="Buraya yazın…" />
          <div className="mt-2 flex items-center justify-between"><TurkishKeys onInsert={(c) => setText(text + c)} /><span className="text-xs text-ink-400">{text.trim().split(/\s+/).filter(Boolean).length} {t('words')}</span></div>
          {isLocal() && (
            <div className="mt-4 text-sm">
              <div className="mb-1 text-ink-300">{l({ uz: 'AI yo‘q — o‘zingizni baholang (0–5):', tr: 'AI yok — kendinizi değerlendirin (0–5):' })}</div>
              <input type="range" min={0} max={5} value={selfScore} onChange={(e) => setSelfScore(Number(e.target.value))} className="w-full" /><div className="text-xs text-ink-400">{selfScore}/5 — {l({ uz: 'mazmun, grammatika, lug‘at, tuzilma', tr: 'içerik, dil bilgisi, kelime, yapı' })}</div>
            </div>
          )}
          <button className="btn-primary mt-4 w-full" disabled={busy || !text.trim()} onClick={isLocal() ? () => setPhase('report') : submitWriting}>{busy ? l({ uz: 'AI baholamoqda…', tr: 'AI değerlendiriyor…' }) : l({ uz: 'Topshirish', tr: 'Gönder' })}</button>
        </div>
      </div>
    );
  }

  if (!sections || !summary) return <Skeleton className="h-40" />;
  const pct = (s: { c: number; t: number }) => (s.t ? Math.round((s.c / s.t) * 100) : null);
  const w = fb ? fb.score * 10 : isLocal() ? selfScore * 20 : null;
  const overall = practiceAverage([pct(sections.listening), pct(sections.reading), pct(sections.speaking), w]);
  const band = fb?.band ?? (overall >= 85 ? l({ uz: 'kuchli', tr: 'güçlü' }) : overall >= 65 ? l({ uz: 'o‘rtacha', tr: 'orta' }) : l({ uz: 'boshlang‘ich', tr: 'başlangıç' }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={l({ uz: '📊 Natija', tr: '📊 Sonuç' })} sub={l({ uz: `Umumiy: ${overall}% · baho: ${band}`, tr: `Genel: ${overall}% · değerlendirme: ${band}` })} />
      <div className="card p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[[l({ uz: '🎧 Tinglash', tr: '🎧 Dinleme' }), pct(sections.listening)], [l({ uz: '📖 O‘qish', tr: '📖 Okuma' }), pct(sections.reading)], [l({ uz: '🎙️ Gapirish', tr: '🎙️ Konuşma' }), pct(sections.speaking)], [l({ uz: '✍️ Yozish', tr: '✍️ Yazma' }), w]].map(([label, v]) => (
            <div key={String(label)} className="flex flex-col items-center gap-1 text-xs text-ink-300"><ProgressRing value={Number(v)} size={72} stroke={7} color={Number(v) >= 70 ? '#2fd1bc' : '#ff6a2a'}><b className="text-white">{v === null ? '—' : `${v}%`}</b></ProgressRing>{label}</div>
          ))}
        </div>
        {fb && (
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-100"><b>{l({ uz: 'AI xulosasi', tr: 'AI özeti' })} ({fb.score}/10, {fb.band}):</b> {fb.summary_uz}</div>
            {fb.comments?.filter((c) => c.wrong).map((c, i) => <div key={i} className="rounded-xl bg-white/[0.04] p-2 text-ink-200"><s className="text-rose-300">{c.wrong}</s> → <b className="text-teal-300">{c.right}</b> — {c.why}</div>)}
            {fb.corrected && <div><div className="label">{l({ uz: 'Tuzatilgan matn', tr: 'Düzeltilmiş metin' })}</div><div className="rounded-2xl bg-white/[0.04] p-3 text-white">{fb.corrected}</div></div>}
          </div>
        )}
        {fbErr && <div className="mt-4 rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-100">{l({ uz: `AI baholay olmadi (${fbErr}). Yozma qism hisobga olinmadi — keyinroq AI o‘qituvchida matnni tekshirtiring.`, tr: `AI değerlendiremedi (${fbErr}). Yazma bölümü sayılmadı — daha sonra metni AI öğretmende kontrol ettirin.` })}</div>}
        <p className="mt-4 text-xs text-ink-300">Bu mashq natijasi rasmiy sertifikat bali yoki CEFR darajasi emas. Gapirish foizi faqat mashq javobiga moslikni bildiradi. Baholanmagan bo‘limlar o‘rtachaga kiritilmaydi.</p><div className="mt-5 text-xs text-ink-400">{l({ uz: 'Tavsiya: eng past bo‘lim —', tr: 'Öneri: en düşük bölüm —' })} <b className="text-white">{[[l({ uz: 'Tinglash', tr: 'Dinleme' }), pct(sections.listening)], [l({ uz: 'O‘qish', tr: 'Okuma' }), pct(sections.reading)], [l({ uz: 'Gapirish', tr: 'Konuşma' }), pct(sections.speaking)], [l({ uz: 'Yozish', tr: 'Yazma' }), w]].filter(x => x[1] !== null).sort((a, b) => Number(a[1]) - Number(b[1]))[0][0]}</b>. {l({ uz: 'Shu rejimda ko‘proq o‘ynang.', tr: 'Bu modda daha çok oynayın.' })}</div>
        <div className="mt-5 grid gap-2"><button className="btn-primary" onClick={() => { setPhase('intro'); setSummary(null); setFb(null); setFbErr(null); setSelfScore(0); setText(''); }}>{l({ uz: 'Yana topshirish', tr: 'Sınava tekrar gir' })}</button><Link href="/stats" className="btn-secondary">{t('stats')}</Link></div>
      </div>
    </div>
  );
}
