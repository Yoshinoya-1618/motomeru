'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import WantedListCard from '@/components/WantedListCard';
import { useRouter } from 'next/navigation';

type ApiResp = {
  ok: boolean;
  items: {
    id: string;
    title: string;
    description?: string|null;
    category?: string|null;
    series?: string|null;
    receive_method?: string|null;
    budget_upper: number;
    image_urls?: string[]|null;
    created_at: string;
  }[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json() as Promise<ApiResp>;
};

const RECEIVE_LABELS: Record<string,string> = {
  delivery: '配送',
  meet: '対面',
  both: 'どちらでも',
};

export default function SearchClient(props: {
  initialQuery?: string;
  initialCategory?: string;
  initialSeries?: string;
  initialReceive?: string;
  initialSort?: 'new'|'recommended';
}) {
  const router = useRouter();
  const [q, setQ] = useState(props.initialQuery ?? '');
  const [category, setCategory] = useState(props.initialCategory ?? '');
  const [series, setSeries] = useState(props.initialSeries ?? '');
  const [receive, setReceive] = useState(props.initialReceive ?? '');
  const [sort, setSort] = useState<'new'|'recommended'>(props.initialSort ?? 'new');

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    if (series) p.set('series', series);
    if (receive) p.set('receive_method', receive);
    p.set('sort', sort);
    p.set('limit', '24');
    return p.toString();
  }, [q, category, series, receive, sort]);

  const { data, error, isLoading, mutate } = useSWR<ApiResp>(`/api/wanted?${qs}`, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // URLも同期（シェアしやすい）
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    if (series) p.set('series', series);
    if (receive) p.set('receive_method', receive);
    p.set('sort', sort);
    router.push(`/search?${p.toString()}`);
    mutate(); // 手動再検証
  }, [q, category, series, receive, sort, router, mutate]);

  return (
    <div className="mt-4">
      <form onSubmit={onSubmit} className="rounded-xl border bg-white p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">キーワード</label>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="例：ポケカ 151"
              className="w-full rounded-lg border px-3 py-2"
              aria-label="キーワード"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">カテゴリ</label>
            <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full rounded-lg border px-3 py-2">
              <option value="">指定なし</option>
              <option value="trading_cards">トレカ（ポケカ/遊戯王など）</option>
              <option value="anime_goods">アニメ・キャラクターグッズ</option>
              <option value="figures">フィギュア・プラモデル</option>
              <option value="games">ゲーム（本体/ソフト/周辺）</option>
              <option value="idol_music">音楽・アイドル（CD/DVD/特典）</option>
              <option value="plush">ぬいぐるみ・マスコット</option>
              <option value="books_doujin">コミック・同人誌・資料</option>
              <option value="event_ltd">イベント/会場限定アイテム</option>
              <option value="retro_toys">レトロ玩具・コレクション</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">シリーズ/作品名</label>
            <input
              value={series}
              onChange={(e)=>setSeries(e.target.value)}
              placeholder="例：スプラトゥーン"
              className="w-full rounded-lg border px-3 py-2"
              aria-label="シリーズ"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">受け渡し</label>
            <select value={receive} onChange={(e)=>setReceive(e.target.value)} className="w-full rounded-lg border px-3 py-2">
              <option value="">指定なし</option>
              <option value="delivery">配送</option>
              <option value="meet">対面</option>
              <option value="both">どちらでも</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs text-gray-600">並び替え:</label>
          <select value={sort} onChange={(e)=>setSort(e.target.value as any)} className="rounded-lg border px-2 py-1 text-sm">
            <option value="new">新着</option>
            <option value="recommended">おすすめ</option>
          </select>
          <button type="submit" className="ml-auto rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
            検索
          </button>
        </div>

        {/* 現在の条件表示 */}
        <div className="mt-2 text-xs text-gray-500">
          条件：
          {q ? <>キーワード「{q}」</> : <>指定なし</>}
          {category && <>／カテゴリ「{category}」</>}
          {series && <>／シリーズ「{series}」</>}
          {receive && <>／受け渡し「{RECEIVE_LABELS[receive] ?? receive}」</>}
          ／並び「{sort==='new'?'新着':'おすすめ'}」
        </div>
      </form>

      {/* 結果 */}
      <div className="mt-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-2">
                <div className="h-32 w-full animate-pulse rounded-lg bg-gray-100" />
                <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-gray-200" />
                <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : error || !data?.ok ? (
          <div className="rounded-xl border p-4 text-sm text-red-600">
            取得に失敗しました。<button onClick={()=>mutate()} className="ml-2 underline">再読み込み</button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="rounded-xl border p-6 text-center text-sm">
            条件に合う投稿がありません。{' '}
            <a href="/new" className="text-emerald-700 underline">買いたいを投稿してみませんか？</a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {data.items.map((it)=>(
              <WantedListCard key={it.id} item={it} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
