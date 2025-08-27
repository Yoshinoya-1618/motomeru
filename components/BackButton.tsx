// components/BackButton.tsx
'use client'
import { useRouter } from 'next/navigation'

export default function BackButton({ label = '戻る' }: { label?: string }) {
  const r = useRouter()
  return (
    <button
      onClick={() => r.back()}
      className="inline-flex items-center gap-2 text-sm text-ink hover:opacity-80"
      aria-label={label}
      type="button"
    >
      {/* 左矢印 */}
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path d="M14 7l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      {label}
    </button>
  )
}
