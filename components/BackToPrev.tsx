'use client'

import { useRouter } from 'next/navigation'

export default function BackToPrev({ className = '' }: { className?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="戻る"
      className={`inline-flex items-center text-3xl leading-none text-gray-700 hover:text-gray-900 px-1 -ml-1 ${className}`}
    >
      <span aria-hidden>&lsaquo;</span>
    </button>
  )
}
