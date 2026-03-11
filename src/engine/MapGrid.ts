// ============================================================
// MapGrid.ts — Port of MapGrid class from C++
// ============================================================

import { Position, TerrainType } from './types'

export class MapGrid {
  private grid: TerrainType[][]
  readonly width: number
  readonly height: number

  constructor(w: number = 20, h: number = 20, existingGrid?: TerrainType[][]) {
    this.width = w
    this.height = h
    if (existingGrid) {
      this.grid = existingGrid
    } else {
      this.grid = []
      this.generateRandomMap()
    }
  }

  private generateRandomMap(): void {
    this.grid = []
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = []
      for (let x = 0; x < this.width; x++) {
        const r = Math.random()
        if (r < 0.50) this.grid[y][x] = TerrainType.OPEN
        else if (r < 0.65) this.grid[y][x] = TerrainType.FOREST
        else if (r < 0.78) this.grid[y][x] = TerrainType.CITY
        else if (r < 0.90) this.grid[y][x] = TerrainType.MOUNTAIN
        else this.grid[y][x] = TerrainType.BRIDGE
      }
    }
  }

  getTerrain(x: number, y: number): TerrainType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TerrainType.OPEN
    return this.grid[y][x]
  }

  setTerrain(x: number, y: number, t: TerrainType): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y][x] = t
    }
  }

  calcSignalFactor(a: Position, b: Position): number {
    const dx = Math.abs(a.x - b.x)
    const dy = Math.abs(a.y - b.y)
    const dist = Math.sqrt(dx * dx + dy * dy)
    let factor = Math.max(0.2, 1.0 - dist * 0.05)

    const terrain = this.getTerrain(b.x, b.y)
    if (terrain === TerrainType.MOUNTAIN) factor *= 0.6
    if (terrain === TerrainType.FOREST) factor *= 0.8
    if (terrain === TerrainType.CITY) factor *= 0.9

    return Math.min(1.0, Math.max(0.1, factor))
  }

  terrainToSymbol(t: TerrainType): string {
    switch (t) {
      case TerrainType.OPEN:     return '·'
      case TerrainType.CITY:     return '🏙'
      case TerrainType.FOREST:   return '🌲'
      case TerrainType.MOUNTAIN: return '⛰'
      case TerrainType.BRIDGE:   return '🌉'
    }
  }

  terrainToColor(t: TerrainType): string {
    switch (t) {
      case TerrainType.OPEN:     return '#1a2a1a'
      case TerrainType.CITY:     return '#1a1a2a'
      case TerrainType.FOREST:   return '#0d2a0d'
      case TerrainType.MOUNTAIN: return '#2a2520'
      case TerrainType.BRIDGE:   return '#1a2020'
    }
  }

  getGrid(): TerrainType[][] {
    return this.grid
  }

  serialize(): any {
    return {
      grid: this.grid.map(row => [...row]),
      width: this.width,
      height: this.height
    }
  }

  static deserialize(data: { grid: TerrainType[][], width: number, height: number }): MapGrid {
    return new MapGrid(data.width, data.height, data.grid)
  }
}
