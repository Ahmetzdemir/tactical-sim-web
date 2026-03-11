// ============================================================
// Scenario.ts — Port of Scenario.cpp, all 6 operations
// ============================================================

import { Soldier } from './Soldier'
import { EnemyUnit } from './EnemyUnit'
import { SoldierRole, EnemyType, EnemyState, ScenarioPhase, ObjectiveType } from './types'
import { ResourceManager } from './ResourceManager'

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
    taskForce: ['2x Zırhlı Tim (ARMORED)', '1x İstihkam Timi (ENGINEER)', '1x Standart Piyade'],
  },
  {
    id: '3',
    name: 'Barış Pınarı Harekatı',
    desc: 'Geniş düzlüklerde hızlı ilerleme. Mekanize birlikler ve tanklarla hatları yarma operasyonu.',
    objective: 'Düşman zırhlı birliklerini ve savunmasını kır.',
    taskForce: ['2x Zırhlı Tim (ARMORED)', '1x İstihkam Timi (ENGINEER)', '1x Standart Piyade'],
  },
  {
    id: '4',
    name: 'Pençe-Kartal Operasyonu',
    desc: 'Sarp arazi, yüksek irtifa, sessiz ve ölümcül vuruşlar. Sadece elit komandolar ve hava desteği.',
    objective: 'Fark edilmeden veya çatışarak tüm mağara nöbetçilerini temizle.',
    taskForce: ['1x Keskin Nişancı (SNIPER)', '2x Özel Kuvvet Timi (PIYADE)'],
  },
  {
    id: '5',
    name: 'Kıbrıs Barış Harekatı (Atilla)',
    desc: 'Hava indirme sonrası dağınık düşen birlikler. Telsiz bağı kopuk, timlerin birleşmesi öncelikli hedef.',
    objective: 'Dağınık timleri birleştir, düşman taburuna karşı hayatta kal.',
    taskForce: ['4x Paraşütçü Timi (STANDART PİYADE)'],
  },
  {
    id: '6',
    name: 'Karakol Savunması (Şafak Baskını)',
    desc: 'GECEYARISİ BASKINI. Merkezi stratejik karakolumuzu ağır silahlı timlerle 4 koldan savunun.',
    objective: 'Karakolu (G-8) 120 dakika boyunca düşmana karşı savun. MG baskı ateşini kullanın!',
    taskForce: ['2x Ağır Silah Timi (MG)', '2x Standart Piyade Timi'],
  },
  {
    id: '7',
    name: 'Şafak Vakti (Müşterek Harekat)',
    desc: 'Vadi hattı boyunca ağır tahkimat. Önce sızma, sonra zırhlı yarması ve finalde köprü savunması. Tüm unsurların koordinasyonu şart.',
    objective: 'Aşama 1: Düşman sığınağını (X:10, Y:5) topçu ile imha et.',
    taskForce: ['1x Tank (ALTAY)', '1x İstihkam (ENGINEER)', '1x Keskin Nişancı', '1x Makineli Tüfek', '1x Komando'],
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

export function loadScenario(index: number): ScenarioSetup | null {
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

  if (index === 1 || index === 2 || index === 3) { // Zırhlı Yarması (Fırat, Zeytin, Barış)
    startHour = 6; startMinute = 0
    resources = new ResourceManager(80, 1000, 15)
    units.set('MEK-1', makeUnit('MEK-1', 'Mekanize-1', SoldierRole.ARMORED, 200, 90, 300, 10, 0, 1, 7))
    units.set('MEK-2', makeUnit('MEK-2', 'Mekanize-2', SoldierRole.ARMORED, 200, 90, 300, 10, 0, 1, 9))
    units.set('İST-1', makeUnit('İST-1', 'İstihkam-1', SoldierRole.ENGINEER, 120, 85, 200, 5, 2, 2, 8))
    units.set('TİM-1', makeUnit('TİM-1', 'TİM-1 (Piyade)', SoldierRole.RIFLEMAN, 100, 80, 120, 5, 2, 0, 8))
    
    enemies.set('HEDEF-1', makeEnemy('HEDEF-1', 'Düşman Tahkimatı', 200, 70, 400, 12, 8))
    enemies.set('Z-ARAC', makeEnemy('Z-ARAC', 'Düşman Zırhlısı', 250, 60, 200, 8, 8, EnemyType.ARMORED))
    initialRadioMessage = { unitId: 'MEK-1', message: 'Zırhlı birlikler Cerablus hattına ulaştı. Taarruz için komut bekliyoruz!' }

  } else if (index === 4) { // Pençe-Kartal (B-style)
    startHour = 2
    resources = new ResourceManager(30, 200, 5)
    restrictions = { artilleryDisabled: true } // Dağlık arazi kısıtı
    units.set('GÖLGE-1', makeUnit('GÖLGE-1', 'Gölge-1 (Sniper)', SoldierRole.SNIPER, 100, 120, 60, 3, 1, 2, 2))
    units.set('BORDO-1', makeUnit('BORDO-1', 'Bordo-1 (Komando)', SoldierRole.RIFLEMAN, 100, 110, 90, 4, 2, 1, 2))
    units.set('BORDO-2', makeUnit('BORDO-2', 'Bordo-2 (Komando)', SoldierRole.RIFLEMAN, 100, 110, 90, 4, 2, 2, 1))
    
    enemies.set('MGR-1', makeEnemy('MGR-1', 'Mağara Nöbetçisi', 40, 40, 30, 10, 10))
    enemies.set('MGR-2', makeEnemy('MGR-2', 'Sızma Nöbetçisi', 40, 40, 30, 11, 11))
    initialRadioMessage = { unitId: 'GÖLGE-1', message: 'Sızma başarılı. Sessizce ilerliyoruz. Topçu desteği menzil dışında, sadece birbirimize güvenebiliriz.' }

  } else if (index === 5) { // Kıbrıs Atilla (D-style - Scattered)
    startHour = 6; startMinute = 30
    resources = new ResourceManager(20, 150, 4)
    // Scattered points
    const spawnPoints = [{x:2, y:2}, {x:12, y:3}, {x:3, y:12}, {x:12, y:12}]
    for (let i = 1; i <= 4; i++) {
        const p = spawnPoints[i-1]
        const id = `TİM-${i}`
        units.set(id, makeUnit(id, `Paraşütçü TİM-${i}`, SoldierRole.RIFLEMAN, 90, 80, 80, 4, 1, p.x, p.y))
    }
    enemies.set('TABUR-1', makeEnemy('TABUR-1', 'Düşman Taburu', 400, 60, 500, 7, 7, EnemyType.INFANTRY))
    initialRadioMessage = { unitId: 'TİM-1', message: 'İniş tamamlandı ama herkes dağıldı! Telsizler parazitli, diğer timleri bulmamız lazım.' }

  } else if (index === 6) { // Karakol Savunması (C-style)
    startHour = 3
    resources = new ResourceManager(60, 1500, 15)
    hasCapturePoint = true
    capturePoint = { x: 7, y: 7 }
    defenseTimerMax = 120

    units.set('AĞIR-1', makeUnit('AĞIR-1', 'Ağır Silah-1 (MG)', SoldierRole.MG, 100, 95, 400, 5, 2, 7, 6))
    units.set('AĞIR-2', makeUnit('AĞIR-2', 'Ağır Silah-2 (MG)', SoldierRole.MG, 100, 95, 400, 5, 2, 7, 8))
    units.set('TİM-1', makeUnit('TİM-1', 'TİM-1 (Piyade)', SoldierRole.RIFLEMAN, 100, 90, 150, 5, 2, 6, 7))
    units.set('TİM-2', makeUnit('TİM-2', 'TİM-2 (Piyade)', SoldierRole.RIFLEMAN, 100, 90, 150, 5, 2, 8, 7))

    enemies.set('BASKIN-1', makeEnemy('BASKIN-1', 'Kuzey Grubu', 60, 70, 100, 7, 0, EnemyType.INFANTRY, EnemyState.ASSAULT_TARGET, 7, 7))
    enemies.set('BASKIN-2', makeEnemy('BASKIN-2', 'Güney Grubu', 60, 70, 100, 7, 14, EnemyType.INFANTRY, EnemyState.ASSAULT_TARGET, 7, 7))
    initialRadioMessage = { unitId: 'AĞIR-1', message: 'Termal kameralar hareketlilik tespit etti. Karakol savunma düzeninde, baskına hazırız!' }
  } else if (index === 7) { // Müşterek Harekat (End-Game)
    startHour = 4; startMinute = 30
    resources = new ResourceManager(100, 2000, 20)
    // Foggy start
    
    units.set('ALTAY-1', makeUnit('ALTAY-1', 'Altay Tankı', SoldierRole.ARMORED, 200, 100, 300, 10, 0, 1, 1))
    units.set('İST-1', makeUnit('İST-1', 'İstihkam (Eng)', SoldierRole.ENGINEER, 100, 90, 150, 5, 2, 2, 2))
    units.set('SNI-1', makeUnit('SNI-1', 'Keskin Nişancı', SoldierRole.SNIPER, 100, 110, 60, 4, 1, 3, 1))
    units.set('MG-1', makeUnit('MG-1', 'Ağır Silah (MG)', SoldierRole.MG, 100, 95, 400, 5, 2, 1, 3))
    units.set('KMD-1', makeUnit('KMD-1', 'Bordo Bereli', SoldierRole.RIFLEMAN, 100, 120, 120, 6, 2, 2, 1))

    // Static targets for Phase 1
    enemies.set('SIGINAK-1', makeEnemy('SIGINAK-1', 'Düşman Sığınağı', 300, 100, 0, 10, 5, EnemyType.ARMORED))
    
    // Bridge guards for Phase 2
    enemies.set('KOPRU-G', makeEnemy('KOPRU-G', 'Köprü Nöbetçisi', 100, 80, 200, 10, 10))

    initialRadioMessage = { unitId: 'SNI-1', message: 'Vadiye sızdık. Hava çok sisli, göz gözü görmüyor. Sığınağı tespit etmeye çalışıyorum.' }

    setupPhases = [
        { id: 1, name: 'Sızma', description: 'Sığınağı yok et', objective: 'X:10 Y:5 koordinatındaki sığınağı imha et.', type: ObjectiveType.DESTROY_TARGET, targetId: 'SIGINAK-1' },
        { id: 2, name: 'Yarma', description: 'Köprüyü ele geçir', objective: 'X:10 Y:10 koordinatındaki köprüye ulaş ve güvenliği sağla.', type: ObjectiveType.REACH_POSITION, targetPos: {x:10, y:10} },
        { id: 3, name: 'Savunma', description: 'Köprüyü savun', objective: 'Gelen düşman karşı taarruzunu 30 dakika boyunca püskürt.', type: ObjectiveType.SURVIVE_TIME, timerMinutes: 30 }
    ]
  } else {
    return null
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
  }
}
