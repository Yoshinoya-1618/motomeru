'use client';

import { mutate } from 'swr';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// ---- 型（必要最小限） ----
export type WantedItem = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  series?: string | null;
  receive_method?: string | null;
  budget_upper: number;
  image_urls?: string[] | null;
  created_at?: string;
};

export type SwapItem = {
  id: string;
  // 表示に使う最低限（実装に合わせて拡張可）
  want: string; // 【求】
  give: string; // 【譲】
  conditions?: string | null;
  category?: string | null;
  series?: string | null;
  image_urls?: string[] | null;
  created_at?: string;
};

// ---- 保存キー ----
const WANTED_STORAGE_KEY = 'motomeru:last_wanted_post';
const SWAP_STORAGE_KEY = 'motomeru:last_swap_post';

// ---- トップで再取得したいSWRキー（必要に応じて調整）----
const WANTED_SWR_KEYS = [
  '/api/wanted?sort=new&limit=12',
  '/api/wanted?sort=recommended&limit=12',
];

const SWAP_SWR_KEYS = [
  '/api/swap?sort=new&limit=12',
  '/api/swap?sort=recommended&limit=12',
];

// ---- ユーティリティ ----
function safeSessionSet(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // セッションストレージが使えなくても致命ではないので握りつぶす
  }
}

function bumpHomeSWR(keys: string[]) {
  for (const k of keys) {
    mutate(k, undefined, { revalidate: true });
  }
}

// ---- 公開関数：Wanted投稿後の処理 ----
export function handleAfterWantedPost(router: AppRouterInstance, item: WantedItem) {
  if (!item?.id) {
    // idが無い場合はトップへフォールバック
    bumpHomeSWR(WANTED_SWR_KEYS);
    router.replace(`/?ts=${Date.now()}`);
    return;
  }

  // 直前投稿を保存（完了ページや将来の復元に使える）
  safeSessionSet(WANTED_STORAGE_KEY, {
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    category: item.category ?? null,
    series: item.series ?? null,
    receive_method: item.receive_method ?? null,
    budget_upper: item.budget_upper,
    image_urls: item.image_urls ?? null,
    created_at: item.created_at ?? new Date().toISOString(),
  });

  // トップの新着/おすすめを先回りで再検証
  bumpHomeSWR(WANTED_SWR_KEYS);

  // 詳細へ置換遷移（戻るで誤送信しないよう replace）
  router.replace(`/wanted/${item.id}?new=1`);
}

// ---- 公開関数：Swap投稿後の処理 ----
export function handleAfterSwapPost(router: AppRouterInstance, item: SwapItem) {
  if (!item?.id) {
    bumpHomeSWR(SWAP_SWR_KEYS);
    router.replace(`/?ts=${Date.now()}`);
    return;
  }

  safeSessionSet(SWAP_STORAGE_KEY, {
    id: item.id,
    want: item.want,
    give: item.give,
    conditions: item.conditions ?? null,
    category: item.category ?? null,
    series: item.series ?? null,
    image_urls: item.image_urls ?? null,
    created_at: item.created_at ?? new Date().toISOString(),
  });

  bumpHomeSWR(SWAP_SWR_KEYS);

  router.replace(`/swap/${item.id}?new=1`);
}
