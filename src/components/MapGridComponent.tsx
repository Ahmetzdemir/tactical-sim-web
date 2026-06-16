import { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { TerrainType } from '../engine/types'
import { Soldier } from '../engine/Soldier'
import { EnemyUnit } from '../engine/EnemyUnit'
import { NatoUnitIcon } from './NatoUnitIcon'
import { AnimationOverlay, type AbilityAnimation } from './AnimationOverlay'

const TERRAIN_BG_CLASS: Record<TerrainType, string> = {
  [TerrainType.OPEN]:         'bg-[#090d16]', // Dim dark
  [TerrainType.CITY]:         'bg-[#0f172a]', // Steel slate
  [TerrainType.FOREST]:       'bg-[#062016]', // Dark forest green
  [TerrainType.MOUNTAIN]:     'bg-[#1c1917]', // Rock dark brown
  [TerrainType.BRIDGE]:       'bg-[#0f1e2e]', // River dark blue tint
  [TerrainType.FOB_COMMAND]:  'bg-[#2e1f4d]', // Commander violet tint
  [TerrainType.FOB_HOSPITAL]: 'bg-[#143d2c]', // Field hospital green tint
  [TerrainType.FOB_SUPPLY]:   'bg-[#4d3319]', // Ammo depot amber tint
  [TerrainType.FOB_SANDBAGS]: 'bg-[#292524]', // Sandbags gray tint
}

const renderTerrainSvg = (terrain: TerrainType, x: number = 0, y: number = 0, grid?: TerrainType[][]) => {
  switch (terrain) {
    case TerrainType.OPEN:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08] z-0">
          <path d="M 45,50 L 55,50 M 50,45 L 50,55" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="1.5" />
        </svg>
      )
    case TerrainType.MOUNTAIN:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.25] z-0">
          {/* Rocky Slate Gray Mountains */}
          <path d="M 10,80 Q 35,45 50,80 Q 65,25 90,80" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
          <path d="M 25,80 Q 40,55 50,80 Q 60,40 75,80" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
          <path d="M 35,80 Q 50,65 65,80" fill="none" stroke="#64748b" strokeWidth="2.5" />
        </svg>
      )
    case TerrainType.FOREST:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.35] z-0">
          {/* Deep Forest Green Pine Trees */}
          <polygon points="50,15 35,45 65,45" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <line x1="50" y1="45" x2="50" y2="55" stroke="#10b981" strokeWidth="2.5" />
          <polygon points="30,35 20,60 40,60" fill="none" stroke="#059669" strokeWidth="2.5" />
          <line x1="30" y1="60" x2="30" y2="68" stroke="#059669" strokeWidth="2.5" />
          <polygon points="70,40 60,65 80,65" fill="none" stroke="#047857" strokeWidth="2.5" />
          <line x1="70" y1="65" x2="70" y2="73" stroke="#047857" strokeWidth="2.5" />
        </svg>
      )
    case TerrainType.CITY:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.25] z-0">
          {/* Cyan/Blue Neon City Blocks */}
          <rect x="15" y="15" width="22" height="22" fill="none" stroke="#06b6d4" strokeWidth="2" />
          <rect x="47" y="15" width="38" height="22" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <rect x="15" y="47" width="28" height="38" fill="none" stroke="#0891b2" strokeWidth="2" />
          <rect x="53" y="47" width="32" height="20" fill="none" stroke="#0284c7" strokeWidth="2" />
          <rect x="53" y="77" width="32" height="8" fill="none" stroke="#0369a1" strokeWidth="2" />
        </svg>
      )
    case TerrainType.BRIDGE: {
      const left = !!(grid && x > 0 && grid[y]?.[x - 1] === TerrainType.BRIDGE)
      const right = !!(grid && grid[y] && x < grid[y].length - 1 && grid[y]?.[x + 1] === TerrainType.BRIDGE)
      const up = !!(grid && y > 0 && grid[y - 1]?.[x] === TerrainType.BRIDGE)
      const down = !!(grid && y < grid.length - 1 && grid[y + 1]?.[x] === TerrainType.BRIDGE)

      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.4] z-0">
          {/* Base water pool in the center */}
          <rect x="25" y="25" width="50" height="50" fill="#0284c7" />
          
          {/* Water extensions to connect tiles */}
          {left && <rect x="0" y="25" width="25" height="50" fill="#0284c7" />}
          {right && <rect x="75" y="25" width="25" height="50" fill="#0284c7" />}
          {up && <rect x="25" y="0" width="50" height="25" fill="#0284c7" />}
          {down && <rect x="25" y="75" width="50" height="25" fill="#0284c7" />}
          
          {/* Subtle water texture lines */}
          <line x1="30" y1="50" x2="70" y2="50" stroke="#38bdf8" strokeWidth="1" opacity="0.3" strokeDasharray="4,4" />

          {/* Dynamic bridge tracks based on neighbor direction */}
          {(left || right) && !(up || down) ? (
            <>
              {/* Vertical bridge crossing horizontal flow */}
              <line x1="35" y1="0" x2="35" y2="100" stroke="#FFD700" strokeWidth="2.5" />
              <line x1="65" y1="0" x2="65" y2="100" stroke="#FFD700" strokeWidth="2.5" />
              <line x1="35" y1="15" x2="65" y2="15" stroke="#ca8a04" strokeWidth="1.5" />
              <line x1="35" y1="35" x2="65" y2="35" stroke="#ca8a04" strokeWidth="1.5" />
              <line x1="35" y1="55" x2="65" y2="55" stroke="#ca8a04" strokeWidth="1.5" />
              <line x1="35" y1="75" x2="65" y2="75" stroke="#ca8a04" strokeWidth="1.5" />
              <line x1="35" y1="95" x2="65" y2="95" stroke="#ca8a04" strokeWidth="1.5" />
            </>
          ) : (
            <>
              {/* Horizontal bridge crossing vertical flow (or isolated bridge) */}
              <line x1="0" y1="35" x2="100" y2="35" stroke="#FFD700" strokeWidth="2.5" />
              <line x1="0" y1="65" x2="100" y2="65" stroke="#FFD700" strokeWidth="2.5" />
              <line x1="15" y1="35" x2="15" y2="65" stroke="#ca8a04" strokeWidth="1.5" />
              <line x1="35" y1="35" x2="35" y2="65" stroke="#ca8a04" strokeWidth="1.5" />
              <line x1="55" y1="35" x2="55" y2="65" stroke="#ca8a04" strokeWidth="1.5" />
              <line x1="75" y1="35" x2="75" y2="65" stroke="#ca8a04" strokeWidth="1.5" />
              <line x1="95" y1="35" x2="95" y2="65" stroke="#ca8a04" strokeWidth="1.5" />
            </>
          )}
        </svg>
      )
    }
    case TerrainType.FOB_COMMAND:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.45] z-0">
          <polygon points="50,15 80,75 20,75" fill="none" stroke="#a855f7" strokeWidth="2.5" />
          <line x1="50" y1="15" x2="50" y2="5" stroke="#a855f7" strokeWidth="2" />
          <circle cx="50" cy="5" r="2.5" fill="#a855f7" />
          <path d="M 35,50 Q 50,40 65,50" fill="none" stroke="#a855f7" strokeWidth="1.5" />
          <rect x="42" y="55" width="16" height="15" fill="none" stroke="#a855f7" strokeWidth="1.5" />
        </svg>
      )
    case TerrainType.FOB_HOSPITAL:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.5] z-0">
          <polygon points="15,75 50,25 85,75" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <line x1="50" y1="25" x2="50" y2="75" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
          <path d="M 44,50 H 56 M 50,44 V 56" stroke="#10b981" strokeWidth="3.5" strokeLinecap="square" />
        </svg>
      )
    case TerrainType.FOB_SUPPLY:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.45] z-0">
          <rect x="25" y="45" width="22" height="22" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <line x1="25" y1="45" x2="47" y2="67" stroke="#f59e0b" strokeWidth="1" />
          <line x1="47" y1="45" x2="25" y2="67" stroke="#f59e0b" strokeWidth="1" />
          <rect x="52" y="52" width="22" height="22" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <line x1="52" y1="52" x2="74" y2="74" stroke="#f59e0b" strokeWidth="1" />
          <line x1="74" y1="52" x2="52" y2="74" stroke="#f59e0b" strokeWidth="1" />
        </svg>
      )
    case TerrainType.FOB_SANDBAGS:
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.4] z-0">
          <path d="M 20,70 Q 50,60 80,70" fill="none" stroke="#78716c" strokeWidth="6" strokeLinecap="round" />
          <path d="M 25,58 Q 50,48 75,58" fill="none" stroke="#78716c" strokeWidth="5.5" strokeLinecap="round" strokeDasharray="10,2" />
          <path d="M 32,48 Q 50,40 68,48" fill="none" stroke="#78716c" strokeWidth="5" strokeLinecap="round" />
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

const renderPortableRadioSvg = () => {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 animate-pulse">
      <circle cx="50" cy="50" r="30" fill="none" stroke="#00FFFF" strokeWidth="1" opacity="0.3" strokeDasharray="3,3" />
      <circle cx="50" cy="50" r="16" fill="none" stroke="#00FFFF" strokeWidth="1.5" opacity="0.5" />
      <line x1="50" y1="85" x2="50" y2="38" stroke="#00FFFF" strokeWidth="2.5" />
      <circle cx="50" cy="32" r="4.5" fill="#00FFFF" />
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
  isOnMovePath: boolean
  hasRadio: boolean
  inRadioCoverage: boolean
  borderColor: string
  unitHere: { unitId: string; unit: Soldier } | undefined
  enemyHere: { enemyId: string; enemy: EnemyUnit } | undefined
  onClick: (x: number, y: number) => void
  onMouseEnter: (x: number, y: number) => void
  onMouseLeave: () => void
  activeConstruction?: { structureType: TerrainType; progress: number; targetProgress: number }
  airdropAmount?: number
  grid?: TerrainType[][]
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
  isOnMovePath,
  hasRadio,
  inRadioCoverage,
  borderColor,
  unitHere,
  enemyHere,
  onClick,
  onMouseEnter,
  onMouseLeave,
  activeConstruction,
  airdropAmount,
  grid,
}: MapCellProps) {
  return (
    <div
      className={`map-cell relative flex items-center justify-center border cursor-pointer select-none ${TERRAIN_BG_CLASS[terrain]} ${!isDiscovered ? 'wavy-fog' : ''}`}
      style={{
        aspectRatio: '1/1',
        fontSize: 'clamp(6px, 1.5vw, 13px)',
        borderWidth: '1px',
        borderColor: borderColor,
        boxShadow: isSelectedUnit ? '0 0 10px rgba(0, 255, 0, 0.2)' : isSelectedEnemy ? '0 0 10px rgba(255, 0, 0, 0.2)' : isOnAttackPath ? '0 0 6px rgba(255, 165, 0, 0.15)' : isOnMovePath ? '0 0 6px rgba(0, 255, 255, 0.15)' : 'none',
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
      {/* Move route path waypoint marker */}
      {isOnMovePath && !unitHere && !enemyHere && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-[5] animate-pulse">
          <circle cx="50" cy="50" r="6" fill="#00FFFF" opacity="0.7" />
          <circle cx="50" cy="50" r="14" fill="none" stroke="#00FFFF" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.4" />
        </svg>
      )}
      {/* Portable Radio Antenna overlay */}
      {hasRadio && renderPortableRadioSvg()}

      {/* Coverage indicator icon */}
      {inRadioCoverage && !hasRadio && (
        <span className="absolute top-0.5 right-1 text-[8px] text-[#00FFFF] opacity-60 pointer-events-none select-none" title="Telsiz Röle Kapsama Alanı">📶</span>
      )}
      {/* Terrain SVG Layer */}
      {isDiscovered && renderTerrainSvg(terrain, x, y, grid)}

      {/* Cover Indicator Badge */}
      {isDiscovered && (unitHere || enemyHere) && (terrain === TerrainType.FOREST || terrain === TerrainType.CITY || terrain === TerrainType.MOUNTAIN || terrain === TerrainType.FOB_SANDBAGS) && (
        <div
          className="absolute top-0.5 left-0.5 z-20 flex items-center gap-0.5 px-0.5 py-0.2 rounded border bg-slate-950/80 pointer-events-none select-none"
          style={{
            borderColor: unitHere ? '#10b981' : '#ef4444',
            color: unitHere ? '#34d399' : '#f87171',
            fontSize: '6px',
            lineHeight: '1',
            transform: 'scale(0.85)',
            transformOrigin: 'top left',
          }}
          title={unitHere ? 'Dost Birlik Siperde' : 'Düşman Birlik Siperde'}
        >
          <span>🛡️</span>
          <span className="font-bold tracking-tight text-[5px]">SİPER</span>
        </div>
      )}

      {/* Selection / Target Reticles */}
      {isSelectedUnit && renderSelectionReticle('#00FF00')}
      {isSelectedEnemy && renderSelectionReticle('#FF0000')}

      {/* Capture Point overlay */}
      {isCapturePoint && !unitHere && !enemyHere && renderCapturePointSvg()}

      {/* Airdrop Material overlay */}
      {airdropAmount !== undefined && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 animate-bounce">
          <rect x="35" y="45" width="30" height="30" fill="#eab308" stroke="#854d0e" strokeWidth="2" opacity="0.9" />
          <line x1="35" y1="45" x2="65" y2="75" stroke="#854d0e" strokeWidth="2" />
          <line x1="65" y1="45" x2="35" y2="75" stroke="#854d0e" strokeWidth="2" />
          <line x1="50" y1="20" x2="35" y2="45" stroke="#d1d5db" strokeWidth="1.5" />
          <line x1="50" y1="20" x2="65" y2="45" stroke="#d1d5db" strokeWidth="1.5" />
          <path d="M 30,22 C 30,5 70,5 70,22 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" opacity="0.8" />
        </svg>
      )}

      {/* Construction loading template overlay */}
      {activeConstruction !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-1 bg-yellow-950/20 border border-dashed border-yellow-500/50 z-10">
          <span className="text-[7px] text-yellow-500 font-bold uppercase tracking-widest text-center leading-none mt-0.5 animate-pulse">Şablon</span>
          <div className="w-full bg-slate-900/60 h-1 rounded-none overflow-hidden mb-0.5">
            <div
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${(activeConstruction.progress / activeConstruction.targetProgress) * 100}%` }}
            />
          </div>
        </div>
      )}

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
  const [strikeMode, setStrikeMode] = useState<'none' | 'artillery' | 'airstrike' | 't129' | 'uh60' | 'uh60-dropoff' | 'attack'>('none')
  const [tempUH60TargetId, setTempUH60TargetId] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const [activeAnim, setActiveAnim] = useState<{ type: AbilityAnimation; x: number; y: number } | null>(null)
  // Ref to measure the actual rendered grid pixel bounds
  const gridRef = useRef<HTMLDivElement>(null)

  // Sync attackMode from store (set by UnitHUD) with local strikeMode
  useEffect(() => {
    if (attackMode) {
      setStrikeMode('attack')
      setAttackMode(false) // consume the flag
    }
  }, [attackMode, setAttackMode])

  if (!state) return null

  const { units, enemies, mapGrid, capturePoint, hasCapturePoint, attackRoutes, moveRoutes, deployedRadios } = state

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
      const ok = artilleryAt(x, y)
      if (ok) setActiveAnim({ type: 'artillery', x, y })
      setStrikeMode('none')
      return
    }
    if (strikeMode === 'airstrike') {
      const ok = airStrikeAt(x, y)
      if (ok) setActiveAnim({ type: 'airstrike', x, y })
      setStrikeMode('none')
      return
    }
    if (strikeMode === 't129') {
      if (selectedUnitId) {
        const ok = callT129(selectedUnitId, x, y)
        if (ok) setActiveAnim({ type: 'atak', x, y })
        setStrikeMode('none')
      }
      return
    }
    if (strikeMode === 'uh60') {
      const cellKey = `${x},${y}`
      const targetUnit = unitPositions.get(cellKey)
      if (selectedUnitId && targetUnit) {
        const s = targetUnit.unit as Soldier
        if (s.isAlive() && s.isIncapacitated()) {
          setTempUH60TargetId(targetUnit.unitId)
          setStrikeMode('uh60-dropoff')
        }
      }
      return
    }
    if (strikeMode === 'uh60-dropoff') {
      if (selectedUnitId && tempUH60TargetId) {
        const ok = callUH60(selectedUnitId, tempUH60TargetId, x, y)
        if (ok) {
          setActiveAnim({ type: 'medevac', x, y })
        }
        setTempUH60TargetId(null)
        setStrikeMode('none')
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
      const u = state.units.get(unitHere.unitId) as Soldier | undefined
      if (u) {
        const carriedId = u.getCarryingUnitId()
        const carrierId = u.getCarriedByUnitId()
        
        if (selectedUnitId === unitHere.unitId) {
          if (carriedId) {
            selectUnit(carriedId)
          } else if (carrierId) {
            selectUnit(carrierId)
          } else {
            selectUnit(null)
          }
        } else {
          selectUnit(unitHere.unitId)
        }
      } else {
        selectUnit(selectedUnitId === unitHere.unitId ? null : unitHere.unitId)
      }
    } else if (enemyHere) {
      if (selectedUnitId) {
        attackMoveToEnemy(selectedUnitId, enemyHere.enemyId)
      } else {
        selectEnemy(selectedEnemyId === enemyHere.enemyId ? null : enemyHere.enemyId)
      }
    } else if (selectedUnitId) {
      moveUnit(selectedUnitId, x, y)
    }
  }, [strikeMode, selectedUnitId, unitPositions, enemyPositions, artilleryAt, airStrikeAt, callT129, callUH60, attackMoveToEnemy, selectUnit, selectEnemy, moveUnit, state])

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
            onClick={() => {
              if (strikeMode === 'uh60-dropoff') {
                setStrikeMode('none')
                setTempUH60TargetId(null)
              } else if (selectedUnitId) {
                setTempUH60TargetId(selectedUnitId)
                setStrikeMode('uh60-dropoff')
              }
            }}
            className={`text-xs px-2 py-0.5 border transition-all ${(!selectedUnitId || state.uh60State !== 'idle') ? 'opacity-30 cursor-not-allowed border-mil-border text-[#4b5563]' : strikeMode === 'uh60-dropoff' ? 'border-[#00FFFF] text-[#00FFFF] bg-cyan-950/20' : 'border-mil-border text-[#4b5563] hover:text-[#00FFFF]'}`}
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
      {strikeMode === 'uh60' && (
        <div className="px-3 py-2 bg-cyan-950/30 border-b border-[#00FFFF]/40 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 animate-pulse">
            <span className="text-[#00FFFF] text-sm">🚁</span>
            <span className="text-[#00FFFF] text-xs font-bold tracking-wider uppercase">MEDEVAC AKTİF — HARİTADAN ALINACAK YARALI ASKERİ SEÇİN</span>
          </div>
          <button
            onClick={() => { setStrikeMode('none'); setTempUH60TargetId(null) }}
            className="text-xs px-2 py-0.5 border border-[#00FFFF]/40 text-[#00FFFF] hover:bg-cyan-950/40 transition-all"
          >
            ✕ İPTAL
          </button>
        </div>
      )}
      {strikeMode === 'uh60-dropoff' && (
        <div className="px-3 py-2 bg-yellow-950/30 border-b border-[#FFD700]/40 flex items-center justify-between z-20 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-[#FFD700] text-sm">📍</span>
            <span className="text-[#FFD700] text-xs font-bold tracking-wider uppercase">MEDEVAC İNİŞ NOKTASI SEÇİN — YARALININ İNDİRİLECEĞİ HEDEF KONUMA TIKLAYIN</span>
          </div>
          <button
            onClick={() => { setStrikeMode('none'); setTempUH60TargetId(null) }}
            className="text-xs px-2 py-0.5 border border-[#FFD700]/40 text-[#FFD700] hover:bg-yellow-950/40 transition-all"
          >
            ✕ İPTAL
          </button>
        </div>
      )}
      {state.uh60State !== 'idle' && (
        <div className={`px-3 py-2 border-b flex items-center justify-between z-20 ${state.uh60State === 'flying' ? 'bg-cyan-950/30 border-[#00FFFF]/40' : 'bg-yellow-950/30 border-[#FFD700]/40'}`}>
          <div className="flex items-center gap-2">
            <span className={state.uh60State === 'flying' ? 'text-[#00FFFF] animate-bounce text-sm' : 'text-[#FFD700] animate-pulse text-sm'}>🚁</span>
            <span className={`text-xs font-bold tracking-wider uppercase ${state.uh60State === 'flying' ? 'text-[#00FFFF]' : 'text-[#FFD700]'}`}>
              {state.uh60State === 'flying' 
                ? `MEDEVAC HAVADA — HEDEFE ULAŞMASINA: ${state.uh60Timer} DK (TURU İLERLETİN)` 
                : `MEDEVAC SAHADA — YARALI ALINIYOR. KALAN SÜRE: ${state.uh60Timer} DK (TURU İLERLETİN)`}
            </span>
          </div>
        </div>
      )}
      {/* Grid area */}
      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden z-10">
        <div
          ref={gridRef}
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

            // Build set of cells on active move routes
            const movePathCells = new Set<string>()
            if (moveRoutes) {
              for (const [, route] of moveRoutes) {
                for (let i = route.currentStep; i < route.path.length; i++) {
                  movePathCells.add(`${route.path[i].x},${route.path[i].y}`)
                }
              }
            }

            return Array.from({ length: mapGrid.height }, (_, y) =>
              Array.from({ length: mapGrid.width }, (_, x) => {
                const cellKey = `${x},${y}`
                const unitHere = unitPositions.get(cellKey)
                const enemyHere = enemyPositions.get(cellKey)
                const isHard = state.sandboxSettings?.difficulty === 'HARD'
                const isDiscovered = isHard ? (state.discoveredTiles?.has(cellKey) ?? false) : true
                const terrain = grid[y]?.[x] ?? TerrainType.OPEN
                const isCapturePoint = hasCapturePoint && capturePoint.x === x && capturePoint.y === y
                const isSelectedUnit = unitHere && selectedUnitId === unitHere.unitId
                const isSelectedEnemy = enemyHere && selectedEnemyId === enemyHere.enemyId
                const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
                const isStrikeTarget = strikeMode !== 'none' && isHovered
                const isOnAttackPath = attackPathCells.has(cellKey)
                const isOnMovePath = movePathCells.has(cellKey)

                const hasRadio = (deployedRadios || []).some(r => r.x === x && r.y === y)
                const inRadioCoverage = (deployedRadios || []).some(r => {
                  const dx = r.x - x
                  const dy = r.y - y
                  return Math.sqrt(dx * dx + dy * dy) <= 4.0
                })

                let borderColor = 'rgba(0, 255, 255, 0.05)'
                if (isSelectedUnit) borderColor = '#00FF00'
                else if (isSelectedEnemy) borderColor = '#FF0000'
                else if (isCapturePoint) borderColor = '#FFD700'
                else if (isOnAttackPath) borderColor = 'rgba(255, 140, 0, 0.5)'
                else if (isOnMovePath) borderColor = 'rgba(0, 255, 255, 0.4)'
                else if (isStrikeTarget) {
                  borderColor = strikeMode === 'artillery' ? '#FFD700' : strikeMode === 't129' ? '#00FF00' : strikeMode === 'attack' ? '#FF8C00' : '#00FFFF'
                }

                const activeConstr = state.activeConstructions?.get(cellKey)
                const airdrop = state.airdrops?.find(d => d.x === x && d.y === y)

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
                    isOnMovePath={isOnMovePath}
                    hasRadio={hasRadio}
                    inRadioCoverage={inRadioCoverage}
                    borderColor={borderColor}
                    unitHere={unitHere}
                    enemyHere={enemyHere}
                    onClick={handleCellClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    activeConstruction={activeConstr}
                    airdropAmount={airdrop?.amount}
                    grid={grid}
                  />
                )
              })
            )
          })()}

          {activeAnim && (
            <AnimationOverlay
              animation={activeAnim.type}
              targetX={(activeAnim.x + 0.5) / mapGrid.width}
              targetY={(activeAnim.y + 0.5) / mapGrid.height}
              onDone={() => setActiveAnim(null)}
            />
          )}
        </div>
      </div>

      {/* Coordinate display - Terminal Style */}
      {hoveredCell && (
        <div className="px-3 py-1 bg-mil-panel border-t border-mil-border text-[#00FFFF] text-[10px] flex-shrink-0 z-20 font-bold uppercase tracking-widest flex justify-between items-center">
          <div>
            POS: {hoveredCell.x.toString().padStart(2, '0')}.{hoveredCell.y.toString().padStart(2, '0')} // TYPE: {
              (() => {
                const cellKey = `${hoveredCell.x},${hoveredCell.y}`
                const isHard = state.sandboxSettings?.difficulty === 'HARD'
                const isDiscovered = isHard ? (state.discoveredTiles?.has(cellKey) ?? false) : true
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
              const isNearRelay = (deployedRadios || []).some(r => {
                const dx = r.x - hoveredCell.x
                const dy = r.y - hoveredCell.y
                return Math.sqrt(dx * dx + dy * dy) <= 4.0
              })
              const sig = isNearRelay 
                ? 1.0 
                : state.mapGrid.calcSignalFactor({ x: 0, y: 0 }, hoveredCell) * state.weather.getSignalModifier()
              const signalPct = Math.round(sig * 100)
              return (
                <span className={signalPct < 20 ? 'text-mil-red animate-pulse' : 'text-mil-green'}>
                  TELSİZ SİNYALİ: {signalPct}% {isNearRelay && '(TAŞINABİLİR TELSİZ ETKİN)'}
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
