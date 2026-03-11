import { useEffect } from 'react'
import { useGameStore } from './store/useGameStore'
import { MainMenu } from './components/MainMenu'
import { ScenarioSelect } from './components/ScenarioSelect'
import { GameLayout } from './components/GameLayout'
import { SaveLoadScreen } from './components/SaveLoadScreen'
import SandboxLobby from './components/SandboxLobby'
import DraftingMenu from './components/DraftingMenu'

export default function App() {
  const { appPhase, initEngine } = useGameStore()

  useEffect(() => {
    initEngine()
  }, [initEngine])

  return (
    <div className="h-screen w-screen overflow-hidden bg-mil-bg font-mono">
      {appPhase === 'menu' && <MainMenu />}
      {appPhase === 'scenario-select' && <ScenarioSelect />}
      {appPhase === 'playing' && <GameLayout />}
      {appPhase === 'save-load' && <SaveLoadScreen />}
      {appPhase === 'sandbox-lobby' && <SandboxLobby />}
      {appPhase === 'drafting' && <DraftingMenu />}
    </div>
  )
}
