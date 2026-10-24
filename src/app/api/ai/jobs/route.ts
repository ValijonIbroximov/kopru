import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { processQueuedJobs } from '@/lib/ai/gateway';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Foydalanuvchi "Tayyormi?" deb so'raganda: o'z navbatidagi ishlarni bajarishga urinish + ro'yxat */
export async function GET() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  const result = await processQueuedJobs({ user: sb, admin: supabaseAdmin(), userId: auth.user.id }, 2);
  const { data: jobs } = await sb.from('ai_jobs').select('id, kind, status, result, error, created_at').eq('user_id', auth.user.id).or('status.neq.done,result.not.is.null').order('created_at', { ascending: false }).limit(20);
  return NextResponse.json({ ok: true, processed: result, jobs: jobs ?? [] });
}
