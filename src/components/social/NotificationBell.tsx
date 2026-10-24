'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { fetchNotifications, markNotificationsRead, subscribeNotifications, type Notification } from '@/lib/social';
import { useToast } from '@/components/Toast';
import { isLocal } from '@/lib/data';
import { cn } from '@/lib/utils';

export function describeNotification(n: Notification): { icon: string; text: string; href: string } {
  const who = n.actor?.display_name ?? n.actor?.username ?? 'Kimdir';
  const p = n.payload as Record<string, string | number | null>;
  switch (n.kind) {
    case 'friend_request': return { icon: '📨', text: `${who} sizni do‘st qilib qo‘shmoqchi`, href: '/friends?tab=requests' };
    case 'friend_accept': return { icon: '🤝', text: `${who} do‘stlik so‘rovini qabul qildi`, href: '/friends' };
    case 'nudge': return { icon: '👋', text: `${who}: ${p.text ?? 'Hadi!'}`, href: '/dashboard' };
    case 'challenge': return { icon: '⚔️', text: `${who} sizni chaqirdi${p.score !== undefined ? ` (${p.score} ball)` : ''}`, href: `/challenge/${p.id}` };
    case 'challenge_result': return { icon: '🏁', text: `Chaqiriq yakunlandi: ${p.a} : ${p.b}`, href: `/challenge/${p.id}` };
    case 'reaction': return { icon: String(p.emoji ?? '👏'), text: `${who} faolligingizga ${p.emoji} qo‘ydi`, href: '/friends?tab=feed' };
    case 'message': return { icon: '💬', text: `${who}: ${p.text ?? 'xabar'}`, href: '/friends' };
    case 'club_join': return { icon: '🏛️', text: `${who} "${p.club}" klubingizga qo‘shildi`, href: '/club' };
    default: return { icon: '🔔', text: n.kind, href: '/dashboard' };
  }
}

export default function NotificationBell({ userId, className }: { userId: string; className?: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const { push } = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (isLocal()) return;
    fetchNotifications().then(setItems);
    const off = subscribeNotifications(userId, async (n) => {
      const list = await fetchNotifications();
      setItems(list);
      const full = list.find((x) => x.id === n.id) ?? n;
      const d = describeNotification(full);
      push({ kind: 'info', icon: d.icon, title: d.text });
    });
    return off;
  }, [userId, push]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  async function toggle() {
    const next = !open; setOpen(next);
    if (next && unread) { await markNotificationsRead(); setTimeout(() => setItems((s) => s.map((n) => ({ ...n, read: true }))), 1500); }
  }

  if (isLocal()) return null;
  return (
    <div ref={ref} className={cn('relative', className)}>
      <button onClick={toggle} className="relative grid h-9 w-9 place-items-center rounded-xl text-ink-300 hover:bg-white/5 hover:text-white" aria-label="Bildirishnomalar">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white animate-pop">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] animate-pop rounded-2xl border border-white/10 bg-ink-900 p-2 shadow-card">
          <div className="flex items-center justify-between px-2 py-1 text-xs text-ink-400"><span>Bildirishnomalar</span><span>{items.length}</span></div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <div className="p-4 text-center text-sm text-ink-400">Hali bildirishnoma yo‘q</div>}
            {items.map((n) => { const d = describeNotification(n); return (
              <Link key={n.id} href={d.href} onClick={() => setOpen(false)} className={cn('flex items-start gap-2 rounded-xl p-2 text-sm hover:bg-white/5', !n.read && 'bg-ember-500/10')}>
                <span className="text-lg">{d.icon}</span>
                <div className="min-w-0 flex-1"><div className="text-ink-100">{d.text}</div><div className="text-[10px] text-ink-500">{new Date(n.created_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div></div>
              </Link>
            ); })}
          </div>
        </div>
      )}
    </div>
  );
}
