'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function DMStartButton(props: {
  postId: string
  postType: 'wanted' | 'swap'
  className?: string
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const isAuthed = Boolean(session?.user)

  const onClick = () => {
    if (!isAuthed) {
      signIn(undefined, { callbackUrl: `/dm/start?type=${props.postType}&id=${props.postId}` })
      return
    }
    router.push(`/dm/start?type=${props.postType}&id=${props.postId}`)
  }

  return (
    <button
      onClick={onClick}
      className={props.className ?? 'inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700'}
      aria-label="この投稿者とDMする"
    >
      この投稿者とDMする
    </button>
  )
}
