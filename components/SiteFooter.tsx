import Link from 'next/link'

export default function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-subtle">
          <li><Link href="/legal/privacy" className="hover:text-ink">プライバシー</Link></li>
          <li><Link href="/legal/terms" className="hover:text-ink">利用規約</Link></li>
          <li><Link href="/legal/guidelines" className="hover:text-ink">ガイドライン</Link></li>
          <li><Link href="/legal/tokushoho" className="hover:text-ink">特商法表記</Link></li>
          <li><Link href="/help" className="hover:text-ink">ヘルプ</Link></li>
          <li><Link href="/contact" className="hover:text-ink">お問い合わせ</Link></li>
        </ul>
        <div className="mt-4 text-xs text-subtle">© {year} Motomeru</div>
      </div>
    </footer>
  )
}
