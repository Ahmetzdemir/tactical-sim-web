// ============================================================
// ResourceManager.ts — Port of ResourceManager
// ============================================================

import { SupplyType, SupplyRequest } from './types'

const RATION_CONSUMPTION_INTERVAL = 60

export class ResourceManager {
  private rations: number
  private ammo: number
  private medkits: number
  private tickAccumulator: number = 0
  private pendingSupplies: SupplyRequest[] = []

  constructor(initRations = 100, initAmmo = 500, initMedkits = 20) {
    this.rations = initRations
    this.ammo = initAmmo
    this.medkits = initMedkits
  }

  requestSupply(unitId: string, type: SupplyType, amount: number, currentTick: number): void {
    const delay = Math.floor(Math.random() * 29) + 1 // 1-30 min
    const deliveryTick = currentTick + delay
    this.pendingSupplies.push({ unitId, type, amount, deliveryTick })
  }

  processPendingSupplies(currentTick: number): Array<{ unitId: string; type: SupplyType; amount: number }> {
    const delivered: Array<{ unitId: string; type: SupplyType; amount: number }> = []
    const remaining: SupplyRequest[] = []

    for (const req of this.pendingSupplies) {
      if (req.deliveryTick <= currentTick) {
        // Deduct from HQ stocks
        if (req.type === SupplyType.AMMO) {
          const actual = Math.min(req.amount, this.ammo)
          this.ammo -= actual
          if (actual > 0) delivered.push({ unitId: req.unitId, type: req.type, amount: actual })
        } else if (req.type === SupplyType.RATIONS) {
          const actual = Math.min(req.amount, this.rations)
          this.rations -= actual
          if (actual > 0) delivered.push({ unitId: req.unitId, type: req.type, amount: actual })
        } else if (req.type === SupplyType.MEDKITS) {
          const actual = Math.min(req.amount, this.medkits)
          this.medkits -= actual
          if (actual > 0) delivered.push({ unitId: req.unitId, type: req.type, amount: actual })
        }
      } else {
        remaining.push(req)
      }
    }
    this.pendingSupplies = remaining
    return delivered
  }

  consumeRations(unitCount: number, deltaTick: number): boolean {
    this.tickAccumulator += deltaTick
    if (this.tickAccumulator >= RATION_CONSUMPTION_INTERVAL) {
      this.tickAccumulator -= RATION_CONSUMPTION_INTERVAL
      const needed = unitCount
      if (this.rations >= needed) {
        this.rations -= needed
        return true
      } else {
        this.rations = 0
        return false
      }
    }
    return true
  }

  getRations(): number { return this.rations }
  getAmmo(): number { return this.ammo }
  getMedkits(): number { return this.medkits }
  getPendingSupplies(): SupplyRequest[] { return this.pendingSupplies }

  addAmmo(amount: number): void { this.ammo += amount }
  addRations(amount: number): void { this.rations += amount }
  addMedkits(amount: number): void { this.medkits += amount }

  isRationsCritical(): boolean { return this.rations <= 10 }
  isAmmoCritical(): boolean { return this.ammo <= 50 }
  isMedkitsCritical(): boolean { return this.medkits <= 2 }

  getSupplyStatusReport(): string {
    return `[LOJİSTİK] Erzak: ${this.rations} | Mühimmat: ${this.ammo} | Medkit: ${this.medkits}`
  }

  serialize(): object {
    return {
      rations: this.rations, ammo: this.ammo, medkits: this.medkits,
      tickAccumulator: this.tickAccumulator, pendingSupplies: this.pendingSupplies,
    }
  }

  static deserialize(data: Record<string, unknown>): ResourceManager {
    const rm = new ResourceManager(
      data.rations as number, data.ammo as number, data.medkits as number,
    )
    rm.tickAccumulator = data.tickAccumulator as number
    rm.pendingSupplies = data.pendingSupplies as SupplyRequest[]
    return rm
  }
}
