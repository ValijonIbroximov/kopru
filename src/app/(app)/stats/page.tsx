'use client';
import { useEffect, useMemo, useState } from 'react';
import { useProfile } from '@/components/AppShell';
import Link from 'next/link';
import { fetchStats, fetchLeaderboard, isLocal, type UserStats } from '@/lib/data';
import { analyzeMotivation, MODES } from '@/lib/motivation';
import { PageHeader, Skeleton, Bar, ProgressRing } from '@/components/ui';
import Reveal, { CountUp } from '@/components/visual/Reveal';
import Tip from '@/components/Tip';
import { todayKey, formatMinutes, cn, leagueIcon } from '@/lib/utils';
import { useLang } from '@/lib/i18n';

function Heatmap({ days, tz }: { days: { day: string; xp: number }[]; tz: string }) {
  const map = new Map(days.map((d) => [d.day, d.xp]));
  const today = new Date(todayKey(tz) + 'T00:00:00');
  const weeks = 17;
  const cells: { day: string; xp: number; col: number; row: number }[] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1) - ((today.getDay() + 6) % 7));
  for (let i = 0; i < weeks * 7 + 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (d > today) break;
    const key = d.toISOString().slice(0, 10);
    cells.push({ day: key, xp: map.get(key) ?? 0, col: Math.floor(i / 7), row: i % 7 });
  }
  const max = Math.max(1, ...cells.map((c) => c.xp));
  const color = (xp: number) => (xp === 0 ? 'rgba(255,255,255,0.06)' : `rgba(47,209,188,${0.25 + 0.75 * Math.min(1, xp / max)})`);
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  return (
    <svg viewBox={`0 0 ${cols * 14} ${7 * 14}`} className="w-full">
      {cells.map((c) => <rect key={c.day} x={c.col * 14} y={c.row * 14} width={12} height={12} rx={3} fill={color(c.xp)}><title>{c.day}: {c.xp} XP</title></rect>)}
    </svg>
  );
}

export default function StatsPage() {
  const { profile, settings } = useProfile();
  const { l, t } = useLang();
  const [s, setS] = useState<UserStats | null>(null);
  const [top, setTop] = useState<Awaited<ReturnType<typeof fetchLeaderboard>>>([]);
  useEffect(() => { fetchStats().then(setS); fetchLeaderboard(100).then(setTop); }, []);

  const skills = useMemo(() => {
    if (!s) return null;
    const acc = (modes: string[]) => { let c = 0, t = 0; for (const m of modes) { const x = s.modes[m]; if (x) { c += x.correct; t += x.total; } } return t ? { pct: Math.round((c / t) * 100), n: t } : { pct: 0, n: 0 }; };
    return [
      { k: { uz: 'Tinglash', tr: 'Dinleme' }, v: acc(['listen', 'exam']) },
      { k: { uz: 'O‘qish', tr: 'Okuma' }, v: acc(['review', 'lesson', 'match', 'cognates', 'story']) },
      { k: { uz: 'Grammatika', tr: 'Dil bilgisi' }, v: acc(['harmony', 'grammar', 'builder']) },
      { k: { uz: 'Gapirish', tr: 'Konuşma' }, v: acc(['speak']) },
    ];
  }, [s]);

  const report = useMemo(() => (profile && s ? analyzeMotivation(profile, s.heatmap, settings, s.totals.reviews ? s.totals.correct / s.totals.reviews : null) : null), [profile, s, settings]);

  if (!s || !profile) return <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;

  const wordsTotal = s.words.learning + s.words.review + s.words.mastered + s.words.new;
  const interests = profile.interests ?? {};
  const totalPlays = Object.values(interests).reduce((a, b) => a + b, 0);
  // Sertifikatga tayyorlik (taxminiy): so'zlar + darslar + ko'nikmalar
  const vocabTarget = profile.level_cefr === 'A1' ? 500 : profile.level_cefr === 'A2' ? 1200 : 2500;
  const readiness = Math.round(Math.min(100, (s.words.mastered + s.words.review * 0.5) / vocabTarget * 60 + (s.lessons.total ? (s.lessons.completed / s.lessons.total) * 40 : 0)));

  return (
    <div className="space-y-5">
      <PageHeader title={t('stats')} sub={l({ uz: 'Bilim darajangiz, faollik, qiziqishlar va zaif joylar.', tr: 'Bilgi seviyeniz, etkinlik, ilgi alanları ve zayıf noktalar.' })} />
      <Tip id="stats-intro" text={{ uz: '«Mukammal» — so‘zni 21+ kun eslab qolish barqarorligi. «Sertifikatga tayyorlik» — so‘z boyligi (60%) + darslar (40%) bo‘yicha taxmin. Eng past ko‘nikmaga qarang — murabbiy shu rejimni tavsiya qiladi.', tr: '«Mükemmel» — kelimeyi 21+ gün hatırlama kararlılığı. «Sertifikaya hazırlık» — kelime hazinesi (%60) + dersler (%40) tahmini. En düşük beceriye bakın — koç o modu önerir.' }} />

      <Reveal>
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-4">
          <ProgressRing value={readiness} size={84} color="#ffcf4d"><div className="text-center"><div className="font-display text-lg font-bold"><CountUp value={readiness} suffix="%" /></div></div></ProgressRing>
          <div><div className="text-xs text-ink-400">{l({ uz: 'Sertifikatga tayyorlik', tr: 'Sertifikaya hazırlık' })} ({profile.level_cefr})</div><div className="text-sm text-ink-200">{s.words.mastered} {l({ uz: 'mukammal so‘z', tr: 'mükemmel kelime' })} · {s.lessons.completed}/{s.lessons.total} {t('lesson')}</div></div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <ProgressRing value={report?.score ?? 0} size={84} color={report?.risk === 'high' ? '#f43f6e' : report?.risk === 'medium' ? '#ff6a2a' : '#2fd1bc'}><div className="font-display text-lg font-bold">{report?.score}</div></ProgressRing>
          <div><div className="text-xs text-ink-400">{l({ uz: 'Motivatsiya indeksi', tr: 'Motivasyon endeksi' })}</div><div className="text-sm text-ink-200">{l({ uz: 'xavf', tr: 'risk' })}: {report?.risk === 'high' ? l({ uz: 'yuqori', tr: 'yüksek' }) : report?.risk === 'medium' ? l({ uz: 'o‘rta', tr: 'orta' }) : l({ uz: 'past', tr: 'düşük' })} · {l({ uz: 'zerikish', tr: 'sıkılma' })} {report?.boredom}%</div></div>
        </div>
        <div className="card p-4 text-sm">
          <div className="text-xs text-ink-400">{t('xp_total')}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-ink-200">
            <span>⏱ {formatMinutes(s.totals.minutes)}</span><span>📅 {s.totals.active_days} {l({ uz: 'faol kun', tr: 'aktif gün' })}</span>
            <span>🔁 {s.totals.reviews} {l({ uz: 'takrorlash', tr: 'tekrar' })}</span><span>🎮 {s.totals.sessions} {l({ uz: 'sessiya', tr: 'oturum' })}</span>
            <span>🔥 {l({ uz: 'eng uzun', tr: 'en uzun' })}: {profile.best_streak}</span><span>⚔️ {s.totals.duels_won}/{s.totals.duels} {l({ uz: 'duel', tr: 'düello' })}</span>
          </div>
        </div>
      </section>
      </Reveal>

      <Reveal delay={80}>
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">{l({ uz: 'Faollik (oxirgi 17 hafta)', tr: 'Etkinlik (son 17 hafta)' })}</h2><span className="text-xs text-ink-400">{l({ uz: 'XP bo‘yicha', tr: 'XP’ye göre' })}</span></div>
        <Heatmap days={s.heatmap} tz={profile.tz} />
      </section>
      </Reveal>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">{l({ uz: 'So‘z boyligi', tr: 'Kelime hazinesi' })}</h2>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10">
            {[['mastered', 'bg-gold-400'], ['review', 'bg-teal-500'], ['learning', 'bg-ember-500'], ['new', 'bg-ink-500']].map(([k, c]) => (
              <div key={k} className={cn(c)} style={{ width: `${wordsTotal ? ((s.words[k as keyof typeof s.words] as number) / wordsTotal) * 100 : 0}%` }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-gold-400" />{l({ uz: 'Mukammal', tr: 'Mükemmel' })}: <b>{s.words.mastered}</b></div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-500" />{l({ uz: 'Takrorlashda', tr: 'Tekrarda' })}: <b>{s.words.review}</b></div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-ember-500" />{l({ uz: 'O‘rganilmoqda', tr: 'Öğreniliyor' })}: <b>{s.words.learning}</b></div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full bg-ink-500" />{l({ uz: 'Yangi', tr: 'Yeni' })}: <b>{s.words.new}</b></div>
          </div>
          <div className="mt-2 text-xs text-ink-400">{l({ uz: `Bazada ${s.words.total_words} so‘z · bugun navbatda ${s.words.due}`, tr: `Veri tabanında ${s.words.total_words} kelime · bugün sırada ${s.words.due}` })}</div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">{l({ uz: 'Ko‘nikmalar (aniqlik)', tr: 'Beceriler (doğruluk)' })}</h2>
          <div className="space-y-3">
            {skills && skills.map(({ k, v }) => (
              <div key={k.uz}><div className="mb-1 flex justify-between text-sm"><span>{l(k)}</span><span className="text-ink-300">{v.n ? `${v.pct}% · ${v.n}` : l({ uz: 'ma’lumot yo‘q', tr: 'veri yok' })}</span></div><Bar value={v.pct} color={v.pct >= 80 ? 'bg-teal-400' : v.pct >= 60 ? 'bg-gold-400' : 'bg-rose-500'} /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">{l({ uz: 'Qiziqishlar (rejimlar)', tr: 'İlgi alanları (modlar)' })}</h2>
          {totalPlays === 0 ? <p className="text-sm text-ink-400">{l({ uz: 'Hali o‘yin o‘ynalmagan.', tr: 'Henüz oyun oynanmadı.' })}</p> : (
            <div className="space-y-2">
              {MODES.map((m) => ({ m, n: interests[m.id] ?? 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map(({ m, n }) => (
                <div key={m.id} className="flex items-center gap-2 text-sm"><span className="w-6">{m.icon}</span><span className="w-28 truncate">{l(m.title)}</span><Bar value={(n / totalPlays) * 100} color="bg-fuchsia-500" className="flex-1" /><span className="w-10 text-right text-xs text-ink-300">{n}</span></div>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs text-ink-400">{l({ uz: 'Rejimlar bo‘yicha aniqlik', tr: 'Modlara göre doğruluk' })}: {Object.entries(s.modes).map(([m, v]) => `${m} ${Math.round((v.correct / Math.max(1, v.total)) * 100)}%`).join(' · ') || '—'}</div>
        </div>
        <div className="card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">{l({ uz: 'Eng ko‘p xato so‘zlar', tr: 'En çok hata yapılan kelimeler' })}</h2>
          {s.recent_errors.length === 0 ? <p className="text-sm text-ink-400">{l({ uz: 'Xatolar yo‘q — ajoyib!', tr: 'Hata yok — harika!' })}</p> : (
            <div className="space-y-1 text-sm">{s.recent_errors.map((e, i) => <div key={i} className="flex justify-between"><span className="text-white">{e.tr}</span><span className="text-ink-300">{e.uz}</span><span className="text-rose-300">×{e.lapses}</span></div>)}</div>
          )}
        </div>
      </section>

      {/* Umumiy reyting */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">🏆 {l({ uz: 'Umumiy reyting', tr: 'Genel sıralama' })}</h2>
          <Link href="/leaderboard?tab=all" className="text-xs text-ember-300">{t('full_table')}</Link>
        </div>
        {isLocal() ? <p className="text-sm text-ink-400">{l({ uz: 'Demo rejimda boshqa foydalanuvchilar yo‘q.', tr: 'Demo modunda başka kullanıcı yok.' })}</p> : (() => {
          const myIdx = top.findIndex((r) => r.id === profile.id);
          const list = top.slice(0, 7);
          const showMe = myIdx >= 7;
          const Row = ({ r, i }: { r: (typeof top)[number]; i: number }) => {
            const me = r.id === profile.id;
            return (
              <Link href={me ? '/profile' : `/u/${r.username}`} className={cn('flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]', me && 'bg-ember-500/10')}>
                <div className={cn('w-7 text-center font-display font-bold', i === 0 ? 'text-gold-400' : i === 1 ? 'text-ink-200' : i === 2 ? 'text-ember-300' : 'text-ink-400')}>{i + 1}</div>
                <div className="text-xl">{r.avatar}</div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{r.display_name ?? r.username}{me && ` (${t('you')})`}</div><div className="text-[11px] text-ink-400">Lvl {r.level} · 🔥{r.streak} · {leagueIcon(r.league)}</div></div>
                <div className="text-right"><div className="font-display font-bold text-ember-400">{r.weekly_xp}</div><div className="text-[10px] text-ink-400">{t('week_xp')}</div></div>
              </Link>
            );
          };
          return (
            <div className="space-y-0.5">
              {list.map((r, i) => <Row key={r.id} r={r} i={i} />)}
              {showMe && <><div className="py-1 text-center text-xs text-ink-500">···</div><Row r={top[myIdx]} i={myIdx} /></>}
              {top.length === 0 && <p className="text-sm text-ink-400">{l({ uz: 'Hali hech kim yo‘q.', tr: 'Henüz kimse yok.' })}</p>}
              <p className="pt-2 text-xs text-ink-400">{l({ uz: 'Nomni bosing — profil, do‘st qo‘shish, chat, klubga taklif.', tr: 'İsme basın — profil, arkadaş ekleme, sohbet, kulübe davet.' })}</p>
            </div>
          );
        })()}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-display text-lg font-bold">{l({ uz: 'Yutuqlar', tr: 'Başarılar' })} ({s.achievements.length})</h2>
        {s.achievements.length === 0 ? <p className="text-sm text-ink-400">{l({ uz: 'Birinchi yutuq — birinchi dars!', tr: 'İlk başarı — ilk ders!' })}</p> : (
          <div className="flex flex-wrap gap-2">{s.achievements.map((a) => <span key={a.code} className={cn('chip py-1.5 text-sm', a.rarity === 'legendary' && 'border-gold-400 text-gold-300', a.rarity === 'epic' && 'border-fuchsia-400 text-fuchsia-300', a.rarity === 'rare' && 'border-teal-400 text-teal-300')}>{a.icon} {a.title}</span>)}</div>
        )}
      </section>
    </div>
  );
}
