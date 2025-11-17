"use client"

import Link from "next/link"
import React, { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"

export default function Navbar() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Allow hiding the navbar in development by setting NEXT_PUBLIC_HIDE_NAVBAR=1
  const hideNavbar = (process.env.NEXT_PUBLIC_HIDE_NAVBAR || "") === "1"
  if (hideNavbar) return null

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id || null
      setUserId(uid)
      if (!uid) return
      const { data: admins } = await supabase.from("admins").select("id").eq("id", uid).limit(1)
      setIsAdmin((admins || []).length > 0)
    }
    check()
  }, [])

  return (
    <>
      <nav className="bottom-nav">
        <Link href="/mvp" className="item">
          <span className="icon">🏠</span>
          <span className="label">Descubrir</span>
        </Link>
        <Link href="/likes" className="item">
          <span className="icon">💙</span>
          <span className="label">Likes</span>
        </Link>
        <Link href="/matches" className="item">
          <span className="icon">🔥</span>
          <span className="label">Matches</span>
        </Link>
        <Link href="/messages" className="item">
          <span className="icon">✉️</span>
          <span className="label">Mensajes</span>
        </Link>
        <Link href="/profile" className="item">
          <span className="icon">👤</span>
          <span className="label">Perfil</span>
        </Link>
        {isAdmin && (
          <Link href="/admin" className="item admin">
            <span className="icon">🛠️</span>
            <span className="label">Admin</span>
          </Link>
        )}
      </nav>

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: calc(12px + env(safe-area-inset-bottom));
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 10px;
          z-index: 80;
          pointer-events: auto;
          backdrop-filter: blur(8px) saturate(120%);
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.55));
          border-radius: 999px;
          box-shadow: 0 16px 40px rgba(15,23,42,0.12);
          align-items: center;
        }
        .item {
          display:flex; flex-direction:column; align-items:center; gap:4px;
          padding:8px 10px; border-radius:10px; text-decoration:none; color:#111; min-width:64px; transition:transform .18s ease, background .18s ease;
        }
        .bottom-nav a, .item, .item:link, .item:visited { text-decoration: none !important; }
        .item:hover { transform:translateY(-4px) }
        .icon{ font-size:20px }
        .label{ font-size:11px }
        .admin { background: linear-gradient(90deg,#fff4e0,#fff0c2); box-shadow: inset 0 -4px 12px rgba(0,0,0,0.03) }
      `}</style>
    </>
  )
}
