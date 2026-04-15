/**
 * ======================================================
 * IMPORTS DAN KONFIGURASI AWAL
 * ======================================================
 */

require("./lib/function.js");
require("./config.js");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
  jidDecode,
  downloadContentFromMessage,
  generateWAMessageContent,
  generateWAMessageFromContent
} = require("baileys");

const chalk = require("chalk");
const Pino = require("pino");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const cron = require('node-cron');

const DataBase = require("./lib/database.js");
const database = new DataBase();
global.groupMetadataCache = new Map();
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require("./lib/sticker.js");

const serialize = require("./lib/serialize");

// ========== GLOBAL ERROR HANDLERS ==========
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

/**
 * ======================================================
 * FUNGSI loadDb : Memuat database dari file dan menyimpannya secara periodik
 * ======================================================
 */
const loadDb = async () => {
  const load = (await database.read()) || {};
  global.db = {
    users: load.users || {},
    groups: load.groups || {},
    settings: {
      ...(load.settings || {}),
      owner: load.settings?.owner || [],
      self: load.settings?.self || false,
      autoAi: load.settings?.autoAi || false,
      list: load.settings?.list || {},
      stockDB: load.settings?.stockDB || { do: {}, script: {}, apps: {} },
      bljpm: load.settings?.bljpm || []
    },
    stock: load.stock || {},
    transactions: load.transactions || [],
    config: load.config || {}
  };

  // Default settings untuk autoStory
  if (!global.db.settings.autoStory) {
    global.db.settings.autoStory = {
      enabled: false,
      interval: '0 * * * *',
      message: null,
      lastRun: null
    };
  }

  await database.write(global.db);
  setInterval(() => database.write(global.db), 3500);
};

loadDb();

/**
 * ======================================================
 * FUNGSI AUTO STORY
 * ======================================================
 */
async function sendAutoStory() {
  if (!global.sock) {
    console.log('[AutoStory] Sock belum siap, skip.');
    return;
  }
  const autoStory = global.db.settings.autoStory;
  if (!autoStory || !autoStory.enabled) return;

  const storyText = autoStory.message?.text;
  const media = autoStory.message?.media;

  if (!storyText && !media) return;

  try {
    const groups = await global.sock.groupFetchAllParticipating();
    const groupIds = Object.keys(groups);
    if (groupIds.length === 0) return;

    let success = 0, failed = 0;
    const bgColors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33F0", "#33FFF0", "#F0FF33", "#FF8333", "#8333FF", "#33FF83"];

    for (const jid of groupIds) {
      try {
        let content;
        if (media && media.url) {
          content = {
            [media.type]: { url: media.url },
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

        const inside = await generateWAMessageContent(content, {
          upload: global.sock.waUploadToServer,
          logger: global.sock.logger
        });

        const messageSecret = crypto.randomBytes(32);
        const msg = await generateWAMessageFromContent(jid, {
          messageContextInfo: { messageSecret },
          groupStatusMessageV2: {
            message: {
              ...inside,
              messageContextInfo: { messageSecret }
            }
          }
        }, { userJid: global.sock.user.id });

        await global.sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
        success++;
        await sleep(5000); // jeda 5 detik antar grup
      } catch (err) {
        console.error(`Gagal kirim story ke ${jid}:`, err);
        failed++;
      }
    }

    autoStory.lastRun = new Date().toISOString();
    if (success > 0) console.log(`[AutoStory] Berhasil dikirim ke ${success} grup, gagal ${failed}`);
  } catch (err) {
    console.error('[AutoStory] Error:', err);
  }
}

let autoStoryTask = null;
function setupAutoStory() {
  if (autoStoryTask) {
    autoStoryTask.stop();
    autoStoryTask = null;
  }
  const cfg = global.db?.settings?.autoStory;
  if (cfg && cfg.enabled && cfg.interval && global.sock) {
    autoStoryTask = cron.schedule(cfg.interval, async () => {
      await sendAutoStory();
    });
    console.log(`[AutoStory] Scheduler diaktifkan dengan interval: ${cfg.interval}`);
  } else {
    console.log('[AutoStory] Scheduler nonaktif atau sock belum siap.');
  }
}

global.restartAutoStory = setupAutoStory;

/**
 * ======================================================
 * FUNGSI START BOT
 * ======================================================
 */
async function StartBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./Session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    browser: Browsers.iOS("Safari"),
    auth: state,
    printQRInTerminal: false,
    cachedGroupMetadata: async (jid) => {
      if (!global.groupMetadataCache.has(jid)) {
        try {
          const metadata = await sock.groupMetadata(jid);
          global.groupMetadataCache.set(jid, metadata);
          return metadata;
        } catch (err) {
          console.error(`cachedGroupMetadata error for ${jid}:`, err.message);
          // Jangan simpan error, biarkan cache kosong
          return null;
        }
      }
      return global.groupMetadataCache.get(jid);
    }
  });

  // Simpan socket ke global
  global.sock = sock;

  const sampahDir = './sampah';
  if (!fs.existsSync(sampahDir)) fs.mkdirSync(sampahDir, { recursive: true });

  const autoJpm = require('./lib/autoJpm');
  autoJpm.setSocket(sock);
  autoJpm.start();

  if (!sock.authState.creds.registered) {
    console.log(chalk.white(`Meminta Kode Pairing Nomor WhatsApp +${global.pairingNumber}...`));
    setTimeout(async () => {
      const code = await sock.requestPairingCode(global.pairingNumber.trim(), global.paircode);
      console.log(chalk.white(`Kode Pairing: ${code}`));
    }, 6000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    const m = await serialize(sock, msg);
    if (m.isBaileys) return;

    if (!m.key.fromMe && global.autoread) {
      await sock.readMessages([m.key]);
    }

    require("./message.js")(sock, m);
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log("Reconnecting...");
        StartBot();
      } else {
        console.log("Connection Closed");
      }
    }
    if (connection === "open") {
      console.log("Bot active!");
      setupAutoStory();
    }
  });

  sock.ev.on("group-participants.update", async (update) => {
    const { id, participants, action, author } = update;
    try {
      const groupMetadata = await sock.groupMetadata(id);
      global.groupMetadataCache.set(id, groupMetadata);
    } catch (err) {
      console.error(`Gagal mengambil metadata grup ${id}:`, err.message);
      // Hapus dari cache jika ada
      global.groupMetadataCache.delete(id);
    }
  });

  sock.downloadMediaMessage = async (m, type, filename = "") => {
    if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
    const stream = await downloadContentFromMessage(m, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    if (filename) await fs.promises.writeFile(filename, buffer);
    return filename && fs.existsSync(filename) ? filename : buffer;
  };

  sock.sendSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
        ? Buffer.from(path.split(",")[1], "base64")
        : /^https?:\/\//.test(path)
          ? await (await getBuffer(path))
          : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);
    const buffer = (options.packname || options.author)
      ? await writeExifImg(buff, options)
      : await imageToWebp(buff);
    const tmpPath = `./sampah/${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`;
    fs.writeFileSync(tmpPath, buffer);
    await sock.sendMessage(jid, { sticker: { url: tmpPath }, ...options }, { quoted });
    fs.unlinkSync(tmpPath);
    return buffer;
  };

  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {};
      return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
    }
    return jid;
  };

  return sock;
}

StartBot();