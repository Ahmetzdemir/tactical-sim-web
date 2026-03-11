// ============================================================
// CombatSystem.ts — Port of CombatSystem.cpp
// ============================================================

import { Soldier } from './Soldier'
import { EnemyUnit } from './EnemyUnit'
import { MapGrid } from './MapGrid'
import {
  SoldierRole, EnemyType, FirePermission, TerrainType, ReportCategory,
} from './types'

export interface CombatResult {
  attackHit: boolean
  defenderKilled: boolean
  damageDealt: number
  reportMessage: string
  category: ReportCategory
  enemyTauntMessage: string
}

function d100(): number { return Math.floor(Math.random() * 100) + 1 }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function calculateHitChance(
  baseChance: number,
  attackerMorale: number,
  defenderInCover: boolean,
  defTerrain: TerrainType,
): number {
  let chance = baseChance
  chance += Math.floor((attackerMorale - 50) / 10)
  if (defenderInCover) chance -= 15
  if (defTerrain === TerrainType.CITY) chance -= 10
  if (defTerrain === TerrainType.MOUNTAIN) chance -= 10
  if (defTerrain === TerrainType.FOREST) chance -= 5
  return Math.max(5, Math.min(95, chance))
}

export const CombatSystem = {
  resolveAttack(attacker: Soldier, defender: EnemyUnit, map: MapGrid): CombatResult {
    const result: CombatResult = { attackHit: false, defenderKilled: false, damageDealt: 0, reportMessage: '', category: ReportCategory.REGULAR, enemyTauntMessage: '' }
    if (!attacker.isAlive() || !defender.isAlive()) return result
    if (attacker.getAmmo() <= 0) {
      result.reportMessage = 'Mühimmat tükendi, ateşe karşılık veremiyoruz!'
      return result
    }
    const fp = attacker.getFirePermission()
    if (fp === FirePermission.WAITING_FOR_PERMISSION) {
      result.reportMessage = 'Karargah, atış izni bekliyoruz! Ateş açamıyoruz.'
      return result
    }
    if (fp === FirePermission.DENIED || fp === FirePermission.HOLD_FIRE) {
      result.reportMessage = 'Ateş kısıtlaması (ROE) devrede, emir bekliyoruz.'
      return result
    }

    if (attacker.getRole() === SoldierRole.SNIPER && attacker.getMorale() <= 40) {
      result.reportMessage = 'Keskin nişancı ağır baskı altında! Odaklanamıyor, atış iptal.'
      return result
    }

    attacker.consumeAmmo(3)
    const roll = d100()
    const defTerrain = map.getTerrain(defender.getPosition().x, defender.getPosition().y)
    const hitChance = calculateHitChance(50, attacker.getMorale(), false, defTerrain)

    if (roll <= hitChance) {
      result.attackHit = true
      let dmgBase = 20
      if (defender.getType() === EnemyType.ARMORED) {
        if (attacker.getRole() === SoldierRole.ENGINEER) dmgBase = 40
        else if (attacker.getRole() === SoldierRole.ARMORED) dmgBase = 30
        else dmgBase = 10
      } else {
        if (attacker.getRole() === SoldierRole.ARMORED) dmgBase = 45
        else dmgBase = 20
      }
      let finalDmg = dmgBase - 5 + Math.floor(Math.random() * 16)
      let isCritical = false
      if (attacker.getRole() === SoldierRole.SNIPER && d100() <= 30) {
        finalDmg *= 2; isCritical = true
      }
      result.damageDealt = finalDmg
      defender.takeDamage(finalDmg)
      result.category = ReportCategory.SUCCESS

      if (!defender.isAlive()) {
        result.defenderKilled = true
        if (isCritical) result.reportMessage = pick(['Gözünden vuruldu! Kritik isabet, hedef anında öldü.', 'Tek mermi, tek leş. Keskin nişancı atışı başarılı.', 'Rüzgarı okuduk, hedefi indirdik. Başından vuruldu.'])
        else if (attacker.getRole() === SoldierRole.ARMORED) result.reportMessage = pick(['Hedef havaya uçtu! Tank imhası onaylandı.', 'Çelik yığınına döndüler, tam isabet!', 'Zırh delici isabet! Hedef tamamen imha edildi.'])
        else result.reportMessage = pick(['Hedef vuruldu ve etkisiz hale getirildi! Tekrar ediyorum, düşman imha edildi.', 'Leşimiz var komutanım, hedef imha edildi!', 'Hedefteki unsur etkisiz hale getirildi. Bölge temiz.', 'İsabet tam! Düşman unsuru ortadan kaldırıldı.'])
      } else {
        if (isCritical) result.reportMessage = pick(['Kritik isabet! Hedef ağır bedel ödüyor.', 'Keskin nişancı vuruşu! Düşman sendeledi, büyük hasar aldı.'])
        else if (defender.getType() === EnemyType.ARMORED) result.reportMessage = pick(['Zırhlı araca isabet! Durduramadık ama yavaşladı.', 'RPG isabetli! Paleti hasar aldı komutanım.', 'Zırhını delemiyoruz ama dış aksamı zarar gördü.'])
        else result.reportMessage = pick(['Sıcak temas sağlandı, düşmanı vurduk! Yaralıdır, baskıya devam.', 'İsabetimiz var! Düşman geri çekiliyor, ateşle karşılık veriyorlar.', 'Karargah, temas noktası ateş altında. Unsur yaralandı.'])
      }
    } else {
      if (attacker.getRole() === SoldierRole.MG) {
        defender.adjustMorale(-15)
        result.reportMessage = pick(['Makineli tüfekle baskı kuruyoruz! Hedef kafasını bile kaldıramıyor.', 'Yoğun kurşun yağmuru! İsabet yok ama düşmanın morali yerle bir oldu.', 'Aralıksız ateş ediyoruz! Hedefin psikolojisi çöktü.'])
      } else {
        result.reportMessage = pick(['Ateş baskısı kuruyoruz ama net isabet yok! Çatışma devam ediyor.', 'Mermiler siperde patlıyor, hedef başını kaldırmıyor.', 'Karargah, ateş serbest ama mermiler boşa düşüyor. Düşman siperde.'])
      }
    }
    return result
  },

  resolveEnemyAttack(attacker: EnemyUnit, defender: Soldier, map: MapGrid): CombatResult {
    const result: CombatResult = { attackHit: false, defenderKilled: false, damageDealt: 0, reportMessage: '', category: ReportCategory.REGULAR, enemyTauntMessage: '' }
    if (!attacker.isAlive() || !defender.isAlive()) return result
    attacker.consumeAmmo(3)

    const defTerrain = map.getTerrain(defender.getPosition().x, defender.getPosition().y)
    const hitChance = calculateHitChance(40, attacker.getMorale(), defender.isInCover(), defTerrain)
    const roll = d100()

    if (roll <= hitChance) {
      result.attackHit = true
      defender.setUnderFire()
      let dmgBase = 20
      if (defender.getRole() === SoldierRole.ARMORED) {
        dmgBase = attacker.getType() === EnemyType.ARMORED ? 30 : 10
      } else {
        dmgBase = attacker.getType() === EnemyType.ARMORED ? 45 : 20
      }
      let finalDmg = dmgBase - 5 + Math.floor(Math.random() * 16)
      if (attacker.getType() === EnemyType.SNIPER && d100() <= 30) finalDmg *= 2
      result.damageDealt = finalDmg
      defender.takeDamage(finalDmg)
      defender.adjustMorale(-10)
      result.category = ReportCategory.DANGER

      if (!defender.isAlive()) {
        result.reportMessage = pick(['Komutanım... (Statik gürültü)... Vuruldu... (Ağır soluma)... Sinyal koptu.', 'Karargah... Vuruldum... Hakkınızı helal edin... Allah\'a emanet.', 'Mevzimize çöküldü! Şehidimiz var! Yardı... (Telsiz kesilmesi)'])
        result.enemyTauntMessage = pick(['Devletinizin askerleri bir bir düşüyor! Burası size mezar olacak!', 'Telsiziniz artık bizde. Hepinizi kendi kanınızda boğacağız!', 'Komutan diye güvendiğiniz adamlar sizi ölüme yolluyor! Burası cehennem!'])
      } else {
        if (attacker.getType() === EnemyType.ARMORED) {
          result.reportMessage = pick(['Düşman tankı ateş açıyor! Mevziyi terk etmemiz lazım!', 'Zırhlı birim üzerimize sürüyor, acil hava desteği gerek!', 'Karargah, palet sesleri çok yakında, durduramıyoruz!'])
        } else {
          result.reportMessage = pick(['Ağır baskı altındayız! Yaralılarımız var, acil tahliye gerek!', 'Çok yakınımıza düştü! Bölükte yaralılar var, kanamaları durduramıyoruz.', 'Sıhhiye! Sıhhiye gerek! Mevzide zayiat verdik komutanım.', 'Karargah, mermi deldi geçti! Durumumuz kritik, takviye bekliyoruz.'])
        }
        if (d100() <= 20) {
          result.enemyTauntMessage = pick(['Hahaha! Kaçacak yeriniz yok, etrafınız sarıldı!', 'Telsiz frekansınız kırıldı askerler! Dinlediğinizi biliyoruz, öleceksiniz!', 'Devletinizin kurşunları bitmek üzere, biz ise daha yeni başlıyoruz!'])
        }
      }
    } else {
      if (attacker.getType() === EnemyType.MG) {
        defender.adjustMorale(-15)
        defender.setUnderFire()
        result.reportMessage = pick(['Düşman ağır makineli ile baskı kurdu! Siperden çıkamıyoruz!', 'Üzerimize mermi yağıyor, moralimiz bozuluyor komutanım!', 'Yoğun MG ateşi altındayız, kafamızı kaldıramıyoruz!'])
      } else {
        defender.adjustMorale(-2)
        result.reportMessage = pick(['Ateş altındayız! Karşılık vermeye çalışıyoruz.', 'Yoğun atış altındayız, başımızı kaldıramıyoruz komutanım!', 'Düşman ateşi! Siper alın, siper alın!', 'Mermiler başımızın üstünden geçiyor, şimdilik iyiyiz!'])
      }
    }
    return result
  },

  resolveGroupAttack(attackers: Soldier[], target: EnemyUnit, map: MapGrid): CombatResult {
    const result: CombatResult = { attackHit: false, defenderKilled: false, damageDealt: 0, reportMessage: '', category: ReportCategory.DANGER, enemyTauntMessage: '' }
    if (!target.isAlive() || attackers.length === 0) return result

    let totalDamage = 0; let hitCount = 0
    const count = attackers.length
    const defTerrain = map.getTerrain(target.getPosition().x, target.getPosition().y)

    for (const atk of attackers) {
      if (!atk.isAlive() || atk.getAmmo() <= 0) continue
      atk.consumeAmmo(4)
      const hitChance = Math.min(95, calculateHitChance(55 + count * 5, atk.getMorale(), false, defTerrain))
      if (d100() <= hitChance) {
        hitCount++
        let dmg = target.getType() === EnemyType.ARMORED
          ? (atk.getRole() === SoldierRole.ENGINEER ? 40 : 12) : 15
        if (atk.getRole() === SoldierRole.SNIPER && d100() <= 30) dmg *= 2
        if (atk.getRole() === SoldierRole.MG) dmg += 8
        totalDamage += dmg
      }
    }

    const multiplier = count >= 3 ? 1.6 : count >= 2 ? 1.3 : 1.0
    const finalDamage = Math.floor(totalDamage * multiplier)

    if (hitCount > 0) {
      result.attackHit = true
      result.damageDealt = finalDamage
      target.takeDamage(finalDamage)
      target.adjustMorale(-20 * count)
      result.category = ReportCategory.SUCCESS
      if (!target.isAlive()) {
        result.defenderKilled = true
        result.reportMessage = pick(['HEDEF DÜŞTÜ! Koordineli ateş isabet etti, düşman etkisiz!', 'Grup saldırısı başarılı! Düşman birimi imha edildi, komutanım!', 'Çakıştırılmış ateş koordinasyonu mükemmeldi, hedef yok edildi!'])
      } else {
        result.reportMessage = `${hitCount} birim ateş açtı! Düşman ${finalDamage} hasar aldı, geri çekilmeye zorlandı!`
      }
    } else {
      result.reportMessage = 'Koordineli saldırı sonuçsuz! Düşman siper aldı ve atışları engelledi.'
    }
    return result
  },
}
