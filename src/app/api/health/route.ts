import { NextResponse } from 'next/server';
import { configuredProviders } from '@/lib/ai/providers';
import { providerSnapshot } from '@/lib/ai/gateway';

export const runtime = 'nodejs';

/** Sozlamalarni tekshirish: /api/health (kalitlar ko'rsatilmaydi) */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    providers: configuredProviders().map((p) => ({ id: p.def.id, model: p.model })),
    memory: providerSnapshot(),
    time: new Date().toISOString(),
  });
}
