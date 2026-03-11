import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
export function MainMenu() {
  const { setAppPhase } = useGameStore()
  const [showCredits, setShowCredits] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-mil-bg relative overflow-hidden font-mono">
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
      <div className="relative z-10 flex flex-col items-center justify-center gap-10 p-6 md:p-12 w-full max-w-4xl">
        {/* Logo / Banner */}
        <div className="text-center">
          <div className="text-mil-red font-bold text-xs tracking-widest mb-2 opacity-70">
            ▸ TAKTİKSEL SİMÜLASYON SİSTEMİ v2.0 ◂
          </div>
          <pre className="text-mil-green font-bold text-sm leading-tight hidden md:block select-none"
            style={{ textShadow: '0 0 20px rgba(34,197,94,0.5)' }}>
{`  ████████╗ █████╗ ██████╗████████╗██╗ ██████╗ █████╗ ██╗
     ██╔══╝██╔══██╗██╔════╝   ██╔══╝██║██╔════╝██╔══██╗██║
     ██║   ███████║██║        ██║   ██║██║     ███████║██║
     ██║   ██╔══██║██║        ██║   ██║██║     ██╔══██║██║
     ██║   ██║  ██║╚██████╗   ██║   ██║╚██████╗██║  ██║███████╗
     ╚═╝   ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝`}
          </pre>
          <div className="text-mil-green text-2xl font-bold md:hidden"
            style={{ textShadow: '0 0 16px rgba(34,197,94,0.5)' }}>
            ⚔ TAKTİKSEL SİMÜLASYON
          </div>
          <div className="text-mil-dim text-sm mt-3 tracking-wider">
            TAKTİKSEL MANGA YÖNETİM SİMÜLASYONU — WEB
          </div>
        </div>

        {/* Mission briefing */}
        <div className="border border-mil-border bg-mil-panel px-8 py-4 max-w-lg text-center">
          <div className="text-mil-yellow text-xs tracking-widest mb-2">[ BRİFİNG ]</div>
          <p className="text-mil-text text-sm leading-relaxed">
            Siz <span className="text-mil-green font-bold">karargahdasınız.</span> Birimler sahada.
            Telsiz bağlantısı aktif. Emirlerinizi verin, savaşı yönetin.
          </p>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => setAppPhase('scenario-select')}
            className="w-full py-4 bg-green-950 text-mil-red border-2 border-mil-red/30 font-black tracking-widest hover:bg-green-900 transition-all uppercase shadow-[0_5px_15px_rgba(239,68,68,0.2)] animate-glow"
          >
            Harekât Başlat
          </button>

          <button 
            onClick={() => setAppPhase('sandbox-lobby')}
            className="w-full py-4 bg-mil-panel border-2 border-mil-cyan text-mil-cyan font-black tracking-widest hover:bg-mil-cyan/10 transition-all uppercase"
          >
            Serbest Mod (Sandbox)
          </button>
          <button
            id="btn-load-game"
            onClick={() => setAppPhase('save-load')}
            className="w-full py-3 px-6 bg-transparent hover:bg-mil-panel text-mil-green font-bold tracking-wider border border-mil-greenDim transition-all duration-200 text-sm"
          >
            📂 KAYIT YÜKLE
          </button>
           <button
            onClick={() => setShowGuide(true)}
            className="w-full py-3 px-6 bg-transparent hover:bg-mil-panel text-mil-yellow font-bold tracking-wider border border-mil-yellow/30 transition-all duration-200 text-sm mt-1 shadow-[0_4px_12px_rgba(234,179,8,0.1)]"
          >
            📖 NASIL OYNANIR? (REHBER)
          </button>
          <button
            onClick={() => setShowCredits(true)}
            className="w-full py-2 px-6 bg-transparent hover:bg-mil-panel text-mil-dim font-bold tracking-wider border border-mil-border transition-all duration-200 text-xs mt-1"
          >
            📜 HAKKINDA / CREDITS
          </button>
        </div>

        {/* Footer & Social Links */}
        <div className="flex flex-col items-center mt-6 gap-3">
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
                  Karargaha hoş geldin Komutan. Sahadaki birliklerin hayatı ve operasyonun başarısı, senin haritayı okuma ve telsiz ağını yönetme becerine bağlı. 
                </p>
              </div>

              <section>
                <h2 className="text-mil-yellow font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-yellow pl-3">
                  1. TEMEL MEKANİKLER VE İLETİŞİM AĞI
                </h2>
                <div className="space-y-4 text-mil-text text-sm leading-relaxed">
                  <p>
                    Oyun sıra tabanlı değil, <span className="text-mil-textBright font-bold underline decoration-mil-red">zaman akışlıdır (dakika bazlı simülasyon)</span>. Verdiğin hiçbir emir anında gerçekleşmez.
                  </p>
                  <ul className="list-disc list-inside space-y-2 marker:text-mil-green">
                    <li><strong className="text-mil-green">İletişim Gecikmesi:</strong> Birliklere verdiğin emirler radyo dalgalarıyla iletilir. Hedef birlik karargahtan uzaksa, arada dağlar (<span className="text-mil-yellow">▲</span>) varsa veya şiddetli yağmur/fırtına yaşanıyorsa emirlerin ulaşması dakikalar sürebilir.</li>
                    <li><strong className="text-mil-green">Otonomi ve Atış İzni (ROE):</strong> Birliklerinizle telsiz bağlantınız kopsa bile onlar savaşmaya devam eder. Önceden "Serbest Atış" veya "Sadece Karşılık Ver" gibi angajman kuralları belirlemeyi unutmayın.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-mil-yellow font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-yellow pl-3">
                  2. BİRİM ROLLERİ VE LOJİSTİK
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { role: 'Piyade', desc: 'Temel savaş gücünüz.' },
                    { role: 'Makineli Tüfek', desc: 'Düşmanı "Baskı Altına Alır" (Suppression) ve moralini kırar.' },
                    { role: 'Keskin Nişancı', desc: '%30 kritik vuruş şansıyla piyadeleri uzaktan avlar.' },
                    { role: 'Zırhlı (Tank)', desc: 'Yüksek hasar ve zırha sahiptir ancak görüşü dardır.' },
                    { role: 'Mühendis', desc: 'Zırhlı hedefleri delmek için ekstra hasar bonusuna sahiptir.' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-mil-panel/50 p-3 border border-mil-border/50">
                      <div className="text-mil-green font-bold text-xs uppercase mb-1 tracking-widest">{item.role}</div>
                      <div className="text-mil-text text-xs leading-snug">{item.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 border border-mil-red/30 bg-red-950/10 text-xs italic">
                  <strong className="text-mil-red uppercase">Lojistik Kuralı:</strong> Askerleriniz zaman geçtikçe Erzak ve Cephane tüketir. Canı 50'nin altına düşen askerler, envanterinde varsa otomatik olarak <span className="text-mil-green font-bold text-sm">Medkit</span> kullanır. Telsizden ikmal çağırmayı unutmayın!
                </div>
              </section>

              <section>
                <h2 className="text-mil-yellow font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-yellow pl-3">
                  3. İLERİ DÜZEY SAHA TAKTİKLERİ
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <span className="text-mil-green text-xl">🛡</span>
                    <div>
                      <div className="text-mil-textBright font-bold text-sm mb-1">Örs ve Çekiç</div>
                      <p className="text-mil-dim text-xs leading-relaxed">Bir Makineli Tüfek (MG) birimiyle düşmana baskı ateşi açıp morallerini düşürün. Düşman başını kaldıramazken Keskin Nişancınızla uzaktan işi bitirin.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="text-mil-green text-xl">⛈</span>
                    <div>
                      <div className="text-mil-textBright font-bold text-sm mb-1">Fırtına Savunması</div>
                      <p className="text-mil-dim text-xs leading-relaxed">Fırtınalı havalarda telsizler kesilir ve ATAK helikopterleri uçamaz. Hava bozduğunda birliklerinizi güvenli konumlara çekip fırtınanın geçmesini bekleyin.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="text-mil-green text-xl">🚜</span>
                    <div>
                      <div className="text-mil-textBright font-bold text-sm mb-1">Zırhlı Öncü, Mühendis Artçı</div>
                      <p className="text-mil-dim text-xs leading-relaxed">Zırhlıları önden sürüp düşman ateşini üzerinize çekin. Ancak tankınızı korumak için hemen arkasında düşman zırhlılarını delecek Mühendislerinizi hazır tutun.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-mil-panel p-6 border border-mil-cyan/30">
                <h2 className="text-mil-cyan font-bold text-lg mb-4 flex items-center gap-2 border-l-4 border-mil-cyan pl-3">
                   4. HAVA DESTEK UNSURLARI
                </h2>
                <div className="space-y-3 text-xs">
                  <p className="text-mil-dim italic mb-2">Karargahın ateş ve kurtarma desteğini kullanın, ancak gecikmeleri unutmayın:</p>
                  <div className="flex justify-between items-center border-b border-mil-border pb-2">
                    <span className="text-mil-textBright font-bold underline decoration-mil-yellow">TOPÇU ATIŞI</span>
                    <span className="text-mil-text text-[10px] opacity-70">GENİŞ ALAN / PİYADE İMHASI</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-mil-border pb-2">
                    <span className="text-mil-textBright font-bold underline decoration-mil-green">T-129 ATAK</span>
                    <span className="text-mil-text text-[10px] opacity-70">NOKTA ATIŞI / ZIRHLI İMHASI</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-mil-border pb-2">
                    <span className="text-mil-textBright font-bold underline decoration-mil-cyan">UH-60 BLACK HAWK</span>
                    <span className="text-mil-text text-[10px] opacity-70">TAHLİYE / GLOBAL MORAL BUFF</span>
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
    </div>
  )
}
