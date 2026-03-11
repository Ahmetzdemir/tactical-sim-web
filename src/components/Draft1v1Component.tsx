import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { SoldierRole } from '../engine/types'
import { db } from '../services/firebase'
import { ref, onValue, remove } from 'firebase/database'

const UNIT_ROSTER = [
  { role: SoldierRole.RIFLEMAN,  name: '🪖 Standart Piyade',     cost: 100, desc: 'Dengeli, çok sayıda alınabilir.' },
  { role: SoldierRole.ENGINEER,  name: '🔧 İstihkam / Mühendis', cost: 150, desc: 'Zırh delici. Tanklara karşı etkili.' },
  { role: SoldierRole.MG,        name: '🔫 Makineli Tüfek',      cost: 150, desc: 'Baskı ateşi. Savunmada güçlü.' },
  { role: SoldierRole.SNIPER,    name: '🎯 Keskin Nişancı',      cost: 200, desc: '%30 kritik vuruş. Uzun menzil.' },
  { role: SoldierRole.MEDIC,     name: '💉 Sağlık Görevlisi',    cost: 150, desc: 'Yaralıları iyileştirir.' },
  { role: SoldierRole.ARMORED,   name: '🛡️ Tank / Zırhlı',       cost: 400, desc: 'Ağır zırh ve güçlü ateş.' },
]

// ── Map Cell for placement ────────────────────────────────────
function MapCell({ x, y, occupied, isCapture, isMyZone, onPlace }: {
  x: number; y: number; occupied: boolean; isCapture: boolean; isMyZone: boolean; onPlace: (x: number, y: number) => void
}) {
  return (
    <div
      onClick={() => !occupied && isMyZone && onPlace(x, y)}
      title={`(${x},${y})`}
      className={[
        'w-full aspect-square border flex items-center justify-center text-[8px] font-black transition-all',
        occupied       ? 'bg-mil-cyan/30 border-mil-cyan cursor-default'     : '',
        isCapture      ? 'bg-mil-yellow/30 border-mil-yellow animate-pulse'  : '',
        !occupied && isMyZone  ? 'border-white/10 hover:bg-green-500/20 hover:border-green-400 cursor-pointer' : '',
        !occupied && !isMyZone ? 'border-white/5 opacity-30 cursor-not-allowed'                                : '',
      ].join(' ')}
    >
      {occupied && '⚔️'}
      {isCapture && !occupied && '🚩'}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export function Draft1v1Component() {
  const {
    isHost, multiplayerRoomId,
    engine,
    buyUnit1v1, placeUnit1v1, setReady1v1, endTurn1v1,
    setAppPhase,
  } = useGameStore()

  const [localPhase, setLocalPhase] = useState<'draft' | 'placement' | 'playing' | 'ended'>('draft')
  const [placingRole, setPlacingRole] = useState<SoldierRole | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const playerId = isHost ? 'host' : 'guest'

  // Sync game state from engine
  const gameState = engine?.getState?.()
  const budget = isHost ? (gameState?.hostBudget ?? 1000) : (gameState?.guestBudget ?? 1000)
  const activePlayerId = gameState?.activePlayerId ?? 'host'
  const isMyTurn = activePlayerId === playerId
  const unitsMap = gameState?.units ?? new Map()
  const unitsArray = Array.from(unitsMap.values())

  // Auto-switch to playing appPhase when matchPhase hits PLAYING
  useEffect(() => {
    if (gameState?.matchPhase === 'PLAYING') {
      setAppPhase('playing')
    }
  }, [gameState?.matchPhase, setAppPhase])

  // Listen to Firebase for phase changes
  useEffect(() => {
    if (!multiplayerRoomId) return
    const phaseRef = ref(db, `rooms/${multiplayerRoomId}/gameState/matchPhase`)
    return onValue(phaseRef, (snap) => {
      const val = snap.val()
      if (val === 'DRAFTING')   setLocalPhase('draft')
      if (val === 'PLACEMENT')  setLocalPhase('placement')
      if (val === 'PLAYING')    setLocalPhase('playing')
      if (val === 'ENDED')      setLocalPhase('ended')
    })
  }, [multiplayerRoomId])

  // Sync engine state
  useEffect(() => {
    if (!engine) return
    const unsubscribe = engine.subscribe?.(() => {
      const s = engine.getState?.()
      if (!s) return
      if (s.matchPhase === 'PLACEMENT') setLocalPhase('placement')
      if (s.matchPhase === 'PLAYING')   setLocalPhase('playing')
      if (s.matchPhase === 'ENDED')     setLocalPhase('ended')
    })
    return () => unsubscribe?.()
  }, [engine])

  const handleBuy = async (role: SoldierRole, cost: number) => {
    if (budget < cost) { setStatusMsg('❌ Yetersiz bütçe!'); return }
    await buyUnit1v1(playerId, role, cost)
    setStatusMsg(`✅ ${UNIT_ROSTER.find(u => u.role === role)?.name} alındı.`)
  }

  const handlePlaceClick = (x: number, y: number) => {
    if (!placingRole) { setStatusMsg('⚠️ Önce bir birim seçin!'); return }
    placeUnit1v1(playerId, placingRole, x, y)
    setPlacingRole(null)
    setStatusMsg(`📍 Birim yerleştirildi.`)
  }

  const handleReady = async () => {
    await setReady1v1(playerId)
  }

  const isHostReady = gameState?.hostReady
  const isGuestReady = gameState?.guestReady
  const isIReady = isHost ? isHostReady : isGuestReady

  useEffect(() => {
    if (isHostReady && !isGuestReady) {
      setStatusMsg(isHost ? '⏳ Rakip (Misafir) bekleniyor...' : '✅ Hazırsınız, Rakip (Ev Sahibi) bekleniyor...')
    } else if (!isHostReady && isGuestReady) {
      setStatusMsg(isHost ? '✅ Rakip hazır, sizin onayınız bekleniyor...' : '⏳ Rakip (Ev Sahibi) bekleniyor...')
    } else if (isHostReady && isGuestReady) {
      setStatusMsg('🚀 Her iki taraf da hazır! Başlanıyor...')
    } else {
      setStatusMsg('')
    }
  }, [isHostReady, isGuestReady, isHost])

  const handleEndTurn = async () => {
    if (!isMyTurn) return
    await endTurn1v1()
    setStatusMsg('🔄 Sıra rakibe geçti.')
  }

  const handleExit = async () => {
    if (multiplayerRoomId) {
      if (isHost) {
        // Delete room entirely if Host leaves
        await remove(ref(db, `rooms/${multiplayerRoomId}`))
      } else {
        // Just remove Guest from room
        await remove(ref(db, `rooms/${multiplayerRoomId}/guest`))
      }
    }
    setAppPhase('multiplayer-lobby')
  }

  // ── Victory/Defeat screen ────────────────────────────────────
  if (localPhase === 'ended') {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 font-mono">
        <div className="text-6xl mb-4">{gameState?.victoryAchieved ? '🏆' : '💀'}</div>
        <h1 className="text-mil-yellow text-3xl font-black tracking-widest mb-4">
          {gameState?.victoryAchieved ? 'ZAFER!' : 'YENİLGİ'}
        </h1>
        <button onClick={handleExit} className="mt-6 px-8 py-3 bg-mil-cyan text-mil-bg font-black tracking-widest hover:bg-white transition-all">
          LOBİYE DÖN
        </button>
      </div>
    )
  }

  // ── PLAYING: Turn indicator overlay ─────────────────────────
  const TurnIndicator = localPhase === 'playing' && (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2 border-2 font-black tracking-widest text-sm shadow-lg
      ${isMyTurn ? 'bg-mil-cyan text-mil-bg border-mil-cyan animate-pulse' : 'bg-mil-panel text-mil-dim border-mil-border'}`}>
      {isMyTurn ? '⚔️ SIRANIZ! Birimlerinizi hareket ettirin.' : '⏳ Rakip oynuyor...'}
      {isMyTurn && (
        <button
          onClick={handleEndTurn}
          className="ml-4 px-3 py-1 bg-mil-bg border border-mil-cyan text-mil-cyan text-xs hover:bg-mil-cyan hover:text-mil-bg transition-all"
        >
          TURU BİTİR
        </button>
      )}
    </div>
  )

  // ── PLACEMENT phase ──────────────────────────────────────────
  if (localPhase === 'placement') {
    const myUnits = unitsArray.filter((u: any) => u.ownerId === playerId || u.getOwnerId?.() === playerId)
    const myZoneRows = isHost ? [13, 14] : [0, 1]
    const MAP_SIZE = 15
    return (
      <div className="fixed inset-0 bg-mil-darker flex flex-col items-center justify-center z-50 font-mono p-4">
        {TurnIndicator}
        <div className="w-full max-w-4xl bg-mil-panel border-2 border-mil-cyan shadow-[0_0_30px_rgba(0,200,255,0.15)] flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
          {/* Header */}
          <div className="bg-mil-cyan/10 border-b-2 border-mil-cyan px-6 py-3 flex justify-between items-center">
            <div>
              <h2 className="text-mil-cyan font-black text-lg tracking-tighter uppercase">YERLEŞTİRME AŞAMASI</h2>
              <p className="text-mil-dim text-[10px]">Birimleri haritanın {isHost ? 'ALT' : 'ÜST'} kısmına yerleştirin</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/40">Yerleştirilen</div>
              <div className="text-xl font-black text-mil-textBright">{myUnits.length}</div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Unit picker */}
            <div className="w-48 border-r border-mil-border p-3 overflow-y-auto space-y-2 bg-black/20 flex-shrink-0">
              <div className="text-[10px] text-white/40 font-black uppercase mb-2">Birim Seç</div>
              {myUnits.map((u: any, i: number) => {
                const id = u.getId?.() ?? u.id
                const name = u.getName?.() ?? u.name
                return (
                  <button
                    key={id}
                    onClick={() => setPlacingRole(u.getRole?.() ?? u.role)}
                    className={`w-full py-2 px-2 text-[10px] font-bold border transition-all text-left
                      ${placingRole === (u.getRole?.() ?? u.role) ? 'bg-mil-cyan text-mil-bg border-mil-cyan' : 'border-mil-border text-mil-textBright hover:border-mil-cyan'}`}
                  >
                    #{i+1} {name}
                  </button>
                )
              })}
            </div>

            {/* Map */}
            <div className="flex-1 p-3 overflow-auto">
              <div className="grid gap-[1px] bg-black/40 p-2" style={{ gridTemplateColumns: `repeat(${MAP_SIZE}, 1fr)` }}>
                {Array.from({ length: MAP_SIZE }).map((_, row) =>
                  Array.from({ length: MAP_SIZE }).map((_, col) => {
                    const isCapture = row === 7 && col === 7
                    const isMyZone = myZoneRows.includes(row)
                    const occupied = unitsArray.some((u: any) => {
                      const pos = u.getPosition?.() ?? u
                      return pos.x === col && pos.y === row
                    })
                    return (
                      <MapCell
                        key={`${row}-${col}`}
                        x={col} y={row}
                        occupied={occupied}
                        isCapture={isCapture}
                        isMyZone={isMyZone}
                        onPlace={handlePlaceClick}
                      />
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {statusMsg && <div className="px-4 py-2 text-mil-yellow text-[10px] text-center bg-mil-yellow/5 border-t border-mil-yellow/30">{statusMsg}</div>}

          <div className="p-4 border-t border-mil-border bg-black/20">
            <button
              disabled={isIReady}
              onClick={handleReady}
              className={`w-full py-3 bg-mil-cyan text-mil-bg font-black tracking-widest transition-all uppercase ${isIReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
            >
              {isIReady ? '✅ HAZIR!' : '✅ HAZIR! (Rakip Bekleniyor)'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── DRAFT phase ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-mil-darker flex items-center justify-center z-50 font-mono p-4">
      <div className="w-full max-w-3xl bg-mil-panel border-2 border-mil-yellow shadow-[0_0_30px_rgba(255,215,0,0.1)] flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="bg-mil-yellow/10 border-b-2 border-mil-yellow px-6 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-mil-yellow font-black text-xl tracking-tighter uppercase">1v1 DRAFT MODU</h2>
            <div className="flex items-center gap-2">
              <p className="text-mil-yellow/60 text-[10px] font-bold tracking-widest">
                {isHost ? '🏠 EV SAHİBİ' : '👤 MİSAFİR'} — ID: <span className="text-mil-textBright select-all">{multiplayerRoomId}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/40 font-bold uppercase">Kalan Bütçe</div>
            <div className={`text-2xl font-black ${budget < 100 ? 'text-mil-red animate-pulse' : 'text-mil-textBright'}`}>
              {budget} OP
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className="px-4 py-2 text-mil-yellow text-[10px] text-center bg-mil-yellow/5 border-b border-mil-yellow/30 animate-pulse">
            {statusMsg}
          </div>
        )}

        {/* Unit roster */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {UNIT_ROSTER.map((u) => {
            const canAfford = budget >= u.cost
            return (
              <div key={u.role} className="bg-white/5 border border-white/10 p-4 flex justify-between items-center hover:border-mil-yellow/40 transition-all">
                <div>
                  <div className="text-mil-textBright font-black text-sm">{u.name}</div>
                  <div className="text-[10px] text-white/50 italic">{u.desc}</div>
                  <div className="text-mil-yellow font-black text-xs mt-1">{u.cost} OP</div>
                </div>
                <button
                  disabled={!canAfford}
                  onClick={() => handleBuy(u.role, u.cost)}
                  className={`px-5 py-2 font-black text-xs border-2 transition-all ${
                    canAfford
                      ? 'border-mil-yellow text-mil-yellow hover:bg-mil-yellow hover:text-mil-darker'
                      : 'border-white/10 text-white/20 cursor-not-allowed'
                  }`}
                >
                  SATIN AL
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-mil-yellow/20 bg-black/20 space-y-2">
          <button
            disabled={isIReady}
            onClick={handleReady}
            className={`w-full py-3 bg-mil-yellow text-mil-darker font-black tracking-widest transition-all uppercase ${isIReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
          >
            {isIReady ? '✅ HAZIR!' : '✅ ALIŞVERIŞ BİTTİ — YERLEŞTİRMEYE GEÇ'}
          </button>
          <button
            onClick={handleExit}
            className="w-full py-2 text-mil-dim text-[10px] hover:text-mil-red transition-colors tracking-widest uppercase"
          >
            ◀ LOBIYE DÖN
          </button>
        </div>
      </div>
    </div>
  )
}
