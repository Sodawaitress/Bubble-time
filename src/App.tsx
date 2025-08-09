import React, { useEffect, useState } from 'react'
import Calendar from './Calendar'
import Timetable from './Timetable'
import { Events } from './api'

export default function App(){
  const [events, setEvents] = useState<any[]>([])
  const reload = async ()=>{
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString()
    const to   = new Date(now.getFullYear(), now.getMonth()+2, 0, 23,59,59).toISOString()
    const evs = await Events.list(from,to)
    setEvents(evs)
  }
  useEffect(()=>{ reload() }, [])

  return (
    <div>
      <Calendar />
      <Timetable events={events} onDownload={(url)=>{
        const a = document.createElement('a')
        a.href = url
        a.download = 'timetable.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(()=>URL.revokeObjectURL(url), 5000)
      }} />
    </div>
  )
}
