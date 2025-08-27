// app/legal/terms/page.tsx
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">利用規約</h1>
      <p className="text-sm text-subtle mb-6">最終更新日：2025-08-22</p>

      <div className="prose prose-sm max-w-none">
        <h2>1. 適用</h2>
        <p>本規約は、モトメル（以下「当サービス」）の提供条件および利用者の皆様の権利義務を定めるものです。</p>
        <h2>2. アカウント</h2>
        <p>利用者は正確な情報をもって登録し、アカウントの管理責任を負います。</p>
        <h2>3. 禁止事項</h2>
        <ul>
          <li>法令・公序良俗に反する行為</li>
          <li>知的財産権等の権利侵害</li>
          <li>危険物・規約で禁じる物品の募集・取引</li>
        </ul>
        <h2>4. 取引</h2>
        <p>募集投稿・オファー・成立後のやり取りは、当サービスの方針に従って行われます。</p>
        <h2>5. 免責</h2>
        <p>当サービスは、利用者間の取引に関する一切の責を負いません。</p>
        <h2>6. 改定</h2>
        <p>本規約は必要に応じて改定されます。改定後の利用は、改定に同意したものとみなされます。</p>
        <h2>7. お問い合わせ</h2>
        <p>お問い合わせは /contact よりお願いします。</p>
      </div>
    </main>
  )
}
