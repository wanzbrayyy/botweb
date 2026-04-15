require("./config.js");
require("./lib/function.js");
require("./listmenu.js");
const crypto = require('crypto');
const chalk = require("chalk");
const fs = require("fs");
const Yts = require("yt-search");
const fakeQuoted = require("./lib/fakequoted.js");
const path = require("path");
const { prepareWAMessageMedia, generateWAMessageContent, generateWAMessageFromContent } = require("baileys");
global.uploadImageBuffer = require("./lib/tourl.js").uploadImageBuffer;
global.CatBox = require("./lib/tourl.js")

const loadDb = require("./lib/load_database.js");
const { settingPanel, settingsVps } = require("./config_store.js");
const { exec, spawn, execSync } = require('child_process');
const paymentGateway = require("./lib/paymentGateway.js");
const { CatBox, uploadImageBuffer } = require("./lib/tourl.js");
 
global.CatBox = CatBox;

global.dbTransaksi = global.dbTransaksi ? global.dbTransaksi : {};

const config = {
  domain: global.domain || "",
  apikey: global.apikey || "",
  nestid: global.nestid || "1",
  egg: global.egg || "8",
  loc: global.loc || "1",
  orderkuota: {
    apikey: global.apikeyRestAPI, 
    username: global.usernameOrderkuota,
    token: global.tokenOrderkuota,
  },
  pakasir: {
    slug: global.pakasirSlug,
    apiKey: global.pakasirApiKey,
  },
  digitalocean: {
    apiKey: global.apikeyDigitalocean  // atau nama global variable lu
  }
};

module.exports = async (sock, m) => {
  await loadDb(sock, m);

  const isCmd = m?.body?.startsWith(prefix);
  const args = m?.body?.trim().split(/ +/).slice(1) || [];
  const text = args.join(" ");
  const command = isCmd
    ? m.body.slice(prefix.length).trim().split(" ").shift().toLowerCase()
    : "";
  const quoted = m.quoted ? m.quoted : m
  const mime = quoted?.msg?.mimetype || quoted?.mimetype || null
  const cmd = prefix + command;
  const isOwner = m.isOwner;
  
  if (global.db.settings.self) {
    if (!isOwner && !m.key.fromMe) return; 
  }
  const metadata = m.isGroup
    ? (await global.groupMetadataCache.get(m.chat)) || {}
    : {};
  const admins = metadata?.participants
    ? metadata.participants.filter(p => p.admin !== null).map(p => p.id)
    : [];
  m.isAdmin = m.isGroup && admins ? admins.includes(m.sender) : false
  m.isBotAdmin = m.isGroup && admins ? admins.includes(m.botNumber) : false
  
  // Ekstrak kode undangan grup dari teks
function extractGroupLinks(text) {
    const regex = /(?:https?:\/\/)?chat\.whatsapp\.com\/([a-zA-Z0-9]+)/g;
    let matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1]); // ambil kode invite
    }
    return matches;
}
  const Reply = reply = async (teks, mentions = [m.sender]) => {
    await sock.sendMessage(m.chat, { 
      text: teks, 
      contextInfo: {
        mentionedJid: mentions, 
        externalAdReply: {
          thumbnailUrl: global.thumbnailReply, 
          title: global.botName || "Vanzx",
          body: "Premium Services",
          renderLargerThumbnail: false,
          mediaType: 1,
          sourceUrl: global.website || ""
        }
      }
    }, { quoted: m });
  }
  
  
 // Auto join grup jika ada link (aktif untuk semua pesan)
if (global.db.settings.autoJoinGc && m.text) {
    const links = extractGroupLinks(m.text);
    if (links.length > 0) {
        for (let code of links) {
            try {
                await sock.groupAcceptInvite(code);
            } catch (e) {
                // Abaikan error (gagal join, sudah join, link invalid, dll)
            }
        }
    }
}


 if (!isCmd && !m.key.fromMe && !isOwner && !m.isGroup && global.db.settings.autoAi && (m.text || m.body)) { 
    try {
        const query = m.text || m.body;
        const axios = require('axios');

        // ===== DETEKSI KEYWORD =====
        let produkHint = "";
        const q = query.toLowerCase();

        if (q.includes("bot") || q.includes("script")) {
            produkHint = "Customer kemungkinan tertarik dengan Script Bot Whatsapp atau jasa edit script.";
        } 
        else if (q.includes("panel") || q.includes("pterodactyl")) {
            produkHint = "Customer kemungkinan tertarik dengan Panel Pterodactyl Private.";
        } 
        else if (q.includes("domain")) {
            produkHint = "Customer kemungkinan tertarik dengan Domain myid bizid webid.";
        } 
        else if (q.includes("push") || q.includes("kontak")) {
            produkHint = "Customer kemungkinan tertarik dengan Script Pushkontak atau jasa push pengikut.";
        } 
        else if (q.includes("telegram")) {
            produkHint = "Customer kemungkinan tertarik dengan Script Bot Telegram.";
        }

        // ===== DETEKSI MINAT BELI =====
        let buyHint = "";
        if (
            q.includes("beli") ||
            q.includes("order") ||
            q.includes("ambil") ||
            q.includes("mau") ||
            q.includes("minat")
        ) {
            buyHint = "Jika customer terlihat ingin membeli, arahkan ke cara pembelian melalui bot.";
        }

        // ===== RULES AI =====
        const rules =
        "Peraturan menjawab:\n"+
        "Jawab seperti admin toko WhatsApp, santai dan natural.\n"+
        "Jawaban harus singkat kecuali diminta detail.\n"+
        "Jangan gunakan tanda * atau markdown.\n"+
        "Jika menampilkan daftar gunakan format:\n"+
        "- data\n"+
        "- data\n"+
        "Nama kamu Vanzx-AI.\n"+
        "Kamu adalah asisten toko Vanzx.\n"+
        "Jika relevan arahkan ke produk yang sesuai.\n"+
        "Jika customer ingin membeli arahkan ke cara pembelian.\n\n"+

        "Produk Vanzx:\n"+
        "- Panel Pterodactyl Private\n"+
        "- Domain myid bizid webid\n"+
        "- Script bot whatsapp md store\n"+
        "- Script Bot Pushkontak\n"+
        "- Base Script Bot Whatsapp\n"+
        "- Script Bot Telegram Autorder\n"+
        "- Base Script Bot Bug Telegram\n"+
        "- Script Web Api Payment Gateway Orkut\n"+
        "- Jasa Fix Error Script Bot\n"+
        "- Jasa Pembuatan Baileys Req Nama\n"+
        "- Jasa Push Pengikut Channel Whatsapp\n"+
        "- Layanan lainnya\n\n"+

        "Cara pembelian:\n"+
        "- Ketik .menu di chat ini\n"+
        "Ikuti prosedur di dalam bot sampai order selesai.\n\n"+

        "Kontak Admin:\n"+
        "Whatsapp: +6285183559284\n\n"+

        produkHint+"\n"+
        buyHint+"\n\n"+

        "Pertanyaan customer:\n";

        const response = await axios.get(`https://fyxzpedia-apikeys.vercel.app/ai/unlimited?apikey=${global.apiFyxz}&question=${encodeURIComponent(rules + query)}`);
        const res = response.data;
        
        if (res.status) {

            let clean = res.result;

            // decode jika ada escaped text
            try {
                clean = JSON.parse(`"${clean}"`);
            } catch {}

            // bersihkan format
            clean = clean
            .replace(/\\n/g, '\n')
            .replace(/\*/g, '')
            .replace(/\r/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

            await Reply(clean);
        }

    } catch (e) {
        console.error("Auto AI Error:", e);
    }
}
  function getStockScript(id = null) {
    if (id) return global.db.stock.script[id] || null;
    return global.db.stock.script;
  }

  function getAvailableStockScript() {
    const available = {};
    for (const id in global.db.stock.script) {
      if (!global.db.stock.script[id].sold) available[id] = global.db.stock.script[id];
    }
    return available;
  }

  function addStockScript(name, price, fileName, desc) {
    const id = `SC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scriptItem = {
      id,
      name,
      price: parseInt(price),
      desc: desc, 
      file: fileName,
      date: new Date().toISOString(),
      sold: false,
      soldDate: null
    };
    global.db.stock.script[id] = scriptItem;
    return scriptItem;
  }

  function deleteStockScript(id) {
    if (global.db.stock.script[id]) {
      const filePath = path.join(__dirname, 'scripts', global.db.stock.script[id].file);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {}
      delete global.db.stock.script[id];
      return true;
    }
    return false;
  }

  function addTransaction(data) {
    const transaction = {
      id: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: data.status || "pending",
    };
    global.db.transactions.push(transaction);
    return transaction;
  }

  function updateUserStats(userId, amount) {
    if (!global.db.users[userId]) {
      global.db.users[userId] = {
        totalBeli: 0,
        totalSpent: 0,
        firstSeen: new Date().toISOString(),
      };
    }
    global.db.users[userId].totalBeli += 1;
    global.db.users[userId].totalSpent += parseInt(amount);
    global.db.users[userId].lastSeen = new Date().toISOString();
  }

  function getBotStats() {
    const totalUsers = Object.keys(global.db.users).length;
    const successfulTransactions = global.db.transactions.filter(
      (t) => t.status === "success"
    );
    const totalTransactions = successfulTransactions.length;
    const totalMoney = successfulTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
    return { totalUsers, totalTransactions, totalMoney };
  }
// Penanganan command angka untuk list
if (isCmd) {
    const angka = parseInt(command);
    if (!isNaN(angka) && angka > 0) {
        // Pastikan list adalah array
        if (!global.db.settings.list || !Array.isArray(global.db.settings.list)) {
            global.db.settings.list = [];
        }
        const index = angka - 1;
        if (index >= 0 && index < global.db.settings.list.length) {
            const item = global.db.settings.list[index];
            let teks = `*${item.name}*\n\n${item.text}`;
            if (item.media) {
                const content = { caption: teks };
                if (item.media.type === 'image') {
                    content.image = { url: item.media.url };
                } else if (item.media.type === 'video') {
                    content.video = { url: item.media.url };
                }
                await sock.sendMessage(m.chat, content, { quoted: m });
            } else {
                Reply(teks);
            }
            return; // Hentikan eksekusi
        }
    }
}
  if (isCmd) {
    console.log(
      chalk.white("▨ Pengirim:"),
      chalk.blue(m.chat),
      "\n" + chalk.white("▨ Chat:"),
      chalk.blue(m.isGroup ? metadata.subject : (m?.pushName|| "Private")),
      "\n" + chalk.white("▨ Command:"),
      chalk.blue(cmd),
      "\n"
    );
  }

// Di dalam event handler pesan (setelah m.isGroup && m.text)
if (m.isGroup && m.text) {
    const group = global.db.groups[m.chat];
    if (!group) return;

    // Regex untuk mendeteksi URL
    const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const hasLink = urlRegex.test(m.text);

    if (hasLink && !m.isAdmin && !m.isOwner) {
        // ===== MODE ANTI LINK LAMA (WARN + KICK) =====
        if (group.antilink) {
            if (!group.antilinkWarnings) group.antilinkWarnings = {};
            const current = group.antilinkWarnings[m.sender] || 0;
            const newWarnings = current + 1;
            group.antilinkWarnings[m.sender] = newWarnings;

            // Hapus pesan
            await sock.sendMessage(m.chat, { delete: m.key });

            if (newWarnings >= 3) {
                await sock.groupParticipantsUpdate(m.chat, [m.sender], "remove");
                delete group.antilinkWarnings[m.sender];
                await sock.sendMessage(m.chat, {
                    text: `@${m.sender.split('@')[0]} dikeluarkan karena mengirim link 3 kali.`,
                    mentions: [m.sender]
                });
            } else {
                await sock.sendMessage(m.chat, {
                    text: `@${m.sender.split('@')[0]} dilarang mengirim link! Peringatan ${newWarnings}/3.`,
                    mentions: [m.sender]
                });
            }
        }

        // ===== MODE ANTI LINK V2 (HAPUS + WARN, TANPA KICK) =====
        else if (group.antilink2) {
            await sock.sendMessage(m.chat, { delete: m.key });
            await sock.sendMessage(m.chat, {
                text: `@${m.sender.split('@')[0]} dilarang mengirim link! Pesan telah dihapus.`,
                mentions: [m.sender]
            });
        }

        // ===== MODE ANTI LINK V3 (HAPUS SAJA, TANPA WARN) =====
        else if (group.antilink3) {
            await sock.sendMessage(m.chat, { delete: m.key });
        }
    }
}

const metaai = {
  key: {
    remoteJid: "status@broadcast",
    fromMe: false,
    id: 'FAKE_META_ID_001',
    participant: '13135550002@s.whatsapp.net'
  },
  message: {
    contactMessage: {
      displayName: global.namaOwner,
      vcard: `BEGIN:VCARD
VERSION:3.0
N:Vnzx;;;;
FN:Vnzx
TEL;waid=13135550002:+1 313 555 0002
END:VCARD`
    }
  }
};

if (m.message && m.message.buttonsResponseMessage) {
   const selected = m.message.buttonsResponseMessage.selectedButtonId;
   if (selected === 'copy_dana') {
       return sock.sendMessage(m.chat, { text: global.dana }, { quoted: m });
   }
   if (selected === 'copy_ovo') {
       return sock.sendMessage(m.chat, { text: global.ovo }, { quoted: m });
   }
   if (selected === 'copy_gopay') {
       return sock.sendMessage(m.chat, { text: global.gopay }, { quoted: m });
   }
}  

  const headerUserWithBot = async (m) => {
  const userStats = global.db?.users?.[m.sender] || {};
  const botStats = getBotStats() || {};

  let userInfo = "";
  if (userStats && (userStats.totalBeli || userStats.totalSpent)) {
    userInfo = `*▨ Statistik Kamu*\n`;
    userInfo += `- Total Pembelian : ${userStats.totalBeli || 0}\n`;
    userInfo += `- Total Pengeluaran : Rp${toRupiah(userStats.totalSpent || 0)}`;
  }

  return `
👋 Haii, @${m.sender.split("@")[0]}
Selamat Datang di Bot ${global.botName || "Bot"}!

*▨ Statistik Bot*
- Nama: ${m?.pushName || "-"}
- Total User : ${botStats.totalUsers || 0}
- Transaksi Sukses : ${botStats.totalTransactions || 0}
- Total Pemasukan : Rp${toRupiah(botStats.totalMoney || 0)}

${userInfo}`
}

const rowsMenu = [
  { 
    title: "🛒 𝗦𝗵𝗼𝗽 𝗠𝗲𝗻𝘂", 
    description: "𝗟𝗶𝘀𝘁 𝗽𝗿𝗼𝗱𝘂𝗸 𝗱𝗮𝗻 𝗹𝗮𝘆𝗮𝗻𝗮𝗻 𝗱𝗶𝗴𝗶𝘁𝗮𝗹 𝗱𝗶 𝘀𝘁𝗼𝗿𝗲 𝗸𝗮𝗺𝗶", 
    id: ".shopmenu"
  },
  { 
    title: "🗿 𝗔𝗹𝗹 𝗠𝗲𝗻𝘂", 
    description: "𝗗𝗮𝗳𝘁𝗮𝗿 𝘀𝗲𝗺𝘂𝗮 𝗳𝗶𝘁𝘂𝗿 𝗱𝗮𝗻 𝗽𝗲𝗿𝗶𝗻𝘁𝗮𝗵 𝗯𝗼𝘁", 
    id: ".allmenu" 
  },
  { 
    title: "🀄 𝗚𝗿𝘂𝗽 𝗠𝗲𝗻𝘂", 
    description: "𝗙𝗶𝘁𝘂𝗿 𝗸𝗵𝘂𝘀𝘂𝘀 𝘂𝗻𝘁𝘂𝗸 𝗺𝗮𝗻𝗮𝗷𝗲𝗺𝗲𝗻 𝗴𝗿𝘂𝗽 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽", 
    id: ".grupmenu" 
  },
  { 
    title: "👤 𝗣𝘂𝘀𝗵𝗸𝗼𝗻 𝗠𝗲𝗻𝘂", 
    description: "𝗙𝗶𝘁𝘂𝗿 𝗽𝘂𝘀𝗵 𝗸𝗼𝗻𝘁𝗮𝗸 𝗱𝗮𝗻 𝗯𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁", 
    id: ".pushkonmenu" 
  },
  { 
    title: "☁️ 𝗗𝗶𝗴𝗶𝘁𝗮𝗹𝗢𝗰𝗲𝗮𝗻 𝗠𝗲𝗻𝘂", 
    description: "𝗠𝗮𝗻𝗮𝗷𝗲𝗺𝗲𝗻 𝗩𝗣𝗦 𝗱𝗮𝗻 𝗰𝗹𝗼𝘂𝗱 𝗗𝗶𝗴𝗶𝘁𝗮𝗹𝗢𝗰𝗲𝗮𝗻", 
    id: ".domenu" 
  },
  { 
    title: "📥 𝗢𝘁𝗵𝗲𝗿 𝗠𝗲𝗻𝘂", 
    description: "𝗙𝗶𝘁𝘂𝗿 𝗵𝗶𝗯𝘂𝗿𝗮𝗻 𝗱𝗮𝗻 𝗮𝗹𝗮𝘁 𝗯𝗮𝗻𝘁𝘂𝗮𝗻 𝗹𝗮𝗶𝗻𝗻𝘆𝗮", 
    id: ".othermenu" 
  },
  { 
    title: "🛠 𝗢𝘄𝗻𝗲𝗿 𝗠𝗲𝗻𝘂", 
    description: "𝗙𝗶𝘁𝘂𝗿 𝗸𝗵𝘂𝘀𝘂𝘀 𝘂𝗻𝘁𝘂𝗸 𝗼𝘄𝗻𝗲𝗿 𝗯𝗼𝘁", 
    id: ".ownermenu" 
  }
];

const shopMenuRows = [
  {
    title: "📦 𝗕𝘂𝘆 𝗦𝗰𝗿𝗶𝗽𝘁",
    description: "𝗕𝗲𝗹𝗶 𝘀𝗰𝗿𝗶𝗽𝘁 𝗯𝗼𝘁 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽 𝗿𝗲𝗮𝗱𝘆 𝘁𝗼 𝘂𝘀𝗲",
    id: ".buyscript"
  },
  {
    title: "☁ 𝗕𝘂𝘆 𝗩𝗣𝗦",
    description: "𝗩𝗣𝗦 𝗗𝗶𝗴𝗶𝘁𝗮𝗹𝗢𝗰𝗲𝗮𝗻 (𝟭𝗚𝗕 - 𝟯𝟮𝗚𝗕 𝗥𝗔𝗠)",
    id: ".buyvps"
  },
  {
    title: "🚀 𝗕𝘂𝘆 𝗣𝗮𝗻𝗲𝗹",
    description: "𝗣𝗮𝗻𝗲𝗹 𝗣𝘁𝗲𝗿𝗼𝗱𝗮𝗰𝘁𝘆𝗹 𝘂𝗻𝘁𝘂𝗸 𝗵𝗼𝘀𝘁𝗶𝗻𝗴 𝗯𝗼𝘁",
    id: ".buypanel"
  }
];

const sendMenuWithButton = async (m, teks, isShopMenu = false) => {
  const nameBot = global.botName || "Vnzx";
  
  const media = await prepareWAMessageMedia(
    { image: { url: global.thumbnail } }, 
    { upload: sock.waUploadToServer }
  );

  const buttons = isShopMenu ? [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "🛒 Pilih Produk",
        sections: [
          {
            title: `© ${global.namaOwner}`,
            highlight_label: "✨ Best Seller",
            rows: shopMenuRows
          }
        ]
      })
    }
  ] : [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "📋 Pilih Kategori Menu",
        sections: [
          {
            title: `© ${global.namaOwner}`,
            highlight_label: "✨ Recommended",
            rows: rowsMenu
          }
        ]
      })
    }
  ];

  const msg = await generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            ...media,
            hasMediaAttachment: true
          },
          body: { 
            text: teks 
          },
          footer: { 
            text: global.footer || `Powered by ${global.botName}`
          },
          nativeFlowMessage: {
            buttons: buttons
          },
          contextInfo: {
            mentionedJid: [m.sender, global.owner + "@s.whatsapp.net"],
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterName: global.namaChannel || "Vnzx Store Updates",
              newsletterJid: global.idChannel
            },
            externalAdReply: {
              title: nameBot,
              body: "Sistem Otomatis 24 Jam",
              thumbnailUrl: global.thumbnail,
              sourceUrl: global.linkChannel || "",
              mediaType: 1,
              renderLargerThumbnail: false
            }
          }
        }
      }
    }
  }, { userJid: m.sender, quoted: m });

  return sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
}

switch (command) {

case "menu": {
  let teks = await headerUserWithBot(m)
  await sendMenuWithButton(m, teks, false)
}
break

case "shopmenu": {
  let teks = global.shopmenu || "*🛒 Shop Menu*\n\nSilakan pilih produk yang tersedia:"
  await sendMenuWithButton(m, teks, true)
}
break

case "allmenu": {
    // Gabungkan semua menu (sudah tersedia di global.allmenu dari listmenu.js)
    let teks = global.allmenu || "*📋 Semua Menu*\n\n" + 
               (global.shopmenu || "") + 
               (global.grupmenu || "") + 
               (global.pushkonmenu || "") + 
               (global.domenu || "") + 
               (global.othermenu || "") + 
               (global.ownermenu || "");
    await Reply(teks);
    break;
}

case "grupmenu": {
  let teks = global.grupmenu || ""
  await sendMenuWithButton(m, teks, false)
}
break

case "pushkonmenu": {
  let teks = global.pushkonmenu || ""
  await sendMenuWithButton(m, teks, false)
}
break

case "domenu": {
  let teks = global.domenu || ""
  await sendMenuWithButton(m, teks, false)
}
break

case "othermenu": {
  let teks = global.othermenu || ""
  await sendMenuWithButton(m, teks, false)
}
break

case "ownermenu": {
  let teks = global.ownermenu || ""
  await sendMenuWithButton(m, teks, false)
}
break

case "ht":
case "hidetag": {
    if (!m.isGroup) return Reply(mess.group);
    if (!m.isAdmin && !isOwner) return Reply(mess.admin);
    if (!text) return Reply(`*ex:* ${cmd} haii everyone`);
    try {
        const metadata = await sock.groupMetadata(m.chat);
        if (!metadata || !metadata.participants) return Reply("Gagal mendapatkan daftar anggota grup. Coba lagi.");
        
        const members = metadata.participants.map(v => v.id);
        await sock.sendMessage(m.chat, {
            text: text,
            mentions: members
        }, {
            quoted: null
        });
    } catch (error) {
        console.error("Error sending hidetag message:", error);
        return Reply("Terjadi kesalahan saat mencoba mengirim pesan hidetag.");
    }
}
break;

case "all": case "tagall": {
    if (!m.isGroup) return Reply(mess.group);
    if (!m.isAdmin && !isOwner) return Reply(mess.admin);
    if (!text) return Reply(`*ex:* ${cmd} haii everyone`);
    try {
        await sock.sendMessage(m.chat, {
            text: "@all "+text,
            contextInfo: {
            nonJidMentions: 1
           }
        }, {
            quoted: null
        });
    } catch (error) {
        console.error("Error sending tagall message:", error);
        return Reply("Terjadi kesalahan saat mencoba mengirim pesan tagall.");
    }
}
break;

case "afk": {
    if (!m.isGroup) return Reply(mess.group)
    let user = db.users[m.sender]
    if (!user) db.users[m.sender] = { afk: { status: false, reason: "", afkTime: 0 } }

    let reason = text ? text : (m.quoted?.text || "Tanpa alasan")
    user.afk = {
        status: true,
        reason,
        afkTime: Date.now()
    }
    Reply(`@${m.sender.split("@")[0]} telah melakukan AFK\n*Alasan:* ${reason}`)
}
break

case "demote":
case "promote": {
if (!m.isGroup) return Reply(mess.group)
if (!isOwner && !m.isAdmin) return Reply(mess.admin)
if (!m.isBotAdmin) return Reply(mess.botadmin)
if (m.quoted || text) {
var action
let target = m.mentionedJid ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '')+'@s.whatsapp.net'
if (/demote/.test(command)) action = "Demote"
if (/promote/.test(command)) action = "Promote"
await sock.groupParticipantsUpdate(m.chat, [target], action.toLowerCase()).then(async () => {
await sock.sendMessage(m.chat, {text: `Berhasil ${action.toLowerCase()} @${target.split("@")[0]}`, mentions: [target]}, {quoted: m})
})
} else {
return Reply(`*ex:* ${cmd} @tag/6283XXX`)
}
}
break

//==================================//

case "kick":
case "kik": {
    if (!m.isGroup) return Reply(mess.group);
    if (!isOwner && !m.isAdmin) return Reply(mess.admin);
    if (!m.isBotAdmin) return Reply(mess.botadmin);
    let target;
    if (m.mentionedJid?.[0]) {
        target = m.mentionedJid[0];
    } else if (m.quoted?.sender) {
        target = m.quoted.sender;
    } else if (text) {
        const cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned) target = cleaned + "@s.whatsapp.net";
    }
    if (!target) return Reply(`*ex:* ${cmd} @tag/6283XXX`);
    try {
        await sock.groupParticipantsUpdate(m.chat, [target], "remove");
    } catch (err) {
        console.error("Kick error:", err);
        return Reply("Gagal mengeluarkan anggota. Coba lagi atau cek hak akses bot.");
    }
}
break;
 
case "listidgrup": {
    if (!isOwner) return Reply(mess.owner);
    
    try {
        // Ambil semua grup yang bot ikuti
        const groups = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        
        if (groupIds.length === 0) {
            return Reply("❌ Bot tidak bergabung di grup manapun.");
        }
        
        // Buat teks daftar
        let teks = `📋 *Daftar ID Grup (Total: ${groupIds.length})*\n\n`;
        groupIds.forEach((id, index) => {
            const groupName = groups[id].subject || "Tidak diketahui";
            teks += `${index + 1}. *${groupName}*\n   ID: \`${id}\`\n\n`;
        });
        
        // Kirim sebagai pesan teks
        // Jika terlalu panjang, kirim sebagai file .txt
        if (teks.length > 4000) {
            const buffer = Buffer.from(teks, 'utf-8');
            await sock.sendMessage(m.chat, {
                document: buffer,
                fileName: 'daftar_id_grup.txt',
                mimetype: 'text/plain',
                caption: '📁 Daftar ID Grup (terlalu panjang, disimpan dalam file)'
            }, { quoted: m });
        } else {
            await Reply(teks);
        }
    } catch (err) {
        console.error("Error listidgrup:", err);
        Reply("❌ Gagal mengambil daftar grup.");
    }
    break;
}
case "storygrupall": {
    if (!isOwner) return Reply(mess.owner);
    
    let storyText = "";
    let mediaBuffer = null;
    let mediaType = null;
    
    // Deteksi jika pesan yang dikirim adalah media (gambar/video)
    if (m.mtype === 'imageMessage' || m.mtype === 'videoMessage') {
        mediaType = m.mtype === 'imageMessage' ? 'image' : 'video';
        mediaBuffer = await m.download();
        storyText = m.body.replace(new RegExp(`^\\${prefix}${command}\\s*`, 'i'), '').trim();
    } else {
        storyText = text;
    }
    
    if (!storyText && !mediaBuffer) {
        return Reply(`❌ Masukkan teks atau kirim media dengan caption .storygrupall`);
    }
    
    await Reply("⏳ Mengirim story ke semua grup... Mohon tunggu.");
    
    try {
        const groups = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        if (groupIds.length === 0) return Reply("❌ Bot tidak bergabung di grup manapun.");
        
        // Daftar warna background untuk story teks
        const bgColors = [
            "#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33F0",
            "#33FFF0", "#F0FF33", "#FF8333", "#8333FF", "#33FF83"
        ];
        
        let success = 0, failed = 0;
        
        for (const jid of groupIds) {
            try {
                let content;
                if (mediaBuffer) {
                    // Upload media ke server eksternal (CatBox) untuk mendapatkan URL
                    const mediaUrl = await global.CatBox(mediaBuffer);
                    if (!mediaUrl) throw new Error("Gagal upload media");
                    
                    content = {
                        [mediaType]: { url: mediaUrl },
                        caption: storyText || undefined
                    };
                } else {
                    const randomColor = bgColors[Math.floor(Math.random() * bgColors.length)];
                    content = {
                        text: storyText,
                        backgroundColor: randomColor,
                        font: Math.floor(Math.random() * 7) + 1
                    };
                }
                
                // Proses konten menjadi pesan yang sudah diupload medianya
                const inside = await generateWAMessageContent(content, {
                    upload: sock.waUploadToServer,
                    logger: sock.logger
                });
                
                // Buat messageSecret (32 byte acak)
                const messageSecret = crypto.randomBytes(32);
                
                // Bangun pesan dengan groupStatusMessageV2
                const msg = await generateWAMessageFromContent(jid, {
                    messageContextInfo: { messageSecret },
                    groupStatusMessageV2: {
                        message: {
                            ...inside,
                            messageContextInfo: { messageSecret }
                        }
                    }
                }, { userJid: m.sender });
                
                // Kirim via relayMessage
                await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
                
                success++;
                await sleep(2000); // jeda antar grup
            } catch (err) {
                console.error(`Gagal kirim story ke ${jid}:`, err);
                failed++;
            }
        }
        
        Reply(`✅ Story selesai dikirim!\n📊 Total grup: ${groupIds.length}\n✅ Berhasil: ${success}\n❌ Gagal: ${failed}`);
        
    } catch (err) {
        console.error("Error:", err);
        Reply("❌ Terjadi kesalahan: " + err.message);
    }
    break;
}

case "closegc":
case "close":
case "opengc":
case "open": {
    if (!m.isGroup) return Reply(mess.group);
    if (!isOwner && !m.isAdmin) return Reply(mess.admin);
    if (!m.isBotAdmin) return Reply(mess.botadmin);

    try {
        const cmd = command.toLowerCase();

        if (cmd === "open" || cmd === "opengc") {
            await sock.groupSettingUpdate(m.chat, 'not_announcement');
            return Reply("Grup berhasil dibuka! Sekarang semua anggota dapat mengirim pesan.");
        }

        if (cmd === "close" || cmd === "closegc") {
            await sock.groupSettingUpdate(m.chat, 'announcement');
            return Reply("Grup berhasil ditutup! Sekarang hanya admin yang dapat mengirim pesan.");
        }

    } catch (error) {
        console.error("Error updating group settings:", error);
        return Reply("Terjadi kesalahan saat mencoba mengubah pengaturan grup.");
    }
}
break;

case "kick":
case "kik": {
    if (!m.isGroup) return Reply(mess.group);
    if (!isOwner && !m.isAdmin) return Reply(mess.admin);
    if (!m.isBotAdmin) return Reply(mess.botadmin);
    let target;
    if (m.mentionedJid?.[0]) {
        target = m.mentionedJid[0];
    } else if (m.quoted?.sender) {
        target = m.quoted.sender;
    } else if (text) {
        const cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned) target = cleaned + "@s.whatsapp.net";
    }
    if (!target) return Reply(`*ex:* ${cmd} @tag/6283XXX`);
    try {
        await sock.groupParticipantsUpdate(m.chat, [target], "remove");
    } catch (err) {
        console.error("Kick error:", err);
        return Reply("Gagal mengeluarkan anggota. Coba lagi atau cek hak akses bot.");
    }
}
break;

    case 'self': {
    if (!isOwner) return Reply(mess.owner);
    if (global.db.settings.self) return Reply('Bot sudah dalam mode Self sebelumnya.');
    global.db.settings.self = true;
    Reply('Berhasil mengubah mode bot ke *Self Mode* (Hanya Owner).');
}
break;

case 'public': {
    if (!isOwner) return Reply(mess.owner);
    if (!global.db.settings.self) return Reply('Bot sudah dalam mode Public sebelumnya.');
    global.db.settings.self = false;
    Reply('Berhasil mengubah mode bot ke *Public Mode* (Semua orang bisa akses).');
}
break;
case 'ig':
case 'igdl':
case 'instagram': {
    if (!text) return Reply(`Contoh: ${prefix}${command} https://www.instagram.com/p/xxxx/`);
    if (!text.includes('instagram.com')) return Reply('Link tidak valid!');
    
    m.reply(mess.wait || "Sedang memproses media Instagram, mohon tunggu...");

    try {
        const axios = require('axios');
        const response = await axios.get(`https://fyxzpedia-apikeys.vercel.app/download/instagram?apikey=${global.apiFyxz}&url=${encodeURIComponent(text)}`);
        const res = response.data;

        if (!res.status) return Reply("Gagal mengambil data. Pastikan link benar dan akun tidak diprivat.");

        // Loop hasil result karena Instagram bisa berisi banyak foto/video (Carousel)
        for (let media of res.result) {
            let type = media.kualitas.toLowerCase().includes('photo') ? 'image' : 'video';
            
            if (type === 'image') {
                await sock.sendMessage(m.chat, { 
                    image: { url: media.url_download }, 
                    caption: `*INSTAGRAM DOWNLOADER*\n\n_© Powered by Vanzx_` 
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, { 
                    video: { url: media.url_download }, 
                    caption: `*INSTAGRAM DOWNLOADER*\n\n_© Powered by Vanzx_` 
                }, { quoted: m });
            }
        }

    } catch (e) {
        console.error(e);
        Reply("Terjadi kesalahan saat menghubungi API.");
    }
}
break;

case 'brat': {
    if (!text) return Reply(`Contoh: ${prefix}${command} Halo Dunia`);
    
    // Memberikan tanda proses
    m.reply(mess.wait || "Sedang membuat sticker brat, mohon tunggu...");

    try {
        // URL API Brat kamu
        const bratUrl = `https://fyxzpedia-apikeys.vercel.app/imagecreator/brat?apikey=${global.apiFyxz}&text=${encodeURIComponent(text)}`;

        // Mengirim sebagai sticker menggunakan fungsi sock.sendSticker yang ada di index.js
        await sock.sendSticker(m.chat, bratUrl, m, {
            packname: global.botName,
            author: global.namaOwner
        });

    } catch (e) {
        console.error(e);
        Reply("Terjadi kesalahan saat membuat sticker brat.");
    }
}
break;

case 'bratvid': {
    if (!text) return Reply(`Contoh: ${prefix}${command} Halo Dunia`);
    
    // Memberikan tanda proses karena konversi video ke sticker butuh waktu sedikit lebih lama
    m.reply(mess.wait || "Sedang membuat sticker brat video, mohon tunggu sekitar 10 detik...");

    try {
        const axios = require('axios');
        // URL API BratVideo kamu
        const bratVidUrl = `https://fyxzpedia-apikeys.vercel.app/imagecreator/bratvid?apikey=${global.apiFyxz}&text=${encodeURIComponent(text)}`;

        // Mengirim sebagai sticker bergerak menggunakan fungsi sock.sendSticker yang ada di index.js
        // Fungsi ini otomatis mendeteksi jika inputnya video dan diubah ke webp bergerak
        await sock.sendSticker(m.chat, bratVidUrl, m, {
            packname: global.botName,
            author: global.namaOwner
        });

    } catch (e) {
        console.error(e);
        Reply("Terjadi kesalahan saat membuat sticker brat video. Pastikan teks tidak terlalu panjang.");
    }
}
break;

case 'ai': {
    // Mengambil teks: Jika ada teks setelah command pakai itu, jika tidak ada cek apakah ada pesan yang di-reply
    let query = text ? text : (m.quoted ? m.quoted.text : null);
    
    if (!query) return Reply(`Contoh: ${prefix}${command} cara membuat bot wa`);

    // Memberikan tanda proses
    m.reply(mess.wait || "Sedang berpikir, mohon tunggu...");

    try {
        const axios = require('axios');
        // Memanggil API AI Unlimited kamu
        const response = await axios.get(`https://fyxzpedia-apikeys.vercel.app/ai/unlimited?apikey=${global.apiFyxz}&question=${encodeURIComponent(query)}`);
        const res = response.data;

        if (res.status) {
            // Mengirimkan hasil jawaban AI
            await Reply(res.result);
        } else {
            await Reply("Maaf, AI sedang tidak bisa menjawab. Coba lagi nanti.");
        }

    } catch (e) {
        console.error(e);
        Reply("Terjadi kesalahan koneksi ke server AI.");
    }
}
break;

case 'autoai': {
    if (!isOwner) return Reply("Hanya Owner.");
    if (!text) return Reply("on / off?");
    global.db.settings.autoAi = text === 'on';
    Reply(`Auto AI Berhasil di ${text === 'on' ? 'Aktifkan' : 'Matikan'}`);
}
break;
case 'enc1': case 'enc2': case 'enc3': case 'enc4': case 'enc5':
case 'enc6': case 'enc7': case 'enc8': case 'enc9': case 'enc10': {
    if (!m.quoted) return Reply(`Balas teks atau file .js yang ingin di-encrypt!`);

    const JavaScriptObfuscator = require('javascript-obfuscator');
    let kodeAsli = m.quoted.text || (m.quoted.download ? (await m.quoted.download()).toString() : "");
    if (!kodeAsli) return Reply("Kode tidak ditemukan!");

    // Helper Zero Width untuk level tertinggi
    const encodeZero = (text) => text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0').split('').map(b => (b === '1' ? '\u200b' : '\u200c')).join('') + '\u200d').join('');

    try {
        let opt = { compact: true, controlFlowFlattening: false };
        let level = parseInt(command.replace('enc', ''));

        switch (level) {
            case 1: opt = { compact: true, simplify: true }; break;
            case 2: opt = { compact: true, renameGlobals: true }; break;
            case 3: opt = { compact: true, controlFlowFlattening: true, controlFlowFlatteningThreshold: 0.5 }; break;
            case 4: opt = { compact: true, controlFlowFlattening: true, deadCodeInjection: true, deadCodeInjectionThreshold: 0.2 }; break;
            case 5: opt = { compact: true, stringArray: true, stringArrayThreshold: 0.75, selfDefending: true }; break;
            case 6: opt = { compact: true, controlFlowFlattening: true, stringArrayEncoding: ['base64'], debugProtection: true }; break;
            case 7: opt = { compact: true, splitStrings: true, splitStringsChunkLength: 3, unicodeEscapeSequence: true }; break;
            case 8: opt = { compact: true, controlFlowFlattening: true, deadCodeInjection: true, stringArrayEncoding: ['rc4'], transformObjectKeys: true }; break;
            case 9: opt = { compact: true, controlFlowFlattening: true, selfDefending: true, stringArrayEncoding: ['base64', 'rc4'], numbersToExpressions: true }; break;
            case 10: opt = { compact: true, simplify: true, unicodeEscapeSequence: true, identifierNamesGenerator: 'hexadecimal' }; break;
        }

        let hasilEnc = JavaScriptObfuscator.obfuscate(kodeAsli, opt).getObfuscatedCode();

        // Extra layer untuk level 10 (Zero Width Wrapper)
        if (level === 10) {
            let encoded = encodeZero(hasilEnc);
            hasilEnc = `eval((function(w){return w.split('\\u200d').filter(x=>x).map(x=>String.fromCharCode(parseInt(x.replace(/\\u200b/g,'1').replace(/\\u200c/g,'0'),2))).join('')})('${encoded}'))`;
        }

        await sock.sendMessage(m.chat, { 
            document: Buffer.from(hasilEnc), 
            mimetype: 'application/javascript', 
            fileName: `level_${level}_encrypted.js`,
            caption: `*🔥 OBFUSCATE LEVEL ${level} 🔥*\n\n*Intensitas:* ${level}/10\n*Status:* Sukses Terenkripsi ✅`
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        Reply("Terjadi kesalahan. Pastikan kode JS kamu valid.");
    }
}
break;
case 'restart': {
    // 1. Cek apakah yang mengirim adalah owner
    if (!isOwner) return Reply(mess.owner);

    // 2. Beri pesan pemberitahuan
    await Reply("Sedang memulai ulang bot (Restarting)... Mohon tunggu sebentar.");

    // 3. Memberikan jeda 1 detik agar pesan terkirim dulu sebelum mati
    setTimeout(() => {
        process.exit(); // Mematikan proses Node.js
    }, 1000);
}
break;

case 'tiktok': {
    if (!text) return Reply(`Contoh: ${prefix}${command} https://vt.tiktok.com/xxxx/`);
    if (!text.includes('tiktok.com')) return Reply('Link tidak valid!');
    
    // Memberi tanda bahwa bot sedang memproses
    m.reply(mess.wait || "Sedang mengunduh video, mohon tunggu...");

    try {
        const axios = require('axios');
        // Memanggil API dengan apikey dari config
        const response = await axios.get(`https://fyxzpedia-apikeys.vercel.app/download/tiktok?apikey=${global.apiFyxz}&url=${encodeURIComponent(text)}`);
        const res = response.data;

        if (!res.status) return Reply("Gagal mengambil data dari API.");

        const { video, caption, author, username } = res.result;

        let teks = `*TIKTOK DOWNLOADER*\n\n`
            teks += `*👤 Author:* ${author} (@${username})\n`
            teks += `*📝 Caption:* ${caption}\n\n`
            teks += `_© Powered by Vanzx_`

        // Mengirim Video
        await sock.sendMessage(m.chat, { 
            video: { url: video }, 
            caption: teks 
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        Reply("Terjadi kesalahan pada server atau API Key tidak valid.");
    }
}
break;

    case "cekidch":
case "idch": {
    if (!text) return Reply(`Masukan Link Channel!\n*Contoh:* ${cmd} https://whatsapp.com/channel/xxx`); 
    if (!text.includes("https://whatsapp.com/channel/") && !text.includes("@newsletter")) {
        return Reply("Link channel tidak valid");
    }
    let result = text.trim()
    let opsi = "jid"
    if (text.includes("https://whatsapp.com/channel/")) {
    result = text.split("https://whatsapp.com/channel/")[1];
    opsi = "invite"
    }
    let res = await sock.newsletterMetadata(opsi, result);
    let teks = `*WhatsApp Channel Information 🌍*\n\n- Nama: ${res.name}\n- Total Pengikut: ${toRupiah(res.subscribers)}\n- ID: ${res.id}\n- Link: https://whatsapp.com/channel/${res.invite}`;
    let msg = await generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: teks },
                    nativeFlowMessage: {
                        buttons: [
                            { 
                                name: "cta_copy",
                                buttonParamsJson: `{"display_text":"Copy Channel ID","copy_code":"${res.id}"}`
                            }
                        ]
                    }
                }
            }
        }
    }, { userJid: m.sender, quoted: m });

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
}
break

    default:
      break;
  }
};


process.on("uncaughtException", (err) => {
console.error("Caught exception:", err);
});


let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  delete require.cache[file];
  require(file);
});