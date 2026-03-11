import { useGameStore } from '../store/useGameStore'
import { OPERATIONS } from '../engine/Scenario'

export function VictoryScreen() {
  const { state, setAppPhase } = useGameStore()
  if (!state || (state.phase !== 'victory' && state.phase !== 'defeat')) return null

  const isVictory = state.phase === 'victory'
  const op = OPERATIONS[state.activeScenarioIndex - 1]

  const aliveUnits = [...state.units.values()].filter(u => u.isAlive()).length
  const totalUnits = state.units.size
  const deadEnemies = [...state.enemies.values()].filter(e => !e.isAlive()).length
  const totalEnemies = state.enemies.size

  return (
    <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
      <div className={`border max-w-md w-full ${isVictory ? 'border-mil-green glow-green' : 'border-mil-red glow-red'}`}>
        {/* Header */}
        <div className={`px-6 py-4 text-center ${isVictory ? 'bg-green-950/40' : 'bg-red-950/40'}`}>
          <div className="text-4xl mb-2">{isVictory ? '🏆' : '💀'}</div>
          <div className={`text-xl font-bold tracking-widest ${isVictory ? 'text-mil-green' : 'text-mil-red'}`}
            style={{ textShadow: isVictory ? '0 0 20px rgba(34,197,94,0.5)' : '0 0 20px rgba(239,68,68,0.5)' }}>
            {isVictory ? 'GÖREV BAŞARILI!' : 'GÖREV BAŞARISIZ'}
          </div>
          <div className="text-mil-dim text-sm mt-1">{op?.name}</div>
        </div>

        {/* Stats */}
        <div className="bg-mil-panel p-4 space-y-3 border-t border-mil-border">
          <div className="text-mil-cyan font-bold text-xs tracking-widest mb-2">
            [ HAREKÂT İSTATİSTİKLERİ ]
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border border-mil-border p-2">
              <div className="text-mil-dim">MEVCUT BİRLİKLER</div>
              <div className={`text-xl font-bold ${aliveUnits === 0 ? 'text-mil-red' : 'text-mil-green'}`}>
                {aliveUnits}/{totalUnits}
              </div>
            </div>
            <div className="border border-mil-border p-2">
              <div className="text-mil-dim">İMHA EDİLEN DÜŞMAN</div>
              <div className="text-xl font-bold text-mil-yellow">{deadEnemies}/{totalEnemies}</div>
            </div>
            <div className="border border-mil-border p-2">
              <div className="text-mil-dim">SÜRE</div>
              <div className="text-xl font-bold text-mil-cyan">
                {state.time.toString()}
              </div>
            </div>
            {state.hasCapturePoint && (
              <div className="border border-mil-border p-2">
                <div className="text-mil-dim">SAVUNMA</div>
                <div className="text-xl font-bold text-mil-yellow">
                  {state.defenseTimerCurrent}/{state.defenseTimerMax} dk
                </div>
              </div>
            )}
          </div>

          {isVictory && (
            <div className="text-mil-green text-xs text-center italic border-t border-mil-border pt-3">
              "Elinize sağlık komutanım. Bölge güvende."
            </div>
          )}
          {!isVictory && (
            <div className="text-mil-red text-xs text-center italic border-t border-mil-border pt-3">
              "Mevzi düştü. Geri çekilme kararı alınıyor..."
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex border-t border-mil-border">
          <button
            onClick={() => setAppPhase('scenario-select')}
            className="flex-1 py-3 text-sm font-bold text-mil-green border-r border-mil-border hover:bg-green-950/20 transition-all"
          >
            ▶ YENİ GÖREV
          </button>
          <button
            onClick={() => setAppPhase('menu')}
            className="flex-1 py-3 text-sm font-bold text-mil-dim hover:text-mil-green transition-all"
          >
            ⌂ ANA MENÜ
          </button>
        </div>
      </div>
    </div>
  )
}
