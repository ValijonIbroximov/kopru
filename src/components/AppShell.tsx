'use client';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BookOpen, Gamepad2, BarChart3, User, Shield, Trophy, Bot, Users, Landmark, CalendarCheck } from 'lucide-react';
import type { Profile, AppSettings } from '@/lib/types';
import { fetchProfile, fetchSettings, isLocal, signOut, updateProfile } from '@/lib/data';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { ToastProvider } from './Toast';
import ThemeBackground from './visual/ThemeBackground';
import NotificationBell, { NotificationsProvider } from './social/NotificationBell';
import { LangProvider, useLang, LangSwitch, type Lang } from '@/lib/i18n';
import { applyTheme, currentThemeId, currentAmbient, DEFAULT_THEME, type Ambient } from '@/lib/themes';
import { stopSpeech, setVoicePref, type VoicePref } from '@/lib/speech';

export const BRAND = 'TezBil';
export const AUTHOR = '© VALIJON IBROXIMOV';

interface Ctx { profile: Profile | null; settings: AppSettings; refresh: () => Promise<void>; loading: boolean }
const ProfileCtx = createContext<Ctx>({ profile: null, settings: DEFAULT_SETTINGS, refresh: async () => {}, loading: true });
export const useProfile = () => useContext(ProfileCtx);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const router = useRouter();

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      const [p, s] = await Promise.all([fetchProfile(), fetchSettings()]);
      setProfile(p); setSettings(s);
      if (!p && !isLocal()) router.replace('/login');
    } catch { setLoadError(true); } finally { setLoading(false); }
  }, [router]);
  useEffect(() => { refresh(); }, [refresh]);

  // Jonli mavzu / fon holati: profil sozlamalaridan yoki jonli oldindan ko'rishdan (onboarding, profil)
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME);
  const [ambient, setAmbient] = useState<Ambient>('lite');
  useEffect(() => {
    setThemeId(currentThemeId());
    setAmbient(currentAmbient());
    const onTheme = (e: Event) => setThemeId((e as CustomEvent<string>).detail);
    const onAmb = (e: Event) => setAmbient((e as CustomEvent<Ambient>).detail);
    // CSS uchun (shisha effekti faqat jonli fonda)
    const sync = () => { try { document.documentElement.dataset.ambient = currentAmbient(); } catch { /* noop */ } };
    sync();
    window.addEventListener('tezbil:theme', onTheme); window.addEventListener('tezbil:ambient', onAmb);
    return () => { window.removeEventListener('tezbil:theme', onTheme); window.removeEventListener('tezbil:ambient', onAmb); };
  }, []);

  // profil sozlamalari → mavzu, fon, ovoz (lokal saqlovga sinxron).
  // Faqat qiymat O'ZGARGANDA qo'llanadi — aks holda profil yangilanishi (masalan, til almashishi) jonli oldindan ko'rishni bekor qilib yuborardi.
  const applied = useRef<{ theme?: string; ambient?: Ambient; voice?: VoicePref }>({});
  useEffect(() => {
    const ps = (profile?.settings ?? {}) as { theme?: string; lang?: Lang; voice?: VoicePref; ambient?: Ambient };
    if (ps.theme && ps.theme !== applied.current.theme) { applied.current.theme = ps.theme; applyTheme(ps.theme); }
    if (ps.ambient && ps.ambient !== applied.current.ambient) { applied.current.ambient = ps.ambient; setAmbient(ps.ambient); }
    if (ps.voice && ps.voice !== applied.current.voice) { applied.current.voice = ps.voice; setVoicePref(ps.voice); }
  }, [profile]);

  useEffect(() => { try { document.documentElement.dataset.ambient = ambient; } catch { /* noop */ } }, [ambient]);

  const ctx = useMemo(() => ({ profile, settings, refresh, loading }), [profile, settings, refresh, loading]);
  const ps = (profile?.settings ?? {}) as { lang?: Lang };
  // Til almashtirilsa — profil sozlamasiga ham yoziladi (boshqa qurilmalarda ham shu til)
  const onLang = useCallback((l: Lang) => {
    if (!profile || (profile.settings as { lang?: Lang })?.lang === l) return;
    updateProfile({ settings: { ...(profile.settings ?? {}), lang: l } }).then(() => setProfile((p) => (p ? { ...p, settings: { ...(p.settings ?? {}), lang: l } } : p))).catch(() => {});
  }, [profile]);

  return (
    <ProfileCtx.Provider value={ctx}>
      <LangProvider initial={ps.lang} onChange={onLang}>
        <ToastProvider>
          <NotificationsProvider userId={profile?.id ?? null}>
            <Shell profile={profile} loading={loading} themeId={themeId} ambient={ambient}>{loadError ? <div role="alert" className="card p-6">Ma’lumot yuklanmadi.<button className="btn-secondary mt-3" onClick={() => refresh()}>Qayta urinish</button></div> : children}</Shell>
          </NotificationsProvider>
        </ToastProvider>
      </LangProvider>
    </ProfileCtx.Provider>
  );
}

function Shell({ children, profile, loading, themeId, ambient }: { children: React.ReactNode; profile: Profile | null; loading: boolean; themeId: string; ambient: Ambient }) {
  const pathname = usePathname();
  useEffect(() => { stopSpeech(); }, [pathname]);
  const router = useRouter();
  const { t, l } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!loading && profile && !profile.onboarded && pathname !== '/onboarding') router.replace('/onboarding');
  }, [loading, profile, pathname, router]);
  useEffect(() => { const on = () => setScrolled(window.scrollY > 8); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);

  const NAV = [
    { href: '/dashboard', label: t('home'), icon: Home, tour: 'nav-home' },
    { href: '/learn', label: t('learn'), icon: BookOpen, tour: 'nav-learn' },
    { href: '/play', label: t('games'), icon: Gamepad2, tour: 'nav-play' },
    { href: '/friends', label: t('friends'), icon: Users, tour: 'nav-friends' },
    { href: '/stats', label: t('stats'), icon: BarChart3, tour: 'nav-stats' },
  ];
  const SIDE_EXTRA = [
    { href: '/vocabulary', label: l({ uz: 'Mening lug‘atim', tr: 'Kelimelerim' }), icon: BookOpen },
    { href: '/coach', label: 'Shaxsiy murabbiy', icon: BookOpen },
    { href: '/plan', label: t('plan'), icon: CalendarCheck },
    { href: '/leaderboard', label: t('leaderboard'), icon: Trophy },
    { href: '/club', label: t('club'), icon: Landmark },
    { href: '/tutor', label: t('tutor'), icon: Bot },
    { href: '/profile', label: t('profile'), icon: User },
  ];
  const isAdmin = profile?.role === 'admin';
  const inSession = /\/learn\/\d+|\/play\/[a-z]+|\/exam|\/challenge\//.test(pathname) || pathname === '/onboarding';

  return (
    <>
      <a href="#main-content" className="skip-link">Asosiy mazmunga o‘tish</a>
      <ThemeBackground themeId={themeId} ambient={inSession ? 'lite' : ambient} />
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/[0.06] bg-ink-950/50 p-4 backdrop-blur-sm md:flex">
          <div className="mb-5 flex items-center justify-between px-2">
            <Link href="/dashboard" aria-label="Bosh sahifa" className="flex items-center gap-2 font-display text-xl font-bold"><Logo /> {BRAND}</Link>
            {profile && <NotificationBell />}
          </div>
          <nav className="space-y-1">
            {[...NAV, ...SIDE_EXTRA].map((n) => (
              <Link key={n.href} href={n.href} data-tour={'tour' in n ? n.tour : undefined}
                className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition', pathname.startsWith(n.href) ? 'bg-accent/15 text-ember-300' : 'text-ink-300 hover:bg-white/[0.05] hover:text-white')}>
                <n.icon size={18} /> {n.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition', pathname.startsWith('/admin') ? 'bg-teal-500/15 text-teal-300' : 'text-ink-300 hover:bg-white/[0.05] hover:text-white')}>
                <Shield size={18} /> {t('admin')}
              </Link>
            )}
          </nav>
          <div className="mt-auto space-y-2 px-2 text-xs text-ink-400">
            <LangSwitch />
            {profile && (
              <Link href="/profile" className="card-soft glass block p-3 transition hover:border-white/20">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{profile.avatar}</span>
                  <div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{profile.display_name ?? profile.username}</div><div>Lvl {profile.level} · {profile.xp} XP · 🔥{profile.streak}</div></div>
                </div>
              </Link>
            )}
            {isLocal() ? <div className="rounded-xl bg-gold-400/10 px-3 py-2 text-gold-300">{t('demo_mode')}</div> : (
              <button className="btn-ghost w-full justify-start px-2 py-1" onClick={async () => { await signOut(); router.replace('/login'); router.refresh(); }}>{t('logout')}</button>
            )}
            <div className="px-1 text-[10px] text-ink-500">{AUTHOR}</div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {!inSession && (
            <header className={cn('sticky top-0 z-30 flex items-center justify-between px-4 py-3 transition-all md:hidden', scrolled ? 'glass border-b border-white/[0.08] shadow-card' : 'bg-transparent')}>
              <Link href="/dashboard" aria-label="Bosh sahifa" className="flex items-center gap-2 font-display text-lg font-bold"><Logo small /> {BRAND}</Link>
              {profile && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="chip">🔥 {profile.streak}</span>
                  <span className="chip">⚡ {profile.xp}</span>
                  {isAdmin && <Link href="/admin" className="chip text-teal-300"><Shield size={12} /></Link>}
                  <NotificationBell />
                  <Link href="/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-lg">{profile.avatar}</Link>
                </div>
              )}
            </header>
          )}
          <main id="main-content" className={cn('flex-1 px-4 py-5 sm:px-6', !inSession && 'pb-24 md:pb-8')}>{children}</main>
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
    </>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  // Gradient id har nusxada noyob: bir xil id yashirin (display:none) SVG ichida bo'lsa, ko'rinadigan logoda chaqmoq chizilmay qolardi
  const gid = `tbg-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 128 128" className={small ? 'h-6 w-6' : 'h-7 w-7'} aria-hidden>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffcf4d" /><stop offset=".55" stopColor="#ff8f4d" /><stop offset="1" stopColor="#f43f6e" /></linearGradient></defs>
      <rect width="128" height="128" rx="30" fill="#0d1427" />
      <path d="M70 14 L34 70 L60 70 L52 114 L94 52 L68 52 Z" fill={`url(#${gid})`} />
      <path d="M18 100 Q64 72 110 100" stroke="#2fd1bc" strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
