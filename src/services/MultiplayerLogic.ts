import { Soldier } from '../engine/Soldier';
import { EnemyUnit } from '../engine/EnemyUnit';
import { CombatSystem } from '../engine/CombatSystem';
import { MapGrid } from '../engine/MapGrid';

/**
 * MultiplayerLogic Servisi
 * Bu servis, hileyi önlemek için normalde sunucu tarafında (Firebase Cloud Functions) 
 * çalışması beklenen kritik hesaplamaları merkezileştirir.
 */
export const MultiplayerLogic = {
  /**
   * Topçu hasarını hesaplar.
   * Gelecekte bu fonksiyon doğrudan bir Cloud Function çağrısı ile değiştirilebilir.
   */
  calculateArtilleryDamage: (targetPos: { x: number, y: number }, enemyPos: { x: number, y: number }) => {
    const dx = enemyPos.x - targetPos.x;
    const dy = enemyPos.y - targetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist <= 2) {
      // Rastgelelik sunucu tarafında belirlenmelidir.
      return 30 + Math.floor(Math.random() * 40);
    }
    return 0;
  },

  /**
   * Askerin canını günceller.
   */
  processCombatImpact: (unit: Soldier, enemy: EnemyUnit, map: MapGrid) => {
    // CombatSystem.resolveAttack sonucuna göre hileyi önleyecek ek doğrulamalar burada yapılabilir.
    return CombatSystem.resolveAttack(unit, enemy, map);
  },

  /**
   * Düşman saldırısını hesaplar.
   */
  processEnemyImpact: (enemy: EnemyUnit, unit: Soldier, map: MapGrid) => {
    return CombatSystem.resolveEnemyAttack(enemy, unit, map);
  }
};
