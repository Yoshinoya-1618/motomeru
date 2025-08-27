// lib/devStore.ts
// 開発用：プロセス内メモリに Wanted / Swap を保存（簡易）
// 本番は DB（Supabase/Prisma）に差し替え予定

export type WantedRecord = {
  id: string
  userId: string
  title: string
  description: string
  category?: string
  series?: string
  receiveMethod?: string
  budgetUpper: number
  imageUrls: string[]
  createdAt: number
}

export type SwapRecord = {
  id: string
  userId: string
  category?: string
  series?: string
  give: string
  want: string
  conditions?: string
  imageUrls: string[]
  createdAt: number
}

// モジュールスコープの配列（開発中のみの簡易ストア）
const wantedStore: WantedRecord[] = []
const swapStore:   SwapRecord[] = []

// ID 生成（Node v18+ なら crypto.randomUUID あり）
const makeId = () => {
  try { return (globalThis as any).crypto?.randomUUID?.() ?? `tmp_${Date.now()}_${Math.random().toString(36).slice(2,8)}` }
  catch { return `tmp_${Date.now()}_${Math.random().toString(36).slice(2,8)}` }
}

/** Wanted を追加 */
export function addWanted(rec: Omit<WantedRecord, 'id' | 'createdAt'> & { id?: string, createdAt?: number }): WantedRecord {
  const row: WantedRecord = {
    ...rec,
    id: rec.id || makeId(),
    createdAt: rec.createdAt || Date.now(),
    imageUrls: rec.imageUrls || [],
  }
  wantedStore.unshift(row) // 新着先頭
  return row
}

/** Swap を追加 */
export function addSwap(rec: Omit<SwapRecord, 'id' | 'createdAt'> & { id?: string, createdAt?: number }): SwapRecord {
  const row: SwapRecord = {
    ...rec,
    id: rec.id || makeId(),
    createdAt: rec.createdAt || Date.now(),
    imageUrls: rec.imageUrls || [],
  }
  swapStore.unshift(row)
  return row
}

export type WantedQuery = {
  q?: string
  category?: string
  series?: string
  sort?: 'new' | 'recommended'
  limit?: number
}

export function listWanted(qp: WantedQuery = {}): WantedRecord[] {
  const { q, category, series, sort = 'new', limit = 24 } = qp
  let rows = wantedStore.slice()

  if (q) {
    const needle = q.toLowerCase()
    rows = rows.filter(r =>
      r.title.toLowerCase().includes(needle) ||
      r.description.toLowerCase().includes(needle) ||
      (r.series || '').toLowerCase().includes(needle)
    )
  }
  if (category) rows = rows.filter(r => r.category === category)
  if (series)   rows = rows.filter(r => r.series === series)

  if (sort === 'recommended') {
    rows = rows
      .map(r => {
        // 画像あり +200、最近さ + (最大100)、説明の充実度 + (最大50)
        const img = Math.min(r.imageUrls.length, 3) * 100
        const ageMin = Math.max(0, (Date.now() - r.createdAt) / 60000)
        const recency = Math.max(0, 100 - Math.min(ageMin, 100))
        const richness = Math.min((r.description?.length || 0) / 20, 50)
        const score = img + recency + richness
        return { r, score }
      })
      .sort((a, b) => b.score - a.score)
      .map(x => x.r)
  } else {
    rows.sort((a, b) => b.createdAt - a.createdAt)
  }

  return rows.slice(0, Math.max(1, Math.min(limit, 60)))
}

export type SwapQuery = {
  q?: string
  series?: string
  sort?: 'new' | 'recommended'
  limit?: number
}

export function listSwap(qp: SwapQuery = {}): SwapRecord[] {
  const { q, series, sort = 'new', limit = 24 } = qp
  let rows = swapStore.slice()

  if (q) {
    const needle = q.toLowerCase()
    rows = rows.filter(r =>
      r.give.toLowerCase().includes(needle) ||
      r.want.toLowerCase().includes(needle) ||
      (r.conditions || '').toLowerCase().includes(needle) ||
      (r.series || '').toLowerCase().includes(needle)
    )
  }
  if (series) rows = rows.filter(r => r.series === series)

  if (sort === 'recommended') {
    rows = rows
      .map(r => {
        const img = Math.min(r.imageUrls.length, 3) * 100
        const ageMin = Math.max(0, (Date.now() - r.createdAt) / 60000)
        const recency = Math.max(0, 100 - Math.min(ageMin, 100))
        const richness = Math.min((r.conditions?.length || 0) / 20, 50)
        const balance = Math.min(Math.abs((r.give.length || 0) - (r.want.length || 0)), 50)
        const score = img + recency + richness + (50 - balance)
        return { r, score }
      })
      .sort((a, b) => b.score - a.score)
      .map(x => x.r)
  } else {
    rows.sort((a, b) => b.createdAt - a.createdAt)
  }

  return rows.slice(0, Math.max(1, Math.min(limit, 60)))
}
