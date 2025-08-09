export async function api(path: string, opts: RequestInit = {}){
  const res = await fetch(path, { headers: { 'Content-Type':'application/json' }, ...opts })
  if(!res.ok) throw new Error(await res.text())
  return res.json()
}

export const Events = {
  list: (from?: string, to?: string) => api(`/api/events${from&&to?`?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`:''}`),
  create: (data:any) => api('/api/events', { method:'POST', body: JSON.stringify(data) }),
  update: (id:string, data:any) => api('/api/events/'+id, { method:'PATCH', body: JSON.stringify(data) }),
  remove: (id:string) => api('/api/events/'+id, { method:'DELETE' })
}

export const Prefs = {
  get: () => api('/api/prefs'),
  save: (data:any) => api('/api/prefs', { method:'PATCH', body: JSON.stringify(data) })
}
