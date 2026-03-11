import { useGameStore } from '../store/useGameStore'
import { OPERATIONS } from '../engine/Scenario'

export function BriefingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state } = useGameStore()

  if (!isOpen || !state) return null

  const op = OPERATIONS[state.activeScenarioIndex - 1]
  if (!op) return null

  const restrictions = state.restrictions

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-[#0a0f0a] border-2 border-mil-border shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden flex flex-col">
        {/* Decorative scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

        {/* Header */}
        <div className="px-6 py-4 bg-mil-panel border-b-2 border-mil-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-mil-yellow text-2xl">📋</span>
            <div>
              <h2 className="text-mil-textBright font-black tracking-[0.2em] text-lg uppercase">HAREKAT BRİFİNGİ</h2>
              <p className="text-mil-dim text-[10px] tracking-widest uppercase">NATO / GİZLİ / KİŞİYE ÖZEL</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border border-mil-border text-mil-dim hover:text-mil-red hover:border-mil-red transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-h-[70vh] custom-scrollbar">
          {/* Operation Title */}
          <div className="space-y-2">
            <h3 className="text-mil-green font-bold text-xl tracking-tight border-b border-mil-green/30 pb-2">
              {op.name}
            </h3>
            <p className="text-mil-text text-sm leading-relaxed italic">
              "{op.desc}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Objectives & Restrictions */}
            <div className="space-y-6">
              <section>
                <h4 className="text-mil-yellow font-black text-xs tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-mil-yellow rounded-full animate-pulse" />
                  GÜNCEL HEDEF
                </h4>
                <div className="bg-mil-panel p-4 border border-mil-yellow/30 text-mil-textBright text-sm font-bold leading-relaxed">
                  {state.currentObjective || op.objective}
                </div>
              </section>

              {(restrictions?.artilleryDisabled || restrictions?.airstrikeDisabled) && (
                <section>
                  <h4 className="text-mil-red font-black text-xs tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-mil-red rounded-full" />
                    OPERASYONEL KISITLAMALAR
                  </h4>
                  <div className="bg-red-950/20 p-3 border border-mil-red/30 space-y-2">
                    {restrictions?.artilleryDisabled && (
                      <p className="text-mil-red text-[11px] font-bold">⚠️ TOPÇU DESTEĞİ SAĞLANAMAZ (MENZİL DIŞI/ARAZİ)</p>
                    )}
                    {restrictions?.airstrikeDisabled && (
                      <p className="text-mil-red text-[11px] font-bold">⚠️ HAVA DESTEĞİ KULLANILAMAZ (HAVA MUHALEFETİ)</p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Order of Battle */}
            <div className="space-y-6">
              <section>
                <h4 className="text-mil-cyan font-black text-xs tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-mil-cyan rounded-full" />
                  GÖREV GÜCÜ (OoB)
                </h4>
                <div className="bg-mil-panel p-4 border border-mil-cyan/30">
                  <ul className="space-y-2">
                    {op.taskForce?.map((unit, i) => (
                      <li key={i} className="flex items-center gap-3 text-mil-textBright text-xs border-b border-mil-border/30 pb-1">
                        <span className="text-mil-cyan">►</span>
                        {unit}
                      </li>
                    )) || (
                      <li className="text-mil-dim text-xs">Birim listesi yüklenemedi.</li>
                    )}
                  </ul>
                  <div className="mt-4 pt-3 border-t border-mil-cyan/30 text-[10px] text-mil-dim italic">
                    * Birlikler belirtilen koordinatlara intikal etmiştir.
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-mil-panel border-t-2 border-mil-border flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-mil-green text-black font-black tracking-widest text-sm hover:bg-mil-greenDim transition-all shadow-[0_4px_0_#15803d] active:translate-y-1 active:shadow-none"
          >
            ANLAŞILDI, GÖREVE BAŞLA!
          </button>
        </div>
      </div>
    </div>
  )
}
