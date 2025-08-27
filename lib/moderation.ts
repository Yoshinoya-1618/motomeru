// lib/moderation.ts
/**
 * 投稿全般のモデレーション補助
 * - NGワード検知
 * - 禁止カテゴリの判定
 */

// 無料志向ワード（文中・全角/半角に大雑把にマッチ）
const NG_WORD_PATTERNS = [
  /無料/gi,
  /無償/gi,
  /タダ/gi,
  /\bfree\b/gi,
];

export function hasNgWords(text: string): boolean {
  if (!text) return false;
  return NG_WORD_PATTERNS.some((re) => re.test(text));
}

/**
 * プラットフォームで扱わないカテゴリ
 * （高額転売チケット/医薬品/危険物/成人向け/偽物/武器・違法品/スパイウェア 等）
 * UI には基本出しませんが、防御としてサーバーでも弾きます。
 */
export const BANNED_CATEGORY_IDS: string[] = [
  'tickets_scalping',
  'medicine',
  'hazardous',
  'adult',
  'counterfeit',
  'weapons',
  'spyware',
  'radioactive',
];

const BANNED_CATEGORY_SET = new Set(BANNED_CATEGORY_IDS);

/** カテゴリIDが禁止対象かどうかを判定 */
export function isBannedCategory(id?: string | null): boolean {
  if (!id) return false;
  return BANNED_CATEGORY_SET.has(id);
}
