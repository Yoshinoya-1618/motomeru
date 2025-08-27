// lib/storage.ts
export const BUCKET_WANTED = 'wanted'
export const BUCKET_SWAP   = 'swap'
export const BUCKET_AVATAR = 'avatars'

export function publicObjectBase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing')
  return `${url.replace(/\/+$/, '')}/storage/v1/object/public`
}

export function buildPublicUrl(bucket: string, path: string): string {
  return `${publicObjectBase()}/${bucket}/${path.replace(/^\/+/, '')}`
}
