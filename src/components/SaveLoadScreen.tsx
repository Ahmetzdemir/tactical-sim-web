import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { SaveSystem, SaveSlot } from '../engine/SaveSystem'

export function SaveLoadScreen() {
  const { saveGame, loadGame, setAppPhase, state } = useGameStore()
  const [slots, setSlots] = useState<(SaveSlot | null)[]>([null, null, null])
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    SaveSystem.listSlots().then(savedSlots => {
      const slotMap: (SaveSlot | null)[] = [null, null, null]
      for (const s of savedSlots) {
        if (s.slot >= 1 && s.slot <= 3) slotMap[s.slot - 1] = s
      }
      setSlots(slotMap)
    })
  }, [])

  const handleSave = async (slot: number) => {
    setSaving(slot)
    await saveGame(slot)
    const updated = await SaveSystem.listSlots()
    const slotMap: (SaveSlot | null)[] = [null, null, null]
    for (const s of updated) {
      if (s.slot >= 1 && s.slot <= 3) slotMap[s.slot - 1] = s
    }
    setSlots(slotMap)
    setSaving(null)
  }

  const handleLoad = async (slot: number) => {
    const success = await loadGame(slot)
    if (success) setAppPhase('playing')
  }

  const handleDelete = async (slot: number) => {
    await SaveSystem.deleteSlot(slot)
    const updated = [...slots]
    updated[slot - 1] = null
    setSlots(updated)
  }

  return (
    <div className="h-full flex flex-col bg-mil-bg">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-mil-border bg-mil-panel">
        <button onClick={() => setAppPhase(state ? 'playing' : 'menu')} className="text-mil-dim hover:text-mil-green transition-colors text-sm">
          ◄ GERİ
        </button>
        <div className="text-mil-cyan font-bold tracking-widest text-sm flex-1 text-center">
          ╔══ KAYIT / YÜKLE ══╗
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {[1, 2, 3].map(slot => {
            const save = slots[slot - 1]
            return (
              <div key={slot} className="border border-mil-border bg-mil-panel p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-mil-dim text-xs">SLOT</span>
                  <span className="text-mil-yellow font-bold text-lg">{slot}</span>
                </div>

                {save ? (
                  <div className="space-y-1">
                    <div className="text-mil-textBright text-sm font-bold">{save.scenarioName}</div>
                    <div className="text-mil-dim text-xs">{save.timestamp}</div>
                  </div>
                ) : (
                  <div className="text-mil-dim text-xs italic py-3 text-center">— Boş Slot —</div>
                )}

                <div className="flex flex-col gap-2 mt-auto">
                  {state && (
                    <button
                      onClick={() => handleSave(slot)}
                      disabled={saving === slot}
                      className="w-full py-2 text-xs border border-mil-khakiLight text-mil-green hover:bg-green-950/20 transition-all disabled:opacity-50"
                    >
                      {saving === slot ? '⏳ Kaydediliyor...' : '💾 BURAYA KAYDET'}
                    </button>
                  )}
                  {save && (
                    <>
                      <button
                        onClick={() => handleLoad(slot)}
                        className="w-full py-2 text-xs border border-mil-cyanDim text-mil-cyan hover:bg-cyan-950/20 transition-all"
                      >
                        📂 YÜKLE
                      </button>
                      <button
                        onClick={() => handleDelete(slot)}
                        className="w-full py-2 text-xs border border-mil-border text-mil-dim hover:text-mil-red hover:border-mil-red transition-all"
                      >
                        🗑 SİL
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
