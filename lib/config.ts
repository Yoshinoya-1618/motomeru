// lib/config.ts
export const PRICE_FLOOR = Number(process.env.NEXT_PUBLIC_PRICE_FLOOR || '500');
export const EVENT_TTL_HOURS = Number(process.env.NEXT_PUBLIC_EVENT_TTL_HOURS || '72');

export function normalizePrice(n: string | number | null | undefined): number | null {
  const v = typeof n === 'string' ? n.replace(/\D/g, '') : n;
  if (v === null || v === undefined || v === '') return null;
  const num = typeof v === 'number' ? Math.floor(v) : Math.floor(Number(v));
  if (Number.isNaN(num)) return null;
  return num;
}
