'use client'
type Props = {
  title: string; category?: string | null; imageUrl?: string | null;
  proposalThumbs?: string[]; seed?: string; className?: string; alt?: string;
}
const EMOJI: Record<string,string> = {
  'アニメ・ゲーム':'🎮','自動車・バイク':'🚗','音楽機材':'🎹','PCパーツ':'🖥️','その他':'🛍️'
}
function hue(s:string){ let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))|0; return Math.abs(h)%360 }

export default function WantedCover({title,category,imageUrl,proposalThumbs,seed,className='h-44 w-full rounded-md overflow-hidden',alt}:Props){
  if (imageUrl) return <img src={imageUrl} alt={alt||title} className={className+' object-cover'} />
  const t=(proposalThumbs||[]).filter(Boolean).slice(0,3)
  if (t.length===1) return <img src={t[0]!} alt={alt||title} className={className+' object-cover'} />
  if (t.length>=2) return (
    <div className={className+' grid'} style={{gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr'}}>
      <img src={t[0]!} className="col-span-1 row-span-2 h-full w-full object-cover" alt={alt||title}/>
      <img src={t[1]!} className="h-full w-full object-cover" alt=""/>
      <img src={t[2]||t[1]!} className="h-full w-full object-cover" alt=""/>
    </div>)
  const huev=hue((seed||title)+(category||'')), a=`hsl(${huev} 70% 90%)`, b=`hsl(${(huev+40)%360} 70% 80%)`
  return <div className={className+' grid place-items-center'} style={{background:`linear-gradient(135deg, ${a}, ${b})`}} role="img" aria-label={alt||title}>
    <span style={{fontSize:42}}>{EMOJI[category||'']||'🛍️'}</span>
  </div>
}
