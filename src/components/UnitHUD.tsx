import { useGameStore } from '../store/useGameStore'
import { Soldier } from '../engine/Soldier'
import { EnemyUnit } from '../engine/EnemyUnit'
import { SoldierRole, FirePermission, SupplyType, roleToString, enemyTypeToString, enemyStateToString } from '../engine/types'
import { CombatSystem } from '../engine/CombatSystem'
import { NatoUnitIcon } from './NatoUnitIcon'

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const critical = pct < 25
  return (
    <div className="w-full h-2 bg-mil-border rounded-none relative overflow-hidden">
      <div
        className={`hp-bar h-full ${critical ? 'pulse-red' : ''}`}
        style={{ width: `${pct}%`, backgroundColor: critical ? '#ef4444' : color }}
      />
    </div>
  )
}

function InventoryIcon({ icon, count, label, critical }: { icon: string; count: number; label: string; critical?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 p-2 border ${critical && count <= 1 ? 'border-mil-red bg-red-950/20' : 'border-mil-border bg-mil-panel'}`}
      title={`${label}: ${count}`}
    >
      <span className="text-lg">{icon}</span>
      <span className={`text-xs font-bold ${critical && count <= 1 ? 'text-mil-red pulse-red' : 'text-mil-textBright'}`}>{count}</span>
      <span className="text-mil-dim text-xs">{label}</span>
    </div>
  )
}

function getPassiveAbility(role: SoldierRole): string {
  switch (role) {
    case SoldierRole.MG:
      return 'Baskı Ateşi (Düşman moralini düşürür)'
    case SoldierRole.SNIPER:
      return 'Hassas Atış (%30 Kritik Vuruş Şansı)'
    case SoldierRole.ENGINEER:
      return 'Zırh Delici (+Hasar Bonusu)'
    case SoldierRole.ARMORED:
      return 'Gelişmiş Zırh (Hasar Azaltma)'
    case SoldierRole.MEDIC:
      return 'Hızlı Müdahale (Gelişmiş İyileştirme)'
    default:
      return 'Standart Muharebe Eğitimi'
  }
}


export function UnitHUD() {
  const { state, selectedUnitId, selectedEnemyId, requestSupply, sendCommand, fireAtEnemy, setAttackMode } = useGameStore()

  if (!state) return null

  const selectedUnit = selectedUnitId ? (state.units.get(selectedUnitId) as Soldier | undefined) : null
  const selectedEnemy = selectedEnemyId ? (state.enemies.get(selectedEnemyId) as EnemyUnit | undefined) : null

  if (selectedEnemy && !selectedUnit) {
    // Show enemy info
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-mil-border bg-mil-panel flex items-center gap-2 flex-shrink-0">
          <span className="text-mil-red text-xs">⚠</span>
          <span className="text-mil-dim text-xs font-bold tracking-widest">DÜŞMAN BİLGİSİ</span>
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="border border-mil-border bg-mil-panel p-3 mb-3">
            <div className="flex items-center gap-3">
              <NatoUnitIcon
                type={selectedEnemy.getType()}
                isEnemy={true}
                isAlive={selectedEnemy.isAlive()}
                size={36}
                className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              />
              <div>
                <div className="text-mil-red font-bold text-sm mb-1">{selectedEnemy.getName()}</div>
                <div className="text-mil-dim text-xs">[{selectedEnemyId}] — {enemyTypeToString(selectedEnemy.getType())}</div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-mil-dim">DAYANIKLILIK</span>
                <span className="text-mil-red font-bold">{selectedEnemy.getHp()}/{selectedEnemy.getMaxHp()}</span>
              </div>
              <StatBar value={selectedEnemy.getHp()} max={selectedEnemy.getMaxHp()} color="#ef4444" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-mil-dim">MORAL</span>
                <span className="text-mil-yellow font-bold">{selectedEnemy.getMorale()}/100</span>
              </div>
              <StatBar value={selectedEnemy.getMorale()} max={100} color="#eab308" />
            </div>
            <div className="text-xs text-mil-dim mt-2">
              <div>Konum: ({selectedEnemy.getPosition().x}, {selectedEnemy.getPosition().y})</div>
              <div>Mühimmat: {selectedEnemy.getAmmo()}</div>
              <div>Durum: {enemyStateToString(selectedEnemy.getState())}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedUnit) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-mil-border bg-mil-panel flex items-center gap-2 flex-shrink-0">
          <span className="text-mil-cyan text-xs">🎖</span>
          <span className="text-mil-dim text-xs font-bold tracking-widest">BİRİM DURUMU</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="text-mil-dim text-xs mb-4">
            Haritadan bir birlik seçin
          </div>
          {/* Unit list */}
          <div className="w-full space-y-2">
            {[...state.units.entries()].map(([id, unit]) => {
              const s = unit as Soldier
              const hpPct = (s.getHp() / s.getMaxHp()) * 100
              return (
                <div key={id} className="border border-mil-border p-2 text-left text-xs">
                  <div className="flex items-center gap-2">
                    <NatoUnitIcon
                      role={s.getRole()}
                      isEnemy={false}
                      isAlive={s.isAlive()}
                      size={18}
                    />
                    <div className="flex flex-col">
                      <span className={`font-bold ${s.isAlive() ? 'text-mil-green' : 'text-mil-dim line-through'}`}>{id}</span>
                      <span className="text-[9px] text-mil-dim uppercase tracking-tighter">{roleToString(s.getRole())}</span>
                    </div>
                    <span className="text-mil-dim text-xs ml-auto">HP:{s.getHp()}</span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-mil-border">
                    <div className="h-full bg-mil-green transition-all" style={{ width: `${hpPct}%`, backgroundColor: hpPct < 25 ? '#ef4444' : '#22c55e' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const hpPct = (selectedUnit.getHp() / selectedUnit.getMaxHp()) * 100
  const fpPermission = selectedUnit.getFirePermission()
  const fpLabel: Record<FirePermission, string> = {
    [FirePermission.UNDEFINED]: 'Tanımsız',
    [FirePermission.WAITING_FOR_PERMISSION]: '⏳ İzin Bekleniyor',
    [FirePermission.PERMITTED]: '✅ Serbest Ateş',
    [FirePermission.DENIED]: '❌ Ateş Yasak',
    [FirePermission.HOLD_FIRE]: '⏸ Beklemede',
  }
  const fpColor: Record<FirePermission, string> = {
    [FirePermission.UNDEFINED]: 'text-mil-dim',
    [FirePermission.WAITING_FOR_PERMISSION]: 'text-mil-yellow',
    [FirePermission.PERMITTED]: 'text-mil-green',
    [FirePermission.DENIED]: 'text-mil-red',
    [FirePermission.HOLD_FIRE]: 'text-mil-cyan',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-mil-border bg-mil-panel flex items-center gap-2 flex-shrink-0">
        <span className="text-mil-cyan text-lg">🎖</span>
        <span className="text-mil-textBright text-sm font-bold tracking-widest leading-none">BİRİM DURUMU</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Unit identity card */}
        <div className="border border-mil-border bg-mil-panel p-3">
          <div className="flex items-center gap-3 mb-2">
            <NatoUnitIcon
              role={selectedUnit.getRole()}
              isEnemy={false}
              isAlive={selectedUnit.isAlive()}
              size={36}
              className="drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
            />
            <div>
              <div className="text-mil-textBright font-bold text-sm tracking-tight">{selectedUnit.getName()}</div>
              <div className="text-mil-green font-bold text-[10px] tracking-widest uppercase">
                {selectedUnitId} — {roleToString(selectedUnit.getRole())}
              </div>
            </div>
          </div>
          
          {/* Passive Ability (Perk) */}
          <div className="mt-1 mb-3 px-2 py-1 bg-mil-bg border-l-2 border-mil-yellow flex items-center gap-2">
            <span className="text-mil-yellow text-[10px] font-black italic">PASİF:</span>
            <span className="text-mil-text text-[10px] uppercase tracking-tighter">{getPassiveAbility(selectedUnit.getRole())}</span>
          </div>

          <div className="text-xs flex gap-2 flex-wrap items-center">
            <span className={selectedUnit.isAlive() ? 'text-mil-green' : 'text-mil-red font-bold'}>
              {selectedUnit.isAlive() ? '● AKTİF' : '✕ DÜŞTÜ'}
            </span>
            {selectedUnit.isIncapacitated() && (
              <span className="text-mil-red pulse-red">● YARALANDI</span>
            )}
            {selectedUnit.isInCover() && (
              <span className="text-mil-cyan">🛡 SİPERDE</span>
            )}
            {selectedUnit.isUnderFire() && (
              <span className="text-mil-yellow bg-yellow-950/20 px-1.5 py-0.5 border border-mil-yellow animate-pulse text-[10px] font-bold">● BASKI ALTINDA</span>
            )}
            {selectedUnit.isDisobedient() && (
              <span className="text-mil-red">⚠ İTAATSİZ</span>
            )}
          </div>

          {selectedUnit.getRole() === SoldierRole.SNIPER && selectedUnit.getMorale() <= 40 && (
            <div className="mt-2 text-[10px] bg-red-950/40 border border-mil-red p-2 text-mil-red animate-pulse">
              ⚠️ STRES KİLİDİ: Moral çok düşük (≤40). Sniper ateş edemez!
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-mil-dim">SAĞLIK</span>
              <span className={`font-bold ${hpPct < 25 ? 'text-mil-red' : hpPct < 60 ? 'text-mil-yellow' : 'text-mil-green'}`}>
                {selectedUnit.getHp()}/{selectedUnit.getMaxHp()}
              </span>
            </div>
            <StatBar value={selectedUnit.getHp()} max={selectedUnit.getMaxHp()} color="#22c55e" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-mil-dim">MORAL</span>
              <span className="text-mil-yellow font-bold">{selectedUnit.getMorale()}/100</span>
            </div>
            <StatBar value={selectedUnit.getMorale()} max={100} color="#eab308" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-mil-dim">CEPHANE</span>
              <span className="text-mil-cyan font-bold">
                {selectedUnit.getAmmo()}{' '}
                <span className="text-[9px] text-slate-500 font-normal">(Atış: -3)</span>
              </span>
            </div>
            <StatBar value={selectedUnit.getAmmo()} max={selectedUnit.getRole() === SoldierRole.MG ? 400 : selectedUnit.getRole() === SoldierRole.ARMORED ? 300 : 120} color="#06b6d4" />
          </div>
        </div>

        {/* Inventory */}
        <div>
          <div className="text-mil-dim text-xs mb-2 font-bold">ENVANTER</div>
          <div className="grid grid-cols-3 gap-1">
            <InventoryIcon icon="🍞" count={selectedUnit.getRations()} label="Erzak" critical={selectedUnit.getRations() <= 1} />
            <InventoryIcon icon="💊" count={selectedUnit.getMedkits()} label="Medkit" critical={selectedUnit.getMedkits() === 0} />
            <InventoryIcon icon="📍" count={1} label={`(${selectedUnit.getPosition().x},${selectedUnit.getPosition().y})`} />
          </div>
        </div>

        {/* Active Target and Hit Chance */}
        {(() => {
          const targetId = selectedUnit.getEngagementTargetId()
          const targetEnemy = targetId ? state.enemies.get(targetId) : null
          if (!targetEnemy || !targetEnemy.isAlive()) return null
          const hitChance = CombatSystem.estimateHitChance(selectedUnit, targetEnemy, state.mapGrid)
          return (
            <div className="border border-mil-border bg-mil-panel p-2 rounded-sm">
              <div className="text-mil-dim text-[10px] uppercase font-bold tracking-widest mb-1">HEDEF ANGAJMANI</div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-mil-text font-semibold">{targetEnemy.getName()}</span>
                <span className="text-mil-green font-bold bg-green-950/30 px-1 border border-mil-green/30">İSABET: %{hitChance}</span>
              </div>
            </div>
          )
        })()}

        {/* ROE Status */}
        <div className="border border-mil-border p-2">
          <div className="text-mil-dim text-xs mb-1">ATIŞA KURAL (ROE)</div>
          <div className={`text-xs font-bold ${fpColor[fpPermission]}`}>{fpLabel[fpPermission]}</div>
          {fpPermission === FirePermission.UNDEFINED && (
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => sendCommand(selectedUnitId!, 'siper')}
                className="flex-1 text-xs py-1 border border-mil-border text-mil-cyan hover:bg-cyan-950/20 transition-all"
              >
                🛡 Siper
              </button>
              <button
                onClick={() => setAttackMode(true)}
                className="flex-1 text-xs py-1 border border-mil-border text-[#FF8C00] hover:bg-orange-950/20 transition-all"
                title="Haritadan bir düşman seçerek saldırı rotası oluşturun"
              >
                ⚔️ Saldır
              </button>
            </div>
          )}
        </div>

        {/* Supply request */}
        <div>
          <div className="text-mil-dim text-xs mb-2 font-bold">İKMAL TALEBİ</div>
          <div className="grid grid-cols-3 gap-1">
            {([
              { type: SupplyType.AMMO, label: 'Mühimmat', icon: '🔫', amount: 50 },
              { type: SupplyType.RATIONS, label: 'Erzak', icon: '🍞', amount: 10 },
              { type: SupplyType.MEDKITS, label: 'Medkit', icon: '💊', amount: 3 },
            ] as const).map(({ type, label, icon, amount }) => (
              <button
                key={type}
                onClick={() => requestSupply(selectedUnitId!, type, amount)}
                className="text-xs py-2 border border-mil-border text-mil-dim hover:text-mil-green hover:border-mil-greenDim transition-all flex flex-col items-center gap-0.5"
                title={`${amount}x ${label} talep et`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
