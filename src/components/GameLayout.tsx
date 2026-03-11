import { useGameStore } from '../store/useGameStore'
import { TopBar } from './TopBar'
import { RadioLog } from './RadioLog'
import { MapGridComponent } from './MapGridComponent'
import { UnitHUD } from './UnitHUD'
import { CommandPanel } from './CommandPanel'
import { EngagementModal } from './EngagementModal'
import { VictoryScreen } from './VictoryScreen'
import { BriefingModal } from './BriefingModal'
import { useState, useEffect } from 'react'

export function GameLayout() {
  const { state } = useGameStore()
  const [showBriefing, setShowBriefing] = useState(false)

  // Show briefing on initial load for a scenario
  useEffect(() => {
    if (state && state.radioLog.length <= 1) {
      setShowBriefing(true)
    }
  }, [state?.activeScenarioIndex])

  if (!state) return (
    <div className="h-full flex flex-col items-center justify-center text-mil-dim bg-mil-bg">
      <div className="text-xl mb-4 animate-pulse">Yükleniyor...</div>
      <div className="text-[10px] text-mil-border uppercase tracking-widest">
        {useGameStore.getState().isMultiplayer ? "VERİ SENKRONİZASYONU BEKLENİYOR..." : "MOTOR BAŞLATILIYOR..."}
      </div>
      <div className="mt-8 text-[8px] opacity-50">
        ROOM: {useGameStore.getState().multiplayerRoomId || 'LOCAL'}
      </div>
    </div>
  )

  const isShaking = state.screenShake

  return (
    <div className={`h-full flex flex-col ${isShaking ? 'screen-shake' : ''}`}>
      {/* Top bar */}
      <TopBar />

      {/* Main 3-panel layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Radio Log (~25%) */}
        <div className="w-1/4 min-w-[280px] max-w-sm flex-shrink-0 border-r border-mil-border bg-[#0d150d] overflow-hidden flex flex-col">
          <RadioLog messages={state.radioLog} />
        </div>

        {/* Center: Map (~50%) */}
        <div className="flex-1 overflow-hidden flex flex-col border-r border-mil-border bg-[#050a05]">
          <MapGridComponent />
        </div>

        {/* Right: Unit HUD (~25%) */}
        <div className="w-1/4 min-w-[280px] max-w-sm flex-shrink-0 bg-[#0d150d] overflow-hidden flex flex-col">
          <UnitHUD />
        </div>
      </div>

      {/* Bottom: Command panel */}
      <CommandPanel />

      {/* Modals */}
      <EngagementModal />
      <VictoryScreen />
      <BriefingModal isOpen={showBriefing} onClose={() => setShowBriefing(false)} />
      <div 
        className="lighting-overlay" 
        style={{ backgroundColor: state.weather.getLightingColor(state.time.hour) }} 
      />
    </div>
  )
}
