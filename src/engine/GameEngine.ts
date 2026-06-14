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
  ScenarioPhase, ObjectiveType, SandboxSettings, WeatherType, MatchPhase, roleToString
} from './types'

export interface AttackRoute {
  unitId: string
  targetEnemyId: string
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
  uh60Target: { x: number; y: number; unitId: string } | null
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
  private uh60Target: { x: number; y: number; unitId: string } | null = null
  private restrictions: GameState['restrictions'] = {}
  private phases: ScenarioPhase[] = []
  private activePhaseIndex: number = 0
  private sandboxSettings: SandboxSettings | null = null
  private survivalWaveCounter: number = 0
  private combatActiveTimer: number = 0
  private discoveredTiles: Set<string> = new Set()
  private attackRoutes: Map<string, AttackRoute> = new Map()

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
    this.radio = new RadioSystem((id) => this.calculateDynamicDelay(id))
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
      currentObjective: this.phases[this.activePhaseIndex]?.objective || (this.sandboxSettings ? (this.sandboxSettings.mode === 'SURVIVAL' ? 'Sonsuz Direniş: Hayatta Kal' : 'Bölge Temizliği: Tüm Düşmanları Yok Et') : undefined),
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
    }
  }

  // ── Scenario loading ──────────────────────────────────────────
  loadScenario(index: number): boolean {
    const setup = loadScenario(index)
    if (!setup) return false

    this.units = setup.units
    this.enemies = setup.enemies
    this.resources = setup.resources
    this.time = new GameTime(setup.startDay, setup.startHour, setup.startMinute)
    this.map = new MapGrid()
    this.weather = new WeatherSystem()
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
    this.radio = new RadioSystem((id) => this.calculateDynamicDelay(id))
    this.screenShake = false
    this.restrictions = setup.restrictions
    this.phases = setup.phases || []
    this.activePhaseIndex = 0
    this.sandboxSettings = null
    this.survivalWaveCounter = 0

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

  loadSandbox(userUnits: Map<string, Soldier>, settings: SandboxSettings): void {
    this.activeScenarioIndex = -1
    this.units = userUnits
    this.enemies = new Map()
    this.sandboxSettings = settings
    this.map = new MapGrid(settings.mapSize, settings.mapSize)
    this.weather = new WeatherSystem()
    if (settings.weatherFixed) {
      this.weather.setWeather(settings.weatherFixed)
    }
    this.time = new GameTime()
    this.radio = new RadioSystem((id) => this.calculateDynamicDelay(id))
    this.resources = new ResourceManager(100, 1000, 20)
    this.victoryAchieved = false
    this.defeatAchieved = false
    this.survivalWaveCounter = 0

    if (settings.mode === 'SURVIVAL') {
      this.hasCapturePoint = true
      this.capturePoint = { x: Math.floor(settings.mapSize / 2), y: Math.floor(settings.mapSize / 2) }
      this.defenseTimerMax = 999 
      this.defenseTimerCurrent = 0
    } else {
      this.hasCapturePoint = false
      this.spawnInitialEnemies(settings.mapSize)
    }

    this.addRadioMessage({
      id: crypto.randomUUID(),
      fromUnitId: '🏆 KARARGAH',
      message: `[OPERASYON BAŞLADI] Mod: ${settings.mode === 'SURVIVAL' ? 'Sonsuz Direniş' : 'Bölge Temizliği'}. Başarılar dileriz.`,
      sentTick: 0,
      category: ReportCategory.SUCCESS,
      corrupted: false,
      type: ReportType.REGULAR,
    })

    this.notify()
  }

  // ── 1v1 Draft Mode Logic ────────────────────────────────────
  initMatch1v1(): void {
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
    } else {
      this.capturePointTurns.host = 0
      this.capturePointTurns.guest = 0
    }
  }

  private spawnInitialEnemies(size: number): void {
    const num = Math.floor(size * 0.8)
    for (let i = 0; i < num; i++) {
        const idStr = Math.random().toString(36).substring(2, 6).toUpperCase()
        const id = `E-${idStr}`
        const rx = Math.floor(Math.random() * size)
        const ry = Math.floor(Math.random() * size)
        this.enemies.set(id, makeEnemy(id, `Düşman Devriyesi ${i+1}`, 100, 80, 200, rx, ry))
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
          const sig = this.map.calcSignalFactor({ x: 0, y: 0 }, { x: this.uh60Target.x, y: this.uh60Target.y }) * this.weather.getSignalModifier()
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
          for (const [, u] of this.units) {
            if (u.isAlive()) u.adjustMorale(15)
          }
          if (this.uh60Target) {
            this.units.delete(this.uh60Target.unitId) // Başarıyla tahliye edildi
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

        // Already in attack range? Fire and clear route
        if (dist <= 3.0) {
          const res = CombatSystem.resolveAttack(unit as Soldier, enemy, this.map)
          this.combatActiveTimer = 10
          const sig = this.map.calcSignalFactor({ x: 0, y: 0 }, unitPos) * this.weather.getSignalModifier()
          this.radio.queueReport(unitId, `Hedefe ulaşıldı! ${res.reportMessage}`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig), -1, ReportType.REGULAR, '', res.category)
          this.attackRoutes.delete(unitId)
          continue
        }

        // Move one step along the route
        if (route.currentStep < route.path.length) {
          const nextPos = route.path[route.currentStep]
          unit.setPosition({ x: Math.max(0, Math.min(this.map.width - 1, nextPos.x)), y: Math.max(0, Math.min(this.map.height - 1, nextPos.y)) })
          route.currentStep++
        } else {
          // Route exhausted but still not in range — clear it
          this.attackRoutes.delete(unitId)
        }
      }

      // Update enemies & try enemy attacks
      for (const [, enemy] of this.enemies) {
        enemy.update(1, this.map, this.map.width, this.map.height)
        if (!enemy.isAlive()) continue

        for (const [playerId, playerUnit] of this.units) {
          if (!playerUnit.isAlive()) continue
          const dx = enemy.getPosition().x - playerUnit.getPosition().x
          const dy = enemy.getPosition().y - playerUnit.getPosition().y
          const dist = Math.sqrt(dx * dx + dy * dy)

          let attackRange = 2.5
          if (enemy.getType() === EnemyType.SNIPER) attackRange = 5.5
          else if (enemy.getType() === EnemyType.MG) attackRange = 3.5
          else if (enemy.getType() === EnemyType.ARMORED) attackRange = 1.5

          if (dist <= attackRange && Math.random() <= 0.15) {
            const soldier = playerUnit as Soldier
            const res = MultiplayerLogic.processEnemyImpact(enemy, soldier, this.map)
            if (res.reportMessage) {
              this.combatActiveTimer = 10
              const sig = this.map.calcSignalFactor({ x: 0, y: 0 }, playerUnit.getPosition()) * this.weather.getSignalModifier()
              this.radio.queueReport(playerId, res.reportMessage, currentSimTime, Math.max(0.1, 1 - sig), -1, ReportType.REGULAR, '', res.category)
              if (res.enemyTauntMessage) {
                this.radio.queueReport('⚠️ BİLİNMEYEN', res.enemyTauntMessage, currentSimTime + 1, 0.6, -1, ReportType.REGULAR, '', ReportCategory.DANGER)
              }
            }
            break
          }
        }
      }

      // Detect enemies → request fire permission
      for (const [playerId, playerUnit] of this.units) {
        if (!playerUnit.isAlive()) continue
        const soldier = playerUnit as Soldier
        if (soldier.getFirePermission() !== FirePermission.UNDEFINED) continue

        for (const [eid, enemy] of this.enemies) {
          if (!enemy.isAlive()) continue
          const dx = enemy.getPosition().x - soldier.getPosition().x
          const dy = enemy.getPosition().y - soldier.getPosition().y
          const dist = Math.sqrt(dx * dx + dy * dy)

          let detectionRange = 2.5
          if (soldier.getRole() === SoldierRole.SNIPER) detectionRange = 5.5
          else if (soldier.getRole() === SoldierRole.MG) detectionRange = 3.5
          else if (soldier.getRole() === SoldierRole.MEDIC || soldier.getRole() === SoldierRole.ENGINEER) detectionRange = 2.0
          else if (soldier.getRole() === SoldierRole.ARMORED) detectionRange = 1.8

          if (dist <= detectionRange) {
            const sig = this.map.calcSignalFactor({ x: 0, y: 0 }, soldier.getPosition()) * this.weather.getSignalModifier()
            
            // Communication Loss ROE Handling
            if (sig < 0.2) {
              const prevPerm = soldier.getFirePermission();
              if (prevPerm !== FirePermission.PERMITTED) {
                this.addRadioMessage({
                  id: crypto.randomUUID(),
                  fromUnitId: '📡 SİSTEM',
                  message: `[BAĞLANTI KAYBI] ${soldier.getName()} telsiz sinyali %20 altına düştü. Birim otomatik olarak Serbest Atış ROE protokolüne geçti!`,
                  sentTick: currentSimTime,
                  category: ReportCategory.DANGER,
                  corrupted: false,
                  type: ReportType.REGULAR,
                });
              }
              soldier.setFirePermission(FirePermission.PERMITTED)
              soldier.setEngagementTargetId(eid)
              this.radio.queueReport(
                playerId,
                `Karargah... Sinyal koptu! İnisiyatif kullanıyoruz, çakalları mermiye boğmaya başladık! (${enemy.getName()})`,
                currentSimTime, 0, currentSimTime,
                ReportType.REGULAR, eid,
              )
              break
            }

            soldier.setFirePermission(FirePermission.WAITING_FOR_PERMISSION)
            soldier.setEngagementTargetId(eid)
            this.radio.queueReport(
              playerId,
              `Karargah, menzilimizde bir it sürüsü (${enemy.getName()}) tespit edildi! İndirmek için emir bekliyoruz, tamam!`,
              currentSimTime, Math.max(0.1, 1 - sig), currentSimTime,
              ReportType.ENGAGEMENT_REQUEST, eid,
            )
            break
          }
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
        const typeName = type === SupplyType.AMMO ? 'Mühimmat' : type === SupplyType.RATIONS ? 'Erzak' : 'Medkit'
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

      // Capture point check
      if (this.hasCapturePoint && !this.victoryAchieved) {
        this.defenseTimerCurrent += 1
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
    const sig = this.map.calcSignalFactor({ x: 0, y: 0 }, pos) * this.weather.getSignalModifier()

    if (cmd === 'ates') {
      let target: EnemyUnit | null = null
      let minDist = 999
      for (const [, enemy] of this.enemies) {
        if (!enemy.isAlive()) continue
        const dx = enemy.getPosition().x - pos.x
        const dy = enemy.getPosition().y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist && dist <= 3.0) { minDist = dist; target = enemy }
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
    } else if (cmd.startsWith('git ')) {
      const parts = cmd.split(' ')
      const tx = parseInt(parts[1])
      const ty = parseInt(parts[2])
      if (!isNaN(tx) && !isNaN(ty)) {
        unit.setPosition({ x: Math.max(0, Math.min(14, tx)), y: Math.max(0, Math.min(14, ty)) })
        this.radio.queueReport(unitId, `Hedef bölgeye kapak attık. Koordinatımız: ${tx}, ${ty}`, this.time.toTotalMinutes(), Math.max(0.1, 1 - sig))
        // After move, reset fire permission to detect new threats
        setTimeout(() => {
          const s = unit as Soldier
          if (s.getFirePermission() !== FirePermission.WAITING_FOR_PERMISSION) {
            s.setFirePermission(FirePermission.UNDEFINED)
          }
        }, 50)
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
    const typeName = type === SupplyType.AMMO ? 'Mühimmat' : type === SupplyType.RATIONS ? 'Erzak' : 'Medkit'
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
    if (!unit) return
    this.sendRadioCommand(unitId, `git ${x} ${y}`)
  }

  fireAtUnit(unitId: string): void {
    this.sendRadioCommand(unitId, 'ates')
  }

  setAttackRoute(unitId: string, enemyId: string): void {
    const unit = this.units.get(unitId)
    const enemy = this.enemies.get(enemyId)
    if (!unit || !enemy || !unit.isAlive() || !enemy.isAlive()) return

    const unitPos = unit.getPosition()
    const enemyPos = enemy.getPosition()

    // Check if already in attack range (distance <= 3)
    const dx = enemyPos.x - unitPos.x
    const dy = enemyPos.y - unitPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= 3.0) {
      // Already in range, fire directly
      unit.setEngagementTargetId(enemyId)
      this.sendRadioCommand(unitId, 'ates')
      return
    }

    // Compute A* path to the enemy position
    const path = this.map.findPath(unitPos, enemyPos)
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

  artilleryAt(x: number, y: number): void {
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
      return
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
      return
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
  }

  airStrikeAt(x: number, y: number): void {
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
      return
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
      return
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
  }

  callT129(unitId: string, x: number, y: number): void {
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
      return
    }

    if (this.weather.getWeatherName().includes('Fırtına')) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🚁 KARARGAH',
        message: `Bölgedeki fırtına nedeniyle T-129 ATAK uçuşlarına izin planlaması kapalıdır!`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return
    }

    this.t129Cooldown = 18 // 18 minutes cooldown
    const delay = this.calculateDynamicDelay(unitId)
    this.radio.sendCommand(unitId, `t129 ${x} ${y}`, delay.total)
    this.notify()
  }

  callUH60(callerId: string, targetUnitId: string): void {
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
      return
    }

    const caller = this.units.get(callerId)
    const targetUnit = this.units.get(targetUnitId) as Soldier

    if (!caller || !targetUnit) return
    if (targetUnit.isAlive() && !targetUnit.isIncapacitated()) return // Must be dead OR incapacitated

    const dx = caller.getPosition().x - targetUnit.getPosition().x
    const dy = caller.getPosition().y - targetUnit.getPosition().y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      this.addRadioMessage({
        id: crypto.randomUUID(),
        fromUnitId: '🚁 KARARGAH',
        message: `MEDEVAC REDDEDİLDİ. Kurtarılacak birim en fazla 2 blok yakınınızda olmalıdır.`,
        sentTick: this.time.toTotalMinutes(),
        category: ReportCategory.DANGER,
        corrupted: false, type: ReportType.REGULAR,
      })
      this.notify()
      return
    }

    const delay = this.calculateDynamicDelay(callerId)
    this.uh60State = 'flying'
    this.uh60Timer = delay.total
    this.uh60Target = { x: targetUnit.getPosition().x, y: targetUnit.getPosition().y, unitId: targetUnitId }

    this.radio.queueReport(callerId, `KOÇYİĞİDİ ALMAYA GELİYORUZ: UH-60 havalandı. Dayanın aslanım, ${delay.total} dakikaya oradayız!`, this.time.toTotalMinutes(), 0.1, -1, ReportType.REGULAR, '', ReportCategory.MISSION_SUPPORT)
    this.notify()
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
    const baseEnemies = 2 + Math.floor(waveNumber / 2)
    const armoredChance = waveNumber > 3 ? 0.3 : 0
    const sniperChance = waveNumber > 5 ? 0.2 : 0

    for (let i = 0; i < baseEnemies; i++) {
      const idStr = Math.random().toString(36).substring(2, 6).toUpperCase()
      const eid = `SURVIVAL-${waveNumber}-${idStr}`
      let enemyType = EnemyType.INFANTRY
      if (Math.random() < armoredChance) enemyType = EnemyType.ARMORED
      else if (Math.random() < sniperChance) enemyType = EnemyType.SNIPER

      const e = makeEnemy(eid, `Düşman Birliği ${eid}`, 60, 60, 60, 0, 0, enemyType, EnemyState.ASSAULT_TARGET, 10, 10)
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
    }
  }
    // ── Calculation ───────────────
  private calculateDynamicDelay(unitId: string): DelayBreakdown {
    const breakdown = { base: 1, distance: 0, weather: 0, stress: 0, queue: 0, total: 1 }
    breakdown.queue = this.radio.getPendingCount() * 2

    const unit = this.units.get(unitId)
    if (unit) {
      const pos = unit.getPosition()
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

    const weatherName = this.weather.getWeatherName()
    if (weatherName.includes('Yağmur') || weatherName.includes('Sis')) breakdown.weather += 2
    else if (weatherName.includes('Fırtına')) breakdown.weather += 5

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
    this.uh60Target = data.uh60Target as { x: number; y: number; unitId: string } | null

    this.radioLog = []
    this.pendingEngagement = null
    if (data.radio) {
      this.radio = RadioSystem.deserialize(data.radio as Record<string, unknown>, (id) => this.calculateDynamicDelay(id))
    } else {
      this.radio = new RadioSystem((id) => this.calculateDynamicDelay(id))
    }
    // 1v1 state
    this.matchPhase = (data.matchPhase as MatchPhase) || MatchPhase.PLAYING
    this.activePlayerId = (data.activePlayerId as string) || 'host'
    this.hostBudget = (data.hostBudget as number) ?? 1000
    this.guestBudget = (data.guestBudget as number) ?? 1000
    this.hostReady = (data.hostReady as boolean) || false
    this.guestReady = (data.guestReady as boolean) || false
    this.capturePointTurns = (data.capturePointTurns as { host: number; guest: number }) || { host: 0, guest: 0 }
    
    // Check if remote data triggers a transition (in case we were waiting)
    this.checkMatchPhaseTransitions()
    
    this.notify()
  }
}
