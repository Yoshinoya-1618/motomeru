// components/PageHero.tsx
import React from 'react'

export default function PageHero({
  title,
  subtitle,
  cta,
}: {
  title: string
  subtitle?: React.ReactNode
  cta?: React.ReactNode
}) {
  return (
    <section className="bg-emerald-600 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 text-center">
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">{title}</h1>
        {subtitle && <p className="mx-auto mb-6 max-w-2xl text-sm opacity-90 md:text-base">{subtitle}</p>}
        {cta}
      </div>
    </section>
  )
}
