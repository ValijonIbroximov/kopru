import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/manifest.json', '/icon.svg'];

/**
 * Auth middleware — TEZLIK uchun qoidalar:
 *  - /api/* — tekshirilmaydi (route handler'lar o'zi `getUser()` qiladi; ikki marta tekshirish 200–600 ms qo'shardi).
 *  - Klient-navigatsiya (RSC payload) va prefetch so'rovlari — tekshirilmaydi: ilova ichida AppShell profil
 *    bo'lmasa /login ga yo'naltiradi, brauzer klienti tokenni o'zi yangilaydi. Avval HAR BIR sahifa almashinuvida
 *    Supabase Auth'ga tarmoq so'rovi ketardi — sayt "qotgandek" sezilardi.
 *  - Auth cookie umuman bo'lmasa — tarmoqsiz darhol /login (yoki ochiq sahifa).
 *  - Faqat to'liq sahifa yuklanishida (F5, havola) sessiya tekshiriladi va cookie yangilanadi.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  // Supabase sozlanmagan bo'lsa — hamma narsa ochiq (demo rejim)
  if (!url || !anon) return response;
  if (pathname.startsWith('/api/')) return response;

  const isRsc = request.headers.get('rsc') === '1' || request.headers.has('next-router-prefetch') || request.headers.has('next-router-state-tree');
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const hasAuthCookie = request.cookies.getAll().some((c) => /^sb-.*-auth-token/.test(c.name));

  // Cookie yo'q: tarmoqsiz qaror
  if (!hasAuthCookie) {
    if (isPublic || isRsc) return response;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Klient-navigatsiya: sessiya bor deb hisoblaymiz (AppShell + brauzer klienti nazorat qiladi)
  if (isRsc) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (user && (pathname === '/login' || pathname === '/')) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = '/dashboard';
    appUrl.search = '';
    return NextResponse.redirect(appUrl);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|mp3|txt|xml)$).*)'],
};
