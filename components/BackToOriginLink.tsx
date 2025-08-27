'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Props = {
  className?: string
  label?: string
}

export default function BackToOriginLink({ className, label = '← 戻る' }: Props) {
  const sp = useSearchParams()
  const from = sp.get('from')
  const href = from && from.startsWith('/') ? from : '/'
  return (
    <Link href={href} className={className ?? 'text-sm text-gray-600 hover:underline'}>
      {label}
    </Link>
  )
}
