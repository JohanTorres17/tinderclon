"use client"

import React, { useEffect, useState } from "react"
import Navbar from "../components/Navbar"
import { supabase } from "../../lib/supabaseClient"

type Usuario = { id: string; nombre?: string; foto_url?: string }
type MatchRow = { id: string; usuario1_id: string; usuario2_id: string; es_match: boolean }

export default function LikesPage() {
  const [likes, setLikes] = useState<Usuario[]>([])
  const [received, setReceived] = useState<Array<{match: MatchRow; user: Usuario}>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData.user?.id
      if (!uid) { setLoading(false); return }

      // Likes sent by me (from `likes` table)
      const { data: sentRows } = await supabase.from("likes").select("*").eq("emisor_id", uid)
      const sentOtherIds = (sentRows || []).map((r: any) => r.receptor_id)
      const sentUsers = sentOtherIds.length > 0 ? (await supabase.from("usuarios").select("id,nombre,foto_url").in("id", sentOtherIds)).data || [] : []

      // Likes received (other users liked me) from `likes` table
      const { data: recvRows } = await supabase.from("likes").select("*").eq("receptor_id", uid)
      const recvOtherIds = (recvRows || []).map((r: any) => r.emisor_id)
      const recvUsers = recvOtherIds.length > 0 ? (await supabase.from("usuarios").select("id,nombre,foto_url").in("id", recvOtherIds)).data || [] : []

      // Map sent users to likes list and received to received list with like id
      setLikes(sentUsers || [])
      const receivedPairs = (recvRows || []).map((r: any) => ({ match: { id: r.id, usuario1_id: r.emisor_id, usuario2_id: r.receptor_id, es_match: false }, user: (recvUsers || []).find((u: Usuario) => u.id === r.emisor_id) || { id: r.emisor_id, nombre: "Unknown" } }))
      setReceived(receivedPairs)
      setLoading(false)
    }
    load()
  }, [])

  const cancelLike = async (targetId: string) => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id
      if (!uid) return
      const { error } = await supabase.from("likes").delete().eq("emisor_id", uid).eq("receptor_id", targetId)
      if (error) {
        console.error("Error deleting like:", error)
        alert("Error al cancelar like: " + error.message)
        return
      }
      setLikes((l) => l.filter((u) => u.id !== targetId))
    } catch (err) {
      console.error(err)
      alert('Error al cancelar like')
    }
  }

  const acceptLike = async (matchId: string, fromUserId: string) => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id
      if (!uid) return
      // Remove the like row and create match records in `matches` for both users
      const { error: e1 } = await supabase.from("likes").delete().eq("id", matchId)
      if (e1) {
        console.error("Error deleting like when accepting:", e1)
      }
      // create mutual matches
      const { error: eMatch } = await supabase.from("matches").insert([
        { usuario1_id: uid, usuario2_id: fromUserId, es_match: true },
        { usuario1_id: fromUserId, usuario2_id: uid, es_match: true },
      ])
      if (eMatch) {
        console.error("Error creating match records:", eMatch)
        alert("Error al crear match: " + eMatch.message)
        return
      }
      // also remove any reciprocal like (if exists)
      try {
        await supabase.from("likes").delete().eq("emisor_id", uid).eq("receptor_id", fromUserId)
      } catch (err) {
        // ignore
      }
      // remove from received UI
      setReceived((r) => r.filter((p) => p.match.id !== matchId))
      alert("Has hecho match! Ahora puedes enviar mensajes")
    } catch (err) {
      console.error(err)
      alert('Error al aceptar like')
    }
  }

  const rejectLike = async (matchId: string) => {
    try {
      const { error } = await supabase.from("likes").delete().eq("id", matchId)
      if (error) console.error("Error rejecting like:", error)
      setReceived((r) => r.filter((p) => p.match.id !== matchId))
    } catch (err) {
      console.error(err)
      alert('Error al rechazar like')
    }
  }

  return (
    <main>
      <Navbar />
      <section className="card small">
        <h2>Likes enviados</h2>
        {loading ? <p className="muted">Cargando...</p> : likes.length === 0 ? <p className="muted">No tienes likes pendientes</p> : (
          <ul className="list">
            {likes.map((u) => (
              <li key={u.id} className="row">
                <img src={u.foto_url || "/placeholder.svg"} alt={u.nombre} />
                <div className="info">
                  <div className="name">{u.nombre}</div>
                </div>
                <button className="btn cancel" onClick={() => cancelLike(u.id)}>Cancelar</button>
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
        .btn.cancel{ margin-left:auto; background:transparent; border:1px solid #eee; padding:8px 10px; border-radius:10px }
      `}</style>
    </main>
  )
}
