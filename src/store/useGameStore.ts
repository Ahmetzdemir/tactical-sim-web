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
  appPhase: 'menu' | 'scenario-select' | 'playing' | 'save-load' | 'sandbox-lobby' | 'drafting'
  sandboxSettings: SandboxSettings | null
  draftedUnits: Soldier[]

  // Actions
  initEngine: () => void
  startScenario: (index: number) => void
  startSandbox: (settings: SandboxSettings, draftedUnits: Soldier[]) => void
  advanceTime: (minutes: number) => void
  selectUnit: (id: string | null) => void
  selectEnemy: (id: string | null) => void
  moveUnit: (unitId: string, x: number, y: number) => void
  fireAtEnemy: (unitId: string) => void
  issueFirePermission: (decision: 'ATES_IZNI_VERILDI' | 'ATES_YASAK' | 'BEKLEMEDE_KAL') => void
  requestSupply: (unitId: string, type: SupplyType, amount: number) => void
  artilleryAt: (x: number, y: number) => void
  airStrikeAt: (x: number, y: number) => void
  callT129: (unitId: string, x: number, y: number) => void
  callUH60: (unitId: string, targetUnitId: string) => void
  sendCommand: (unitId: string, cmd: string) => void
  setAppPhase: (phase: 'menu' | 'scenario-select' | 'playing' | 'save-load' | 'sandbox-lobby' | 'drafting') => void
  setSandboxSettings: (settings: SandboxSettings) => void
  addDraftedUnit: (role: SoldierRole) => void
  removeDraftedUnit: (id: string) => void
  saveGame: (slot: number) => Promise<void>
  loadGame: (slot: number) => Promise<boolean>
  getOperations: () => OperationInfo[]
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  state: null,
  selectedUnitId: null,
  selectedEnemyId: null,
  appPhase: 'menu',
  sandboxSettings: null,
  draftedUnits: [],

  initEngine: () => {
    const engine = new GameEngine()
    engine.subscribe((state) => {
      set({ state })
    })
    set({ engine })
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
  },

  advanceTime: (minutes: number) => {
    const { engine } = get()
    if (!engine) return
    engine.advance(minutes)
    set({ state: engine.getState() })
  },

  selectUnit: (id: string | null) => {
    set({ selectedUnitId: id, selectedEnemyId: null })
  },

  selectEnemy: (id: string | null) => {
    set({ selectedEnemyId: id, selectedUnitId: null })
  },

  moveUnit: (unitId: string, x: number, y: number) => {
    const { engine } = get()
    if (!engine) return
    engine.moveUnit(unitId, x, y)
    set({ state: engine.getState() })
  },

  fireAtEnemy: (unitId: string) => {
    const { engine } = get()
    if (!engine) return
    engine.fireAtUnit(unitId)
    set({ state: engine.getState() })
  },

  issueFirePermission: (decision) => {
    const { engine } = get()
    if (!engine) return
    engine.issueFirePermission(decision)
    set({ state: engine.getState() })
  },

  requestSupply: (unitId, type, amount) => {
    const { engine } = get()
    if (!engine) return
    engine.requestSupply(unitId, type, amount)
    set({ state: engine.getState() })
  },

  artilleryAt: (x, y) => {
    const { engine } = get()
    if (!engine) return
    engine.artilleryAt(x, y)
    set({ state: engine.getState() })
  },

  airStrikeAt: (x, y) => {
    const { engine } = get()
    if (!engine) return
    engine.airStrikeAt(x, y)
    set({ state: engine.getState() })
  },

  callT129: (unitId, x, y) => {
    const { engine } = get()
    if (!engine) return
    engine.callT129(unitId, x, y)
    set({ state: engine.getState() })
  },

  callUH60: (unitId, targetUnitId) => {
    const { engine } = get()
    if (!engine) return
    engine.callUH60(unitId, targetUnitId)
    set({ state: engine.getState() })
  },

  sendCommand: (unitId, cmd) => {
    const { engine } = get()
    if (!engine) return
    engine.sendRadioCommand(unitId, cmd)
    set({ state: engine.getState() })
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
    const { engine } = get()
    if (!engine) return false
    const saveData = await SaveSystem.load(slot)
    if (!saveData) return false
    engine.loadFromSave(saveData.gameData)
    set({ state: engine.getState(), appPhase: 'playing' })
    return true
  },

  getOperations: () => OPERATIONS,
}))
