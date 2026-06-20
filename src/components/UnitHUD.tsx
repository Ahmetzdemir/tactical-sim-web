import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { Soldier } from '../engine/Soldier'
import { EnemyUnit } from '../engine/EnemyUnit'
import { SoldierRole, FirePermission, SupplyType, TerrainType, roleToString, enemyTypeToString, enemyStateToString } from '../engine/types'
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
  const {
    state, selectedUnitId, selectedEnemyId,
    selectUnit, requestSupply, sendCommand, setAttackMode,
    strikeMode, setStrikeMode,
    executeHospitalHeal, executeSupplyAmmo, executeSandbagRepair,
    executeCommandReinforce,
  } = useGameStore()

  const [activeTab, setActiveTab] = useState<'units' | 'structures'>('units')

  useEffect(() => {
    if (selectedUnitId || selectedEnemyId) {
      setActiveTab('units')
    }
  }, [selectedUnitId, selectedEnemyId])

  if (!state) return null

  const selectedUnit = selectedUnitId ? (state.units.get(selectedUnitId) as Soldier | undefined) : null
  const selectedEnemy = selectedEnemyId ? (state.enemies.get(selectedEnemyId) as EnemyUnit | undefined) : null

  // 1. SCAN FOR STRUCTURES AND ACTIVE CONSTRUCTIONS
  const { mapGrid } = state
  const grid = mapGrid.getGrid()
  const structuresList: { type: TerrainType; x: number; y: number; name: string; emoji: string }[] = []
  
  for (let y = 0; y < mapGrid.height; y++) {
    for (let x = 0; x < mapGrid.width; x++) {
      const terrain = grid[y]?.[x]
      if (
        terrain === TerrainType.FOB_COMMAND ||
        terrain === TerrainType.FOB_HOSPITAL ||
        terrain === TerrainType.FOB_SUPPLY ||
        terrain === TerrainType.FOB_SANDBAGS
      ) {
        let name = ''
        let emoji = ''
        if (terrain === TerrainType.FOB_COMMAND) { name = 'Komuta Merkezi'; emoji = '⛺' }
        else if (terrain === TerrainType.FOB_HOSPITAL) { name = 'Sahra Hastanesi'; emoji = '🏥' }
        else if (terrain === TerrainType.FOB_SUPPLY) { name = 'Mühimmat Deposu'; emoji = '📦' }
        else if (terrain === TerrainType.FOB_SANDBAGS) { name = 'Kum Torbası Siperi'; emoji = '🧱' }
        
        structuresList.push({ type: terrain, x, y, name, emoji })
      }
    }
  }

  const constructionsList: { x: number; y: number; structureType: TerrainType; progress: number; targetProgress: number; builderId: string }[] = []
  if (state.activeConstructions) {
    for (const [coord, constr] of state.activeConstructions) {
      const [xs, ys] = coord.split(',')
      const x = parseInt(xs)
      const y = parseInt(ys)
      constructionsList.push({
        x,
        y,
        structureType: constr.structureType,
        progress: constr.progress,
        targetProgress: constr.targetProgress,
        builderId: constr.builderId,
      })
    }
  }

  const renderTabsHeader = () => (
    <div className="flex border-b border-mil-border bg-mil-panel flex-shrink-0">
      <button
        onClick={() => setActiveTab('units')}
        className={`flex-1 py-2.5 text-xs font-bold tracking-widest uppercase transition-all border-b-2 ${
          activeTab === 'units'
            ? 'border-b-mil-cyan text-mil-cyan bg-cyan-950/10'
            : 'border-b-transparent text-mil-dim hover:text-mil-textBright hover:bg-white/5'
        }`}
      >
        🎖 BİRİM DURUMU
      </button>
      <button
        onClick={() => setActiveTab('structures')}
        className={`flex-1 py-2.5 text-xs font-bold tracking-widest uppercase transition-all border-b-2 ${
          activeTab === 'structures'
            ? 'border-b-mil-yellow text-mil-yellow bg-yellow-950/10'
            : 'border-b-transparent text-mil-dim hover:text-mil-textBright hover:bg-white/5'
        }`}
      >
        ⛺ YAPILAR {structuresList.length > 0 && `(${structuresList.length})`}
      </button>
    </div>
  )

  if (activeTab === 'structures') {
    return (
      <div className="flex flex-col h-full font-mono">
        {renderTabsHeader()}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Constructions */}
          {constructionsList.length > 0 && (
            <div className="space-y-2">
              <div className="text-mil-yellow text-[10px] font-bold tracking-widest uppercase">🏗️ İNŞAATI SÜRENLER</div>
              <div className="space-y-2">
                {constructionsList.map(({ x, y, structureType, progress, targetProgress, builderId }) => {
                  const name = structureType === TerrainType.FOB_COMMAND ? 'Komuta Merkezi' : structureType === TerrainType.FOB_HOSPITAL ? 'Sahra Hastanesi' : structureType === TerrainType.FOB_SUPPLY ? 'Mühimmat Deposu' : 'Kum Torbası Siperi'
                  const pct = Math.round((progress / targetProgress) * 100)
                  return (
                    <div key={`${x},${y}`} className="border border-mil-border bg-mil-panel/50 p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-mil-textBright font-bold">{name} ({x}, {y})</span>
                        <span className="text-mil-yellow text-[10px] font-mono">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-mil-bg">
                        <div className="h-full bg-mil-yellow" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-mil-dim flex justify-between">
                        <span>Mevcut: {progress}/{targetProgress} tur</span>
                        <span>İnşacı: {builderId}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active structures */}
          <div>
            <div className="text-mil-cyan text-[10px] font-bold tracking-widest uppercase mb-2">🏢 AKTİF ASKERİ YAPILAR</div>
            {structuresList.length === 0 ? (
              <div className="text-center py-8 text-mil-dim text-[10px] border border-dashed border-mil-border leading-relaxed">
                HENÜZ İNŞA EDİLMİŞ YAPI BULUNMUYOR.<br/>
                BİR İSTİHKAM ERİ (ENGINEER) SEÇİP HARİTADA İNŞAAT PROTOKOLÜ BAŞLATIN.
              </div>
            ) : (
              <div className="space-y-3">
                {structuresList.map(({ type, x, y, name, emoji }) => {
                  let isCooldown = false
                  let cooldownVal = 0
                  let actionText = ''
                  let actionDesc = ''
                  let onAction: () => void = () => {}
                  let actionBtnColor = ''

                  if (type === TerrainType.FOB_COMMAND) {
                    cooldownVal = state.commandAirdropCooldown || 0
                    isCooldown = cooldownVal > 0
                    actionText = '📦 HAVA İKMALİ İSTE'
                    actionDesc = 'Haritada seçeceğiniz boş bir araziye paraşütle 3x İnşaat Malzemesi kolisi indirir.'
                    actionBtnColor = isCooldown 
                      ? 'border-mil-border text-mil-dim bg-transparent cursor-not-allowed' 
                      : strikeMode === 'command-airdrop'
                        ? 'border-[#FFD700] text-[#FFD700] bg-yellow-950/20 animate-pulse font-extrabold'
                        : 'border-mil-yellow text-mil-yellow hover:bg-yellow-950/20'
                    onAction = () => {
                      if (strikeMode === 'command-airdrop') {
                        setStrikeMode('none')
                      } else {
                        setStrikeMode('command-airdrop')
                      }
                    }
                  } else if (type === TerrainType.FOB_HOSPITAL) {
                    cooldownVal = state.hospitalHealCooldown || 0
                    isCooldown = cooldownVal > 0
                    actionText = '💉 ACİL SIHHİ TAKVİYE'
                    actionDesc = 'Hastane çevresindeki (ve altındaki) tüm dost birimleri +25 HP anında iyileştirir.'
                    actionBtnColor = isCooldown ? 'border-mil-border text-mil-dim bg-transparent cursor-not-allowed' : 'border-mil-green text-mil-green hover:bg-green-950/20'
                    onAction = () => {
                      executeHospitalHeal(x, y)
                    }
                  } else if (type === TerrainType.FOB_SUPPLY) {
                    cooldownVal = state.supplyAmmoCooldown || 0
                    isCooldown = cooldownVal > 0
                    actionText = '🔋 MÜHİMMAT DAĞITIMI'
                    actionDesc = 'Mühimmat deposu çevresindeki (ve altındaki) tüm dost birimlerin mühimmatını yeniler.'
                    actionBtnColor = isCooldown ? 'border-mil-border text-mil-dim bg-transparent cursor-not-allowed' : 'border-mil-cyan text-mil-cyan hover:bg-cyan-950/20'
                    onAction = () => {
                      executeSupplyAmmo(x, y)
                    }
                  } else if (type === TerrainType.FOB_SANDBAGS) {
                    cooldownVal = state.sandbagRepairCooldown || 0
                    isCooldown = cooldownVal > 0
                    actionText = '🧱 SİPERI ONAR & MORAL VER'
                    actionDesc = 'Kum torbaları çevresindeki (ve altındaki) tüm dost askerlerin moralini +15 artırır.'
                    actionBtnColor = isCooldown ? 'border-mil-border text-mil-dim bg-transparent cursor-not-allowed' : 'border-slate-400 text-slate-300 hover:bg-slate-800/40'
                    onAction = () => {
                      executeSandbagRepair(x, y)
                    }
                  }

                  return (
                    <div key={`${x},${y}`} className="border border-mil-border bg-mil-panel p-3 space-y-2">
                      <div className="flex justify-between items-center border-b border-mil-border/50 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{emoji}</span>
                          <span className="text-mil-textBright font-bold text-xs tracking-wide uppercase">{name}</span>
                        </div>
                        <span className="text-[10px] text-mil-cyan font-mono bg-cyan-950/10 px-1.5 py-0.5 border border-mil-cyan/20">
                          {x.toString().padStart(2, '0')}.{y.toString().padStart(2, '0')}
                        </span>
                      </div>

                      <div className="text-[10px] text-mil-dim leading-relaxed font-mono">
                        {actionDesc}
                      </div>

                      {isCooldown ? (
                        <div className="flex justify-between items-center text-[10px] bg-red-950/20 border border-red-900/30 p-2 text-mil-red font-mono">
                          <span className="font-bold flex items-center gap-1">
                            <span className="animate-spin inline-block">⏳</span> BEKLEMEDE
                          </span>
                          <span className="font-mono font-bold text-xs">{cooldownVal} TUR</span>
                        </div>
                      ) : (
                        <button
                          onClick={onAction}
                          className={`w-full py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all font-mono ${actionBtnColor}`}
                        >
                          {actionText}
                        </button>
                      )}

                      {type === TerrainType.FOB_COMMAND && (
                        <div className="border-t border-mil-border/50 pt-2 mt-2 space-y-2">
                          <div className="text-[10px] text-mil-yellow font-bold uppercase tracking-widest font-mono">
                            🪖 DESTEK TİMİ SEVK ET
                          </div>
                          {state.commandReinforceCooldown > 0 ? (
                            <div className="flex justify-between items-center text-[10px] bg-red-950/20 border border-red-900/30 p-2 text-mil-red font-mono">
                              <span className="font-bold flex items-center gap-1">
                                <span className="animate-spin inline-block">⏳</span> SEVKIYAT BEKLEMEDE
                              </span>
                              <span className="font-mono font-bold text-xs">{state.commandReinforceCooldown} TUR</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1 font-mono">
                              {([
                                { role: SoldierRole.RIFLEMAN, label: 'Piyade', emoji: '🔫' },
                                { role: SoldierRole.MEDIC, label: 'Sıhhiye', emoji: '💊' },
                                { role: SoldierRole.MG, label: 'Ağır Silah', emoji: '💥' },
                                { role: SoldierRole.SNIPER, label: 'Sniper', emoji: '🎯' },
                                { role: SoldierRole.ENGINEER, label: 'İstihkam', emoji: '🔧' },
                                { role: SoldierRole.ARMORED, label: 'Zırhlı', emoji: '🚜' },
                              ] as const).map(({ role, label, emoji }) => (
                                <button
                                  key={role}
                                  onClick={() => executeCommandReinforce(x, y, role)}
                                  className="py-1 px-1 border border-mil-yellow/40 text-mil-yellow hover:bg-yellow-950/20 text-[9px] font-bold text-center uppercase tracking-tight flex items-center justify-center gap-1 transition-all"
                                  title={`${label} birimini karargah çevresindeki boş bir kareye sevk eder.`}
                                >
                                  <span>{emoji}</span>
                                  <span>{label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (selectedEnemy && !selectedUnit) {
    // Show enemy info
    return (
      <div className="flex flex-col h-full">
        {renderTabsHeader()}
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
        {renderTabsHeader()}
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="text-mil-dim text-xs mb-4">
            Haritadan bir birlik seçin
          </div>
          {/* Unit list */}
          <div className="w-full space-y-2">
            {[...state.units.entries()].map(([id, unit]) => {
              const s = unit as Soldier
              const hpPct = (s.getHp() / s.getMaxHp()) * 100
              const isIncap = s.isIncapacitated()
              const isDead = !s.isAlive()
              return (
                <div 
                  key={id} 
                  onClick={() => selectUnit(id)}
                  className={`border p-2 text-left text-xs cursor-pointer transition-all hover:bg-mil-cyan/5 hover:border-mil-cyan ${isIncap ? 'border-mil-red/50 bg-red-950/5' : isDead ? 'border-mil-border opacity-50' : 'border-mil-border'}`}
                >
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
                    {isIncap && <span className="text-mil-red text-[9px] font-bold animate-pulse ml-2">YARALI</span>}
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
  const unitPos = selectedUnit.getPosition()
  const hasRadioAtCurrentPos = (state.deployedRadios || []).some(r => r.x === unitPos.x && r.y === unitPos.y)
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
      {renderTabsHeader()}

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
          <div className="grid grid-cols-5 gap-0.5">
            <InventoryIcon icon="🍞" count={selectedUnit.getRations()} label="Erzak" critical={selectedUnit.getRations() <= 1} />
            <InventoryIcon icon="💊" count={selectedUnit.getMedkits()} label="Medkit" critical={selectedUnit.getMedkits() === 0} />
            <InventoryIcon icon="📡" count={selectedUnit.getHasPortableRadio() ? 1 : 0} label="Telsiz" critical={!selectedUnit.getHasPortableRadio()} />
            <InventoryIcon icon="🔧" count={typeof (selectedUnit as any).getConstructionMaterials === 'function' ? (selectedUnit as any).getConstructionMaterials() : 0} label="Malzeme" />
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

        {/* ROE Status & Actions */}
        <div className="border border-mil-border p-2">
          <div className="text-mil-dim text-xs mb-1">ATIŞA KURAL (ROE)</div>
          <div className={`text-xs font-bold ${fpColor[fpPermission]}`}>{fpLabel[fpPermission]}</div>
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => sendCommand(selectedUnitId!, 'siper')}
              disabled={selectedUnit.isIncapacitated() || !selectedUnit.isAlive()}
              className="flex-1 text-xs py-1 border border-mil-border text-mil-cyan hover:bg-cyan-950/20 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
            >
              🛡 Siper
            </button>
            <button
              onClick={() => setAttackMode(true)}
              disabled={selectedUnit.isIncapacitated() || !selectedUnit.isAlive()}
              className="flex-1 text-xs py-1 border border-mil-border text-[#FF8C00] hover:bg-orange-950/20 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              title="Haritadan bir düşman seçerek saldırı rotası oluşturun"
            >
              ⚔️ Saldır
            </button>
          </div>

          {/* Rescue & Carry actions */}
          {(() => {
            const carryingId = typeof (selectedUnit as any).getCarryingUnitId === 'function' ? (selectedUnit as any).getCarryingUnitId() : ''
            const isAlive = selectedUnit.isAlive()
            const isIncap = selectedUnit.isIncapacitated()

            if (!isAlive || isIncap) return null

            if (carryingId) {
              const carriedUnit = state.units.get(carryingId)
              return (
                <button
                  onClick={() => sendCommand(selectedUnitId!, 'birak')}
                  className="w-full text-xs py-1.5 mt-2 border border-red-500/40 text-red-400 hover:bg-red-950/20 transition-all font-bold flex items-center justify-center gap-1"
                >
                  🚑 Yaralıyı Bırak ({carriedUnit?.getName() || carryingId})
                </button>
              )
            } else {
              const adjacentIncapacitatedUnit = Array.from(state.units.values()).find(u => {
                if (u.getId() === selectedUnitId || !u.isAlive() || !u.isIncapacitated()) return false
                const uPos = u.getPosition()
                const sPos = selectedUnit.getPosition()
                return Math.abs(uPos.x - sPos.x) <= 1 && Math.abs(uPos.y - sPos.y) <= 1
              })

              if (adjacentIncapacitatedUnit) {
                return (
                  <button
                    onClick={() => sendCommand(selectedUnitId!, `tasi ${adjacentIncapacitatedUnit.getId()}`)}
                    className="w-full text-xs py-1.5 mt-2 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/20 transition-all font-bold flex items-center justify-center gap-1 animate-pulse"
                    title="Yaralı personeli omuzlayıp tahliye etmeye başla"
                  >
                    🚑 Taşı: {adjacentIncapacitatedUnit.getName()}
                  </button>
                )
              }
            }
            return null
          })()}

          {selectedUnit.getHasPortableRadio() && (
            <button
              onClick={() => sendCommand(selectedUnitId!, 'telsiz_kur')}
              disabled={selectedUnit.isIncapacitated() || !selectedUnit.isAlive()}
              className="w-full text-xs py-1.5 mt-2 border border-[#00FFFF]/40 text-[#00FFFF] hover:bg-cyan-950/20 transition-all font-bold animate-pulse flex items-center justify-center gap-1"
              title="Taşınabilir telsiz rölesini mevcut konuma kurar"
            >
              📡 Telsiz Kur
            </button>
          )}
          {hasRadioAtCurrentPos && !selectedUnit.getHasPortableRadio() && (
            <button
              onClick={() => sendCommand(selectedUnitId!, 'telsiz_topla')}
              disabled={selectedUnit.isIncapacitated() || !selectedUnit.isAlive()}
              className="w-full text-xs py-1.5 mt-2 border border-[#FFD700]/40 text-[#FFD700] hover:bg-yellow-950/20 transition-all font-bold animate-pulse flex items-center justify-center gap-1"
              title="Mevcut konumdaki telsiz rölesini geri toplar"
            >
              📡 Telsiz Topla
            </button>
          )}
        </div>

        {/* Engineer Build Options */}
        {selectedUnit.getRole() === SoldierRole.ENGINEER && !selectedUnit.isIncapacitated() && selectedUnit.isAlive() && (
          <div className="border border-mil-border p-2">
            <div className="text-mil-dim text-xs mb-2 font-bold uppercase tracking-wider">👷 İSTİHKAM İNŞAAT KİTİ</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => sendCommand(selectedUnitId!, 'insaat_basla FOB_COMMAND')}
                disabled={(selectedUnit as any).getConstructionMaterials() < 3 || state.mapGrid.getTerrain(selectedUnit.getPosition().x, selectedUnit.getPosition().y) !== TerrainType.OPEN}
                className="text-[10px] py-1.5 border border-purple-500/40 text-purple-400 hover:bg-purple-950/20 transition-all font-semibold flex flex-col items-center disabled:opacity-35"
                title="Komuta Merkezi (Menzil 6 Telsiz Rölesi, Sıfır Gecikme) - 3 Malzeme"
              >
                <span>⛺ Komuta Mer.</span>
                <span className="text-[9px] opacity-75">3 Malzeme / 10 Tick</span>
              </button>
              <button
                onClick={() => sendCommand(selectedUnitId!, 'insaat_basla FOB_HOSPITAL')}
                disabled={(selectedUnit as any).getConstructionMaterials() < 2 || state.mapGrid.getTerrain(selectedUnit.getPosition().x, selectedUnit.getPosition().y) !== TerrainType.OPEN}
                className="text-[10px] py-1.5 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/20 transition-all font-semibold flex flex-col items-center disabled:opacity-35"
                title="Sahra Hastanesi (Yaralıları İyileştirir) - 2 Malzeme"
              >
                <span>🏥 Sahra Hast.</span>
                <span className="text-[9px] opacity-75">2 Malzeme / 6 Tick</span>
              </button>
              <button
                onClick={() => sendCommand(selectedUnitId!, 'insaat_basla FOB_SUPPLY')}
                disabled={(selectedUnit as any).getConstructionMaterials() < 2 || state.mapGrid.getTerrain(selectedUnit.getPosition().x, selectedUnit.getPosition().y) !== TerrainType.OPEN}
                className="text-[10px] py-1.5 border border-amber-500/40 text-amber-400 hover:bg-amber-950/20 transition-all font-semibold flex flex-col items-center disabled:opacity-35"
                title="Mühimmat Deposu (Bitişik birimlerin ikmalini yeniler) - 2 Malzeme"
              >
                <span>📦 Mühimmat Dep.</span>
                <span className="text-[9px] opacity-75">2 Malzeme / 4 Tick</span>
              </button>
              <button
                onClick={() => sendCommand(selectedUnitId!, 'insaat_basla FOB_SANDBAGS')}
                disabled={(selectedUnit as any).getConstructionMaterials() < 1 || state.mapGrid.getTerrain(selectedUnit.getPosition().x, selectedUnit.getPosition().y) !== TerrainType.OPEN}
                className="text-[10px] py-1.5 border border-slate-500/40 text-slate-400 hover:bg-slate-950/20 transition-all font-semibold flex flex-col items-center disabled:opacity-35"
                title="Kum Torbası (Ağır Siper sağlar) - 1 Malzeme"
              >
                <span>🧱 Kum Torbası</span>
                <span className="text-[9px] opacity-75">1 Malzeme / 2 Tick</span>
              </button>
            </div>
          </div>
        )}

        {/* Supply request */}
        <div>
          <div className="text-mil-dim text-xs mb-2 font-bold">İKMAL TALEBİ</div>
          <div className="grid grid-cols-4 gap-1">
            {([
              { type: SupplyType.AMMO, label: 'Mühimmat', icon: '🔫', amount: 50 },
              { type: SupplyType.RATIONS, label: 'Erzak', icon: '🍞', amount: 10 },
              { type: SupplyType.MEDKITS, label: 'Medkit', icon: '💊', amount: 3 },
              { type: SupplyType.CONSTRUCTION_MATERIAL, label: 'Malzeme', icon: '🔧', amount: 2 },
            ] as const).map(({ type, label, icon, amount }) => (
              <button
                key={type}
                onClick={() => requestSupply(selectedUnitId!, type, amount)}
                disabled={selectedUnit.isIncapacitated() || !selectedUnit.isAlive()}
                className="text-xs py-2 border border-mil-border text-mil-dim hover:text-mil-green hover:border-mil-greenDim transition-all flex flex-col items-center gap-0.5 disabled:opacity-35"
                title={`${amount}x ${label} talep et`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Squad list at the bottom for quick switching */}
      <div className="border-t border-mil-border bg-black/40 p-2 flex-shrink-0">
        <div className="text-[9px] text-mil-dim font-bold tracking-wider uppercase mb-1 flex justify-between">
          <span>TİM LİSTESİ</span>
          <span className="text-[8px] opacity-75">Hızlı Seçim</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[...state.units.entries()].map(([id, unit]) => {
            const s = unit as Soldier
            const isSelected = selectedUnitId === id
            const isDead = !s.isAlive()
            const isIncap = s.isIncapacitated()
            
            let statusBorderColor = 'border-mil-border'
            let statusTextColor = 'text-mil-dim'
            if (isSelected) {
              statusBorderColor = 'border-mil-cyan bg-cyan-950/20'
              statusTextColor = 'text-mil-cyan'
            } else if (isIncap) {
              statusBorderColor = 'border-mil-red animate-pulse'
              statusTextColor = 'text-mil-red'
            } else if (!isDead) {
              statusBorderColor = 'border-green-500/30'
              statusTextColor = 'text-mil-green'
            }
            
            return (
              <button
                key={id}
                onClick={() => selectUnit(isSelected ? null : id)}
                className={`py-1 px-1 text-[8px] font-bold border transition-all text-center truncate ${statusBorderColor} ${statusTextColor} hover:bg-white/5`}
                title={`${s.getName()} (${roleToString(s.getRole())})`}
              >
                {id}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
