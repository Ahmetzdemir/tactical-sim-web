// ============================================================
// RadioSystem.ts — Port of RadioSystem
// ============================================================

import { DelayBreakdown, RadioMessage, ReportCategory, ReportType } from './types'
import { GameTime } from './GameTime'

interface PendingCommand {
  targetUnitId: string
  rawCommand: string
  deliveryTick: number
}

interface PendingReport {
  fromUnitId: string
  rawMessage: string
  deliveryTick: number
  sentTick: number
  corrupted: boolean
  type: ReportType
  category: ReportCategory
  engagementTargetId: string
  delayBreakdown?: DelayBreakdown
}

const NOISE_TAGS = ['[KRKRKk...]', '[SİNYAL KESİLDİ]', '[PARAZİT]', '[......]', '[KRKR--]', '[??]']

function corruptMessage(original: string): string {
  let result = ''
  for (const ch of original) {
    if (ch === ' ') { result += ' '; continue }
    const r = Math.random()
    if (r < 0.15) result += '#'
    else if (r < 0.30) result += '*'
    else result += ch
  }
  const tag = NOISE_TAGS[Math.floor(Math.random() * NOISE_TAGS.length)]
  return result + ' ' + tag
}

export class RadioSystem {
  private commandQueue: PendingCommand[] = []
  private reportQueue: PendingReport[] = []
  private signalStrength: number = 0.85
  private baseCorruptionChance: number = 0.05

  // Callback for when a new message is ready to display
  onMessage?: (msg: RadioMessage) => void

  constructor(private delayCalculator: (unitId: string) => DelayBreakdown) {}

  getPendingCount(): number {
    return this.commandQueue.length + this.reportQueue.length
  }

  private getDelayInfo(unitId: string): DelayBreakdown {
    if (unitId === 'HQ' || unitId.includes('İSTİHBARAT') || unitId.includes('SİSTEM') || unitId.includes('HAVA') || unitId.includes('BİLİNMEYEN')) {
       return { base: 1, distance: 0, weather: 0, stress: 0, queue: 0, total: 1 }
    }
    return this.delayCalculator(unitId)
  }

  sendCommand(targetUnitId: string, command: string, currentTick: number): number {
    const delayInfo = this.getDelayInfo(targetUnitId)
    const deliveryTick = currentTick + delayInfo.total
    this.commandQueue.push({ targetUnitId, rawCommand: command, deliveryTick })
    return delayInfo.total
  }

  queueReport(
    fromUnitId: string,
    message: string,
    currentTick: number,
    corruptChance = this.baseCorruptionChance,
    sentTick = -1,
    type = ReportType.REGULAR,
    targetId = '',
    category = ReportCategory.REGULAR,
  ): void {
    const willCorrupt = Math.random() < corruptChance || this.signalStrength < 0.4
    const delayInfo = this.getDelayInfo(fromUnitId)
    const delay = type === ReportType.ENGAGEMENT_REQUEST ? 0 : delayInfo.total
    const deliveryTick = currentTick + delay
    const finalMsg = willCorrupt ? corruptMessage(message) : message
    const sTick = sentTick === -1 ? currentTick : sentTick

    this.reportQueue.push({
      fromUnitId,
      rawMessage: finalMsg,
      deliveryTick,
      sentTick: sTick,
      corrupted: willCorrupt,
      type,
      category: willCorrupt ? ReportCategory.DANGER : category,
      engagementTargetId: targetId,
      delayBreakdown: delayInfo
    })
  }

  processQueue(
    currentTick: number,
    commandDispatcher: (unitId: string, cmd: string) => void,
    pendingEngagementCallback: (fromUnitId: string, engagementTargetId: string) => void,
  ): RadioMessage[] {
    const newMessages: RadioMessage[] = []
    let processed = true

    while (processed) {
      processed = false

      // Find oldest due command
      let bestCmdIdx = -1
      let bestCmdTick = currentTick + 1
      for (let i = 0; i < this.commandQueue.length; i++) {
        if (this.commandQueue[i].deliveryTick <= currentTick && this.commandQueue[i].deliveryTick < bestCmdTick) {
          bestCmdTick = this.commandQueue[i].deliveryTick
          bestCmdIdx = i
        }
      }

      // Find oldest due report
      let bestRepIdx = -1
      let bestRepTick = currentTick + 1
      for (let i = 0; i < this.reportQueue.length; i++) {
        if (this.reportQueue[i].deliveryTick <= currentTick && this.reportQueue[i].deliveryTick < bestRepTick) {
          bestRepTick = this.reportQueue[i].deliveryTick
          bestRepIdx = i
        }
      }

      if (bestCmdIdx >= 0 && (bestRepIdx < 0 || bestCmdTick <= bestRepTick)) {
        const cmd = this.commandQueue.splice(bestCmdIdx, 1)[0]
        commandDispatcher(cmd.targetUnitId, cmd.rawCommand)
        processed = true
        // Add a system message
        newMessages.push({
          id: crypto.randomUUID(),
          fromUnitId: '🖥️ SİSTEM',
          message: `Komut iletildi → ${cmd.targetUnitId}: "${cmd.rawCommand}"`,
          sentTick: cmd.deliveryTick,
          category: ReportCategory.MISSION_SUPPORT,
          corrupted: false,
          type: ReportType.REGULAR,
        })
      } else if (bestRepIdx >= 0) {
        const rep = this.reportQueue.splice(bestRepIdx, 1)[0]
        const msg: RadioMessage = {
          id: crypto.randomUUID(),
          fromUnitId: rep.fromUnitId,
          message: `[${GameTime.formatTime(rep.sentTick)}] ${rep.rawMessage}`,
          sentTick: rep.sentTick,
          category: rep.category,
          corrupted: rep.corrupted,
          type: rep.type,
          engagementTargetId: rep.engagementTargetId,
          delayBreakdown: rep.delayBreakdown
        }
        newMessages.push(msg)
        if (rep.type === ReportType.ENGAGEMENT_REQUEST) {
          pendingEngagementCallback(rep.fromUnitId, rep.engagementTargetId)
        }
        processed = true
      }
    }

    return newMessages
  }

  setSignalStrength(s: number): void { this.signalStrength = Math.max(0.1, Math.min(1.0, s)) }
  getSignalStrength(): number { return this.signalStrength }
  setBaseCorruptionChance(c: number): void { this.baseCorruptionChance = Math.max(0, Math.min(1.0, c)) }
  hasPendingCommands(): boolean { return this.commandQueue.length > 0 }
  hasPendingReports(): boolean { return this.reportQueue.length > 0 }

  serialize(): object {
    return { commandQueue: this.commandQueue, reportQueue: this.reportQueue, signalStrength: this.signalStrength }
  }

  static deserialize(
    data: Record<string, unknown>,
    delayCalculator: (unitId: string) => DelayBreakdown
  ): RadioSystem {
    const r = new RadioSystem(delayCalculator)
    r.commandQueue = data.commandQueue as PendingCommand[]
    r.reportQueue = data.reportQueue as PendingReport[]
    r.signalStrength = data.signalStrength as number
    return r
  }
}
