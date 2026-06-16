import { useGameStore } from '../store/useGameStore'

export function EngagementModal() {
  const { state, issueFirePermission } = useGameStore()

  if (!state?.pendingEngagement) return null

  const { unitName, enemyId, enemyName } = state.pendingEngagement
  const enemy = state.enemies.get(enemyId)

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none w-full max-w-md px-4">
      <div className="border border-mil-yellow bg-mil-panel w-full glow-yellow pointer-events-auto shadow-2xl">
        {/* Header */}
        <div className="bg-yellow-950/40 px-4 py-2 border-b border-mil-yellow flex items-center gap-2">
          <span className="text-mil-yellow animate-pulse">⚠</span>
          <span className="text-mil-yellow font-bold text-sm tracking-widest">ATIŞA İZİN GEREKLİ</span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="text-mil-text text-xs leading-relaxed">
            <span className="text-mil-green font-bold">{unitName}</span> birimi menzilinde düşman tespit etti:
          </div>

          <div className="border border-mil-red bg-red-950/20 p-3">
            <div className="text-mil-red font-bold text-sm">{enemyName}</div>
            <div className="text-mil-dim text-xs">[{enemyId}]</div>
            {enemy && (
              <div className="mt-2 text-xs text-mil-text">
                HP: {enemy.getHp()}/{enemy.getMaxHp()} | Moral: {enemy.getMorale()}
              </div>
            )}
          </div>

          <div className="text-mil-yellow text-xs font-bold">
            KOMUTANINIZI BEKLİYORUZ!
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-0 border-t border-mil-border">
          <button
            id="btn-fire-permit"
            onClick={() => issueFirePermission('ATES_IZNI_VERILDI')}
            className="flex-1 py-3 text-sm font-bold text-mil-green border-r border-mil-border hover:bg-green-950/30 transition-all"
          >
            ✅ İZİN VER
          </button>
          <button
            id="btn-fire-hold"
            onClick={() => issueFirePermission('BEKLEMEDE_KAL')}
            className="flex-1 py-3 text-sm font-bold text-mil-yellow border-r border-mil-border hover:bg-yellow-950/20 transition-all"
          >
            ⏸ BEKLE
          </button>
          <button
            id="btn-fire-deny"
            onClick={() => issueFirePermission('ATES_YASAK')}
            className="flex-1 py-3 text-sm font-bold text-mil-red hover:bg-red-950/20 transition-all"
          >
            ❌ YASAK
          </button>
        </div>
      </div>
    </div>
  )
}
