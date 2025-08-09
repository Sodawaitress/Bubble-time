import React, { useMemo, useRef } from 'react'
import { toPng } from 'dom-to-image-more'

type Ev = {
  id:string; title:string; start:string; end:string; type?:string; color?:string
}

function startOfWeek(date: Date){
  const d = new Date(date)
  const day = (d.getDay()+6)%7 // Monday=0
  d.setDate(d.getDate()-day)
  d.setHours(0,0,0,0)
  return d
}

export default function Timetable({ events, onDownload }: { events: Ev[], onDownload: (blobUrl:string)=>void }){
  const ref = useRef<HTMLDivElement>(null)
  const week = useMemo(()=>{
    const now = new Date()
    const monday = startOfWeek(now)
    const days = [...Array(7)].map((_,i)=> new Date(monday.getTime()+i*86400000))
    const byDay: any = Object.fromEntries(days.map(d=>[d.toDateString(), [] as Ev[]]))
    events.forEach(e=>{
      const d = new Date(e.start).toDateString()
      if(byDay[d]) byDay[d].push(e)
    })
    Object.values(byDay).forEach((arr:any)=>arr.sort((a:Ev,b:Ev)=>+new Date(a.start)-+new Date(b.start)))
    return { days, byDay }
  }, [events])

  const handleDownload = async ()=>{
    if(!ref.current) return
    const dataUrl = await toPng(ref.current, { pixelRatio: 2 })
    const blob = await (await fetch(dataUrl)).blob()
    const url = URL.createObjectURL(blob)
    onDownload(url)
  }

  return (
    <div className="timetable">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <strong>Weekly Timetable (PNG export)</strong>
        <button onClick={handleDownload}>Download PNG</button>
      </div>
      <div ref={ref} style={{display:'grid', gridTemplateColumns:'100px repeat(7, 1fr)', gap:'6px', background:'#fff', padding:12, border:'1px solid #eee', borderRadius:12}}>
        <div></div>
        {week.days.map((d,i)=>(<div key={i} style={{fontWeight:600, textAlign:'center'}}>{d.toLocaleDateString(undefined,{weekday:'short', month:'numeric', day:'numeric'})}</div>))}
        {['Morning','Noon','Afternoon','Evening'].map((label,ri)=> (
          <React.Fragment key={ri}>
            <div style={{color:'#777'}}>{label}</div>
            {week.days.map((d,i)=>{
              const evs = (week.byDay as any)[d.toDateString()] as Ev[]
              return <div key={i} style={{minHeight:80, border:'1px dashed #eee', borderRadius:8, padding:6}}>
                {evs.map((e,idx)=>(
                  <div key={idx} style={{background:e.color||'#ddd', color:'#000', padding:'4px 6px', borderRadius:6, marginBottom:4, fontSize:12}}>
                    <div style={{fontWeight:600}}>{e.title}</div>
                    <div style={{opacity:.8}}>{new Date(e.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}–{new Date(e.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    {e.type && <div style={{opacity:.8}}>{e.type}</div>}
                  </div>
                ))}
              </div>
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
