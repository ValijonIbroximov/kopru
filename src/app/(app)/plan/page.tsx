'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Target, CalendarDays, Timer, RefreshCw } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { useLang } from '@/lib/i18n';
import { PageHeader, Skeleton, Bar, ProgressRing } from '@/components/ui';
import Reveal from '@/components/visual/Reveal';
import Tip from '@/components/Tip';
import { fetchStats, fetchLessons, fetchLessonProgress, updateProfile, type UserStats } from '@/lib/data';
import { computePlan, getPlanSettings, defaultPlan, LEVEL_ORDER, LEVEL_WORDS, type PlanSettings } from '@/lib/plan';
import type { Lesson, LessonProgress, Cefr } from '@/lib/types';
import { todayKey, cn } from '@/lib/utils';

export default function PlanPage() {
  const { profile, settings: appSettings, refresh } = useProfile();
  const { l, t, lang } = useLang();
  const { push } = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<PlanSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { Promise.all([fetchStats(), fetchLessons(), fetchLessonProgress()]).then(([s, ls, lp]) => { setStats(s); setLessons(ls); setProgress(lp); }); }, []);
  useEffect(() => { if (profile) setForm(getPlanSettings(profile) ?? defaultPlan(profile)); }, [profile]);

  const saved = getPlanSettings(profile);
  const report = useMemo(() => (profile && stats && saved ? computePlan(saved, profile, stats, lessons, progress, todayKey(profile.tz)) : null), [profile, stats, saved, lessons, progress]);

  if (!profile || !stats || !form) return <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;

  async function savePlan() {
    if (!form) return;
    setBusy(true);
    await updateProfile({ settings: { ...(profile!.settings ?? {}), plan: { ...form, createdAt: form.createdAt || new Date().toISOString() } }, level_cefr: profile!.level_cefr, daily_goal_min: form.minutes });
    await refresh(); setBusy(false); setEdit(false);
    push({ kind: 'success', icon: '🗓️', title: l({ uz: 'Reja yangilandi', tr: 'Plan güncellendi' }) });
  }

  const minDate = todayKey(profile.tz);
  const Form = (
    <div className="card space-y-4 p-5">
      <div>
        <label className="label"><Target size={12} className="mr-1 inline" /> {l({ uz: 'Maqsad daraja', tr: 'Hedef seviye' })}</label>
        <div className="flex flex-wrap gap-2">{LEVEL_ORDER.map((lv) => <button key={lv} onClick={() => setForm({ ...form, target: lv })} className={cn('chip py-2 text-sm', form.target === lv && 'border-gold-400 bg-gold-400/20 text-white')}>{lv} <span className="text-ink-400">· {LEVEL_WORDS[lv]} {t('words')}</span></button>)}</div>
      </div>
      <div>
        <label className="label"><CalendarDays size={12} className="mr-1 inline" /> {l({ uz: 'Imtihon sanasi (ixtiyoriy)', tr: 'Sınav tarihi (isteğe bağlı)' })}</label>
        <div className="flex gap-2"><input type="date" className="input" min={minDate} value={form.examDate ?? ''} onChange={(e) => setForm({ ...form, examDate: e.target.value || null })} />{form.examDate && <button className="btn-secondary" onClick={() => setForm({ ...form, examDate: null })}>✕</button>}</div>
        <p className="mt-1 text-xs text-ink-400">{l({ uz: 'Sana bo‘lsa — reja kerakli sur’atni hisoblaydi va orqada qolsangiz ogohlantiradi.', tr: 'Tarih varsa plan gereken hızı hesaplar ve geride kalırsanız uyarır.' })}</p>
      </div>
      <div>
        <label className="label"><Timer size={12} className="mr-1 inline" /> {l({ uz: 'Kunlik vaqt', tr: 'Günlük süre' })}</label>
        <div className="flex flex-wrap gap-2">{appSettings.goals.options.concat([45, 60]).filter((v, i, a) => a.indexOf(v) === i).map((m) => <button key={m} onClick={() => setForm({ ...form, minutes: m })} className={cn('chip py-2 text-sm', form.minutes === m && 'border-teal-400 bg-teal-500/20 text-white')}>{m} {t('minutes')}</button>)}</div>
      </div>
      <div className="flex gap-2"><button className="btn-primary flex-1" disabled={busy} onClick={savePlan}>{saved ? t('save') : l({ uz: 'Rejani yaratish', tr: 'Planı oluştur' })}</button>{saved && <button className="btn-secondary" onClick={() => setEdit(false)}>{t('cancel')}</button>}</div>
    </div>
  );

  if (!saved || edit || !report) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={l({ uz: '🗓️ Moslashuvchan reja', tr: '🗓️ Uyarlanabilir plan' })} sub={l({ uz: 'Maqsad va vaqtni ayting — reja kunlik vazifalarni tuzadi va har kuni holatingizga qarab qayta hisoblaydi.', tr: 'Hedef ve süreyi söyleyin — plan günlük görevleri oluşturur ve her gün durumunuza göre yeniden hesaplar.' })} />
        {Form}
      </div>
    );
  }

  const st = report.status;
  const statusMeta = {
    ahead: { c: 'text-teal-300', bg: 'bg-teal-500/15 border-teal-400/30', uz: '🚀 Oldindasiz', tr: '🚀 İleridesiniz' },
    on_track: { c: 'text-gold-300', bg: 'bg-gold-400/10 border-gold-400/30', uz: '✅ Rejada', tr: '✅ Planda' },
    behind: { c: 'text-rose-300', bg: 'bg-rose-500/15 border-rose-400/30', uz: '⚠️ Orqadasiz', tr: '⚠️ Geridesiniz' },
    no_date: { c: 'text-ink-200', bg: 'bg-white/5 border-white/10', uz: '📈 Sur’at rejimi', tr: '📈 Tempo modu' },
    done: { c: 'text-teal-300', bg: 'bg-teal-500/15 border-teal-400/30', uz: '🏆 Maqsadga yetdingiz', tr: '🏆 Hedefe ulaştınız' },
  }[st];
  const loc = lang === 'tr' ? 'tr-TR' : 'uz-UZ';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={l({ uz: '🗓️ Mening rejam', tr: '🗓️ Planım' })} sub={l({ uz: `Maqsad: ${report.settings.target} (${report.targetWords} so‘z) · ${report.settings.minutes} daq/kun${report.settings.examDate ? ` · imtihon ${new Date(report.settings.examDate).toLocaleDateString(loc)}` : ''}`, tr: `Hedef: ${report.settings.target} (${report.targetWords} kelime) · ${report.settings.minutes} dk/gün${report.settings.examDate ? ` · sınav ${new Date(report.settings.examDate).toLocaleDateString(loc)}` : ''}` })}
        right={<button className="btn-secondary px-3 py-2 text-xs" onClick={() => setEdit(true)}><RefreshCw size={14} /> {l({ uz: 'O‘zgartirish', tr: 'Değiştir' })}</button>} />
      <Tip id="plan-intro" text={l({ uz: 'Reja statik emas: har kirishda so‘z boyligi, navbat, zaif ko‘nikmalar va sur’atga qarab qayta tuziladi. Orqada qolsangiz — ko‘proq dars va daqiqa; oldinda bo‘lsangiz — ko‘proq o‘yin va gapirish.', tr: 'Plan statik değil: her girişte kelime dağarcığı, sıra, zayıf beceriler ve hıza göre yeniden kurulur. Geride kalırsanız daha fazla ders ve dakika; ilerideyseniz daha fazla oyun ve konuşma.' })} />

      <Reveal>
        <section className={cn('card border p-5', statusMeta.bg)}>
          <div className="flex flex-wrap items-center gap-5">
            <ProgressRing value={report.progressPct} size={96} color="#ffcf4d"><div className="text-center"><div className="font-display text-xl font-bold">{report.progressPct}%</div><div className="text-[10px] text-ink-400">{report.settings.target}</div></div></ProgressRing>
            <div className="min-w-0 flex-1">
              <div className={cn('font-display text-xl font-bold', statusMeta.c)}>{l({ uz: statusMeta.uz, tr: statusMeta.tr })}</div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink-200 sm:grid-cols-4">
                <div><div className="text-xs text-ink-400">{l({ uz: 'So‘zlar', tr: 'Kelimeler' })}</div><b className="text-white">{report.wordsKnown}</b> / {report.targetWords}</div>
                <div><div className="text-xs text-ink-400">{l({ uz: 'Kerak', tr: 'Gerekli' })}</div><b className="text-white">{report.requiredPerDay}</b> {t('words')}/{t('day')}</div>
                <div><div className="text-xs text-ink-400">{l({ uz: 'Sur’atingiz', tr: 'Hızınız' })}</div><b className="text-white">{report.currentPace}</b> {t('words')}/{t('day')}</div>
                <div><div className="text-xs text-ink-400">{report.daysLeft !== null ? l({ uz: 'Qoldi', tr: 'Kaldı' }) : l({ uz: 'Taxminiy yetish', tr: 'Tahmini varış' })}</div><b className="text-white">{report.daysLeft !== null ? `${report.daysLeft} ${t('day')}` : report.projectedDate ? new Date(report.projectedDate).toLocaleDateString(loc) : '—'}</b></div>
              </div>
              <div className="mt-2 text-xs text-ink-300">{l({ uz: `Tavsiya etilgan kunlik vaqt: ${report.recommendedMinutes} daqiqa`, tr: `Önerilen günlük süre: ${report.recommendedMinutes} dakika` })}{report.recommendedMinutes > report.settings.minutes + 4 && <button className="ml-2 underline" onClick={() => { setForm({ ...form, minutes: report.recommendedMinutes }); setEdit(true); }}>{l({ uz: 'qo‘llash', tr: 'uygula' })}</button>}</div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={60}>
        <section className="card p-4">
          <h2 className="mb-2 font-display text-lg font-bold">{l({ uz: 'Moslashuvlar', tr: 'Uyarlamalar' })}</h2>
          <ul className="space-y-1 text-sm text-ink-100">{report.adjustments.map((a, i) => <li key={i}>• {l(a)}</li>)}</ul>
        </section>
      </Reveal>

      <Reveal delay={100}>
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">{l({ uz: 'Bu hafta', tr: 'Bu hafta' })}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {report.week.map((d) => (
              <div key={d.date} className={cn('card-soft glass p-3', d.isToday && 'border-ember-400/50 bg-ember-500/10')}>
                <div className="flex items-center justify-between text-xs"><span className={cn('font-semibold', d.isToday ? 'text-ember-300' : 'text-ink-300')}>{l(d.label)} {new Date(d.date + 'T00:00:00').getDate()}</span><span className="text-ink-400">{d.minutes} {t('minutes')}</span></div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-500">{l(d.focus)}</div>
                <div className="mt-2 space-y-1">
                  {d.tasks.map((task) => (
                    d.isToday ? (
                      <Link key={task.id} href={task.href} className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs transition hover:bg-white/5', task.done && 'opacity-60')}>
                        <span>{task.done ? <Check size={14} className="text-teal-300" /> : task.icon}</span><span className={cn('flex-1 truncate', task.done && 'line-through')}>{l(task.title)}</span><ChevronRight size={12} className="text-ink-500" />
                      </Link>
                    ) : <div key={task.id} className="flex items-center gap-2 px-2 py-1 text-xs text-ink-200"><span>{task.icon}</span><span className="flex-1 truncate">{l(task.title)}</span><span className="text-ink-500">{task.minutes}′</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <section className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">{l({ uz: 'Bosqichlar', tr: 'Aşamalar' })}</h2>
          <div className="space-y-3">
            {report.milestones.map((m) => (
              <div key={m.level} className="flex items-center gap-3 text-sm">
                <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display font-bold', m.reached ? 'bg-teal-500/20 text-teal-300' : 'bg-white/5 text-ink-300')}>{m.level}</div>
                <div className="min-w-0 flex-1"><div className="flex justify-between"><span className="text-white">{m.words} {t('words')}</span><span className="text-xs text-ink-400">{m.reached ? l({ uz: '✓ yetildi', tr: '✓ ulaşıldı' }) : m.date ? `${new Date(m.date).toLocaleDateString(loc)} · ${m.daysFromNow} ${t('day')}` : '—'}</span></div><Bar value={Math.min(100, (report.wordsKnown / m.words) * 100)} color={m.reached ? 'bg-teal-400' : 'bg-gold-400'} className="mt-1 h-1.5" /></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-400">{l({ uz: 'Sanalar hozirgi va kerakli sur’atning kattasiga asoslangan taxmin. Grammatika va ko‘nikmalar bosqichlarga alohida qo‘shiladi (statistika sahifasi).', tr: 'Tarihler mevcut ve gereken hızın büyüğüne dayalı tahmindir. Dil bilgisi ve beceriler aşamalara ayrıca eklenir (istatistik sayfası).' })}</p>
        </section>
      </Reveal>
    </div>
  );
}
