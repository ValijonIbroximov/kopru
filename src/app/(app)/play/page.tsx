'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MODES, MODE_CATEGORIES } from '@/lib/motivation';
import { useProfile } from '@/components/AppShell';
import { PageHeader } from '@/components/ui';
import Reveal from '@/components/visual/Reveal';
import Tip from '@/components/Tip';
import { fetchHighScores, dailyKey, GAME_LABELS, type HighScore } from '@/lib/social';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function PlayHub() {
  const { settings, profile } = useProfile();
  const { t, l } = useLang();
  const [daily, setDaily] = useState<HighScore[]>([]);
  const [filter, setFilter] = useState<string>('all');
  useEffect(() => { fetchHighScores(dailyKey(), 3).then(setDaily); }, []);
  const interests = profile?.interests ?? {};
  const total = Object.values(interests).reduce((a, b) => a + b, 0);
  const dayNum = Math.floor(Date.now() / 86400000);
  const featured = MODES.filter((m) => m.category === 'arcade' || m.category === 'brain');
  const todays = featured[dayNum % featured.length];

  return (
    <div>
      <PageHeader title={l({ uz: 'O‘yin rejimlari', tr: 'Oyun modları' })} sub={l({ uz: `${MODES.length} ta rejim · har kuni boshqasi — miya yangilikni yaxshi ko‘radi. Har o‘yin 2–8 daqiqa.`, tr: `${MODES.length} mod · her gün farklı biri — beyin yeniliği sever. Her oyun 2–8 dakika.` })} />
      <Tip id="play-intro" text={{ uz: 'Har o‘yinning birinchi kirishida qisqa «Qanday o‘ynaladi» chiqadi (2–4 qadam). Keyin «?» tugmasi bilan qaytarish mumkin. Rekordli o‘yinlar (⚡🌧️🗼🎱🃏🔡🌉) reytingda ko‘rinadi.', tr: 'Her oyuna ilk girişte kısa «Nasıl oynanır» çıkar (2–4 adım). Sonra «?» ile tekrar açılabilir. Rekorlu oyunlar (⚡🌧️🗼🎱🃏🔡🌉) sıralamada görünür.' }} />

      {/* Kun o'yini + kunlik blitz */}
      <Reveal>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <Link href={todays.href} className={cn('card tilt relative overflow-hidden bg-gradient-to-br p-5', todays.color)}>
            <div className="absolute -right-6 -top-6 text-[110px] opacity-10">{todays.icon}</div>
            <div className="chip mb-2 border-gold-400/40 text-gold-300">⭐ {l({ uz: 'Kun o‘yini', tr: 'Günün oyunu' })}</div>
            <div className="font-display text-2xl font-bold">{todays.icon} {l(todays.title)}</div>
            <div className="mt-1 text-sm text-ink-200">{l(todays.desc)}</div>
            <div className="mt-3 text-xs text-white">{l({ uz: 'Bugun o‘ynang → +50% XP bonus', tr: 'Bugün oynayın → +%50 XP bonus' })}</div>
          </Link>
          <Link href="/play/blitz?daily=1" className="card tilt relative overflow-hidden bg-gradient-to-br from-yellow-400/25 to-yellow-400/5 p-5">
            <div className="absolute -right-6 -top-6 text-[110px] opacity-10">📅</div>
            <div className="chip mb-2">📅 {l({ uz: 'Kunlik chaqiriq', tr: 'Günlük meydan okuma' })}</div>
            <div className="font-display text-2xl font-bold">⚡ {l({ uz: 'Blitz — hamma uchun bir xil', tr: 'Blitz — herkes için aynı' })}</div>
            <div className="mt-1 text-sm text-ink-200">{l({ uz: '40 savol, 60 soniya. Kim ko‘proq?', tr: '40 soru, 60 saniye. Kim daha çok?' })}</div>
            <div className="mt-3 flex flex-wrap gap-1 text-xs">{daily.length ? daily.map((h, i) => <span key={h.user_id} className={cn('chip', h.user_id === profile?.id && 'border-gold-400 text-gold-300')}>{['🥇', '🥈', '🥉'][i]} {h.profile?.display_name ?? h.profile?.username} {h.score}</span>) : <span className="text-gold-300">{l({ uz: 'Birinchi bo‘ling!', tr: 'İlk siz olun!' })}</span>}</div>
          </Link>
        </div>
      </Reveal>

      <div className="mb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
        <button onClick={() => setFilter('all')} className={cn('chip shrink-0 py-1.5', filter === 'all' && 'border-white/40 bg-white/10 text-white')}>{t('all')}</button>
        {MODE_CATEGORIES.map((c) => <button key={c.id} onClick={() => setFilter(c.id)} className={cn('chip shrink-0 py-1.5', filter === c.id && 'border-white/40 bg-white/10 text-white')}>{l(c.title)}</button>)}
      </div>

      {MODE_CATEGORIES.filter((c) => filter === 'all' || filter === c.id).map((cat) => {
        const list = MODES.filter((m) => m.category === cat.id && settings.features[m.id] !== false);
        if (!list.length) return null;
        return (
          <section key={cat.id} className="mb-6">
            <div className="mb-2"><h2 className="font-display text-lg font-bold">{l(cat.title)}</h2><div className="text-xs text-ink-400">{l(cat.desc)}</div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m, i) => {
                const plays = interests[m.id] ?? 0;
                const share = total ? Math.round((plays / total) * 100) : 0;
                const hs = GAME_LABELS[m.id];
                return (
                  <Reveal key={m.id} delay={i * 40}>
                    <Link href={m.href} className={cn('card tilt relative block overflow-hidden bg-gradient-to-br p-4', m.color)}>
                      <div className="flex items-start justify-between">
                        <span className="text-3xl">{m.icon}</span>
                        <div className="flex gap-1">{m.isNew && !plays && <span className="chip border-ember-400/50 text-ember-300">{l({ uz: 'yangi', tr: 'yeni' })}</span>}<span className="chip">~{m.minutes} {t('minutes')}</span></div>
                      </div>
                      <div className="mt-2 font-display text-lg font-bold">{l(m.title)}</div>
                      <div className="text-xs text-ink-300">{l(m.desc)}</div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-400">
                        <span>{m.skill === 'all' ? l({ uz: 'barcha ko‘nikmalar', tr: 'tüm beceriler' }) : m.skill}{hs ? ` · 🏆 ${l({ uz: 'rekordli', tr: 'rekorlu' })}` : ''}</span>
                        <span>{plays ? `${plays} ${l({ uz: 'marta', tr: 'kez' })} · ${share}%` : l({ uz: 'hali sinalmagan ✨', tr: 'henüz denenmedi ✨' })}</span>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
