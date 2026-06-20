import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { OPERATIONS } from '../engine/Scenario'

const SCENARIO_ICONS = ['🛡', '🌲', '🌾', '🦅', '⚓', '🌙', '⛰']
const SCENARIO_DIFFICULTY = ['ORTA', 'ZOR', 'KOLAY', 'ZOR', 'ÇOK ZOR', 'ORTA', 'ÇOK ZOR']
const SCENARIO_DIFF_COLOR = [
  'text-mil-yellow', 'text-mil-red', 'text-mil-green', 'text-mil-red', 'text-red-500', 'text-mil-yellow', 'text-red-500'
]
const SCENARIO_LED_COLOR = [
  'status-dot-yellow', 'status-dot-red', 'status-dot-green', 'status-dot-red', 'status-dot-red', 'status-dot-yellow', 'status-dot-red'
]

const SCENARIO_DETAILS = [
  {
    weather: 'GÜNEŞLİ / SICAK',
    terrain: 'ÇÖL VE MESKUN MAHAL',
    threatLevel: 'ORTA (DÜZENLİ UNSURLAR)',
    tacticalTip: 'Zırhlı timlerin hareket kabiliyetinden yararlanın. İkmal hatlarını açık tutun.',
    primaryAssets: 'T-129 ATAK, F-16 CAS, Topçu Desteği',
    coordinates: '36.85 N / 38.00 E'
  },
  {
    weather: 'YAĞMURLU / SİSLİ',
    terrain: 'ENGEBELİ DAĞLIK ARAZİ',
    threatLevel: 'YÜKSEK (TAHKİMATLI MAĞARALAR)',
    tacticalTip: 'Sıhhiyeciyi zırhlı timlerin arkasında koruyun. Tepe mevziine tırmanırken dikkat edin.',
    primaryAssets: 'F-16 CAS, Topçu Desteği, Sıhhi Tahliye',
    coordinates: '36.51 N / 36.90 E'
  },
  {
    weather: 'PARÇALI BULUTLU',
    terrain: 'GENİŞ DÜZLÜK / OVALAR',
    threatLevel: 'YÜKSEK (DÜŞMAN ZIRHLILARI)',
    tacticalTip: 'Mekanize piyadeleri zırhlı korumasında ilerletin. Topçu baskı ateşini düşman zırhlılarına yoğunlaştırın.',
    primaryAssets: 'Topçu Desteği, Zırhlı Taarruz, T-129 ATAK',
    coordinates: '36.70 N / 38.95 E'
  },
  {
    weather: 'KARLI / YOĞUN SOĞUK',
    terrain: 'SARP DAĞ GEÇİTLERİ (YÜKSEK İRTİFA)',
    threatLevel: 'YÜKSEK (SABOTAJ TİMLERİ)',
    tacticalTip: 'Keskin nişancı ile uzak hedefleri sessizce temizleyin. Komandoları koruma altında ilerletin.',
    primaryAssets: 'F-16 CAS Desteği, Sızma Taktikleri',
    coordinates: '37.22 N / 43.74 E'
  },
  {
    weather: 'FIRTINALI / AŞIRI RÜZGAR',
    terrain: 'ADA KIYI ŞERİDİ VE OVALAR',
    threatLevel: 'KRİTİK (KUŞATMA ALTINDA)',
    tacticalTip: 'Dağınık timleri bir an önce birleştirin. Telsiz irtibatı kurulana kadar savunma pozisyonunda kalın.',
    primaryAssets: 'Acil İkmal Paketi, Taktik Savunma',
    coordinates: '35.12 N / 33.92 E'
  },
  {
    weather: 'GECE HAREKÂTI / SIFIR GÖRÜŞ',
    terrain: 'VADİ VE KARAKOL ÇEVRESİ',
    threatLevel: 'KRİTİK (ANLIK BASKIN)',
    tacticalTip: 'Ağır silah timlerini (MG) kritik geçiş noktalarına konuşlandırın. Baskı ateşini sürekli aktif tutun.',
    primaryAssets: 'Ağır Silah İstasyonları, Yakın Topçu Desteği',
    coordinates: '37.33 N / 43.18 E'
  },
  {
    weather: 'PARÇALI BULUTLU / DAĞ RÜZGARI',
    terrain: 'SARP DAĞLIK VE VADİ (20x20)',
    threatLevel: 'KRİTİK (KORUNAN DAĞ MEVZİLERİ)',
    tacticalTip: 'Kışla yapılarını (Karargah, Hastane, Depo) aktif kullanın. Dağlara tırmanmadan önce karargahtan destek timleri çağırarak ek kuvvet oluşturun.',
    primaryAssets: 'Birim Sevk Etme (Kışla), Hava İkmal Kutuları, CAS Desteği',
    coordinates: '37.15 N / 43.40 E'
  }
]

export function ScenarioSelect() {
  const { startScenario, setAppPhase } = useGameStore()
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'STANDARD' | 'HARD'>('STANDARD')
  const [hoveredIndex, setHoveredIndex] = useState<number>(0)

  return (
    <div className="h-full flex flex-col bg-mil-bg overflow-hidden relative font-mono select-none">
      {/* Scanlines & Grid background decoration */}
      <div className="absolute inset-0 scanlines pointer-events-none z-20" />
      <div className="absolute inset-0 opacity-5 z-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.15) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#00FFFF]/20 bg-mil-panel relative z-10 flex-shrink-0">
        <button
          onClick={() => setAppPhase('menu')}
          className="px-4 py-1.5 border border-[#00FFFF]/30 hover:border-[#00FFFF] text-mil-dim hover:text-[#00FFFF] transition-all text-xs font-bold bg-[#00FFFF]/5 uppercase tracking-widest relative group"
        >
          <span>[ ◀ GERİ ]</span>
          <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#00FFFF] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
        </button>
        <div className="text-[#00FFFF] font-black tracking-[0.25em] text-sm flex-grow text-center glow-text-cyan uppercase">
          ▸ HARBİYE SEKTÖR OPERASYON SEÇİMİ ◂
        </div>
        <div className="text-mil-dim text-[10px] tracking-wider uppercase bg-black/40 border border-mil-border px-3 py-1.5 hidden sm:block">
          SİSTEM VERİSİ: <span className="text-mil-yellow font-bold glow-text-yellow">{OPERATIONS.length} PLANLANDI</span>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="bg-mil-panel/90 border-b border-[#00FFFF]/10 px-6 py-4 flex items-center justify-center gap-6 flex-wrap relative z-10 flex-shrink-0">
        <span className="text-mil-yellow text-xs font-black tracking-widest flex items-center gap-2 glow-text-yellow">
          📡 HAREKÂT ZORLUK DERECESİ SEÇİN:
        </span>
        <div className="flex gap-2">
          {[
            { id: 'EASY', label: 'KOLAY', color: 'text-mil-green border-mil-green/60 bg-mil-green/10 shadow-[0_0_12px_rgba(34,197,94,0.25)] hover:border-mil-green hover:bg-mil-green/20', led: 'status-dot-green' },
            { id: 'STANDARD', label: 'STANDART', color: 'text-mil-cyan border-mil-cyan/60 bg-mil-cyan/10 shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:border-mil-cyan hover:bg-mil-cyan/20', led: 'status-dot-cyan' },
            { id: 'HARD', label: 'ZOR', color: 'text-mil-red border-mil-red/60 bg-mil-red/10 shadow-[0_0_12px_rgba(239,68,68,0.25)] hover:border-mil-red hover:bg-mil-red/20', led: 'status-dot-red' }
          ].map((d) => {
            const isSelected = selectedDifficulty === d.id
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDifficulty(d.id as any)}
                className={`px-6 py-2 border text-xs font-black uppercase transition-all duration-200 relative flex items-center gap-2 min-w-[110px] justify-center ${
                  isSelected 
                  ? d.color
                  : 'border-white/10 hover:border-white/30 text-white/50 bg-white/5'
                }`}
              >
                {isSelected && <span className={d.led}></span>}
                {d.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Body Layout */}
      <div className="flex-1 flex flex-row overflow-hidden relative z-10 w-full p-4 md:p-6 gap-6">
        
        {/* SOL SÜTUN - Telemetri ve Sistem Durumu (Desktop Only) */}
        <div className="hidden lg:flex flex-col w-72 flex-shrink-0 gap-4">
          <div className="terminal-grid-panel p-4 flex-1 flex flex-col">
            <div className="terminal-scan-line" />
            
            <div className="border-b border-[#00FFFF]/20 pb-2 mb-4">
              <span className="text-[#00FFFF] text-xs font-black tracking-widest uppercase glow-text-cyan flex items-center gap-2">
                <span className="status-dot-green"></span> [ TELEMETRİ / DURUM ]
              </span>
            </div>
            
            <div className="flex-1 space-y-4 font-mono text-[10px] text-mil-dim leading-relaxed">
              <div className="p-2 bg-black/30 border border-mil-border/50">
                <div className="text-white/40 font-bold uppercase mb-1">HAREKÂT MERKEZİ</div>
                <div className="text-mil-green font-bold flex items-center justify-between">
                  <span>OP_NET_ONLINE</span>
                  <span>ÇEVRİMİÇİ</span>
                </div>
              </div>

              {/* Taktik Zorluk Detayları */}
              <div className="p-2.5 bg-black/30 border border-mil-border/50 rounded-sm">
                <div className="text-mil-yellow font-bold uppercase mb-1.5 flex items-center gap-1.5">
                  🛡️ ZORLUK MODİFİKATÖRLERİ
                </div>
                {selectedDifficulty === 'EASY' && (
                  <div className="space-y-1.5 text-mil-green">
                    <div>• Telsiz Paraziti: Yok (Net)</div>
                    <div>• CAS Yenileme: Hızlı (%150)</div>
                    <div>• Birlikler: +15 Moral Desteği</div>
                    <div>• Düşman Reaksiyonu: Zayıf</div>
                  </div>
                )}
                {selectedDifficulty === 'STANDARD' && (
                  <div className="space-y-1.5 text-mil-cyan">
                    <div>• Telsiz Paraziti: Standart (%100)</div>
                    <div>• CAS Yenilenme: Normal (%100)</div>
                    <div>• Birlikler: Standart Moral</div>
                    <div>• Düşman Reaksiyonu: Dengeli</div>
                  </div>
                )}
                {selectedDifficulty === 'HARD' && (
                  <div className="space-y-1.5 text-mil-red">
                    <div>• Telsiz Paraziti: Yoğun (Gecikmeli)</div>
                    <div>• CAS Yenilenme: Yavaş (%50)</div>
                    <div>• Birlikler: Ağır Baskı (-15 Moral)</div>
                    <div>• Düşman Reaksiyonu: Agresif</div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>SİNYAL PROTOKOLÜ</span>
                  <span className="text-mil-textBright font-bold">TAC_COM_v4</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>ŞİFRELEME</span>
                  <span className="text-mil-textBright font-bold">DES-56</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>GPS SEKTÖRÜ</span>
                  <span className="text-[#FFD700] font-bold">ANADOLU / GÜNEY</span>
                </div>
              </div>

              <div className="pt-2 mt-auto border-t border-[#00FFFF]/10 text-[8px] opacity-50 space-y-1">
                <div>OP_SELECT_SYS: AKTİF</div>
                <div>SCENARIOS_FOUND: {OPERATIONS.length}</div>
                <div>ROUTING_METRIC: METRIC_A*</div>
              </div>
            </div>
          </div>
        </div>

        {/* ORTA SÜTUN - Operasyon Kartları */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-6">
              {OPERATIONS.map((op, idx) => {
                const difficultyLabel = SCENARIO_DIFFICULTY[idx]
                const difficultyColor = SCENARIO_DIFF_COLOR[idx]
                const ledClass = SCENARIO_LED_COLOR[idx]
                const isHovered = hoveredIndex === idx
                
                return (
                  <button
                    key={op.id}
                    id={`scenario-${idx + 1}`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onClick={() => startScenario(idx + 1, selectedDifficulty)}
                    className={`group text-left terminal-grid-panel transition-all duration-300 p-5 flex flex-col justify-between relative overflow-hidden h-[240px] ${
                      isHovered 
                      ? 'border-mil-green/80 shadow-[0_0_20px_rgba(0,255,0,0.1)] bg-green-950/5' 
                      : 'border-mil-border hover:border-mil-green/40'
                    }`}
                  >
                    <div className="terminal-scan-line opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Top corner cybernetic decors */}
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-mil-border group-hover:border-mil-green transition-colors" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-mil-border group-hover:border-mil-green transition-colors" />

                    {/* Card Header */}
                    <div className="w-full flex items-start gap-4">
                      <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(0,255,255,0.2)]">{SCENARIO_ICONS[idx]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-mil-dim text-[9px] font-bold tracking-wider">OP-0{idx + 1}</span>
                          <span className={`text-[9px] font-black uppercase flex items-center gap-1.5 ${difficultyColor}`}>
                            <span className={ledClass}></span>
                            {difficultyLabel}
                          </span>
                        </div>
                        <div className={`font-black text-sm leading-snug transition-colors uppercase tracking-tight ${
                          isHovered ? 'text-mil-green glow-text-green' : 'text-mil-textBright glow-text-cyan'
                        }`}>
                          {op.name}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-mil-text/80 text-[11px] leading-relaxed my-3 line-clamp-2">
                      {op.desc}
                    </p>

                    {/* Objective */}
                    <div className="border-t border-mil-border/50 pt-2.5 mb-3 w-full">
                      <div className="text-mil-yellow text-[9px] font-black tracking-widest mb-0.5">🎯 HAREKÂT HEDEFİ:</div>
                      <p className="text-mil-cyan text-[11px] leading-normal font-semibold line-clamp-1">{op.objective}</p>
                    </div>

                    {/* Start button */}
                    <div className={`w-full py-2.5 text-center text-xs font-black border transition-all tracking-widest relative ${
                      isHovered
                      ? 'border-mil-green bg-mil-green/20 text-mil-green shadow-[0_0_10px_rgba(0,255,0,0.15)]'
                      : 'border-mil-border text-mil-dim'
                    }`}>
                      <span>▶ [ GÖREVE BAŞLA ]</span>
                      <span className={`status-dot-green absolute right-4 top-1/2 -translate-y-1/2 transition-opacity duration-200 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}></span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* SAĞ SÜTUN - Saha İstihbarat Raporu (Desktop Only) */}
        <div className="hidden lg:flex flex-col w-80 flex-shrink-0 gap-4">
          {(() => {
            const op = OPERATIONS[hoveredIndex]
            const detail = SCENARIO_DETAILS[hoveredIndex]
            const difficultyLabel = SCENARIO_DIFFICULTY[hoveredIndex]
            const difficultyColor = SCENARIO_DIFF_COLOR[hoveredIndex]
            
            return (
              <div className="terminal-grid-panel p-4 flex-1 flex flex-col">
                <div className="terminal-scan-line" />
                
                <div className="border-b border-[#00FFFF]/20 pb-2 mb-4">
                  <span className="text-[#00FFFF] text-xs font-black tracking-widest uppercase glow-text-cyan flex items-center gap-2">
                    <span className="status-dot-cyan"></span> [ SAHA İSTİHBARATI ]
                  </span>
                </div>

                <div className="flex-1 space-y-4 font-mono text-[10px] text-mil-dim leading-relaxed flex flex-col">
                  {/* Kod Adı */}
                  <div className="p-2 bg-black/40 border border-mil-border">
                    <div className="text-white/40 font-bold uppercase mb-0.5">HAREKÂT KOD ADI</div>
                    <div className="text-mil-green font-black text-xs uppercase tracking-wider">
                      OP_{op.id.padStart(2, '0')}_{op.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase()}
                    </div>
                  </div>

                  {/* Koordinatlar, Hava, Arazi */}
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>HEDEF KOORDİNAT</span>
                      <span className="text-mil-yellow font-bold">{detail.coordinates}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>ZORLUK DERECESİ</span>
                      <span className={`font-bold uppercase ${difficultyColor}`}>{difficultyLabel}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>TERTİPLENEN HAVA</span>
                      <span className="text-mil-cyan font-bold">{detail.weather}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>ARAZİ KOŞULLARI</span>
                      <span className="text-white font-bold">{detail.terrain}</span>
                    </div>
                  </div>

                  {/* Görev Gücü (Task Force) */}
                  <div className="p-2.5 bg-[#00FFFF]/5 border border-[#00FFFF]/10 rounded-sm">
                    <div className="text-[#00FFFF] font-bold uppercase mb-1.5 flex items-center gap-1.5">
                      ⚔️ MEVCUT GÖREV GÜCÜ
                    </div>
                    <div className="space-y-1.5">
                      {op.taskForce?.map((tf, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-mil-text">
                          <span className="text-mil-green font-bold">✔</span>
                          <span>{tf}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Taktik Tavsiye */}
                  <div className="p-2.5 bg-yellow-950/10 border border-mil-yellow/20 rounded-sm">
                    <div className="text-mil-yellow font-bold uppercase mb-1 flex items-center gap-1.5">
                      📡 KOMUTA TAVSİYESİ
                    </div>
                    <p className="text-mil-text text-[9.5px] leading-normal">{detail.tacticalTip}</p>
                  </div>

                  {/* Radar Waveform Simulator */}
                  <div className="mt-auto pt-2 space-y-1.5">
                    <div className="text-white/40 font-bold uppercase text-[9px]">TELSİZ SİNYAL DALGA FORMU</div>
                    <div className="h-12 flex items-center justify-center border border-mil-border/50 bg-black/40 overflow-hidden relative rounded-sm">
                      <div className="absolute inset-x-0 h-[1px] bg-mil-green/20" />
                      <svg className="w-full h-full text-mil-green opacity-70" viewBox="0 0 100 40">
                        <path
                          d="M 0,20 Q 15,5 30,20 T 60,20 T 80,10 T 100,20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="animate-pulse"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

      </div>
    </div>
  )
}

