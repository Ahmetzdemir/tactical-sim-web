// ============================================================
// Unit.ts — Abstract base class (port of Unit.h / Unit.cpp)
// ============================================================

import { Position } from './types'

export abstract class Unit {
  protected id: string
  protected name: string
  protected hp: number
  protected maxHp: number
  protected morale: number // 0-100
  protected ammo: number
  protected alive: boolean
  protected pos: Position
  protected pendingOrders: string[] = []
  protected ownerId: string = 'host' // 'host' or 'guest'
  protected actionPoints: number = 2

  constructor(id: string, name: string, hp: number, morale: number, ammo: number) {
    this.id = id
    this.name = name
    this.hp = hp
    this.maxHp = hp
    this.morale = morale
    this.ammo = ammo
    this.alive = true
    this.pos = { x: 0, y: 0 }
  }

  abstract update(deltaTick: number): void

  receiveCommand(command: string): void {
    this.pendingOrders.push(command)
  }

  generateStatusReport(): string {
    const status = this.alive ? 'AKTIF' : 'DÜŞTÜ'
    return `[${this.id}] ${this.name} | HP:${this.hp}/${this.maxHp} | Moral:${this.morale} | Cephane:${this.ammo} | ${status}`
  }

  getId(): string { return this.id }
  getName(): string { return this.name }
  getHp(): number { return this.hp }
  getMaxHp(): number { return this.maxHp }
  getMorale(): number { return this.morale }
  getAmmo(): number { return this.ammo }
  isAlive(): boolean { return this.alive }
  getPosition(): Position { return { ...this.pos } }
  setPosition(p: Position): void { this.pos = { ...p } }
  getOwnerId(): string { return this.ownerId }
  setOwnerId(id: string): void { this.ownerId = id }
  getAP(): number { return this.actionPoints }
  setAP(ap: number): void { this.actionPoints = ap }
  consumeAP(amount: number): void { this.actionPoints = Math.max(0, this.actionPoints - amount) }
  resetAP(): void { this.actionPoints = 2 }
  getRations(): number { return 0 }
  getMedkits(): number { return 0 }

  takeDamage(dmg: number): void {
    this.hp = Math.max(0, this.hp - dmg)
    if (this.hp <= 0) this.alive = false
  }

  adjustMorale(delta: number): void {
    this.morale = Math.max(0, Math.min(100, this.morale + delta))
  }

  consumeAmmo(rounds: number): void {
    this.ammo = Math.max(0, this.ammo - rounds)
  }

  resupply(ammo: number, _: number, __: number): void {
    this.ammo += ammo
  }

  protected clampMorale(): void {
    this.morale = Math.max(0, Math.min(100, this.morale))
  }
}
