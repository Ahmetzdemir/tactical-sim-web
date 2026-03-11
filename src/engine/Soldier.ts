// ============================================================
// Soldier.ts — Port of Soldier.h / Soldier.cpp
// ============================================================

import { Unit } from './Unit'
import { SoldierRole, FirePermission, roleToString } from './types'

export class Soldier extends Unit {
  private role: SoldierRole
  private rations: number
  private medkitCount: number
  private inCover: boolean = false
  private disobedient: boolean = false
  private tickAccumulator: number = 0
  private firePermission: FirePermission = FirePermission.UNDEFINED
  private engagementTargetId: string = ''
  private incapacitated: boolean = false
  private underFireDuration: number = 0

  constructor(
    id: string,
    name: string,
    role: SoldierRole,
    hp = 100,
    morale = 80,
    ammo = 60,
    rations = 5,
    medkits = 1,
  ) {
    super(id, name, hp, morale, ammo)
    this.role = role
    this.rations = rations
    this.medkitCount = medkits
  }

  update(deltaTick: number): void {
    if (!this.alive) return
    this.tickAccumulator += deltaTick
    // Erzak tüketimi: 60 dakikada bir
    if (this.tickAccumulator >= 60) {
      this.consumeRations()
      this.tickAccumulator -= 60
    }
    this.checkDisobedience()

    if (this.underFireDuration > 0) {
      this.underFireDuration -= deltaTick
    }

    // Düşük HP'de medkit kullan
    if (this.hp < 50 && this.medkitCount > 0) {
      const heal = Math.min(30, 100 - this.hp)
      this.hp += heal
      this.medkitCount--
      this.adjustMorale(10)
    }
  }

  private consumeRations(): void {
    if (this.rations > 0) {
      this.rations--
    } else {
      this.adjustMorale(-5)
    }
  }

  private checkDisobedience(): void {
    this.disobedient = this.morale < 20
  }

  override receiveCommand(command: string): void {
    if (command === 'siper') {
      this.inCover = true
    } else if (command === 'bekle') {
      this.inCover = false
    } else if (command === 'ileri' || command === 'geri') {
      this.inCover = false
    }
    super.receiveCommand(command)
  }

  override generateStatusReport(): string {
    const roleName = roleToString(this.role)
    const coverStr = this.inCover ? ' [SİPER]' : ''
    const incapStr = this.incapacitated ? ' [YARALANDI]' : ''
    const statusStr = !this.alive ? '[DÜŞTÜ]' : this.disobedient ? '[İTAATSİZ]' : '[AKTİF]'
    return `[${this.id}] ${this.name} (${roleName}) | HP:${this.hp}/${this.maxHp} | Moral:${this.morale} | Cph:${this.ammo} | Erzak:${this.rations} | Mdkt:${this.medkitCount}${coverStr}${incapStr} ${statusStr}`
  }

  override getRations(): number { return this.rations }
  override getMedkits(): number { return this.medkitCount }

  override resupply(ammo: number, rations: number, medkits: number): void {
    this.ammo += ammo
    this.rations += rations
    this.medkitCount += medkits
  }

  getRole(): SoldierRole { return this.role }
  isInCover(): boolean { return this.inCover }
  isDisobedient(): boolean { return this.disobedient }
  isIncapacitated(): boolean { return this.incapacitated }
  setInCover(cover: boolean): void { this.inCover = cover }

  setUnderFire(): void { this.underFireDuration = 3 }
  isUnderFire(): boolean { return this.underFireDuration > 0 }

  getFirePermission(): FirePermission { return this.firePermission }
  setFirePermission(p: FirePermission): void { this.firePermission = p }

  getEngagementTargetId(): string { return this.engagementTargetId }
  setEngagementTargetId(id: string): void { this.engagementTargetId = id }

  override takeDamage(dmg: number): void {
    this.hp = Math.max(0, this.hp - dmg)
    if (this.hp <= 20 && this.hp > 0) {
      this.incapacitated = true
    }
    if (this.hp <= 0) {
      this.alive = false
      this.incapacitated = false
    }
  }

  restoreHealth(h: number): void {
    if (this.alive && this.incapacitated) {
      this.hp = Math.min(this.maxHp, this.hp + h)
      if (this.hp > 20) this.incapacitated = false
    }
  }

  // RNG tabanlı isabet yuvarlama
  rollAttack(): number {
    return Math.floor(Math.random() * 100) + 1
  }

  // Serialize for save system
  serialize(): object {
    return {
      id: this.id, name: this.name, role: this.role,
      hp: this.hp, maxHp: this.maxHp, morale: this.morale, ammo: this.ammo,
      rations: this.rations, medkitCount: this.medkitCount,
      alive: this.alive, pos: this.pos, inCover: this.inCover,
      disobedient: this.disobedient, firePermission: this.firePermission,
      engagementTargetId: this.engagementTargetId, incapacitated: this.incapacitated,
      ownerId: this.ownerId, actionPoints: this.actionPoints,
    }
  }

  static deserialize(data: ReturnType<Soldier['serialize']> & Record<string, unknown>): Soldier {
    const s = new Soldier(
      data.id as string, data.name as string, data.role as SoldierRole,
      data.hp as number, data.morale as number, data.ammo as number,
      data.rations as number, data.medkitCount as number,
    )
    s.maxHp = data.maxHp as number
    s.alive = data.alive as boolean
    s.pos = data.pos as { x: number; y: number }
    s.inCover = data.inCover as boolean
    s.disobedient = data.disobedient as boolean
    s.firePermission = data.firePermission as FirePermission
    s.engagementTargetId = data.engagementTargetId as string
    s.incapacitated = data.incapacitated as boolean
    s.ownerId = data.ownerId as string
    s.actionPoints = data.actionPoints as number
    return s
  }
}
