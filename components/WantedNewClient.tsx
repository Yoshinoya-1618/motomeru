// components/WantedNewClient.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Props = {
  initialTitle?: string
  csrfToken?: string
  priceFloor?: number
}

type FieldError = { field?: string; error?: string }

export default function WantedNewClient({ initialTitle = '', csrfToken, priceFloor = 500 }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(initialTitle)
  const [budgetUpper, setBudgetUpper] = useState<number | ''>('')
  const [category, setCategory] = useState<string>('')
  const [series, setSeries] = useState<string>('')
  const [receiveMethod, setReceiveMethod] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  const [formError, setFormError] = useState<FieldError | null>(null)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)

    const fd = new FormData()
    if (csrfToken) fd.append('csrfToken', csrfToken)
    fd.append('title', title.trim())
    if (description.trim()) fd.append('description', description.trim())
    if (category) fd.append('category', category)
    if (series.trim()) fd.append('series', series.trim())
    if (receiveMethod) fd.append('receive_method', receiveMethod)
    fd.append('budgetUpper', String(budgetUpper || ''))

    startTransition(async () => {
      const res = await fetch('/api/wanted', { method: 'POST', body: fd })
      let json: any = null
      try { json = await res.json() } catch {}

      if (!res.ok || !json?.ok) {
        // フィールドエラー（title / budgetUpper など）をUIに反映
        setFormError({ field: json?.field, error: json?.error || `投稿に失敗しました（${res.status}）` })
        return
      }

      // 成功時のみ遷移（完了ページへ）
      router.push(`/wanted/complete?id=${json.id}`)
    })
  }

  const badge = (n: number | '') =>
    typeof n === 'number' && !Number.isNaN(n) && n >= 0 ? `〜¥${new Intl.NumberFormat('ja-JP').format(n)}` : '上限未設定'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          タイトル <span className="ml-1 inline-block align-middle text-[10px] text-white bg-emerald-600 rounded px-1.5">必須</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          placeholder="例）ポケモンカード151 未開封を探しています"
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${formError?.field === 'title' ? 'border-red-500' : 'border-gray-300'}`}
          maxLength={40}
          required
          aria-invalid={formError?.field === 'title'}
        />
        {formError?.field === 'title' && (
          <p className="mt-1 text-xs text-red-600">{formError.error}</p>
        )}
      </div>

      <div>
        <label htmlFor="budgetUpper" className="block text-sm font-medium">
          予算の上限 <span className="ml-1 inline-block align-middle text-[10px] text-white bg-emerald-600 rounded px-1.5">必須</span>
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="budgetUpper"
            name="budgetUpper"
            type="number"
            inputMode="numeric"
            min={priceFloor}
            value={budgetUpper}
            onChange={(e) => setBudgetUpper(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))}
            placeholder={`${priceFloor}`}
            className={`w-40 rounded-lg border px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${formError?.field === 'budgetUpper' ? 'border-red-500' : 'border-gray-300'}`}
            required
            aria-invalid={formError?.field === 'budgetUpper'}
          />
          <span className="text-xs text-gray-500">最低 {priceFloor} 円</span>
          <span className="ml-auto text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1">
            {badge(budgetUpper)}
          </span>
        </div>
        {formError?.field === 'budgetUpper' && (
          <p className="mt-1 text-xs text-red-600">{formError.error}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium">カテゴリ（任意）</label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.currentTarget.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">未選択</option>
            <option value="trading_cards">トレカ</option>
            <option value="anime_goods">アニメ・キャラクターグッズ</option>
            <option value="figures">フィギュア・プラモデル</option>
            <option value="games">ゲーム</option>
            <option value="idol_music">音楽・アイドル</option>
            <option value="plush">ぬいぐるみ</option>
            <option value="books_doujin">コミック・同人誌・資料</option>
            <option value="event_ltd">イベント/会場限定アイテム</option>
            <option value="retro_toys">レトロ玩具・コレクション</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div>
          <label htmlFor="series" className="block text-sm font-medium">シリーズ／作品名（任意）</label>
          <input
            id="series"
            name="series"
            type="text"
            value={series}
            onChange={(e) => setSeries(e.currentTarget.value)}
            placeholder="例）ポケモンカード 151"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="receive_method" className="block text-sm font-medium">受け渡し方法（任意）</label>
        <select
          id="receive_method"
          name="receive_method"
          value={receiveMethod}
          onChange={(e) => setReceiveMethod(e.currentTarget.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">未指定</option>
          <option value="delivery">配送</option>
          <option value="meet">対面</option>
          <option value="any">どちらでも</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">説明（任意・1000字）</label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          placeholder="状態・数量・希望条件など（※「無料/無償/タダ」は禁止ワード）"
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${formError?.field === 'description' ? 'border-red-500' : 'border-gray-300'}`}
          rows={6}
          maxLength={1000}
        />
        {formError?.field === 'description' && (
          <p className="mt-1 text-xs text-red-600">{formError.error}</p>
        )}
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? '投稿中…' : 'この内容で投稿する'}
        </button>
      </div>
    </form>
  )
}
