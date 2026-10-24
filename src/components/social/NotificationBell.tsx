'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { fetchNotifications, markNotificationsRead, subscribeNotifications, type Notification } from '@/lib/social';
import { useToast } from '@/components/Toast';
import { useLang, type Lang } from '@/lib/i18n';
import { isLocal } from '@/lib/data';
import { cn } from '@/lib/utils';

export function describeNotification(n: Notification, lang: Lang = 'uz'): { icon: string; text: string; href: string } {
  const who = n.actor?.display_name ?? n.actor?.username ?? (lang === 'tr' ? 'Biri' : 'Kimdir');
  const p = n.payload as Record<string, string | number | null>;
  const tr = lang === 'tr';
  switch (n.kind) {
    case 'friend_request': return { icon: '📨', text: tr ? `${who} sizi arkadaş olarak eklemek istiyor` : `${who} sizni do‘st qilib qo‘shmoqchi`, href: '/friends?tab=requests' };
    case 'friend_accept': return { icon: '🤝', text: tr ? `${who} arkadaşlık isteğini kabul etti` : `${who} do‘stlik so‘rovini qabul qildi`, href: '/friends' };
    case 'nudge': return { icon: '👋', text: `${who}: ${p.text ?? 'Hadi!'}`, href: '/dashboard' };
    case 'challenge': return { icon: '⚔️', text: tr ? `${who} size meydan okudu${p.score !== undefined ? ` (${p.score} puan)` : ''}` : `${who} sizni chaqirdi${p.score !== undefined ? ` (${p.score} ball)` : ''}`, href: `/challenge/${p.id}` };
    case 'challenge_result': return { icon: '🏁', text: tr ? `Meydan okuma bitti: ${p.a} : ${p.b}` : `Chaqiriq yakunlandi: ${p.a} : ${p.b}`, href: `/challenge/${p.id}` };
    case 'reaction': return { icon: String(p.emoji ?? '👏'), text: tr ? `${who} etkinliğinize ${p.emoji} bıraktı` : `${who} faolligingizga ${p.emoji} qo‘ydi`, href: '/friends?tab=feed' };
    case 'message': return { icon: '💬', text: `${who}: ${p.text ?? (tr ? 'mesaj' : 'xabar')}`, href: '/friends' };
    case 'club_join': return { icon: '🏛️', text: tr ? `${who} "${p.club}" kulübünüze katıldı` : `${who} "${p.club}" klubingizga qo‘shildi`, href: '/club' };
    case 'club_invite': return { icon: String(p.emoji ?? '🏛️'), text: tr ? `${who} sizi "${p.club}" kulübüne davet etti` : `${who} sizni "${p.club}" klubiga taklif qildi`, href: `/club?code=${p.code ?? ''}` };
    default: return { icon: '🔔', text: n.kind, href: '/dashboard' };
  }
}

interface NotifCtx { items: Notification[]; unread: number; markRead: () => Promise<void> }
const Ctx = createContext<NotifCtx>({ items: [], unread: 0, markRead: async () => {} });

/** BITTA realtime obuna — butun ilova uchun (AppShell ichida). Bell komponentlari faqat o'qiydi. */
export function NotificationsProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const { push } = useToast();
  const { lang } = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (!userId || isLocal()) return;
    let alive = true;
    fetchNotifications().then((l) => { if (alive) setItems(l); }).catch(() => {});
    const off = subscribeNotifications(userId, async (n) => {
      try {
        const list = await fetchNotifications();
        if (!alive) return;
        setItems(list);
        const full = list.find((x) => x.id === n.id) ?? n;
        const d = describeNotification(full, langRef.current);
        push({ kind: 'info', icon: d.icon, title: d.text });
      } catch { /* noop */ }
    });
    return () => { alive = false; off(); };
  }, [userId, push]);

  const markRead = useCallback(async () => {
    if (!items.some((n) => !n.read)) return;
    await markNotificationsRead().catch(() => {});
    setTimeout(() => setItems((s) => s.map((n) => ({ ...n, read: true }))), 1500);
  }, [items]);

  return <Ctx.Provider value={{ items, unread: items.filter((n) => !n.read).length, markRead }}>{children}</Ctx.Provider>;
}

export default function NotificationBell({ className }: { className?: string }) {
  const { items, unread, markRead } = useContext(Ctx);
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  if (isLocal()) return null;
  return (
    <div ref={ref} className={cn('relative', className)}>
      <button onClick={() => { const n = !open; setOpen(n); if (n) markRead(); }} className="relative grid h-9 w-9 place-items-center rounded-xl text-ink-300 hover:bg-white/5 hover:text-white" aria-label={t('notifications')}>
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-[#fff] animate-pop">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] animate-pop rounded-2xl border border-white/10 bg-ink-900 p-2 shadow-card">
          <div className="flex items-center justify-between px-2 py-1 text-xs text-ink-400"><span>{t('notifications')}</span><span>{items.length}</span></div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <div className="p-4 text-center text-sm text-ink-400">{t('no_notifications')}</div>}
            {items.map((n) => { const d = describeNotification(n, lang); return (
              <Link key={n.id} href={d.href} onClick={() => setOpen(false)} className={cn('flex items-start gap-2 rounded-xl p-2 text-sm hover:bg-white/5', !n.read && 'bg-ember-500/10')}>
                <span className="text-lg">{d.icon}</span>
                <div className="min-w-0 flex-1"><div className="text-ink-100">{d.text}</div><div className="text-[10px] text-ink-500">{new Date(n.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div></div>
              </Link>
            ); })}
          </div>
        </div>
      )}
    </div>
  );
}
