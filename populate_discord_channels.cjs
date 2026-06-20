/**
 * Taktiksel Simülasyon (Tactical Sim) — Kanalları Doldurma Betiği (.cjs)
 * 
 * Bu betik, Discord API'sini kullanarak oluşturulan kanalları oyunun
 * içeriğine uygun zengin görünümlü (Embed) rehberler, kurallar ve 
 * "Nasıl Oynanır?" el kitapları ile otomatik olarak doldurur.
 * 
 * NASIL KULLANILIR?
 * 1. Terminalde çalıştırın: node populate_discord_channels.cjs
 * 2. Bot Token ve Sunucu ID'nizi girin.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const EMBED_COLORS = {
  green: 2278750,  // #22C55E
  cyan: 439956,    // #06B6D4
  yellow: 15381256, // #EAB308
  red: 15680580    // #EF4444
};

async function start() {
  console.log("==========================================================");
  console.log("    DISCORD METİN KANALLARI İÇERİK YAPILANDIRMA SİSTEMİ");
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
      await populateChannels(token.trim(), guildId.trim());
    });
  });
}

async function populateChannels(token, guildId) {
  const headers = {
    'Authorization': `Bot ${token}`,
    'Content-Type': 'application/json'
  };

  const apiBase = `https://discord.com/api/v10`;

  try {
    console.log("\n[+] Sunucu kanalları taranıyor...");
    const channelsRes = await fetch(`${apiBase}/guilds/${guildId}/channels`, { headers });
    if (!channelsRes.ok) {
      throw new Error(`Kanallar taranamadı. Kod: ${channelsRes.status}`);
    }
    const channels = await channelsRes.json();
    console.log(`[✔] Toplam ${channels.length} kanal bulundu.`);

    // Hedef kanalları bulalım
    const findChannel = (name) => channels.find(c => c.name.includes(name));
    
    const rulesChan = findChannel("kurallar-ve-roe");
    const guideChan = findChannel("taktik-ve-strateji");
    const missionsChan = findChannel("harekat-görevleri");
    const generalChan = findChannel("genel-frekans");

    const sendEmbed = async (channelId, payload) => {
      const res = await fetch(`${apiBase}/channels/${channelId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      return res.ok;
    };

    // 1. KURALLAR VE ROE (#📖-kurallar-ve-roe)
    if (rulesChan) {
      console.log("[+] #📖-kurallar-ve-roe kanalı dolduruluyor...");
      const payload = {
        embeds: [
          {
            title: "🛡️ HAREKAT MERKEZİ — SUNUCU ROE (RULES OF ENGAGEMENT)",
            description: "Taktiksel Simülasyon karargahına hoş geldiniz Komutan. Sunucumuzda asgari disiplini ve düzeni korumak amacıyla aşağıdaki kurallara (ROE) uyulması zorunludur:",
            color: EMBED_COLORS.red,
            fields: [
              {
                name: "1. 🪖 Askeri Disiplin",
                value: "Diğer komutanlara, geliştiricilere ve erlere karşı saygılı olun. Argo, hakaret, aşağılama ve toksik davranışlar doğrudan askeri inzibat (Moderatörler) tarafından uzaklaştırma ile sonuçlandırılır."
              },
              {
                name: "2. 📡 Muhabere Temizliği",
                value: "Telsiz kanallarını (genel sohbet ve diğer kanallar) gereksiz yere meşgul etmeyin, spam yapmayın. Reklam, satış veya zararlı yazılım linkleri paylaşmak kesinlikle yasaktır."
              },
              {
                name: "3. 🎯 Doğru Raporlama",
                value: "Kanalları amaçlarına göre kullanın. Hataları #🐛-hata-raporu kanalına, taktik ve stratejilerinizi #💡-taktik-ve-strateji kanalına raporlayın."
              },
              {
                name: "4. 🔐 Adil Mücadele",
                value: "Oyun içi açıkları (exploit) veya hileleri diğer oyunculara yaymak yerine doğrudan [AR-GE] / Geliştirici ekibine DM yoluyla bildirin."
              },
              {
                name: "🔓 SUNUCUYA KATILIM VE ERİŞİM",
                value: "Yukarıdaki kuralları kabul edip sunucudaki tüm kanallara erişmek için aşağıdaki **🪖** emojisine tıklayarak **[SUBAY]** rütbesi alabilir ve cephe hattına katılabilirsiniz!"
              }
            ],
            footer: { text: "Taktiksel Derinlik. Asgari Hata. | Genelkurmay Başkanlığı" }
          }
        ]
      };
      await sendEmbed(rulesChan.id, payload);
      console.log("  [✔] Gönderildi.");
    }

    // 2. NEDİR / NASIL OYNANIR (#💡-taktik-ve-strateji)
    if (guideChan) {
      console.log("[+] #💡-taktik-ve-strateji kanalı dolduruluyor...");
      const embeds = [
        {
          title: "🎮 TAKTİKSEL SİMÜLASYON NEDİR?",
          description: "**Taktiksel Simülasyon**, gerçek zamanlı askeri manga yönetimi, telsiz gecikmesi, lojistik ikmal ve helikopterle yaralı tahliyesi (MEDEVAC) mekaniklerine sahip derinlemesine bir taktik simülatörüdür. Karargahtaki **Taktik Komutan** olarak sahadaki birimlere telsiz üzerinden emirler verir, destek operasyonlarını yönetir ve düşmanı etkisiz hale getirmeye çalışırsınız.",
          color: EMBED_COLORS.green,
          fields: [
            {
              name: "⚙️ Temel Sistemler",
              value: "• **Zaman Akışı:** Oyun tur ve dakika bazlıdır. Emirlerinizin sahada işlenmesi için sağ paneldeki `+1 DK` veya `+5 DK` butonlarıyla zamanı ilerletmelisiniz.\n• **Telsiz Gecikmesi (Radio Latency):** Birimleriniz karargahtan uzaklaştıkça veya dağlar, fırtınalı hava şartları gibi engeller araya girdikçe telsiz sinyal gücü düşer. Sinyal gücü düştükçe birimlere gönderilen emirlerin ulaşması **gecikmeli (birkaç dakika sonra)** olur.\n• **Telsiz Röleleri:** Askerlerinize telsiz rölesi (`telsiz_kur`) kurdurarak sinyal kapsamını artırabilir ve gecikmeyi sıfırlayabilirsiniz."
            }
          ]
        },
        {
          title: "🕹️ NASIL OYNANIR? (KONTROLLER VE ROLLER)",
          description: "Sahada başarılı olmak için birimlerin rollerini ve lojistik mekaniklerini çok iyi bilmeniz gerekir:",
          color: EMBED_COLORS.cyan,
          fields: [
            {
              name: "🪖 Birim Seçimi ve Hareket",
              value: "Haritadaki NATO sembollerine tıklayarak dost askerleri seçebilirsiniz. Seçili bir asker varken boş bir hücreye tıklamak **İntikal (Hareket) rotası**, kırmızı bir düşmana tıklamak ise **Saldırı rotası** çizer."
            },
            {
              name: "🔧 Sahadaki Askeri Roller",
              value: "• **Zırhlı Tim (Armored):** Yüksek can ve mühimmat kapasitesi. Tank ve zırhlı araçları imha etmede etkilidir.\n• **Piyade (Rifleman):** Dengeli, telsiz rölesi taşıyabilen ve hızlı intikal edebilen komandolar.\n• **Ağır Silah Timi (MG):** Yoğun baskı ateşi uygulayarak düşmanın moralini çökertir.\n• **İstihkam (Engineer):** Sahada Karargah (FOB), Sahra Hastanesi, Mühimmat Deposu ve Kum Torbası (Siper) inşa edebilir.\n• **Sıhhiyeci (Medic):** Canı azalan birimleri hızlıca tedavi edebilir.\n• **Keskin Nişancı (Sniper):** Yüksek menzil ve görünmezlik, tek atışta kritik hasar."
            },
            {
              name: "🚑 Yaralı Taşıma (Carry) ve Tedavi",
              value: "Çatışmalarda canı 20 HP altına düşen birimler ağır yaralanarak yere yığılır (Incapacitated). Onları kurtarmak için:\n1. Sağlıklı bir askeri yanındaki hücreye getirin.\n2. Sağ paneldeki **Taşı (Carry)** butonuna basarak yaralıyı sırtlayın.\n3. Sahra Hastanesine (FOB Hospital) getirip yere bırakın. Hastanede zaman geçtikçe pasif olarak iyileşip ayağa kalkacaklardır."
            },
            {
              name: "🚁 Destek Birimleri ve Hava Tahliyesi",
              value: "• **UH-60 MEDEVAC:** Havadan yaralı tahliyesi. Seçili askere MEDEVAC emri verip haritada iniş noktası seçtiğinizde helikopter gelir ve yaralıyı güvenli bölgeye taşır.\n• **T-129 ATAK & Airstrike:** Düşman zırhlılarını nokta atışıyla yok etmek için ATAK helikopterini veya geniş alan imhası için F-16 hava taarruzunu çağırabilirsiniz."
            }
          ],
          footer: { text: "Rehber son güncelleme: v2.0" }
        }
      ];

      for (const embed of embeds) {
        await sendEmbed(guideChan.id, { embeds: [embed] });
      }
      console.log("  [✔] Gönderildi.");
    }

    // 3. HAREKAT GÖREVLERİ (#🏆-harekat-görevleri)
    if (missionsChan) {
      console.log("[+] #🏆-harekat-görevleri kanalı dolduruluyor...");
      const payload = {
        embeds: [
          {
            title: "🏆 SUNUCU HAREKAT GÖREVLERİ VE MÜCADELELER",
            description: "Harekat alanında rütbenizi yükseltmek ve **[BORDO BERELİ]** rolünü kazanmak için aşağıdaki haftalık mücadeleleri tamamlayıp ekran görüntülerini veya kayıtlarını #💡-taktik-ve-strateji kanalına gönderebilirsiniz:",
            color: EMBED_COLORS.yellow,
            fields: [
              {
                name: "🚩 Mücadele 1: Demir Karakol (Karakol Savunması)",
                value: "Karakol Savunması senaryosunu (Şafak Baskını) **HARD (ZOR)** zorluk seviyesinde, hiçbir dost timi kaybetmeden ve MEDEVAC helikopterini düşürmeden 120 dakika boyunca başarıyla tamamlayın."
              },
              {
                name: "✈️ Mücadele 2: Hakurk Hayaletleri (Pençe-Kartal)",
                value: "Pençe-Kartal operasyonunda, düşman devriyelerine yakalanmadan ve alarm seviyesini yükseltmeden keskin nişancı birliğinizle tüm mağara korumalarını 15 dakika (tur) içerisinde etkisiz hale getirin."
              },
              {
                name: "🌐 Mücadele 3: Cephe Fatihi (1v1 Çevrimiçi)",
                value: "1v1 Draft savaş modunda arka arkaya 5 zafer elde edin ve liderlik tablosunda üst sıralara yükselin."
              }
            ]
          }
        ]
      };
      await sendEmbed(missionsChan.id, payload);
      console.log("  [✔] Gönderildi.");
    }

    // 4. GENEL SOHBET / HAREKAT LOBİSİ (#💬-genel-frekans)
    if (generalChan) {
      console.log("[+] #💬-genel-frekans kanalı dolduruluyor...");
      const payload = {
        embeds: [
          {
            title: "💬 MÜŞTEREK HAREKAT MERKEZİ — ANA TELSİZ",
            description: "Genel telsiz frekansına bağlandınız komutan. Burası diğer taktik komutanlarla sohbet edebileceğiniz, oyun hakkındaki fikirlerinizi paylaşabileceğiniz ana lobidir.",
            color: EMBED_COLORS.cyan,
            fields: [
              {
                name: "🛠️ Serbest Mod (Sandbox) & Harita Tasarımları",
                value: "Sandbox modunda kendi taktik haritalarınızı oluşturup yerleşim planlarınızı bu kanalda veya #🖼️-radar-görüntüleri kanalında paylaşarak diğer komutanlarla tartışabilirsiniz!"
              }
            ]
          }
        ]
      };
      await sendEmbed(generalChan.id, payload);
      console.log("  [✔] Gönderildi.");
    }

    console.log("\n==========================================================");
    console.log("🎉 TÜM KANALLAR OYUN İÇERİĞİNE GÖRE BAŞARIYLA DOLDURULDU!");
    console.log("==========================================================");

  } catch (error) {
    console.error("\n[✕] Hata oluştu:", error.message);
  }
}

start();
