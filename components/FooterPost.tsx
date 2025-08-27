// components/FooterPost.tsx
import Link from 'next/link'
import React from 'react'

export default function FooterPost() {
  return (
    <footer className="mt-12 border-t border-gray-200 pt-6 pb-16 text-sm text-gray-600">
      <div className="space-y-3">
        <p className="font-medium text-gray-800">投稿のコツ</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>タイトルは具体的に（例：◯◯の初回限定盤Bを探しています）</li>
          <li>条件（状態・付属品・希望予算・受け取り方法）を明記しましょう</li>
          <li>参考画像があると成立率が上がります</li>
        </ul>

        <div className="pt-3 flex flex-wrap gap-4">
          <Link href="/terms" className="underline hover:no-underline">利用規約</Link>
          <Link href="/guidelines" className="underline hover:no-underline">投稿ガイドライン</Link>
          <Link href="/report" className="underline hover:no-underline">通報</Link>
        </div>
      </div>
    </footer>
  )
}
