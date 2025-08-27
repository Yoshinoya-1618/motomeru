// app/legal/privacy/page.tsx
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">プライバシーポリシー</h1>
      <p className="text-sm text-subtle mb-6">最終更新日：2025-08-22</p>

      <div className="prose prose-sm max-w-none">
        <h2>1. 収集する情報</h2>
        <p>メールアドレス、投稿・オファー情報、アクセスログ等を取得します。</p>
        <h2>2. 利用目的</h2>
        <ul>
          <li>アカウント管理、通知の送信</li>
          <li>サービスの運営・改善、セキュリティ対策</li>
          <li>法令遵守</li>
        </ul>
        <h2>3. 第三者提供</h2>
        <p>法令に基づく場合等を除き、本人の同意なく第三者に提供しません。</p>
        <h2>4. 安全管理</h2>
        <p>アクセス制御、暗号化等、適切な安全管理措置を講じます。</p>
        <h2>5. 開示・訂正・削除</h2>
        <p>所定の手続により、保有個人データの開示等を行います。</p>
        <h2>6. お問い合わせ</h2>
        <p>プライバシーに関するお問い合わせは /contact へ。</p>
      </div>
    </main>
  )
}
