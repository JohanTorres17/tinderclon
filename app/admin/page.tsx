"use client"

import React, { useEffect, useState } from "react"
import Navbar from "../components/Navbar"
import { supabase } from "../../lib/supabaseClient"

type Usuario = { id: string; nombre?: string; email?: string }
type MatchRow = { id: string; usuario1_id: string; usuario2_id: string; es_match: boolean }

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<Usuario[]>([])
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) { setIsAdmin(false); setLoading(false); return }
      const { data: adminRows } = await supabase.from("admins").select("*").eq("id", uid)
      setIsAdmin((adminRows || []).length > 0)
      if ((adminRows || []).length === 0) { setLoading(false); return }

      const { data: u } = await supabase.from("usuarios").select("id,nombre,email")
      setUsers(u || [])
      const { data: m } = await supabase.from("matches").select("*")
      setMatches(m || [])
      setLoading(false)
    }
    load()
  }, [])

  const deleteUser = async (id: string) => {
    if (!confirm("Eliminar usuario?")) return
    await supabase.from("usuarios").delete().eq("id", id)
    setUsers((s) => s.filter((u) => u.id !== id))
  }

  const deleteMatch = async (id: string) => {
    if (!confirm("Eliminar match?")) return
    await supabase.from("matches").delete().eq("id", id)
    setMatches((m) => m.filter((x) => x.id !== id))
  }

  if (loading) return <main><Navbar /><p style={{padding:20}}>Cargando...</p></main>
  if (!isAdmin) return <main><Navbar /><p style={{padding:20}}>Acceso denegado (no eres admin)</p></main>

  return (
    <main>
      <Navbar />
      <section className="card small">
        <h2>Panel Admin</h2>
        <h3>Usuarios</h3>
        <ul>
          {users.map((u) => (
            <li key={u.id} className="row">{u.nombre} ({u.email}) <button onClick={() => deleteUser(u.id)}>Eliminar</button></li>
          ))}
        </ul>
        <h3>Matches</h3>
        <ul>
          {matches.map((m) => (
            <li key={m.id} className="row">{m.id} — {m.usuario1_id} / {m.usuario2_id} — {m.es_match ? 'MATCH' : 'LIKE'} <button onClick={() => deleteMatch(m.id)}>Eliminar</button></li>
          ))}
        </ul>
      </section>

      <style jsx>{`
        .row { display:flex; gap:12px; align-items:center; margin-top:8px }
        button { margin-left:auto }
      `}</style>
    </main>
  )
}
