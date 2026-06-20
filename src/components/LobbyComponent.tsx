import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { webSocketService } from '../services/websocket'

export function LobbyComponent() {
  const { userId, authError, initMultiplayer, setAppPhase } = useGameStore()
  const [loading, setLoading] = useState(false)
  const [roomIdInput, setRoomIdInput] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const roomId = useGameStore(s => s.multiplayerRoomId)
  const isHost = useGameStore(s => s.isHost)

  useEffect(() => {
    if (!userId && !authError) {
      initMultiplayer()
    }
  }, [userId, authError, initMultiplayer])

  useEffect(() => {
    if (roomId) {
      if (isHost) {
        setStatusMessage(`Oda oluşturuldu: ${roomId}. Rakibini bekle...`);
      } else {
        setStatusMessage(`Odaya bağlanıldı: ${roomId}`);
      }
      setLoading(false);
    }
  }, [roomId, isHost])

  const createRoom = () => {
    if (!userId) return
    setLoading(true)
    setStatusMessage('Oda oluşturuluyor...')
    webSocketService.send({ type: 'CREATE_ROOM', roomType: 'battle' })
  }

  const createDraftRoom = () => {
    if (!userId) return
    setLoading(true)
    setStatusMessage('1v1 Draft odası oluşturuluyor...')
    webSocketService.send({ type: 'CREATE_ROOM', roomType: 'draft' })
  }

  const findAndJoinRandomRoom = () => {
    if (!userId) return
    setLoading(true)
    setStatusMessage('Açık oda aranıyor...')
    webSocketService.send({ type: 'MATCHMAKE', roomType: 'battle' })
  }

  const joinSpecificRoom = () => {
    if (!roomIdInput || !userId) return
    setLoading(true)
    setStatusMessage('Odaya bağlanılıyor...')
    webSocketService.send({ type: 'JOIN_ROOM', roomId: roomIdInput })
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mil-bg font-mono">
      <div className="absolute inset-0 scanlines pointer-events-none opacity-50" />
      
      <div className="relative w-full max-w-md p-8 bg-mil-panel border-2 border-mil-cyan shadow-[0_0_30px_rgba(34,211,238,0.2)]">
        <div className="text-center mb-8">
          <div className="text-mil-cyan text-xs tracking-[0.3em] mb-2 uppercase">OPERASYON MERKEZİ</div>
          <h2 className="text-mil-textBright text-2xl font-black tracking-tighter">ÇEVRİMİÇİ LOBİ</h2>
        </div>

        <div className="space-y-6">
          <div className={`p-4 bg-black/40 border ${authError ? 'border-mil-red' : 'border-mil-border'} text-center`}>
            <div className="text-mil-dim text-[10px] uppercase mb-1">KİMLİK DOĞRULAMA</div>
            <div className={`text-xs truncate ${authError ? 'text-mil-red' : 'text-mil-green'}`}>
              {authError ? authError : (userId ? `ID: ${userId}` : "DOĞRULANIYOR...")}
            </div>
            {authError && (
              <button 
                onClick={() => initMultiplayer()}
                className="mt-2 text-[10px] text-mil-cyan underline hover:text-mil-cyanBright"
              >
                TEKRAR DENE
              </button>
            )}
          </div>

          {statusMessage && (
            <div className="p-2 border border-mil-yellow/30 bg-mil-yellow/5 text-mil-yellow text-center text-[10px] animate-pulse">
              {statusMessage}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              disabled={loading || !userId || !!authError}
              onClick={findAndJoinRandomRoom}
              className="w-full py-4 bg-mil-cyan text-mil-bg font-black tracking-widest hover:bg-mil-cyanBright transition-all uppercase disabled:opacity-50"
            >
              HIZLI EŞLEŞME BUL
            </button>

            <button
              disabled={loading || !userId || !!authError}
              onClick={createRoom}
              className="w-full py-3 border-2 border-mil-cyan/50 text-mil-cyan font-bold tracking-widest hover:bg-mil-cyan/10 transition-all uppercase disabled:opacity-50"
            >
              YENİ ODA OLUŞTUR
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-mil-border" /></div>
              <div className="relative flex justify-center text-[10px]"><span className="px-2 bg-mil-panel text-mil-dim uppercase">Veya</span></div>
            </div>

            <button
              disabled={loading || !userId || !!authError}
              onClick={createDraftRoom}
              className="w-full py-4 border-2 border-mil-yellow text-mil-yellow font-black tracking-widest hover:bg-mil-yellow hover:text-mil-darker transition-all uppercase disabled:opacity-50 shadow-[0_0_15px_rgba(255,215,0,0.2)]"
            >
              ⚔️ 1V1 DRAFT MODU BAŞLAT
            </button>
          </div>

          <div className="pt-6 border-t border-mil-border">
            <div className="flex gap-2">
              <input
                disabled={!!authError}
                type="text"
                placeholder="ODA KODU GİRİN..."
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                className="flex-1 bg-black border border-mil-border px-4 py-2 text-mil-cyan text-sm focus:outline-none focus:border-mil-cyanBright disabled:opacity-50"
              />
              <button
                disabled={loading || !userId || !!authError}
                onClick={joinSpecificRoom}
                className="px-6 bg-mil-panel border border-mil-cyan text-mil-cyan text-xs font-bold hover:bg-mil-cyan/20 transition-all disabled:opacity-50"
              >
                KATIL
              </button>
            </div>
          </div>

          <button
            onClick={() => setAppPhase('menu')}
            className="w-full py-2 text-mil-dim text-[10px] hover:text-mil-red transition-colors tracking-widest uppercase"
          >
            ◀ ANA MENÜYE DÖN
          </button>
        </div>
      </div>
    </div>
  )
}
