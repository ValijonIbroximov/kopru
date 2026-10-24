'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchFeed, react, type Activity } from '@/lib/social';
import { GAME_LABELS_L } from '@/lib/social';
import { useProfile } from '@/components/AppShell';
import { Skeleton } from '@/components/ui';
import { useLang, type L } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const EMOJIS = ['👏', '🔥', '💪', '😍', '🎉'];

/** Faollik matni — ikki tilli (`l(d.text)` bilan ko'rsating). */
export function describeActivity(a: Activity): { icon: string; text: L } {
  const p = a.payload as Record<string, string | number>;
  switch (a.kind) {
    case 'lesson': return { icon: p.kind === 'boss' ? '👑' : '📘', text: { uz: `"${p.title}" darsini yakunladi (${p.score}%, ${'★'.repeat(Number(p.stars) || 0)})`, tr: `"${p.title}" dersini tamamladı (%${p.score}, ${'★'.repeat(Number(p.stars) || 0)})` } };
    case 'achievement': return { icon: String(p.icon ?? '🏅'), text: { uz: `"${p.title}" yutug‘ini oldi`, tr: `"${p.title}" başarısını kazandı` } };
    case 'duel_win': return { icon: '⚔️', text: { uz: `duelda g‘alaba qozondi (${p.host}:${p.guest})`, tr: `düelloda galip geldi (${p.host}:${p.guest})` } };
    case 'challenge_win': return { icon: '🥊', text: { uz: `chaqiriqda g‘alaba qozondi (${p.score} ball)`, tr: `meydan okumada galip geldi (${p.score} puan)` } };
    case 'streak': return { icon: '🔥', text: { uz: `${p.days} kunlik streakga yetdi!`, tr: `${p.days} günlük seriye ulaştı!` } };
    case 'level': return { icon: '🆙', text: { uz: `${p.level}-darajaga ko‘tarildi`, tr: `${p.level}. seviyeye yükseldi` } };
    case 'high_score': { const g = GAME_LABELS_L[String(p.game)] ?? { title: { uz: String(p.game), tr: String(p.game) }, icon: '🏅' }; return { icon: g.icon, text: { uz: `${g.title.uz} o‘yinida yangi rekord: ${p.score}`, tr: `${g.title.tr} oyununda yeni rekor: ${p.score}` } }; }
    case 'club_join': return { icon: String(p.emoji ?? '🏛️'), text: { uz: `"${p.club}" klubiga qo‘shildi`, tr: `"${p.club}" kulübüne katıldı` } };
    default: return { icon: '✨', text: a.kind };
  }
}

function ago(iso: string): L {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return { uz: 'hozir', tr: 'şimdi' };
  if (d < 3600) return { uz: `${Math.floor(d / 60)} daq`, tr: `${Math.floor(d / 60)} dk` };
  if (d < 86400) return { uz: `${Math.floor(d / 3600)} soat`, tr: `${Math.floor(d / 3600)} sa` };
  return { uz: `${Math.floor(d / 86400)} kun`, tr: `${Math.floor(d / 86400)} gün` };
}

export default function Feed({ limit = 40, compact = false }: { limit?: number; compact?: boolean }) {
  const { profile } = useProfile();
  const { l } = useLang();
  const [items, setItems] = useState<Activity[] | null>(null);
  useEffect(() => { fetchFeed(limit).then(setItems); }, [limit]);

  async function toggle(a: Activity, e: string) {
    const next = a.my_reaction === e ? null : e;
    setItems((list) => (list ?? []).map((x) => {
      if (x.id !== a.id) return x;
      const r = { ...x.reactions };
      if (x.my_reaction) r[x.my_reaction] = Math.max(0, (r[x.my_reaction] ?? 1) - 1);
      if (next) r[next] = (r[next] ?? 0) + 1;
      return { ...x, reactions: r, my_reaction: next };
    }));
    await react(a.id, next, a.user_id);
  }

  if (!items) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!items.length) return <div className="card p-6 text-center text-sm text-ink-300"><div className="text-3xl">🌱</div><p className="mt-2">{l({ uz: 'Lenta bo‘sh. Do‘st qo‘shing yoki klubga kiring — ularning yutuqlari shu yerda ko‘rinadi, siznikilar ularda.', tr: 'Akış boş. Arkadaş ekleyin ya da bir kulübe katılın — onların başarıları burada görünür, sizinkiler onlarda.' })}</p><Link href="/friends?tab=search" className="btn-secondary mt-3">{l({ uz: 'Do‘st qidirish', tr: 'Arkadaş ara' })}</Link></div>;
  return (
    <div className="space-y-2">
      {items.slice(0, compact ? 5 : undefined).map((a) => {
        const d = describeActivity(a);
        const me = a.user_id === profile?.id;
        return (
          <div key={a.id} className="card-soft p-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-xl">{d.icon}</div>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-semibold text-white">{a.avatar} {me ? l({ uz: 'Siz', tr: 'Siz' }) : (a.display_name ?? a.username)}</span> <span className="text-ink-200">{l(d.text)}</span>
                <div className="mt-1 flex items-center gap-1">
                  {EMOJIS.map((e) => {
                    const n = a.reactions?.[e] ?? 0;
                    if (!n && compact && e !== '👏' && e !== '🔥') return null;
                    return <button key={e} onClick={() => toggle(a, e)} className={cn('rounded-full border px-2 py-0.5 text-xs transition', a.my_reaction === e ? 'border-ember-400 bg-ember-500/20' : 'border-white/10 hover:bg-white/5')}>{e}{n > 0 && <span className="ml-1 text-ink-300">{n}</span>}</button>;
                  })}
                  <span className="ml-auto text-[10px] text-ink-500">{l(ago(a.created_at))}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
