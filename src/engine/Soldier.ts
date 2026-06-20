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
  private tickAccumulator: number = 0
  private firePermission: FirePermission = FirePermission.UNDEFINED
  private engagementTargetId: string = ''
  private incapacitated: boolean = false
  private underFireDuration: number = 0
  private hasPortableRadio: boolean = true
  private constructionMaterials: number = 0
  private carryingUnitId: string = ''
  private carriedByUnitId: string = ''

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
    if (role === SoldierRole.ENGINEER) {
      this.constructionMaterials = 1
    }
  }

  update(deltaTick: number): void {
    if (!this.alive) return
    this.tickAccumulator += deltaTick
    // Erzak tüketimi: 12 turda bir
    if (this.tickAccumulator >= 12) {
      this.consumeRations()
      this.tickAccumulator -= 12
    }

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
    const incapStr = this.incapacitated ? (this.hp === 0 ? ' [DÜŞTÜ]' : ' [YARALANDI]') : ''
    const statusStr = this.hp === 0 ? '[DÜŞTÜ]' : '[AKTİF]'
    return `[${this.id}] ${this.name} (${roleName}) | HP:${this.hp}/${this.maxHp} | Moral:${this.morale} | Cph:${this.ammo} | Erzak:${this.rations} | Mdkt:${this.medkitCount}${coverStr}${incapStr} ${statusStr}`
  }

  override getRations(): number { return this.rations }
  override getMedkits(): number { return this.medkitCount }

  override resupply(ammo: number, rations: number, medkits: number, constructionMaterials: number = 0): void {
    this.ammo += ammo
    this.rations += rations
    this.medkitCount += medkits
    this.constructionMaterials += constructionMaterials
  }

  getConstructionMaterials(): number { return this.constructionMaterials }
  setConstructionMaterials(val: number): void { this.constructionMaterials = val }
  getCarryingUnitId(): string { return this.carryingUnitId }
  setCarryingUnitId(id: string): void { this.carryingUnitId = id }
  getCarriedByUnitId(): string { return this.carriedByUnitId }
  setCarriedByUnitId(id: string): void { this.carriedByUnitId = id }

  getRole(): SoldierRole { return this.role }
  isInCover(): boolean { return this.inCover }
  isIncapacitated(): boolean { return this.incapacitated }
  setInCover(cover: boolean): void { this.inCover = cover }

  setUnderFire(): void { this.underFireDuration = 3 }
  isUnderFire(): boolean { return this.underFireDuration > 0 }

  getFirePermission(): FirePermission { return this.firePermission }
  setFirePermission(p: FirePermission): void { this.firePermission = p }

  getEngagementTargetId(): string { return this.engagementTargetId }
  setEngagementTargetId(id: string): void { this.engagementTargetId = id }

  getHasPortableRadio(): boolean { return this.hasPortableRadio }
  setHasPortableRadio(val: boolean): void { this.hasPortableRadio = val }


  override takeDamage(dmg: number): void {
    this.hp = Math.max(0, this.hp - dmg)
    if (this.hp <= 20) {
      this.incapacitated = true
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
      firePermission: this.firePermission,
      engagementTargetId: this.engagementTargetId, incapacitated: this.incapacitated,
      ownerId: this.ownerId, actionPoints: this.actionPoints,
      hasPortableRadio: this.hasPortableRadio,
      constructionMaterials: this.constructionMaterials,
      carryingUnitId: this.carryingUnitId,
      carriedByUnitId: this.carriedByUnitId,
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
    s.firePermission = data.firePermission as FirePermission
    s.engagementTargetId = data.engagementTargetId as string
    s.incapacitated = data.incapacitated as boolean
    s.ownerId = data.ownerId as string
    s.actionPoints = data.actionPoints as number
    s.hasPortableRadio = data.hasPortableRadio !== undefined ? (data.hasPortableRadio as boolean) : true
    s.constructionMaterials = data.constructionMaterials !== undefined ? (data.constructionMaterials as number) : 0
    s.carryingUnitId = data.carryingUnitId !== undefined ? (data.carryingUnitId as string) : ''
    s.carriedByUnitId = data.carriedByUnitId !== undefined ? (data.carriedByUnitId as string) : ''
    return s
  }
}
