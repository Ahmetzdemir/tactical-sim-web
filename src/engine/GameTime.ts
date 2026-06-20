// ============================================================
// GameTime.ts — Port of GameTime struct from C++
// ============================================================

export class GameTime {
  day: number = 1
  hour: number = 6
  minute: number = 0
  turn: number = 1

  constructor(dayOrTurn = 1, hour?: number, minute?: number) {
    if (hour !== undefined && minute !== undefined) {
      this.day = dayOrTurn
      this.hour = hour
      this.minute = minute
      this.turn = 1
    } else {
      this.turn = dayOrTurn
      this.updateDHM()
    }
  }

  private updateDHM(): void {
    const totalMinutes = (this.turn - 1) + 6 * 60
    this.day = Math.floor(totalMinutes / 1440) + 1
    this.hour = Math.floor((totalMinutes % 1440) / 60)
    this.minute = totalMinutes % 60
  }

  static formatTime(totalTurns: number): string {
    return `Tur ${totalTurns}`
  }

  advance(turns: number): void {
    this.turn += turns
    this.updateDHM()
  }

  toString(): string {
    return `Tur ${this.turn}`
  }

  toTotalMinutes(): number {
    return this.turn
  }

  clone(): GameTime {
    const gt = new GameTime(this.turn)
    gt.day = this.day
    gt.hour = this.hour
    gt.minute = this.minute
    return gt
  }
}
