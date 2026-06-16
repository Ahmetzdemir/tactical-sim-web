// ============================================================
// MapGrid.ts — Port of MapGrid class from C++
// ============================================================

import { Position, TerrainType } from './types'

export class MapGrid {
  private grid: TerrainType[][]
  readonly width: number
  readonly height: number

  constructor(w: number = 15, h: number = 15, existingGrid?: TerrainType[][]) {
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
      case TerrainType.OPEN:         return '·'
      case TerrainType.CITY:         return '🏙'
      case TerrainType.FOREST:       return '🌲'
      case TerrainType.MOUNTAIN:     return '⛰'
      case TerrainType.BRIDGE:       return '🌉'
      case TerrainType.FOB_COMMAND:  return '⛺'
      case TerrainType.FOB_HOSPITAL: return '🏥'
      case TerrainType.FOB_SUPPLY:   return '📦'
      case TerrainType.FOB_SANDBAGS: return '🧱'
    }
  }

  terrainToColor(t: TerrainType): string {
    switch (t) {
      case TerrainType.OPEN:         return '#1a2a1a'
      case TerrainType.CITY:         return '#1a1a2a'
      case TerrainType.FOREST:       return '#0d2a0d'
      case TerrainType.MOUNTAIN:     return '#2a2520'
      case TerrainType.BRIDGE:       return '#1a2020'
      case TerrainType.FOB_COMMAND:  return '#3a1a5a'
      case TerrainType.FOB_HOSPITAL: return '#1a5a3a'
      case TerrainType.FOB_SUPPLY:   return '#5a3a1a'
      case TerrainType.FOB_SANDBAGS: return '#3c3e3a'
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

  findPath(start: Position, end: Position, occupiedPositions?: Set<string>): Position[] {
    interface AStarNode {
      x: number
      y: number
      g: number
      h: number
      f: number
      parent: AStarNode | null
    }

    const openList: AStarNode[] = []
    const closedList = new Set<string>()

    const startNode: AStarNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: Math.abs(start.x - end.x) + Math.abs(start.y - end.y),
      f: Math.abs(start.x - end.x) + Math.abs(start.y - end.y),
      parent: null,
    }
    openList.push(startNode)

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f)
      const currentNode = openList.shift()!
      closedList.add(`${currentNode.x},${currentNode.y}`)

      if (currentNode.x === end.x && currentNode.y === end.y) {
        const path: Position[] = []
        let curr: AStarNode | null = currentNode
        while (curr !== null) {
          path.push({ x: curr.x, y: curr.y })
          curr = curr.parent
        }
        return path.reverse()
      }

      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ]

      for (const dir of directions) {
        const nx = currentNode.x + dir.dx
        const ny = currentNode.y + dir.dy

        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue

        const terrain = this.getTerrain(nx, ny)

        // FOB structures are impassable obstacles unless they are the destination
        if (
          (terrain === TerrainType.FOB_COMMAND ||
           terrain === TerrainType.FOB_HOSPITAL ||
           terrain === TerrainType.FOB_SUPPLY) &&
          !(nx === end.x && ny === end.y)
        ) {
          continue
        }

        const key = `${nx},${ny}`
        if (closedList.has(key)) continue
        if (occupiedPositions?.has(key) && !(nx === end.x && ny === end.y)) continue

        const stepCost = terrain === TerrainType.MOUNTAIN ? 3 : 1
        const gScore = currentNode.g + stepCost
        const hScore = Math.abs(nx - end.x) + Math.abs(ny - end.y)
        const fScore = gScore + hScore

        const existingNode = openList.find(node => node.x === nx && node.y === ny)
        if (existingNode && gScore >= existingNode.g) continue

        if (existingNode) {
          existingNode.g = gScore
          existingNode.f = fScore
          existingNode.parent = currentNode
        } else {
          openList.push({
            x: nx,
            y: ny,
            g: gScore,
            h: hScore,
            f: fScore,
            parent: currentNode,
          })
        }
      }
    }

    return []
  }

  static deserialize(data: { grid: TerrainType[][], width: number, height: number }): MapGrid {
    return new MapGrid(data.width, data.height, data.grid)
  }
}
