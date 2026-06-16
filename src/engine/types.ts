// ============================================================
// types.ts — Tüm enum'lar ve temel interface'ler
// ============================================================

export enum SoldierRole {
  RIFLEMAN = 'RIFLEMAN',
  MEDIC = 'MEDIC',
  ENGINEER = 'ENGINEER',
  ARMORED = 'ARMORED',
  SNIPER = 'SNIPER',
  MG = 'MG',
}

export enum EnemyType {
  INFANTRY = 'INFANTRY',
  ARMORED = 'ARMORED',
  SNIPER = 'SNIPER',
  MG = 'MG',
}

export enum EnemyState {
  PATROL = 'PATROL',
  ATTACKING = 'ATTACKING',
  HOLDING = 'HOLDING',
  ASSAULT_TARGET = 'ASSAULT_TARGET',
}

export enum FirePermission {
  UNDEFINED = 'UNDEFINED',
  WAITING_FOR_PERMISSION = 'WAITING_FOR_PERMISSION',
  PERMITTED = 'PERMITTED',
  DENIED = 'DENIED',
  HOLD_FIRE = 'HOLD_FIRE',
}

export enum WeatherType {
  CLEAR = 'CLEAR',
  CLOUDY = 'CLOUDY',
  FOGGY = 'FOGGY',
  RAINY = 'RAINY',
  STORM = 'STORM',
}

export enum TerrainType {
  OPEN = 'OPEN',
  CITY = 'CITY',
  FOREST = 'FOREST',
  MOUNTAIN = 'MOUNTAIN',
  BRIDGE = 'BRIDGE',
  FOB_COMMAND = 'FOB_COMMAND',
  FOB_HOSPITAL = 'FOB_HOSPITAL',
  FOB_SUPPLY = 'FOB_SUPPLY',
  FOB_SANDBAGS = 'FOB_SANDBAGS',
}

export enum ReportCategory {
  REGULAR = 'REGULAR',
  DANGER = 'DANGER',
  SUCCESS = 'SUCCESS',
  MISSION_SUPPORT = 'MISSION_SUPPORT',
}

export enum ReportType {
  REGULAR = 'REGULAR',
  ENGAGEMENT_REQUEST = 'ENGAGEMENT_REQUEST',
}

export enum SupplyType {
  RATIONS = 'RATIONS',
  AMMO = 'AMMO',
  MEDKITS = 'MEDKITS',
  CONSTRUCTION_MATERIAL = 'CONSTRUCTION_MATERIAL',
}

export enum ObjectiveType {
  DESTROY_TARGET = 'DESTROY_TARGET',
  REACH_POSITION = 'REACH_POSITION',
  SURVIVE_TIME = 'SURVIVE_TIME',
  ELIMINATE_ALL = 'ELIMINATE_ALL',
  SURVIVAL_ENDLESS = 'SURVIVAL_ENDLESS',
  SEARCH_AND_DESTROY = 'SEARCH_AND_DESTROY',
}

export enum SandboxMapSize {
  SMALL = 10,
  MEDIUM = 15,
  LARGE = 20,
}

export enum MatchPhase {
  DRAFTING = 'DRAFTING',
  PLACEMENT = 'PLACEMENT',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED',
}

export interface SandboxSettings {
  mapSize: SandboxMapSize
  weatherFixed?: WeatherType
  isDynamicWeather: boolean
  mode: 'SURVIVAL' | 'SEARCH_AND_DESTROY' | 'RAAS'
  difficulty?: 'EASY' | 'STANDARD' | 'HARD'
}

export interface DraftingUnit {
  id: string
  name: string
  role: SoldierRole
  cost: number
}

export interface ScenarioPhase {
  id: number
  name: string
  description: string
  objective: string
  type: ObjectiveType
  targetId?: string
  targetPos?: Position
  timerMinutes?: number
}

export interface Position {
  x: number
  y: number
}

export interface DelayBreakdown {
  base: number
  distance: number
  weather: number
  stress: number
  queue: number
  total: number
}

export interface RadioMessage {
  id: string
  fromUnitId: string
  message: string
  sentTick: number
  category: ReportCategory
  corrupted: boolean
  type: ReportType
  engagementTargetId?: string
  delayBreakdown?: DelayBreakdown
}

export interface PendingEngagement {
  unitId: string
  unitName: string
  enemyId: string
  enemyName: string
}

export interface GameTimeData {
  day: number
  hour: number
  minute: number
}

export interface ResourcesData {
  rations: number
  ammo: number
  medkits: number
  pendingSupplies: SupplyRequest[]
}

export interface SupplyRequest {
  unitId: string
  type: SupplyType
  amount: number
  deliveryTick: number
}

export function roleToString(role: SoldierRole): string {
  const map: Record<SoldierRole, string> = {
    [SoldierRole.RIFLEMAN]: 'Piyade',
    [SoldierRole.MEDIC]: 'Sıhhiyeci',
    [SoldierRole.ENGINEER]: 'Mühendis',
    [SoldierRole.ARMORED]: 'Zırhlı',
    [SoldierRole.SNIPER]: 'Keskin Nişancı',
    [SoldierRole.MG]: 'Makineli Tüfekçi',
  }
  return map[role]
}

export function enemyTypeToString(type: EnemyType): string {
  const map: Record<EnemyType, string> = {
    [EnemyType.INFANTRY]: 'Piyade',
    [EnemyType.ARMORED]: 'Zırhlı/Tank',
    [EnemyType.SNIPER]: 'Keskin Nişancı',
    [EnemyType.MG]: 'Makineli Tüfekçi',
  }
  return map[type]
}

export function enemyStateToString(state: EnemyState): string {
  const map: Record<EnemyState, string> = {
    [EnemyState.PATROL]: 'Devriye',
    [EnemyState.ATTACKING]: 'Saldırıda',
    [EnemyState.HOLDING]: 'Mevzi Koruma',
    [EnemyState.ASSAULT_TARGET]: 'Hedefe Taarruz',
  }
  return map[state]
}

export function firePermissionToString(fp: FirePermission): string {
  const map: Record<FirePermission, string> = {
    [FirePermission.UNDEFINED]: 'Belirsiz',
    [FirePermission.WAITING_FOR_PERMISSION]: 'İzin Bekleniyor',
    [FirePermission.PERMITTED]: 'Ateş Serbest',
    [FirePermission.DENIED]: 'Ateş Yasak',
    [FirePermission.HOLD_FIRE]: 'Ateş Kes',
  }
  return map[fp]
}

export function weatherTypeToString(wt: WeatherType): string {
  const map: Record<WeatherType, string> = {
    [WeatherType.CLEAR]: 'Açık',
    [WeatherType.CLOUDY]: 'Bulutlu',
    [WeatherType.FOGGY]: 'Sisli',
    [WeatherType.RAINY]: 'Yağmurlu',
    [WeatherType.STORM]: 'Fırtınalı',
  }
  return map[wt]
}

export function supplyTypeToString(st: SupplyType): string {
  const map: Record<SupplyType, string> = {
    [SupplyType.RATIONS]: 'Erzak',
    [SupplyType.AMMO]: 'Mühimmat',
    [SupplyType.MEDKITS]: 'Medkit',
    [SupplyType.CONSTRUCTION_MATERIAL]: 'İnşaat Malzemesi',
  }
  return map[st]
}

export function objectiveTypeToString(ot: ObjectiveType): string {
  const map: Record<ObjectiveType, string> = {
    [ObjectiveType.DESTROY_TARGET]: 'Hedefi İmha Et',
    [ObjectiveType.REACH_POSITION]: 'Bölgeye Ulaş',
    [ObjectiveType.SURVIVE_TIME]: 'Hayatta Kal',
    [ObjectiveType.ELIMINATE_ALL]: 'Bölgeyi Temizle',
    [ObjectiveType.SURVIVAL_ENDLESS]: 'Sonsuz Direniş',
    [ObjectiveType.SEARCH_AND_DESTROY]: 'Ara ve Yok Et',
  }
  return map[ot]
}

export function roleToIcon(role: SoldierRole): string {
  const map: Record<SoldierRole, string> = {
    [SoldierRole.RIFLEMAN]: '🪖',
    [SoldierRole.MEDIC]: '⚕️',
    [SoldierRole.ENGINEER]: '🔧',
    [SoldierRole.ARMORED]: '🛡️',
    [SoldierRole.SNIPER]: '🎯',
    [SoldierRole.MG]: '💥',
  }
  return map[role]
}

export function enemyTypeToIcon(type: EnemyType): string {
  const map: Record<EnemyType, string> = {
    [EnemyType.INFANTRY]: '👤',
    [EnemyType.ARMORED]: '🚜',
    [EnemyType.SNIPER]: '🔭',
    [EnemyType.MG]: '🔫',
  }
  return map[type]
}
