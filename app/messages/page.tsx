"use client"

import React, { useEffect, useState } from "react"
import Navbar from "../components/Navbar"
import { supabase } from "../../lib/supabaseClient"
import { useSearchParams } from "next/navigation"

type mensajes = { id: string; match_id: string; emisor_id: string; receptor_id: string; contenido: string }
type MatchRow = { id: string; usuario1_id: string; usuario2_id: string; es_match: boolean }
type Usuario = { id: string; nombre?: string; foto_url?: string }

export default function MessagesPage() {
  const params = useSearchParams()
  const matchId = params?.get("match") || null
  const [messages, setMessages] = useState<mensajes[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [currentUid, setCurrentUid] = useState<string | null>(null)
  const [usersMap, setUsersMap] = useState<Record<string, Usuario>>({})

  useEffect(() => {
    const load = async () => {
      if (!matchId) { setLoading(false); return }
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id || null
      setCurrentUid(uid)

      const { data } = await supabase.from("mensajes").select("*").eq("match_id", matchId).order("enviado_en", { ascending: true })
      const msgs = data || []
      setMessages(msgs)

      // load participant users (so each side shows a user/avatar)
      const ids = Array.from(new Set(msgs.flatMap((m: any) => [m.emisor_id, m.receptor_id]).filter(Boolean)))
      if (ids.length > 0) {
        const { data: users } = await supabase.from("usuarios").select("id,nombre,foto_url").in("id", ids)
        const map: Record<string, Usuario> = {}
        ;(users || []).forEach((u: any) => { map[u.id] = u })
        setUsersMap(map)
      }
      setLoading(false)
    }
    load()
  }, [matchId])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matchId || !text) return
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) return
    // fetch match to find receptor
    const { data: matches } = await supabase.from("matches").select("*").eq("id", matchId).single()
    const receptor = matches?.usuario1_id === uid ? matches?.usuario2_id : matches?.usuario1_id
    await supabase.from("mensajes").insert([{ match_id: matchId, emisor_id: uid, receptor_id: receptor, contenido: text }])
    setText("")
    // reload messages
    const { data: newMsgs } = await supabase.from("mensajes").select("*").eq("match_id", matchId).order("enviado_en", { ascending: true })
    const msgs = newMsgs || []
    setMessages(msgs)
    // ensure usersMap includes any new participants
    const ids = Array.from(new Set(msgs.flatMap((m: any) => [m.emisor_id, m.receptor_id]).filter(Boolean)))
    const missing = ids.filter((i) => !usersMap[i])
    if (missing.length > 0) {
      const { data: more } = await supabase.from("usuarios").select("id,nombre,foto_url").in("id", missing)
      if (more) {
        setUsersMap((prev) => {
          const copy = { ...prev }
          ;(more || []).forEach((u: any) => { copy[u.id] = u })
          return copy
        })
      }
    }
  }

  return (
    <main>
      <Navbar />
      <section className="card small">
        <h2>Mensajes</h2>
        {!matchId ? <p className="muted">Selecciona un match desde /matches</p> : loading ? <p className="muted">Cargando...</p> : (
          <div>
            <div className="msgs">
              {messages.map((m) => {
                const isFromMe = currentUid ? m.emisor_id === currentUid : false
                const sender = usersMap[m.emisor_id] || { id: m.emisor_id, nombre: 'Yo', foto_url: '' }
                return (
                  <div key={m.id} className={`msg ${isFromMe ? 'from-me' : 'from-them'}`}>
                    {!isFromMe && <img className="avatar" src={sender.foto_url || 'https://via.placeholder.com/48'} alt={sender.nombre} />}
                    <div className="bubble">
                      <div className="text">{m.contenido}</div>
                      <div className="meta">{!isFromMe ? sender.nombre : 'Tú'}</div>
                    </div>
                    {isFromMe && <img className="avatar" src={usersMap[currentUid || '']?.foto_url || 'https://via.placeholder.com/48'} alt="Yo" />}
                  </div>
                )
              })}
            </div>
            <form onSubmit={send} className="send">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe..." />
              <button type="submit" className="btn sendbtn">Enviar</button>
            </form>
          </div>
        )}
      </section>

      <style jsx>{`
        .muted{ color:var(--muted) }
        .msgs { max-height:360px; overflow:auto; display:flex; flex-direction:column; gap:10px; padding:6px 2px }
        .msg { display:flex; align-items:flex-end; gap:8px }
        .msg.from-them { justify-content:flex-start }
        .msg.from-me { justify-content:flex-end }
        .avatar { width:36px; height:36px; border-radius:999px; object-fit:cover }
        .bubble { max-width:74%; padding:10px 12px; border-radius:12px; background:#f1f1f1 }
        .msg.from-me .bubble { background:linear-gradient(90deg,var(--accent-2),var(--accent)); color:white }
        .meta { font-size:11px; margin-top:6px; opacity:0.85 }
        .send { display:flex; gap:8px; margin-top:12px; align-items:center }
        input { flex:1; padding:12px; border-radius:12px; border:1px solid #eee }
        .sendbtn{ background:linear-gradient(90deg,var(--accent-2),var(--accent)); color:white; border:none; padding:10px 14px; border-radius:12px }
      `}</style>
    </main>
  )
}
