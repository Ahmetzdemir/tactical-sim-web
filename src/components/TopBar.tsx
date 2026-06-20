import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { OPERATIONS } from '../engine/Scenario'
import { audioManager } from '../services/AudioManager'

export function TopBar() {
  const { state, setAppPhase, isMuted, toggleMute } = useGameStore()

  useEffect(() => {
    audioManager.setMute(isMuted)
  }, [isMuted])

  if (!state) return null

  const { time, weather, resources, activeScenarioIndex, sandboxSettings } = state
  const operation = activeScenarioIndex > 0 ? OPERATIONS[activeScenarioIndex - 1] : null
  const opName = operation ? operation.name : (sandboxSettings ? (sandboxSettings.mode === 'SURVIVAL' ? 'SONSUZ DİRENİŞ' : sandboxSettings.mode === 'RAAS' ? 'HEDEF ARAMA (RAAS)' : 'BÖLGE TEMİZLİĞİ') : 'SERBEST MOD')

  const rationsCritical = resources.isRationsCritical()
  const ammoCritical = resources.isAmmoCritical()
  const medkitsCritical = resources.isMedkitsCritical()
  const materialsCritical = typeof resources.isMaterialsCritical === 'function' ? resources.isMaterialsCritical() : false

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-mil-panel border-b border-mil-border flex-shrink-0 flex-wrap text-xs">
      {/* Operation name */}
      <div className="flex items-center gap-2 mr-2">
        <span className="text-mil-yellow font-bold tracking-wider">
          [{opName}]
        </span>
      </div>

      {/* 1v1 Turn Indicator */}
      {useGameStore.getState().isMultiplayer && state.matchPhase === 'PLAYING' && (
        <div className="flex items-center gap-2 border-l border-mil-border pl-3">
          <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${
            state.activePlayerId === (useGameStore.getState().isHost ? 'host' : 'guest')
              ? 'bg-mil-cyan text-mil-bg animate-pulse'
              : 'bg-mil-panel border border-mil-border text-mil-dim'
          }`}>
            {state.activePlayerId === (useGameStore.getState().isHost ? 'host' : 'guest') ? 'SIRANIZ' : 'RAKİP SIRASI'}
          </span>
          {state.activePlayerId === (useGameStore.getState().isHost ? 'host' : 'guest') && (
            <button
              onClick={() => useGameStore.getState().endTurn1v1()}
              className="px-2 py-0.5 bg-mil-bg border border-mil-cyan text-mil-cyan text-[10px] font-bold hover:bg-mil-cyan hover:text-mil-bg transition-all"
            >
              TURU BİTİR
            </button>
          )}
        </div>
      )}

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

      {/* Telsiz Sinyal Gücü */}
      <div className="flex items-center gap-1.5 border-l border-mil-border pl-3">
        <span className="text-mil-dim">📡</span>
        <span className="text-mil-dim">Sinyal:</span>
        <span className={`font-bold tracking-wider ${state.signalStrength < 0.2 ? 'text-mil-red animate-pulse' : state.signalStrength < 0.5 ? 'text-mil-yellow' : 'text-mil-green'}`}>
          {Math.round(state.signalStrength * 100)}%
        </span>
        {state.signalStrength < 0.2 && (
          <span className="text-mil-red font-black text-[9px] bg-red-950/20 px-1 border border-mil-red/30 animate-pulse uppercase tracking-tighter">
            OTOMATİK ROE
          </span>
        )}
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
        <span className={`flex items-center gap-1.5 ${materialsCritical ? 'text-mil-red pulse-red' : 'text-mil-text'}`}
          title="Malzeme">
          <span className="text-base">🔧</span> <span className="text-mil-dim hidden sm:inline">Malzeme:</span> <span className="font-bold">{typeof resources.getMaterials === 'function' ? resources.getMaterials() : 0}</span>
        </span>
      </div>

      {/* Capture point timer */}
      {state.hasCapturePoint && (
        <div className="border-l border-mil-border pl-3">
          <span className="text-mil-yellow font-bold">
            🎯 {state.sandboxSettings?.mode === 'RAAS'
              ? `${state.raasActivePointIndex === 0 ? 'Hedef A' : state.raasActivePointIndex === 1 ? 'Hedef B' : 'Hedef C'} (${state.capturePoint.x}, ${state.capturePoint.y}) — Kontrol: ${state.capturePointTurns?.host || 0}/3 Tur`
              : `${state.defenseTimerCurrent}/${state.defenseTimerMax} tur`
            }
          </span>
        </div>
      )}

      {/* Menu */}
      <div className="flex gap-2 border-l border-mil-border pl-3">
        <button
          onClick={toggleMute}
          className="text-mil-dim hover:text-mil-yellow transition-colors"
          title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
        >
          {isMuted ? "🔇 SES: KAPALI" : "🔊 SES: AÇIK"}
        </button>
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
