'use client'

import { useState, useMemo } from 'react'

export default function ImageCarousel({
  images,
  alt = '',
  heightClass = 'h-64',
  rounded = 'rounded-2xl',
}: {
  images: string[] | null | undefined
  alt?: string
  heightClass?: string
  rounded?: string
}) {
  const srcs = useMemo(
    () => (Array.isArray(images) ? images.filter(Boolean) : []).slice(0, 10),
    [images]
  )
  const [idx, setIdx] = useState(0)

  if (srcs.length === 0) {
    return (
      <div className={`${heightClass} ${rounded} bg-gray-50 flex items-center justify-center text-3xl`}>
        🖼️
      </div>
    )
  }

  const prev = () => setIdx((p) => (p - 1 + srcs.length) % srcs.length)
  const next = () => setIdx((p) => (p + 1) % srcs.length)

  return (
    <div className={`relative overflow-hidden bg-gray-50 ${rounded}`}>
      <div className={`relative w-full ${heightClass} flex items-center justify-center`}>
        <img
          src={srcs[idx]}
          alt={alt}
          className="w-full h-full object-contain p-2"
          loading="lazy"
          decoding="async"
        />
      </div>

      {srcs.length > 1 && (
        <>
          <button
            type="button"
            aria-label="前の画像"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow px-2 py-1 text-gray-700"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="次の画像"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow px-2 py-1 text-gray-700"
          >
            ›
          </button>
        </>
      )}

      {srcs.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {srcs.map((_, i) => (
            <button
              key={i}
              aria-label={`画像 ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-2 w-2 rounded-full ${i === idx ? 'bg-gray-800' : 'bg-gray-300'} hover:bg-gray-500`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
