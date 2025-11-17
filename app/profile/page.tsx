"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import Navbar from "../components/Navbar"
import { useRouter } from "next/navigation"

type Usuario = {
  id: string
  nombre?: string
  email?: string
  edad?: number
  genero?: string
  descripcion?: string
  foto_url?: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData.user?.id
      if (!uid) {
        setLoading(false)
        setUser(null)
        return
      }
      const { data } = await supabase.from("usuarios").select("*").eq("id", uid).single()
      if (!data) {
        // If there is no usuarios row yet, create a minimal one so the profile can be edited immediately.
        // Ensure email is never null because the DB enforces NOT NULL on email.
        const email = authData.user?.email ?? ""
        const insert = {
          id: uid,
          nombre: authData.user?.user_metadata?.full_name || "",
          email,
          password: "",
          genero: (authData.user?.user_metadata as any)?.gender || "Otro",
        }
        const { error: insertErr } = await supabase.from("usuarios").insert(insert)
        if (insertErr) {
          console.error("Error creating usuarios row:", insertErr)
        }
        setUser({ id: uid, nombre: insert.nombre, email })
      } else {
        setUser(data || null)
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id
      if (!uid) return
      const { data: admins } = await supabase.from("admins").select("id").eq("id", uid).limit(1)
      setIsAdmin((admins || []).length > 0)
    }
    checkAdmin()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    // Build payload with only defined fields to avoid sending nulls that violate DB constraints
    const payload: any = { id: user.id }
    // Include fields only when present (use empty string for email to satisfy NOT NULL if missing)
    payload.email = user.email ?? ""
    if (user.nombre !== undefined) payload.nombre = user.nombre
    // password column exists in your schema; keep as empty string to avoid NOT NULL violations
    payload.password = ""
    // Ensure genero is present and provide a sensible default if missing
    payload.genero = user.genero ?? "Otro"
    if (user.edad !== undefined && user.edad !== null) payload.edad = user.edad
    if (user.genero) payload.genero = user.genero
    if (user.descripcion) payload.descripcion = user.descripcion
    if (user.foto_url) payload.foto_url = user.foto_url

    const { data: result, error } = await supabase.from("usuarios").upsert(payload)
    setLoading(false)
    if (error) {
      console.error("Error saving profile:", error)
      alert("Error al guardar: " + error.message)
      return
    }
    setUser(result && result[0] ? (result[0] as Usuario) : user)
    alert("Perfil guardado")
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const { error } = await supabase.auth.signOut()
      setLoggingOut(false)
      if (error) {
        console.error("Error signing out:", error)
        alert("Error al cerrar sesión: " + error.message)
        return
      }
      setUser(null)
      router.push('/login')
    } catch (err) {
      setLoggingOut(false)
      console.error(err)
      alert('Error al cerrar sesión')
    }
  }

  if (loading) return <main><Navbar /><p style={{padding:20}}>Cargando...</p></main>

  if (!user) return <main><Navbar /><p style={{padding:20}}>No autenticado</p></main>

  return (
    <main>
      <Navbar />
      <section className="card small profile-card">
        <h2>Mi perfil</h2>
        <div className="top">
          <img className="avatar" src={user.foto_url || "https://via.placeholder.com/160"} alt={user.nombre} />
          <div className="meta-top">
            <div className="name">{user.nombre}</div>
            <div className="email muted">{user.email}</div>
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div className="fields">
            <input value={user.nombre || ""} onChange={(e) => setUser({...user, nombre: e.target.value})} placeholder="Nombre" />
            <input type="number" value={user.edad || ""} onChange={(e) => setUser({...user, edad: Number(e.target.value)})} placeholder="Edad" />
            <input value={user.genero || ""} onChange={(e) => setUser({...user, genero: e.target.value})} placeholder="Género" />
            <input placeholder="Foto URL" value={user.foto_url || ""} onChange={(e) => setUser({...user, foto_url: e.target.value})} />
            <textarea value={user.descripcion || ""} onChange={(e) => setUser({...user, descripcion: e.target.value})} placeholder="Descripción" />
          </div>
          <button type="submit">{loading ? "Guardando..." : "Guardar"}</button>
        </form>
        {isAdmin && (
          <div style={{marginTop:12}}>
            <a href="/admin" className="admin-link">Ir al panel Admin</a>
          </div>
        )}
        <div style={{marginTop:12}}>
          <button type="button" className="logout-button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      </section>

      <style jsx>{`
        main { display:flex; flex-direction:column; align-items:center; padding:20px }
        .card.small { width:100%; max-width:420px; background:linear-gradient(180deg,#ffffff,#fffaf6); padding:16px; border-radius:12px; box-shadow:0 12px 32px rgba(15,23,42,0.06)}
        .profile-card .top { display:flex; gap:12px; align-items:center }
        .profile-card .avatar { width:84px; height:84px; border-radius:999px; object-fit:cover; box-shadow:0 8px 24px rgba(12,18,28,0.08) }
        .profile-card .meta-top { display:flex; flex-direction:column }
        .profile-card .name { font-weight:800; font-size:18px }
        .muted{ color:var(--muted) }
        .fields { display:flex; flex-direction:column; gap:10px; margin-top:12px }
        input, textarea { width:100%; padding:12px; margin-top:0; border-radius:10px; border:1px solid #eee }
        textarea { min-height:100px }
        button { margin-top:10px; width:100%; padding:12px; border-radius:12px; background:linear-gradient(90deg,var(--accent-2),var(--accent)); color:#fff; border:none; font-weight:700 }
        .logout-button { margin-top:8px; width:100%; padding:10px; border-radius:10px; background:#fff; color:#111; border:1px solid #e6e6e6; font-weight:700 }
        .logout-button:disabled { opacity:0.6 }
        .admin-link { display:inline-block; margin-top:8px; padding:8px 12px; border-radius:8px; background:linear-gradient(90deg,#ffd166,#ffb347); color:#111; text-decoration:none }
      `}</style>
    </main>
  )
}
