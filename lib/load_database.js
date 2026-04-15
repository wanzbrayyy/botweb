async function LoadDataBase(conn, m) {
  try {
    // ===== INISIALISASI STRUKTUR UTAMA =====
    if (typeof global.db !== 'object') global.db = {};

    // Stock (hanya script)
    if (typeof global.db.stock !== 'object') global.db.stock = { script: {} };
    if (!global.db.stock.script || typeof global.db.stock.script !== 'object') {
      global.db.stock.script = {};
    }

    // Transactions (array)
    if (!Array.isArray(global.db.transactions)) global.db.transactions = [];

    // Users
    if (typeof global.db.users !== 'object') global.db.users = {};

    // Groups
    if (typeof global.db.groups !== 'object') global.db.groups = {};

    // Settings
    if (typeof global.db.settings !== 'object') global.db.settings = {};
   
    // Config
    if (typeof global.db.config !== 'object') {
      global.db.config = {
        lastBackup: Date.now(),
        createdAt: new Date().toISOString()
      };
    }
        // Settings autoJpm
if (!global.db.settings.autoJpm) {
    global.db.settings.autoJpm = {
        enabled: false,
        message: null,
        interval: 0
    };
}
if (!global.db.settings.autoStory) {
    global.db.settings.autoStory = {
        enabled: false,
        interval: '0 * * * *',
        message: null,
        lastRun: null
    };
}
// Settings autoJoinGc
if (!global.db.settings.autoJoinGc) {
    global.db.settings.autoJoinGc = false;
}
// ===== LIST JUALAN =====
if (!global.db.settings.list || !Array.isArray(global.db.settings.list)) {
    global.db.settings.list = [];
}

    // ===== DEFAULT SETTINGS =====
    const defaultSettings = { owner: [], list: {} };
    for (let key in defaultSettings) {
      if (!(key in global.db.settings)) global.db.settings[key] = defaultSettings[key];
    }
    

    // ===== INISIALISASI USER (jika ada sender) =====
    if (m?.sender) {
      if (typeof global.db.users[m.sender] !== 'object') {
        global.db.users[m.sender] = {
          totalBeli: 0,
          totalSpent: 0,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        };
      } else {
        // Pastikan properti yang diperlukan ada
        if (typeof global.db.users[m.sender].totalBeli !== 'number') {
          global.db.users[m.sender].totalBeli = 0;
        }
        if (typeof global.db.users[m.sender].totalSpent !== 'number') {
          global.db.users[m.sender].totalSpent = 0;
        }
        if (!global.db.users[m.sender].firstSeen) {
          global.db.users[m.sender].firstSeen = new Date().toISOString();
        }
        global.db.users[m.sender].lastSeen = new Date().toISOString();
      }
    }


// Di dalam bagian inisialisasi grup, tambahkan properti antilinkV2 dan antilinkV2Warnings
if (m?.isGroup && m?.chat) {
    if (typeof global.db.groups[m.chat] !== 'object') {
        global.db.groups[m.chat] = {};
    }
// Di dalam LoadDataBase, setelah mendefinisikan defaultGroup
const defaultGroup = {
    antilink: false,
    antilink2: false,
    antilink3: false,          // <-- tambahkan ini
    antilinkWarnings: {},
    autopromosi: false,
    welcome: false
};
    for (let key in defaultGroup) {
        if (!(key in global.db.groups[m.chat])) {
            global.db.groups[m.chat][key] = defaultGroup[key];
        }
    }
}
  } catch (e) {
    console.error('❌ Error di LoadDataBase:', e);
    throw e;
  }
}

module.exports = LoadDataBase;