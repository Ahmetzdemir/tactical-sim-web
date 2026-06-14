import { useState, useCallback, useMemo, useEffect, memo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { TerrainType } from '../engine/types'
import { Soldier } from '../engine/Soldier'
import { EnemyUnit } from '../engine/EnemyUnit'
import { NatoUnitIcon } from './NatoUnitIcon'

const TERRAIN_BG_CLASS: Record<TerrainType, string> = {
  [TerrainType.OPEN]:     'bg-[#0A0E17]',
  [TerrainType.CITY]:     'bg-[#0b131f]',
  [TerrainType.FOREST]:   'bg-[#081512]',
  [TerrainType.MOUNTAIN]: 'bg-[#12161a]',
  [TerrainType.BRIDGE]:   'bg-[#0e1726]',
}

const renderTerrainSvg = (terrain: TerrainType) => {
  switch (terrain) {
    case TerrainType.OPEN:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08] z-0">
          <path d="M 45,50 L 55,50 M 50,45 L 50,55" stroke="#00FFFF" strokeWidth="1.5" />
        </svg>
      )
    case TerrainType.MOUNTAIN:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.15] z-0">
          <path d="M 10,80 Q 35,45 50,80 Q 65,25 90,80" fill="none" stroke="#00FFFF" strokeWidth="2.5" />
          <path d="M 25,80 Q 40,55 50,80 Q 60,40 75,80" fill="none" stroke="#00FFFF" strokeWidth="2.5" />
          <path d="M 35,80 Q 50,65 65,80" fill="none" stroke="#00FFFF" strokeWidth="2.5" />
        </svg>
      )
    case TerrainType.FOREST:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.2] z-0">
          {/* Tree 1 */}
          <polygon points="50,15 35,45 65,45" fill="none" stroke="#00FF00" strokeWidth="2.5" />
          <line x1="50" y1="45" x2="50" y2="55" stroke="#00FF00" strokeWidth="2.5" />
          {/* Tree 2 */}
          <polygon points="30,35 20,60 40,60" fill="none" stroke="#00FF00" strokeWidth="2.5" />
          <line x1="30" y1="60" x2="30" y2="68" stroke="#00FF00" strokeWidth="2.5" />
          {/* Tree 3 */}
          <polygon points="70,40 60,65 80,65" fill="none" stroke="#00FF00" strokeWidth="2.5" />
          <line x1="70" y1="65" x2="70" y2="73" stroke="#00FF00" strokeWidth="2.5" />
        </svg>
      )
    case TerrainType.CITY:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.12] z-0">
          <rect x="15" y="15" width="22" height="22" fill="none" stroke="#00FFFF" strokeWidth="2" />
          <rect x="47" y="15" width="38" height="22" fill="none" stroke="#00FFFF" strokeWidth="2" />
          <rect x="15" y="47" width="28" height="38" fill="none" stroke="#00FFFF" strokeWidth="2" />
          <rect x="53" y="47" width="32" height="20" fill="none" stroke="#00FFFF" strokeWidth="2" />
          <rect x="53" y="77" width="32" height="8" fill="none" stroke="#00FFFF" strokeWidth="2" />
        </svg>
      )
    case TerrainType.BRIDGE:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.18] z-0">
          {/* Water ripples */}
          <path d="M 0,20 Q 25,25 50,20 T 100,20 M 0,80 Q 25,85 50,80 T 100,80" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3,3" />
          {/* Bridge tracks */}
          <line x1="0" y1="38" x2="100" y2="38" stroke="#FFD700" strokeWidth="2.5" />
          <line x1="0" y1="62" x2="100" y2="62" stroke="#FFD700" strokeWidth="2.5" />
          {/* Cross truss beams */}
          <line x1="12" y1="38" x2="28" y2="62" stroke="#FFD700" strokeWidth="2" />
          <line x1="28" y1="62" x2="44" y2="38" stroke="#FFD700" strokeWidth="2" />
          <line x1="44" y1="38" x2="60" y2="62" stroke="#FFD700" strokeWidth="2" />
          <line x1="60" y1="62" x2="76" y2="38" stroke="#FFD700" strokeWidth="2" />
          <line x1="76" y1="38" x2="92" y2="62" stroke="#FFD700" strokeWidth="2" />
        </svg>
      )
    default:
      return null
  }
}

const renderCapturePointSvg = () => {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 animate-pulse">
      {/* Outer corner brackets */}
      <path d="M 12,25 L 12,12 L 25,12 M 75,12 L 88,12 L 88,25 M 12,75 L 12,88 L 25,88 M 75,88 L 88,88 L 88,75" fill="none" stroke="#FFD700" strokeWidth="4" />
      {/* Central target crosshair */}
      <circle cx="50" cy="50" r="16" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeDasharray="4,2" />
      <circle cx="50" cy="50" r="4" fill="#FFD700" />
    </svg>
  )
}

const renderSelectionReticle = (color: string) => {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-30 selection-reticle animate-pulse">
      <path
        d="M 6,20 L 6,6 L 20,6 M 80,6 L 94,6 L 94,20 M 6,80 L 6,94 L 20,94 M 80,94 L 94,94 L 94,80"
        fill="none"
        stroke={color}
        strokeWidth="4"
      />
    </svg>
  )
}

interface MapCellProps {
  x: number
  y: number
  isDiscovered: boolean
  terrain: TerrainType
  isCapturePoint: boolean
  isSelectedUnit: boolean
  isSelectedEnemy: boolean
  isOnAttackPath: boolean
  borderColor: string
  unitHere: { unitId: string; unit: Soldier } | undefined
  enemyHere: { enemyId: string; enemy: EnemyUnit } | undefined
  onClick: (x: number, y: number) => void
  onMouseEnter: (x: number, y: number) => void
  onMouseLeave: () => void
}

const MapCell = memo(function MapCell({
  x,
  y,
  isDiscovered,
  terrain,
  isCapturePoint,
  isSelectedUnit,
  isSelectedEnemy,
  isOnAttackPath,
  borderColor,
  unitHere,
  enemyHere,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MapCellProps) {
  return (
    <div
      className={`map-cell relative flex items-center justify-center border cursor-pointer select-none ${TERRAIN_BG_CLASS[terrain]} ${!isDiscovered ? 'wavy-fog' : ''}`}
      style={{
        aspectRatio: '1/1',
        fontSize: 'clamp(6px, 1.5vw, 13px)',
        borderWidth: '1px',
        borderColor: borderColor,
        boxShadow: isSelectedUnit ? '0 0 10px rgba(0, 255, 0, 0.2)' : isSelectedEnemy ? '0 0 10px rgba(255, 0, 0, 0.2)' : isOnAttackPath ? '0 0 6px rgba(255, 165, 0, 0.15)' : 'none',
      }}
      onClick={() => onClick(x, y)}
      onMouseEnter={() => onMouseEnter(x, y)}
      onMouseLeave={onMouseLeave}
    >
      {/* Attack route path waypoint marker */}
      {isOnAttackPath && !unitHere && !enemyHere && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-[5] animate-pulse">
          <circle cx="50" cy="50" r="8" fill="#FF8C00" opacity="0.6" />
          <circle cx="50" cy="50" r="18" fill="none" stroke="#FF8C00" strokeWidth="2" strokeDasharray="4,3" opacity="0.35" />
        </svg>
      )}
      {/* Terrain SVG Layer */}
      {isDiscovered && renderTerrainSvg(terrain)}

      {/* Selection / Target Reticles */}
      {isSelectedUnit && renderSelectionReticle('#00FF00')}
      {isSelectedEnemy && renderSelectionReticle('#FF0000')}

      {/* Capture Point overlay */}
      {isCapturePoint && !unitHere && !enemyHere && renderCapturePointSvg()}

      {/* Entity Layer */}
      {unitHere ? (
        <span
          className={`glow-neon-green flex items-center justify-center w-[85%] h-[85%] ${!unitHere.unit.isAlive() ? 'pulse-red' : ''}`}
          style={{ zIndex: 2 }}
        >
          <NatoUnitIcon
            role={(unitHere.unit as Soldier).getRole()}
            isEnemy={false}
            isAlive={unitHere.unit.isAlive()}
            size={36}
            className="w-full h-full"
          />
        </span>
      ) : (isDiscovered && enemyHere) ? (
        <span
          className="glow-neon-red flex items-center justify-center w-[85%] h-[85%]"
          style={{ zIndex: 2 }}
        >
          <NatoUnitIcon
            type={(enemyHere.enemy as EnemyUnit).getType()}
            isEnemy={true}
            isAlive={enemyHere.enemy.isAlive()}
            size={36}
            className="w-full h-full"
          />
        </span>
      ) : null}

      {/* HP mini bar - schematic version */}
      {isDiscovered && (unitHere || enemyHere) && (
        <div className="absolute bottom-0.5 left-1 right-1 h-[2px] bg-white/10 z-10">
          <div
            className={`h-full transition-all ${unitHere ? 'bg-[#00FF00]' : 'bg-[#FF0000]'}`}
            style={{ width: `${((unitHere?.unit || enemyHere?.enemy)!.getHp() / (unitHere?.unit || enemyHere?.enemy)!.getMaxHp()) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
})

export function MapGridComponent() {
  const {
    state, selectedUnitId, selectedEnemyId,
    selectUnit, selectEnemy, moveUnit, artilleryAt, airStrikeAt,
    callT129, callUH60, attackMoveToEnemy, attackMode, setAttackMode,
  } = useGameStore()
  const [strikeMode, setStrikeMode] = useState<'none' | 'artillery' | 'airstrike' | 't129' | 'uh60' | 'attack'>('none')
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)

  // Sync attackMode from store (set by UnitHUD) with local strikeMode
  useEffect(() => {
    if (attackMode) {
      setStrikeMode('attack')
      setAttackMode(false) // consume the flag
    }
  }, [attackMode, setAttackMode])

  if (!state) return null

  const { units, enemies, mapGrid, capturePoint, hasCapturePoint, attackRoutes } = state

  // Build position maps for quick lookup
  const unitPositions = useMemo(() => {
    const map = new Map<string, { unitId: string; unit: Soldier }>()
    for (const [id, unit] of units) {
      const key = `${unit.getPosition().x},${unit.getPosition().y}`
      map.set(key, { unitId: id, unit: unit as Soldier })
    }
    return map
  }, [units])

  const enemyPositions = useMemo(() => {
    const map = new Map<string, { enemyId: string; enemy: EnemyUnit }>()
    for (const [id, enemy] of enemies) {
      if (enemy.isAlive()) {
        const key = `${enemy.getPosition().x},${enemy.getPosition().y}`
        map.set(key, { enemyId: id, enemy: enemy as EnemyUnit })
      }
    }
    return map
  }, [enemies])

  const handleCellClick = useCallback((x: number, y: number) => {
    if (strikeMode === 'artillery') {
      artilleryAt(x, y)
      setStrikeMode('none')
      return
    }
    if (strikeMode === 'airstrike') {
      airStrikeAt(x, y)
      setStrikeMode('none')
      return
    }
    if (strikeMode === 't129') {
      if (selectedUnitId) {
        callT129(selectedUnitId, x, y)
        setStrikeMode('none')
      }
      return
    }
    if (strikeMode === 'uh60') {
      const cellKey = `${x},${y}`
      const targetUnit = unitPositions.get(cellKey)
      if (selectedUnitId && targetUnit) {
        const s = targetUnit.unit as Soldier
        if (!s.isAlive() || s.isIncapacitated()) {
          callUH60(selectedUnitId, targetUnit.unitId)
          setStrikeMode('none')
        }
      }
      return
    }
    if (strikeMode === 'attack') {
      const cellKey = `${x},${y}`
      const enemyHere = enemyPositions.get(cellKey)
      if (selectedUnitId && enemyHere) {
        attackMoveToEnemy(selectedUnitId, enemyHere.enemyId)
        setStrikeMode('none')
      }
      return
    }

    const cellKey = `${x},${y}`
    const unitHere = unitPositions.get(cellKey)
    const enemyHere = enemyPositions.get(cellKey)

    if (unitHere) {
      selectUnit(selectedUnitId === unitHere.unitId ? null : unitHere.unitId)
    } else if (enemyHere) {
      selectEnemy(selectedEnemyId === enemyHere.enemyId ? null : enemyHere.enemyId)
    } else if (selectedUnitId) {
      moveUnit(selectedUnitId, x, y)
    }
  }, [strikeMode, selectedUnitId, unitPositions, enemyPositions, artilleryAt, airStrikeAt, callT129, callUH60, attackMoveToEnemy, selectUnit, selectEnemy, moveUnit])

  const handleMouseEnter = useCallback((x: number, y: number) => {
    setHoveredCell({ x, y })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null)
  }, [])

  const grid = mapGrid.getGrid()

  return (
    <div className="flex flex-col h-full bg-[#0A0E17] relative overflow-hidden">
      {/* Terminal Overlays */}
      <div className="scanlines-overlay" />
      <div className="vignette-overlay" />

      {/* Terminal Status Indicators */}
      <div className="absolute bottom-2 right-2 flex flex-col items-end pointer-events-none z-[110]">
        <span className="terminal-label animate-pulse">BFT: ONLINE</span>
        <span className="terminal-label">SCAN: ACTIVE</span>
        <span className="terminal-label text-[8px] opacity-40">GRID SOURCE: MSS</span>
      </div>

      <div className="absolute top-2 left-2 flex flex-col pointer-events-none z-[110]">
        <span className="terminal-label text-[8px]">RADAR TERM V4.1</span>
      </div>

      {/* Panel header */}
      <div className="px-3 py-3 border-b border-mil-border bg-mil-panel flex items-center gap-2 flex-shrink-0 z-10">
        <span className="text-[#00FFFF] text-lg animate-pulse">☶</span>
        <span className="text-[#00FFFF] text-sm font-bold tracking-widest leading-none">TERMINAL TAKTİK</span>
        <div className="ml-auto flex gap-2">
          <button
            id="btn-artillery"
            onClick={() => setStrikeMode(s => s === 'artillery' ? 'none' : 'artillery')}
            className={`text-xs px-2 py-0.5 border transition-all ${strikeMode === 'artillery' ? 'border-[#FFD700] text-[#FFD700] bg-yellow-950/20' : 'border-mil-border text-[#4b5563] hover:text-[#FFD700]'}`}
          >
            💣 TOPÇU
          </button>
          <button
            id="btn-airstrike"
            onClick={() => setStrikeMode(s => s === 'airstrike' ? 'none' : 'airstrike')}
            className={`text-xs px-2 py-0.5 border transition-all ${strikeMode === 'airstrike' ? 'border-[#FF00FF] text-[#FF00FF] bg-purple-950/20' : 'border-mil-border text-[#4b5563] hover:text-[#FF00FF]'}`}
            title="F-16 Hava Saldırısı (Geniş Alan Hasarı)"
          >
            ✈️ F-16
          </button>
          <button
            id="btn-t129"
            disabled={!selectedUnitId}
            onClick={() => setStrikeMode(s => s === 't129' ? 'none' : 't129')}
            className={`text-xs px-2 py-0.5 border transition-all ${!selectedUnitId ? 'opacity-30 cursor-not-allowed border-mil-border text-[#4b5563]' : strikeMode === 't129' ? 'border-[#00FF00] text-[#00FF00] bg-green-950/20' : 'border-mil-border text-[#4b5563] hover:text-[#00FF00]'}`}
          >
            🚁 ATAK
          </button>
          <button
            id="btn-uh60"
            disabled={!selectedUnitId || state.uh60State !== 'idle'}
            onClick={() => setStrikeMode(s => s === 'uh60' ? 'none' : 'uh60')}
            className={`text-xs px-2 py-0.5 border transition-all ${(!selectedUnitId || state.uh60State !== 'idle') ? 'opacity-30 cursor-not-allowed border-mil-border text-[#4b5563]' : strikeMode === 'uh60' ? 'border-[#00FFFF] text-[#00FFFF] bg-cyan-950/20' : 'border-mil-border text-[#4b5563] hover:text-[#00FFFF]'}`}
          >
            🚑 MEDEVAC
          </button>
        </div>
      </div>

      {/* Attack Mode Active Banner */}
      {strikeMode === 'attack' && (
        <div className="px-3 py-2 bg-orange-950/30 border-b border-[#FF8C00]/40 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="text-[#FF8C00] animate-pulse text-sm">⚔️</span>
            <span className="text-[#FF8C00] text-xs font-bold tracking-wider uppercase">SALDIRI MODU AKTİF — HARİTADAN BİR DÜŞMAN SEÇ</span>
          </div>
          <button
            onClick={() => setStrikeMode('none')}
            className="text-xs px-2 py-0.5 border border-[#FF8C00]/40 text-[#FF8C00] hover:bg-orange-950/40 transition-all"
          >
            ✕ İPTAL
          </button>
        </div>
      )}
      {/* Grid */}
      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden z-10">
        <div
          className="grid gap-0"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${mapGrid.width}, 1fr)`,
            width: '100%',
            maxWidth: '78vh',
            maxHeight: '100%',
            aspectRatio: `${mapGrid.width}/${mapGrid.height}`,
            position: 'relative',
          }}
        >
          {(() => {
            // Build set of cells on active attack routes
            const attackPathCells = new Set<string>()
            for (const [, route] of attackRoutes) {
              for (let i = route.currentStep; i < route.path.length; i++) {
                attackPathCells.add(`${route.path[i].x},${route.path[i].y}`)
              }
            }

            return Array.from({ length: mapGrid.height }, (_, y) =>
              Array.from({ length: mapGrid.width }, (_, x) => {
                const cellKey = `${x},${y}`
                const unitHere = unitPositions.get(cellKey)
                const enemyHere = enemyPositions.get(cellKey)
                const isDiscovered = true
                const terrain = grid[y]?.[x] ?? TerrainType.OPEN
                const isCapturePoint = hasCapturePoint && capturePoint.x === x && capturePoint.y === y
                const isSelectedUnit = unitHere && selectedUnitId === unitHere.unitId
                const isSelectedEnemy = enemyHere && selectedEnemyId === enemyHere.enemyId
                const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
                const isStrikeTarget = strikeMode !== 'none' && isHovered
                const isOnAttackPath = attackPathCells.has(cellKey)

                let borderColor = 'rgba(0, 255, 255, 0.05)'
                if (isSelectedUnit) borderColor = '#00FF00'
                else if (isSelectedEnemy) borderColor = '#FF0000'
                else if (isCapturePoint) borderColor = '#FFD700'
                else if (isOnAttackPath) borderColor = 'rgba(255, 140, 0, 0.5)'
                else if (isStrikeTarget) {
                  borderColor = strikeMode === 'artillery' ? '#FFD700' : strikeMode === 't129' ? '#00FF00' : strikeMode === 'attack' ? '#FF8C00' : '#00FFFF'
                }

                return (
                  <MapCell
                    key={cellKey}
                    x={x}
                    y={y}
                    isDiscovered={isDiscovered}
                    terrain={terrain}
                    isCapturePoint={isCapturePoint}
                    isSelectedUnit={!!isSelectedUnit}
                    isSelectedEnemy={!!isSelectedEnemy}
                    isOnAttackPath={isOnAttackPath}
                    borderColor={borderColor}
                    unitHere={unitHere}
                    enemyHere={enemyHere}
                    onClick={handleCellClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  />
                )
              })
            )
          })()}
        </div>
      </div>

      {/* Coordinate display - Terminal Style */}
      {hoveredCell && (
        <div className="px-3 py-1 bg-mil-panel border-t border-mil-border text-[#00FFFF] text-[10px] flex-shrink-0 z-20 font-bold uppercase tracking-widest flex justify-between items-center">
          <div>
            POS: {hoveredCell.x.toString().padStart(2, '0')}.{hoveredCell.y.toString().padStart(2, '0')} // TYPE: {
              (() => {
                const cellKey = `${hoveredCell.x},${hoveredCell.y}`
                const isDiscovered = true
                if (!isDiscovered) return 'DATA_N/A'
                const u = unitPositions.get(cellKey)
                const e = enemyPositions.get(cellKey)
                if (u) return `FRIENDLY_${u.unit.getName().toUpperCase()}`
                if (e) return `HOSTILE_${e.enemy.getName().toUpperCase()}`
                return 'VACANT'
              })()
            }
          </div>
          <div className="flex gap-4">
            {(() => {
              const sig = state.mapGrid.calcSignalFactor({ x: 0, y: 0 }, hoveredCell) * state.weather.getSignalModifier()
              const signalPct = Math.round(sig * 100)
              return (
                <span className={signalPct < 20 ? 'text-mil-red animate-pulse' : 'text-mil-green'}>
                  TELSİZ SİNYALİ: {signalPct}%
                </span>
              )
            })()}
            {strikeMode === 'uh60' && (() => {
              const sig = state.mapGrid.calcSignalFactor({ x: 0, y: 0 }, hoveredCell) * state.weather.getSignalModifier()
              const riskPct = Math.round(Math.max(5, Math.min(80, (1 - sig) * 100)))
              return (
                <span className="text-mil-red animate-pulse">
                  MEDEVAC VURULMA RİSKİ: {riskPct}%
                </span>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
