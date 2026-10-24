'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BookOpen, Gamepad2, BarChart3, User, Shield, Trophy, Bot, Users, Landmark } from 'lucide-react';
import type { Profile, AppSettings } from '@/lib/types';
import { fetchProfile, fetchSettings, isLocal, signOut } from '@/lib/data';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { ToastProvider } from './Toast';
import SceneBackground, { type Ambient } from './visual/SceneBackground';
import NotificationBell from './social/NotificationBell';

interface Ctx {
  profile: Profile | null;
  settings: AppSettings;
  refresh: () => Promise<void>;
  loading: boolean;
}
const ProfileCtx = createContext<Ctx>({ profile: null, settings: DEFAULT_SETTINGS, refresh: async () => {}, loading: true });
export const useProfile = () => useContext(ProfileCtx);

const NAV = [
  { href: '/dashboard', label: 'Bosh', icon: Home, tour: 'nav-home' },
  { href: '/learn', label: 'O‘rganish', icon: BookOpen, tour: 'nav-learn' },
  { href: '/play', label: 'O‘yinlar', icon: Gamepad2, tour: 'nav-play' },
  { href: '/friends', label: 'Do‘stlar', icon: Users, tour: 'nav-friends' },
  { href: '/stats', label: 'Statistika', icon: BarChart3, tour: 'nav-stats' },
];
const SIDE_EXTRA = [
  { href: '/leaderboard', label: 'Reyting', icon: Trophy },
  { href: '/club', label: 'Klub', icon: Landmark },
  { href: '/tutor', label: 'AI o‘qituvchi', icon: Bot },
  { href: '/profile', label: 'Profil', icon: User },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    const [p, s] = await Promise.all([fetchProfile(), fetchSettings()]);
    setProfile(p);
    setSettings(s);
    setLoading(false);
    if (!p && !isLocal()) router.replace('/login');
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  // Onboarding: birinchi kirishda ustaga yo'naltirish
  useEffect(() => {
    if (!loading && profile && !profile.onboarded && pathname !== '/onboarding') router.replace('/onboarding');
  }, [loading, profile, pathname, router]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const ctx = useMemo(() => ({ profile, settings, refresh, loading }), [profile, settings, refresh, loading]);
  const isAdmin = profile?.role === 'admin';
  const inSession = /\/learn\/\d+|\/play\/[a-z]+|\/exam|\/challenge\//.test(pathname) || pathname === '/onboarding';
  const ps = (profile?.settings ?? {}) as { ambient?: Ambient; scene?: string };
  const ambient: Ambient = ps.ambient ?? 'full';

  return (
    <ProfileCtx.Provider value={ctx}>
      <ToastProvider>
        <SceneBackground ambient={ambient} sceneId={ps.scene} dim={inSession ? 0.78 : 0.6} />
        <div className="mx-auto flex min-h-screen max-w-6xl">
          {/* Desktop sidebar */}
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/[0.06] bg-ink-950/40 p-4 backdrop-blur-sm md:flex">
            <div className="mb-6 flex items-center justify-between px-2">
              <Link href="/dashboard" className="flex items-center gap-2 font-display text-xl font-bold"><span className="text-2xl">🌉</span> Köprü</Link>
              {profile && <NotificationBell userId={profile.id} />}
            </div>
            <nav className="space-y-1">
              {[...NAV, ...SIDE_EXTRA].map((n) => (
                <Link key={n.href} href={n.href} data-tour={'tour' in n ? n.tour : undefined}
                  className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition', pathname.startsWith(n.href) ? 'bg-ember-500/15 text-ember-300' : 'text-ink-300 hover:bg-white/[0.05] hover:text-white')}>
                  <n.icon size={18} /> {n.label}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition', pathname.startsWith('/admin') ? 'bg-teal-500/15 text-teal-300' : 'text-ink-300 hover:bg-white/[0.05] hover:text-white')}>
                  <Shield size={18} /> Admin
                </Link>
              )}
            </nav>
            <div className="mt-auto space-y-2 px-2 text-xs text-ink-400">
              {profile && (
                <Link href="/profile" className="card-soft glass block p-3 transition hover:border-white/20">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{profile.avatar}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{profile.display_name ?? profile.username}</div>
                      <div>Lvl {profile.level} · {profile.xp} XP · 🔥{profile.streak}</div>
                    </div>
                  </div>
                </Link>
              )}
              {isLocal() ? <div className="rounded-xl bg-gold-400/10 px-3 py-2 text-gold-300">Demo rejim (localStorage)</div> : (
                <button className="btn-ghost w-full justify-start px-2 py-1" onClick={async () => { await signOut(); router.replace('/login'); router.refresh(); }}>Chiqish</button>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Mobile top bar */}
            {!inSession && (
              <header className={cn('sticky top-0 z-30 flex items-center justify-between px-4 py-3 transition-all md:hidden', scrolled ? 'glass border-b border-white/[0.08] shadow-card' : 'bg-transparent')}>
                <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold"><span>🌉</span> Köprü</Link>
                {profile && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="chip">🔥 {profile.streak}</span>
                    <span className="chip">⚡ {profile.xp}</span>
                    {isAdmin && <Link href="/admin" className="chip text-teal-300"><Shield size={12} /></Link>}
                    <NotificationBell userId={profile.id} />
                    <Link href="/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-lg">{profile.avatar}</Link>
                  </div>
                )}
              </header>
            )}
            <main className={cn('flex-1 px-4 py-5 sm:px-6', !inSession && 'pb-24 md:pb-8')}>{children}</main>
            {/* Mobile bottom tabs */}
            {!inSession && (
              <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/[0.06] glass px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
                {NAV.map((n) => {
                  const active = pathname.startsWith(n.href);
                  return (
                    <Link key={n.href} href={n.href} data-tour={n.tour + '-m'} className={cn('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition', active ? 'text-ember-400' : 'text-ink-400')}>
                      {active && <span className="absolute -top-px h-0.5 w-8 rounded-full bg-ember-400" />}
                      <n.icon size={20} /> {n.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      </ToastProvider>
    </ProfileCtx.Provider>
  );
}
