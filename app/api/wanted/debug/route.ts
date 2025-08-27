import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession:false } });
}

export async function GET() {
  try {
    const urlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const keySet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    const db = supa();
    const { data: rows, error } = await db
      .from('wanted')
      .select('id,title,created_at,budget_upper')
      .order('created_at', { ascending:false })
      .limit(5);

    if (error) throw error;

    const { count, error: cntErr } = await db.from('wanted').select('*', { count:'exact', head:true });
    if (cntErr) throw cntErr;

    return NextResponse.json({
      ok: true,
      env: { NEXT_PUBLIC_SUPABASE_URL: urlSet, SUPABASE_SERVICE_ROLE_KEY: keySet },
      latest5: rows ?? [],
      total: count ?? null,
    });
  } catch (e) {
    console.error('[GET /api/wanted/debug] ', e);
    return NextResponse.json({ ok:false, error:'DEBUG_FAILED' }, { status:500 });
  }
}
