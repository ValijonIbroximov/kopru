'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/components/AppShell';
import { Empty, Skeleton } from '@/components/ui';
import { isLocal } from '@/lib/data';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin', label: 'Umumiy' },
  { href: '/admin/users', label: 'Foydalanuvchilar' },
  { href: '/admin/content', label: 'Kontent' },
  { href: '/admin/ai', label: 'AI' },
  { href: '/admin/settings', label: 'Sozlamalar' },
  { href: '/admin/logs', label: 'Loglar' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile();
  const pathname = usePathname();
  if (loading) return <Skeleton className="h-40" />;
  if (isLocal()) return <Empty icon="🛠️" title="Admin panel Supabase talab qiladi" body="Demo rejimda ma’lumotlar bazasi yo‘q. README.md → Supabase ulang; birinchi ro‘yxatdan o‘tgan foydalanuvchi admin bo‘ladi." />;
  if (profile?.role !== 'admin') return <Empty icon="🔒" title="Ruxsat yo‘q" body="Bu sahifa faqat adminlar uchun." />;
  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((t) => <Link key={t.href} href={t.href} className={cn('shrink-0 rounded-full px-3 py-1.5 text-sm', (t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href)) ? 'bg-teal-500/20 text-teal-300' : 'text-ink-400 hover:text-white')}>{t.label}</Link>)}
      </div>
      {children}
    </div>
  );
}
