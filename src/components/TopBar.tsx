import { useGameStore } from '../store/useGameStore'
import { OPERATIONS } from '../engine/Scenario'

export function TopBar() {
  const { state, setAppPhase } = useGameStore()
  if (!state) return null

  const { time, weather, resources, activeScenarioIndex, sandboxSettings } = state
  const operation = activeScenarioIndex > 0 ? OPERATIONS[activeScenarioIndex - 1] : null
  const opName = operation ? operation.name : (sandboxSettings ? (sandboxSettings.mode === 'SURVIVAL' ? 'SONSUZ DİRENİŞ' : 'BÖLGE TEMİZLİĞİ') : 'SERBEST MOD')

  const rationsCritical = resources.isRationsCritical()
  const ammoCritical = resources.isAmmoCritical()
  const medkitsCritical = resources.isMedkitsCritical()

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-mil-panel border-b border-mil-border flex-shrink-0 flex-wrap text-xs">
      {/* Operation name */}
      <div className="flex items-center gap-2 mr-2">
        <span className="text-mil-yellow font-bold tracking-wider">
          [{opName}]
        </span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 border-l border-mil-border pl-3">
        <span className="text-mil-dim">⏱</span>
        <span className="text-mil-textBright font-bold tracking-widest">{time.toString()}</span>
      </div>

      {/* Weather */}
      <div className="flex items-center gap-1 border-l border-mil-border pl-3">
        <span className="text-mil-dim">☁</span>
        <span className="text-mil-cyan">{weather.getWeatherName()}</span>
      </div>

      {/* Resources */}
      <div className="flex items-center gap-4 border-l border-mil-border pl-4 ml-auto">
        <span className={`flex items-center gap-1.5 ${rationsCritical ? 'text-mil-red pulse-red' : 'text-mil-text'}`}
          title="Erzak">
          <span className="text-base">🍞</span> <span className="text-mil-dim hidden sm:inline">Erzak:</span> <span className="font-bold">{resources.getRations()}</span>
        </span>
        <span className={`flex items-center gap-1.5 ${ammoCritical ? 'text-mil-red pulse-red' : 'text-mil-text'}`}
          title="Mühimmat">
          <span className="text-base">🔫</span> <span className="text-mil-dim hidden sm:inline">Mühimmat:</span> <span className="font-bold">{resources.getAmmo()}</span>
        </span>
        <span className={`flex items-center gap-1.5 ${medkitsCritical ? 'text-mil-red pulse-red' : 'text-mil-text'}`}
          title="Medkit">
          <span className="text-base">💊</span> <span className="text-mil-dim hidden sm:inline">Medkit:</span> <span className="font-bold">{resources.getMedkits()}</span>
        </span>
      </div>

      {/* Capture point timer */}
      {state.hasCapturePoint && (
        <div className="border-l border-mil-border pl-3">
          <span className="text-mil-yellow">
            🎯 {state.defenseTimerCurrent}/{state.defenseTimerMax} dk
          </span>
        </div>
      )}

      {/* Menu */}
      <div className="flex gap-2 border-l border-mil-border pl-3">
        <button
          onClick={() => setAppPhase('save-load')}
          className="text-mil-dim hover:text-mil-green transition-colors"
          title="Kayıt / Yükle"
        >
          💾 KAYIT
        </button>
        <button
          onClick={() => setAppPhase('menu')}
          className="text-mil-dim hover:text-mil-red transition-colors"
          title="Menüye dön"
        >
          ✕ ÇIKIŞ
        </button>
      </div>
    </div>
  )
}
