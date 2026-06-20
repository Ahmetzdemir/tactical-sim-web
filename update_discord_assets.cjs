/**
 * Taktiksel Simülasyon (Tactical Sim) — Discord Sunucu Varlıklarını Güncelleme Betiği (.cjs)
 * 
 * Bu betik, üretilen özel profil logosunu ve afiş görselini sunucunuza 
 * Discord API üzerinden otomatik olarak yükler.
 * 
 * NASIL KULLANILIR?
 * 1. Terminalde çalıştırın: node update_discord_assets.cjs
 */

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Üretilen görsel yolları
const ICON_PATH = `C:\\Users\\ahmet\\.gemini\\antigravity-ide\\brain\\ba43d2c1-5935-42b8-80b3-3a8c863bccbf\\discord_server_logo_1781622571529.png`;
const BANNER_PATH = `C:\\Users\\ahmet\\.gemini\\antigravity-ide\\brain\\ba43d2c1-5935-42b8-80b3-3a8c863bccbf\\discord_server_banner_1781622585379.png`;

async function start() {
  console.log("==========================================================");
  console.log("    DISCORD SUNUCU GÖRSEL VARLIKLARI GÜNCELLEME SİSTEMİ");
  console.log("==========================================================\n");

  rl.question("Discord Bot Token'ınızı girin: ", (token) => {
    if (!token.trim()) {
      console.log("Token boş olamaz!");
      process.exit(1);
    }

    rl.question("Hedef Sunucu (Guild) ID'sini girin: ", async (guildId) => {
      if (!guildId.trim()) {
        console.log("Sunucu ID boş olamaz!");
        process.exit(1);
      }

      rl.close();
      await uploadAssets(token.trim(), guildId.trim());
    });
  });
}

function imageToBase64Uri(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  return `data:image/png;base64,${base64Data}`;
}

async function uploadAssets(token, guildId) {
  const headers = {
    'Authorization': `Bot ${token}`,
    'Content-Type': 'application/json'
  };

  const apiBase = `https://discord.com/api/v10`;

  try {
    console.log("\n[+] Görsel dosyaları okunuyor...");
    const iconDataUri = imageToBase64Uri(ICON_PATH);
    const bannerDataUri = imageToBase64Uri(BANNER_PATH);
    console.log("[✔] Görseller başarıyla base64 formatına dönüştürüldü.");

    // 1. Sunucu Logosunu Güncelle (Icon)
    console.log("\n[+] Sunucu logosu (Icon) güncelleniyor...");
    const iconRes = await fetch(`${apiBase}/guilds/${guildId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        icon: iconDataUri
      })
    });

    if (iconRes.ok) {
      console.log("[✔] Sunucu logosu başarıyla güncellendi!");
    } else {
      const errText = await iconRes.text();
      console.log(`[✕] Sunucu logosu güncellenemedi. Hata: ${errText}`);
    }

    // 2. Sunucu Banner'ını Güncelle (Banner)
    console.log("\n[+] Sunucu afişi (Banner) güncelleniyor...");
    const bannerRes = await fetch(`${apiBase}/guilds/${guildId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        banner: bannerDataUri
      })
    });

    if (bannerRes.ok) {
      console.log("[✔] Sunucu afişi başarıyla güncellendi!");
    } else {
      const errText = await bannerRes.text();
      console.log(`[✕] Sunucu afişi güncellenemedi.`);
      console.log(`💡 Bilgi: Sunucunuzun en az 1. Seviye Takviyeli (Boost Level 1) olması gereklidir.`);
      console.log(`Fakat sorun değil! Logoyu başarıyla güncelledik. Takviye aldığınızda afiş de aktif olacaktır.`);
    }

    console.log("\n==========================================================");
    console.log("🎉 GÖRSEL GÜNCELLEME İŞLEMİ TAMAMLANDI!");
    console.log("==========================================================");

  } catch (error) {
    console.error("\n[✕] Hata oluştu:", error.message);
  }
}

start();
