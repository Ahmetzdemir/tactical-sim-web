import { useGameStore } from '../store/useGameStore'
import { OPERATIONS } from '../engine/Scenario'

const SCENARIO_ICONS = ['🛡', '🌲', '🌾', '🦅', '⚓', '🌙']
const SCENARIO_DIFFICULTY = ['ORTA', 'ZOR', 'KOLAY', 'ZOR', 'ÇOK ZOR', 'ORTA']
const SCENARIO_DIFF_COLOR = [
  'text-mil-yellow', 'text-mil-red', 'text-mil-green', 'text-mil-red', 'text-red-600', 'text-mil-yellow'
]

export function ScenarioSelect() {
  const { startScenario, setAppPhase } = useGameStore()

  return (
    <div className="h-full flex flex-col bg-mil-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-mil-border bg-mil-panel">
        <button
          onClick={() => setAppPhase('menu')}
          className="text-mil-dim hover:text-mil-green transition-colors text-sm"
        >
          ◄ GERİ
        </button>
        <div className="text-mil-cyan font-bold tracking-widest text-sm flex-1 text-center">
          ╔══ OPERASYON SEÇİMİ ══╗
        </div>
        <div className="text-mil-dim text-xs">6 OPERASYON</div>
      </div>

      {/* Scenario grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {OPERATIONS.map((op, idx) => (
            <button
              key={op.id}
              id={`scenario-${idx + 1}`}
              onClick={() => startScenario(idx + 1)}
              className="group text-left border border-mil-border bg-mil-panel hover:border-mil-khakiLight hover:bg-mil-panel transition-all duration-200 p-4 hover:glow-green"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{SCENARIO_ICONS[idx]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-mil-dim text-xs">OPERASYON {idx + 1}</span>
                    <span className={`text-xs font-bold ${SCENARIO_DIFF_COLOR[idx]}`}>
                      [{SCENARIO_DIFFICULTY[idx]}]
                    </span>
                  </div>
                  <div className="text-mil-textBright font-bold text-sm leading-snug group-hover:text-mil-green transition-colors">
                    {op.name}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-mil-text text-xs leading-relaxed mb-3 line-clamp-3">
                {op.desc}
              </p>

              {/* Objective */}
              <div className="border-t border-mil-border pt-2">
                <div className="text-mil-yellow text-xs font-bold mb-1">🎯 HEDEF:</div>
                <p className="text-mil-cyan text-xs leading-relaxed line-clamp-2">{op.objective}</p>
              </div>

              {/* Start button */}
              <div className="mt-3 py-2 text-center text-xs font-bold border border-mil-border group-hover:border-mil-khakiLight group-hover:text-mil-green text-mil-dim transition-all">
                ▶ GÖREVE BAŞLA
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
