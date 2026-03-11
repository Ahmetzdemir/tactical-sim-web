import { useEffect } from 'react'
import { useGameStore } from './store/useGameStore'
import { MainMenu } from './components/MainMenu'
import { ScenarioSelect } from './components/ScenarioSelect'
import { GameLayout } from './components/GameLayout'
import { SaveLoadScreen } from './components/SaveLoadScreen'
import SandboxLobby from './components/SandboxLobby'
import DraftingMenu from './components/DraftingMenu'
import { LobbyComponent } from './components/LobbyComponent'
import { Draft1v1Component } from './components/Draft1v1Component'
import { audioManager } from './services/AudioManager'

export default function App() {
  const { appPhase, initEngine } = useGameStore()

  useEffect(() => {
    initEngine()

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"]')) {
        audioManager.playClick();
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [initEngine])

  return (
    <div className="h-screen w-screen overflow-hidden bg-mil-bg font-mono">
      {appPhase === 'menu' && <MainMenu />}
      {appPhase === 'scenario-select' && <ScenarioSelect />}
      {appPhase === 'playing' && <GameLayout />}
      {appPhase === 'save-load' && <SaveLoadScreen />}
      {appPhase === 'sandbox-lobby' && <SandboxLobby />}
      {appPhase === 'drafting' && <DraftingMenu />}
      {appPhase === 'multiplayer-lobby' && <LobbyComponent />}
      {appPhase === 'draft-1v1' && <Draft1v1Component />}
    </div>
  )
}
