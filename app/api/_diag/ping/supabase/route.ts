import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WantedRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  series: string | null;
  receive_method: string | null;
  budget_upper: number;
  image_urls: string[] | null;
  created_at: string;
};

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

const compat = (it: WantedRow) => ({
  ...it,
  priceMax: it.budget_upper,
  price_max: it.budget_upper,
  maxBudget: it.budget_upper,
  budgetUpper: it.budget_upper,
});

// 注意：このプロジェクト方針として params は Promise
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ← Promise を await 展開

    const db = supa();
    const { data, error } = await db.from('wanted').select('*').eq('id', id).single();

    if (error) {
      console.error('[GET /api/wanted/:id] not found', error);
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: compat(data as WantedRow) }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/wanted/:id] failed', e);
    return NextResponse.json({ ok: false, error: 'GET_FAILED' }, { status: 500 });
  }
}
