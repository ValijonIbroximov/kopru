'use client';
import Link from 'next/link';
import { MODES } from '@/lib/motivation';
import { useProfile } from '@/components/AppShell';
import { PageHeader } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function PlayHub() {
  const { settings, profile } = useProfile();
  const interests = profile?.interests ?? {};
  const total = Object.values(interests).reduce((a, b) => a + b, 0);
  return (
    <div>
      <PageHeader title="O‘yin rejimlari" sub="Har kuni boshqa rejim — miya yangilikni yaxshi ko‘radi. Har bir sessiya 4–8 daqiqa." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.filter((m) => settings.features[m.id] !== false).map((m) => {
          const plays = interests[m.id] ?? 0;
          const share = total ? Math.round((plays / total) * 100) : 0;
          return (
            <Link key={m.id} href={m.href} className={cn('card relative overflow-hidden bg-gradient-to-br p-4 transition hover:-translate-y-0.5 hover:border-white/20', m.color)}>
              <div className="flex items-start justify-between">
                <span className="text-3xl">{m.icon}</span>
                <span className="chip">~{m.minutes} daq</span>
              </div>
              <div className="mt-2 font-display text-lg font-bold">{m.title}</div>
              <div className="text-xs text-ink-300">{m.desc}</div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-400">
                <span>{m.skill === 'all' ? 'barcha ko‘nikmalar' : m.skill}</span>
                <span>{plays ? `${plays} marta · ${share}%` : 'hali sinalmagan ✨'}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
