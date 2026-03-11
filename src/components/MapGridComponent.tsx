import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { TerrainType, roleToIcon, enemyTypeToIcon } from '../engine/types'
import { Soldier } from '../engine/Soldier'
import { EnemyUnit } from '../engine/EnemyUnit'

const TERRAIN_BG: Record<TerrainType, string> = {
  [TerrainType.OPEN]:     '#0a150a',
  [TerrainType.CITY]:     '#0a0a18',
  [TerrainType.FOREST]:   '#0a1a0a',
  [TerrainType.MOUNTAIN]: '#18140a',
  [TerrainType.BRIDGE]:   '#0a1414',
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

  const { units, enemies, mapGrid, capturePoint, hasCapturePoint } = state

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
      // MEDEVAC targets dead OR incapacitated friendly units
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
      // Move selected unit to this cell
      moveUnit(selectedUnitId, x, y)
    }
  }

  const grid = mapGrid.getGrid()

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-3 py-3 border-b border-mil-border bg-mil-panel flex items-center gap-2 flex-shrink-0">
        <span className="text-mil-green text-lg">🗺</span>
        <span className="text-mil-textBright text-sm font-bold tracking-widest leading-none">TAKTİK HARİTA</span>
        <div className="ml-auto flex gap-2">
          <button
            id="btn-artillery"
            onClick={() => setStrikeMode(s => s === 'artillery' ? 'none' : 'artillery')}
            className={`text-xs px-2 py-0.5 border transition-all ${strikeMode === 'artillery' ? 'border-mil-yellow text-mil-yellow bg-yellow-950/30' : 'border-mil-border text-mil-dim hover:text-mil-yellow'}`}
            title="Topçu Desteği"
          >
            💣 TOPÇU
          </button>
          <button
            id="btn-airstrike"
            onClick={() => setStrikeMode(s => s === 'airstrike' ? 'none' : 'airstrike')}
            className={`text-xs px-2 py-0.5 border transition-all ${strikeMode === 'airstrike' ? 'border-mil-cyan text-mil-cyan bg-cyan-950/30' : 'border-mil-border text-mil-dim hover:text-mil-cyan'}`}
            title="Hava Desteği"
          >
            ✈ HAVA
          </button>
          <button
            id="btn-t129"
            disabled={!selectedUnitId}
            onClick={() => setStrikeMode(s => s === 't129' ? 'none' : 't129')}
            className={`text-xs px-2 py-0.5 border transition-all ${!selectedUnitId ? 'opacity-30 cursor-not-allowed border-mil-border text-mil-dim' : strikeMode === 't129' ? 'border-mil-green text-mil-green bg-green-950/30' : 'border-mil-border text-mil-dim hover:text-mil-green'}`}
            title="T-129 ATAK Yakın Hava Desteği"
          >
            🚁 ATAK
          </button>
          <button
            id="btn-uh60"
            disabled={!selectedUnitId || state.uh60State !== 'idle'}
            onClick={() => setStrikeMode(s => s === 'uh60' ? 'none' : 'uh60')}
            className={`text-xs px-2 py-0.5 border transition-all ${(!selectedUnitId || state.uh60State !== 'idle') ? 'opacity-30 cursor-not-allowed border-mil-border text-mil-dim' : strikeMode === 'uh60' ? 'border-mil-cyan text-mil-cyan bg-cyan-950/30' : 'border-mil-border text-mil-dim hover:text-mil-cyan'}`}
            title={state.uh60State !== 'idle' ? `UH-60 Operasyonda (ETA: ${state.uh60Timer} dk)` : "UH-60 MEDEVAC Tahliye"}
          >
            🚑 MEDEVAC {state.uh60State !== 'idle' && `(${state.uh60Timer})`}
          </button>
        </div>
      </div>

      {/* Strike mode indicator */}
      {strikeMode !== 'none' && (
        <div className={`text-center text-xs py-1 font-bold animate-pulse ${
          strikeMode === 'artillery' ? 'bg-yellow-950/40 text-mil-yellow' : 
          strikeMode === 't129' ? 'bg-green-950/40 text-mil-green' :
          'bg-cyan-950/40 text-mil-cyan'
        }`}>
          🎯 {
            strikeMode === 'artillery' ? 'TOPÇU' : 
            strikeMode === 'airstrike' ? 'HAVA DESTEĞİ' :
            strikeMode === 't129' ? 'T-129 ATAK (NOKTA ATIŞI)' :
            'UH-60 MEDEVAC (YARALI SEÇ)'
          } — Hedef koordinatı seç
        </div>
      )}

      {/* Map legend */}
      <div className="flex gap-3 px-3 py-1 border-b border-mil-border text-xs text-mil-dim flex-shrink-0 flex-wrap">
        <span className="text-mil-green">🔵 Dost</span>
        <span className="text-mil-red">🔴 Düşman</span>
        {hasCapturePoint && <span className="text-mil-yellow">🎯 Karakol</span>}
        {selectedUnitId && <span className="text-mil-textBright">↓ Hücreye tıkla → İntikal</span>}
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
        <div
          className="grid gap-0"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15, 1fr)',
            width: '100%',
            maxWidth: '480px',
            aspectRatio: '1/1',
          }}
        >
          {Array.from({ length: 15 }, (_, y) =>
            Array.from({ length: 15 }, (_, x) => {
              const cellKey = `${x},${y}`
              const unitHere = unitPositions.get(cellKey)
              const enemyHere = enemyPositions.get(cellKey)
              const terrain = grid[y]?.[x] ?? TerrainType.OPEN
              const isCapturePoint = hasCapturePoint && capturePoint.x === x && capturePoint.y === y
              const isSelectedUnit = unitHere && selectedUnitId === unitHere.unitId
              const isSelectedEnemy = enemyHere && selectedEnemyId === enemyHere.enemyId
              const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
              const isStrikeTarget = strikeMode !== 'none' && isHovered

              let borderColor = 'border-transparent'
              if (isSelectedUnit) borderColor = 'border-mil-green'
              else if (isSelectedEnemy) borderColor = 'border-mil-red'
              else if (isCapturePoint) borderColor = 'border-mil-yellow'
              else if (isStrikeTarget) {
                borderColor = 
                  strikeMode === 'artillery' ? 'border-mil-yellow' : 
                  strikeMode === 't129' ? 'border-mil-green' : 
                  'border-mil-cyan'
              }

              // Highlight potential MEDEVAC targets when in that mode
              const isEligibleMedevac = strikeMode === 'uh60' && unitHere && (!unitHere.unit.isAlive() || (unitHere.unit as Soldier).isIncapacitated())
              if (isEligibleMedevac) borderColor = 'border-mil-cyan animate-pulse shadow-[0_0_10px_#06b6d4]'

              return (
                <div
                  key={cellKey}
                  className={`map-cell relative flex items-center justify-center border cursor-pointer select-none ${borderColor} ${isStrikeTarget ? 'brightness-150' : ''}`}
                  style={{
                    backgroundColor: TERRAIN_BG[terrain],
                    aspectRatio: '1/1',
                    fontSize: 'clamp(6px, 1.5vw, 13px)',
                    borderWidth: '1px',
                    borderColor: isSelectedUnit ? '#22c55e' : isSelectedEnemy ? '#ef4444' : isCapturePoint ? '#eab308' : '#1e2e1e',
                  }}
                  onClick={() => handleCellClick(x, y)}
                  onMouseEnter={() => setHoveredCell({ x, y })}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={`(${x},${y}) ${terrain}${unitHere ? ` — ${unitHere.unit.getName()}` : ''}${enemyHere ? ` — ${enemyHere.enemy.getName()}` : ''}`}
                >
                  {unitHere ? (
                    <span
                      className={!unitHere.unit.isAlive() ? 'pulse-red' : ''}
                      style={{
                        textShadow: unitHere.unit.isAlive() 
                          ? '0 0 4px rgba(34,197,94,0.8)' 
                          : '0 0 6px rgba(239,68,68,0.9)',
                        filter: isSelectedUnit ? 'brightness(1.5)' : 'none',
                        color: unitHere.unit.isAlive() ? '#22c55e' : '#ef4444',
                      }}
                      title={unitHere.unit.getName() + (unitHere.unit.isAlive() ? '' : ' (WIA/KIA)')}
                    >
                      {unitHere.unit.isAlive() 
                        ? roleToIcon((unitHere.unit as Soldier).getRole()) 
                        : `☠️${roleToIcon((unitHere.unit as Soldier).getRole())}`}
                    </span>
                  ) : enemyHere ? (
                    <span
                      style={{ textShadow: '0 0 4px rgba(239,68,68,0.8)', filter: isSelectedEnemy ? 'brightness(1.5)' : 'none' }}
                      title={enemyHere.enemy.getName()}
                    >
                      {enemyTypeToIcon((enemyHere.enemy as EnemyUnit).getType())}
                    </span>
                  ) : isCapturePoint ? (
                    <span className="text-mil-yellow animate-pulse" style={{ textShadow: '0 0 6px rgba(234,179,8,0.8)' }}>🎯</span>
                  ) : (
                    <span className="text-mil-text opacity-30 select-none">{TERRAIN_SYMBOL[terrain]}</span>
                  )}

                  {/* HP mini bar for units */}
                  {unitHere && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-mil-border">
                      <div
                        className="h-full bg-mil-green transition-all"
                        style={{ width: `${(unitHere.unit.getHp() / unitHere.unit.getMaxHp()) * 100}%` }}
                      />
                    </div>
                  )}
                  {enemyHere && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-mil-border">
                      <div
                        className="h-full bg-mil-red transition-all"
                        style={{ width: `${(enemyHere.enemy.getHp() / enemyHere.enemy.getMaxHp()) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* UH-60 Transit Icon */}
                  {state.uh60Target && state.uh60Target.x === x && state.uh60Target.y === y && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <span className="text-lg animate-bounce drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                        {state.uh60State === 'loading' ? '🚑' : '🚁'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Coordinate display */}
      {hoveredCell && (
        <div className="px-3 py-1 bg-mil-panel border-t border-mil-border text-mil-dim text-xs flex-shrink-0">
          Koordinat: ({hoveredCell.x}, {hoveredCell.y}) — {
            (() => {
              const cellKey = `${hoveredCell.x},${hoveredCell.y}`
              const u = unitPositions.get(cellKey)
              const e = enemyPositions.get(cellKey)
              if (u) return `🔵 ${u.unit.getName()} — HP:${u.unit.getHp()}/${u.unit.getMaxHp()}`
              if (e) return `🔴 ${e.enemy.getName()} — HP:${e.enemy.getHp()}/${e.enemy.getMaxHp()}`
              return 'Boş Alan'
            })()
          }
        </div>
      )}
    </div>
  )
}
