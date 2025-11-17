"use client"

import React, { useState } from "react"
import { supabase } from "../../lib/supabaseClient"
// Navbar intentionally removed from login page to avoid showing bottom nav here
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) alert(error.message)
    else {
      router.push("/mvp")
    }
  }

  return (
    <main className="auth-root">
      <section className="card small">
        <h2>Iniciar sesión</h2>
        <form onSubmit={handleLogin}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit">{loading ? "Cargando..." : "Entrar"}</button>
        </form>
        <p className="muted">
          ¿No tienes cuenta? <a href="/register">Regístrate</a>
        </p>
      </section>

      <style jsx>{`
        .auth-root { display:flex; flex-direction:column; align-items:center; padding:24px; min-height:100vh; background:linear-gradient(180deg,#fff,#f8fbff) }
        .card.small { width:100%; max-width:420px; background:linear-gradient(180deg,#ffffff,#fffaf6); padding:18px; border-radius:14px; box-shadow:0 12px 34px rgba(15,23,42,0.08)}
        h2 { margin:0 0 10px 0 }
        input { width:100%; padding:12px; margin-top:10px; border-radius:10px; border:1px solid #eee; background:#fff }
        button { margin-top:14px; width:100%; padding:12px; border-radius:12px; background:linear-gradient(90deg,#ff7a86,#ff4d63); color:#fff; border:none; font-weight:700 }
        .muted { margin-top:10px; color:#666; font-size:13px }
      `}</style>
    </main>
  )
}
