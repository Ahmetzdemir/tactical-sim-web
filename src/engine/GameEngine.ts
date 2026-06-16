// ============================================================
// GameEngine.ts — Main game engine, port of GameEngine.cpp
// ============================================================

import { GameTime } from './GameTime'
import { MapGrid } from './MapGrid'
import { RadioSystem } from './RadioSystem'
import { ResourceManager } from './ResourceManager'
import { WeatherSystem } from './WeatherSystem'
import { CombatSystem } from './CombatSystem'
import { Soldier } from './Soldier'
import { EnemyUnit } from './EnemyUnit'
import { loadScenario, makeEnemy, makeUnit } from './Scenario'
import { audioManager } from '../services/AudioManager'
import { MultiplayerLogic } from '../services/MultiplayerLogic'
import {
  RadioMessage, PendingEngagement, Position,
  FirePermission, ReportCategory, ReportType, SupplyType, EnemyType, SoldierRole, EnemyState, DelayBreakdown, TerrainType,
  ScenarioPhase, ObjectiveType, SandboxSettings, SandboxMapSize, WeatherType, MatchPhase, roleToString
} from './types'

export interface AttackRoute {
  unitId: string
  targetEnemyId: string
  path: Position[]
  currentStep: number
}

export interface MoveRoute {
  unitId: string
  targetPos: Position
  path: Position[]
  currentStep: number
}

export interface GameState {
  time: GameTime
  units: Map<string, Soldier>
  enemies: Map<string, EnemyUnit>
  mapGrid: MapGrid
  resources: ResourceManager
  weather: WeatherSystem
  radioLog: RadioMessage[]
  signalStrength: number
  pendingEngagement: PendingEngagement | null
  victoryAchieved: boolean
  defeatAchieved: boolean
  capturePointFallen: boolean
  hasCapturePoint: boolean
  capturePoint: Position
  defenseTimerMax: number
  defenseTimerCurrent: number
  activeScenarioIndex: number
  phase: 'menu' | 'playing' | 'victory' | 'defeat'
  screenShake: boolean
  t129Cooldown: number
  uh60State: 'idle' | 'flying' | 'loading'
  uh60Timer: number
  uh60Target: { x: number; y: number; destX: number; destY: number; unitId: string } | null
  restrictions?: {
    artilleryDisabled?: boolean
    airstrikeDisabled?: boolean
    t129Disabled?: boolean
  }
  phases?: ScenarioPhase[]
  activePhaseIndex: number
  currentObjective?: string
  sandboxSettings?: SandboxSettings
  discoveredTiles: Set<string>
  matchPhase: MatchPhase
  activePlayerId: string // 'host' or 'guest'
  hostBudget: number
  guestBudget: number
  hostReady: boolean
  guestReady: boolean
  capturePointTurns: { host: number; guest: number }
  attackRoutes: Map<string, AttackRoute>
  moveRoutes: Map<string, MoveRoute>
  deployedRadios: Position[]
  raasActivePointIndex?: number
  structureHealth: Map<string, number>
  activeConstructions: Map<string, { structureType: TerrainType; progress: number; targetProgress: number; builderId: string }>
  airdrops: { x: number; y: number; amount: number }[]
}

export type GameStateListener = (state: GameState) => void

export class GameEngine {
  private time: GameTime
  private radio: RadioSystem
  private resources: ResourceManager
  private map: MapGrid
  private weather: WeatherSystem
  private units: Map<string, Soldier> = new Map()
  private enemies: Map<string, EnemyUnit> = new Map()
  private activeScenarioIndex: number = 1
  private victoryAchieved: boolean = false
  private defeatAchieved: boolean = false
  private hasCapturePoint: boolean = false
  private capturePoint: Position = { x: 7, y: 7 }
  private defenseTimerMax: number = 0
  private defenseTimerCurrent: number = 0
  private capturePointFallen: boolean = false
  private radioLog: RadioMessage[] = []
  private pendingEngagement: PendingEngagement | null = null
  private screenShake: boolean = false

  // Cooldowns
  private artilleryCooldown: number = 0
  private airstrikeCooldown: number = 0
  private supplyCooldown: number = 0
  private t129Cooldown: number = 0
  private uh60State: 'idle' | 'flying' | 'loading' = 'idle'
  private uh60Timer: number = 0
  private uh60Target: { x: number; y: number; destX: number; destY: number; unitId: string } | null = null
  private restrictions: GameState['restrictions'] = {}
  private phases: ScenarioPhase[] = []
  private activePhaseIndex: number = 0
  private sandboxSettings: SandboxSettings | null = null
  private survivalWaveCounter: number = 0
  private combatActiveTimer: number = 0
  private discoveredTiles: Set<string> = new Set()
  private attackRoutes: Map<string, AttackRoute> = new Map()
  private moveRoutes: Map<string, MoveRoute> = new Map()
  private deployedRadios: Position[] = []
  private raasActivePointIndex: number = 0
  private structureHealth: Map<string, number> = new Map()
  private activeConstructions: Map<string, { structureType: TerrainType; progress: number; targetProgress: number; builderId: string }> = new Map()
  private airdrops: { x: number; y: number; amount: number }[] = []

  // 1v1 Multiplayer properties
  private matchPhase: MatchPhase = MatchPhase.PLAYING // Default for solo
  private activePlayerId: string = 'host'
  private hostBudget: number = 1000
  private guestBudget: number = 1000
  private hostReady: boolean = false
  private guestReady: boolean = false
  private capturePointTurns = { host: 0, guest: 0 }

  private listeners: GameStateListener[] = []

  constructor() {
    this.time = new GameTime()
    this.radio = new RadioSystem(
      (id) => this.calculateDynamicDelay(id),
      (id) => this.isNearRadioRelay(id)
    )
    this.resources = new ResourceManager(80, 400, 15)
    this.map = new MapGrid()
    this.weather = new WeatherSystem()
  }

  // ── Listener system for React ─────────────────────────────────
  subscribe(listener: GameStateListener): () => void {
    this.listeners.push(listener)
    return () => { this.listeners = this.listeners.filter(l => l !== listener) }
  }

  private notify(): void {
    const state = this.getState()
    for (const l of this.listeners) l(state)
  }

  getState(): GameState {
    return {
      time: this.time.clone(),
      units: new Map(this.units),
      enemies: new Map(this.enemies),
      mapGrid: this.map,
      resources: this.resources,
      weather: this.weather,
      radioLog: [...this.radioLog],
      pendingEngagement: this.pendingEngagement,
      victoryAchieved: this.victoryAchieved,
      defeatAchieved: this.defeatAchieved,
      capturePointFallen: this.capturePointFallen,
      hasCapturePoint: this.hasCapturePoint,
      capturePoint: { ...this.capturePoint },
      defenseTimerMax: this.defenseTimerMax,
      defenseTimerCurrent: this.defenseTimerCurrent,
      activeScenarioIndex: this.activeScenarioIndex,
      phase: this.defeatAchieved
        ? 'defeat'
        : this.victoryAchieved
          ? (this.capturePointFallen ? 'defeat' : 'victory')
          : 'playing',
      screenShake: this.screenShake,
      t129Cooldown: this.t129Cooldown,
      uh60State: this.uh60State,
      uh60Timer: this.uh60Timer,
      uh60Target: this.uh60Target,
      restrictions: this.restrictions,
      phases: [...this.phases],
      activePhaseIndex: this.activePhaseIndex,
      currentObjective: this.phases[this.activePhaseIndex]?.objective || (this.sandboxSettings ? (this.sandboxSettings.mode === 'SURVIVAL' ? 'Sonsuz Direniş: Hayatta Kal' : this.sandboxSettings.mode === 'RAAS' ? 'Hedef Arama (RAAS): 3 Noktayı Ele Geçir' : 'Bölge Temizliği: Tüm Düşmanları Yok Et') : undefined),
      sandboxSettings: this.sandboxSettings ? { ...this.sandboxSettings } : undefined,
      discoveredTiles: new Set(this.discoveredTiles),
      matchPhase: this.matchPhase,
      activePlayerId: this.activePlayerId,
      hostBudget: this.hostBudget,
      guestBudget: this.guestBudget,
      hostReady: this.hostReady,
      guestReady: this.guestReady,
      capturePointTurns: { ...this.capturePointTurns },
      signalStrength: this.radio.getSignalStrength(),
      attackRoutes: new Map(this.attackRoutes),
      moveRoutes: new Map(this.moveRoutes),
      deployedRadios: [...this.deployedRadios],
      raasActivePointIndex: this.raasActivePointIndex,
      structureHealth: new Map(this.structureHealth),
      activeConstructions: new Map(this.activeConstructions),
      airdrops: [...this.airdrops],
    }
  }

  // ── Scenario loading ──────────────────────────────────────────
  loadScenario(index: number, difficulty: 'EASY' | 'STANDARD' | 'HARD' = 'STANDARD'): boolean {
    const setup = loadScenario(index, difficulty)
    if (!setup) return false

    // Initialize sandboxSettings to propagate difficulty settings into combat and range calculations
    this.sandboxSettings = {
      mapSize: SandboxMapSize.MEDIUM,
      isDynamicWeather: false,
      mode: 'SEARCH_AND_DESTROY',
      difficulty: difficulty
    }

    this.deployedRadios = []
    this.units = setup.units
    this.enemies = setup.enemies
    this.resources = setup.resources
    this.time = new GameTime(setup.startDay, setup.startHour, setup.startMinute)
    this.map = new MapGrid()
    if (setup.customTerrainSetter) {
      setup.customTerrainSetter(this.map)
    }
    this.weather = new WeatherSystem()
    if (setup.weather) {
      this.weather.setWeather(setup.weather)
    }
    this.activeScenarioIndex = index
    this.discoveredTiles = new Set()
    this.updateVision()
    this.victoryAchieved = false
    this.defeatAchieved = false
    this.capturePointFallen = false
    this.hasCapturePoint = setup.hasCapturePoint
    this.capturePoint = setup.capturePoint
    this.defenseTimerMax = setup.defenseTimerMax
    this.defenseTimerCurrent = 0
    this.radioLog = []
    this.pendingEngagement = null
    this.radio = new RadioSystem(
      (id) => this.calculateDynamicDelay(id),
      (id) => this.isNearRadioRelay(id)
    )
    this.screenShake = false
    this.restrictions = setup.restrictions
    this.phases = setup.phases || []
    this.activePhaseIndex = 0
    this.survivalWaveCounter = 0
    this.attackRoutes.clear()
    this.moveRoutes.clear()
    this.structureHealth.clear()
    this.activeConstructions.clear()
    this.airdrops = []

    if (setup.initialRadioMessage) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: setup.initialRadioMessage.unitId,
        message: `[${this.time.toString()}] ${setup.initialRadioMessage.message}`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.REGULAR,
        corrupted: false,
        type: ReportType.REGULAR,
      })
    }

    this.artilleryCooldown = 0
    this.airstrikeCooldown = 0
    this.supplyCooldown = 0
    this.t129Cooldown = 0
    this.uh60State = 'idle'
    this.uh60Timer = 0
    this.uh60Target = null

    this.notify()
    return true
  }

  // ── Main update loop (called by React on time advance) ────────
  advance(minutes: number): void {
    if (this.victoryAchieved || this.defeatAchieved) return
    this.time.advance(minutes)
    this.update(minutes)
    this.processRadioQueue()
    this.checkScenarioPhases()
    this.checkEndGame()
    this.notify()
  }

  loadSandbox(userUnits: Map<string, Soldier>, settings: SandboxSettings, extraMaterials = 0): void {
    this.activeScenarioIndex = -1
    this.deployedRadios = []
    this.units = userUnits
    this.enemies = new Map()
    this.sandboxSettings = settings
    this.map = new MapGrid(settings.mapSize, settings.mapSize)
    this.weather = new WeatherSystem()
    if (settings.weatherFixed) {
      this.weather.setWeather(settings.weatherFixed)
    }
    this.time = new GameTime()
    this.radio = new RadioSystem(
      (id) => this.calculateDynamicDelay(id),
      (id) => this.isNearRadioRelay(id)
    )
    this.resources = new ResourceManager(100, 1000, 20, 15 + extraMaterials)
    this.victoryAchieved = false
    this.defeatAchieved = false
    this.survivalWaveCounter = 0
    this.attackRoutes.clear()
    this.moveRoutes.clear()
    this.structureHealth.clear()
    this.activeConstructions.clear()
    this.airdrops = []

    // Distribute units cleanly to prevent overlap at starting coordinates
    let unitIdx = 0
    for (const u of this.units.values()) {
      u.setPosition({ x: unitIdx % 3, y: Math.floor(unitIdx / 3) })
      u.setHasPortableRadio(true)
      unitIdx++
    }

    if (settings.mode === 'SURVIVAL') {
      this.hasCapturePoint = true
      this.capturePoint = { x: Math.floor(settings.mapSize / 2), y: Math.floor(settings.mapSize / 2) }
      this.defenseTimerMax = 999 
      this.defenseTimerCurrent = 0
    } else if (settings.mode === 'RAAS') {
      this.hasCapturePoint = true
      this.raasActivePointIndex = 0
      this.capturePoint = this.getNewRAASPoint(settings.mapSize)
      this.defenseTimerMax = 999
      this.defenseTimerCurrent = 0
      this.spawnInitialEnemies(settings.mapSize)
    } else {
      this.hasCapturePoint = false
      this.spawnInitialEnemies(settings.mapSize)
    }

    const modeName = settings.mode === 'SURVIVAL' 
      ? 'Sonsuz Direniş' 
      : settings.mode === 'RAAS'
        ? 'Hedef Arama (RAAS)'
        : 'Bölge Temizliği'

    let startMsg = `[OPERASYON BAŞLADI] Mod: ${modeName}. Başarılar dileriz.`
    if (settings.mode === 'RAAS') {
      startMsg = `[OPERASYON BAŞLADI] Mod: Hedef Arama (RAAS). Hedef A (${this.capturePoint.x}, ${this.capturePoint.y}) bölgesini güvenceye alın!`
    }

    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '🏆 KARARGAH',
      message: startMsg,
      sentTick: 0,
      category: ReportCategory.SUCCESS,
      corrupted: false,
      type: ReportType.REGULAR,
    })

    this.discoveredTiles = new Set()
    this.updateVision()
    this.notify()
  }

  // ── 1v1 Draft Mode Logic ────────────────────────────────────
  initMatch1v1(): void {
    this.deployedRadios = []
    this.units = new Map()
    this.enemies = new Map()
    this.time = new GameTime(1, 10, 0)
    this.map = new MapGrid(15, 15)
    this.weather = new WeatherSystem()
    this.weather.setWeather(WeatherType.CLEAR)
    
    this.matchPhase = MatchPhase.DRAFTING
    this.hostBudget = 1000
    this.guestBudget = 1000
    this.hostReady = false
    this.guestReady = false
    this.capturePoint = { x: 7, y: 7 }
    this.hasCapturePoint = true
    this.capturePointTurns = { host: 0, guest: 0 }
    
    this.radioLog = []
    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '📡 SİSTEM',
      message: '1v1 TAKTİKSEL ÇATIŞMA: Hazırlık evresi başladı. Bütçenizi kullanarak ordunuzu kurun.',
      sentTick: 0,
      category: ReportCategory.MISSION_SUPPORT,
      corrupted: false, type: ReportType.REGULAR
    })
    this.notify()
  }

  buyUnit(playerId: string, _role: SoldierRole, cost: number): boolean {
    const budget = playerId === 'host' ? this.hostBudget : this.guestBudget
    if (budget < cost) return false
    if (playerId === 'host') this.hostBudget -= cost
    else this.guestBudget -= cost
    this.notify()
    return true
  }

  placeUnit(playerId: string, role: SoldierRole, x: number, y: number): void {
    if (playerId === 'host' && y < 13) return
    if (playerId === 'guest' && y > 1) return
    
    // Prevent placing a unit on an occupied cell
    for (const u of this.units.values()) {
      if (u.getPosition().x === x && u.getPosition().y === y) return
    }

    const id = `${playerId}-${role}-${Math.random().toString(36).substring(2, 5)}`
    const s = makeUnit(id, roleToString(role), role, 100, 80, 60, 5, 1, x, y)
    s.setOwnerId(playerId)
    s.resetAP()
    this.units.set(id, s)
    this.updateVision()
    this.notify()
  }

  setMatchReady(playerId: string): void {
    if (playerId === 'host') this.hostReady = true
    if (playerId === 'guest') this.guestReady = true
    this.checkMatchPhaseTransitions()
    this.notify()
  }

  private checkMatchPhaseTransitions(): void {
    if (this.hostReady && this.guestReady) {
      if (this.matchPhase === MatchPhase.DRAFTING) {
        this.matchPhase = MatchPhase.PLACEMENT
        this.hostReady = false
        this.guestReady = false
        this.addRadioMessage({
          id: crypto.randomUUID(),
          fromUnitId: '📡 SİSTEM',
          message: 'DRAFT TAMAMLANDI. Şimdi birimlerinizi yerleştirin.',
          sentTick: 0,
          category: ReportCategory.MISSION_SUPPORT,
          corrupted: false, type: ReportType.REGULAR
        })
      } else if (this.matchPhase === MatchPhase.PLACEMENT) {
        this.matchPhase = MatchPhase.PLAYING
        this.activePlayerId = 'host'
        this.hostReady = false
        this.guestReady = false
        this.addRadioMessage({
          id: crypto.randomUUID(),
          fromUnitId: '🚀 SİSTEM',
          message: 'OPERASYON BAŞLADI! Bayrağı ele geçir veya düşmanı imha et.',
          sentTick: 0,
          category: ReportCategory.SUCCESS,
          corrupted: false, type: ReportType.REGULAR
        })
      }
    }
  }

  endTurn(): void {
    if (this.matchPhase !== MatchPhase.PLAYING) return
    this.checkCapturePointAtTurnEnd()
    this.activePlayerId = this.activePlayerId === 'host' ? 'guest' : 'host'
    for (const u of this.units.values()) {
      if (u.getOwnerId() === this.activePlayerId) u.resetAP()
    }
    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '🔄 SİSTEM',
      message: `Sıra ${this.activePlayerId === 'host' ? 'EV SAHİBİ' : 'MİSAFİR'} oyuncuda.`,
      sentTick: this.time.toTotalMinutes(),
      category: ReportCategory.REGULAR,
      corrupted: false, type: ReportType.REGULAR
    })
    this.checkEndGame()
    this.notify()
  }

  private checkCapturePointAtTurnEnd(): void {
    const cp = this.capturePoint
    const unitsOnPoint = [...this.units.values()].filter(u => {
      const p = u.getPosition()
      return p.x === cp.x && p.y === cp.y && u.isAlive()
    })
    if (unitsOnPoint.length === 1) {
      const owner = unitsOnPoint[0].getOwnerId()
      if (owner === 'host') this.capturePointTurns.host++
      else this.capturePointTurns.guest++

      if (this.sandboxSettings?.mode === 'RAAS') {
        if (this.capturePointTurns.host >= 3) {
          const currentPointName = this.raasActivePointIndex === 0 ? 'Hedef A' : this.raasActivePointIndex === 1 ? 'Hedef B' : 'Hedef C'
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '🏁 SİSTEM',
            message: `[HEDEF GÜVENCEYE ALINDI] ${currentPointName} (${cp.x}, ${cp.y}) ele geçirildi!`,
            sentTick: this.time.toTotalMinutes(),
            category: ReportCategory.SUCCESS,
            corrupted: false, type: ReportType.REGULAR
          })

          if (this.raasActivePointIndex < 2) {
            this.raasActivePointIndex++
            this.capturePointTurns.host = 0
            const nextPointName = this.raasActivePointIndex === 1 ? 'Hedef B' : 'Hedef C'
            this.capturePoint = this.getNewRAASPoint(this.sandboxSettings.mapSize, cp)
            this.addRadioMessage({
              id: crypto.randomUUID(),
              fromUnitId: '🏆 KARARGAH',
              message: `Yeni emir: ${nextPointName} (${this.capturePoint.x}, ${this.capturePoint.y}) bölgesine intikal edin ve güvenceye alın!`,
              sentTick: this.time.toTotalMinutes(),
              category: ReportCategory.MISSION_SUPPORT,
              corrupted: false, type: ReportType.REGULAR
            })
          } else {
            this.victoryAchieved = true
            this.addRadioMessage({
              id: crypto.randomUUID(),
              fromUnitId: '🏆 KARARGAH',
              message: `TEBRİKLER! Tüm RAAS hedefleri (A, B ve C) başarıyla kontrol altına alındı. Operasyon zaferle tamamlandı!`,
              sentTick: this.time.toTotalMinutes(),
              category: ReportCategory.SUCCESS,
              corrupted: false, type: ReportType.REGULAR
            })
          }
        }
      } else {
        if (this.capturePointTurns.host >= 3 || this.capturePointTurns.guest >= 3) {
          this.victoryAchieved = true
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '🏁 SİSTEM',
            message: `STRATEJİK ZAFER! ${owner === 'host' ? 'EV SAHİBİ' : 'MİSAFİR'} bölgeyi 3 tur kontrol etti.`,
            sentTick: this.time.toTotalMinutes(),
            category: ReportCategory.SUCCESS,
            corrupted: false, type: ReportType.REGULAR
          })
        }
      }
    } else {
      this.capturePointTurns.host = 0
      this.capturePointTurns.guest = 0
    }
  }

  private getNewRAASPoint(size: number, prevPoint?: Position): Position {
    const startPoint = { x: 0, y: 0 }
    const referencePoint = prevPoint || startPoint
    const minDistance = Math.floor(size / 3)
    let attempts = 0
    let x = 0
    let y = 0
    while (attempts < 200) {
      x = Math.floor(Math.random() * size)
      y = Math.floor(Math.random() * size)
      const distance = Math.abs(x - referencePoint.x) + Math.abs(y - referencePoint.y)
      if (distance >= minDistance && (x !== 0 || y !== 0)) {
        break
      }
      attempts++
    }
    return { x, y }
  }

  private spawnInitialEnemies(size: number): void {
    let countFactor = 1.0
    let hpFactor = 1.0
    if (this.sandboxSettings?.difficulty === 'EASY') {
      countFactor = 0.75
      hpFactor = 0.75
    } else if (this.sandboxSettings?.difficulty === 'HARD') {
      countFactor = 1.3
      hpFactor = 1.3
    }

    const num = Math.floor(size * 0.8 * countFactor)
    for (let i = 0; i < num; i++) {
        const idStr = Math.random().toString(36).substring(2, 6).toUpperCase()
        const id = `E-${idStr}`
        let rx = Math.floor(Math.random() * size)
        let ry = Math.floor(Math.random() * size)
        
        let attempts = 0
        while (attempts < 50) {
          let occupied = false
          for (const u of this.units.values()) {
            if (u.getPosition().x === rx && u.getPosition().y === ry) { occupied = true; break }
          }
          for (const e of this.enemies.values()) {
            if (e.isAlive() && e.getPosition().x === rx && e.getPosition().y === ry) { occupied = true; break }
          }
          if (this.hasCapturePoint && this.capturePoint.x === rx && this.capturePoint.y === ry) {
            occupied = true
          }
          if (!occupied) break
          rx = Math.floor(Math.random() * size)
          ry = Math.floor(Math.random() * size)
          attempts++
        }

        const baseHp = 100
        const scaledHp = Math.round(baseHp * hpFactor)
        this.enemies.set(id, makeEnemy(id, `Düşman Devriyesi ${i+1}`, scaledHp, 80, 200, rx, ry))
    }
  }

  private checkScenarioPhases(): void {
    if (this.phases.length === 0 || this.activePhaseIndex >= this.phases.length) return

    const currentPhase = this.phases[this.activePhaseIndex]
    let phaseCompleted = false

    switch (currentPhase.type) {
      case ObjectiveType.DESTROY_TARGET:
        if (currentPhase.targetId) {
          const enemy = this.enemies.get(currentPhase.targetId)
          if (enemy && !enemy.isAlive()) phaseCompleted = true
        }
        break
      case ObjectiveType.REACH_POSITION:
        if (currentPhase.targetPos) {
          for (const [, unit] of this.units) {
            const up = unit.getPosition()
            if (up.x === currentPhase.targetPos.x && up.y === currentPhase.targetPos.y) {
              phaseCompleted = true
              break
            }
          }
        }
        break
      case ObjectiveType.SURVIVE_TIME:
        if (currentPhase.timerMinutes !== undefined) {
          currentPhase.timerMinutes--
          if (currentPhase.timerMinutes <= 0) phaseCompleted = true
        }
        break
      case ObjectiveType.ELIMINATE_ALL:
        let allDead = true
        for (const [, e] of this.enemies) {
          if (e.isAlive()) { allDead = false; break }
        }
        if (allDead) phaseCompleted = true
        break
    }

    if (phaseCompleted) {
      this.activePhaseIndex++
      const nextPhase = this.phases[this.activePhaseIndex]
      
      const msg = nextPhase 
        ? `[HEDEF TAMAMLANDI] Yeni Emir: ${nextPhase.objective}`
        : `[OPERASYON TAMAMLANDI] Tüm hedefler ele geçirildi!`

      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🏆 KARARGAH',
        message: msg,
        sentTick: this.time.toTotalMinutes(),
        category: nextPhase ? ReportCategory.MISSION_SUPPORT : ReportCategory.SUCCESS,
        corrupted: false,
        type: ReportType.REGULAR,
      })

      if (!nextPhase) {
        this.victoryAchieved = true
      } else {
          // Special logic for Scenario 7 transitions
          if (this.activeScenarioIndex === 7) {
              if (this.activePhaseIndex === 1) { // Transition to Phase 2
                  // Spawn bridge guards if needed, but they are defined in setup
              }
              if (this.activePhaseIndex === 2) { // Transition to Phase 3
                  this.weather.setWeather(WeatherType.CLEAR)
                  this.spawnEnemyCounterAttack()
              }
          }
      }
    }
  }

  private spawnEnemyCounterAttack(): void {
    for (let i = 0; i < 3; i++) {
        const id = `CA-${i}`
        this.enemies.set(id, makeEnemy(id, `Karşı Taarruz Tankı ${i+1}`, 200, 80, 200, 10 + i, 0, EnemyType.ARMORED, EnemyState.ASSAULT_TARGET, 10, 10))
    }
  }

  private updateVision(): void {
    const visionRange = 4
    for (const unit of this.units.values()) {
      if (!unit.isAlive()) continue
      const pos = unit.getPosition()
      for (let dy = -visionRange; dy <= visionRange; dy++) {
        for (let dx = -visionRange; dx <= visionRange; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= visionRange) {
            const tx = pos.x + dx
            const ty = pos.y + dy
            if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
              this.discoveredTiles.add(`${tx},${ty}`)
            }
          }
        }
      }
    }
  }

  private update(deltaTicks: number): void {
    for (let i = 1; i <= deltaTicks; i++) {
        this.updateVision()
        const currentSimTime = this.time.toTotalMinutes() - deltaTicks + i

      // Cooldowns
      if (this.artilleryCooldown > 0) this.artilleryCooldown--
      if (this.airstrikeCooldown > 0) this.airstrikeCooldown--
      if (this.supplyCooldown > 0) this.supplyCooldown--
      if (this.t129Cooldown > 0) this.t129Cooldown--

      if (this.combatActiveTimer > 0) {
        this.combatActiveTimer--
        if (this.combatActiveTimer === 0) {
          audioManager.stopGunfireAmbient()
        }
      }

      // Process UH-60 MEDEVAC logic
      if (this.uh60State === 'flying' && this.uh60Timer > 0) {
        audioManager.playHelicopter(0, 0); // Simplified: Center, close for now
        this.uh60Timer--
        if (this.uh60Timer <= 0) {
          this.uh60State = 'loading'
          this.uh60Timer = 2 // 2 ticks required for loading
          audioManager.playHelicopter(0.2, 0); // Quieter while loading
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '🚁 UH-60',
            message: `Koordinata ulaşıldı. Yaralı tahliyesi başlıyor, sahadayız! (Risk: 2 dk)`,
            sentTick: this.time.toTotalMinutes(),
            category: ReportCategory.MISSION_SUPPORT,
            corrupted: false, type: ReportType.REGULAR,
          })
        }
      } else if (this.uh60State === 'loading' && this.uh60Timer > 0) {
        this.uh60Timer--
        
        let riskProbability = 0.05
        if (this.uh60Target) {
          const sig = this.getSignalStrengthAt({ x: this.uh60Target.x, y: this.uh60Target.y })
          riskProbability = Math.max(0.05, Math.min(0.80, 1 - sig))
        }

        if (Math.random() < riskProbability) {
          // Helikopter düşürüldü
          this.uh60State = 'idle'
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '🚁 KARARGAH',
            message: `ACİL DURUM! UH-60 vuruldu! Tüm birimlerin morali çöktü! (-30 Moral)`,
            sentTick: this.time.toTotalMinutes(),
            category: ReportCategory.DANGER,
            corrupted: false, type: ReportType.REGULAR,
          })
          for (const [, u] of this.units) {
            if (u.isAlive()) u.adjustMorale(-30)
          }
          if (this.uh60Target) {
            this.units.delete(this.uh60Target.unitId) // Yaralı birim öldü/kayboldu
          }
          this.uh60Target = null
        } else if (this.uh60Timer <= 0) {
          // Başarılı kurtarma
          this.uh60State = 'idle'
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '🚁 UH-60',
            message: `Paket güvende! Üsse dönüyoruz. Tüm birliklere iyi şanslar! (+15 Moral)`,
            sentTick: this.time.toTotalMinutes(),
            category: ReportCategory.SUCCESS,
            corrupted: false, type: ReportType.REGULAR,
          })
          const targetUnit = this.uh60Target ? this.units.get(this.uh60Target.unitId) as Soldier : null
          if (this.uh60Target && targetUnit) {
            const destX = this.uh60Target.destX
            const destY = this.uh60Target.destY
            targetUnit.setPosition({ x: destX, y: destY })
            
            if (targetUnit.isIncapacitated()) {
              targetUnit.restoreHealth(50) // Heal to put them back into active status
              this.addRadioMessage({
                id: crypto.randomUUID(),
                fromUnitId: '🚁 UH-60',
                message: `[HASTA İNTİKALİ] Yaralı ${targetUnit.getName()} tahliye edilerek (${destX}, ${destY}) konumuna bırakıldı ve tedavi edilerek ayağa kaldırıldı! (+15 Moral)`,
                sentTick: this.time.toTotalMinutes(),
                category: ReportCategory.SUCCESS,
                corrupted: false, type: ReportType.REGULAR,
              })
            } else {
              this.addRadioMessage({
                id: crypto.randomUUID(),
                fromUnitId: '🚁 UH-60',
                message: `[BİRLİK SEVKİ] ${targetUnit.getName()} taktik helikopter sevkıyatıyla (${destX}, ${destY}) konumuna sevk edildi! (+15 Moral)`,
                sentTick: this.time.toTotalMinutes(),
                category: ReportCategory.SUCCESS,
                corrupted: false, type: ReportType.REGULAR,
              })
            }
            
            for (const [, u] of this.units) {
              if (u.isAlive()) u.adjustMorale(15)
            }
          }
          this.uh60Target = null
          audioManager.stopHelicopter()
        }
      }

      // Scenario Wave Logic
      if (this.hasCapturePoint && this.defenseTimerCurrent < this.defenseTimerMax) {
        if (currentSimTime > 0 && currentSimTime % 25 === 0) {
          this.spawnEnemyWave(currentSimTime)
        }
      }

      // Weather
      this.weather.update(1)
      this.radio.setSignalStrength(this.weather.getSignalModifier())
      if (this.sandboxSettings?.isDynamicWeather) {
        this.weather.rollForWeatherChange()
      }
      if (this.weather.rollForWeatherChange()) {
        this.addRadioMessage({
          id: crypto.randomUUID(),
          fromUnitId: '☁️ HAVA',
          message: `[${GameTime.formatTime(currentSimTime)}] [HAVA DEĞİŞİMİ] ${this.weather.getWeatherName()} — ${this.weather.getWeatherDescription()}`,
          sentTick: currentSimTime,
          category: ReportCategory.MISSION_SUPPORT,
          corrupted: false,
          type: ReportType.REGULAR,
        })
      }

      // Survival wave logic
      if (this.sandboxSettings?.mode === 'SURVIVAL') {
        const totalMins = this.time.toTotalMinutes()
        const currentWave = Math.floor(totalMins / 15)
        if (currentWave > this.survivalWaveCounter) {
          this.survivalWaveCounter = currentWave
          this.spawnSurvivalWave()
        }
      }

      // Update units
      for (const [, unit] of this.units) {
        unit.update(1)
      }

      // Passive healing at FOB_HOSPITAL
      for (const [, unit] of this.units) {
        if (unit.isAlive()) {
          const pos = unit.getPosition()
          if (this.map.getTerrain(pos.x, pos.y) === TerrainType.FOB_HOSPITAL) {
            const soldier = unit as Soldier
            const oldHp = soldier.getHp()
            if (oldHp < 100) {
              const healAmount = 15
              const newHp = Math.min(100, oldHp + healAmount)
              if (soldier.isIncapacitated()) {
                soldier.restoreHealth(healAmount)
                if (!soldier.isIncapacitated()) {
                  this.addRadioMessage({
                    id: crypto.randomUUID(),
                    fromUnitId: '🏥 HASTANE',
                    message: `[YARALI İYİLEŞTİ] ${soldier.getName()} Sahra Hastanesinde iyileşerek göreve hazır duruma geldi! (HP: ${soldier.getHp()})`,
                    sentTick: currentSimTime,
                    category: ReportCategory.SUCCESS,
                    corrupted: false,
                    type: ReportType.REGULAR,
                  })
                }
              } else {
                soldier.setHp(newHp)
              }
            }
          }
        }
      }

      // Auto-replenishment from FOB_SUPPLY
      for (const [, unit] of this.units) {
        if (unit.isAlive()) {
          const pos = unit.getPosition()
          let nearSupply = false
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const tx = pos.x + dx
              const ty = pos.y + dy
              if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
                if (this.map.getTerrain(tx, ty) === TerrainType.FOB_SUPPLY) {
                  nearSupply = true
                  break
                }
              }
            }
            if (nearSupply) break
          }

          if (nearSupply) {
            const soldier = unit as Soldier
            const maxAmmo = soldier.getRole() === SoldierRole.MG ? 400 : soldier.getRole() === SoldierRole.ARMORED ? 300 : 120
            const ammoNeeded = maxAmmo - soldier.getAmmo()
            const rationsNeeded = 10 - soldier.getRations()

            if (ammoNeeded > 0 || rationsNeeded > 0) {
              soldier.resupply(ammoNeeded, rationsNeeded, 0)
              this.addRadioMessage({
                id: crypto.randomUUID(),
                fromUnitId: '📦 MÜHİMMAT DEPOSU',
                message: `[OTOMATİK İKMAL] ${soldier.getName()} erzak ve mühimmat tazeledi. (Cephane: ${soldier.getAmmo()}, Erzak: ${soldier.getRations()})`,
                sentTick: currentSimTime,
                category: ReportCategory.SUCCESS,
                corrupted: false,
                type: ReportType.REGULAR,
              })
            }
          }
        }
      }

      // Active constructions tick progress
      for (const [coord, constr] of this.activeConstructions) {
        const [cxStr, cyStr] = coord.split(',')
        const cx = parseInt(cxStr)
        const cy = parseInt(cyStr)
        const builder = this.units.get(constr.builderId)

        if (!builder || !builder.isAlive()) {
          this.activeConstructions.delete(coord)
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '🏗️ İNŞAAT',
            message: `[İNŞAAT İPTAL] İnşaatçı birim düştüğü veya kaybolduğu için (${cx},${cy}) konumundaki inşaat iptal edildi.`,
            sentTick: currentSimTime,
            category: ReportCategory.DANGER,
            corrupted: false,
            type: ReportType.REGULAR,
          })
          continue
        }

        const builderPos = builder.getPosition()
        const isAtTile = builderPos.x === cx && builderPos.y === cy
        const isUnderFire = builder.isUnderFire()

        if (!isAtTile || isUnderFire) {
          continue
        }

        constr.progress++
        if (constr.progress >= constr.targetProgress) {
          this.activeConstructions.delete(coord)
          this.map.setTerrain(cx, cy, constr.structureType)
          this.structureHealth.set(coord, 100)

          const structureName = constr.structureType === TerrainType.FOB_COMMAND ? 'Komuta Merkezi' : constr.structureType === TerrainType.FOB_HOSPITAL ? 'Sahra Hastanesi' : constr.structureType === TerrainType.FOB_SUPPLY ? 'Mühimmat Deposu' : 'Kum Torbası Siperi'
          
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '🏗️ İNŞAAT',
            message: `[İNŞAAT TAMAMLANDI] (${cx},${cy}) konumundaki ${structureName} başarıyla tamamlandı ve faaliyete geçti!`,
            sentTick: currentSimTime,
            category: ReportCategory.SUCCESS,
            corrupted: false,
            type: ReportType.REGULAR,
          })
        }
      }

      // Airdrop collection check
      for (const [, unit] of this.units) {
        if (unit.isAlive()) {
          const pos = unit.getPosition()
          const dropIdx = this.airdrops.findIndex(d => d.x === pos.x && d.y === pos.y)
          if (dropIdx !== -1) {
            const drop = this.airdrops[dropIdx]
            this.airdrops.splice(dropIdx, 1)

            const soldier = unit as Soldier
            soldier.resupply(0, 0, 0, drop.amount)

            this.addRadioMessage({
              id: crypto.randomUUID(),
              fromUnitId: '📦 LOJİSTİK',
              message: `[İKMAL TESLİM ALINDI] ${soldier.getName()} (${pos.x},${pos.y}) konumundaki kutudan ${drop.amount} birim İnşaat Malzemesi aldı!`,
              sentTick: currentSimTime,
              category: ReportCategory.SUCCESS,
              corrupted: false,
              type: ReportType.REGULAR,
            })
          }
        }
      }

      // Build initial occupied positions set
      const occupiedPositions = new Set<string>()
      for (const u of this.units.values()) {
        if (u.isAlive()) {
          occupiedPositions.add(`${u.getPosition().x},${u.getPosition().y}`)
        }
      }
      for (const e of this.enemies.values()) {
        if (e.isAlive()) {
          occupiedPositions.add(`${e.getPosition().x},${e.getPosition().y}`)
        }
      }

      // Process attack routes (move units toward targets)
      for (const [unitId, route] of this.attackRoutes) {
        const unit = this.units.get(unitId)
        const enemy = this.enemies.get(route.targetEnemyId)

        // Cancel route if unit died, enemy died, or we ran out of steps
        if (!unit || !unit.isAlive() || !enemy || !enemy.isAlive()) {
          this.attackRoutes.delete(unitId)
          continue
        }

        const unitPos = unit.getPosition()
        const enemyPos = enemy.getPosition()
        const dx = enemyPos.x - unitPos.x
        const dy = enemyPos.y - unitPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        const attackRange = (unit as Soldier).getRole() === SoldierRole.SNIPER ? 6.0 : 3.0
        // Already in attack range? Fire and clear route
        if (dist <= attackRange) {
          const res = CombatSystem.resolveAttack(unit as Soldier, enemy, this.map)
          this.combatActiveTimer = 10
          const sig = this.getSignalStrengthAt(unitPos)
          this.radio.queueReport(unitId, `Hedefe ulaşıldı! ${res.reportMessage}`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig), -1, ReportType.REGULAR, '', res.category)
          this.attackRoutes.delete(unitId)
          continue
        }

        // Move one step along the route
        if (route.currentStep < route.path.length) {
          const nextPos = route.path[route.currentStep]

          // Check if nextPos is occupied by another unit (excluding itself)
          let isBlocked = false
          for (const u of this.units.values()) {
            if (u.isAlive() && u.getId() !== unitId && u.getPosition().x === nextPos.x && u.getPosition().y === nextPos.y) {
              isBlocked = true
              break
            }
          }
          for (const e of this.enemies.values()) {
            if (e.isAlive() && e.getPosition().x === nextPos.x && e.getPosition().y === nextPos.y) {
              isBlocked = true
              break
            }
          }

          if (isBlocked) {
            // Recalculate path to target enemy avoiding occupied positions
            const customOccupied = new Set<string>()
            for (const u of this.units.values()) {
              if (u.isAlive() && u.getId() !== unitId) {
                customOccupied.add(`${u.getPosition().x},${u.getPosition().y}`)
              }
            }
            for (const e of this.enemies.values()) {
              if (e.isAlive() && e.getId() !== route.targetEnemyId) {
                // Keep the target enemy position reachable by excluding it
                customOccupied.add(`${e.getPosition().x},${e.getPosition().y}`)
              }
            }

            const newPath = this.map.findPath(unitPos, enemyPos, customOccupied)
            if (newPath.length > 1) {
              route.path = newPath.slice(1)
              route.currentStep = 0
              const revisedNextPos = route.path[0]
              this.setUnitPositionWithCarried(unitId, { x: Math.max(0, Math.min(this.map.width - 1, revisedNextPos.x)), y: Math.max(0, Math.min(this.map.height - 1, revisedNextPos.y)) })
              route.currentStep++
            } else {
              // Path is blocked completely. Don't move, wait for path to clear or combat to finish.
            }
          } else {
            this.setUnitPositionWithCarried(unitId, { x: Math.max(0, Math.min(this.map.width - 1, nextPos.x)), y: Math.max(0, Math.min(this.map.height - 1, nextPos.y)) })
            route.currentStep++
          }
        } else {
          // Route exhausted but still not in range — clear it
          this.attackRoutes.delete(unitId)
        }
      }

      // Process move routes (move units toward target cells)
      for (const [unitId, route] of this.moveRoutes) {
        const unit = this.units.get(unitId)

        // Cancel route if unit died
        if (!unit || !unit.isAlive()) {
          this.moveRoutes.delete(unitId)
          continue
        }

        const unitPos = unit.getPosition()
        const targetPos = route.targetPos

        if (unitPos.x === targetPos.x && unitPos.y === targetPos.y) {
          const sig = this.getSignalStrengthAt(unitPos)
          this.radio.queueReport(unitId, `Hedef bölgeye ulaştık. Koordinatımız: ${targetPos.x}, ${targetPos.y}`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
          this.moveRoutes.delete(unitId)
          continue
        }

        // Move one step along the route
        if (route.currentStep < route.path.length) {
          const nextPos = route.path[route.currentStep]

          // Check if nextPos is occupied by another unit (excluding itself)
          let isBlocked = false
          for (const u of this.units.values()) {
            if (u.isAlive() && u.getId() !== unitId && u.getPosition().x === nextPos.x && u.getPosition().y === nextPos.y) {
              isBlocked = true
              break
            }
          }
          for (const e of this.enemies.values()) {
            if (e.isAlive() && e.getPosition().x === nextPos.x && e.getPosition().y === nextPos.y) {
              isBlocked = true
              break
            }
          }

          if (isBlocked) {
            // Recalculate path to target position avoiding occupied positions
            const customOccupied = new Set<string>()
            for (const u of this.units.values()) {
              if (u.isAlive() && u.getId() !== unitId) {
                customOccupied.add(`${u.getPosition().x},${u.getPosition().y}`)
              }
            }
            for (const e of this.enemies.values()) {
              if (e.isAlive()) {
                customOccupied.add(`${e.getPosition().x},${e.getPosition().y}`)
              }
            }

            const newPath = this.map.findPath(unitPos, targetPos, customOccupied)
            if (newPath.length > 1) {
              route.path = newPath.slice(1)
              route.currentStep = 0
              const revisedNextPos = route.path[0]
              this.setUnitPositionWithCarried(unitId, { x: Math.max(0, Math.min(this.map.width - 1, revisedNextPos.x)), y: Math.max(0, Math.min(this.map.height - 1, revisedNextPos.y)) })
              route.currentStep++
            } else {
              // Path is blocked completely. Don't move.
            }
          } else {
            this.setUnitPositionWithCarried(unitId, { x: Math.max(0, Math.min(this.map.width - 1, nextPos.x)), y: Math.max(0, Math.min(this.map.height - 1, nextPos.y)) })
            route.currentStep++
          }

          // If we just reached the destination after this step, clear route and report
          if (unit.getPosition().x === targetPos.x && unit.getPosition().y === targetPos.y) {
            const sig = this.getSignalStrengthAt(targetPos)
            this.radio.queueReport(unitId, `Hedef bölgeye ulaştık. Koordinatımız: ${targetPos.x}, ${targetPos.y}`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
            this.moveRoutes.delete(unitId)
          }
        } else {
          // Route exhausted but still not at destination — clear it
          this.moveRoutes.delete(unitId)
        }
      }

      // Re-build occupied positions set before enemy movements to account for any unit movements
      const updatedOccupiedPositions = new Set<string>()
      for (const u of this.units.values()) {
        if (u.isAlive()) {
          updatedOccupiedPositions.add(`${u.getPosition().x},${u.getPosition().y}`)
        }
      }
      for (const e of this.enemies.values()) {
        if (e.isAlive()) {
          updatedOccupiedPositions.add(`${e.getPosition().x},${e.getPosition().y}`)
        }
      }

      // Update enemies & try enemy attacks
      for (const [, enemy] of this.enemies) {
        if (!enemy.isAlive()) continue

        // 1. Dynamic state transitions & target pursuit pathfinding
        let closestPlayerUnit: Soldier | null = null
        let minDist = 999
        for (const playerUnit of this.units.values()) {
          if (!playerUnit.isAlive()) continue
          const dx = enemy.getPosition().x - playerUnit.getPosition().x
          const dy = enemy.getPosition().y - playerUnit.getPosition().y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < minDist) {
            minDist = dist
            closestPlayerUnit = playerUnit
          }
        }

        const detectionRadius = enemy.getType() === EnemyType.SNIPER ? 7.0 : 5.0
        let targetPos: Position | undefined = undefined

        if (closestPlayerUnit && minDist <= detectionRadius) {
          const oldState = enemy.getState()
          if (oldState !== EnemyState.ATTACKING) {
            enemy.setState(EnemyState.ATTACKING)
            enemy.setTargetId(closestPlayerUnit.getId())

            // Tactical radio alert if difficulty is STANDARD or HARD
            const difficulty = this.sandboxSettings?.difficulty || 'STANDARD'
            if (difficulty !== 'EASY') {
              let alertedCount = 0
              const radioRange = difficulty === 'HARD' ? 10.0 : 7.0
              for (const [, otherEnemy] of this.enemies) {
                if (otherEnemy.getId() === enemy.getId() || !otherEnemy.isAlive()) continue
                const ox = enemy.getPosition().x - otherEnemy.getPosition().x
                const oy = enemy.getPosition().y - otherEnemy.getPosition().y
                const odist = Math.sqrt(ox * ox + oy * oy)
                if (odist <= radioRange && otherEnemy.getState() !== EnemyState.ATTACKING) {
                  otherEnemy.setState(EnemyState.ATTACKING)
                  otherEnemy.setTargetId(closestPlayerUnit.getId())
                  alertedCount++
                }
              }
              if (alertedCount > 0) {
                this.addRadioMessage({
                  id: crypto.randomUUID(),
                  fromUnitId: '⚠️ BİLİNMEYEN',
                  message: `[TELSİZ SIZINTISI] Düşman unsuru temas bildirdi, destek unsurları bölgeye kayıyor!`,
                  sentTick: currentSimTime,
                  category: ReportCategory.DANGER,
                  corrupted: false,
                  type: ReportType.REGULAR,
                })
              }
            }
          } else {
            enemy.setTargetId(closestPlayerUnit.getId())
          }

          // Firing range threshold to stand ground vs close distance
          let attackRange = 2.5
          if (enemy.getType() === EnemyType.SNIPER) attackRange = 6.0
          else if (enemy.getType() === EnemyType.MG) attackRange = 3.5
          else if (enemy.getType() === EnemyType.ARMORED) attackRange = 1.5
          if (enemy.getType() !== EnemyType.SNIPER) {
            attackRange = Math.max(attackRange, 3.0)
          }

          const difficulty = this.sandboxSettings?.difficulty || 'STANDARD'
          const playerPos = closestPlayerUnit.getPosition()
          const enemyPos = enemy.getPosition()

          if (difficulty === 'EASY') {
            if (minDist > attackRange) {
              targetPos = playerPos
            }
          } else {
            // Standard or Hard Mode: Smart Tactical positioning
            if (enemy.getType() === EnemyType.ARMORED) {
              // Armored units always push aggressively, trying to close distance (<= 1.5 distance)
              if (minDist > 1.5) {
                targetPos = playerPos
              }
            } else if (enemy.getType() === EnemyType.SNIPER) {
              // Sniper: maintain distance (4.0 to 6.0 tiles)
              if (minDist < 4.0) {
                // Kite: find a tile further away, preferably in cover
                let bestTile: Position | null = null
                let bestScore = -999
                for (let dx = -2; dx <= 2; dx++) {
                  for (let dy = -2; dy <= 2; dy++) {
                    if (dx === 0 && dy === 0) continue
                    const tx = enemyPos.x + dx
                    const ty = enemyPos.y + dy
                    if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) continue
                    
                    const key = `${tx},${ty}`
                    if (updatedOccupiedPositions.has(key)) continue
                    
                    const distToPlayer = Math.sqrt((tx - playerPos.x) * (tx - playerPos.x) + (ty - playerPos.y) * (ty - playerPos.y))
                    if (distToPlayer > 6.0) continue
                    
                    const terrain = this.map.getTerrain(tx, ty)
                    const isCover = terrain === TerrainType.CITY || terrain === TerrainType.FOREST || terrain === TerrainType.MOUNTAIN
                    
                    let score = distToPlayer * 5.0
                    if (isCover) score += 15.0
                    
                    if (score > bestScore) {
                      bestScore = score
                      bestTile = { x: tx, y: ty }
                    }
                  }
                }
                if (bestTile) {
                  targetPos = bestTile
                }
              } else if (minDist > 6.0) {
                // Too far: advance toward player
                targetPos = playerPos
              } else {
                // In sweet spot (4.0 to 6.0). Stand ground, or if not in cover, find cover that maintains sweet spot
                const terrain = this.map.getTerrain(enemyPos.x, enemyPos.y)
                const inCover = terrain === TerrainType.CITY || terrain === TerrainType.FOREST || terrain === TerrainType.MOUNTAIN
                if (!inCover) {
                  let bestCoverTile: Position | null = null
                  for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                      if (dx === 0 && dy === 0) continue
                      const tx = enemyPos.x + dx
                      const ty = enemyPos.y + dy
                      if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) continue
                      
                      const key = `${tx},${ty}`
                      if (updatedOccupiedPositions.has(key)) continue
                      
                      const distToPlayer = Math.sqrt((tx - playerPos.x) * (tx - playerPos.x) + (ty - playerPos.y) * (ty - playerPos.y))
                      if (distToPlayer < 4.0 || distToPlayer > 6.0) continue
                      
                      const tType = this.map.getTerrain(tx, ty)
                      if (tType === TerrainType.CITY || tType === TerrainType.FOREST || tType === TerrainType.MOUNTAIN) {
                        bestCoverTile = { x: tx, y: ty }
                        break
                      }
                    }
                    if (bestCoverTile) break
                  }
                  if (bestCoverTile) {
                    targetPos = bestCoverTile
                  }
                }
              }
            } else {
              // Infantry & MG units
              const currentHpRatio = enemy.getHp() / enemy.getMaxHp()
              const lowHp = currentHpRatio < 0.35
              
              if (lowHp) {
                // Desperate: seek ANY cover tile within 2 blocks to survive
                const terrain = this.map.getTerrain(enemyPos.x, enemyPos.y)
                const inCover = terrain === TerrainType.CITY || terrain === TerrainType.FOREST || terrain === TerrainType.MOUNTAIN
                if (!inCover) {
                  let bestRetreatTile: Position | null = null
                  let furthestDist = -1
                  for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                      const tx = enemyPos.x + dx
                      const ty = enemyPos.y + dy
                      if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) continue
                      const key = `${tx},${ty}`
                      if (updatedOccupiedPositions.has(key)) continue
                      
                      const tType = this.map.getTerrain(tx, ty)
                      if (tType === TerrainType.CITY || tType === TerrainType.FOREST || tType === TerrainType.MOUNTAIN) {
                        const distToPlayer = Math.sqrt((tx - playerPos.x) * (tx - playerPos.x) + (ty - playerPos.y) * (ty - playerPos.y))
                        if (distToPlayer > furthestDist) {
                          furthestDist = distToPlayer
                          bestRetreatTile = { x: tx, y: ty }
                        }
                      }
                    }
                  }
                  if (bestRetreatTile) {
                    targetPos = bestRetreatTile
                  } else if (minDist <= 2.0) {
                    // Try to step back direct if way too close
                    let bestFleeTile: Position | null = null
                    let bestFleeDist = minDist
                    for (let dx = -1; dx <= 1; dx++) {
                      for (let dy = -1; dy <= 1; dy++) {
                        const tx = enemyPos.x + dx
                        const ty = enemyPos.y + dy
                        if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) continue
                        const key = `${tx},${ty}`
                        if (updatedOccupiedPositions.has(key)) continue
                        const d = Math.sqrt((tx - playerPos.x) * (tx - playerPos.x) + (ty - playerPos.y) * (ty - playerPos.y))
                        if (d > bestFleeDist) {
                          bestFleeDist = d
                          bestFleeTile = { x: tx, y: ty }
                        }
                      }
                    }
                    if (bestFleeTile) targetPos = bestFleeTile
                  }
                }
              } else if (minDist > attackRange) {
                // If out of attack range, advance
                targetPos = playerPos
              } else {
                // In range, check if currently in cover
                const terrain = this.map.getTerrain(enemyPos.x, enemyPos.y)
                const inCover = terrain === TerrainType.CITY || terrain === TerrainType.FOREST || terrain === TerrainType.MOUNTAIN
                if (!inCover) {
                  // Seek nearby cover tile within range
                  let bestCoverTile: Position | null = null
                  for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                      const tx = enemyPos.x + dx
                      const ty = enemyPos.y + dy
                      if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) continue
                      const key = `${tx},${ty}`
                      if (updatedOccupiedPositions.has(key)) continue
                      
                      const distToPlayer = Math.sqrt((tx - playerPos.x) * (tx - playerPos.x) + (ty - playerPos.y) * (ty - playerPos.y))
                      if (distToPlayer <= attackRange) {
                        const tType = this.map.getTerrain(tx, ty)
                        if (tType === TerrainType.CITY || tType === TerrainType.FOREST || tType === TerrainType.MOUNTAIN) {
                          bestCoverTile = { x: tx, y: ty }
                          break
                        }
                      }
                    }
                    if (bestCoverTile) break
                  }
                  if (bestCoverTile) {
                    targetPos = bestCoverTile
                  }
                }
              }
            }
          }
        } else {
          // Revert to default state if player unit leaves detection area
          if (enemy.getState() === EnemyState.ATTACKING) {
            if (enemy.getHasAssaultTarget()) {
              enemy.setState(EnemyState.ASSAULT_TARGET)
            } else {
              enemy.setState(EnemyState.PATROL)
            }
          }

          // Patrol units detect constructed structures
          if (enemy.getState() === EnemyState.PATROL) {
            let closestStructure: { x: number; y: number } | null = null
            let closestDist = 999
            for (let y = 0; y < this.map.height; y++) {
              for (let x = 0; x < this.map.width; x++) {
                const terrain = this.map.getTerrain(x, y)
                if (
                  terrain === TerrainType.FOB_COMMAND ||
                  terrain === TerrainType.FOB_HOSPITAL ||
                  terrain === TerrainType.FOB_SUPPLY
                ) {
                  const dx = enemy.getPosition().x - x
                  const dy = enemy.getPosition().y - y
                  const dist = Math.sqrt(dx * dx + dy * dy)
                  if (dist < closestDist) {
                    closestDist = dist
                    closestStructure = { x, y }
                  }
                }
              }
            }

            if (closestStructure && closestDist <= 5.0) {
              enemy.setState(EnemyState.ASSAULT_TARGET)
              enemy.setAssaultTarget(closestStructure.x, closestStructure.y)
              this.addRadioMessage({
                id: crypto.randomUUID(),
                fromUnitId: '⚠️ BİLİNMEYEN',
                message: `[TELSİZ SIZINTISI] Düşman unsurları (${closestStructure.x}, ${closestStructure.y}) konumundaki üs yapımızı fark etti ve taarruza geçiyor!`,
                sentTick: currentSimTime,
                category: ReportCategory.DANGER,
                corrupted: false,
                type: ReportType.REGULAR,
              })
            }
          }
        }

        // Handle enemy attacks on structures if in assault range
        if (enemy.getState() === EnemyState.ASSAULT_TARGET && enemy.getHasAssaultTarget()) {
          const at = enemy.getAssaultTarget()
          const terrainAtTarget = this.map.getTerrain(at.x, at.y)
          const isMainCapturePoint = this.hasCapturePoint && this.capturePoint.x === at.x && this.capturePoint.y === at.y
          const isStructureTerrain = terrainAtTarget === TerrainType.FOB_COMMAND || terrainAtTarget === TerrainType.FOB_HOSPITAL || terrainAtTarget === TerrainType.FOB_SUPPLY

          if (!isStructureTerrain && !isMainCapturePoint) {
            enemy.setState(EnemyState.PATROL)
          } else if (isStructureTerrain) {
            const dx = enemy.getPosition().x - at.x
            const dy = enemy.getPosition().y - at.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            let attackRange = 2.5
            if (enemy.getType() === EnemyType.SNIPER) attackRange = 6.0
            else if (enemy.getType() === EnemyType.MG) attackRange = 3.5
            else if (enemy.getType() === EnemyType.ARMORED) attackRange = 1.5
            if (enemy.getType() !== EnemyType.SNIPER) {
              attackRange = Math.max(attackRange, 3.0)
            }

            if (dist <= attackRange) {
              targetPos = undefined // Stop moving closer

              let fireChance = 0.25
              if (this.sandboxSettings?.difficulty === 'EASY') fireChance = 0.15
              else if (this.sandboxSettings?.difficulty === 'HARD') fireChance = 0.40

              if (Math.random() <= fireChance) {
                const coordKey = `${at.x},${at.y}`
                const currentHp = this.structureHealth.get(coordKey) || 100
                const dmg = enemy.getType() === EnemyType.ARMORED ? 40 : 15 + Math.floor(Math.random() * 11)
                const newHp = Math.max(0, currentHp - dmg)

                this.structureHealth.set(coordKey, newHp)
                const structureName = terrainAtTarget === TerrainType.FOB_COMMAND ? 'Komuta Merkezi' : terrainAtTarget === TerrainType.FOB_HOSPITAL ? 'Sahra Hastanesi' : 'Mühimmat Deposu'

                audioManager.startGunfireAmbient()
                if (enemy.getType() === EnemyType.ARMORED) {
                  audioManager.playTankFire()
                }

                this.addRadioMessage({
                  id: crypto.randomUUID(),
                  fromUnitId: '⚠️ BİLİNMEYEN',
                  message: `[SABOTAJ] Düşman unsurları (${at.x},${at.y}) konumundaki ${structureName} yapımıza hasar veriyor! Yapı Sağlığı: %${newHp}`,
                  sentTick: currentSimTime,
                  category: ReportCategory.DANGER,
                  corrupted: false,
                  type: ReportType.REGULAR,
                })

                if (newHp <= 0) {
                  this.map.setTerrain(at.x, at.y, TerrainType.OPEN)
                  this.structureHealth.delete(coordKey)

                  if (terrainAtTarget === TerrainType.FOB_SUPPLY) {
                    this.addRadioMessage({
                      id: crypto.randomUUID(),
                      fromUnitId: '💥 PATLAMA',
                      message: `[YIKIM] (${at.x},${at.y}) konumundaki Mühimmat Deposu patladı! Çevredeki tüm birimler şarapnel hasarı aldı! (-25 HP)`,
                      sentTick: currentSimTime,
                      category: ReportCategory.DANGER,
                      corrupted: false,
                      type: ReportType.REGULAR,
                    })

                    for (const [, u] of this.units) {
                      if (u.isAlive()) {
                        const ux = u.getPosition().x - at.x
                        const uy = u.getPosition().y - at.y
                        if (Math.sqrt(ux * ux + uy * uy) <= 1.5) {
                          u.takeDamage(25)
                          u.adjustMorale(-15)
                        }
                      }
                    }
                    for (const [, eUnit] of this.enemies) {
                      if (eUnit.isAlive()) {
                        const ex = eUnit.getPosition().x - at.x
                        const ey = eUnit.getPosition().y - at.y
                        if (Math.sqrt(ex * ex + ey * ey) <= 1.5) {
                          eUnit.takeDamage(25)
                          eUnit.adjustMorale(-15)
                        }
                      }
                    }
                  } else {
                    this.addRadioMessage({
                      id: crypto.randomUUID(),
                      fromUnitId: '🏗️ İNŞAAT',
                      message: `[YIKIM] (${at.x},${at.y}) konumundaki ${structureName} yapımız tamamen imha edildi!`,
                      sentTick: currentSimTime,
                      category: ReportCategory.DANGER,
                      corrupted: false,
                      type: ReportType.REGULAR,
                    })
                  }

                  enemy.setState(EnemyState.PATROL)
                }
              }
            } else {
              targetPos = at
            }
          }
        }

        // Call update with targetPos for pathfinding pursuit
        enemy.update(1, this.map, this.map.width, this.map.height, updatedOccupiedPositions, targetPos)
        if (!enemy.isAlive()) continue

        // 2. Smart target prioritization within firing range
        let attackRange = 2.5
        if (enemy.getType() === EnemyType.SNIPER) attackRange = 6.0
        else if (enemy.getType() === EnemyType.MG) attackRange = 3.5
        else if (enemy.getType() === EnemyType.ARMORED) attackRange = 1.5
        if (enemy.getType() !== EnemyType.SNIPER) {
          attackRange = Math.max(attackRange, 3.0)
        }

        const unitsInRange: { unit: Soldier; dist: number }[] = []
        for (const playerUnit of this.units.values()) {
          if (!playerUnit.isAlive()) continue
          const dx = enemy.getPosition().x - playerUnit.getPosition().x
          const dy = enemy.getPosition().y - playerUnit.getPosition().y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= attackRange) {
            unitsInRange.push({ unit: playerUnit, dist })
          }
        }

        if (unitsInRange.length > 0) {
          // Sort target units: prioritizes low HP (kill shot), then not in cover
          unitsInRange.sort((a, b) => {
            const hpA = a.unit.getHp()
            const hpB = b.unit.getHp()
            
            // Priority 1: Can secure a kill (HP <= 25)
            const killA = hpA <= 25 ? 1 : 0
            const killB = hpB <= 25 ? 1 : 0
            if (killA !== killB) return killB - killA
            
            // Priority 2: Target in the open (no cover)
            const coverA = a.unit.isInCover() ? 1 : 0
            const coverB = b.unit.isInCover() ? 1 : 0
            if (coverA !== coverB) return coverA - coverB
            
            // Priority 3: Lowest HP
            return hpA - hpB
          })

          const bestTarget = unitsInRange[0].unit

          // Difficulty-scaled shooting frequency
          let fireChance = 0.25
          if (this.sandboxSettings?.difficulty === 'EASY') fireChance = 0.15
          else if (this.sandboxSettings?.difficulty === 'HARD') fireChance = 0.40

          if (Math.random() <= fireChance) {
            let dmgMultiplier = 1.0
            if (this.sandboxSettings?.difficulty === 'EASY') dmgMultiplier = 0.75
            else if (this.sandboxSettings?.difficulty === 'HARD') dmgMultiplier = 1.3

            const res = MultiplayerLogic.processEnemyImpact(enemy, bestTarget, this.map, dmgMultiplier)

            // Special Combat Effects (Armored Splash and MG Suppressive Area Denial) if difficulty is STANDARD or HARD
            const diffLevel = this.sandboxSettings?.difficulty || 'STANDARD'
            if (diffLevel !== 'EASY') {
              const targetPos = bestTarget.getPosition()

              if (enemy.getType() === EnemyType.ARMORED && res.attackHit) {
                // Armored tank splash damage: 8 HP damage to nearby player units within 1.5 tile radius
                let splashCount = 0
                for (const [uid, playerUnit] of this.units) {
                  if (uid === bestTarget.getId() || !playerUnit.isAlive()) continue
                  const px = playerUnit.getPosition().x - targetPos.x
                  const py = playerUnit.getPosition().y - targetPos.y
                  const pdist = Math.sqrt(px * px + py * py)
                  if (pdist <= 1.5) {
                    playerUnit.takeDamage(8)
                    playerUnit.adjustMorale(-10)
                    splashCount++
                  }
                }
                if (splashCount > 0) {
                  res.reportMessage += ` ve yakındaki ${splashCount} asker şarapnel hasarı aldı! (-8 HP, -10 Moral)`
                }
              } else if (enemy.getType() === EnemyType.MG) {
                // MG suppressive area denial: suppress player units in 1.5 tile radius, reducing morale by 8 and setting them under fire
                let suppressedCount = 0
                for (const [uid, playerUnit] of this.units) {
                  if (uid === bestTarget.getId() || !playerUnit.isAlive()) continue
                  const px = playerUnit.getPosition().x - targetPos.x
                  const py = playerUnit.getPosition().y - targetPos.y
                  const pdist = Math.sqrt(px * px + py * py)
                  if (pdist <= 1.5) {
                    playerUnit.adjustMorale(-8)
                    playerUnit.setUnderFire()
                    suppressedCount++
                  }
                }
                if (suppressedCount > 0) {
                  if (res.attackHit) {
                    res.reportMessage += ` Çevredeki ${suppressedCount} asker daha siper almaya zorlandı! (-8 Moral)`
                  } else {
                    res.reportMessage += ` Yakındaki ${suppressedCount} asker de yoğun baskı ateşi altında kaldı! (-8 Moral)`
                  }
                }
              }
            }

            if (res.reportMessage) {
              this.combatActiveTimer = 10
              const sig = this.getSignalStrengthAt(bestTarget.getPosition())
              this.radio.queueReport(bestTarget.getId(), res.reportMessage, currentSimTime, Math.max(0.1, 1 - sig), -1, ReportType.REGULAR, '', res.category)
              if (res.enemyTauntMessage) {
                this.radio.queueReport('⚠️ BİLİNMEYEN', res.enemyTauntMessage, currentSimTime + 1, 0.6, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
              }
            }
          }
        }
      }

      // Detect enemies → request fire permission
      for (const [playerId, playerUnit] of this.units) {
        if (!playerUnit.isAlive()) continue
        const soldier = playerUnit as Soldier
        if (soldier.getFirePermission() !== FirePermission.UNDEFINED) continue

        // Skip auto-detection for units with an active attack route (they are focusing on moving to their target)
        if (this.attackRoutes.has(playerId)) continue

        let targetEnemy: EnemyUnit | null = null
        let targetEnemyId = ''

        // Prioritize manually selected target if still alive and in range
        const manualTargetId = soldier.getEngagementTargetId()
        if (manualTargetId) {
          const enemy = this.enemies.get(manualTargetId)
          if (enemy && enemy.isAlive()) {
            const dx = enemy.getPosition().x - soldier.getPosition().x
            const dy = enemy.getPosition().y - soldier.getPosition().y
            const dist = Math.sqrt(dx * dx + dy * dy)

            let detectionRange = 2.5
            if (soldier.getRole() === SoldierRole.SNIPER) detectionRange = 6.0
            else if (soldier.getRole() === SoldierRole.MG) detectionRange = 3.5
            else if (soldier.getRole() === SoldierRole.MEDIC || soldier.getRole() === SoldierRole.ENGINEER) detectionRange = 2.0
            else if (soldier.getRole() === SoldierRole.ARMORED) detectionRange = 1.8

            if (soldier.getRole() !== SoldierRole.SNIPER) {
              detectionRange = Math.max(detectionRange, 3.0)
            }

            if (dist <= detectionRange) {
              targetEnemy = enemy
              targetEnemyId = manualTargetId
            }
          }
        }

        // If no valid manual target, fall back to scanning the enemies
        if (!targetEnemy) {
          for (const [eid, enemy] of this.enemies) {
            if (!enemy.isAlive()) continue
            const dx = enemy.getPosition().x - soldier.getPosition().x
            const dy = enemy.getPosition().y - soldier.getPosition().y
            const dist = Math.sqrt(dx * dx + dy * dy)

            let detectionRange = 2.5
            if (soldier.getRole() === SoldierRole.SNIPER) detectionRange = 6.0
            else if (soldier.getRole() === SoldierRole.MG) detectionRange = 3.5
            else if (soldier.getRole() === SoldierRole.MEDIC || soldier.getRole() === SoldierRole.ENGINEER) detectionRange = 2.0
            else if (soldier.getRole() === SoldierRole.ARMORED) detectionRange = 1.8

            if (soldier.getRole() !== SoldierRole.SNIPER) {
              detectionRange = Math.max(detectionRange, 3.0)
            }

            if (dist <= detectionRange) {
              targetEnemy = enemy
              targetEnemyId = eid
              break
            }
          }
        }

        if (targetEnemy) {
          const enemy = targetEnemy
          const eid = targetEnemyId
          const dx = enemy.getPosition().x - soldier.getPosition().x
          const dy = enemy.getPosition().y - soldier.getPosition().y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const sig = this.getSignalStrengthAt(soldier.getPosition())

          // Automatic fire if within 3 blocks and not a sniper
          if (soldier.getRole() !== SoldierRole.SNIPER && dist <= 3.0) {
            const res = MultiplayerLogic.processCombatImpact(soldier, enemy, this.map)
            this.combatActiveTimer = 10
            this.radio.queueReport(
              playerId,
              `Menzile giren düşmana (${enemy.getName()}) inisiyatif kullanarak otomatik ateş açtık! ` + res.reportMessage,
              currentSimTime, Math.max(0.1, 1 - sig), -1,
              ReportType.REGULAR, eid, res.category
            )
            if (res.enemyTauntMessage) {
              this.radio.queueReport('⚠️ BİLİNMEYEN', res.enemyTauntMessage, currentSimTime + 1, 0.6, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
            }
            continue
          }

          // Communication Loss ROE Handling
          if (sig < 0.2) {
            const prevPerm = soldier.getFirePermission()
            if (prevPerm !== FirePermission.PERMITTED) {
              this.addRadioMessage({
                id: crypto.randomUUID(),
                fromUnitId: '📡 SİSTEM',
                message: `[BAĞLANTI KAYBI] ${soldier.getName()} telsiz sinyali %20 altına düştü. Birim otomatik olarak Serbest Atış ROE protokolüne geçti!`,
                sentTick: currentSimTime,
                category: ReportCategory.DANGER,
                corrupted: false,
                type: ReportType.REGULAR,
              })
            }
            soldier.setFirePermission(FirePermission.PERMITTED)
            soldier.setEngagementTargetId(eid)
            this.radio.queueReport(
              playerId,
              `Karargah... Sinyal koptu! İnisiyatif kullanıyoruz, çakalları mermiye boğmaya başladık! (${enemy.getName()})`,
              currentSimTime, 0, currentSimTime,
              ReportType.REGULAR, eid,
            )
            continue
          }

          soldier.setFirePermission(FirePermission.WAITING_FOR_PERMISSION)
          soldier.setEngagementTargetId(eid)
          this.radio.queueReport(
            playerId,
            `Karargah, menzilimizde bir it sürüsü (${enemy.getName()}) tespit edildi! İndirmek için emir bekliyoruz, tamam!`,
            currentSimTime, Math.max(0.1, 1 - sig), currentSimTime,
            ReportType.ENGAGEMENT_REQUEST, eid,
          )
        }
      }

      // Rations
      const hasRations = this.resources.consumeRations(this.units.size, 1)
      if (!hasRations && i % 10 === 0) {
        for (const [id, unit] of this.units) {
          unit.adjustMorale(-5)
          this.radio.queueReport(id, 'Karargah... Kurumuş boğazımız, ikmal nerede bre! Mide zil çalıyor, moral b*k gibi.', currentSimTime, 0.3)
        }
      }

      // Supply deliveries
      const deliveries = this.resources.processPendingSupplies(currentSimTime)
      for (const { unitId, type, amount } of deliveries) {
        if (type === SupplyType.CONSTRUCTION_MATERIAL) {
          const unit = this.units.get(unitId)
          if (unit) {
            const pos = unit.getPosition()
            let targetX = pos.x
            let targetY = pos.y
            let found = false
            for (let r = 0; r <= 2; r++) {
              for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                  const tx = pos.x + dx
                  const ty = pos.y + dy
                  if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
                    if (this.map.getTerrain(tx, ty) === TerrainType.OPEN) {
                      targetX = tx
                      targetY = ty
                      found = true
                      break
                    }
                  }
                }
                if (found) break
              }
              if (found) break
            }

            this.airdrops.push({ x: targetX, y: targetY, amount })
            this.addRadioMessage({
              id: crypto.randomUUID(),
              fromUnitId: '📦 LOJİSTİK',
              message: `[HAVA İKMALİ DÜŞTÜ] İnşaat Malzemesi kutusu paraşütle (${targetX}, ${targetY}) konumuna indi.`,
              sentTick: currentSimTime,
              category: ReportCategory.SUCCESS,
              corrupted: false,
              type: ReportType.REGULAR,
            })
          }
        } else {
          const typeName = type === SupplyType.AMMO ? 'Mühimmat' : type === SupplyType.RATIONS ? 'Erzak' : type === SupplyType.MEDKITS ? 'Medkit' : 'İnşaat Malzemesi'
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '📦 LOJİSTİK',
            message: `[İKMAL TESLİMATI] ${unitId} birimine koli bırakıldı (${amount}x ${typeName}). Afiyet olsun tertip!`,
            sentTick: currentSimTime,
            category: ReportCategory.SUCCESS,
            corrupted: false,
            type: ReportType.REGULAR,
          })
          const unit = this.units.get(unitId)
          if (unit) {
            unit.resupply(
              type === SupplyType.AMMO ? amount : 0,
              type === SupplyType.RATIONS ? amount : 0,
              type === SupplyType.MEDKITS ? amount : 0,
            )
          }
        }
      }

      // Capture point check
      if (this.hasCapturePoint && !this.victoryAchieved) {
        this.defenseTimerCurrent += 1

        if (this.sandboxSettings?.mode === 'RAAS') {
          const cp = this.capturePoint
          const unitsOnPoint = [...this.units.values()].filter(u => {
            const p = u.getPosition()
            return p.x === cp.x && p.y === cp.y && u.isAlive()
          })
          const enemiesOnPoint = [...this.enemies.values()].filter(e => {
            const p = e.getPosition()
            return p.x === cp.x && p.y === cp.y && e.isAlive()
          })

          if (unitsOnPoint.length >= 1 && enemiesOnPoint.length === 0) {
            this.capturePointTurns.host++
            if (this.capturePointTurns.host >= 3) {
              const currentPointName = this.raasActivePointIndex === 0 ? 'Hedef A' : this.raasActivePointIndex === 1 ? 'Hedef B' : 'Hedef C'
              this.addRadioMessage({
                id: crypto.randomUUID(),
                fromUnitId: '🏁 SİSTEM',
                message: `[HEDEF GÜVENCEYE ALINDI] ${currentPointName} (${cp.x}, ${cp.y}) ele geçirildi!`,
                sentTick: currentSimTime,
                category: ReportCategory.SUCCESS,
                corrupted: false,
                type: ReportType.REGULAR
              })

              if (this.raasActivePointIndex < 2) {
                this.raasActivePointIndex++
                this.capturePointTurns.host = 0
                const nextPointName = this.raasActivePointIndex === 1 ? 'Hedef B' : 'Hedef C'
                this.capturePoint = this.getNewRAASPoint(this.sandboxSettings.mapSize, cp)
                this.addRadioMessage({
                  id: crypto.randomUUID(),
                  fromUnitId: '🏆 KARARGAH',
                  message: `Yeni emir: ${nextPointName} (${this.capturePoint.x}, ${this.capturePoint.y}) bölgesine intikal edin ve güvenceye alın!`,
                  sentTick: currentSimTime,
                  category: ReportCategory.MISSION_SUPPORT,
                  corrupted: false,
                  type: ReportType.REGULAR
                })

                // Dynamic routing: redirect active assault enemies to the new capture point
                for (const [, enemy] of this.enemies) {
                  if (enemy.isAlive() && enemy.getState() === EnemyState.ASSAULT_TARGET) {
                    enemy.setAssaultTarget(this.capturePoint.x, this.capturePoint.y)
                  }
                }
              } else {
                this.victoryAchieved = true
                this.addRadioMessage({
                  id: crypto.randomUUID(),
                  fromUnitId: '🏆 KARARGAH',
                  message: `TEBRİKLER! Tüm RAAS hedefleri (A, B ve C) başarıyla kontrol altına alındı. Operasyon zaferle tamamlandı!`,
                  sentTick: currentSimTime,
                  category: ReportCategory.SUCCESS,
                  corrupted: false,
                  type: ReportType.REGULAR
                })
              }
            }
          } else {
            this.capturePointTurns.host = 0
          }
        } else {
          for (const [, enemy] of this.enemies) {
            if (!enemy.isAlive()) continue
            const ep = enemy.getPosition()
            if (ep.x === this.capturePoint.x && ep.y === this.capturePoint.y) {
              this.capturePointFallen = true
              this.victoryAchieved = true
              this.addRadioMessage({
                id: crypto.randomUUID(),
                fromUnitId: '💀 SİSTEM',
                message: 'KARAKOL GİTTİ! Namussuzlar içeri daldı, mevzi elden çıktı!',
                sentTick: currentSimTime,
                category: ReportCategory.DANGER,
                corrupted: false,
                type: ReportType.REGULAR,
              })
            }
          }
          if (this.defenseTimerCurrent >= this.defenseTimerMax && !this.victoryAchieved) {
            this.victoryAchieved = true
            this.addRadioMessage({
              id: crypto.randomUUID(),
              fromUnitId: '🏆 KARARGAH',
              message: 'SAVUNMA BAŞARILI! 120 dakika boyunca aslanlar gibi direndiniz. Takviye yolda!',
              sentTick: currentSimTime,
              category: ReportCategory.SUCCESS,
              corrupted: false,
              type: ReportType.REGULAR,
            })
          }
        }
      }

      // Random events
      this.scheduleRandomEvents(currentSimTime)
    }
  }

  private scheduleRandomEvents(currentTick: number): void {
    if (Math.random() < 0.005) {
      const msgs = [
        'İstihbarat: Bölgede çakal hareketi seziyoruz, tetikte kalın.',
        'Hava bükücüler 30 dakika içinde tepelerine binebilir, talep var mı?',
        'Komşu birlik telsizi: "Buralar iyice ısındı, her yerden patlama sesi geliyor."',
      ]
      this.radio.queueReport('📡 İSTİHBARAT', msgs[Math.floor(Math.random() * msgs.length)], currentTick, 0.1, -1, ReportType.REGULAR, '', ReportCategory.MISSION_SUPPORT)
    }
  }

  private processRadioQueue(): void {
    let deadCount = [...this.units.values()].filter(u => !u.isAlive()).length
    let avgMorale = [...this.units.values()].reduce((sum, u) => sum + u.getMorale(), 0) / Math.max(1, this.units.size)
    let dynamicCorruptionChance = 0.05 + (deadCount * 0.05) + (avgMorale < 40 ? 0.1 : 0)
    
    this.radio.setBaseCorruptionChance(dynamicCorruptionChance)

    const newMsgs = this.radio.processQueue(
      this.time.toTotalMinutes(),
      (unitId, cmd) => this.dispatchCommand(unitId, cmd),
      (fromUnitId, engagementTargetId) => {
        if (!this.pendingEngagement) {
          const unit = this.units.get(fromUnitId)
          const enemy = this.enemies.get(engagementTargetId)
          if (unit && enemy) {
            this.pendingEngagement = {
              unitId: fromUnitId,
              unitName: unit.getName(),
              enemyId: engagementTargetId,
              enemyName: enemy.getName(),
            }
          }
        }
      }
    )
    for (const msg of newMsgs) {
      this.addRadioMessage(msg)
    }
  }

  // ── Command dispatch ──────────────────────────────────────────
  dispatchCommand(unitId: string, cmd: string): void {
    const unit = this.units.get(unitId)
    if (!unit) return

    const pos = unit.getPosition()
    const sig = this.getSignalStrengthAt(pos)

    if (cmd === 'ates') {
      let target: EnemyUnit | null = null
      let minDist = 999
      const attackRange = (unit as Soldier).getRole() === SoldierRole.SNIPER ? 6.0 : 3.0

      // If the unit has an engagement target set, try to target them first if they are within range
      const etid = (unit as Soldier).getEngagementTargetId()
      const et = etid ? this.enemies.get(etid) : null
      if (et && et.isAlive()) {
        const dx = et.getPosition().x - pos.x
        const dy = et.getPosition().y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= attackRange) {
          target = et
        }
      }

      // Otherwise fallback to closest enemy in range
      if (!target) {
        for (const [, enemy] of this.enemies) {
          if (!enemy.isAlive()) continue
          const dx = enemy.getPosition().x - pos.x
          const dy = enemy.getPosition().y - pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < minDist && dist <= attackRange) { minDist = dist; target = enemy }
        }
      }
      if (target) {
        const res = CombatSystem.resolveAttack(unit as Soldier, target, this.map)
        this.combatActiveTimer = 10 // 10 ticks of ambient after last shot
        this.radio.queueReport(unitId, res.reportMessage, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig), -1, ReportType.REGULAR, '', res.category)
      } else {
        this.radio.queueReport(unitId, 'Mıntıka temiz görünüyor, boş kovan harcamıyoruz.', this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
      }
    } else if (cmd === 'ATES_IZNI_VERILDI') {
      const soldier = unit as Soldier
      soldier.setFirePermission(FirePermission.PERMITTED)
      const tid = soldier.getEngagementTargetId()
      const enemy = this.enemies.get(tid)
      if (enemy?.isAlive()) {
        const res = MultiplayerLogic.processCombatImpact(soldier, enemy, this.map)
        this.radio.queueReport(unitId, 'Anlaşıldı Karargah, imha ateşine başlıyoruz! ' + res.reportMessage, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig), -1, ReportType.REGULAR, '', res.category)
        if (res.enemyTauntMessage) {
          this.radio.queueReport('⚠️ BİLİNMEYEN', res.enemyTauntMessage, this.time.toTotalMinutes() + 1, 0.6, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
        }
        // After firing, reset permission
        setTimeout(() => { soldier.setFirePermission(FirePermission.UNDEFINED) }, 100)
      }
    } else if (cmd === 'ATES_YASAK') {
      const soldier = unit as Soldier
      soldier.setFirePermission(FirePermission.DENIED)
      this.radio.queueReport(unitId, 'Emir anlaşıldı Karargah, tetiği çektik bekliyoruz.', this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
    } else if (cmd === 'BEKLEMEDE_KAL') {
      const soldier = unit as Soldier
      soldier.setFirePermission(FirePermission.HOLD_FIRE)
      this.radio.queueReport(unitId, 'Anlaşıldı Karargah, takipteyiz ama ateş açmıyoruz.', this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
    } else if (cmd === 'telsiz_kur') {
      const soldier = unit as Soldier
      if (soldier.getHasPortableRadio()) {
        soldier.setHasPortableRadio(false)
        const unitPos = soldier.getPosition()
        this.deployedRadios.push({ x: unitPos.x, y: unitPos.y })
        
        this.addRadioMessage({
          id: crypto.randomUUID(),
          fromUnitId: '📡 SİSTEM',
          message: `[TELSİZ RÖLESİ ETKİN] ${soldier.getName()} telsiz rölesini kurdu! Koordinat: (${unitPos.x},${unitPos.y}). Sinyal yarıçapı: 4 kare.`,
          sentTick: this.time.toTotalMinutes(),
          category: ReportCategory.SUCCESS,
          corrupted: false,
          type: ReportType.REGULAR,
        })
        
        this.radio.queueReport(unitId, `Telsiz rölesini kurduk, parazitler temizlendi, bağlantı net!`, this.time.toTotalMinutes(), 0.0)
      } else {
        this.radio.queueReport(unitId, `Telsiz rölesi zaten kurulmuş veya envanterde yok!`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
      }
    } else if (cmd === 'telsiz_topla') {
      const soldier = unit as Soldier
      const unitPos = soldier.getPosition()
      const radioIdx = this.deployedRadios.findIndex(r => r.x === unitPos.x && r.y === unitPos.y)
      if (radioIdx !== -1) {
        if (!soldier.getHasPortableRadio()) {
          this.deployedRadios.splice(radioIdx, 1)
          soldier.setHasPortableRadio(true)
          
          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '📡 SİSTEM',
            message: `[TELSİZ RÖLESİ TOPLANDI] ${soldier.getName()} telsiz rölesini geri topladı. Koordinat: (${unitPos.x},${unitPos.y}).`,
            sentTick: this.time.toTotalMinutes(),
            category: ReportCategory.SUCCESS,
            corrupted: false,
            type: ReportType.REGULAR,
          })
          
          this.radio.queueReport(unitId, `Telsiz rölesini söktük, çantamıza aldık.`, this.time.toTotalMinutes(), 0.0)
        } else {
          this.radio.queueReport(unitId, `Zaten üzerimde telsiz var, daha fazlasını taşıyamam!`, this.time.toTotalMinutes(), 0.0)
        }
      } else {
        this.radio.queueReport(unitId, `Bu konumda telsiz rölesi bulunmuyor!`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
      }
    } else if (cmd.startsWith('insaat_basla ')) {
      const soldier = unit as Soldier
      const structureType = cmd.split(' ')[1] as TerrainType
      const unitPos = soldier.getPosition()
      const tileTerrain = this.map.getTerrain(unitPos.x, unitPos.y)

      const costs: Partial<Record<TerrainType, number>> = {
        [TerrainType.FOB_COMMAND]: 3,
        [TerrainType.FOB_HOSPITAL]: 2,
        [TerrainType.FOB_SUPPLY]: 2,
        [TerrainType.FOB_SANDBAGS]: 1
      }
      const durations: Partial<Record<TerrainType, number>> = {
        [TerrainType.FOB_COMMAND]: 10,
        [TerrainType.FOB_HOSPITAL]: 6,
        [TerrainType.FOB_SUPPLY]: 4,
        [TerrainType.FOB_SANDBAGS]: 2
      }

      const cost = costs[structureType] ?? 0
      const duration = durations[structureType] ?? 0

      if (soldier.getRole() !== SoldierRole.ENGINEER) {
        this.radio.queueReport(unitId, `HATA: Sadece İstihkam (Engineer) birimleri yapı inşa edebilir!`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
      } else if (tileTerrain !== TerrainType.OPEN) {
        this.radio.queueReport(unitId, `HATA: Sadece boş (OPEN) arazilerde inşaat yapılabilir!`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
      } else if (soldier.getConstructionMaterials() < cost) {
        this.radio.queueReport(unitId, `HATA: Yetersiz İnşaat Malzemesi! Gereken: ${cost}, Mevcut: ${soldier.getConstructionMaterials()}`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
      } else if (this.activeConstructions.has(`${unitPos.x},${unitPos.y}`)) {
        this.radio.queueReport(unitId, `HATA: Bu konumda zaten devam eden bir inşaat var!`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
      } else {
        // Deduct materials
        soldier.setConstructionMaterials(soldier.getConstructionMaterials() - cost)
        // Add active construction
        this.activeConstructions.set(`${unitPos.x},${unitPos.y}`, {
          structureType,
          progress: 0,
          targetProgress: duration,
          builderId: unitId
        })

        const structureName = structureType === TerrainType.FOB_COMMAND ? 'Komuta Merkezi' : structureType === TerrainType.FOB_HOSPITAL ? 'Sahra Hastanesi' : structureType === TerrainType.FOB_SUPPLY ? 'Mühimmat Deposu' : 'Kum Torbası Siperi'
        
        this.addRadioMessage({
          id: crypto.randomUUID(),
          fromUnitId: '🏗️ İNŞAAT',
          message: `[İNŞAAT BAŞLADI] ${soldier.getName()} (${unitPos.x},${unitPos.y}) konumunda ${structureName} inşasına başladı. Gerekli süre: ${duration} tick.`,
          sentTick: this.time.toTotalMinutes(),
          category: ReportCategory.SUCCESS,
          corrupted: false,
          type: ReportType.REGULAR,
        })
        this.radio.queueReport(unitId, `Kazmayı vurduk komutanım, ${structureName} için şablonu kurduk. Malzeme harcandı, inşaattayız!`, this.time.toTotalMinutes(), 0.0)
      }
    } else if (cmd.startsWith('tasi ')) {
      const caller = unit as Soldier
      const targetId = cmd.split(' ')[1]
      const target = this.units.get(targetId) as Soldier

      if (!target || !target.isAlive() || !target.isIncapacitated()) {
        this.radio.queueReport(unitId, `HATA: Belirtilen hedef birim hayatta ve ağır yaralı (incapacitated) değil!`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
      } else {
        const dx = caller.getPosition().x - target.getPosition().x
        const dy = caller.getPosition().y - target.getPosition().y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 1.5) {
          this.radio.queueReport(unitId, `HATA: Kurtarılacak birim en fazla 1 blok yakınınızda olmalıdır!`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
        } else if (caller.getCarryingUnitId() !== '') {
          this.radio.queueReport(unitId, `HATA: Zaten bir yaralı taşıyorsunuz!`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
        } else if (target.getCarriedByUnitId() !== '') {
          this.radio.queueReport(unitId, `HATA: Bu yaralı zaten başka bir personel tarafından taşınıyor!`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
        } else {
          caller.setCarryingUnitId(targetId)
          target.setCarriedByUnitId(unitId)

          this.addRadioMessage({
            id: crypto.randomUUID(),
            fromUnitId: '🚑 TAHLİYE',
            message: `[YARALI TAHLİYESİ] ${caller.getName()} yaralı ${target.getName()} personelini omuzladı.`,
            sentTick: this.time.toTotalMinutes(),
            category: ReportCategory.SUCCESS,
            corrupted: false,
            type: ReportType.REGULAR,
          })
          this.radio.queueReport(unitId, `${target.getName()} yaralısını sırtlandım komutanım, yavaş ilerliyoruz tamam.`, this.time.toTotalMinutes(), 0.0)
        }
      }
    } else if (cmd === 'birak') {
      const caller = unit as Soldier
      const targetId = caller.getCarryingUnitId()
      const target = targetId ? this.units.get(targetId) as Soldier : null

      if (!target) {
        this.radio.queueReport(unitId, `HATA: Şu an taşıdığınız bir yaralı bulunmamaktadır!`, this.time.toTotalMinutes(), 0.0, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
      } else {
        caller.setCarryingUnitId('')
        target.setCarriedByUnitId('')

        this.addRadioMessage({
          id: crypto.randomUUID(),
          fromUnitId: '🚑 TAHLİYE',
          message: `[YARALI BIRAKILDI] ${caller.getName()} yaralı ${target.getName()} personelini yere bıraktı.`,
          sentTick: this.time.toTotalMinutes(),
          category: ReportCategory.REGULAR,
          corrupted: false,
          type: ReportType.REGULAR,
        })
        this.radio.queueReport(unitId, `Yaralıyı emniyetli şekilde yere bıraktık.`, this.time.toTotalMinutes(), 0.0)
      }
    } else if (cmd.startsWith('git ')) {
      const parts = cmd.split(' ')
      const tx = parseInt(parts[1])
      const ty = parseInt(parts[2])
      if (!isNaN(tx) && !isNaN(ty)) {
        // Prevent moving to occupied cells
        let isOccupied = false
        for (const u of this.units.values()) {
          if (u.isAlive() && u.getId() !== unitId && u.getPosition().x === tx && u.getPosition().y === ty) {
            isOccupied = true
            break
          }
        }
        for (const e of this.enemies.values()) {
          if (e.isAlive() && e.getPosition().x === tx && e.getPosition().y === ty) {
            isOccupied = true
            break
          }
        }

        if (isOccupied) {
          this.radio.queueReport(unitId, `Hedef bölge (${tx},${ty}) dolu! İntikal iptal edildi.`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig), -1, ReportType.REGULAR, '', ReportCategory.DANGER)
        } else {
          this.setUnitPositionWithCarried(unitId, { x: Math.max(0, Math.min(14, tx)), y: Math.max(0, Math.min(14, ty)) })
          this.radio.queueReport(unitId, `Hedef bölgeye kapak attık. Koordinatımız: ${tx}, ${ty}`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
          // After move, reset fire permission to detect new threats
          setTimeout(() => {
            const s = unit as Soldier
            if (s.getFirePermission() !== FirePermission.WAITING_FOR_PERMISSION) {
              s.setFirePermission(FirePermission.UNDEFINED)
            }
          }, 50)
        }
      }
    } else if (cmd === 'topcu' || cmd.startsWith('topcu ')) {
      this.artilleryStrike(cmd, unitId, sig)
    } else if (cmd.startsWith('t129 ')) {
      const parts = cmd.split(' ')
      const tx = parseInt(parts[1])
      const ty = parseInt(parts[2])
      let hits = 0
      for (const [, enemy] of this.enemies) {
        if (!enemy.isAlive()) continue
        if (enemy.getPosition().x === tx && enemy.getPosition().y === ty) {
          const dmg = enemy.getType() === EnemyType.ARMORED ? 50 : 10
          enemy.takeDamage(dmg)
          hits++
        }
      }
      audioManager.playHelicopter(0.1, 0)
      setTimeout(() => audioManager.stopHelicopter(), 3000)
      if (hits > 0) {
        this.radio.queueReport('🚁 T-129 ATAK', `Koordinat (${tx},${ty}) delik deşik edildi! ${hits} çakal cehennemi boyladı!`, this.time.toTotalMinutes(), 0.1, -1, ReportType.REGULAR, '', ReportCategory.SUCCESS)
      } else {
        this.radio.queueReport('🚁 T-129 ATAK', `Mıntıka temiz, helikopterimiz boşuna mermi yakıyor. Geri dönüyoruz.`, this.time.toTotalMinutes(), 0.1, -1, ReportType.REGULAR, '', ReportCategory.MISSION_SUPPORT)
      }
    } else {
      unit.receiveCommand(cmd)
    }
  }

  private artilleryStrike(cmd: string, fromUnitId: string, sig: number): void {
    const parts = cmd.split(' ')
    const sx = parseInt(parts[1] ?? '7')
    const sy = parseInt(parts[2] ?? '7')
    let hits = 0
    for (const [, enemy] of this.enemies) {
      if (!enemy.isAlive()) continue
      const ep = enemy.getPosition()
      const dx = ep.x - sx; const dy = ep.y - sy
      if (Math.sqrt(dx * dx + dy * dy) <= 2) {
        const dmg = 30 + Math.floor(Math.random() * 40)
        enemy.takeDamage(dmg)
        hits++
      }
    }
    const msg = hits > 0
      ? `TOPÇU İSABETLİ! ${hits} hedef bölge tarandı! Koordinat: (${sx},${sy})`
      : `Topçu koordinatı (${sx},${sy}) mıntıkasına ateş açıldı. Hedef tespit edilemedi.`
    this.radio.queueReport(fromUnitId, msg, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig), -1, ReportType.REGULAR, '', hits > 0 ? ReportCategory.SUCCESS : ReportCategory.REGULAR)
    this.screenShake = true
    audioManager.playArtilleryImpact()
    setTimeout(() => { this.screenShake = false }, 600)
  }

  // ── Commands from UI ──────────────────────────────────────────
  sendRadioCommand(unitId: string, command: string): number {
    const delay = this.radio.sendCommand(unitId, command, this.time.toTotalMinutes())
    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '📡 TELSİZ',
      message: `→ ${unitId}: "${command}" | Beklenen teslimat: +${delay} dk`,
      sentTick: this.time.toTotalMinutes(),
      category: ReportCategory.MISSION_SUPPORT,
      corrupted: false,
      type: ReportType.REGULAR,
    })
    
    // Check if unit is a tank and command is movement
    const unit = this.units.get(unitId)
    if (unit && (unit as Soldier).getRole() === SoldierRole.ARMORED && command.startsWith('git ')) {
      audioManager.playTankMove()
    } else {
      audioManager.playRogerThat()
    }
    
    this.notify()
    return delay
  }

  issueFirePermission(decision: 'ATES_IZNI_VERILDI' | 'ATES_YASAK' | 'BEKLEMEDE_KAL'): void {
    if (!this.pendingEngagement) return
    this.dispatchCommand(this.pendingEngagement.unitId, decision)
    this.pendingEngagement = null
    this.processRadioQueue()
    this.checkEndGame()
    this.notify()
  }

  requestSupply(unitId: string, type: SupplyType, amount: number): void {
    if (this.supplyCooldown > 0) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '📦 LOJİSTİK',
        message: `İkmal uçakları şu an başka bir görevde. Bekleme süresi: ${this.supplyCooldown} dk.`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false,
        type: ReportType.REGULAR,
      })
      this.notify()
      return
    }

    this.supplyCooldown = 25
    this.resources.requestSupply(unitId, type, amount, this.time.toTotalMinutes())
    const typeName = type === SupplyType.AMMO ? 'Mühimmat' : type === SupplyType.RATIONS ? 'Erzak' : type === SupplyType.MEDKITS ? 'Medkit' : 'İnşaat Malzemesi'
    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '📦 LOJİSTİK',
      message: `İkmal talebi açıldı: ${unitId} → ${amount}x ${typeName}`,
      sentTick: this.time.toTotalMinutes(),
      category: ReportCategory.MISSION_SUPPORT,
      corrupted: false,
      type: ReportType.REGULAR,
    })
    this.notify()
  }

  moveUnit(unitId: string, x: number, y: number): void {
    const unit = this.units.get(unitId)
    if (!unit || !unit.isAlive()) return

    const unitPos = unit.getPosition()
    const targetPos = { x, y }

    // Construct occupied positions set (excluding current unit)
    const occupiedPositions = new Set<string>()
    for (const u of this.units.values()) {
      if (u.isAlive() && u.getId() !== unitId) {
        occupiedPositions.add(`${u.getPosition().x},${u.getPosition().y}`)
      }
    }
    for (const e of this.enemies.values()) {
      if (e.isAlive()) {
        occupiedPositions.add(`${e.getPosition().x},${e.getPosition().y}`)
      }
    }

    const path = this.map.findPath(unitPos, targetPos, occupiedPositions)
    if (path.length <= 1) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: `📡 SİSTEM`,
        message: `${unitId}: Hedefe ulaşılamıyor. Engelli veya dolu arazi!`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false,
        type: ReportType.REGULAR,
      })
      this.notify()
      return
    }

    const route: MoveRoute = {
      unitId,
      targetPos,
      path: path.slice(1), // Remove starting position
      currentStep: 0,
    }
    this.moveRoutes.set(unitId, route)

    // Clear conflicting attack routes
    this.attackRoutes.delete(unitId)

    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: `📡 TELSİZ`,
      message: `→ ${unitId}: İntikal rotası belirlendi! Hedef: (${x},${y}). ${path.length - 1} adım.`,
      sentTick: this.time.toTotalMinutes(),
      category: ReportCategory.MISSION_SUPPORT,
      corrupted: false,
      type: ReportType.REGULAR,
    })
    audioManager.playRogerThat()
    this.notify()
  }

  fireAtUnit(unitId: string): void {
    this.sendRadioCommand(unitId, 'ates')
  }

  private setUnitPositionWithCarried(unitId: string, pos: Position): void {
    const unit = this.units.get(unitId)
    if (!unit) return
    unit.setPosition(pos)
    const carriedId = (unit as Soldier).getCarryingUnitId()
    if (carriedId) {
      const carried = this.units.get(carriedId)
      if (carried) {
        carried.setPosition(pos)
      }
    }
  }

  setAttackRoute(unitId: string, enemyId: string): void {
    const unit = this.units.get(unitId)
    const enemy = this.enemies.get(enemyId)
    if (!unit || !enemy || !unit.isAlive() || !enemy.isAlive()) return

    // Reset fire permission to allow direct shooting on player's direct attack command
    (unit as Soldier).setFirePermission(FirePermission.UNDEFINED)

    // Clear stale pending engagement if it's for this unit
    if (this.pendingEngagement && this.pendingEngagement.unitId === unitId) {
      this.pendingEngagement = null
    }

    // Clear conflicting move routes
    this.moveRoutes.delete(unitId)

    const unitPos = unit.getPosition()
    const enemyPos = enemy.getPosition()

    // Check if already in attack range (distance <= 6 for sniper, 3 for others)
    const dx = enemyPos.x - unitPos.x
    const dy = enemyPos.y - unitPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const attackRange = (unit as Soldier).getRole() === SoldierRole.SNIPER ? 6.0 : 3.0
    if (dist <= attackRange) {
      // Already in range, fire directly
      unit.setEngagementTargetId(enemyId)
      this.sendRadioCommand(unitId, 'ates')
      return
    }

    // Construct occupied positions, excluding current unit and target enemy
    const occupiedPositions = new Set<string>()
    for (const u of this.units.values()) {
      if (u.isAlive() && u.getId() !== unitId) {
        occupiedPositions.add(`${u.getPosition().x},${u.getPosition().y}`)
      }
    }
    for (const e of this.enemies.values()) {
      if (e.isAlive() && e.getId() !== enemyId) {
        occupiedPositions.add(`${e.getPosition().x},${e.getPosition().y}`)
      }
    }

    // Compute A* path to the enemy position respecting occupied positions
    const path = this.map.findPath(unitPos, enemyPos, occupiedPositions)
    if (path.length <= 1) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: `📡 SİSTEM`,
        message: `${unitId}: Hedefe ulaşılamıyor. Engelli arazi mevcut!`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false,
        type: ReportType.REGULAR,
      })
      this.notify()
      return
    }

    // Store the route (skip the first element which is the current position)
    const route: AttackRoute = {
      unitId,
      targetEnemyId: enemyId,
      path: path.slice(1), // Remove starting position
      currentStep: 0,
    }
    this.attackRoutes.set(unitId, route)

    // Set engagement target on soldier
    unit.setEngagementTargetId(enemyId)

    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: `📡 TELSİZ`,
      message: `→ ${unitId}: Saldırı rotası belirlendi! Hedef: ${enemy.getName()} (${enemyPos.x},${enemyPos.y}). ${path.length - 1} adım.`,
      sentTick: this.time.toTotalMinutes(),
      category: ReportCategory.MISSION_SUPPORT,
      corrupted: false,
      type: ReportType.REGULAR,
    })
    audioManager.playRogerThat()
    this.notify()
  }

  cancelAttackRoute(unitId: string): void {
    this.attackRoutes.delete(unitId)
    this.notify()
  }

  getAttackRoutes(): Map<string, AttackRoute> {
    return this.attackRoutes
  }

  artilleryAt(x: number, y: number): boolean {
    if (this.restrictions?.artilleryDisabled) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🎯 TOPÇU',
        message: `HATA: Bulunduğunuz bölge topçu menzili dışındadır veya operasyonel kısıtlama mevcuttur.`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return false
    }

    if (this.artilleryCooldown > 0) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🎯 TOPÇU',
        message: `Topçu bataryası yeniden yükleniyor. Bekleme süresi: ${this.artilleryCooldown} dk.`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return false
    }

    this.artilleryCooldown = 15
    this.artilleryStrike(`topcu ${x} ${y}`, '🎯 TOPÇU', 0.9)
    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '💥 TOPÇU',
      message: `TOPÇU ATIŞI BAŞLADI: (${x}, ${y}) koordinatlarına yaylım ateşi açılıyor.`,
      sentTick: this.time.toTotalMinutes(),
      category: ReportCategory.MISSION_SUPPORT,
      corrupted: false,
      type: ReportType.REGULAR,
    })
    this.notify()
    return true
  }

  airStrikeAt(x: number, y: number): boolean {
    if (this.restrictions?.airstrikeDisabled) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '✈️ HAVA',
        message: `HATA: Hava harekatı bölgesi uçuşa kapalıdır veya operasyonel kısıtlama mevcuttur.`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return false
    }

    if (this.airstrikeCooldown > 0) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '✈️ HAVA',
        message: `Hava filosu kalkış için hazırlanıyor. Bekleme süresi: ${this.airstrikeCooldown} dk.`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return false
    }

    this.airstrikeCooldown = 40
    audioManager.playAirStrike()
    let hits = 0
    for (const [, enemy] of this.enemies) {
      if (!enemy.isAlive()) continue
      const ep = enemy.getPosition()
      const dx = ep.x - x; const dy = ep.y - y
      if (Math.sqrt(dx * dx + dy * dy) <= 3) {
        const dmg = 50 + Math.floor(Math.random() * 50)
        enemy.takeDamage(dmg)
        hits++
      }
    }
    const msg = hits > 0
      ? `F-16 SALDIRISI! Hedef Koordinat (${x},${y}) — ${hits} hedef imha bölgesi tarandı!`
      : `F-16 saldırı dalgası (${x},${y}) koordinatına ulaştı. Görünür hedef tespit edilemedi.`
    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '🚀 HAVA KUVVETLERİ',
      message: `HAVA TAARRUZU BAŞLATILDI: Hedef bölge (${x}, ${y}) ateş altına alındı.`,
      sentTick: this.time.toTotalMinutes(),
      category: ReportCategory.MISSION_SUPPORT,
      corrupted: false,
      type: ReportType.REGULAR,
    })
    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '✈️ HAVA',
      message: msg,
      sentTick: this.time.toTotalMinutes(),
      category: hits > 0 ? ReportCategory.SUCCESS : ReportCategory.MISSION_SUPPORT,
      corrupted: false,
      type: ReportType.REGULAR,
    })
    this.screenShake = true
    setTimeout(() => { this.screenShake = false; this.notify() }, 600)
    this.checkEndGame()
    this.notify()
    return true
  }

  callT129(unitId: string, x: number, y: number): boolean {
    if (this.t129Cooldown > 0) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🚁 KARARGAH',
        message: `T-129 ATAK filosu mühimmat ikmalinde. Bekleme süresi: ${this.t129Cooldown} dk.`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return false
    }

    if (this.weather.getWeatherName().includes('Fırtına')) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🚁 KARARGAH',
        message: `Bölgedeki fırtına nedeniyle T-129 ATAK uçuşlarına izin planlanması kapalıdır!`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return false
    }

    this.t129Cooldown = 18
    const delay = this.calculateDynamicDelay(unitId)
    this.radio.sendCommand(unitId, `t129 ${x} ${y}`, delay.total)
    this.notify()
    return true
  }

  callUH60(callerId: string, targetUnitId: string, destX: number, destY: number): boolean {
    if (this.uh60State !== 'idle') {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🚁 KARARGAH',
        message: `UH-60 halihazırda operasyonda! Aynı anda sadece bir tahliye uçuşuna izin veriliyor.`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return false
    }

    const caller = this.units.get(callerId)
    const targetUnit = this.units.get(targetUnitId) as Soldier

    if (!caller || !targetUnit) return false

    // Unlink carried/carrying relationships for targetUnit
    const targetCarriedId = targetUnit.getCarryingUnitId()
    if (targetCarriedId) {
      const carried = this.units.get(targetCarriedId) as Soldier
      if (carried) carried.setCarriedByUnitId('')
      targetUnit.setCarryingUnitId('')
    }
    const targetCarrierId = targetUnit.getCarriedByUnitId()
    if (targetCarrierId) {
      const carrier = this.units.get(targetCarrierId) as Soldier
      if (carrier) carrier.setCarryingUnitId('')
      targetUnit.setCarriedByUnitId('')
    }

    const delay = this.calculateDynamicDelay(callerId)
    this.uh60State = 'flying'
    this.uh60Timer = delay.total
    this.uh60Target = { 
      x: targetUnit.getPosition().x, 
      y: targetUnit.getPosition().y, 
      destX, 
      destY, 
      unitId: targetUnitId 
    }

    this.radio.queueReport(callerId, `KOÇYİĞİDİ ALMAYA GELİYORUZ: UH-60 havalandı. Dayanın aslanım, ${delay.total} dakikaya oradayız!`, this.time.toTotalMinutes(), 0.1, -1, ReportType.REGULAR, '', ReportCategory.MISSION_SUPPORT)
    this.notify()
    return true
  }

  // ── Scenario Event Hooks ────────
  private spawnEnemyWave(currentTick: number): void {
    const waveSize = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < waveSize; i++) {
        const idStr = Math.random().toString(36).substring(2, 6).toUpperCase()
        const eid = `DALGA-${idStr}`
        const e = new EnemyUnit(eid, 'Sızma Kuvveti', 60, 60, 60, EnemyType.INFANTRY)
        const sx = Math.random() < 0.5 ? 0 : this.map.width - 1
        const sy = Math.random() < 0.5 ? 0 : this.map.height - 1
        e.setPosition({ x: sx, y: sy })
        e.setState(EnemyState.ASSAULT_TARGET)
        e.setAssaultTarget(this.capturePoint.x, this.capturePoint.y)
        this.enemies.set(eid, e)
    }

    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '📡 İSTİHBARAT',
      message: `[${GameTime.formatTime(currentTick)}] Dikkat! Çevre hattına yeni düşman kuvvetleri yaklaştı. Dalga taarruzu başlıyor!`,
      sentTick: currentTick,
      category: ReportCategory.DANGER,
      corrupted: false, type: ReportType.REGULAR
    })
  }

  private spawnSurvivalWave(): void {
    const currentTick = this.time.toTotalMinutes()
    const waveNumber = this.survivalWaveCounter
    
    let countFactor = 1.0
    let hpFactor = 1.0
    if (this.sandboxSettings?.difficulty === 'EASY') {
      countFactor = 0.75
      hpFactor = 0.75
    } else if (this.sandboxSettings?.difficulty === 'HARD') {
      countFactor = 1.3
      hpFactor = 1.3
    }

    const baseEnemies = Math.max(1, Math.floor((2 + Math.floor(waveNumber / 2)) * countFactor))
    const armoredChance = waveNumber > 3 ? 0.3 : 0
    const sniperChance = waveNumber > 5 ? 0.2 : 0

    for (let i = 0; i < baseEnemies; i++) {
      const idStr = Math.random().toString(36).substring(2, 6).toUpperCase()
      const eid = `SURVIVAL-${waveNumber}-${idStr}`
      let enemyType = EnemyType.INFANTRY
      if (Math.random() < armoredChance) enemyType = EnemyType.ARMORED
      else if (Math.random() < sniperChance) enemyType = EnemyType.SNIPER

      const baseHp = 60
      const scaledHp = Math.round(baseHp * hpFactor)
      const e = makeEnemy(eid, `Düşman Birliği ${eid}`, scaledHp, 60, 60, 0, 0, enemyType, EnemyState.ASSAULT_TARGET, 10, 10)
      const spawnEdge = Math.floor(Math.random() * 4) // 0:top, 1:right, 2:bottom, 3:left
      let sx, sy
      if (spawnEdge === 0) { sx = Math.floor(Math.random() * this.map.width); sy = 0 }
      else if (spawnEdge === 1) { sx = this.map.width - 1; sy = Math.floor(Math.random() * this.map.height) }
      else if (spawnEdge === 2) { sx = Math.floor(Math.random() * this.map.width); sy = this.map.height - 1 }
      else { sx = 0; sy = Math.floor(Math.random() * this.map.height) }
      e.setPosition({ x: sx, y: sy })
      e.setAssaultTarget(Math.floor(this.map.width / 2), Math.floor(this.map.height / 2)) // Center of map
      this.enemies.set(eid, e)
    }

    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '📡 İSTİHBARAT',
      message: `[${GameTime.formatTime(currentTick)}] Yeni düşman dalgası yaklaşıyor! Dalga ${waveNumber} başlıyor!`,
      sentTick: currentTick,
      category: ReportCategory.DANGER,
      corrupted: false, type: ReportType.REGULAR
    })
  }

  // ── End Game Checking ────────
  private checkEndGame(): void {
    if (this.victoryAchieved || this.defeatAchieved) return

    // 1. Defeat Condition: All friendly units are dead
    if (this.units.size > 0 && [...this.units.values()].every(u => !u.isAlive())) {
      this.defeatAchieved = true
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '💀 SİSTEM',
        message: 'BÖLGEDE SİNYAL KESİLDİ! Tüm birimlerle temas koptu... Allah rahmet eylesin. Operasyon başarısız.',
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false,
        type: ReportType.REGULAR,
      })
      return
    }

    // 2. Victory Condition: All enemies are dead
    const allDead = [...this.enemies.values()].every(e => !e.isAlive())
    if (this.enemies.size > 0 && allDead) {
      this.victoryAchieved = true
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🏆 KARARGAH',
        message: 'GÖREV TAMAM! Mıntıka çakallardan temizlendi. "Elinize kolunuza sağlık aslanlar, bölge güvende."',
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.SUCCESS,
        corrupted: false,
        type: ReportType.REGULAR,
      })
      if (Math.random() < 0.05) {
        this.addRadioMessage({
          id: crypto.randomUUID(),
          fromUnitId: '📡 İSTİHBARAT',
          message: 'Komşu birlik telsiz mesajı: "Bölgede muhtelif patlama sesleri var."',
          sentTick: this.time.toTotalMinutes(),
          category: ReportCategory.REGULAR,
          corrupted: false,
          type: ReportType.REGULAR,
        })
      }
    }
  }

  private addRadioMessage(msg: RadioMessage): void {
    this.radioLog = [msg, ...this.radioLog].slice(0, 200) // Keep last 200 messages
  }

  // ── Serialization ─────────────────────────────────────────────
  serialize(): Record<string, unknown> {
    return {
      time: { day: this.time.day, hour: this.time.hour, minute: this.time.minute },
      units: [...this.units.entries()].map(([id, u]) => [id, (u as Soldier).serialize()]),
      enemies: [...this.enemies.entries()].map(([id, e]) => [id, (e as EnemyUnit).serialize()]),
      mapGrid: this.map.serialize(),
      resources: this.resources.serialize(),
      weather: this.weather.serialize(),
      activeScenarioIndex: this.activeScenarioIndex,
      victoryAchieved: this.victoryAchieved,
      defeatAchieved: this.defeatAchieved,
      hasCapturePoint: this.hasCapturePoint,
      capturePoint: this.capturePoint,
      defenseTimerMax: this.defenseTimerMax,
      defenseTimerCurrent: this.defenseTimerCurrent,
      capturePointFallen: this.capturePointFallen,
      artilleryCooldown: this.artilleryCooldown,
      airstrikeCooldown: this.airstrikeCooldown,
      supplyCooldown: this.supplyCooldown,
      t129Cooldown: this.t129Cooldown,
      uh60State: this.uh60State,
      uh60Timer: this.uh60Timer,
      uh60Target: this.uh60Target,
      radioLog: this.radioLog,
      pendingEngagement: this.pendingEngagement,
      radio: this.radio.serialize(),
      matchPhase: this.matchPhase,
      activePlayerId: this.activePlayerId,
      hostBudget: this.hostBudget,
      guestBudget: this.guestBudget,
      hostReady: this.hostReady,
      guestReady: this.guestReady,
      capturePointTurns: this.capturePointTurns,
      attackRoutes: [...this.attackRoutes.entries()].map(([id, r]) => [id, { ...r }]),
      moveRoutes: [...this.moveRoutes.entries()].map(([id, r]) => [id, { ...r }]),
      deployedRadios: this.deployedRadios,
      raasActivePointIndex: this.raasActivePointIndex,
      sandboxSettings: this.sandboxSettings ? { ...this.sandboxSettings } : undefined,
      structureHealth: [...this.structureHealth.entries()],
      activeConstructions: [...this.activeConstructions.entries()],
      airdrops: this.airdrops,
      discoveredTiles: Array.from(this.discoveredTiles),
    }
  }
    // ── Calculation ───────────────
  getSignalStrengthAt(pos: Position): number {
    let nearRadio = false
    for (const r of this.deployedRadios) {
      const dx = r.x - pos.x
      const dy = r.y - pos.y
      if (Math.sqrt(dx * dx + dy * dy) <= 4.0) {
        nearRadio = true
        break
      }
    }

    // Command Center proximity check (range 6)
    if (!nearRadio) {
      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          if (this.map.getTerrain(x, y) === TerrainType.FOB_COMMAND) {
            const dx = x - pos.x
            const dy = y - pos.y
            if (Math.sqrt(dx * dx + dy * dy) <= 6.0) {
              nearRadio = true
              break
            }
          }
        }
        if (nearRadio) break
      }
    }

    if (nearRadio) return 1.0

    return this.map.calcSignalFactor({ x: 0, y: 0 }, pos) * this.weather.getSignalModifier()
  }

  isNearRadioRelay(unitId: string): boolean {
    const unit = this.units.get(unitId)
    if (!unit) return false
    const pos = unit.getPosition()
    for (const r of this.deployedRadios) {
      const dx = r.x - pos.x
      const dy = r.y - pos.y
      if (Math.sqrt(dx * dx + dy * dy) <= 4.0) {
        return true
      }
    }

    // Command Center check (range 6)
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        if (this.map.getTerrain(x, y) === TerrainType.FOB_COMMAND) {
          const dx = x - pos.x
          const dy = y - pos.y
          if (Math.sqrt(dx * dx + dy * dy) <= 6.0) {
            return true
          }
        }
      }
    }
    return false
  }

  private calculateDynamicDelay(unitId: string): DelayBreakdown {
    const breakdown = { base: 1, distance: 0, weather: 0, stress: 0, queue: 0, total: 1 }
    breakdown.queue = this.radio.getPendingCount() * 2

    const unit = this.units.get(unitId)
    if (unit) {
      const pos = unit.getPosition()
      
      let nearRadio = false
      for (const r of this.deployedRadios) {
        const dx = r.x - pos.x
        const dy = r.y - pos.y
        if (Math.sqrt(dx * dx + dy * dy) <= 4.0) {
          nearRadio = true
          break
        }
      }

      // Command Center check (range 6)
      let nearCommand = false
      if (!nearRadio) {
        for (let y = 0; y < this.map.height; y++) {
          for (let x = 0; x < this.map.width; x++) {
            if (this.map.getTerrain(x, y) === TerrainType.FOB_COMMAND) {
              const dx = x - pos.x
              const dy = y - pos.y
              if (Math.sqrt(dx * dx + dy * dy) <= 6.0) {
                nearCommand = true
                break
              }
            }
          }
          if (nearCommand) break
        }
      }

      if (nearCommand) {
        // Command Center eliminates delay completely
        breakdown.base = 0
        breakdown.distance = 0
        breakdown.weather = 0
        breakdown.stress = 0
        breakdown.queue = 0
        breakdown.total = 0
        return breakdown
      }

      if (nearRadio) {
        breakdown.distance = 0
        breakdown.weather = 0
        breakdown.stress = 0
      } else {
        const dist = pos.x + pos.y
        breakdown.distance += Math.floor(dist * 0.5)

        let mountainInBetween = false
        for (let x = 0; x <= pos.x; x++) {
          for (let y = 0; y <= pos.y; y++) {
            if (this.map.getTerrain(x, y) === TerrainType.MOUNTAIN) { mountainInBetween = true; break; }
          }
          if (mountainInBetween) break;
        }
        if (mountainInBetween) breakdown.distance += 3

        if (unit.isUnderFire()) breakdown.stress += 4
      }
    }

    const weatherName = this.weather.getWeatherName()
    let isNearRadio = false
    if (unit) {
      const pos = unit.getPosition()
      for (const r of this.deployedRadios) {
        const dx = r.x - pos.x
        const dy = r.y - pos.y
        if (Math.sqrt(dx * dx + dy * dy) <= 4.0) {
          isNearRadio = true
          break
        }
      }

      if (!isNearRadio) {
        // Also check command center proximity for weather delay exemption
        for (let y = 0; y < this.map.height; y++) {
          for (let x = 0; x < this.map.width; x++) {
            if (this.map.getTerrain(x, y) === TerrainType.FOB_COMMAND) {
              const dx = x - pos.x
              const dy = y - pos.y
              if (Math.sqrt(dx * dx + dy * dy) <= 6.0) {
                isNearRadio = true
                break
              }
            }
          }
          if (isNearRadio) break
        }
      }
    }

    if (!isNearRadio) {
      if (weatherName.includes('Yağmur') || weatherName.includes('Sis')) breakdown.weather += 2
      else if (weatherName.includes('Fırtına')) breakdown.weather += 5
    }

    breakdown.total = breakdown.base + breakdown.distance + breakdown.weather + breakdown.stress + breakdown.queue
    return breakdown
  }

  loadFromSave(data: ReturnType<GameEngine['serialize']>): void {
    const t = data.time as { day: number; hour: number; minute: number }
    this.time = new GameTime(t.day, t.hour, t.minute)

    this.units = new Map(
      (data.units as [string, Record<string, unknown>][]).map(([id, u]) => [id, Soldier.deserialize(u as Parameters<typeof Soldier.deserialize>[0])])
    )
    this.enemies = new Map(
      (data.enemies as [string, Record<string, unknown>][]).map(([id, e]) => [id, EnemyUnit.deserialize(e)])
    )
    this.map = MapGrid.deserialize(data.mapGrid as Parameters<typeof MapGrid.deserialize>[0])
    this.resources = ResourceManager.deserialize(data.resources as Record<string, unknown>)
    this.weather = WeatherSystem.deserialize(data.weather as Record<string, unknown>)
    this.activeScenarioIndex = data.activeScenarioIndex as number
    this.victoryAchieved = data.victoryAchieved as boolean
    this.defeatAchieved = data.defeatAchieved as boolean || false
    this.hasCapturePoint = data.hasCapturePoint as boolean
    this.capturePoint = data.capturePoint as Position
    this.defenseTimerMax = data.defenseTimerMax as number
    this.defenseTimerCurrent = data.defenseTimerCurrent as number
    this.capturePointFallen = data.capturePointFallen as boolean
    
    this.artilleryCooldown = (data.artilleryCooldown as number) || 0
    this.airstrikeCooldown = (data.airstrikeCooldown as number) || 0
    this.supplyCooldown = (data.supplyCooldown as number) || 0
    this.t129Cooldown = (data.t129Cooldown as number) || 0
    this.uh60State = (data.uh60State as 'idle' | 'flying' | 'loading') || 'idle'
    this.uh60Timer = (data.uh60Timer as number) || 0
    this.uh60Target = data.uh60Target as { x: number; y: number; destX: number; destY: number; unitId: string } | null

    this.radioLog = (data.radioLog as RadioMessage[]) || []
    this.pendingEngagement = data.pendingEngagement as PendingEngagement | null
    if (data.radio) {
      this.radio = RadioSystem.deserialize(
        data.radio as Record<string, unknown>,
        (id) => this.calculateDynamicDelay(id),
        (id) => this.isNearRadioRelay(id)
      )
    } else {
      this.radio = new RadioSystem(
        (id) => this.calculateDynamicDelay(id),
        (id) => this.isNearRadioRelay(id)
      )
    }
    this.radio.setSignalStrength(this.weather.getSignalModifier())
    // 1v1 state
    this.matchPhase = (data.matchPhase as MatchPhase) || MatchPhase.PLAYING
    this.activePlayerId = (data.activePlayerId as string) || 'host'
    this.hostBudget = (data.hostBudget as number) ?? 1000
    this.guestBudget = (data.guestBudget as number) ?? 1000
    this.hostReady = (data.hostReady as boolean) || false
    this.guestReady = (data.guestReady as boolean) || false
    this.capturePointTurns = (data.capturePointTurns as { host: number; guest: number }) || { host: 0, guest: 0 }
    
    // Deserialize routes
    this.attackRoutes = data.attackRoutes ? new Map(
      (data.attackRoutes as [string, AttackRoute][]).map(([id, r]) => [id, r])
    ) : new Map()
    
    this.moveRoutes = data.moveRoutes ? new Map(
      (data.moveRoutes as [string, MoveRoute][]).map(([id, r]) => [id, r])
    ) : new Map()

    this.deployedRadios = (data.deployedRadios as Position[]) || []
    this.raasActivePointIndex = (data.raasActivePointIndex as number) || 0
    this.sandboxSettings = (data.sandboxSettings as SandboxSettings) || null
    this.structureHealth = data.structureHealth ? new Map(data.structureHealth as [string, number][]) : new Map()
    this.activeConstructions = data.activeConstructions ? new Map(data.activeConstructions as [string, any][]) : new Map()
    this.airdrops = (data.airdrops as { x: number; y: number; amount: number }[]) || []
    this.discoveredTiles = new Set((data.discoveredTiles as string[]) || [])
    this.updateVision()

    // Check if remote data triggers a transition (in case we were waiting)
    this.checkMatchPhaseTransitions()
    
    this.notify()
  }
}
