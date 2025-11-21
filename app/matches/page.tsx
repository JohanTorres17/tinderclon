"use client"

import React, { useEffect, useState } from "react"
import Navbar from "../components/Navbar"
import { supabase } from "../../lib/supabaseClient"

type MatchRow = { id: string; usuario1_id: string; usuario2_id: string; es_match: boolean }
type Usuario = { id: string; nombre?: string; foto_url?: string }

export default function MatchesPage() {
  const [matches, setMatches] = useState<Array<{match: MatchRow; other: Usuario}>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData.user?.id
      if (!uid) { setLoading(false); return }
      const { data: rows } = await supabase.from("matches").select("*").or(`usuario1_id.eq.${uid},usuario2_id.eq.${uid}`).eq("es_match", true)
      const otherIds: string[] = []
      ;(rows || []).forEach((r) => { otherIds.push(r.usuario1_id === uid ? r.usuario2_id : r.usuario1_id) })
      if (otherIds.length === 0) { setMatches([]); setLoading(false); return }
      const { data: users } = await supabase.from("usuarios").select("id,nombre,foto_url").in("id", otherIds)

      const pairs = (rows || []).map((r) => ({ match: r, other: (users || []).find((u) => u.id === (r.usuario1_id === uid ? r.usuario2_id : r.usuario1_id)) || { id: "", nombre: "Unknown" } }))
      setMatches(pairs)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main>
      <Navbar />
      <section className="card small">
        <h2>Matches</h2>
        {loading ? <p className="muted">Cargando...</p> : matches.length === 0 ? <p className="muted">No tienes matches aún</p> : (
          <ul className="list">
            {matches.map((m) => (
              <li key={m.match.id} className="row">
                <img src={m.other.foto_url || "/placeholder.svg"} alt={m.other.nombre} />
                <div className="info"><div className="name">{m.other.nombre}</div></div>
                <a className="btn chat" href={`/messages?match=${m.match.id}`}>Abrir chat</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <style jsx>{`
        .muted{ color:var(--muted) }
        .list { list-style:none; padding:0; margin:8px 0 0 0 }
        .row { display:flex; gap:12px; align-items:center; margin-top:12px; padding:10px; background:linear-gradient(180deg,#fff,#fff); border-radius:10px }
        img { width:64px; height:64px; object-fit:cover; border-radius:999px; box-shadow:0 6px 18px rgba(12,18,28,0.08) }
        .info { display:flex; flex-direction:column }
        .name { font-weight:700 }
        .btn.chat{ margin-left:auto; background:linear-gradient(90deg,var(--accent-2),var(--accent)); color:white; padding:8px 12px; border-radius:10px; text-decoration:none }
      `}</style>
    </main>
  )
}
