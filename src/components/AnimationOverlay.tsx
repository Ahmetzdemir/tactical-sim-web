// ============================================================
// AnimationOverlay.tsx — Support ability visual animations
// Sits inside the grid <div> (position:relative), so
// left/top percentages map exactly to grid cell positions.
// ============================================================

import { useEffect, useRef, useMemo } from 'react'

export type AbilityAnimation = 'artillery' | 'airstrike' | 'atak' | 'medevac' | null

interface AnimationOverlayProps {
  animation: AbilityAnimation
  targetX: number // 0–1 fraction within grid (left→right)
  targetY: number // 0–1 fraction within grid (top→bottom)
  onDone: () => void
}

// ── Artillery Explosion ─────────────────────────────────────────
// All elements are anchored at (tx, ty) via transform: translate(-50%,-50%)
function ArtilleryAnimation({ tx, ty }: { tx: number; ty: number }) {
  const debris = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2
      const dist = 28 + Math.random() * 45
      return {
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist}px`,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 0.18,
        color: Math.random() > 0.5 ? '#f97316' : '#fcd34d',
      }
    }), [])

  const cx = `${tx * 100}%`
  const cy = `${ty * 100}%`

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* ── Core flash ── */}
      <div className="artillery-flash absolute rounded-full"
        style={{ width: 90, height: 90, left: cx, top: cy, transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(255,240,120,1) 0%, rgba(255,100,0,0.9) 35%, transparent 70%)' }} />

      {/* ── Shockwave rings: wrapper centers at target, inner div animates scale ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)', width: 0, height: 0 }}>
        <div className="artillery-wave absolute rounded-full border-2"
          style={{ width: 140, height: 140, left: -70, top: -70,
            borderColor: 'rgba(255,160,0,0.85)', animationDuration: '0.95s' }} />
        <div className="artillery-wave absolute rounded-full border"
          style={{ width: 90, height: 90, left: -45, top: -45,
            borderColor: 'rgba(255,220,80,0.65)', animationDuration: '0.7s', animationDelay: '0.08s' }} />
      </div>

      {/* ── Smoke pillar ── */}
      <div className="absolute" style={{
        width: 28, height: 70, left: cx, top: cy,
        transform: 'translate(-50%, -110%)',
        background: 'linear-gradient(to top, rgba(80,45,10,0.95), rgba(130,130,130,0.55), transparent)',
        borderRadius: '50% 50% 20% 20%',
        animation: 'artilleryFlash 1.6s ease-out forwards',
        animationDelay: '0.18s', opacity: 0,
      }} />

      {/* ── Debris particles ── */}
      {debris.map((d, i) => (
        <div key={i} className="debris-particle absolute rounded-full"
          style={{
            width: d.size, height: d.size,
            left: cx, top: cy,
            transform: 'translate(-50%,-50%)',
            background: d.color,
            // @ts-ignore
            '--dx': d.dx, '--dy': d.dy,
            animationDelay: `${d.delay}s`,
          } as React.CSSProperties} />
      ))}

      {/* ── Ground scar ── */}
      <div className="absolute rounded-full" style={{
        width: 36, height: 14, left: cx, top: cy,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(ellipse, rgba(100,40,0,0.85) 0%, transparent 70%)',
        animation: 'artilleryFlash 2.2s ease-out forwards',
        animationDelay: '0.25s', opacity: 0,
      }} />
    </div>
  )
}

// ── F-16 Airstrike ──────────────────────────────────────────────
// Plane flies L→R across the target row; bomb falls at tx,ty
function AirstrikeAnimation({ tx, ty }: { tx: number; ty: number }) {
  const cx = `${tx * 100}%`
  const cy = `${ty * 100}%`
  // Plane starts left-of-grid, crosses through (tx, ty), exits right
  // We achieve this by positioning the plane at tx,ty and using CSS translateX animation
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* ── Sonic contrail ── */}
      <div className="sonic-boom absolute"
        style={{
          left: '0', top: cy, transform: 'translateY(-50%)',
          height: 3, width: '55%',
          background: 'linear-gradient(to right, transparent, rgba(180,200,255,0.55), transparent)',
          transformOrigin: 'left center',
        }} />

      {/* ── F-16 silhouette: pivots at (tx,ty) and flies L→R ── */}
      <div className="f16-plane absolute"
        style={{ left: cx, top: cy, transform: 'translate(-50%,-50%)' }}>
        <svg width="72" height="34" viewBox="0 0 72 34" style={{ overflow: 'visible' }}>
          <path d="M 2,17 L 56,14 L 68,17 L 56,20 Z" fill="#c0c0c0" stroke="#888" strokeWidth="0.5" />
          <path d="M 18,17 L 42,3 L 52,17 L 42,31 Z" fill="#a0a0b0" stroke="#888" strokeWidth="0.5" />
          <path d="M 2,17 L 13,7 L 18,17" fill="#8090a0" stroke="#888" strokeWidth="0.5" />
          <ellipse cx="50" cy="16" rx="7" ry="4" fill="#80c0ff" opacity="0.7" />
          <ellipse cx="4" cy="17" rx="3" ry="2" fill="#ff8800" opacity="0.9" />
          {/* Exhaust trail behind engine */}
          <path d="M 0,16 L -30,17" stroke="rgba(255,140,0,0.5)" strokeWidth="2" strokeDasharray="3,4" />
        </svg>
      </div>

      {/* ── Bomb drops straight down from tx,ty (delayed) ── */}
      <div className="bomb-drop absolute"
        style={{ left: cx, top: cy, transform: 'translateX(-50%)' }}>
        <svg width="10" height="22" viewBox="0 0 10 22" style={{ overflow: 'visible' }}>
          <ellipse cx="5" cy="9" rx="4" ry="8" fill="#555" />
          <path d="M 2,1 L 8,1 L 8,3 L 2,3 Z" fill="#888" />
          <path d="M 1,17 L 5,22 L 9,17" fill="#888" />
        </svg>
      </div>

      {/* ── Impact blast at (tx,ty) ── */}
      <div className="strike-blast absolute rounded-full"
        style={{
          width: 110, height: 110, left: cx, top: cy,
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(255,210,60,1) 0%, rgba(255,80,0,0.85) 30%, rgba(200,0,0,0.45) 60%, transparent 80%)',
        }} />

      {/* ── Shockwave from impact: wrapper centers at target ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)', width: 0, height: 0 }}>
        <div className="absolute rounded-full border-2"
          style={{
            width: 170, height: 170, left: -85, top: -85,
            borderColor: 'rgba(255,140,0,0.65)',
            animationDelay: '0.88s', opacity: 0,
            animation: 'artilleryShockwave 1.1s ease-out forwards',
          }} />
      </div>
    </div>
  )
}

// ── ATAK Helicopter Attack Run ──────────────────────────────────
// Helicopter enters from right edge at target row, hovers above (tx,ty), fires, exits left
function AtakAnimation({ tx, ty }: { tx: number; ty: number }) {
  const cx = `${tx * 100}%`
  const cy = `${ty * 100}%`
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* ── ATAK body: wrapper centers at (tx,ty), inner div runs fly animation ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <div className="atak-heli absolute"
          style={{ left: -40, top: -20 }}>
          <svg width="80" height="40" viewBox="0 0 80 40" style={{ overflow: 'visible' }}>
            {/* Main rotor */}
            <g className="rotor-spin" style={{ transformOrigin: '40px 6px' }}>
              <line x1="5" y1="6" x2="75" y2="6" stroke="#ccc" strokeWidth="2" />
              <line x1="40" y1="1" x2="40" y2="11" stroke="#ccc" strokeWidth="2" />
            </g>
            <circle cx="40" cy="6" r="3" fill="#888" />
            <path d="M 10,10 L 65,10 L 70,20 L 65,28 L 10,28 L 5,20 Z" fill="#3a5a3a" stroke="#2a4a2a" strokeWidth="1" />
            <path d="M 55,12 L 68,18 L 65,26 L 55,26 Z" fill="#80c0ff" opacity="0.6" />
            <path d="M 5,20 L -12,18 L -14,22 L 5,22 Z" fill="#2d4a2d" />
            <g className="rotor-spin" style={{ transformOrigin: '-14px 20px' }}>
              <line x1="-14" y1="16" x2="-14" y2="24" stroke="#aaa" strokeWidth="1.5" />
              <line x1="-18" y1="20" x2="-10" y2="20" stroke="#aaa" strokeWidth="1.5" />
            </g>
            <line x1="18" y1="28" x2="18" y2="35" stroke="#555" strokeWidth="1.5" />
            <line x1="50" y1="28" x2="50" y2="35" stroke="#555" strokeWidth="1.5" />
            <line x1="12" y1="35" x2="55" y2="35" stroke="#555" strokeWidth="1.5" />
            <rect x="14" y="22" width="14" height="5" rx="1" fill="#2a3a2a" />
            <rect x="44" y="22" width="14" height="5" rx="1" fill="#2a3a2a" />
            <path d="M 20,18 L 20,14 L 10,12 L 10,16 Z" fill="#2d4a2d" />
            <path d="M 48,18 L 48,14 L 58,12 L 58,16 Z" fill="#2d4a2d" />
          </svg>
        </div>
      </div>

      {/* ── Rocket fire: wrapper at (tx,ty), inner div animates ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <div className="rocket-fire absolute"
          style={{
            left: -60, top: -2,
            height: 4, width: 60,
            background: 'linear-gradient(to left, rgba(255,220,50,1), rgba(255,140,0,0.9), transparent)',
            borderRadius: 2,
            transformOrigin: 'right center',
          }} />
      </div>

      {/* ── Rocket impact: wrapper centers at (tx,ty), inner div animates scale ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <div className="rocket-impact absolute rounded-full"
          style={{
            width: 90, height: 90, left: -45, top: -45,
            background: 'radial-gradient(circle, rgba(255,210,80,1) 0%, rgba(255,80,0,0.85) 35%, rgba(180,0,0,0.45) 65%, transparent 80%)',
          }} />
      </div>

      {/* ── Targeting reticle: wrapper centers at (tx,ty) ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <div className="absolute" style={{ left: -26, top: -26 }}>
          <svg viewBox="0 0 52 52" width="52" height="52">
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,80,0,0.75)"
              strokeWidth="1.5" strokeDasharray="6,3" className="animate-spin" style={{ animationDuration: '3s' }} />
            <line x1="26" y1="4" x2="26" y2="12" stroke="rgba(255,80,0,0.75)" strokeWidth="1.5" />
            <line x1="26" y1="40" x2="26" y2="48" stroke="rgba(255,80,0,0.75)" strokeWidth="1.5" />
            <line x1="4" y1="26" x2="12" y2="26" stroke="rgba(255,80,0,0.75)" strokeWidth="1.5" />
            <line x1="40" y1="26" x2="48" y2="26" stroke="rgba(255,80,0,0.75)" strokeWidth="1.5" />
            <circle cx="26" cy="26" r="3.5" fill="rgba(255,80,0,0.95)" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── MEDEVAC Rescue Helicopter (UH-60) ───────────────────────────
// Enters from left, hovers above (tx,ty), drops winch, exits left
function MedevacAnimation({ tx, ty }: { tx: number; ty: number }) {
  const cx = `${tx * 100}%`
  const cy = `${ty * 100}%`
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* ── Pulse ring: wrapper centers at (tx,ty), inner div animates ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <div className="medevac-ring absolute rounded-full border-2"
          style={{
            width: 72, height: 72, left: -36, top: -36,
            borderColor: 'rgba(0,255,255,0.55)',
          }} />
      </div>

      {/* ── UH-60 body: wrapper centers at (tx,ty), inner div runs fly animation ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <div className="medevac-heli absolute"
          style={{ left: -45, top: -50 }}>
          <div style={{ position: 'relative', width: 90, height: 50 }}>
            <svg width="90" height="44" viewBox="0 0 90 44" style={{ overflow: 'visible' }}>
              <g className="rotor-spin" style={{ transformOrigin: '45px 6px' }}>
                <line x1="8" y1="6" x2="82" y2="6" stroke="#ddd" strokeWidth="2.5" />
                <line x1="45" y1="1" x2="45" y2="11" stroke="#ddd" strokeWidth="2.5" />
              </g>
              <circle cx="45" cy="6" r="3.5" fill="#999" />
              <path d="M 15,10 L 72,10 L 78,22 L 72,32 L 15,32 L 8,22 Z" fill="#2d4a2d" stroke="#1d301d" strokeWidth="1.2" />
              <rect x="38" y="14" width="14" height="4" rx="1" fill="#444" />
              <rect x="43" y="11" width="4" height="10" rx="1" fill="#444" />
              <path d="M 60,12 L 76,20 L 72,30 L 60,30 Z" fill="#a0d4ff" opacity="0.65" />
              <path d="M 8,22 L -14,20 L -16,24 L 8,25 Z" fill="#243b24" stroke="#1d301d" strokeWidth="0.8" />
              <g className="rotor-spin" style={{ transformOrigin: '-16px 22px' }}>
                <line x1="-16" y1="17" x2="-16" y2="27" stroke="#bbb" strokeWidth="1.5" />
                <line x1="-21" y1="22" x2="-11" y2="22" stroke="#bbb" strokeWidth="1.5" />
              </g>
              <line x1="22" y1="32" x2="22" y2="40" stroke="#666" strokeWidth="2" />
              <line x1="56" y1="32" x2="56" y2="40" stroke="#666" strokeWidth="2" />
              <line x1="14" y1="40" x2="64" y2="40" stroke="#666" strokeWidth="2" />
              <circle cx="78" cy="20" r="2" fill="#ff4444" opacity="0.85" />
              <circle cx="15" cy="18" r="2" fill="#44ff44" opacity="0.85" />
            </svg>
            {/* Winch cable */}
            <div className="winch-cable absolute"
              style={{
                left: '50%', top: '100%',
                width: 2, height: 55,
                marginLeft: -1,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(200,200,200,0.5))',
                transformOrigin: 'top center',
              }} />
          </div>
        </div>
      </div>

      {/* ── Helipad landing glow: wrapper centers at (tx,ty) ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <div className="absolute rounded-full border-2 animate-pulse"
          style={{
            width: 36, height: 36, left: -18, top: -18,
            borderColor: 'rgba(0,255,255,0.65)',
            background: 'rgba(0,255,255,0.08)',
          }}>
          <div className="flex items-center justify-center h-full text-[10px] font-bold text-[#00FFFF] font-mono">H</div>
        </div>
      </div>

      {/* ── Downwash glow: wrapper centers at (tx,ty) ── */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <div className="absolute rounded-full"
          style={{
            width: 55, height: 22, left: -27, top: 5,
            background: 'radial-gradient(ellipse, rgba(200,255,255,0.28) 0%, transparent 80%)',
            animation: 'medevacPulse 0.75s ease-in-out infinite',
          }} />
      </div>
    </div>
  )
}

// ── Main Export ─────────────────────────────────────────────────
export function AnimationOverlay({ animation, targetX, targetY, onDone }: AnimationOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!animation) return
    const durations: Record<string, number> = {
      artillery: 1500,
      airstrike: 2200,
      atak: 3000,
      medevac: 4000,
    }
    timerRef.current = setTimeout(() => {
      onDoneRef.current()
    }, durations[animation] ?? 2000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [animation])

  if (!animation) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-[200]" style={{ overflow: 'visible' }}>
      {animation === 'artillery' && <ArtilleryAnimation tx={targetX} ty={targetY} />}
      {animation === 'airstrike' && <AirstrikeAnimation tx={targetX} ty={targetY} />}
      {animation === 'atak'      && <AtakAnimation      tx={targetX} ty={targetY} />}
      {animation === 'medevac'   && <MedevacAnimation   tx={targetX} ty={targetY} />}
    </div>
  )
}
