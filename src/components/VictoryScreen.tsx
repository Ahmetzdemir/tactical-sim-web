import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { OPERATIONS } from '../engine/Scenario'

export function VictoryScreen() {
  const { state, setAppPhase } = useGameStore()
  const [webhookUrl, setWebhookUrl] = useState('https://discord.com/api/webhooks/1516465883948650659/__3Wu6Lxn1G3C8SF8G0ZLt0ONfr3AJOk4Gn7ULMAVrtPQjKhnxf96dvpRxvrWIxQw3Aq')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [showWebhook, setShowWebhook] = useState(false)

  if (!state || (state.phase !== 'victory' && state.phase !== 'defeat')) return null

  const isVictory = state.phase === 'victory'
  const op = OPERATIONS[state.activeScenarioIndex - 1]

  const aliveUnits = [...state.units.values()].filter(u => u.isAlive()).length
  const totalUnits = state.units.size
  const deadEnemies = [...state.enemies.values()].filter(e => !e.isAlive()).length
  const totalEnemies = state.enemies.size

  const handleSendWebhook = async () => {
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      setSendStatus('error')
      return
    }

    setSendStatus('sending')

    const difficulty = state.sandboxSettings?.difficulty || 'STANDARD'
    const difficultyLabel = difficulty === 'EASY' ? 'Kolay (Easy)' : difficulty === 'HARD' ? 'Zor (Hard)' : 'Standart (Standard)'
    const statusText = isVictory ? 'BAŞARILI 🏆' : 'BAŞARISIZ 💀'
    const color = isVictory ? 2278750 : 15680580

    const payload = {
      embeds: [
        {
          title: `⚔️ TAKTİKSEL HAREKAT SONUÇ RAPORU`,
          description: `Taktik Komutan sahada harekatı tamamladı. Detaylar telsiz ağı üzerinden karargaha iletilmiştir.`,
          color: color,
          fields: [
            { name: "📋 Senaryo/Harekat", value: op?.name || "Bilinmeyen Harekat", inline: true },
            { name: "🛡️ Zorluk Seviyesi", value: difficultyLabel, inline: true },
            { name: "⚡ Harekat Durumu", value: statusText, inline: true },
            { name: "🪖 Hayatta Kalan Timler", value: `${aliveUnits}/${totalUnits}`, inline: true },
            { name: "💥 İmha Edilen Düşman", value: `${deadEnemies}/${totalEnemies}`, inline: true },
            { name: "⏱️ Geçen Süre", value: state.time.toString(), inline: true }
          ],
          footer: { text: "Taktiksel Simülasyon Sistemi | Telsiz Ağı Raporlama" }
        }
      ]
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setSendStatus('success')
        setTimeout(() => {
          setShowWebhook(false)
          setSendStatus('idle')
        }, 2000)
      } else {
        setSendStatus('error')
      }
    } catch (err) {
      setSendStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
      <div className={`border max-w-md w-full ${isVictory ? 'border-mil-green glow-green' : 'border-mil-red glow-red'}`}>
        {/* Header */}
        <div className={`px-6 py-4 text-center ${isVictory ? 'bg-green-950/40' : 'bg-red-950/40'}`}>
          <div className="text-4xl mb-2">{isVictory ? '🏆' : '💀'}</div>
          <div className={`text-xl font-bold tracking-widest ${isVictory ? 'text-mil-green' : 'text-mil-red'}`}
            style={{ textShadow: isVictory ? '0 0 20px rgba(34,197,94,0.5)' : '0 0 20px rgba(239,68,68,0.5)' }}>
            {isVictory ? 'GÖREV BAŞARILI!' : 'GÖREV BAŞARISIZ'}
          </div>
          <div className="text-mil-dim text-sm mt-1">{op?.name}</div>
        </div>

        {/* Stats */}
        <div className="bg-mil-panel p-4 space-y-3 border-t border-mil-border">
          <div className="text-mil-cyan font-bold text-xs tracking-widest mb-2">
            [ HAREKÂT İSTATİSTİKLERİ ]
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border border-mil-border p-2">
              <div className="text-mil-dim">MEVCUT BİRLİKLER</div>
              <div className={`text-xl font-bold ${aliveUnits === 0 ? 'text-mil-red' : 'text-mil-green'}`}>
                {aliveUnits}/{totalUnits}
              </div>
            </div>
            <div className="border border-mil-border p-2">
              <div className="text-mil-dim">İMHA EDİLEN DÜŞMAN</div>
              <div className="text-xl font-bold text-mil-yellow">{deadEnemies}/{totalEnemies}</div>
            </div>
            <div className="border border-mil-border p-2">
              <div className="text-mil-dim">TUR</div>
              <div className="text-xl font-bold text-mil-cyan">
                {state.time.toString()}
              </div>
            </div>
            {state.hasCapturePoint && (
              <div className="border border-mil-border p-2">
                <div className="text-mil-dim">SAVUNMA</div>
                <div className="text-xl font-bold text-mil-yellow">
                  {state.defenseTimerCurrent}/{state.defenseTimerMax} tur
                </div>
              </div>
            )}
          </div>

          {isVictory && (
            <div className="text-mil-green text-xs text-center italic border-t border-mil-border pt-3">
              "Elinize sağlık komutanım. Bölge güvende."
            </div>
          )}
          {!isVictory && (
            <div className="text-mil-red text-xs text-center italic border-t border-mil-border pt-3">
              "Mevzi düştü. Geri çekilme kararı alınıyor..."
            </div>
          )}
        </div>

        {/* Discord Webhook Reporter */}
        <div className="p-4 bg-black/40 border-t border-mil-border flex flex-col gap-2 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-mil-cyan text-[10px] font-black tracking-widest uppercase">
              📡 DISCORD TELSİZ RAPORU
            </span>
            <button
              onClick={() => setShowWebhook(!showWebhook)}
              className="text-[9px] px-2 py-0.5 border border-mil-border/50 text-mil-text hover:text-mil-cyan hover:border-mil-cyan transition-colors"
            >
              {showWebhook ? '[ GİZLE ]' : '[ RAPOR GÖNDER ]'}
            </button>
          </div>

          {showWebhook && (
            <div className="space-y-2 mt-1">
              <input
                type="text"
                placeholder="Webhook URL'sini yapıştırın..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-2 py-1.5 bg-mil-bg border border-mil-border text-mil-textBright text-xs font-mono focus:outline-none focus:border-mil-cyan"
              />
              <button
                onClick={handleSendWebhook}
                disabled={sendStatus === 'sending'}
                className="w-full py-1.5 bg-cyan-950/20 text-mil-cyan border border-mil-cyan/50 hover:bg-mil-cyan hover:text-mil-bg transition-all text-[10px] font-bold uppercase tracking-wider"
              >
                {sendStatus === 'sending' ? 'RAPOR İLETİLİYOR...' : 
                 sendStatus === 'success' ? '✔ RAPOR BAŞARIYLA İLETİLDİ!' : 
                 sendStatus === 'error' ? '❌ HATA: GEÇERSİZ URL' : 'RAPOR GÖNDER'}
              </button>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex border-t border-mil-border">
          <button
            onClick={() => setAppPhase('scenario-select')}
            className="flex-1 py-3 text-sm font-bold text-mil-green border-r border-mil-border hover:bg-green-950/20 transition-all"
          >
            ▶ YENİ GÖREV
          </button>
          <button
            onClick={() => setAppPhase('menu')}
            className="flex-1 py-3 text-sm font-bold text-mil-dim hover:text-mil-green transition-all"
          >
            ⌂ ANA MENÜ
          </button>
        </div>
      </div>
    </div>
  )
}

