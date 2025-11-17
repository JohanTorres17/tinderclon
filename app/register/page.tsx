"use client"

import React, { useState } from "react"
import { supabase } from "../../lib/supabaseClient"
// Navbar intentionally removed from register page to avoid showing bottom nav here
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [asAdmin, setAsAdmin] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Basic validation
    if (!email || !password) {
      setLoading(false)
      alert("Por favor ingresa email y password")
      return
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      alert(error.message)
      return
    }

    // Try to sign in the user immediately. This ensures we have an authenticated session and a user id.
    try {
      const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({ email, password })
      if (signinError) {
        setLoading(false)
        // If sign-in after signup failed (email confirmation flow), send user to login.
        alert("Registro creado. Revisa tu email para confirmar si aplica. Puedes iniciar sesión luego.")
        router.push("/login")
        return
      }

      // get uid from sign-in response or from auth.getUser()
      let userId: string | undefined = signinData?.user?.id
      if (!userId) {
        const { data: userData } = await supabase.auth.getUser()
        userId = userData.user?.id
      }

      if (userId) {
        // create or update usuarios row (ignore errors if exists)
        try {
          await supabase.from("usuarios").insert([
            { id: userId, nombre: name || "Sin nombre", email, password: password ?? "" },
          ])
        } catch (err) {
          // ignore duplicate/constraint errors; row may already exist
          console.warn("usuarios insert warning (may already exist):", err)
        }

        // If the registrant chose to be an admin (dev-only), create admin row
        if (asAdmin) {
          try {
            // The `admins` table requires nombre, email and password NOT NULL per your schema.
            // Use upsert with the user's id so we create or update the row.
            await supabase.from("admins").upsert([
              { id: userId, nombre: name || email, email: email, password: "" },
            ])
          } catch (err) {
            console.warn("Error inserting/updating admin row:", err)
          }
        }
      }

      setLoading(false)
      router.push("/mvp")
    } catch (e) {
      setLoading(false)
      alert("Registro creado. Revisa tu email para confirmar.")
      router.push("/login")
    }
  }

  return (
    <main>
      <section className="card small">
        <h2>Registro</h2>
        <form onSubmit={handleRegister}>
          <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={asAdmin} onChange={(e) => setAsAdmin(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Registrar como admin (solo para desarrollo)</span>
          </label>
          <button type="submit">{loading ? "Cargando..." : "Crear cuenta"}</button>
        </form>
        <p>
          ¿Ya tienes cuenta? <a href="/login">Entrar</a>
        </p>
      </section>

      <style jsx>{`
        main { display:flex; flex-direction:column; align-items:center; padding:20px }
        .card.small { width:100%; max-width:420px; background:#fff; padding:16px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,0.04)}
        input { width:100%; padding:10px; margin-top:8px; border-radius:8px; border:1px solid #e6e6e6 }
        button { margin-top:10px; width:100%; padding:10px; border-radius:8px; background:#111; color:#fff; border:none }
      `}</style>
    </main>
  )
}
