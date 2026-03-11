// ============================================================
// GameTime.ts — Port of GameTime struct from C++
// ============================================================

export class GameTime {
  day: number = 1
  hour: number = 6
  minute: number = 0

  constructor(day = 1, hour = 6, minute = 0) {
    this.day = day
    this.hour = hour
    this.minute = minute
  }

  static formatTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60) % 24
    const m = totalMinutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  advance(minutes: number): void {
    this.minute += minutes
    this.hour += Math.floor(this.minute / 60)
    this.minute = this.minute % 60
    this.day += Math.floor(this.hour / 24)
    this.hour = this.hour % 24
  }

  toString(): string {
    return `Gün ${this.day.toString().padStart(2, '0')} | ${this.hour.toString().padStart(2, '0')}:${this.minute.toString().padStart(2, '0')}`
  }

  toTotalMinutes(): number {
    return (this.day - 1) * 1440 + this.hour * 60 + this.minute
  }

  clone(): GameTime {
    return new GameTime(this.day, this.hour, this.minute)
  }
}
