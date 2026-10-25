'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser, hasSupabaseEnv } from '@/lib/supabase/client';
import { LangProvider, LangSwitch, useLang } from '@/lib/i18n';
import ThemeBackground from '@/components/visual/ThemeBackground';
import { Logo, BRAND, AUTHOR } from '@/components/AppShell';
import { DEFAULT_THEME } from '@/lib/themes';

const AVATARS = ['🦉', '🦊', '🐺', '🦁', '🐯', '🐻', '🦅', '🐬', '🦋', '🌙'];

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { l, t } = useLang();
  const requestedNext = params.get('next') ?? '';
  const next = /^\/(?![\/\\])/.test(requestedNext) ? requestedNext : '/dashboard';
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🦉');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const local = !hasSupabaseEnv();

  useEffect(() => { if (local && params.get('demo')) router.replace('/dashboard'); }, [local, params, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setBusy(true);
    const sb = supabaseBrowser();
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next); router.refresh();
      } else if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username: username.trim().toLowerCase() || undefined, avatar }, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw error;
        if (data.session) { router.replace(next); router.refresh(); }
        else setMsg({ type: 'ok', text: l({ uz: 'Ro‘yxatdan o‘tdingiz! Emailingizga tasdiqlash havolasi yuborildi (Supabase’da "Confirm email" o‘chirilgan bo‘lsa — darhol kiring).', tr: 'Kayıt oldunuz! E-postanıza doğrulama bağlantısı gönderildi (Supabase’de "Confirm email" kapalıysa hemen giriş yapın).' }) });
      } else {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw error;
        setMsg({ type: 'ok', text: l({ uz: 'Sehrli havola emailingizga yuborildi.', tr: 'Sihirli bağlantı e-postanıza gönderildi.' }) });
      }
    } catch (err) { setMsg({ type: 'err', text: translateError(String((err as Error).message ?? err)) }); } finally { setBusy(false); }
  }

  function translateError(m: string) {
    if (/invalid login credentials/i.test(m)) return l({ uz: 'Email yoki parol noto‘g‘ri.', tr: 'E-posta veya şifre yanlış.' });
    if (/email not confirmed/i.test(m)) return l({ uz: 'Email tasdiqlanmagan. Pochtangizdagi havolani bosing.', tr: 'E-posta doğrulanmadı. Postanızdaki bağlantıya tıklayın.' });
    if (/already registered/i.test(m)) return l({ uz: 'Bu email allaqachon ro‘yxatdan o‘tgan.', tr: 'Bu e-posta zaten kayıtlı.' });
    if (/rate limit/i.test(m)) return l({ uz: 'Juda ko‘p urinish. Bir ozdan keyin qayta urinib ko‘ring.', tr: 'Çok fazla deneme. Biraz sonra tekrar deneyin.' });
    return m;
  }

  if (local) {
    return (
      <div className="card glass w-full max-w-md p-6 text-center">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="title mt-3">{l({ uz: 'Demo rejim', tr: 'Demo modu' })}</h1>
        <p className="subtitle mt-2">{l({ uz: 'Supabase hali ulanmagan. Progress brauzeringizda saqlanadi. To‘liq imkoniyatlar uchun README.md dagi qadamlarni bajaring.', tr: 'Supabase henüz bağlı değil. İlerleme tarayıcınızda saklanır. Tüm özellikler için README.md adımlarını izleyin.' })}</p>
        <button className="btn-primary mt-6 w-full" onClick={() => router.replace('/dashboard')}>{l({ uz: 'Demo sifatida kirish', tr: 'Demo olarak gir' })}</button>
      </div>
    );
  }

  return (
    <div className="card glass w-full max-w-md p-6">
      <div className="mb-5 text-center">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="title mt-2">{BRAND}</h1>
        <p className="subtitle">{l({ uz: 'Turk tili akademiyasi — o‘zbeklar uchun', tr: 'Türkçe akademisi — Özbekler için' })}</p>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-white/[0.04] p-1 text-sm">
        {(['signin', 'signup', 'magic'] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setMsg(null); }} className={`rounded-xl px-2 py-2 font-medium transition ${mode === m ? 'bg-ember-500 text-[#fff]' : 'text-ink-300 hover:text-white'}`}>
            {m === 'signin' ? t('login') : m === 'signup' ? l({ uz: 'Ro‘yxat', tr: 'Kayıt' }) : l({ uz: 'Havola', tr: 'Bağlantı' })}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <>
            <div><label className="label">{l({ uz: 'Foydalanuvchi nomi', tr: 'Kullanıcı adı' })}</label><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="valijon" autoComplete="username" /></div>
            <div><label className="label">Avatar</label><div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button type="button" key={a} onClick={() => setAvatar(a)} className={`h-10 w-10 rounded-xl text-xl transition ${avatar === a ? 'bg-ember-500/30 ring-2 ring-ember-400' : 'bg-white/5 hover:bg-white/10'}`}>{a}</button>)}</div></div>
          </>
        )}
        <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siz@email.com" autoComplete="email" /></div>
        {mode !== 'magic' && <div><label className="label">{l({ uz: 'Parol', tr: 'Şifre' })}</label><input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={l({ uz: 'kamida 6 belgi', tr: 'en az 6 karakter' })} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></div>}
        {msg && <div className={`rounded-2xl px-4 py-3 text-sm ${msg.type === 'ok' ? 'bg-teal-500/15 text-teal-300' : 'bg-rose-500/15 text-rose-300'}`}>{msg.text}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? '...' : mode === 'signin' ? t('login') : mode === 'signup' ? l({ uz: 'Ro‘yxatdan o‘tish', tr: 'Kayıt ol' }) : l({ uz: 'Havola yuborish', tr: 'Bağlantı gönder' })}</button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-400">{l({ uz: 'Birinchi ro‘yxatdan o‘tgan foydalanuvchi avtomatik admin bo‘ladi.', tr: 'İlk kayıt olan kullanıcı otomatik yönetici olur.' })} <Link href="/" className="underline">{l({ uz: 'Bosh sahifa', tr: 'Ana sayfa' })}</Link></p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LangProvider>
      <main className="relative flex min-h-screen flex-col items-center justify-center p-5">
        <ThemeBackground themeId={typeof document !== 'undefined' ? document.documentElement.dataset.theme ?? DEFAULT_THEME : DEFAULT_THEME} />
        <div className="absolute right-4 top-4"><LangSwitch /></div>
        <Suspense fallback={null}><LoginInner /></Suspense>
        <div className="mt-6 text-[10px] text-ink-500">{AUTHOR}</div>
      </main>
    </LangProvider>
  );
}
