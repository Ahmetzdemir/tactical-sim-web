import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { audioManager } from '../services/AudioManager'

export function MainMenu() {
  const { 
    setAppPhase, isMuted, toggleMute,
    musicVolume, sfxVolume, setMusicVolume, setSfxVolume 
  } = useGameStore()

  useEffect(() => {
    audioManager.stopAllGameSounds();
    audioManager.startWarAmbience();
  }, []);

  const [showCredits, setShowCredits] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-mil-bg relative overflow-hidden font-mono">
      {/* Global Mute Button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className="px-3 py-1 bg-black/50 border border-mil-accent/30 text-mil-accent text-xs hover:bg-mil-accent/20 transition-colors rounded uppercase tracking-widest"
          title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
        >
          {isMuted ? "🔇 SES: KAPALI" : "🔊 SES: AÇIK"}
        </button>
      </div>

      {/* Scanlines overlay */}
      <div className="absolute inset-0 scanlines pointer-events-none z-20" />

      {/* Background grid decoration */}
      <div className="absolute inset-0 opacity-10 z-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(34,197,94,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.2) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-row items-stretch justify-center gap-8 p-6 md:p-10 w-full max-w-6xl">
        
        {/* Left Side Panel: System Diagnostics (Desktop Only) */}
        <div className="hidden lg:flex flex-col w-64 flex-shrink-0 gap-4">
          <div className="terminal-grid-panel p-4 flex-1 flex flex-col min-h-[400px]">
            <div className="terminal-scan-line" />
            
            <div className="border-b border-[#00FFFF]/20 pb-2 mb-4">
              <span className="text-[#00FFFF] text-xs font-black tracking-widest uppercase glow-text-cyan flex items-center gap-2">
                <span className="status-dot-green"></span> [ SİSTEM TEŞHİS ]
              </span>
            </div>
            
            <div className="flex-1 space-y-4 font-mono text-[10px] text-mil-dim leading-relaxed">
              <div className="p-2 bg-black/30 border border-mil-border/50">
                <div className="text-white/40 font-bold uppercase mb-1">UYDU BAĞLANTISI</div>
                <div className="text-mil-green font-bold flex items-center justify-between">
                  <span>SATCOM_4_ACTIVE</span>
                  <span>AKTİF</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>ENKRİPSİYON</span>
                  <span className="text-mil-textBright font-bold">AES-256-GCM</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>TELSİZ KANALI</span>
                  <span className="text-mil-textBright font-bold">145.800 MHz</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>SİNYAL SEVİYESİ</span>
                  <span className="text-mil-green font-bold">%98</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>GPS KOORDİNAT</span>
                  <span className="text-[#FFD700] font-bold">39.95 N / 32.86 E</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>HAVA DURUMU</span>
                  <span className="text-[#00FFFF] font-bold">DİNAMİK AKIŞ</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>ROE YETKİSİ</span>
                  <span className="text-[#FFD700] font-bold">ŞARTLI ATALET</span>
                </div>
              </div>

              <div className="pt-2 mt-auto border-t border-[#00FFFF]/10 text-[8px] opacity-50 space-y-1">
                <div>SYS_SECURE_KERNEL: OK</div>
                <div>NET_ENCRYPT_LINK: STABLE</div>
                <div>CMD_LINK_LATENCY: 0.12s</div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel: Main Logo, Briefing and Buttons */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-lg">
          {/* Logo / Banner */}
          <div className="text-center w-full">
            <div className="text-mil-red font-bold text-xs tracking-widest mb-2 opacity-70">
              ▸ TAKTİKSEL SİMÜLASYON SİSTEMİ v2.0 ◂
            </div>
            <pre className="text-mil-green font-bold text-sm leading-tight hidden md:block select-none crt-flicker"
              style={{ textShadow: '0 0 20px rgba(34,197,94,0.5)' }}>
{`  ████████╗ █████╗ ██████╗████████╗██╗ ██████╗ █████╗ ██╗
     ██╔══╝██╔══██╗██╔════╝   ██╔══╝██║██╔════╝██╔══██╗██║
     ██║   ███████║██║        ██║   ██║██║     ███████║██║
     ██║   ██╔══██║██║        ██║   ██║██║     ██╔══██║██║
     ██║   ██║  ██║╚██████╗   ██║   ██║╚██████╗██║  ██║███████╗
     ╚═╝   ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝`}
            </pre>
            <div className="text-mil-green text-2xl font-bold md:hidden glow-text-green"
              style={{ textShadow: '0 0 16px rgba(34,197,94,0.5)' }}>
              ⚔ TAKTİKSEL SİMÜLASYON
            </div>
            <div className="text-mil-dim text-xs mt-3 tracking-widest uppercase opacity-75">
              TAKTİKSEL MANGA YÖNETİM SİMÜLASYONU — WEB PORT
            </div>
          </div>

          {/* Mission briefing */}
          <div className="terminal-grid-panel px-6 py-4 w-full text-center border-mil-green/20">
            <div className="text-mil-yellow text-xs font-black tracking-widest mb-2 glow-text-cyan">[ HARAKÂT BİLGİSİ ]</div>
            <p className="text-mil-text text-xs leading-relaxed">
              Siz karargahta <span className="text-mil-green font-bold">Taktik Komutansınız.</span> Sahadaki timler telsiz ağıyla size bağlı. Emirleri iletin, ikmali yönetin ve hedefleri ele geçirin.
            </p>
          </div>

          {/* Menu buttons */}
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button 
              onClick={() => setAppPhase('scenario-select')}
              className="w-full py-3.5 bg-green-950/40 text-mil-green border-2 border-mil-green hover:bg-mil-green hover:text-mil-bg transition-all uppercase font-black tracking-[0.2em] text-sm shadow-[0_0_15px_rgba(0,255,0,0.15)] relative flex items-center justify-center px-6 group"
            >
              <span>[ HAREKÂT BAŞLAT ]</span>
              <span className="status-dot-green absolute right-6 top-1/2 -translate-y-1/2 group-hover:bg-mil-bg"></span>
            </button>

            <button 
              onClick={() => setAppPhase('sandbox-lobby')}
              className="w-full py-3 bg-cyan-950/20 text-[#00FFFF] border-2 border-[#00FFFF]/50 hover:border-[#00FFFF] hover:bg-[#00FFFF]/10 transition-all uppercase font-bold tracking-[0.2em] text-xs relative flex items-center justify-center px-6"
            >
              <span>[ SERBEST MOD (SANDBOX) ]</span>
              <span className="status-dot-cyan absolute right-6 top-1/2 -translate-y-1/2"></span>
            </button>

            <button 
              onClick={() => setAppPhase('multiplayer-lobby')}
              className="w-full py-3.5 bg-transparent border-2 border-[#00FFFF] text-[#00FFFF] font-black tracking-[0.2em] hover:bg-[#00FFFF]/10 transition-all uppercase shadow-[0_0_15px_rgba(0,255,255,0.2)] text-xs relative flex items-center justify-center px-6"
            >
              <span>🌐 [ ÇEVRİMİÇİ SAVAŞ (1V1) ]</span>
              <span className="status-dot-cyan absolute right-6 top-1/2 -translate-y-1/2"></span>
            </button>

            <button
              id="btn-load-game"
              onClick={() => setAppPhase('save-load')}
              className="w-full py-2.5 bg-transparent hover:bg-mil-panel text-mil-green font-bold tracking-widest border border-mil-greenDim/50 transition-all text-xs flex items-center justify-center gap-2 px-6"
            >
              <span>📂 [ KAYIT YÜKLE ]</span>
            </button>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setShowSettings(true)}
                className="py-2.5 bg-transparent hover:bg-mil-panel text-[#00FFFF] font-bold tracking-wider border border-[#00FFFF]/30 transition-all text-[10px] uppercase"
              >
                ⚙️ [ AYARLAR ]
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="py-2.5 bg-transparent hover:bg-mil-panel text-mil-yellow font-bold tracking-wider border border-mil-yellow/30 transition-all text-[10px] uppercase shadow-[0_2px_8px_rgba(234,179,8,0.05)]"
              >
                📖 [ EL KİTABI ]
              </button>
            </div>

            <button
              onClick={() => setShowCredits(true)}
              className="w-full py-2 bg-transparent hover:bg-mil-panel text-mil-dim font-bold tracking-widest border border-mil-border/50 transition-all text-[9px] uppercase mt-1"
            >
              📜 [ SİSTEM KÜNYESİ / CREDITS ]
            </button>
          </div>
        </div>

        {/* Right Side Panel: Tactical Report (Desktop Only) */}
        <div className="hidden lg:flex flex-col w-64 flex-shrink-0 gap-4">
          <div className="terminal-grid-panel p-4 flex-1 flex flex-col min-h-[400px]">
            <div className="terminal-scan-line" />
            
            <div className="border-b border-mil-yellow/20 pb-2 mb-4">
              <span className="text-mil-yellow text-xs font-black tracking-widest uppercase glow-text-yellow flex items-center gap-2">
                <span className="status-dot-yellow"></span> [ TAKTİK RAPOR ]
              </span>
            </div>
            
            <div className="flex-1 space-y-4 font-mono text-[10px] text-mil-dim leading-relaxed">
              <div className="p-2 bg-red-950/10 border border-mil-red/20">
                <div className="text-mil-red font-bold uppercase mb-1">TEHDİT SEVİYESİ</div>
                <div className="text-mil-red font-black text-xs animate-pulse glow-text-red">
                  HIGH / KRİTİK ALARM
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-white/40 font-bold uppercase mb-1 text-[9px]">HAREKAT ALANI SEKTÖRLERİ</div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>SEKTÖR ALFA (FOB)</span>
                  <span className="text-mil-green font-bold">KONTROL ALTINDA</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>SEKTÖR BRAVO</span>
                  <span className="text-[#FFD700] font-bold">ÇATIŞMA SÜRÜYOR</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>SEKTÖR CHARLIE</span>
                  <span className="text-mil-red font-bold">DÜŞMAN KONTROLÜ</span>
                </div>
              </div>

              <div className="space-y-1 mt-2">
                <div className="text-white/40 font-bold uppercase mb-1 text-[9px]">HAVA HAREKATI</div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>F-16 CAS DESTEĞİ</span>
                  <span className="text-[#00FFFF] font-bold">HAZIR (0 TUR)</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>T-129 ATAK</span>
                  <span className="text-mil-green font-bold">MUTABIK</span>
                </div>
              </div>
 
              <div className="pt-2 mt-auto border-t border-mil-yellow/10 text-[8px] opacity-50 space-y-1">
                <div>TACTICAL_LINK_UP: 100%</div>
                <div>UH60_STATUS: IDLE</div>
                <div>COGNITIVE_ENGINE: ANTGRAV_V2</div>
              </div>
            </div>
          </div>
        </div>
 
      </div>
 
      {/* Footer & Social Links */}
      <div className="relative z-10 flex flex-col items-center mt-2 gap-3">
        <div className="flex gap-4">
            <a 
              href="https://discord.gg/UtZhzgnu3H" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-mil-dim hover:text-mil-cyan hover:glow-cyan transition-all duration-200 cursor-pointer"
              title="Discord Topluluğumuza Katıl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 127.14 96.36" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.58,67.58,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
            </a>
            <a 
              href="https://github.com/Ahmetzdemir" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-mil-dim hover:text-white transition-all duration-200 cursor-pointer"
              title="GitHub Üzerinde İncele"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
          <div className="text-mil-dim text-[10px] tracking-widest flex gap-4 mt-2">
            <span>🛡 TÜRK SİLAHLI KUVVETLERİ</span>
            <span className="animate-blink">█</span>
            <span>KARARGAH SİM SİSTEMİ</span>
          </div>
        </div>
 
      {/* Credits Modal */}
      {showCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCredits(false)} />
          <div className="relative bg-mil-bg border-2 border-mil-border w-full max-w-md p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-mil-border pb-3 mb-4 flex justify-between items-center">
              <div className="text-mil-green font-bold tracking-widest text-lg">HAKKINDA / CREDITS</div>
              <button onClick={() => setShowCredits(false)} className="text-mil-dim hover:text-mil-red text-xl transition-colors">✕</button>
            </div>
            
            {/* Credits Content */}
            <div className="space-y-6">
              <div>
                <div className="text-mil-dim text-xs tracking-widest mb-1 border-b border-mil-dim/30 pb-1">ORİJİNAL MOTOR & C++ GELİŞTİRİcisi</div>
                <div className="text-mil-textBright font-bold text-sm">S-HYDRAq</div>
              </div>
              
              <div>
                <div className="text-mil-dim text-xs tracking-widest mb-1 border-b border-mil-dim/30 pb-1">WEB PORT & UI/UX ENTEGRASYONU</div>
                <div className="text-mil-cyan font-bold text-sm">Antigravity Agency</div>
              </div>
 
              <div>
                <div className="text-mil-dim text-xs tracking-widest mb-1 border-b border-mil-dim/30 pb-1">KULLANILAN TEKNOLOJİLER</div>
                <div className="text-mil-text text-sm flex gap-2 flex-wrap">
                  <span className="bg-mil-panel px-2 py-1 rounded-sm border border-mil-border">React</span>
                  <span className="bg-mil-panel px-2 py-1 rounded-sm border border-mil-border">TypeScript</span>
                  <span className="bg-mil-panel px-2 py-1 rounded-sm border border-mil-border">Tailwind CSS</span>
                  <span className="bg-mil-panel px-2 py-1 rounded-sm border border-mil-border">Zustand</span>
                </div>
              </div>
            </div>
 
            {/* Modal Footer */}
            <div className="mt-8 pt-4 border-t border-mil-border text-center">
              <p className="text-mil-dim text-xs italic">"Taktiksel Derinlik. Asgari Hata."</p>
            </div>
          </div>
        </div>
      )}
      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowGuide(false)} />
          <div className="relative bg-mil-bg border-2 border-mil-border w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden shadow-mil-green/10">
            {/* Modal Header */}
            <div className="p-4 border-b border-mil-border flex justify-between items-center bg-mil-panel">
              <div className="flex items-center gap-3">
                <span className="text-mil-yellow text-xl">📖</span>
                <div className="text-mil-textBright font-bold tracking-tighter text-lg">SAHA KOMUTANI EL KİTABI</div>
              </div>
              <button onClick={() => setShowGuide(false)} className="text-mil-dim hover:text-mil-red text-2xl transition-colors p-1 leading-none">✕</button>
            </div>
            
            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              <div className="text-center border-b border-mil-border/50 pb-6">
                <h1 className="text-mil-green text-2xl font-black tracking-tighter mb-2">TAKTİKSEL SİMÜLASYON REHBERİ</h1>
                <p className="text-mil-text text-sm italic opacity-80">
                  Karargaha hoş geldin Komutan. Sahadaki birliklerin hayatı ve operasyonun başarısı, senin haritayı okuma, lojistik hattını ve telsiz ağını yönetme becerine bağlı.
                </p>
              </div>
 
              <section>
                <h2 className="text-mil-yellow font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-yellow pl-3">
                  1. TEMEL KONTROLLER VE TAKTİK HAREKET
                </h2>
                <div className="space-y-3 text-mil-text text-sm leading-relaxed">
                  <p>
                    Oyun tur bazlı, dinamik bir simülasyondur. Birliklerinize verdiğiniz emirlerin işlenmesi ve hareketlerin gerçekleşmesi için sağ alttaki <strong>▶ TURU BİTİR</strong> veya <strong>+5 Tur</strong> gibi butonları kullanarak turları ilerletmelisiniz.
                  </p>
                  <ul className="list-disc list-inside space-y-2 marker:text-mil-green">
                    <li><strong className="text-mil-green">Birim Seçimi:</strong> Harita üzerindeki yeşil NATO sembollerine tıklayarak veya sağ panelin en altında bulunan <strong>TİM LİSTESİ</strong> butonlarından birine tıklayarak askerinizi seçebilirsiniz.</li>
                    <li><strong className="text-mil-green">İntikal (Hareket):</strong> Bir dost asker seçiliyken haritada boş bir hücreye tıkladığınızda o noktaya doğru hareket rotası çizilir.</li>
                    <li><strong className="text-mil-green">Saldırı Rotaları:</strong> Bir dost asker seçiliyken haritadaki kırmızı bir düşmana tıkladığınızda ona doğru saldırı rotası belirlenir ve biriminiz menzile girdiğinde otomatik olarak çatışmaya girer.</li>
                  </ul>
                </div>
              </section>
 
              <section>
                <h2 className="text-mil-yellow font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-yellow pl-3">
                  2. TELSİZ GECİKMESİ VE İLETİŞİM AĞI
                </h2>
                <div className="space-y-3 text-mil-text text-sm leading-relaxed">
                  <p>
                    Haritada karargahtan uzaklaştıkça telsiz sinyal kalitesi düşer. Aradaki dağlar (▲), olumsuz hava şartları (Sis, Fırtına vb.) telsiz gecikmesini artırır.
                  </p>
                  <ul className="list-disc list-inside space-y-2 marker:text-mil-green">
                    <li><strong className="text-mil-green">Emir Gecikmesi:</strong> Telsiz sinyal gücünüze bağlı olarak gönderdiğiniz emirler birimlerinize birkaç tur gecikmeyle ulaşabilir.</li>
                    <li><strong className="text-mil-green">Telsiz Röle İstasyonu:</strong> Askerlerinize bulundukları yere telsiz rölesi (<code>telsiz_kur</code>) kurdurarak sinyal kapsamını artırabilir ve gecikmeleri tamamen sıfırlayabilirsiniz.</li>
                  </ul>
                </div>
              </section>
 
              <section>
                <h2 className="text-mil-yellow font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-yellow pl-3">
                  3. LOJİSTİK, BARK VE BİRİM ROLLERİ
                </h2>
                <div className="space-y-3 text-mil-text text-sm leading-relaxed">
                  <p>
                    Birlikleriniz zaman geçtikçe <strong>Cephane</strong> ve <strong>Erzak</strong> tüketir. Lojistik desteği kesilen birimlerin morali ve savaş gücü hızla düşer.
                  </p>
                  <ul className="list-disc list-inside space-y-2 marker:text-mil-green">
                    <li><strong className="text-mil-green">İkmal Talebi:</strong> Sağ panelden puan harcayarak cephane, erzak, medkit veya inşaat malzemesi talep edebilirsiniz.</li>
                    <li><strong className="text-mil-green">İstihkam ve İnşaat:</strong> Mühendis (Engineer) birimleri haritada <strong>FOB Karargahı</strong> (telsiz sıfırlar), <strong>Sahra Hastanesi</strong> (pasif iyileştirme), <strong>Mühimmat Deposu</strong> veya <strong>Kum Torbası</strong> (ağır siper) inşa edebilir.</li>
                  </ul>
                </div>
              </section>
 
              <section>
                <h2 className="text-mil-yellow font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-yellow pl-3">
                  4. YARALI TAHLİYESİ VE CARRY (TAŞIMA) SİSTEMİ
                </h2>
                <div className="space-y-3 text-mil-text text-sm leading-relaxed">
                  <p>
                    Çatışmada canı 20 HP veya altına düşen askerler <strong>Ağır Yaralı (Incapacitated)</strong> durumuna geçer ve yere yığılır. Kendi başlarına hareket edemez veya ateş edemezler.
                  </p>
                  <ul className="list-disc list-inside space-y-2 marker:text-mil-green">
                    <li><strong className="text-mil-green">Yaralı Taşıma (Carry):</strong> Sağlıklı bir askeri yaralının yanındaki hücreye getirip sağ paneldeki <strong>🚑 Taşı</strong> butonuna tıklayarak yaralıyı sırtlayabilirsiniz. Sırtlanan yaralı taşıyıcıyla birlikte hareket eder. <code>birak</code> komutuyla yaralıyı yere bırakabilirsiniz.</li>
                    <li><strong className="text-mil-green">Sahra Hastanesinde Tedavi:</strong> Yaralıları sırtlayarak sahra hastanesine (FOB_HOSPITAL) getirdiğinizde, turlar geçtikçe pasif olarak iyileşirler. Canları 20 HP'nin üzerine çıktığı anda ayağa kalkıp aktif göreve dönerler.</li>
                  </ul>
                </div>
              </section>
 
              <section className="bg-mil-panel p-6 border border-mil-cyan/30">
                <h2 className="text-mil-cyan font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-cyan pl-3">
                  5. HAVA DESTEK VE UH-60 HAVA NAKLİYE SİSTEMİ
                </h2>
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="border-b border-mil-border pb-3">
                    <strong className="text-mil-cyan uppercase">🚁 UH-60 HAVA NAKLİYESİ:</strong> Haritadan herhangi bir askeri seçip üstteki <strong>UH-60</strong> butonuna tıklayın, ardından haritada taşınacağı boş hedef noktayı seçin. Helikopter havadan yola çıkar. Helikopter havada veya sahada askeri yüklerken <strong>TURLARI İLERLETMELİSİNİZ</strong>.
                    <p className="mt-1 text-mil-dim">Birim helikopterle hedef noktaya ulaştığında emniyetle indirilir (yaralıysa 50 HP tedavi edilip canlandırılır). Helikopter havada iken telsiz sinyali ve hava durumuna göre düşürülme riski taşır.</p>
                  </div>
                  <div className="flex justify-between items-center border-b border-mil-border pb-2 pt-1">
                    <span className="text-mil-textBright font-bold underline decoration-mil-yellow">TOPÇU ATIŞI</span>
                    <span className="text-mil-text text-[10px] opacity-70">GENİŞ ALAN PİYADE İMHASI</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-mil-border pb-2">
                    <span className="text-mil-textBright font-bold underline decoration-mil-green">T-129 ATAK</span>
                    <span className="text-mil-text text-[10px] opacity-70">NOKTA ATIŞI DÜŞMAN ZIRHLI İMHASI</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-mil-border pb-2">
                    <span className="text-mil-textBright font-bold underline decoration-mil-red">✈️ F-16 HAVA SALDIRISI</span>
                    <span className="text-mil-text text-[10px] opacity-70">BÜYÜK ALAN HAVA BOMBARDIMANI</span>
                  </div>
                </div>
              </section>

              <div className="text-center pt-10 opacity-30 select-none pointer-events-none">
                <div className="text-[10px] tracking-[0.5em] text-mil-textBright mb-2">SİZİN İÇİN ÖLMEYE HAZIRLAR</div>
                <div className="flex justify-center gap-2 text-2xl">🪖 ⚕️ 🔧 🛡️ 🎯 💥</div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-mil-border bg-mil-panel flex justify-center">
              <button 
                onClick={() => setShowGuide(false)}
                className="px-10 py-2 bg-mil-green hover:bg-mil-greenBright text-mil-bg font-black tracking-[0.2em] transition-all duration-200 uppercase text-sm shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              >
                ANLAŞILDI KOMUTAN!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-[#0A0E17] border-2 border-[#00FFFF]/30 w-full max-w-sm p-6 shadow-2xl">
            <div className="border-b border-[#00FFFF]/20 pb-3 mb-6 flex justify-between items-center">
              <div className="text-[#00FFFF] font-bold tracking-widest text-lg uppercase font-mono">TERMINAL AYARLARI</div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="text-mil-dim hover:text-mil-red text-xl transition-colors font-sans"
              >✕</button>
            </div>

            <div className="space-y-8">
              {/* Music Volume */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-mil-textBright text-xs font-bold tracking-widest">MÜZİK VE AMBİYANS</span>
                  <span className="text-[#00FFFF] text-xs font-mono">{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#111827] rounded-lg appearance-none cursor-pointer accent-[#00FFFF]"
                  style={{ accentColor: '#00FFFF' }}
                />
              </div>

              {/* SFX Volume */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-mil-textBright text-xs font-bold tracking-widest">SES EFEKTLERİ</span>
                  <span className="text-[#00FF00] text-xs font-mono">{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#111827] rounded-lg appearance-none cursor-pointer accent-[#00FF00]"
                  style={{ accentColor: '#00FF00' }}
                />
              </div>

              {/* Global Mute Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-[#00FFFF]/10">
                <span className="text-mil-dim text-[10px] tracking-widest uppercase">GLOBAL SES ÇIKIŞI</span>
                <button
                  onClick={toggleMute}
                  className={`px-4 py-1 border text-[10px] transition-all uppercase tracking-widest ${isMuted ? 'border-mil-red text-mil-red' : 'border-[#00FFFF]/50 text-[#00FFFF]'}`}
                >
                  {isMuted ? "SESSİZ" : "AKTİF"}
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2 bg-[#00FFFF]/10 border border-[#00FFFF]/50 text-[#00FFFF] font-bold text-xs tracking-widest hover:bg-[#00FFFF]/20 transition-all uppercase"
              >
                KAYDET VE KAPAT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
