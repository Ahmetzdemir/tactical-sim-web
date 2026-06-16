// ============================================================
// Scenario.ts — Port of Scenario.cpp, all 6 operations
// ============================================================

import { Soldier } from './Soldier'
import { EnemyUnit } from './EnemyUnit'
import { SoldierRole, EnemyType, EnemyState, ScenarioPhase, WeatherType, TerrainType } from './types'
import { ResourceManager } from './ResourceManager'
import { MapGrid } from './MapGrid'

export interface OperationInfo {
  id: string
  name: string
  desc: string
  objective: string
  taskForce?: string[]
}

export interface ScenarioSetup {
  operation: OperationInfo
  startHour: number
  startMinute: number
  startDay: number
  resources: ResourceManager
  units: Map<string, Soldier>
  enemies: Map<string, EnemyUnit>
  hasCapturePoint: boolean
  capturePoint: { x: number; y: number }
  defenseTimerMax: number
  initialRadioMessage?: { unitId: string; message: string }
  restrictions?: {
    artilleryDisabled?: boolean
    airstrikeDisabled?: boolean
    t129Disabled?: boolean
  }
  phases?: ScenarioPhase[]
  weather?: WeatherType
  customTerrainSetter?: (map: MapGrid) => void
}

export const OPERATIONS: OperationInfo[] = [
  {
    id: '1',
    name: 'Fırat Kalkanı Harekatı',
    desc: 'Sınır güvenliğini sağlamak için Cerablus hattı tutulmalı. Düzenli ordu taarruzu, yoğun zırhlı kullanımı.',
    objective: 'Bölgedeki tüm düşman unsurlarını ve araçlarını imha et.',
    taskForce: ['2x Zırhlı Tim (ARMORED)', '1x İstihkam Timi (ENGINEER)', '1x Standart Piyade'],
  },
  {
    id: '2',
    name: 'Zeytin Dalı Harekatı',
    desc: 'Dağlık Afrin bölgesi. Yoğun zırhlı desteği ile tahkim edilmiş düşman mevzilerine taarruz edilecek.',
    objective: 'Tepedeki dağ mevziini ve içindeki düşmanları ortadan kaldır.',
    taskForce: ['1x Zırhlı Tim (ARMORED)', '1x İstihkam (ENGINEER)', '1x Piyade', '1x Sıhhiyeci (MEDIC)'],
  },
  {
    id: '3',
    name: 'Barış Pınarı Harekatı',
    desc: 'Geniş düzlüklerde hızlı ilerleme. Mekanize birlikler ve tanklarla hatları yarma operasyonu.',
    objective: 'Düşman zırhlı birliklerini ve savunmasını kır.',
    taskForce: ['2x Zırhlı Tim (ARMORED)', '1x Ağır Silah (MG)', '1x Piyade'],
  },
  {
    id: '4',
    name: 'Pençe-Kartal Operasyonu',
    desc: 'Sarp arazi, yüksek irtifa, sessiz ve ölümcül vuruşlar. Sadece elit komandolar ve hava desteği.',
    objective: 'Fark edilmeden veya çatışarak tüm mağara nöbetçilerini temizle.',
    taskForce: ['1x Keskin Nişancı (SNIPER)', '2x Komando (RIFLEMAN)'],
  },
  {
    id: '5',
    name: 'Kıbrıs Barış Harekatı (Atilla)',
    desc: 'Hava indirme sonrası dağınık düşen birlikler. Telsiz bağı kopuk, timlerin birleşmesi öncelikli hedef.',
    objective: 'Dağınık timleri birleştir, düşman taburuna karşı hayatta kal.',
    taskForce: ['4x Paraşütçü Timi (RIFLEMAN)'],
  },
  {
    id: '6',
    name: 'Karakol Savunması (Şafak Baskını)',
    desc: 'GECEYARISİ BASKINI. Merkezi stratejik karakolumuzu ağır silahlı timlerle 4 koldan savunun.',
    objective: 'Karakolu (G-8) 120 dakika boyunca düşmana karşı savun. MG baskı ateşini kullanın!',
    taskForce: ['2x Ağır Silah Timi (MG)', '1x Piyade', '1x Sıhhiyeci (MEDIC)'],
  },
]

export function makeUnit(id: string, name: string, role: SoldierRole, hp: number, morale: number, ammo: number, rations: number, medkits: number, x: number, y: number): Soldier {
  const s = new Soldier(id, name, role, hp, morale, ammo, rations, medkits)
  s.setPosition({ x, y })
  return s
}

export function makeEnemy(id: string, name: string, hp: number, morale: number, ammo: number, x: number, y: number, type: EnemyType = EnemyType.INFANTRY, state?: EnemyState, assaultX?: number, assaultY?: number): EnemyUnit {
  const e = new EnemyUnit(id, name, hp, morale, ammo, type)
  e.setPosition({ x, y })
  if (state) e.setState(state)
  if (assaultX !== undefined && assaultY !== undefined) e.setAssaultTarget(assaultX, assaultY)
  return e
}

export function loadScenario(index: number, difficulty: 'EASY' | 'STANDARD' | 'HARD' = 'STANDARD'): ScenarioSetup | null {
  const op = OPERATIONS[index - 1]
  if (!op) return null

  const units = new Map<string, Soldier>()
  const enemies = new Map<string, EnemyUnit>()
  let resources: ResourceManager
  let startHour = 6, startMinute = 0, startDay = 1
  let hasCapturePoint = false
  let capturePoint = { x: 7, y: 7 }
  let defenseTimerMax = 0
  let initialRadioMessage: { unitId: string; message: string } | undefined
  let restrictions: ScenarioSetup['restrictions'] = {}
  let setupPhases: ScenarioPhase[] = []
  let weather: WeatherType = WeatherType.CLEAR
  let customTerrainSetter: ((map: MapGrid) => void) | undefined = undefined

  if (index === 1) { // Fırat Kalkanı (Cerablus)
    startHour = 6; startMinute = 0
    resources = new ResourceManager(100, 1200, 15)
    
    const u1 = makeUnit('MEK-1', 'Mekanize-1', SoldierRole.ARMORED, 200, 90, 300, 10, 0, 1, 7)
    u1.setHasPortableRadio(true)
    const u2 = makeUnit('MEK-2', 'Mekanize-2', SoldierRole.ARMORED, 200, 90, 300, 10, 0, 1, 9)
    u2.setHasPortableRadio(false)
    const u3 = makeUnit('İST-1', 'İstihkam-1', SoldierRole.ENGINEER, 120, 85, 200, 5, 2, 2, 8)
    u3.setHasPortableRadio(false)
    const u4 = makeUnit('TİM-1', 'TİM-1 (Piyade)', SoldierRole.RIFLEMAN, 100, 80, 120, 5, 2, 0, 8)
    u4.setHasPortableRadio(true)

    units.set('MEK-1', u1)
    units.set('MEK-2', u2)
    units.set('İST-1', u3)
    units.set('TİM-1', u4)
    
    enemies.set('HEDEF-1', makeEnemy('HEDEF-1', 'Düşman Tahkimatı', 200, 70, 400, 12, 8))
    enemies.set('Z-ARAC', makeEnemy('Z-ARAC', 'Düşman Zırhlısı', 250, 60, 200, 8, 8, EnemyType.ARMORED))
    enemies.set('DEVRIYE-1', makeEnemy('DEVRIYE-1', 'Sınır Devriyesi', 100, 60, 150, 10, 6))
    enemies.set('MG-1', makeEnemy('MG-1', 'Düşman Doçka Mevzii', 120, 70, 200, 13, 9, EnemyType.MG))
    initialRadioMessage = { unitId: 'MEK-1', message: 'Fırat Kalkanı Harekatı: Birliklerimiz Cerablus sınır hattına girdi. Yoğun düşman zırhlı direnci bekleniyor. Telsiz ağımız sorunsuz.' }
    weather = WeatherType.CLEAR
    customTerrainSetter = (map) => {
      for (let x = 0; x < map.width; x++) {
        map.setTerrain(x, 8, TerrainType.OPEN)
      }
    }

  } else if (index === 2) { // Zeytin Dalı (Afrin)
    startHour = 6; startMinute = 0
    resources = new ResourceManager(80, 800, 12)
    
    const u1 = makeUnit('MEK-1', 'Mekanize-1', SoldierRole.ARMORED, 200, 90, 300, 10, 0, 1, 7)
    u1.setHasPortableRadio(false)
    const u2 = makeUnit('İST-1', 'İstihkam-1', SoldierRole.ENGINEER, 120, 85, 200, 5, 2, 2, 8)
    u2.setHasPortableRadio(true)
    const u3 = makeUnit('TİM-1', 'TİM-1 (Piyade)', SoldierRole.RIFLEMAN, 100, 80, 120, 5, 2, 0, 8)
    u3.setHasPortableRadio(false)
    const u4 = makeUnit('TİM-2', 'TİM-2 (Sıhhiye)', SoldierRole.MEDIC, 100, 85, 80, 5, 4, 0, 9)
    u4.setHasPortableRadio(false)

    units.set('MEK-1', u1)
    units.set('İST-1', u2)
    units.set('TİM-1', u3)
    units.set('TİM-2', u4)
    
    enemies.set('HEDEF-1', makeEnemy('HEDEF-1', 'Afrin Tepesi', 250, 70, 400, 11, 5))
    enemies.set('KESKIN-1', makeEnemy('KESKIN-1', 'Düşman Keskin Nişancı', 80, 80, 50, 11, 3, EnemyType.SNIPER))
    enemies.set('MG-1', makeEnemy('MG-1', 'Düşman Ağır Silah', 120, 75, 250, 10, 7, EnemyType.MG))
    enemies.set('PIYADE-1', makeEnemy('PIYADE-1', 'Yamaç Savunma Timi', 100, 70, 120, 9, 4))
    enemies.set('DEVRIYE-1', makeEnemy('DEVRIYE-1', 'Tepe Karakol Nöbetçisi', 80, 60, 100, 12, 6))
    initialRadioMessage = { unitId: 'İST-1', message: 'Zeytin Dalı Harekatı: Afrin tepelerindeki tahkimatlara yaklaşıyoruz. Bulutlu hava ve engebeli dağlar telsiz sinyalini zayıflatıyor. İstihkam timinde taşınabilir telsiz var.' }
    weather = WeatherType.CLOUDY
    customTerrainSetter = (map) => {
      for (let y = 0; y < map.height; y++) {
        map.setTerrain(6, y, TerrainType.MOUNTAIN)
        map.setTerrain(7, y, TerrainType.MOUNTAIN)
      }
    }

  } else if (index === 3) { // Barış Pınarı (Tel Abyad)
    startHour = 7; startMinute = 0
    resources = new ResourceManager(120, 1500, 20)
    
    const u1 = makeUnit('MEK-1', 'Mekanize-1', SoldierRole.ARMORED, 200, 95, 300, 10, 0, 1, 7)
    u1.setHasPortableRadio(true)
    const u2 = makeUnit('MEK-2', 'Mekanize-2', SoldierRole.ARMORED, 200, 95, 300, 10, 0, 1, 9)
    u2.setHasPortableRadio(true)
    const u3 = makeUnit('TİM-1', 'TİM-1 (Piyade)', SoldierRole.RIFLEMAN, 100, 80, 120, 5, 2, 0, 8)
    u3.setHasPortableRadio(false)
    const u4 = makeUnit('TİM-2', 'TİM-2 (Ağır Silah)', SoldierRole.MG, 100, 85, 300, 5, 1, 2, 8)
    u4.setHasPortableRadio(false)

    units.set('MEK-1', u1)
    units.set('MEK-2', u2)
    units.set('TİM-1', u3)
    units.set('TİM-2', u4)
    
    enemies.set('Z-ARAC-1', makeEnemy('Z-ARAC-1', 'Düşman Zırhlısı', 250, 70, 200, 10, 5, EnemyType.ARMORED))
    enemies.set('Z-ARAC-2', makeEnemy('Z-ARAC-2', 'Düşman Tankı', 300, 75, 250, 12, 10, EnemyType.ARMORED))
    enemies.set('PIYADE-1', makeEnemy('PIYADE-1', 'Düşman Timi', 100, 65, 150, 11, 7))
    enemies.set('MG-1', makeEnemy('MG-1', 'Düşman Savunma Hattı MG', 120, 70, 250, 9, 8, EnemyType.MG))
    enemies.set('KESKIN-1', makeEnemy('KESKIN-1', 'Düşman Gözcü Keskin Nişancı', 80, 80, 60, 13, 4, EnemyType.SNIPER))
    enemies.set('PIYADE-2', makeEnemy('PIYADE-2', 'Düşman Piyade Destek Grubu', 100, 70, 150, 11, 11))
    initialRadioMessage = { unitId: 'MEK-1', message: 'Barış Pınarı Harekatı: Tel Abyad düzlüklerinde taarruza başlıyoruz. Hava açık ama hedefler çok uzakta. İlerledikçe telsiz mesafesi yetersiz kalabilir, röleleri kurmaya hazır olun.' }
    weather = WeatherType.CLEAR
    customTerrainSetter = (map) => {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          map.setTerrain(x, y, Math.random() < 0.90 ? TerrainType.OPEN : TerrainType.FOREST)
        }
      }
    }

  } else if (index === 4) { // Pençe-Kartal (Hakurk)
    startHour = 2
    resources = new ResourceManager(30, 200, 5)
    restrictions = { artilleryDisabled: true, airstrikeDisabled: true }
    
    const u1 = makeUnit('GÖLGE-1', 'Gölge-1 (Sniper)', SoldierRole.SNIPER, 100, 120, 60, 3, 1, 2, 2)
    u1.setHasPortableRadio(false)
    const u2 = makeUnit('BORDO-1', 'Bordo-1 (Komando)', SoldierRole.RIFLEMAN, 100, 110, 90, 4, 2, 1, 2)
    u2.setHasPortableRadio(true)
    const u3 = makeUnit('BORDO-2', 'Bordo-2 (Komando)', SoldierRole.RIFLEMAN, 100, 110, 90, 4, 2, 2, 1)
    u3.setHasPortableRadio(false)

    units.set('GÖLGE-1', u1)
    units.set('BORDO-1', u2)
    units.set('BORDO-2', u3)
    
    enemies.set('MGR-1', makeEnemy('MGR-1', 'Mağara Nöbetçisi', 80, 50, 50, 11, 11))
    enemies.set('MGR-2', makeEnemy('MGR-2', 'Sızma Nöbetçisi', 80, 50, 50, 12, 10))
    enemies.set('MGR-3', makeEnemy('MGR-3', 'Mağara Keskin Nişancı', 60, 60, 40, 10, 12, EnemyType.SNIPER))
    enemies.set('MGR-4', makeEnemy('MGR-4', 'Mağara Giriş Muhafızı', 90, 65, 80, 13, 13))
    enemies.set('MGR-DEVRIYE', makeEnemy('MGR-DEVRIYE', 'Vadi Devriyesi', 90, 70, 100, 6, 7))
    initialRadioMessage = { unitId: 'BORDO-1', message: 'Pençe-Kartal Operasyonu: Hakurk dağlarındayız. Yoğun sis nedeniyle görüş kısıtlı ve telsiz bağlantısı kopuk (%40 gücünde). Komando telsiz rölesini kurarak irtibat sağlamalı.' }
    weather = WeatherType.FOGGY
    customTerrainSetter = (map) => {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const distToEnemy = Math.sqrt((x - 11) * (x - 11) + (y - 11) * (y - 11))
          if (distToEnemy < 6) {
            map.setTerrain(x, y, Math.random() < 0.7 ? TerrainType.MOUNTAIN : TerrainType.FOREST)
          } else {
            map.setTerrain(x, y, Math.random() < 0.4 ? TerrainType.MOUNTAIN : TerrainType.OPEN)
          }
        }
      }
    }

  } else if (index === 5) { // Kıbrıs Atilla (Scattered)
    startHour = 6; startMinute = 30
    resources = new ResourceManager(20, 150, 4)
    
    const spawnPoints = [{ x: 2, y: 2 }, { x: 12, y: 3 }, { x: 3, y: 12 }, { x: 12, y: 12 }]
    for (let i = 1; i <= 4; i++) {
      const p = spawnPoints[i - 1]
      const id = `TİM-${i}`
      const u = makeUnit(id, `Paraşütçü TİM-${i}`, SoldierRole.RIFLEMAN, 90, 80, 80, 4, 1, p.x, p.y)
      u.setHasPortableRadio(i === 1) // Only TIM-1 has the portable radio
      units.set(id, u)
    }

    enemies.set('TABUR-1', makeEnemy('TABUR-1', 'Düşman Ana Mevzii', 300, 60, 500, 7, 7, EnemyType.INFANTRY))
    enemies.set('DEVRIYE-1', makeEnemy('DEVRIYE-1', 'Gezici Devriye 1', 80, 55, 100, 4, 6))
    enemies.set('DEVRIYE-2', makeEnemy('DEVRIYE-2', 'Gezici Devriye 2', 80, 55, 100, 10, 8))
    enemies.set('MG-1', makeEnemy('MG-1', 'Düşman Mevzii Makineli', 130, 75, 300, 8, 6, EnemyType.MG))
    enemies.set('Z-ARAC-1', makeEnemy('Z-ARAC-1', 'Düşman Zırhlı Devriyesi', 200, 70, 200, 6, 10, EnemyType.ARMORED))
    enemies.set('KESKIN-1', makeEnemy('KESKIN-1', 'Kilise Kulesi Nişancısı', 90, 85, 60, 9, 9, EnemyType.SNIPER))
    initialRadioMessage = { unitId: 'TİM-1', message: 'Kıbrıs Barış Harekatı: Paraşütçü timlerimiz dağınık indi. Yağmur telsizi parazitlendiriyor. Telsiz rölesi sadece TİM-1\'de. Timlerin birleşmesi öncelikli.' }
    weather = WeatherType.RAINY
    customTerrainSetter = (map) => {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const distToCenter = Math.sqrt((x - 7) * (x - 7) + (y - 7) * (y - 7))
          if (distToCenter < 3) {
            map.setTerrain(x, y, TerrainType.CITY)
          } else if (distToCenter < 6) {
            map.setTerrain(x, y, Math.random() < 0.5 ? TerrainType.FOREST : TerrainType.OPEN)
          } else {
            map.setTerrain(x, y, TerrainType.OPEN)
          }
        }
      }
    }

  } else if (index === 6) { // Karakol Savunması (Şafak Baskını)
    startHour = 3
    resources = new ResourceManager(60, 1500, 15)
    hasCapturePoint = true
    capturePoint = { x: 7, y: 7 }
    defenseTimerMax = 120

    const u1 = makeUnit('AĞIR-1', 'Ağır Silah-1 (MG)', SoldierRole.MG, 100, 95, 400, 5, 2, 7, 6)
    u1.setHasPortableRadio(false)
    const u2 = makeUnit('AĞIR-2', 'Ağır Silah-2 (MG)', SoldierRole.MG, 100, 95, 400, 5, 2, 7, 8)
    u2.setHasPortableRadio(false)
    const u3 = makeUnit('TİM-1', 'TİM-1 (Piyade)', SoldierRole.RIFLEMAN, 100, 90, 150, 5, 2, 6, 7)
    u3.setHasPortableRadio(true)
    const u4 = makeUnit('TİM-2', 'TİM-2 (Sıhhiye)', SoldierRole.MEDIC, 100, 90, 100, 5, 4, 8, 7)
    u4.setHasPortableRadio(true)

    units.set('AĞIR-1', u1)
    units.set('AĞIR-2', u2)
    units.set('TİM-1', u3)
    units.set('TİM-2', u4)

    enemies.set('BASKIN-K', makeEnemy('BASKIN-K', 'Kuzey Saldırı Timi', 100, 70, 150, 7, 0, EnemyType.INFANTRY, EnemyState.ASSAULT_TARGET, 7, 7))
    enemies.set('BASKIN-G', makeEnemy('BASKIN-G', 'Güney Saldırı Timi', 100, 70, 150, 7, 14, EnemyType.INFANTRY, EnemyState.ASSAULT_TARGET, 7, 7))
    enemies.set('BASKIN-D', makeEnemy('BASKIN-D', 'Doğu Saldırı Timi', 80, 70, 120, 14, 7, EnemyType.INFANTRY, EnemyState.ASSAULT_TARGET, 7, 7))
    enemies.set('BASKIN-B', makeEnemy('BASKIN-B', 'Batı Saldırı Timi', 80, 70, 120, 0, 7, EnemyType.INFANTRY, EnemyState.ASSAULT_TARGET, 7, 7))
    enemies.set('BASKIN-KD', makeEnemy('BASKIN-KD', 'Kuzeydoğu Baskın Timi', 100, 75, 150, 14, 0, EnemyType.INFANTRY, EnemyState.ASSAULT_TARGET, 7, 7))
    enemies.set('BASKIN-GB', makeEnemy('BASKIN-GB', 'Güneybatı Zırhlı Destek', 200, 70, 200, 0, 14, EnemyType.ARMORED, EnemyState.ASSAULT_TARGET, 7, 7))
    enemies.set('BASKIN-KESKIN', makeEnemy('BASKIN-KESKIN', 'Sızma Keskin Nişancısı', 80, 85, 50, 11, 2, EnemyType.SNIPER, EnemyState.ASSAULT_TARGET, 7, 7))
    initialRadioMessage = { unitId: 'TİM-1', message: 'Karakol Savunması: Fırtına koptu, telsizler neredeyse tamamen kesildi (%20 gücünde). 4 koldan düşman sızması tespit edildi. Telsiz rölelerini karakol çevresine kurup komuta bağlantısını koruyun!' }
    weather = WeatherType.STORM
    customTerrainSetter = (map) => {
      map.setTerrain(7, 7, TerrainType.CITY)
      map.setTerrain(7, 6, TerrainType.CITY)
      map.setTerrain(7, 8, TerrainType.CITY)
      map.setTerrain(6, 7, TerrainType.CITY)
      map.setTerrain(8, 7, TerrainType.CITY)
      
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (x !== 7 && y !== 7 && Math.random() < 0.4) {
            map.setTerrain(x, y, TerrainType.FOREST)
          }
        }
      }
    }

  } else {
    return null
  }

  let hpFactor = 1.0
  if (difficulty === 'EASY') hpFactor = 0.75
  else if (difficulty === 'HARD') hpFactor = 1.3

  if (hpFactor !== 1.0) {
    for (const enemy of enemies.values()) {
      const scaledHp = Math.round(enemy.getMaxHp() * hpFactor)
      enemy.setMaxHp(scaledHp)
      enemy.setHp(scaledHp)
    }
  }

  return {
    operation: op,
    startHour,
    startMinute,
    startDay,
    resources: resources!,
    units,
    enemies,
    hasCapturePoint,
    capturePoint,
    defenseTimerMax,
    initialRadioMessage,
    restrictions,
    phases: setupPhases,
    weather,
    customTerrainSetter,
  }
}
