const fs = require("fs");

global.owner = "212782754821"
global.namaOwner = "wanzofc"
global.prefix = ".";
global.botName = "wanzAsist";
global.pairingNumber = "212782754821"
global.paircode = "AAAAAAAA"
global.jedaPushkontak = 6000
global.thumbnail = "https://yt3.ggpht.com/muwFxUJNQxfsuK8qLzip0VWKhXt4q-gYsgJy-045x7U2mO9gaa5yikN4YY86w2z83p-weNDQrA=s176-c-k-c0x00ffffff-no-rj-mo"
global.thumbnailReply = "https://upld.zone.id/uploads/4yizv5iq/24014.webp"

global.idChannel = "-"
global.namaChannel = "© Powered by wanzofc"
global.linkChannel = "-"
global.linkGrup = "-"

global.apiFyxz = "123"
global.jedaJpm = 2000; // jeda dalam milidetik
//Setting DO
global.apikeyDigitalocean = "xxxx"

//SETTING PAYMENT
global.dana = "6288801074059"
global.ovo = "6288801074059"
global.gopay = "6288801074059"
global.qris = "-"

global.paymentMode = "pakasir"; //pakasir

// Setting pakasir API
global.pakasirSlug = "vanzx-hosting";
global.pakasirApiKey = "yGYX7UUd5mIWfnbkpzWqjosouBijN2XL";

global.egg = "15";         // Isi id egg
global.nestid = "5";      // Isi id nest
global.loc = "1";         // Isi id location
global.domain = "https://Fyxzpedia-Git.com";
global.apikey = "ptla_l1Mxkn5XlLHVWorR7EPfsyMtrCAvvZpDWtw1nVP61";   // API PTLA
global.capikey = "ptlc_DGziipsIHGlvFVgZ0OoL0nPFlUErL8kEvKKEyQH9";  // API PTLC

global.mess = {
  owner: "Fitur ini hanya bisa digunakan oleh Vanzx*.",
  premium: "Fitur ini hanya bisa digunakan oleh *User Premium*.",
  group: "Fitur ini hanya dapat digunakan di dalam grup.",
  private: "Fitur ini hanya dapat digunakan di private chat.",
  admin: "Fitur ini hanya bisa digunakan oleh admin grup.",
  botadmin: "Fitur ini hanya dapat digunakan jika bot adalah admin grup.",
};

let file = require.resolve(__filename) 
fs.watchFile(file, () => {
fs.unwatchFile(file)
delete require.cache[file]
require(file)
})