import { RadioMessage, ReportCategory } from '../engine/types'

interface Props {
  messages: RadioMessage[]
}

function categoryColor(category: ReportCategory, corrupted: boolean): string {
  if (corrupted) return 'text-mil-red'
  switch (category) {
    case ReportCategory.DANGER: return 'text-mil-red'
    case ReportCategory.SUCCESS: return 'text-mil-green'
    case ReportCategory.MISSION_SUPPORT: return 'text-mil-cyan'
    default: return 'text-mil-yellow'
  }
}

function categoryBorder(category: ReportCategory, corrupted: boolean): string {
  if (corrupted) return 'border-l-mil-red'
  switch (category) {
    case ReportCategory.DANGER: return 'border-l-mil-red'
    case ReportCategory.SUCCESS: return 'border-l-mil-green'
    case ReportCategory.MISSION_SUPPORT: return 'border-l-mil-cyan'
    default: return 'border-l-mil-yellow'
  }
}

function categoryBg(category: ReportCategory, corrupted: boolean): string {
  if (corrupted) return 'bg-red-950/30'
  switch (category) {
    case ReportCategory.DANGER: return 'bg-red-950/20'
    case ReportCategory.SUCCESS: return 'bg-green-950/20'
    case ReportCategory.MISSION_SUPPORT: return 'bg-cyan-950/20'
    default: return 'bg-yellow-950/10'
  }
}

function renderMessageText(msg: RadioMessage) {
  let text = msg.message
  let prefix = ''
  if (text.startsWith('[') && text.indexOf(']') > 0) {
    prefix = text.substring(0, text.indexOf(']') + 1)
    text = text.substring(text.indexOf(']') + 1)
  }

  if (msg.delayBreakdown && text.includes('Beklenen teslimat:')) {
    const parts = text.split('Beklenen teslimat:')
    return (
      <>
        {prefix && <span className="text-mil-dim opacity-60 mr-1">{prefix}</span>}
        {parts[0]}
        Beklenen teslimat: 
        <span className="relative group inline-block ml-1 cursor-help border-b border-dotted border-mil-cyan text-mil-cyan">
          {parts[1]}
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 p-2 bg-mil-panel border border-mil-border text-[10px] text-mil-text z-[100] shadow-lg pointer-events-none">
            <div className="text-mil-textBright font-bold border-b border-mil-bg pb-1 mb-1">Gecikme Analizi</div>
            <div className="flex justify-between"><span>Temel Süre:</span><span>{msg.delayBreakdown.base}m</span></div>
            <div className="flex justify-between text-mil-yellow"><span>Mesafe/Arazi:</span><span>+{msg.delayBreakdown.distance}m</span></div>
            <div className="flex justify-between text-mil-cyan"><span>Hava Durumu:</span><span>+{msg.delayBreakdown.weather}m</span></div>
            <div className="flex justify-between text-mil-red"><span>Çatışma Stresi:</span><span>+{msg.delayBreakdown.stress}m</span></div>
            <div className="flex justify-between text-mil-dim"><span>Telsiz Kuyruğu:</span><span>+{msg.delayBreakdown.queue}m</span></div>
            <div className="flex justify-between font-bold mt-1 pt-1 border-t border-mil-bg text-mil-green"><span>TOPLAM:</span><span>{msg.delayBreakdown.total} dk</span></div>
          </div>
        </span>
      </>
    )
  }

  return (
    <>
      {prefix && <span className="text-mil-dim opacity-60 mr-1">{prefix}</span>}
      {text}
    </>
  )
}

export function RadioLog({ messages }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-3 py-3 border-b border-mil-border bg-mil-panel flex items-center gap-2 flex-shrink-0">
        <span className="text-mil-green text-lg">📡</span>
        <span className="text-mil-textBright text-sm font-bold tracking-widest leading-none">TELSİZ LOGU</span>
        <span className="ml-auto text-mil-dim text-xs">{messages.length}</span>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-3 py-1 border-b border-mil-border bg-mil-bg flex-shrink-0">
        <span className="text-mil-red text-xs">●TEHDİT</span>
        <span className="text-mil-green text-xs">●BAŞARI</span>
        <span className="text-mil-cyan text-xs">●DESTEK</span>
        <span className="text-mil-yellow text-xs">●NORMAL</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 p-2">
        {messages.length === 0 && (
          <div className="text-mil-dim text-xs text-center py-4">
            — Telsiz bağlantısı bekleniyor... —
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`radio-entry border-l-2 pl-2 py-1.5 text-xs ${categoryBorder(msg.category, msg.corrupted)} ${categoryBg(msg.category, msg.corrupted)}`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-mil-dim text-xs opacity-70 font-bold">
                {msg.fromUnitId}
              </span>
              {msg.corrupted && (
                <span className="text-mil-red text-xs">[PARAZİT]</span>
              )}
            </div>
            <div className={`leading-relaxed ${msg.corrupted ? 'corrupted-text' : ''} ${categoryColor(msg.category, msg.corrupted)}`}>
              {renderMessageText(msg)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
