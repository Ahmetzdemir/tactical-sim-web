import React from 'react'
import { useGameStore } from '../store/useGameStore'
import { SoldierRole } from '../engine/types'

const UNIT_ROSTER = [
  { role: SoldierRole.RIFLEMAN, name: 'Standart Piyade', cost: 100, desc: 'Ucuz ve dengeli savunma gücü.' },
  { role: SoldierRole.ENGINEER, name: 'İstihkam / Mühendis', cost: 150, desc: 'Zırh delici hasar. Tanklara karşı etkili.' },
  { role: SoldierRole.MG, name: 'Makineli Tüfek (MG)', cost: 150, desc: 'Baskı ateşi ile düşman moralini kırar.' },
  { role: SoldierRole.SNIPER, name: 'Keskin Nişancı', cost: 200, desc: '%30 Kritik vuruş. Uzun menzil.' },
  { role: SoldierRole.ARMORED, name: 'Zırhlı / Tank', cost: 400, desc: 'Ağır zırh ve devasa ateş gücü.' },
]

const DraftingMenu: React.FC = () => {
  const { 
    draftedUnits, draftedMaterials, addDraftedUnit, removeDraftedUnit, 
    addDraftedMaterial, removeDraftedMaterial, startSandbox, sandboxSettings, setAppPhase 
  } = useGameStore()
  
  const totalBudget = 1000
  const materialCost = 20
  
  const currentSpent = draftedUnits.reduce((sum, u) => {
    const info = UNIT_ROSTER.find(r => r.role === u.getRole())
    return sum + (info?.cost || 0)
  }, 0) + (draftedMaterials * materialCost)

  const handleStart = () => {
    if (draftedUnits.length === 0) return
    if (sandboxSettings) {
      startSandbox(sandboxSettings, draftedUnits)
    }
  }

  return (
    <div className="fixed inset-0 bg-mil-darker flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-5xl h-[80vh] bg-mil-panel border-2 border-mil-yellow shadow-[0_0_20px_rgba(255,215,0,0.1)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-mil-yellow/10 border-b-2 border-mil-yellow px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-mil-yellow font-black text-xl tracking-tighter uppercase">Görev Gücü Oluşturma (Drafting)</h2>
            <p className="text-mil-yellow/60 text-[10px] font-bold tracking-widest">MUHAREBE DÜZENİ HAZIRLIĞI</p>
          </div>
          <div className="flex gap-4 items-center">
             <div className="text-right">
                <div className="text-[10px] text-white/40 font-bold uppercase">Kalan Bütçe</div>
                <div className={`text-xl font-black ${totalBudget - currentSpent < 0 ? 'text-mil-red animate-pulse' : 'text-mil-textBright'}`}>
                  {totalBudget - currentSpent} OP
                </div>
             </div>
             <div className="w-[2px] h-8 bg-mil-yellow/30" />
             <div className="text-right">
                <div className="text-[10px] text-white/40 font-bold uppercase">Tim Sayısı</div>
                <div className="text-xl font-black text-mil-textBright">{draftedUnits.length}/6</div>
             </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Available Units */}
          <div className="w-1/2 p-6 border-r border-mil-yellow/20 overflow-y-auto space-y-4">
            <h3 className="text-white/40 text-[10px] font-black tracking-widest uppercase mb-4">Mevcut Birlikler</h3>
            {UNIT_ROSTER.map((u) => {
                const canAfford = (totalBudget - currentSpent) >= u.cost
                const canAdd = draftedUnits.length < 6 && canAfford
                return (
                  <div key={u.role} className="bg-white/5 border border-white/10 p-4 flex justify-between items-center group hover:border-mil-yellow/50 transition-all">
                    <div>
                      <div className="text-mil-textBright font-black text-sm">{u.name}</div>
                      <div className="text-[10px] text-white/60 font-bold mb-1 italic">{u.desc}</div>
                      <div className="text-mil-yellow font-black text-xs">{u.cost} OP</div>
                    </div>
                    <button
                      disabled={!canAdd}
                      onClick={() => addDraftedUnit(u.role)}
                      className={`px-4 py-2 font-black text-xs border-2 transition-all ${
                        canAdd 
                        ? 'border-mil-yellow text-mil-yellow hover:bg-mil-yellow hover:text-mil-darker' 
                        : 'border-white/10 text-white/20 cursor-not-allowed'
                      }`}
                    >
                      EKLE [+]
                    </button>
                  </div>
                )
            })}

            {/* Extra Materials Option */}
            <div className="bg-white/5 border border-white/10 p-4 flex justify-between items-center group hover:border-mil-yellow/50 transition-all">
              <div>
                <div className="text-mil-textBright font-black text-sm">Ekstra İnşaat Malzemesi</div>
                <div className="text-[10px] text-white/60 font-bold mb-1 italic">Savaş alanında FOB ve mevzi inşası için malzeme stoku sağlar.</div>
                <div className="text-mil-yellow font-black text-xs">{materialCost} OP / Adet</div>
              </div>
              <button
                disabled={(totalBudget - currentSpent) < materialCost}
                onClick={addDraftedMaterial}
                className={`px-4 py-2 font-black text-xs border-2 transition-all ${
                  (totalBudget - currentSpent) >= materialCost
                  ? 'border-mil-yellow text-mil-yellow hover:bg-mil-yellow hover:text-mil-darker' 
                  : 'border-white/10 text-white/20 cursor-not-allowed'
                }`}
              >
                EKLE [+]
              </button>
            </div>
          </div>

          {/* Right: Selected Squad */}
          <div className="w-1/2 p-6 bg-black/20 overflow-y-auto flex flex-col">
            <h3 className="text-white/40 text-[10px] font-black tracking-widest uppercase mb-4">Mevcut Görev Gücü (Siz)</h3>
            <div className="flex-1 space-y-2">
              {draftedUnits.length === 0 && draftedMaterials === 0 && (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 text-white/20 font-bold text-sm">
                  BOŞ - BİRLİK SEÇİNİZ
                </div>
              )}
              {draftedUnits.map((u, idx) => (
                <div key={u.getId()} className="bg-mil-cyan/5 border border-mil-cyan/20 p-3 flex justify-between items-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3">
                    <span className="text-mil-cyan font-black text-xs opacity-50">#{idx+1}</span>
                    <span className="text-mil-textBright font-bold text-sm">{u.getName()}</span>
                  </div>
                  <button 
                    onClick={() => removeDraftedUnit(u.getId())}
                    className="text-mil-red hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Extra Materials Display */}
              {draftedMaterials > 0 && (
                <div className="bg-mil-yellow/5 border border-mil-yellow/20 p-3 flex justify-between items-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3">
                    <span className="text-mil-yellow text-xl">🔧</span>
                    <div>
                      <span className="text-mil-textBright font-bold text-sm">Ekstra İnşaat Malzemesi</span>
                      <span className="text-[10px] text-white/40 ml-2 font-bold">(Miktar: {draftedMaterials})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={addDraftedMaterial}
                      disabled={(totalBudget - currentSpent) < materialCost}
                      className="px-2.5 py-0.5 border border-mil-yellow/40 hover:border-mil-yellow text-mil-yellow hover:bg-mil-yellow/10 font-bold rounded text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                    <button 
                      onClick={removeDraftedMaterial}
                      className="px-2.5 py-0.5 border border-mil-red/40 hover:border-mil-red text-mil-red hover:bg-mil-red/10 font-bold rounded text-sm transition-all"
                    >
                      -
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-mil-yellow/20 space-y-3">
              <button
                disabled={draftedUnits.length === 0 || currentSpent > totalBudget}
                onClick={handleStart}
                className={`w-full py-4 font-black tracking-[0.2em] transition-all shadow-lg ${
                  draftedUnits.length > 0 && currentSpent <= totalBudget
                  ? 'bg-mil-yellow text-mil-darker hover:bg-white'
                  : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/10'
                }`}
              >
                OPERASYONU BAŞLAT
              </button>
              <button 
                onClick={() => setAppPhase('sandbox-lobby')}
                className="w-full py-2 text-white/40 text-[10px] font-black tracking-widest hover:text-white transition-all uppercase"
              >
                GERİ DÖN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DraftingMenu
