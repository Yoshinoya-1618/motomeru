// lib/categories.ts
export type Category = { id: string; label: string; aliases?: string[] }

export const CATEGORIES: Category[] = [
  { id: 'trading_cards', label: 'トレカ（ポケカ/遊戯王など）', aliases: ['トレカ', 'カード', 'ポケカ', '遊戯王'] },
  { id: 'anime_goods',   label: 'アニメ・キャラクターグッズ',   aliases: ['グッズ', 'アクスタ', '缶バ'] },
  { id: 'figures',       label: 'フィギュア・プラモデル',       aliases: ['フィギュア', 'プラモ'] },
  { id: 'games',         label: 'ゲーム（本体/ソフト/周辺）',     aliases: ['ゲーム', 'レトロゲーム'] },
  { id: 'idol_music',    label: '音楽・アイドル（CD/DVD/特典）',  aliases: ['CD', 'DVD', '特典', '生写真'] },
  { id: 'plush',         label: 'ぬいぐるみ・マスコット',         aliases: ['ぬい', 'マスコット'] },
  { id: 'books_doujin',  label: 'コミック・同人誌・資料',         aliases: ['同人', '画集', '設定資料'] },
  { id: 'event_ltd',     label: 'イベント/会場限定アイテム',      aliases: ['会場限定', '限定'] },
  { id: 'retro_toys',    label: 'レトロ玩具・コレクション',       aliases: ['レトロ', 'ビンテージ'] },
  { id: 'other',         label: 'その他' },
]

// 保存（ID）はこのまま、表示だけ日本語ラベルへ解決
export function categoriesForUI(): { id: string; label: string }[] {
  return CATEGORIES.map(({ id, label }) => ({ id, label }))
}

export function isValidCategory(id: string): boolean {
  return !!CATEGORIES.find(c => c.id === id)
}

export function categoryLabel(id?: string | null): string {
  if (!id) return ''
  return CATEGORIES.find(c => c.id === id)?.label ?? id
}
