const chalk = require("chalk");
const fs = require("fs");

global.shopmenu = `
*▨ Shop - Menu*
- .buyscript
- .buyvps
- .buypanel
- .list
- .addlist (owner)
- .dellist (owner)
- .batalbeli
`

global.allmenu = `${global.shopmenu}${global.grupmenu}${global.pushkonmenu}${global.domenu}${global.othermenu}${global.ownermenu}`

global.grupmenu = `
*▨ Grup - Menu*
- .leaveclosedgc
- .antilink on/off
- .antilink2 on/off
- .antilink3 on/off
- .resetantilink
- .afk
- .promote
- .demote
- .open
- .close
- .kick
- .tagall
- .hidetag
`

global.pushkonmenu = `
*▨ Pushkon - Menu*
- .setautostory
- .autostory on/off
- .statusautostory
- .setintervalautostory
- .storygrupall
- .autojoingc on/off
- .autojpm on/off
- .setjpm teks|1jam
- .statusjpm
- .jpm
- .jpmch
- .bljpm
- .delbljpm
- .pushkontak
- .setjedapush
`

global.domenu = `
*▨ DigitalOcean - Menu*
- .cvps
- .listdroplet
- .deldroplet
`

global.othermenu = `
*▨  Other - Menu*
- .sticker
- .tourl
- .tiktok
- .igdl
- .bratvid
- .brat
- .ai
- .enc1
- .enc2
- .enc3 - .enc10
`

global.ownermenu = `
*▨ Owner - Menu*
- .autoai on/off
- .addscript
- .getscript
- .delscript
- .1gb - unli
- .listpanel
- .listadmin
- .delpanel
- .deladmin
- .idch
- .backup
- .pay
- .done
- .proses
- .setjedapush
- .autoread
- .self
- .public
`

global.allmenu = `${global.shopmenu}${global.grupmenu}${global.pushkonmenu}${global.domenu}${global.othermenu}${global.ownermenu}`

let file = require.resolve(__filename) 
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.white("• Update"), chalk.white(`${__filename}\n`))
delete require.cache[file]
require(file)
})