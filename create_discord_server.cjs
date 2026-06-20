/**
 * Taktiksel Simülasyon (Tactical Sim) — Discord Sunucusu Otomatik Kurulum Betiği (.cjs)
 * 
 * Bu betik, Discord REST API'sini kullanarak belirttiğiniz boş bir sunucuda
 * tüm kategorileri, kanalları, rütbeleri (rolleri) ve izin hiyerarşilerini
 * sıfır bağımlılıkla (harici kütüphane kurmadan) otomatik oluşturur.
 * 
 * NASIL KULLANILIR?
 * 1. Bir Discord Botu oluşturun (https://discord.com/developers/applications adresinden).
 * 2. Bota "Manage Roles" ve "Manage Channels" yetkileri verip hedef sunucunuza davet edin.
 * 3. Bot Token'ınızı ve Sunucu (Guild) ID'nizi bu betiği çalıştırırken girin.
 * 4. Terminalde çalıştırın: node create_discord_server.cjs
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const hexToDec = (hex) => parseInt(hex.replace('#', ''), 16);

// Rol Tanımları
const ROLES_TO_CREATE = [
  { name: "[GENELKURMAY] / Admin", color: "#22C55E", hoist: true, mentionable: true },
  { name: "[AR-GE] / Geliştirici", color: "#06B6D4", hoist: true, mentionable: true },
  { name: "[J-STAFF] / Karargah Subayı", color: "#EF4444", hoist: true, mentionable: true },
  { name: "[BORDO BERELİ] / Gazi Komutan", color: "#EAB308", hoist: true, mentionable: true },
  { name: "[SUBAY] / Taktik Komutan", color: "#4A5D23", hoist: true, mentionable: true },
  { name: "[ER] / Yeni Katılım", color: "#4B5563", hoist: true, mentionable: false }
];

// İzin Bitleri (Discord v10)
const PERMS = {
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  ADD_REACTIONS: 1n << 6n,
};

async function start() {
  console.log("==========================================================");
  console.log("   TAKTİKSEL SİMÜLASYON DISCORD OTOMATİK KURULUM SİSTEMİ");
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
      await runInstallation(token.trim(), guildId.trim());
    });
  });
}

async function runInstallation(token, guildId) {
  const headers = {
    'Authorization': `Bot ${token}`,
    'Content-Type': 'application/json'
  };

  const apiBase = `https://discord.com/api/v10`;

  try {
    console.log("\n[+] Bağlantı test ediliyor...");
    const guildRes = await fetch(`${apiBase}/guilds/${guildId}`, { headers });
    if (!guildRes.ok) {
      throw new Error(`Sunucuya erişilemedi. Token veya Sunucu ID hatalı olabilir. Hata kodu: ${guildRes.status}`);
    }
    const guildData = await guildRes.json();
    console.log(`[✔] Bağlantı başarılı! Hedef Sunucu: ${guildData.name}\n`);

    console.log("[+] Roller oluşturuluyor...");
    const createdRoles = {};
    for (const r of ROLES_TO_CREATE) {
      const res = await fetch(`${apiBase}/guilds/${guildId}/roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: r.name,
          color: hexToDec(r.color),
          hoist: r.hoist,
          mentionable: r.mentionable
        })
      });
      if (res.ok) {
        const roleData = await res.json();
        createdRoles[r.name] = roleData.id;
        console.log(`  [✔] Rol oluşturuldu: ${r.name}`);
      } else {
        console.log(`  [✕] Rol oluşturulamadı: ${r.name}`);
      }
    }

    const subayRoleId = createdRoles["[SUBAY] / Taktik Komutan"];
    const erRoleId = createdRoles["[ER] / Yeni Katılım"];
    const everyoneRoleId = guildId; // @everyone rol ID'si Sunucu ID'si ile aynıdır.

    console.log("\n[+] Kategoriler ve Kanallar oluşturuluyor (İzinler Ayarlanıyor)...");

    // Kategori ve Kanal Yapısı
    const CATEGORIES = [
      {
        name: "「📡」KARARGAH DUYURULARI",
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: erRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: subayRoleId, type: 0, allow: String(PERMS.VIEW_CHANNEL), deny: String(PERMS.SEND_MESSAGES) }
        ],
        channels: [
          { name: "📢-telsiz-duyuruları", topic: "Oyun ve sunucu hakkındaki resmi duyurular." },
          { name: "📜-güncelleme-notları", topic: "Versiyon güncellemeleri, yama notları ve commit logları." },
          { name: "🏆-harekat-görevleri", topic: "Haftalık taktik mücadeleler ve hız rekoru denemeleri." }
        ]
      },
      {
        name: "「🛡️」YENİ KATILIM & ROE",
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: erRoleId, type: 0, allow: String(PERMS.VIEW_CHANNEL | PERMS.ADD_REACTIONS), deny: String(PERMS.SEND_MESSAGES) },
          { id: subayRoleId, type: 0, allow: String(PERMS.VIEW_CHANNEL), deny: String(PERMS.SEND_MESSAGES) }
        ],
        channels: [
          { name: "📖-kurallar-ve-roe", topic: "Çatışma Kuralları (Rules of Engagement) ve onay mekanizması." },
          { name: "🚪-katılım-telsizi", topic: "Sunucuya yeni giriş yapan komutanların karşılama logları." }
        ]
      },
      {
        name: "「📡」ANA TELSİZ FREKANSI",
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: erRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: subayRoleId, type: 0, allow: String(PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES), deny: "0" }
        ],
        channels: [
          { name: "💬-genel-frekans", topic: "Genel taktik dışı sohbet kanalı." },
          { name: "💡-taktik-ve-strateji", topic: "Senaryoları geçme yolları ve harita yerleşim tartışmaları." },
          { name: "🖼️-radar-görüntüleri", topic: "Sandbox modunda tasarlanan harita ekran görüntüleri." }
        ]
      },
      {
        name: "「🚁」1V1 CEPHE HATTI",
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: erRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: subayRoleId, type: 0, allow: String(PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES), deny: "0" }
        ],
        channels: [
          { name: "🌐-eşleşme-arama", topic: "1v1 Çevrimiçi modda savaşacak rakip arama telsizi." },
          { name: "📊-liderlik-tablosu", topic: "1v1 karşılaşmalarının raporları ve skorboardu." }
        ]
      },
      {
        name: "「📁」HAREKAT DOSYALARI",
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: erRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: subayRoleId, type: 0, allow: String(PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES), deny: "0" }
        ],
        channels: [
          { name: "📁-op-1-firat-kalkani", topic: "Fırat Kalkanı Harekatı (Cerablus) taarruz taktikleri." },
          { name: "📁-op-2-zeytin-dali", topic: "Zeytin Dalı Harekatı (Afrin) dağlık mevzi taarruz taktikleri." },
          { name: "📁-op-3-baris-pinari", topic: "Barış Pınarı Harekatı (Tel Abyad) mekanize yarma taktikleri." },
          { name: "📁-op-4-pence-kartal", topic: "Pençe-Kartal Operasyonu (Hakurk) sızma ve komando taktikleri." },
          { name: "📁-op-5-kibris-atilla", topic: "Kıbrıs Barış Harekatı (Atilla) dağınık tim birleştirme taktikleri." },
          { name: "📁-op-6-karakol-savunmasi", topic: "Karakol Savunması (Şafak Baskını) savunma stratejileri." }
        ]
      },
      {
        name: "「🛠️」AR-GE MERKEZİ",
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: erRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: subayRoleId, type: 0, allow: String(PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES), deny: "0" }
        ],
        channels: [
          { name: "🐛-hata-raporu", topic: "Oyundaki bug ve hataların geliştiricilere iletildiği kanal." },
          { name: "💡-taktiksel-istekler", topic: "Yeni helikopter, silah veya özellik önerileri." }
        ]
      },
      {
        name: "「🎤」SESLİ FREKANSLAR",
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: erRoleId, type: 0, allow: "0", deny: String(PERMS.VIEW_CHANNEL) },
          { id: subayRoleId, type: 0, allow: String(PERMS.VIEW_CHANNEL), deny: "0" }
        ],
        channels: [
          { name: "🔊 | Karargah Odası", type: 2 },
          { name: "🔊 | Taktik Frekans Alpha", type: 2 },
          { name: "🔊 | Taktik Frekans Bravo", type: 2 },
          { name: "🚁 | UH-60 MEDEVAC", type: 2 }
        ]
      }
    ];

    for (const cat of CATEGORIES) {
      // 1. Kategoriyi oluştur
      const catRes = await fetch(`${apiBase}/guilds/${guildId}/channels`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: cat.name,
          type: 4, // Category
          permission_overwrites: cat.permission_overwrites
        })
      });

      if (!catRes.ok) {
        console.log(`[✕] Kategori oluşturulamadı: ${cat.name}`);
        continue;
      }

      const catData = await catRes.json();
      const catId = catData.id;
      console.log(`\n[✔] Kategori oluşturuldu: ${cat.name}`);

      // 2. Alt kanalları oluştur
      for (const ch of cat.channels) {
        const chRes = await fetch(`${apiBase}/guilds/${guildId}/channels`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: ch.name,
            type: ch.type || 0, // 0 = Text, 2 = Voice
            parent_id: catId,
            topic: ch.topic || ""
          })
        });

        if (chRes.ok) {
          console.log(`  [✔] Kanal oluşturuldu: ${ch.name}`);
        } else {
          console.log(`  [✕] Kanal oluşturulamadı: ${ch.name}`);
        }
      }
    }

    console.log("\n==========================================================");
    console.log("🎉 TEBRİKLER! HAREKAT MERKEZİ SUNUNUZ TAMAMEN KURULDU!");
    console.log("==========================================================");
    console.log("\nNot: Şimdi sunucuya gidip Carl-bot ile doğrulama");
    console.log("reaksiyonunu ayarlayabilir ve emojileri yükleyebilirsiniz.\n");

  } catch (error) {
    console.error("\n[✕] Hata oluştu:", error.message);
  }
}

start();
