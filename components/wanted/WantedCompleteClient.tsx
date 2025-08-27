'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mutate } from 'swr'; // トップSWRの先回り再検証

// ========== 日本語ラベル（カテゴリ） ==========
const CATEGORY_LABELS: Record<string, string> = {
  trading_cards: 'トレカ（ポケカ/遊戯王など）',
  anime_goods: 'アニメ・キャラクターグッズ',
  figures: 'フィギュア・プラモデル',
  games: 'ゲーム（本体/ソフト/周辺）',
  idol_music: '音楽・アイドル（CD/DVD/特典）',
  plush: 'ぬいぐるみ・マスコット',
  books_doujin: 'コミック・同人誌・資料',
  event_ltd: 'イベント/会場限定アイテム',
  retro_toys: 'レトロ玩具・コレクション',
  other: 'その他',
};

// ========== 受け渡し方法の日本語化（複数表記に寛容） ==========
function receiveMethodLabel(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const v = String(raw).trim().toLowerCase();
  if (['delivery', 'ship', 'shipping', 'postal', 'post', '配送'].includes(v)) return '配送';
  if (['meet', 'face', 'f2f', 'hand', 'pickup', '対面'].includes(v)) return '対面';
  if (['both', 'either', 'any', 'どちらでも', 'eitherway', 'anywhere'].includes(v)) return 'どちらでも';
  return raw; // 未知値はつぶさずそのまま表示
}

// ========== 型 ==========
type LastWantedPost = {
  id?: string;
  title: string;
  description?: string | null;
  category?: string | null;        // ID（例: 'trading_cards'）
  series?: string | null;
  receive_method?: string | null;  // 'delivery' | 'meet' | 'both' 等
  budget_upper: number;
  image_urls?: string[] | null;    // 公開URL配列
  created_at?: string;             // ISO
};

const STORAGE_KEY = 'motomeru:last_wanted_post';

export default function WantedCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<LastWantedPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idFromQuery = searchParams?.get('id') ?? undefined;

  // 直前投稿を sessionStorage から読み取り
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(JSON.parse(raw) as LastWantedPost);
      }
    } catch (e) {
      console.error(e);
      setError('完了データの読み込みに失敗しました。');
    }
  }, []);

  // ★ フォールバック：sessionStorageが空で ?id= がある場合はAPIから1件取得
  useEffect(() => {
    (async () => {
      if (data || !idFromQuery) return;
      try {
        const res = await fetch(`/api/wanted/${idFromQuery}`, { cache: 'no-store' });
        if (!res.ok) {
          console.warn('fallback fetch failed', await res.text());
          return;
        }
        const json = await res.json();
        if (json?.ok && json?.item) {
          setData(json.item as LastWantedPost);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFromQuery, data]);

  // トップの新着・おすすめSWRキーを先回りで再検証
  useEffect(() => {
    if (!data?.id) return;
    const keys = [
      '/api/wanted?sort=new&limit=12',
      '/api/wanted?sort=recommended&limit=12',
    ];
    keys.forEach((k) => mutate(k, undefined, { revalidate: true }));
  }, [data?.id]);

  const categoryJP = useMemo(() => {
    if (!data?.category) return undefined;
    return CATEGORY_LABELS[data.category] ?? data.category;
  }, [data?.category]);

  const receiveJP = useMemo(
    () => receiveMethodLabel(data?.receive_method),
    [data?.receive_method]
  );

  const priceBadge = useMemo(() => {
    const val = data?.budget_upper;
    if (val === undefined || val === null || Number.isNaN(Number(val))) return '';
    return `〜¥${Number(val).toLocaleString('ja-JP')}`;
  }, [data?.budget_upper]);

  const onOpenDetail = () => {
    if (!data?.id) {
      router.push('/search');
      return;
    }
    router.push(`/wanted/${data.id}`);
  };

  const onGoHomeFresh = () => {
    router.push(`/?ts=${Date.now()}`); // キャッシュ回避
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">投稿が完了しました</h1>
        <p className="mt-1 text-sm text-gray-600">
          オファーが届いたら通知します。内容をご確認ください。
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!data ? (
          <div className="mt-6 rounded-lg border p-4 text-sm">
            直前の投稿データが見つかりませんでした。お手数ですが{' '}
            <button
              onClick={onGoHomeFresh}
              className="inline-flex items-center rounded-lg border px-2 py-1 text-emerald-700 hover:bg-emerald-50"
              aria-label="トップへ戻る"
            >
              トップへ戻る
            </button>
            から再度ご確認ください。
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 画像群 */}
            <section aria-label="投稿画像" className="space-y-3">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border bg-white">
                {data.image_urls && data.image_urls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.image_urls[0]}
                    alt="投稿画像1"
                    className="h-full w-full object-contain p-2"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">🛍️</div>
                )}
              </div>
              {/* サムネ（2枚目以降） */}
              {data.image_urls && data.image_urls.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {data.image_urls.slice(1, 5).map((url, i) => (
                    <div key={i} className="aspect-[4/3] overflow-hidden rounded-lg border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`投稿画像${i + 2}`}
                        className="h-full w-full object-contain p-2"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 詳細 */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold leading-6">{data.title}</h2>
                {priceBadge && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {priceBadge}
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                {data.series && (
                  <>
                    <dt className="col-span-1 text-gray-500">シリーズ</dt>
                    <dd className="col-span-2 break-words">{data.series}</dd>
                  </>
                )}

                {data.category && (
                  <>
                    <dt className="col-span-1 text-gray-500">カテゴリ</dt>
                    <dd className="col-span-2 break-words">{CATEGORY_LABELS[data.category!] ?? data.category}</dd>
                  </>
                )}

                {data.receive_method && (
                  <>
                    <dt className="col-span-1 text-gray-500">受け渡し</dt>
                    <dd className="col-span-2 break-words">{receiveJP}</dd>
                  </>
                )}

                {data.created_at && (
                  <>
                    <dt className="col-span-1 text-gray-500">投稿日</dt>
                    <dd className="col-span-2">
                      {new Date(data.created_at).toLocaleString('ja-JP')}
                    </dd>
                  </>
                )}
              </dl>

              {data.description && (
                <div className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                  {data.description}
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={onOpenDetail}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 sm:w-auto"
                  aria-label="投稿詳細を開く"
                >
                  投稿を開く
                </button>
                <button
                  onClick={() => router.push('/new')}
                  className="inline-flex w-full items-center justify-center rounded-2xl border px-4 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 sm:w-auto"
                  aria-label="続けて投稿する"
                >
                  続けて投稿
                </button>
                <button
                  onClick={onGoHomeFresh}
                  className="inline-flex w-full items-center justify-center rounded-2xl border px-4 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 sm:ml-auto sm:w-auto"
                  aria-label="トップへ戻る（最新を表示）"
                  title="最新を表示するためキャッシュを回避します"
                >
                  トップへ戻る
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
