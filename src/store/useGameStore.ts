// ============================================================
// useGameStore.ts — Zustand global game state
// ============================================================

import { create } from 'zustand'
import { GameEngine, GameState } from '../engine/GameEngine'
import { Soldier } from '../engine/Soldier'
import { webSocketService } from '../services/websocket'
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
  strikeMode: 'none' | 'artillery' | 'airstrike' | 't129' | 'uh60' | 'uh60-dropoff' | 'attack' | 'command-airdrop'
  appPhase: 'menu' | 'scenario-select' | 'playing' | 'save-load' | 'sandbox-lobby' | 'drafting' | 'multiplayer-lobby' | 'draft-1v1'
  sandboxSettings: SandboxSettings | null
  draftedUnits: Soldier[]
  draftedMaterials: number
  addDraftedMaterial: () => void
  removeDraftedMaterial: () => void

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

  startScenario: (index: number, difficulty?: 'EASY' | 'STANDARD' | 'HARD') => void
  startSandbox: (settings: SandboxSettings, draftedUnits: Soldier[]) => void
  advanceTime: (minutes: number) => void
  selectUnit: (id: string | null) => void
  selectEnemy: (id: string | null) => void
  moveUnit: (unitId: string, x: number, y: number) => void
  fireAtEnemy: (unitId: string) => void
  attackMoveToEnemy: (unitId: string, enemyId: string) => void
  setAttackMode: (mode: boolean) => void
  setStrikeMode: (mode: 'none' | 'artillery' | 'airstrike' | 't129' | 'uh60' | 'uh60-dropoff' | 'attack' | 'command-airdrop') => void
  issueFirePermission: (decision: 'ATES_IZNI_VERILDI' | 'ATES_YASAK' | 'BEKLEMEDE_KAL') => void
  requestSupply: (unitId: string, type: SupplyType, amount: number) => void
  artilleryAt: (x: number, y: number) => boolean
  airStrikeAt: (x: number, y: number) => boolean
  callT129: (x: number, y: number) => boolean
  callUH60: (unitId: string, targetUnitId: string, destX: number, destY: number) => boolean
  executeCommandAirdrop: (x: number, y: number) => boolean
  executeCommandReinforce: (x: number, y: number, role: SoldierRole) => boolean
  executeHospitalHeal: (x: number, y: number) => boolean
  executeSupplyAmmo: (x: number, y: number) => boolean
  executeSandbagRepair: (x: number, y: number) => boolean
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
  strikeMode: 'none',
  appPhase: 'menu',
  sandboxSettings: null,
  draftedUnits: [],
  draftedMaterials: 0,
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
    try {
      let localId = localStorage.getItem('tactical_sim_userId');
      if (!localId) {
        localId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        localStorage.setItem('tactical_sim_userId', localId);
      }
      
      // Register all WebSocket callbacks here
      webSocketService.on('ROOM_CREATED', (data) => {
        set({ multiplayerRoomId: data.roomId, isMultiplayer: true, isHost: true });
        if (data.room.type === 'draft') {
          get().init1v1Draft();
          set({ appPhase: 'draft-1v1' });
        }
      });

      webSocketService.on('ROOM_JOINED', (data) => {
        set({ 
          multiplayerRoomId: data.roomId, 
          isMultiplayer: true, 
          isHost: data.room.host === get().userId 
        });
        
        if (data.room.type === 'draft') {
          get().init1v1Draft();
          set({ appPhase: 'draft-1v1' });
        } else {
          set({ appPhase: 'playing' });
        }

        if (data.room.gameState) {
          const { engine } = get();
          if (engine) {
            engine.loadFromSave(data.room.gameState);
            set({ state: engine.getState() });
          }
        }
      });

      webSocketService.on('ROOM_UPDATED', (data) => {
        if (data.room.status === 'active') {
          const isHost = data.room.host === get().userId;
          if (data.room.type === 'draft') {
            set({ appPhase: 'draft-1v1' });
          } else {
            // Host selects scenario first, guest goes to playing (which waits for syncState)
            set({ appPhase: isHost ? 'scenario-select' : 'playing' });
          }
        }
      });

      webSocketService.on('GAME_STATE_SYNC', (data) => {
        if (data.gameState) {
          const { engine } = get();
          if (engine) {
            engine.loadFromSave(data.gameState);
            const engineState = engine.getState();
            
            let nextPhase = get().appPhase;
            if (engineState.matchPhase === 'PLAYING') {
              nextPhase = 'playing';
            }

            set({ 
              state: engineState,
              appPhase: nextPhase
            });
          }
        }
      });

      webSocketService.on('OPPONENT_LEFT', (data) => {
        alert(data.message || 'Rakip oyundan ayrıldı.');
        set({ 
          multiplayerRoomId: null, 
          isMultiplayer: false, 
          isHost: false,
          appPhase: 'menu'
        });
      });

      webSocketService.on('RECONNECTED', (data) => {
        console.log(`Reconnected to room ${data.roomId}`);
        set({ 
          multiplayerRoomId: data.roomId, 
          isMultiplayer: true,
          isHost: data.room.host === get().userId
        });

        if (data.gameState) {
          const { engine } = get();
          if (engine) {
            engine.loadFromSave(data.gameState);
            set({ state: engine.getState() });
          }
        }
      });

      // Connect socket
      webSocketService.connect(localId);
      set({ userId: localId, authError: null });
    } catch (e: any) {
      console.error("WebSocket Init Error", e);
      set({ authError: e.message || "WebSocket Connection failed" });
    }
  },

  joinRoom: async (roomId) => {
    webSocketService.send({
      type: 'JOIN_ROOM',
      roomId
    });
  },

  syncState: () => {
    const { multiplayerRoomId, engine, isMultiplayer } = get();
    if (!isMultiplayer || !multiplayerRoomId || !engine) return;
    
    const data = engine.serialize() as any;

    // Filter undefined fields to clean payload
    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
    
    webSocketService.send({
      type: 'GAME_STATE_UPDATE',
      gameState: data
    });
  },

  startScenario: (index: number, difficulty: 'EASY' | 'STANDARD' | 'HARD' = 'STANDARD') => {
    const { engine } = get()
    if (!engine) return
    engine.loadScenario(index, difficulty)
    set({
      appPhase: 'playing',
      selectedUnitId: null,
      selectedEnemyId: null,
      state: engine.getState(),
    })
    get().syncState()
  },

  startSandbox: (settings, units) => {
    const { engine, draftedMaterials } = get()
    if (!engine) return
    
    const freshUnits: Soldier[] = []
    const unitMap = new Map<string, Soldier>()
    
    units.forEach(u => {
      // Re-create each unit to ensure fresh stats (HP, morale, ammo, etc.) on restart
      const freshUnit = makeUnit(
        u.getId(),
        u.getName(),
        u.getRole(),
        100,  // maxHp/hp
        100,  // morale
        200,  // ammo
        10,   // rations
        2,    // medkits
        0,    // position will be set in loadSandbox
        0
      )
      freshUnits.push(freshUnit)
      unitMap.set(freshUnit.getId(), freshUnit)
    })

    engine.loadSandbox(unitMap, settings, draftedMaterials)
    set({
      draftedUnits: freshUnits,
      draftedMaterials: 0, // Reset
      appPhase: 'playing',
      selectedUnitId: null,
      selectedEnemyId: null,
      state: engine.getState(),
    })
    get().syncState()
  },
  addDraftedMaterial: () => {
    set({ draftedMaterials: get().draftedMaterials + 1 })
  },
  removeDraftedMaterial: () => {
    const current = get().draftedMaterials
    if (current > 0) {
      set({ draftedMaterials: current - 1 })
    }
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

  setStrikeMode: (mode) => {
    set({ strikeMode: mode })
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
    if (!engine) return false
    const ok = engine.artilleryAt(x, y)
    set({ state: engine.getState() })
    syncState()
    return ok
  },

  airStrikeAt: (x, y) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const ok = engine.airStrikeAt(x, y)
    set({ state: engine.getState() })
    syncState()
    return ok
  },

  callT129: (x, y) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const ok = engine.callT129(x, y)
    set({ state: engine.getState() })
    syncState()
    return ok
  },

  callUH60: (unitId, targetUnitId, destX, destY) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const ok = engine.callUH60(unitId, targetUnitId, destX, destY)
    set({ state: engine.getState() })
    syncState()
    return ok
  },

  executeCommandAirdrop: (x, y) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const ok = engine.executeCommandAirdrop(x, y)
    set({ state: engine.getState() })
    syncState()
    return ok
  },

  executeCommandReinforce: (x, y, role) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const ok = engine.executeCommandReinforce(x, y, role)
    set({ state: engine.getState() })
    syncState()
    return ok
  },

  executeHospitalHeal: (x, y) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const ok = engine.executeHospitalHeal(x, y)
    set({ state: engine.getState() })
    syncState()
    return ok
  },

  executeSupplyAmmo: (x, y) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const ok = engine.executeSupplyAmmo(x, y)
    set({ state: engine.getState() })
    syncState()
    return ok
  },

  executeSandbagRepair: (x, y) => {
    const { engine, syncState } = get()
    if (!engine) return false
    const ok = engine.executeSandbagRepair(x, y)
    set({ state: engine.getState() })
    syncState()
    return ok
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
