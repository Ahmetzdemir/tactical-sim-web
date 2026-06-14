// ============================================================
// EnemyUnit.ts — Port of EnemyUnit.h / EnemyUnit.cpp
// ============================================================

import { Unit } from './Unit'
import { EnemyType, EnemyState, Position, TerrainType } from './types'
import { MapGrid } from './MapGrid'

export class EnemyUnit extends Unit {
  private state: EnemyState = EnemyState.PATROL
  private type: EnemyType
  private targetId: string = ''
  private patrolTimer: number = 0
  private assaultTarget: Position = { x: 7, y: 7 }
  private hasAssaultTarget: boolean = false

  constructor(
    id: string,
    name: string,
    hp: number,
    morale: number,
    ammo: number,
    type: EnemyType = EnemyType.INFANTRY,
  ) {
    super(id, name, hp, morale, ammo)
    this.type = type
    this.state = EnemyState.PATROL
    this.patrolTimer = 0
  }

  update(deltaTick: number, map?: MapGrid, mapWidth: number = 15, mapHeight: number = 15): void {
    if (!this.alive) return
    this.patrolTimer += deltaTick

    // Assault target — move toward capture point
    if (this.state === EnemyState.ASSAULT_TARGET && this.hasAssaultTarget) {
      if (this.patrolTimer >= 3) {
        this.patrolTimer = 0
        const path = map ? map.findPath(this.pos, this.assaultTarget) : []
        if (path.length > 1) {
          this.pos.x = path[1].x
          this.pos.y = path[1].y
        } else {
          const dx = this.assaultTarget.x - this.pos.x
          const dy = this.assaultTarget.y - this.pos.y
          if (dx !== 0) this.pos.x += dx > 0 ? 1 : -1
          else if (dy !== 0) this.pos.y += dy > 0 ? 1 : -1
        }
      }
    } else if (this.state === EnemyState.PATROL) {
      // Random patrol movement every 5 ticks
      if (this.patrolTimer >= 5) {
        this.patrolTimer = 0
        const dirs = [-1, 0, 1]
        const dx = dirs[Math.floor(Math.random() * 3)]
        const dy = dirs[Math.floor(Math.random() * 3)]
        const nx = Math.max(0, Math.min(mapWidth - 1, this.pos.x + dx))
        const ny = Math.max(0, Math.min(mapHeight - 1, this.pos.y + dy))
        if (!map || map.getTerrain(nx, ny) !== TerrainType.MOUNTAIN) {
          this.pos.x = nx
          this.pos.y = ny
        }
      }
    }
  }

  getType(): EnemyType { return this.type }
  setType(t: EnemyType): void { this.type = t }
  getState(): EnemyState { return this.state }
  setState(s: EnemyState): void { this.state = s }
  getTargetId(): string { return this.targetId }
  setTargetId(id: string): void { this.targetId = id }
  setAssaultTarget(x: number, y: number): void {
    this.assaultTarget = { x, y }
    this.hasAssaultTarget = true
  }
  getHasAssaultTarget(): boolean { return this.hasAssaultTarget }
  getAssaultTarget(): Position { return { ...this.assaultTarget } }

  serialize(): object {
    return {
      id: this.id, name: this.name, type: this.type,
      hp: this.hp, maxHp: this.maxHp, morale: this.morale, ammo: this.ammo,
      alive: this.alive, pos: this.pos, state: this.state,
      targetId: this.targetId, assaultTarget: this.assaultTarget,
      hasAssaultTarget: this.hasAssaultTarget,
    }
  }

  static deserialize(data: Record<string, unknown>): EnemyUnit {
    const e = new EnemyUnit(
      data.id as string, data.name as string,
      data.hp as number, data.morale as number, data.ammo as number,
      data.type as EnemyType,
    )
    e.maxHp = data.maxHp as number
    e.alive = data.alive as boolean
    e.pos = data.pos as Position
    e.state = data.state as EnemyState
    e.targetId = data.targetId as string
    e.assaultTarget = data.assaultTarget as Position
    e.hasAssaultTarget = data.hasAssaultTarget as boolean
    return e
  }
}
