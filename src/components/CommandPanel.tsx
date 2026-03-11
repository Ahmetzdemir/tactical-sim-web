import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'

const ADVANCE_OPTIONS = [5, 10, 15, 30, 60]

export function CommandPanel() {
  const { state, advanceTime, selectedUnitId, sendCommand } = useGameStore()
  const [customMinutes, setCustomMinutes] = useState(10)

  if (!state) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-mil-panel border-t border-mil-border flex-shrink-0 flex-wrap">
      {/* Time advance */}
      <div className="flex items-center gap-2">
        <span className="text-mil-dim text-xs font-bold tracking-widest">⏩ ZAMAN İLERLET:</span>
        <div className="flex gap-1">
          {ADVANCE_OPTIONS.map(m => (
            <button
              key={m}
              id={`btn-advance-${m}`}
              onClick={() => advanceTime(m)}
              disabled={state.phase !== 'playing'}
              className="text-xs px-2 py-1 border border-mil-border text-mil-dim hover:text-mil-green hover:border-mil-greenDim transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +{m}dk
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={1440}
          value={customMinutes}
          onChange={e => setCustomMinutes(parseInt(e.target.value) || 10)}
          className="w-14 text-xs px-2 py-1 bg-mil-bg border border-mil-border text-mil-textBright"
        />
        <button
          onClick={() => advanceTime(customMinutes)}
          disabled={state.phase !== 'playing'}
          className="text-xs px-2 py-1 border border-mil-greenDim text-mil-green hover:bg-green-950/20 transition-all disabled:opacity-40"
        >
          ▶ BAŞLAT
        </button>
      </div>

      {/* Unit commands (only when unit selected) */}
      {selectedUnitId && (
        <div className="flex items-center gap-2 border-l border-mil-border pl-3 ml-auto">
          <span className="text-mil-dim text-xs font-bold">[{selectedUnitId}]:</span>
          <button
            onClick={() => sendCommand(selectedUnitId, 'siper')}
            className="text-xs px-2 py-1 border border-mil-border text-mil-cyan hover:bg-cyan-950/20 transition-all"
            title="Siper emri ver"
          >
            🛡 Siper
          </button>
          <button
            onClick={() => sendCommand(selectedUnitId, 'ates')}
            className="text-xs px-2 py-1 border border-mil-border text-mil-red hover:bg-red-950/20 transition-all"
            title="Ateş emri ver"
          >
            🔫 Ateş
          </button>
          <button
            onClick={() => sendCommand(selectedUnitId, 'bekle')}
            className="text-xs px-2 py-1 border border-mil-border text-mil-yellow hover:bg-yellow-950/20 transition-all"
            title="Bekleme emri"
          >
            ⏸ Bekle
          </button>
        </div>
      )}

      {/* Phase badge */}
      {state.phase !== 'playing' && (
        <div className={`ml-auto text-xs font-bold px-3 py-1 border ${state.phase === 'victory' ? 'text-mil-green border-mil-green' : 'text-mil-red border-mil-red'} animate-pulse`}>
          {state.phase === 'victory' ? '🏆 ZAFER' : '💀 YENİLGİ'}
        </div>
      )}
    </div>
  )
}
