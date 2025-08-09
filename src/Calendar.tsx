import React, { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import rrulePlugin from '@fullcalendar/rrule'
import { Events, Prefs } from './api'
import { colorFromFlag, FLAG_PALETTES } from './flagColors'

type EventInput = any

export default function Calendar(){
  const [events, setEvents] = useState<any[]>([])
  const [prefs, setPrefs] = useState<any>({ slotMinTime: '07:40:00', slotMaxTime: '22:00:00', weekStartsOn: 1 })
  const [drawer, setDrawer] = useState<any | null>(null) // { start, end, existing? }
  const calRef = useRef<FullCalendar | null>(null)

  const fetchAll = async ()=>{
    const p = await Prefs.get()
    setPrefs(prev=>({...prev, ...(p||{})}))
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString()
    const to   = new Date(now.getFullYear(), now.getMonth()+2, 0, 23,59,59).toISOString()
    const evs = await Events.list(from,to)
    setEvents(evs)
  }

  useEffect(()=>{ fetchAll() }, [])

  const handleSelect = (info: any)=>{
    setDrawer({ start: info.startStr, end: info.endStr })
  }

  const handleEventUpdate = async (change: any)=>{
    const e = change.event
    await Events.update(e.id, { start: e.start?.toISOString(), end: e.end?.toISOString() })
    fetchAll()
  }

  const handleSave = async (payload: any)=>{
    if(payload.id){
      await Events.update(payload.id, payload)
    } else {
      await Events.create(payload)
    }
    setDrawer(null)
    fetchAll()
  }

  const handleDelete = async (id: string)=>{
    await Events.remove(id)
    setDrawer(null); fetchAll()
  }

  return (
    <div>
      <FullCalendar
        ref={calRef as any}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, rrulePlugin]}
        initialView="timeGridDay"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridThree,timeGridSeven,dayGridMonth' }}
        views={{
          timeGridThree: { type:'timeGrid', duration:{ days:3 }, buttonText:'3 days' },
          timeGridSeven: { type:'timeGrid', duration:{ days:7 }, buttonText:'7 days' }
        }}
        slotDuration="00:05:00"
        snapDuration="00:05:00"
        slotMinTime={prefs.slotMinTime || '07:40:00'}
        slotMaxTime={prefs.slotMaxTime || '22:00:00'}
        firstDay={prefs.weekStartsOn ?? 1}
        selectable
        selectMirror
        editable
        eventDurationEditable
        events={events as EventInput}
        select={handleSelect}
        eventDrop={handleEventUpdate}
        eventResize={handleEventUpdate}
      />
      {drawer && <EventDrawer data={drawer} onSave={handleSave} onDelete={handleDelete} onClose={()=>setDrawer(null)} />}
      <PrefsBar prefs={prefs} onSave={async (p)=>{ await Prefs.save(p); setPrefs(p); }} />
    </div>
  )
}

function PrefsBar({ prefs, onSave }: { prefs:any, onSave:(p:any)=>void }){
  const [p, setP] = useState(prefs)
  useEffect(()=>setP(prefs), [prefs])
  return (
    <header>
      <div>Time Window</div>
      <input value={p.slotMinTime} onChange={e=>setP({...p, slotMinTime:e.target.value})} placeholder="07:40:00" />
      <span>–</span>
      <input value={p.slotMaxTime} onChange={e=>setP({...p, slotMaxTime:e.target.value})} placeholder="22:00:00" />
      <div className="spacer" />
      <button onClick={()=>onSave(p)}>Save</button>
    </header>
  )
}

function EventDrawer({ data, onSave, onDelete, onClose }:{ data:any, onSave:(p:any)=>void, onDelete:(id:string)=>void, onClose:()=>void }){
  const [form, setForm] = useState<any>({
    id: data.id,
    title: data.title || '',
    location: data.location || '',
    notes: data.notes || '',
    type: data.type || 'Asexual',
    color: data.color || colorFromFlag(data.type || 'Asexual'),
    start: data.start,
    end: data.end,
    rrule: data.rrule || '', // string like FREQ=DAILY or FREQ=WEEKLY;BYDAY=MO
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  useEffect(()=>{
    setForm((f:any)=>({ ...f, color: colorFromFlag(f.type) }))
  }, [form.type])

  const save = ()=>{
    const payload = { ...form }
    if(!payload.title) payload.title = '(no title)'
    onSave(payload)
  }

  return (
    <div className="drawer">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <strong>{form.id?'Edit':'New'} Event</strong>
        <div>
          {form.id && <button onClick={()=>onDelete(form.id)} style={{marginRight:6}}>Delete</button>}
          <button onClick={onClose}>Close</button>
        </div>
      </div>
      <div className="row">
        <div className="label">Title</div>
        <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} style={{flex:1}}/>
      </div>
      <div className="row">
        <div className="label">When</div>
        <input type="datetime-local" value={form.start?.slice(0,16)} onChange={e=>setForm({...form, start:new Date(e.target.value).toISOString()})}/>
        <span>–</span>
        <input type="datetime-local" value={form.end?.slice(0,16)} onChange={e=>setForm({...form, end:new Date(e.target.value).toISOString()})}/>
      </div>
      <div className="row">
        <div className="label">Repeat</div>
        <select value={form.rrule||''} onChange={e=>setForm({...form, rrule:e.target.value||null})}>
          <option value="">No repeat</option>
          <option value="FREQ=DAILY">Daily</option>
          <option value={weeklyByday(new Date(form.start))}>Weekly same day</option>
        </select>
      </div>
      <div className="row">
        <div className="label">Type</div>
        <div className="grid">
          {Object.keys(FLAG_PALETTES).map((k)=>{
            const swatches = (FLAG_PALETTES as any)[k] as string[]
            return (
              <div key={k} className="pill" onClick={()=>setForm({...form, type:k, color: undefined})} style={{borderColor: form.type===k? '#333':'#e6e3df'}}>
                <span style={{fontWeight:600}}>{k}</span>
                {swatches.slice(0,5).map((c,i)=><span key={i} className="flag-swatch" style={{background:c}} />)}
              </div>
            )
          })}
        </div>
      </div>
      <div className="row">
        <div className="label">Location</div>
        <input value={form.location} onChange={e=>setForm({...form, location:e.target.value})} style={{flex:1}}/>
      </div>
      <div className="row">
        <div className="label">Notes</div>
        <input value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} style={{flex:1}}/>
      </div>
      <div className="row" style={{justifyContent:'flex-end'}}>
        <button onClick={save}>Save</button>
      </div>
    </div>
  )
}

function weeklyByday(d: Date){
  const map = ['MO','TU','WE','TH','FR','SA','SU']
  return `FREQ=WEEKLY;BYDAY=${map[(d.getDay()+6)%7]}`
}
