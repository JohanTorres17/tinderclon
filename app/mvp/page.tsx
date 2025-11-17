"use client"

import React, { useEffect, useRef, useState } from "react"
import Navbar from "../components/Navbar"
import { supabase } from "../../lib/supabaseClient"

type Profile = {
	id: string
	nombre?: string
	edad?: number
	descripcion?: string
	foto_url?: string
}

export default function Page() {
	const [profiles, setProfiles] = useState<Profile[]>([])
	const [drag, setDrag] = useState({ x: 0, y: 0, rot: 0 })
	const [isDragging, setIsDragging] = useState(false)
	const topRef = useRef<HTMLDivElement | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const load = async () => {
			const { data: auth } = await supabase.auth.getUser()
			const uid = auth.user?.id
			if (!uid) { setProfiles([]); setLoading(false); return }

			// fetch matches involving user to avoid showing already seen
			const { data: seen } = await supabase.from("matches").select("usuario1_id,usuario2_id").or(`usuario1_id.eq.${uid},usuario2_id.eq.${uid}`)
			const seenIds = new Set<string>()
			;(seen || []).forEach((r: any) => { if (r.usuario1_id) seenIds.add(r.usuario1_id); if (r.usuario2_id) seenIds.add(r.usuario2_id) })
			seenIds.add(uid)

			// fetch users excluding seenIds
			const excluded = Array.from(seenIds)
			let usersQuery = supabase.from("usuarios").select("id,nombre,edad,descripcion,foto_url").limit(20)
			if (excluded.length > 0) usersQuery = usersQuery.not("id", "in", `(${excluded.join(",")})`)
			const { data: users } = await usersQuery
			setProfiles((users as Profile[]) || [])
			setLoading(false)
		}
		load()
	}, [])

	const handleAction = async (dir: "left" | "right") => {
		const top = profiles[profiles.length - 1]
		const { data: auth } = await supabase.auth.getUser()
		const uid = auth.user?.id
		if (!top || !uid) return

		if (dir === "right") {
			// Insert into the new `likes` table (emisor -> receptor)
			try {
				const { error: insertErr } = await supabase.from("likes").insert({ emisor_id: uid, receptor_id: top.id })
				if (insertErr) {
					// ignore unique constraint error if already liked
					if (!/unique/i.test(insertErr.message || "")) {
						console.error("Error inserting like:", insertErr)
						alert("Error al dar like: " + insertErr.message)
					}
				}
			} catch (err) {
				console.error("Insert like failed:", err)
			}

			// check reciprocal like in the `likes` table
			const { data: reciprocalRows } = await supabase.from("likes").select("*").eq("emisor_id", top.id).eq("receptor_id", uid).limit(1)
			const reciprocal = (reciprocalRows && reciprocalRows[0]) || null
			if (reciprocal) {
				// create match records for both users in `matches` and remove likes
				try {
					await supabase.from("matches").insert([
						{ usuario1_id: uid, usuario2_id: top.id, es_match: true },
						{ usuario1_id: top.id, usuario2_id: uid, es_match: true },
					])
					// delete likes between them
					await supabase.from("likes").delete().or(`(emisor_id.eq.${uid},receptor_id.eq.${top.id}),(emisor_id.eq.${top.id},receptor_id.eq.${uid})`)
					alert("¡Es un match!")
				} catch (err) {
					console.error("Error creating match from reciprocal likes:", err)
				}
			}
		} else {
			// dislike/pass: do not record anything in the DB, just skip to next profile
			// This makes the X button simply move to the next card without creating a "non-match" record.
		}

		// remove top profile from local stack
		setProfiles((p) => p.slice(0, -1))
		setDrag({ x: 0, y: 0, rot: 0 })
		setIsDragging(false)
	}

	// touch/drag handlers (mobile friendly)
	let startX = 0
	let startY = 0

	const onTouchStart: React.TouchEventHandler = (e) => {
		const t = e.touches[0]
		startX = t.clientX
		startY = t.clientY
		setIsDragging(true)
	}

	const onTouchMove: React.TouchEventHandler = (e) => {
		if (!isDragging) return
		const t = e.touches[0]
		const dx = t.clientX - startX
		const dy = t.clientY - startY
		const rot = Math.max(-30, Math.min(30, dx / 10))
		setDrag({ x: dx, y: dy, rot })
	}

	const onTouchEnd: React.TouchEventHandler = () => {
		const threshold = 120
		if (drag.x > threshold) {
			handleAction("right")
		} else if (drag.x < -threshold) {
			handleAction("left")
		} else {
			// reset
			setDrag({ x: 0, y: 0, rot: 0 })
			setIsDragging(false)
		}
	}

	const reset = () => window.location.reload()

	return (
		<main className="mvp-root">
			<Navbar />
			<header className="mvp-header">
				<h1>Tinder</h1>
			</header>

			<section className="card-area">
				{loading && <p className="loading">Cargando perfiles...</p>}
				{!loading && profiles.length === 0 && (
					<div className="no-more">
						<p>No hay más perfiles</p>
						<button onClick={reset} className="reset-btn">
							Reiniciar
						</button>
					</div>
				)}

				{profiles.map((profile, idx) => {
					const isTop = idx === profiles.length - 1
					const offset = (idx - (profiles.length - 1)) * 10
					const style: React.CSSProperties = isTop
						? {
								transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.rot}deg)`,
							}
						: { transform: `scale(${1 + offset / 100}) translateY(${Math.abs(offset)}px)` }

					return (
						<div
							key={profile.id}
							className={`card ${isTop ? "top" : "stack"}`}
							style={style}
							ref={isTop ? topRef : null}
							onTouchStart={isTop ? onTouchStart : undefined}
							onTouchMove={isTop ? onTouchMove : undefined}
							onTouchEnd={isTop ? onTouchEnd : undefined}
						>
							<div className="media">
								<img src={profile.foto_url || "https://via.placeholder.com/600"} alt={profile.nombre} className="avatar" />
								{isTop && (
									<>
										<span className="overlay like" style={{ opacity: Math.max(0, Math.min(1, drag.x / 120)), transform: `translateX(${Math.min(60, drag.x / 3)}px) scale(${Math.max(0.9, Math.min(1.08, 1 + Math.abs(drag.x) / 800))})` }}>❤</span>
										<span className="overlay nope" style={{ opacity: Math.max(0, Math.min(1, -drag.x / 120)), transform: `translateX(${Math.max(-60, drag.x / 3)}px) scale(${Math.max(0.9, Math.min(1.08, 1 + Math.abs(drag.x) / 800))})` }}>✖</span>
									</>
								)}
								<div className="gradient" />
								<div className="badge">{profile.edad}</div>
							</div>
							<div className="meta">
								<div className="name">{profile.nombre}</div>
								<div className="bio">{profile.descripcion}</div>
							</div>
						</div>
					)
				})}
			</section>

			<footer className="mvp-actions">
				<button className="btn dislike" onClick={() => handleAction("left")}>✖</button>
				<button className="btn super" onClick={() => alert("Super not implemented — placeholder")}>⭐</button>
				<button className="btn like" onClick={() => handleAction("right")}>❤</button>
			</footer>

			<style jsx>{`
				.mvp-root {
					display: flex;
					flex-direction: column;
					align-items: center;
					padding: 12px;
					min-height: 100vh;
					box-sizing: border-box;
					background: linear-gradient(180deg, #fff 0%, #f7f7fb 100%);
					font-family: Inter, Roboto, system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial;
				}
				.mvp-header { text-align: center; margin-bottom: 8px }
				.mvp-header h1 { margin: 6px 0; font-size: 20px }
				.subtitle { margin: 0; color: #666; font-size: 12px }

				.card-area {
					width: 100%;
					max-width: 420px;
					height: 72vh;
					position: relative;
					display: flex;
					align-items: center;
					justify-content: center;
				}

				.card {
					position: absolute;
					width: 92%;
					max-width: 380px;
					height: 84%;
					background: linear-gradient(180deg, #ffffff, #fffaf6);
					border-radius: 20px;
					box-shadow: 0 14px 40px rgba(15, 23, 42, 0.15);
					overflow: hidden;
					display: flex;
					flex-direction: column;
					transition: transform 220ms cubic-bezier(.2,.9,.2,1);
					will-change: transform;
				}

				.card.stack { transform-origin: center; filter: saturate(0.98) brightness(0.99); }

				.card.top { z-index: 30 }

				.media { position:relative; height:64%; overflow:hidden }
				.avatar {
					width:100%; height:100%; object-fit:cover; display:block
				}
				.overlay { position:absolute; top:18%; font-size:56px; padding:8px 12px; border-radius:12px; font-weight:900; pointer-events:none; transition:opacity 120ms linear, transform 120ms linear }
				.overlay.like { left:18px; color: rgba(255,255,255,0.95); text-shadow: 0 6px 22px rgba(255,77,99,0.18) }
				.overlay.nope { right:18px; color: rgba(255,255,255,0.95); text-shadow: 0 6px 22px rgba(0,0,0,0.25) }
				.gradient { position:absolute; left:0; right:0; bottom:0; height:40%; background:linear-gradient(180deg, transparent, rgba(0,0,0,0.45)); }
				.badge { position:absolute; right:12px; bottom:12px; background:rgba(255,255,255,0.9); padding:6px 10px; border-radius:999px; font-weight:700 }

				.meta { padding:14px }
				.name { font-weight:800; font-size:20px; color:#0b1220 }
				.bio { margin-top:6px; color:#394047; font-size:14px }

				.mvp-actions {
					width: 100%;
					max-width: 420px;
					display: flex;
					justify-content: space-evenly;
					gap: 18px;
					margin-top: 12px;
					padding-bottom: 18px;
				}

				.btn {
					width: 66px;
					height: 66px;
					border-radius: 999px;
					border: none;
					font-size: 22px;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					box-shadow: 0 10px 30px rgba(15,23,42,0.12);
				}
				.btn.like { background: linear-gradient(180deg,#ff7a86,#ff4d63); color: white }
				.btn.dislike { background: #fff; color: #444; border:1px solid #eee }
				.btn.super { background: linear-gradient(90deg,#ffd166,#ffb347); color: #2b2b2b }

				.no-more { text-align: center }
				.reset-btn { margin-top: 8px; padding: 8px 12px; border-radius: 12px; border: 0; background:#111; color:#fff }
				.loading { color:#666; margin-bottom:6px }

				@media (min-width: 700px) {
					.mvp-root { padding: 24px }
				}
				/* make room for bottom nav */
				:global(body) { padding-bottom: 90px }
			`}</style>
		</main>
	)
}

