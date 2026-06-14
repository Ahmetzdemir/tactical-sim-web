// ============================================================
// useGameStore.ts — Zustand global game state
// ============================================================

import { create } from 'zustand'
import { GameEngine, GameState } from '../engine/GameEngine'
import { Soldier } from '../engine/Soldier'
import {
  SupplyType, SandboxSettings, SoldierRole
} from '../engine/types'
import { OPERATIONS, OperationInfo, makeUnit } from '../engine/Scenario'
import { SaveSystem } from '../engine/SaveSystem'

interface GameStore {
  engine: GameEngine | null
  state: GameState | null
  selectedUnitId: string | null
  selectedEnemyId: string | null
  attackMode: boolean
  appPhase: 'menu' | 'scenario-select' | 'playing' | 'save-load' | 'sandbox-lobby' | 'drafting' | 'multiplayer-lobby' | 'draft-1v1'
  sandboxSettings: SandboxSettings | null
  draftedUnits: Soldier[]

  isMuted: boolean
  musicVolume: number
  sfxVolume: number

  // Multiplayer State
  multiplayerRoomId: string | null
  userId: string | null
  authError: string | null
  isHost: boolean
  isMultiplayer: boolean

  // Actions
  initEngine: () => void
  setMuted: (muted: boolean) => void
  toggleMute: () => void
  setMusicVolume: (volume: number) => void
  setSfxVolume: (volume: number) => void
  
  // Multiplayer Actions
  initMultiplayer: () => Promise<void>
  joinRoom: (roomId: string) => Promise<void>
  syncState: () => void
  setAppPhase: (phase: 'menu' | 'scenario-select' | 'playing' | 'save-load' | 'sandbox-lobby' | 'drafting' | 'multiplayer-lobby' | 'draft-1v1') => void

  startScenario: (index: number) => void
  startSandbox: (settings: SandboxSettings, draftedUnits: Soldier[]) => void
  advanceTime: (minutes: number) => void
  selectUnit: (id: string | null) => void
  selectEnemy: (id: string | null) => void
  moveUnit: (unitId: string, x: number, y: number) => void
  fireAtEnemy: (unitId: string) => void
  attackMoveToEnemy: (unitId: string, enemyId: string) => void
  setAttackMode: (mode: boolean) => void
  issueFirePermission: (decision: 'ATES_IZNI_VERILDI' | 'ATES_YASAK' | 'BEKLEMEDE_KAL') => void
  requestSupply: (unitId: string, type: SupplyType, amount: number) => void
  artilleryAt: (x: number, y: number) => void
  airStrikeAt: (x: number, y: number) => void
  callT129: (unitId: string, x: number, y: number) => void
  callUH60: (unitId: string, targetUnitId: string) => void
  sendCommand: (unitId: string, cmd: string) => void
  setSandboxSettings: (settings: SandboxSettings) => void
  addDraftedUnit: (role: SoldierRole) => void
  removeDraftedUnit: (id: string) => void
  saveGame: (slot: number) => Promise<void>
  loadGame: (slot: number) => Promise<boolean>
  getOperations: () => OperationInfo[]

  // 1v1 Actions
  init1v1Draft: () => void
  buyUnit1v1: (playerId: string, role: SoldierRole, cost: number) => void
  placeUnit1v1: (playerId: string, role: SoldierRole, x: number, y: number) => void
  setReady1v1: (playerId: string) => void
  endTurn1v1: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  state: null,
  selectedUnitId: null,
  selectedEnemyId: null,
  attackMode: false,
  appPhase: 'menu',
  sandboxSettings: null,
  draftedUnits: [],
  isMuted: false,
  musicVolume: 0.5,
  sfxVolume: 1.0,

  multiplayerRoomId: null,
  userId: null,
  authError: null,
  isHost: false,
  isMultiplayer: false,

  initEngine: () => {
    const engine = new GameEngine()
    engine.subscribe((state) => {
      set({ state })
    })
    set({ engine })
  },

  setMuted: (muted: boolean) => {
    set({ isMuted: muted });
    import('../services/AudioManager').then(({ audioManager }) => audioManager.setMute(muted));
  },
  toggleMute: () => {
    const newMuted = !get().isMuted;
    set({ isMuted: newMuted });
    import('../services/AudioManager').then(({ audioManager }) => audioManager.setMute(newMuted));
  },

  setMusicVolume: (volume: number) => {
    set({ musicVolume: volume });
    import('../services/AudioManager').then(({ audioManager }) => audioManager.setMusicVolume(volume));
  },
  setSfxVolume: (volume: number) => {
    set({ sfxVolume: volume });
    import('../services/AudioManager').then(({ audioManager }) => audioManager.setSfxVolume(volume));
  },

  initMultiplayer: async () => {
    const { signInAnonymously } = await import('firebase/auth')
    const { auth } = await import('../services/firebase')
    try {
      const user = await signInAnonymously(auth)
      set({ userId: user.user.uid, authError: null })
    } catch (e: any) {
      console.error("Firebase Login Error", e)
      set({ authError: e.message || "Authentication failed" })
    }
  },

  joinRoom: async (roomId) => {
    const { ref, onValue } = await import('firebase/database')
    const { db } = await import('../services/firebase')
    const roomRef = ref(db, `rooms/${roomId}`)
    onValue(roomRef, (snapshot) => {
      const data = snapshot.val()
      if (data && data.gameState) {
        const { engine } = get()
        if (engine) {
          engine.loadFromSave(data.gameState)
          const engineState = engine.getState()
          const isDraftRoom = data.type === 'draft'
          
          let nextPhase = get().appPhase
          if (isDraftRoom) {
            // In draft room, we only go to 'playing' if matchPhase is 'PLAYING'
            if (engineState.matchPhase === 'PLAYING') {
              nextPhase = 'playing'
            } else {
              nextPhase = 'draft-1v1'
            }
          } else {
            nextPhase = 'playing'
          }

          set({ 
            state: engineState,
            appPhase: nextPhase
          })
        }
      }
    })

    set({ multiplayerRoomId: roomId, isMultiplayer: true, isHost: false })
  },

  syncState: () => {
    const { multiplayerRoomId, engine, isMultiplayer, isHost } = get()
    if (!isMultiplayer || !multiplayerRoomId || !engine) return
    
    import('firebase/database').then(({ ref, update }) => {
      import('../services/firebase').then(({ db }) => {
        const roomRef = ref(db, `rooms/${multiplayerRoomId}/gameState`)
        const data = engine.serialize() as any
        
        // CRITICAL: Prevent stomping on opponent's independent state
        // When updating, we only want to send our own ready state and budget.
        // This prevents the "Last Write Wins" bug where we overwrite the opponent's
        // fresh 'ready: true' with our local 'ready: false' before we've received their update.
        if (isHost) {
          delete data.guestReady
          delete data.guestBudget
        } else {
          delete data.hostReady
          delete data.hostBudget
        }

        update(roomRef, data)
      })
    })
  },

  startScenario: (index: number) => {
    const { engine } = get()
    if (!engine) return
    engine.loadScenario(index)
    set({
      appPhase: 'playing',
      selectedUnitId: null,
      selectedEnemyId: null,
      state: engine.getState(),
    })
    get().syncState()
  },

  startSandbox: (settings, units) => {
    const { engine } = get()
    if (!engine) return
    const unitMap = new Map<string, Soldier>()
    units.forEach(u => unitMap.set(u.getId(), u))
    engine.loadSandbox(unitMap, settings)
    set({
      appPhase: 'playing',
      selectedUnitId: null,
      selectedEnemyId: null,
      state: engine.getState(),
    })
    get().syncState()
  },

  advanceTime: (minutes: number) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.advance(minutes)
    set({ state: engine.getState() })
    syncState()
  },

  selectUnit: (id: string | null) => {
    set({ selectedUnitId: id, selectedEnemyId: null })
  },

  selectEnemy: (id: string | null) => {
    set({ selectedEnemyId: id, selectedUnitId: null })
  },  moveUnit: (unitId: string, x: number, y: number) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.moveUnit(unitId, x, y)
    set({ state: engine.getState() })
    syncState()
  },

  fireAtEnemy: (unitId: string) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.fireAtUnit(unitId)
    set({ state: engine.getState() })
    syncState()
  },

  attackMoveToEnemy: (unitId: string, enemyId: string) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.setAttackRoute(unitId, enemyId)
    set({ state: engine.getState(), attackMode: false })
    syncState()
  },

  setAttackMode: (mode: boolean) => {
    set({ attackMode: mode })
  },

  issueFirePermission: (decision) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.issueFirePermission(decision)
    set({ state: engine.getState() })
    syncState()
  },

  requestSupply: (unitId, type, amount) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.requestSupply(unitId, type, amount)
    set({ state: engine.getState() })
    syncState()
  },

  artilleryAt: (x, y) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.artilleryAt(x, y)
    set({ state: engine.getState() })
    syncState()
  },

  airStrikeAt: (x, y) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.airStrikeAt(x, y)
    set({ state: engine.getState() })
    syncState()
  },

  callT129: (unitId, x, y) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.callT129(unitId, x, y)
    set({ state: engine.getState() })
    syncState()
  },

  callUH60: (unitId, targetUnitId) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.callUH60(unitId, targetUnitId)
    set({ state: engine.getState() })
    syncState()
  },

  sendCommand: (unitId, cmd) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.sendRadioCommand(unitId, cmd)
    set({ state: engine.getState() })
    syncState()
  },

  setAppPhase: (phase) => set({ appPhase: phase }),

  setSandboxSettings: (settings) => set({ sandboxSettings: settings }),

  addDraftedUnit: (role) => {
    const { draftedUnits } = get()
    if (draftedUnits.length >= 6) return
    const id = `UNIT-${draftedUnits.length + 1}`
    const name = `${role} Timi`
    const unit = makeUnit(id, name, role, 100, 100, 200, 10, 2, 0, 0)
    set({ draftedUnits: [...draftedUnits, unit] })
  },

  removeDraftedUnit: (id) => {
    const { draftedUnits } = get()
    set({ draftedUnits: draftedUnits.filter(u => u.getId() !== id) })
  },

  saveGame: async (slot) => {
    const { engine, state } = get()
    if (!engine || !state) return
    const scenarioName = OPERATIONS[state.activeScenarioIndex - 1]?.name ?? 'Bilinmeyen'
    await SaveSystem.save(slot, scenarioName, engine.serialize())
  },

  loadGame: async (slot) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const saveData = await SaveSystem.load(slot)
    if (!saveData) return false
    engine.loadFromSave(saveData.gameData)
    set({ state: engine.getState(), appPhase: 'playing' })
    syncState()
    return true
  },

  getOperations: () => OPERATIONS,

  init1v1Draft: () => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.initMatch1v1()
    set({ state: engine.getState(), appPhase: 'drafting', isMultiplayer: true })
    syncState()
  },

  buyUnit1v1: (playerId, role, cost) => {
    const { engine, syncState } = get()
    if (!engine) return
    if (engine.buyUnit(playerId, role, cost)) {
      set({ state: engine.getState() })
      syncState()
    }
  },

  placeUnit1v1: (playerId, role, x, y) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.placeUnit(playerId, role, x, y)
    set({ state: engine.getState() })
    syncState()
  },

  setReady1v1: (playerId) => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.setMatchReady(playerId)
    set({ state: engine.getState() })
    // We call syncState which now uses update(), so it won't stomp on the other player's ready state
    syncState()
  },

  endTurn1v1: () => {
    const { engine, syncState } = get()
    if (!engine) return
    engine.endTurn()
    set({ state: engine.getState() })
    syncState()
  },
}))
