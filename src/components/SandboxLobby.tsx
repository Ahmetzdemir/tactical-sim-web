import React, { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { SandboxMapSize, WeatherType, weatherTypeToString } from '../engine/types'

const SandboxLobby: React.FC = () => {
  const { setSandboxSettings, setAppPhase } = useGameStore()
  const [mapSize, setMapSize] = useState<SandboxMapSize>(SandboxMapSize.MEDIUM)
  const [mode, setMode] = useState<'SURVIVAL' | 'SEARCH_AND_DESTROY'>('SEARCH_AND_DESTROY')
  const [weatherFixed, setWeatherFixed] = useState<WeatherType | 'DYNAMIC'>('DYNAMIC')

  const handleNext = () => {
    setSandboxSettings({
      mapSize,
      mode,
      isDynamicWeather: weatherFixed === 'DYNAMIC',
      weatherFixed: weatherFixed === 'DYNAMIC' ? undefined : weatherFixed
    })
    setAppPhase('drafting')
  }

  return (
    <div className="fixed inset-0 bg-mil-darker flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-mil-panel border-2 border-mil-cyan shadow-[0_0_20px_rgba(0,255,240,0.2)] overflow-hidden relative">
        {/* Header */}
        <div className="bg-mil-cyan/10 border-b-2 border-mil-cyan px-6 py-4 flex justify-between items-center bg-scanlines">
          <div>
            <h2 className="text-mil-cyan font-black text-xl tracking-tighter">SERBEST OPERASYON LOBİSİ</h2>
            <p className="text-mil-cyan/60 text-[10px] font-bold tracking-widest uppercase">OYUN ÖNCESİ GÖREV KURULUMU</p>
          </div>
          <button 
            onClick={() => setAppPhase('menu')}
            className="text-mil-cyan hover:bg-mil-cyan/20 px-3 py-1 border border-mil-cyan text-xs font-bold transition-all"
          >
            İPTAL
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Map Size */}
          <section>
            <h3 className="text-mil-yellow font-black text-xs tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-mil-yellow rounded-full" />
              HARİTA BOYUTU
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '10x10', value: SandboxMapSize.SMALL, desc: 'Hızlı Çatışma' },
                { label: '15x15', value: SandboxMapSize.MEDIUM, desc: 'Standart' },
                { label: '20x20', value: SandboxMapSize.LARGE, desc: 'Büyük Operasyon' }
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setMapSize(s.value)}
                  className={`p-4 border-2 transition-all text-left ${
                    mapSize === s.value 
                    ? 'border-mil-cyan bg-mil-cyan/10 ring-1 ring-mil-cyan shadow-[inset_0_0_10px_rgba(0,255,240,0.2)]' 
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <div className={`text-sm font-black ${mapSize === s.value ? 'text-mil-cyan' : 'text-mil-textBright'}`}>{s.label}</div>
                  <div className="text-[10px] text-white/40 font-bold uppercase">{s.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Mode Selection */}
          <section>
            <h3 className="text-mil-yellow font-black text-xs tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-mil-yellow rounded-full" />
              OPERASYON MODU
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'SEARCH_AND_DESTROY', label: 'Bölge Temizliği', desc: 'Sızma ve İmha' },
                { id: 'SURVIVAL', label: 'Sonsuz Direniş', desc: 'Hayatta Kalma' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`p-4 border-2 transition-all text-left ${
                    mode === m.id 
                    ? 'border-mil-yellow bg-mil-yellow/10 ring-1 ring-mil-yellow' 
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <div className={`text-sm font-black ${mode === m.id ? 'text-mil-yellow' : 'text-mil-textBright'}`}>{m.label}</div>
                  <div className="text-[10px] text-white/40 font-bold uppercase">{m.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Weather Selection */}
          <section>
            <h3 className="text-mil-yellow font-black text-xs tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-mil-yellow rounded-full" />
              HAVA DURUMU
            </h3>
            <div className="flex flex-wrap gap-2">
              {['DYNAMIC', WeatherType.CLEAR, WeatherType.RAINY, WeatherType.FOGGY, WeatherType.STORM].map((w) => (
                <button
                  key={w}
                  onClick={() => setWeatherFixed(w as any)}
                  className={`px-4 py-2 border-2 text-[10px] font-black uppercase transition-all ${
                    weatherFixed === w 
                    ? 'border-mil-textBright bg-mil-textBright text-mil-darker' 
                    : 'border-white/10 hover:border-white/30 text-white/60'
                  }`}
                >
                  {w === 'DYNAMIC' ? 'Dinamik (RNG)' : weatherTypeToString(w as WeatherType)}
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={handleNext}
            className="w-full py-4 bg-mil-cyan text-mil-darker font-black tracking-widest hover:bg-white transition-all shadow-[0_5px_15px_rgba(0,255,240,0.3)]"
          >
            BİRLİK SEÇİMİNE GEÇ (DRAFTING)
          </button>
        </div>

        {/* Ambient CRT effects */}
        <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent border-mil-darker/20" />
      </div>
    </div>
  )
}

export default SandboxLobby
