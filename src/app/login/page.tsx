'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser, hasSupabaseEnv } from '@/lib/supabase/client';

const AVATARS = ['🦉', '🦊', '🐺', '🦁', '🐯', '🐻', '🦅', '🐬', '🦋', '🌙'];

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🦉');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const local = !hasSupabaseEnv();

  useEffect(() => {
    if (local && params.get('demo')) router.replace('/dashboard');
  }, [local, params, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const sb = supabaseBrowser();
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { username: username.trim().toLowerCase() || undefined, avatar }, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (data.session) { router.replace(next); router.refresh(); }
        else setMsg({ type: 'ok', text: 'Ro‘yxatdan o‘tdingiz! Emailingizga tasdiqlash havolasi yuborildi (yoki Supabase’da "Confirm email" o‘chirilgan bo‘lsa — darhol kiring).' });
      } else {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw error;
        setMsg({ type: 'ok', text: 'Sehrli havola emailingizga yuborildi. Pochtangizni tekshiring.' });
      }
    } catch (err) {
      setMsg({ type: 'err', text: translateError(String((err as Error).message ?? err)) });
    } finally {
      setBusy(false);
    }
  }

  if (local) {
    return (
      <div className="card w-full max-w-md p-6 text-center">
        <div className="text-5xl">🌉</div>
        <h1 className="title mt-3">Demo rejim</h1>
        <p className="subtitle mt-2">Supabase hali ulanmagan. Progress brauzeringizda (localStorage) saqlanadi. To‘liq imkoniyatlar (AI, duel, liderlar jadvali) uchun README.md dagi 5 qadamni bajaring.</p>
        <button className="btn-primary mt-6 w-full" onClick={() => router.replace('/dashboard')}>Demo sifatida kirish</button>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md p-6">
      <div className="mb-5 text-center">
        <div className="text-4xl">🌉</div>
        <h1 className="title mt-2">Köprü</h1>
        <p className="subtitle">Turk tili akademiyasi — o‘zbeklar uchun</p>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-white/[0.04] p-1 text-sm">
        {(['signin', 'signup', 'magic'] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setMsg(null); }}
            className={`rounded-xl px-2 py-2 font-medium transition ${mode === m ? 'bg-ember-500 text-white' : 'text-ink-300 hover:text-white'}`}>
            {m === 'signin' ? 'Kirish' : m === 'signup' ? 'Ro‘yxat' : 'Havola'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <>
            <div>
              <label className="label">Foydalanuvchi nomi</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="valijon" autoComplete="username" />
            </div>
            <div>
              <label className="label">Avatar</label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((a) => (
                  <button type="button" key={a} onClick={() => setAvatar(a)}
                    className={`h-10 w-10 rounded-xl text-xl transition ${avatar === a ? 'bg-ember-500/30 ring-2 ring-ember-400' : 'bg-white/5 hover:bg-white/10'}`}>{a}</button>
                ))}
              </div>
            </div>
          </>
        )}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siz@email.com" autoComplete="email" />
        </div>
        {mode !== 'magic' && (
          <div>
            <label className="label">Parol</label>
            <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="kamida 6 belgi" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </div>
        )}
        {msg && <div className={`rounded-2xl px-4 py-3 text-sm ${msg.type === 'ok' ? 'bg-teal-500/15 text-teal-300' : 'bg-rose-500/15 text-rose-300'}`}>{msg.text}</div>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? '...' : mode === 'signin' ? 'Kirish' : mode === 'signup' ? 'Ro‘yxatdan o‘tish' : 'Havola yuborish'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-400">
        Birinchi ro‘yxatdan o‘tgan foydalanuvchi avtomatik <b>admin</b> bo‘ladi. <Link href="/" className="underline">Bosh sahifa</Link>
      </p>
    </div>
  );
}

function translateError(m: string) {
  if (/invalid login credentials/i.test(m)) return 'Email yoki parol noto‘g‘ri.';
  if (/email not confirmed/i.test(m)) return 'Email tasdiqlanmagan. Pochtangizdagi havolani bosing.';
  if (/already registered/i.test(m)) return 'Bu email allaqachon ro‘yxatdan o‘tgan.';
  if (/rate limit/i.test(m)) return 'Juda ko‘p urinish. Bir ozdan keyin qayta urinib ko‘ring.';
  return m;
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </main>
  );
}
