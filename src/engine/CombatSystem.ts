// ============================================================
// CombatSystem.ts — Port of CombatSystem.cpp
// ============================================================

import { Soldier } from './Soldier'
import { EnemyUnit } from './EnemyUnit'
import { MapGrid } from './MapGrid'
import {
  SoldierRole, EnemyType, FirePermission, TerrainType, ReportCategory,
} from './types'
import { audioManager } from '../services/AudioManager'

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
      result.reportMessage = 'Keskin nişancı eli ayağı titriyor! Baskı çok ağır, tetiğe basamıyor!'
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

      audioManager.startGunfireAmbient()
      if (attacker.getRole() === SoldierRole.SNIPER && isCritical) {
        audioManager.playSniperShot()
      } else if (attacker.getRole() === SoldierRole.ARMORED) {
        audioManager.playTankFire()
      }

      if (!defender.isAlive()) {
        result.defenderKilled = true
        if (isCritical) result.reportMessage = pick(['Alnının çatına koyduk! Kritik isabet, çakal indi.', 'Tek mermi, bir eksik. Faturayı kestik.', 'Rüzgarı kokladık, beynini dağıttık. Mevzi temiz.'])
        else if (attacker.getRole() === SoldierRole.ARMORED) result.reportMessage = pick(['Havai fişek oldu namussuzlar! Tank imhası tertemiz.', 'Çelik yığınına döndüler, hurda niyetine toplasınlar artık!', 'Zırh mı bıraktık? Hedef yerle yeksan oldu.'])
        else result.reportMessage = pick(['Hedef paketlendi! Tekrar ediyorum, bir leşimiz daha var.', 'Birini daha cehenneme postaladık komutanım!', 'Unsur etkisiz, diğer dünya biletini kesti bizimkiler.', 'İsabet tam! Çakal sürüsünden biri daha eksildi.'])
      } else {
        if (isCritical) result.reportMessage = pick(['Kandilini söndürdük ama hala ayakta!', 'Namussuzun canı tatlıymış, ağır hasar aldı ama bırakmıyor.'])
        else if (defender.getType() === EnemyType.ARMORED) result.reportMessage = pick(['Zırhlıya vurduk, dumanı tütüyor!', 'RPG yaladı geçti ama paleti dağıttık, kımıldayamaz artık.', 'Zırhı kalın pezevengin ama dışını haşat ettik.'])
        else result.reportMessage = pick(['Temas sağlandı, çakalı deldik geçtik! Yaralıdır, bastırmaya devam.', 'İsabetimiz var! Düşman göt korkusuna geri çekiliyor.', 'Karargah, temas noktası dövülüyor. Unsur kan kaybediyor.'])
      }
    } else {
      if (attacker.getRole() === SoldierRole.MG) {
        defender.adjustMorale(-15)
        result.reportMessage = pick(['Makineliyle kusturuyoruz! Kafasını kaldıranın beynini alıyoruz.', 'Yoğun kurşun yağmuru! İsabet yok ama azrailin nefesini hissediyorlar.', 'Mermiyi esirgemiyoruz! Hedefin feleği şaştı.'])
      } else {
        result.reportMessage = pick(['Ateşle dövüyoruz ama namussuzlar iyi saklanıyor!', 'Mermiler mevzide patlıyor, altına sıçıyorlar ama ölmediler daha.', 'Karargah, ateş serbest ama mermiler havaya gidiyor. Düşman kurnaz.'])
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

      audioManager.startGunfireAmbient()
      if (attacker.getType() === EnemyType.SNIPER && result.damageDealt > 40) { // Approx critical
        audioManager.playSniperShot()
      } else if (attacker.getType() === EnemyType.ARMORED) {
        audioManager.playTankFire()
      }

      if (!defender.isAlive()) {
        result.reportMessage = pick(['Komutanım... (Statik gürültü)... Vuruldu... Tertibim düştü... Sinyal koptu.', 'Karargah... Vuruldum... Kelime-i şehadet getiriyoruz... Allah\'a emanet.', 'Mevzimize çöküldü! Şehidimiz var! Kanları yerde kalma... (Telsiz kesilmesi)'])
        result.enemyTauntMessage = pick(['Devletinizin köpekleri bir bir düşüyor! Burası size mezar olacak!', 'Telsiziniz artık bizde. Hepinizi kendi kanınızda boğacağız!', 'Komutan diye güvendiğiniz adamlar sizi ölüme yolluyor! Burası cehennem!'])
      } else {
        if (attacker.getType() === EnemyType.ARMORED) {
          result.reportMessage = pick(['Düşman tankı ateş kusuyor! Mevzi elden gidiyor!', 'Zırhlı it üzerimize sürüyor, acil hava desteği lazım!', 'Karargah, palet sesleri ensenizde, durduramıyoruz!'])
        } else {
          result.reportMessage = pick(['Ağır baskı altındayız! Yaralılarımız var, acil helikopter lazım!', 'Çok yakınımıza susturdular! Çocuklar perişan, kanı durduramıyoruz.', 'Sıhhiye! Sıhhiye yetiş! Mevzide can çekişen var komutanım.', 'Karargah, mermi deldi geçti! Durumumuz b*ktan, takviye göndersene!'])
        }
        if (d100() <= 20) {
          result.enemyTauntMessage = pick(['Hahaha! Kaçacak yeriniz yok, etrafınız sarıldı!', 'Telsiz frekansınız kırıldı askerler! Dinlediğinizi biliyoruz, öleceksiniz!', 'Devletinizin kurşunları bitmek üzere, biz ise daha yeni başlıyoruz!'])
        }
      }
    } else {
      if (attacker.getType() === EnemyType.MG) {
        defender.adjustMorale(-15)
        defender.setUnderFire()
        result.reportMessage = pick(['Düşman makineliyle kusturuyor! Siperden başını çıkaranın beynini alıyorlar!', 'Üzerimize mermi yağıyor, çocuklar perişan komutanım!', 'Yoğun MG ateşi altındayız, kımıldayanı vuruyorlar!'])
      } else {
        defender.adjustMorale(-2)
        result.reportMessage = pick(['Ateş altındayız! Mukavemet gösteriyoruz.', 'Yoğun atış altındayız, başımızı kaldıramıyoruz komutanım!', 'Düşman ateşi! Yat yere yat!', 'Mermiler vızır vızır geçiyor, şansımız yaver gidiyor!'])
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
