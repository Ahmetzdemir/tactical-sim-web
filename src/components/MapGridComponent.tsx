import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { TerrainType, roleToIcon, enemyTypeToIcon } from '../engine/types'
import { Soldier } from '../engine/Soldier'
import { EnemyUnit } from '../engine/EnemyUnit'

const TERRAIN_BG_CLASS: Record<TerrainType, string> = {
  [TerrainType.OPEN]:     'bg-[#0A0E17]',
  [TerrainType.CITY]:     'texture-city-grid',
  [TerrainType.FOREST]:   'texture-hatch',
  [TerrainType.MOUNTAIN]: 'texture-topo',
  [TerrainType.BRIDGE]:   'bg-[#0f172a]',
}

const TERRAIN_SYMBOL: Record<TerrainType, string> = {
  [TerrainType.OPEN]:     '·',
  [TerrainType.CITY]:     '#',
  [TerrainType.FOREST]:   '♣',
  [TerrainType.MOUNTAIN]: '▲',
  [TerrainType.BRIDGE]:   '═',
}

export function MapGridComponent() {
  const {
    state, selectedUnitId, selectedEnemyId,
    selectUnit, selectEnemy, moveUnit, artilleryAt, airStrikeAt,
    callT129, callUH60,
  } = useGameStore()
  const [strikeMode, setStrikeMode] = useState<'none' | 'artillery' | 'airstrike' | 't129' | 'uh60'>('none')
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)

  if (!state) return null

  const { units, enemies, mapGrid, capturePoint, hasCapturePoint, discoveredTiles } = state

  // Build position maps for quick lookup
  const unitPositions = new Map<string, { unitId: string; unit: Soldier }>()
  const enemyPositions = new Map<string, { enemyId: string; enemy: EnemyUnit }>()

  for (const [id, unit] of units) {
    const key = `${unit.getPosition().x},${unit.getPosition().y}`
    unitPositions.set(key, { unitId: id, unit: unit as Soldier })
  }
  for (const [id, enemy] of enemies) {
    if (enemy.isAlive()) {
      const key = `${enemy.getPosition().x},${enemy.getPosition().y}`
      enemyPositions.set(key, { enemyId: id, enemy: enemy as EnemyUnit })
    }
  }

  function handleCellClick(x: number, y: number) {
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
  }

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

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden z-10">
        <div
          className="grid gap-0"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${mapGrid.width}, 1fr)`,
            width: '100%',
            maxWidth: mapGrid.width > 15 ? '640px' : '480px',
            aspectRatio: `${mapGrid.width}/${mapGrid.height}`,
            position: 'relative',
          }}
        >
          {Array.from({ length: mapGrid.height }, (_, y) =>
            Array.from({ length: mapGrid.width }, (_, x) => {
              const cellKey = `${x},${y}`
              const unitHere = unitPositions.get(cellKey)
              const enemyHere = enemyPositions.get(cellKey)
              const isDiscovered = discoveredTiles?.has(cellKey) ?? true
              const terrain = grid[y]?.[x] ?? TerrainType.OPEN
              const isCapturePoint = hasCapturePoint && capturePoint.x === x && capturePoint.y === y
              const isSelectedUnit = unitHere && selectedUnitId === unitHere.unitId
              const isSelectedEnemy = enemyHere && selectedEnemyId === enemyHere.enemyId
              const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
              const isStrikeTarget = strikeMode !== 'none' && isHovered

              let borderColor = 'rgba(0, 255, 255, 0.05)'
              if (isSelectedUnit) borderColor = '#00FF00'
              else if (isSelectedEnemy) borderColor = '#FF0000'
              else if (isCapturePoint) borderColor = '#FFD700'
              else if (isStrikeTarget) {
                borderColor = strikeMode === 'artillery' ? '#FFD700' : strikeMode === 't129' ? '#00FF00' : '#00FFFF'
              }

              return (
                <div
                  key={cellKey}
                  className={`map-cell relative flex items-center justify-center border cursor-pointer select-none ${TERRAIN_BG_CLASS[terrain]} ${!isDiscovered ? 'wavy-fog' : ''}`}
                  style={{
                    aspectRatio: '1/1',
                    fontSize: 'clamp(6px, 1.5vw, 13px)',
                    borderWidth: '1px',
                    borderColor: borderColor,
                    boxShadow: isSelectedUnit ? '0 0 10px rgba(0, 255, 0, 0.2)' : isSelectedEnemy ? '0 0 10px rgba(255, 0, 0, 0.2)' : 'none',
                  }}
                  onClick={() => handleCellClick(x, y)}
                  onMouseEnter={() => setHoveredCell({ x, y })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {unitHere ? (
                    <span
                      className={`glow-neon-green ${!unitHere.unit.isAlive() ? 'pulse-red' : ''}`}
                      style={{
                        zIndex: 2,
                        color: unitHere.unit.isAlive() ? '#00FF00' : '#FF0000',
                      }}
                    >
                      {unitHere.unit.isAlive() 
                        ? roleToIcon((unitHere.unit as Soldier).getRole()) 
                        : `☠️`}
                    </span>
                  ) : (isDiscovered && enemyHere) ? (
                    <span
                      className="glow-neon-red"
                      style={{ zIndex: 2, color: '#FF0000' }}
                    >
                      {enemyTypeToIcon((enemyHere.enemy as EnemyUnit).getType())}
                    </span>
                  ) : isCapturePoint ? (
                    <span className="text-[#FFD700] animate-pulse glow-terminal-cyan" style={{ zIndex: 2 }}>⛨</span>
                  ) : (
                    <span className="text-[#00FFFF] opacity-10 select-none z-0">{isDiscovered ? TERRAIN_SYMBOL[terrain] : ''}</span>
                  )}

                  {/* HP mini bar - schematic version */}
                  {isDiscovered && (unitHere || enemyHere) && (
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/5 z-10">
                      <div
                        className={`h-full transition-all ${unitHere ? 'bg-[#00FF00]' : 'bg-[#FF0000]'}`}
                        style={{ width: `${((unitHere?.unit || enemyHere?.enemy)!.getHp() / (unitHere?.unit || enemyHere?.enemy)!.getMaxHp()) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Coordinate display - Terminal Style */}
      {hoveredCell && (
        <div className="px-3 py-1 bg-mil-panel border-t border-mil-border text-[#00FFFF] text-[10px] flex-shrink-0 z-20 font-bold uppercase tracking-widest">
          POS: {hoveredCell.x.toString().padStart(2, '0')}.{hoveredCell.y.toString().padStart(2, '0')} // TYPE: {
            (() => {
              const cellKey = `${hoveredCell.x},${hoveredCell.y}`
              const isDiscovered = discoveredTiles?.has(cellKey) ?? true
              if (!isDiscovered) return 'DATA_N/A'
              const u = unitPositions.get(cellKey)
              const e = enemyPositions.get(cellKey)
              if (u) return `FRIENDLY_${u.unit.getName().toUpperCase()}`
              if (e) return `HOSTILE_${e.enemy.getName().toUpperCase()}`
              return 'VACANT'
            })()
          }
        </div>
      )}
    </div>
  )
}
