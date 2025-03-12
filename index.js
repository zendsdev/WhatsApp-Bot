const { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } = require("@whiskeysockets/baileys")
const pino = require("pino")
const { okeconnect, alerts } = require("./settings.js")
const inquirer = require("inquirer")
const fs = require("fs")
const toMs = require("ms")
const md5 = require("md5")
const QRCode = require("qrcode")
const moment = require("moment-timezone").tz("Asia/Jakarta")
const hariArray = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const bulanArray = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
let useCode = {
  isTrue: true
}
let axios = require("axios")
let fetch = require("node-fetch")

function toCRC16(str) {
  function charCodeAt(str, i) {
    let get = str.substr(i, 1)
    return get.charCodeAt()
  }

  let crc = 0xFFFF;
  let strlen = str.length;
  for (let c = 0; c < strlen; c++) {
    crc ^= charCodeAt(str, c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  hex = crc & 0xFFFF;
  hex = hex.toString(16);
  hex = hex.toUpperCase();
  if (hex.length == 3) {
    hex = "0" + hex;
  }
  return hex;
}

const responseLeave = async (tehtarik, update) => {
const metadata = await tehtarik.groupMetadata(update.id)
for (let participant of update.participants) {
try {
let metadata = await tehtarik.groupMetadata(update.id)
let participants = update.participants
for (let num of participants) {
if (update.action == 'remove') {
await tehtarik.sendMessage(
update.id, 
{
image: fs.readFileSync("./welcome.jpg"),
caption: "👋 Selamat tinggal +" + num.split("@")[0] + "\nTerimakasih sudah mampir dan berbelanja di " + global.namabot + "\n\n~ Salam hangat, Tehtarik"
})
}
}
} catch (err) {
console.log(err)
}
}   
}
  
const responseWelcome = async (tehtarik, update) => {
const metadata = await tehtarik.groupMetadata(update.id)
for (let participant of update.participants) {
try {
let metadata = await tehtarik.groupMetadata(update.id)
let participants = update.participants
for (let num of participants) {
if (update.action == 'add') {
await tehtarik.sendMessage(
update.id, 
{
image: fs.readFileSync("./welcome.jpg"),
caption: `👋 Halo +${num.split("@")[0]}
Selamat datang di ${metadata.subject}. Silahkan ketik *menu* untuk menampilkan menu`
})
}
}
} catch (err) {
console.log(err)
}
}   
}

getGroupAdmins = function(participants) {
let admins = []
for (let i of participants) {
i.admin !== null ? admins.push(i.id) : ''
}
return admins
}

const addSaldo = (userId, amount, _dir) => {
let position = null
Object.keys(_dir).forEach((x) => {
if (_dir[x].id === userId) {
position = x
}
})
if (position !== null) {
_dir[position].saldo += amount
fs.writeFileSync('./Database/User.json', JSON.stringify(_dir, null, 3))
}
}

const minSaldo = (userId, amount, _dir) => {
let position = null
Object.keys(_dir).forEach((x) => {
if (_dir[x].id === userId) {
position = x
}
})
if (position !== null) {
_dir[position].saldo -= amount
fs.writeFileSync('./Database/User.json', JSON.stringify(_dir, null, 3))
}}

const cekSaldo = (userId, _dir) => {
let position = null
Object.keys(_dir).forEach((x) => {
if (_dir[x].id === userId) {
position = x
}
})
if (position !== null) {
return _dir[position].saldo
} else {
return 0
}}


function formatrupiah(nominal) {
  const nom = new Intl.NumberFormat("id", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(nominal)
  return nom
}

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(global.session)
  const tehtarik = await makeWASocket({
    logger: pino({ level: "fatal" }),
    auth: state,
    printQRInTerminal: !useCode.isTrue,
    defaultQueryTimeoutMs: undefined,
    keepAliveIntervalMs: 30000,
    browser: Browsers.macOS("Edge"),
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true
  })
  if (useCode.isTrue && !tehtarik.authState.creds.registered) {
      useCode = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'isTrue',
          message: 'Gunakan Pairing Code?',
          default: true
        }
      ])
      if (useCode.isTrue) {
        const waNumber = await inquirer.prompt([
         {
           type: "number",
           name: "res",
           message: "Masukkan Nomor Whatsapp Anda:"
         }
         ])
         console.log(waNumber)
         const code = await tehtarik.requestPairingCode(waNumber.res)
         console.log(code)
      } else {
        useCode.isTrue = false
        startBot()
      }
  }
  tehtarik.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect = lastDisconnect.error?.output.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        console.log("Reconnect")
        startBot()
      }
    }
    if (connection === "open") {
      console.log("Terhubung!")
    }
  })
  tehtarik.ev.on("creds.update", saveCreds)
  tehtarik.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    await tehtarik.readMessages([messages[0].key])
    if (!msg.message) return
    function replyText(text) {
      tehtarik.sendMessage(from, {text: text}, {quoted: msg})
    }
    function replyImage(capt, url) {
      tehtarik.sendMessage(from, {image: {url: url}, caption: capt}, {quoted: msg})
    }
    const type = Object.keys(msg.message)[0]
    const { quotedMsg } = msg
    const chats = msg.message.interactiveResponseMessage ? JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : (type === 'conversation' && msg.message.conversation) ? msg.message.conversation : (type === 'imageMessage') && msg.message.imageMessage.caption ? msg.message.imageMessage.caption : (type === 'videoMessage') && msg.message.videoMessage.caption ? msg.message.videoMessage.caption : (type === 'extendedTextMessage') && msg.message.extendedTextMessage.text ? msg.message.extendedTextMessage.text : (type === 'buttonsResponseMessage')&& msg.message.buttonsResponseMessage.selectedButtonId ? msg.message.buttonsResponseMessage.selectedButtonId : (type === 'templateButtonReplyMessage') && msg.message.templateButtonReplyMessage.selectedId ? msg.message.templateButtonReplyMessage.selectedId : (type === 'messageContextInfo') ? (msg.message.buttonsResponseMessage?.selectedButtonId || msg.message.listResponseMessage?.singleSelectReply.selectedRowId) : (type == 'listResponseMessage') && msg.message.listResponseMessage.singleSelectReply.selectedRowId ? msg.message.listResponseMessage.singleSelectReply.selectedRowId : ""
        if (chats == undefined) { chats = '' }
   const prefix = /^[°•π÷×¶∆£¢€¥®™✓_=|~!?#$%^&.+-,\/\\©^]/.test(chats) ? chats.match(/^[°•π÷×¶∆£¢€¥®™✓_=|~!?#$%^&.+-,\/\\©^]/gi) : '.'
    const from = msg.key.remoteJid
    const content = JSON.stringify(msg.message)
    const pushName = msg.pushName
    const isGroup = from.endsWith('@g.us')
    const sender = msg.key.fromMe ? (tehtarik.user.id.split(':')[0] + '@s.whatsapp.net' || tehtarik.user.id) : (msg.key.participant || from)
    const senderNumber = sender.split('@')[0]
    const fromMe = msg.key.fromMe
    if (fromMe) return
    const isImage = (type == 'imageMessage')
    const isQuotedMsg = (type == 'extendedTextMessage')
    const isOwner = [global.nomerowner, global.nomerbot].includes(sender) ? true : false
    const isQuotedImage = isQuotedMsg ? content.includes('imageMessage') ? true : false : false
    const command = chats.replace(prefix, "").trim().split(/ +/).shift().toLowerCase()
    const args = chats.trim().split(/ +/).slice(1)
    const text = q = args.join(" ")
    const groupMetadata = isGroup ? await tehtarik.groupMetadata(from) : ''
const groupName = isGroup ? groupMetadata.subject : ''
const groupId = isGroup ? groupMetadata.id : ''
const participants = isGroup ? await groupMetadata.participants : ''
const groupMembers = isGroup ? groupMetadata.participants : ''
const groupAdmins = isGroup ? getGroupAdmins(groupMembers) : ''
const isBotGroupAdmins = groupAdmins.includes(global.nomerbot) || false
const isGroupAdmins = groupAdmins.includes(sender)

    
    const mentionByTag = type == "extendedTextMessage" && msg.message.extendedTextMessage.contextInfo != null ? msg.message.extendedTextMessage.contextInfo.mentionedJid : []
const mentionByReply = type == "extendedTextMessage" && msg.message.extendedTextMessage.contextInfo != null ? msg.message.extendedTextMessage.contextInfo.participant || "" : ""
const mention = typeof(mentionByTag) == 'string' ? [mentionByTag] : mentionByTag
mention != undefined ? mention.push(mentionByReply) : []
const mentionUser = mention != undefined ? mention.filter(n => n) : []

async function qrisDinamis(nominal, path) {
  let qris = okeconnect.qrstring

  let qris2 = qris.slice(0, -4);
  let replaceQris = qris2.replace("010211", "010212");
  let pecahQris = replaceQris.split("5802ID");
  let uang = "54" + ("0" + nominal.length).slice(-2) + nominal + "5802ID";

  let output = pecahQris[0] + uang + pecahQris[1] + toCRC16(pecahQris[0] + uang + pecahQris[1])

  await QRCode.toFile(path, output, { margin: 2, scale: 10 })
  return path
}

function digit() {
  return Math.floor(Math.random() * 30)
}

function isRegistered(id) {
  let regist = false 
  Object.keys(User).forEach((user) => {
    if (User[user].id === id) regist = true
  })
  return regist
}
function getKategori(chat, kodeproduk) {
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
  let pos = null
  Object.keys(Kategori).forEach((k) => {
    let File = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[k]))
    Object.keys(File).forEach((p) => {
      if (File[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) pos = k
    })
  })
  if (pos !== null) {
    return Kategori[pos]
  } else {
    return `Kategori tidak ditemukan!`
  }
} 

function isExistProduk(kategori, kodeproduk) {
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
  let Data = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[kategori]))
  let boole = false
  Object.keys(Data).forEach((d) => {
    if (Data[d].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      boole = true
    }
  })
  return boole
}


const User = JSON.parse(fs.readFileSync("./Database/User.json"))

switch (command) {
  case 'menu':
     case 'help': {
   let txt = `Halo *${pushName}*,
Berikut adalah daftar menu yang ada di _${global.namabot}_

*#daftar* ( Mendaftarkan akun ke ${global.namabot} )
*#produk* ( List produk ${global.namabot} )
*#deposit* ( Deposit saldo ${global.namabot} )
*#leaderboard* ( Leaderboard ${global.namabot} )
*#beli* ( Beli produk di ${global.namabot} )
*#profil* ( Profil akunmu di ${global.namabot} )

_*${global.footer}*_`
await replyText(txt)
    break
  }
  
  case 'daftar': {
    if (isRegistered(sender)) return await replyText("Kamu sudah terdaftar di database.")
    let Datauser = {
      id: sender,
      saldo: 0,
      jumlahtransaksi: 0,
      pengeluaran: 0
    }
    User.push(Datauser)
    fs.writeFileSync("./Database/User.json", JSON.stringify(User, null, 3))
    await replyText("Berhasil mendaftar.")
    break
  }

case 'produk': {
  if (!isRegistered(sender)) return await replyText(alerts.daftar)
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
    let txt = `{ LIST PRODUK }
Ketik */list (namaproduk)* untuk menampilkan daftar produk

`
    Object.keys(Kategori).forEach((k) => {
      txt += `*- ${Kategori[k].replace(".json", "")}*\n`
    })
    txt += `\n*${global.footer}*`
    await replyText(txt)
  break
}

case 'list': {
  if (!isRegistered(sender)) return await replyText(alerts.daftar)
  let kategoriproduk = text
  if (!kategoriproduk) return await replyText(`Contoh penggunaan: #list Netflix`)
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 let pos = null
 let pesan = `{ LIST PRODUK }
╭──﹝*📍Cara Beli* ﹞
│1. Pilih produk yang kamu mau
│2. Cek kode produknya
│3. Beli menggunakan perintah /beli kode|jumlah
│4. Data produk akan dikirim otomatis oleh bot
╰────────
`
let stok = 0
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos !== null) {
   let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
   console.log(Produk)
   Object.keys(Produk).forEach((o) => {
     if (Produk[o].tipeproduk.toLowerCase() === "data") {
       stok = Produk[o].dataproduk.length
    } else {
      stok = Produk[o].stokproduk
    }
    pesan += `╭──﹝ *${Produk[o].namaproduk}* ﹞
│ *Kode:* ${Produk[o].kodeproduk}
│ *Harga:* ${formatrupiah(Produk[o].hargaproduk)}
│ *Stok:* ${stok}
│ *Deskripsi:* ${Produk[o].deskripsiproduk}
╰────────
`
   })
await replyText(pesan + `\n*${global.footer}*`)
 } else {
   await replyText(`Kategori produk tidak ditemukan!`)
 }
  break
}

case 'deposit': {
    if (!isRegistered(sender)) return await replyText(alerts.daftar)
    let jumlah = args[0]
    if (!jumlah) return await replyText(`Contoh penggunaan: *#deposit 5000*`)
    if (isNaN(jumlah)) return await replyText("Input harus berupa angka.")
    if (jumlah < 50) return await replyText("Minimal deposit adalah Rp100.")
    if (jumlah > 1000000) return await replyText("Maksimal deposit adalah Rp 1.000.000")
    let Unique = require("crypto").randomBytes(6).toString("hex").toUpperCase()
    let fee = digit()
    let totalAmount = Number(jumlah) + Number(fee)
    console.log(totalAmount)
    let time = Date.now() + toMs("10m")
    let pag = await qrisDinamis(`${totalAmount}`, `./Database/QR/${Unique}.jpg`)
    console.log(Unique)
    
   let txt = `{ KONFIRMASI DEPOSIT }
*- Order ID:* ${Unique}
*- Jumlah:* ${formatrupiah(Number(jumlah))}
*- Fee:* ${formatrupiah(Number(fee))}
*- Total Bayar:* ${formatrupiah(Number(totalAmount))}
*- Tanggal:* ${moment.format("ll HH:mm:ss")}

_Scan QRIS diatas untuk melakukan pembayaran sebelum 10 menit_`
let msggg = await tehtarik.sendMessage(from, { image: fs.readFileSync(pag), caption: txt })
    let statusP = false
    while (!statusP) {
      await sleep(10000)
      if (Date.now() >= time) {
        statusP = true
          await tehtarik.sendMessage(from, { delete: msggg.key })
        await replyText("Request depositmu telah expired.")
      }
      try {
        let response = await axios.get(`https://gateway.okeconnect.com/api/mutasi/qris/${okeconnect.merchantid}/${okeconnect.apikey}`)
    console.log(response.data)
    if (response.data.data[0] && response.data.data[0].amount && parseInt(response.data.data[0].amount) === parseInt(totalAmount)) {
    let result = response.data.data[0]
      statusP = true
      addSaldo(sender, Number(jumlah), User)
    let cekusersaldo = cekSaldo(sender, User)
    let txtr = `{ DEPOSIT BERHASIL }
*- Order ID:* ${Unique}
*- Jumlah:* ${formatrupiah(Number(jumlah))}
*- Fee:* ${formatrupiah(Number(fee))}
*- Total Bayar:* ${formatrupiah(Number(totalAmount))}
*- Tanggal:* ${moment.format("ll HH:mm:ss")}

Terimakasih sudah melakukan deposit di _${global.namabot}_`
let txtl = `{ DEPOSIT LOG }
*- Penerima:* ${sender.split("@")[0]}
*- Order ID:* ${Unique}
*- Jumlah:* ${formatrupiah(Number(jumlah))}

_*${global.footer}*_`
await replyText(txtr)
await sleep(1500)
        await tehtarik.sendMessage(from, { delete: msggg.key })
await tehtarik.sendMessage(global.nomerowner, {text: txtl})
fs.unlinkSync(`${Unique}.png`)
      }
      } catch (err) {
        console.log(err)
      }
    }
    break
  }
  case 'profil': {
    if (!isRegistered(sender)) return await replyText(alerts.daftar)
    let pos = null
    Object.keys(User).forEach((p) => {
      if (User[p].id === sender) pos = p
    })
    let txt = `{ PROFIL }
*- Nama:* ${pushName}
*- Nomor:* ${sender.split("@")[0]}
*- Saldo:* ${formatrupiah(cekSaldo(sender, User))}
*- Jumlah transaksi:* ${User[pos].jumlahtransaksi}\n\nJika saldo anda kurang, ketik *deposit*

_*${global.footer}*_ *BOT LAYANAN 24 JAM*`
await replyText(txt)
    break
  }
  
  case 'leaderboard': {
    if (!isRegistered(sender)) return await replyText(alerts.daftar)
    let txt = `{ LEADERBOARD }
`
let count = 1
User.forEach(usr => {
  User.sort((a, b) => b.pengeluaran - a.pengeluaran)
  txt += `${count}. +${usr.id.split("@")[0]} - ${formatrupiah(usr.pengeluaran)}\n`
  count += 1
})
txt += `\n_*${global.footer}*_`
await replyText(txt)
    break
  }
  
  case 'addkategori': {
    if (!isOwner) return
    let kategori = text
    if (!kategori) return await replyText("Contoh penggunaan: *#addkategori Akun*")
    let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategori.toLowerCase()) {
     pos = k
   }
 })
 if (pos !== null) return replyText(`Kategori produk sudah digunakan!`)
 fs.writeFileSync("./Database/Kategori/" + kategori + ".json", "[]")
 await replyText("Berhasil menambah kategori!")
    break
  }

case 'delkategori': {
  if (!isOwner) return
    let kategori = text
    if (!kategori) return await replyText("Contoh penggunaan: *#delkategori Akun*")
    let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategori.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
 fs.unlinkSync("./Database/Kategori/" + kategori + ".json")
 await replyText(`Berhasil menghapus kategori *${kategori}*`)
  break
}

case 'renamekategori': {
  if (!isOwner) return
    let kategorilama = text.split("|")[0]
    let kategoribaru = text.split("|")[1]
    if (!kategorilama || !kategoribaru) return await replyText("Contoh penggunaan: *#renamekategori Akun|AkunFF*")
    let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategorilama.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
 fs.renameSync("./Database/Kategori/" + kategorilama + ".json", "./Database/Kategori/" + kategoribaru + ".json")
 await replyText(`Berhasil mengganti nama kategori *${kategorilama}* menjadi *${kategoribaru}*`)
  break
}

case 'addproduk': {
  if (!isOwner) return
  let kategoriproduk = text.split("|")[0]
  let namaproduk = text.split("|")[1]
  let kodeproduk = text.split("|")[2]
  let hargaproduk = text.split("|")[3]
  let tipeproduk = text.split("|")[4]
  let deskripsiproduk = text.split("|")[5]
  let catatanproduk = text.split("|")[6]
  if (!kategoriproduk || !namaproduk || !kodeproduk || !hargaproduk || !tipeproduk || !deskripsiproduk || !catatanproduk) return await replyText("Contoh penggunaan: #addproduk Netflix|Netflix 1 Bulan|netflix1b|20000|Data|Netflix Untuk 1 Bulan|Harap digunakan sebelum expired")
  if (isNaN(hargaproduk)) return await replyText("Harga produk harus berupa angka!")
  if (tipeproduk.toLowerCase() !== "data" && tipeproduk.toLowerCase() !== "file") return replyText("Tipe produk harus berupa data atau file!")
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
 if (isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk sudah digunakan!`)
 let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
 let Data = {
   namaproduk: namaproduk,
          kodeproduk: kodeproduk.replace(" ", ""),
          hargaproduk: Number(hargaproduk),
          tipeproduk: tipeproduk,
          dataproduk: [],
          stokproduk: 0,
          deskripsiproduk: deskripsiproduk,
          catatanproduk: catatanproduk
 }
 Produk.push(Data)
 fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
 await replyText(`Berhasil menambah *${namaproduk}*`)
  break
}

case 'delproduk': {
  if (!isOwner) return
  let kategoriproduk = text.split("|")[0]
  let kodeproduk = text.split("|")[1]
  if (!kategoriproduk || !kodeproduk) return await replyText(`Contoh penggunaan: #delproduk Netflix|netflix1b`)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
  Produk.splice(ps, 1)
  fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
  await replyText(`Berhasil menghapus *${kodeproduk}*`)
  }
  break
}

case 'addstok': {
  if (!isOwner) return
  let kategoriproduk = text.split("|")[0]
  let kodeproduk = text.split("|")[1]
  let dataproduk = text.split("|")[2]
  let stokproduk = text.split("|")[3]
  if (!kategoriproduk || !kodeproduk || !dataproduk || !stokproduk) return await replyText(`Contoh penggunaan: #addstok Netflix|netflix1b|email:password|0(Isi 0 jika tipe data dan sebaliknya)`)
  if (isNaN(stokproduk)) return await replyText(`Stok produk harus berupa angka!`)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
    if (Produk[ps].tipeproduk.toLowerCase() === "data") {
      for (let i of dataproduk.split(/[\n\r\s]+/)) {
    Produk[ps].dataproduk.push(i)
    }
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
   await replyText(`Berhasil menambah *${dataproduk.split(/[\n\r\s]+/).length}* stok ke *${kodeproduk}*`)
    } else {
      if (!Produk[ps].dataproduk[0]) {
          Produk[ps].dataproduk.push(dataproduk)
          fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
          }
    Produk[ps].stokproduk += Number(stokproduk)
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
    await replyText(`Berhasil menambah *${stokproduk}* stok ke produk *${kodeproduk}*`)
    }
  }
  break
}

case 'minstok': {
  if (!isOwner) return
  let kategoriproduk = text.split("|")[0]
  let kodeproduk = text.split("|")[1]
  let jumlah = text.split("|")[2]
  if (!kategoriproduk || !kodeproduk || !jumlah) return await replyText(`Contoh penggunaan: #minstok Netflix|netflix1b|5`)
  if (isNaN(jumlah)) return await replyText(`Stok produk harus berupa angka!`)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
    if (Produk[ps].tipeproduk.toLowerCase() === "data") {
      if (Produk[ps].dataproduk.length < Number(jumlah)) return await replyText(`Stok produk tidak mencukupi untuk dikurangi sebanyak *${jumlah}*`)
    for (let i = 0; i < Number(jumlah); i++) {
      Produk[ps].dataproduk.splice(0, 1)
    }
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
    await replyText(`Berhasil mengurangi *${jumlah}* stok *${kodeproduk}*`)
  } else {
    if (Produk[ps].stokproduk < Number(jumlah)) return await replyText(`Stok produk tidak mencukupi untuk dikurangi sebanyak *${jumlah}*`)
    Produk[ps].stokproduk -= Number(jumlah)
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
    await replyText(`Berhasil mengurangi *${jumlah}* stok *${kodeproduk}*`)
  }
  }
  break
}

case 'editnama': {
  if (!isOwner) return
  let kategoriproduk = text.split("|")[0]
  let kodeproduk = text.split("|")[1]
  let namabaruproduk = text.split("|")[2]
  if (!kategoriproduk || !kodeproduk || !namabaruproduk) return await replyText(`Contoh penggunaan: #editnama Netflix|netflix1b|Netflix 1 Bulan Coy`)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
    Produk[ps].namaproduk = namabaruproduk
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
    await replyText(`Berhasil mengubah nama produk *${kodeproduk}* menjadi *${namabaruproduk}*`)
  }
  break
}

case 'editkode': {
  if (!isOwner) return
  let kategoriproduk = text.split("|")[0]
  let kodeproduk = text.split("|")[1]
  let kodebaru = text.split("|")[2]
  if (!kategoriproduk || !kodeproduk || !kodebaru) return await replyText(`Contoh penggunaan: #editkode Netflix|netflix1b|net1b`)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
    Produk[ps].kodeproduk = kodebaru
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
    await replyText(`Berhasil mengubah kode produk *${kodeproduk}* menjadi *${kodebaru}*`)
  }
  break
}

case 'editharga': {
  if (!isOwner) return
  let kategoriproduk = text.split("|")[0]
  let kodeproduk = text.split("|")[1]
  let hargabaru = text.split("|")[2]
  if (!kategoriproduk || !kodeproduk || !hargabaru) return await replyText(`Contoh penggunaan: #editharga Netflix|netflix1b|50000`)
  if (isNaN(hargabaru)) return await replyText(`Harga produk harus berupa angka!`)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
    Produk[ps].hargaproduk = Number(hargabaru)
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
    await replyText(`Berhasil mengubah harga produk *${kodeproduk}* menjadi *${formatrupiah(Number(hargabaru))}*`)
  }
  break
}

case 'editdeskripsi': {
  let kategoriproduk = args.split("|")[0]
  let kodeproduk = args.split("|")[1]
  let deskripsibaru = args.split("|")[2]
  if (!kategoriproduk || !kodeproduk || !deskripsibaru) return await replyText(`Contoh penggunaan: #editdeskripsi Netflix|netflix1b|No deskripsi coy.`)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
    Produk[ps].deskripsiproduk = deskripsibaru
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
    await replyText(`Berhasil mengubah deskripsi produk *${kodeproduk}* menjadi *${deskripsibaru}*`)
  }
  break
}

case 'editcatatan': {
  if (!isOwner) return
  let kategoriproduk = args.split("|")[0]
  let kodeproduk = args.split("|")[1]
  let catatanbaru = args.split("|")[2]
  if (!kategoriproduk || !kodeproduk || !catatanbaru) return await replyText(`Contoh penggunaan: #editcatatan Netflix|netflix1b|Harap digunakan, jangan dianggurin`)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace(".json", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
    Produk[ps].catatanproduk = catatanbaru
    fs.writeFileSync("./Database/Kategori/" + Kategori[pos], JSON.stringify(Produk, null, 3))
    await replyText(`Berhasil mengubah catatan produk *${kodeproduk}* menjadi *${catatanbaru}*`)
  }
  break
}

case 'daftaruser': {
  if (!isOwner) return
  let User = JSON.parse(fs.readFileSync("./Database/User.json"))
  let txt = `{ DAFTAR USER }
`
  Object.keys(User).forEach((p) => {
    txt += `{
Nomer: ${User[p].id.split("@")[0]}
Saldo: ${formatrupiah(User[p].saldo)}
Jumlah Transaksi: ${User[p].jumlahtransaksi}
Pengeluaran: ${formatrupiah(User[p].pengeluaran)}
}`
  })
  await replyText(txt)
  break
}

case 'addsaldo': {
  if (!isOwner) return
  let user = text.split("|")[0]
  let jumlah = text.split("|")[1]
  if (!user || !jumlah) return await replyText(`Cara Penggunaan: #addsaldo 2822827383|20000`)
  if (isNaN(jumlah)) return await replyText(`Jumlah harus berupa angka!`)
  if (!isRegistered(user + "@s.whatsapp.net")) return await replyText(`User tidak ditemukan!`)
  addSaldo(user + "@s.whatsapp.net", Number(jumlah), User)
  await replyText(`Berhasil menambah saldo user *${user}* sebesar *${formatrupiah(Number(jumlah))}*`)
  break
}

case 'minsaldo': {
  if (!isOwner) return
  let user = text.split("|")[0]
  let jumlah = text.split("|")[1]
  if (!user || !jumlah) return await replyText(`Cara Penggunaan: #minsaldo 2822827383|20000`)
  if (isNaN(jumlah)) return await replyText(`Jumlah harus berupa angka!`)
  if (!isRegistered(user + "@s.whatsapp.net")) return await replyText(`User tidak ditemukan!`)
  minSaldo(user + "@s.whatsapp.net", Number(jumlah), User)
  await replyText(`Berhasil mengurangi saldo user *${user}* sebesar *${formatrupiah(Number(jumlah))}*`)
  break
}

case 'deluser': {
  if (!isOwner) return
  let user = text
  if (!user) return await replyText(`Cara penggunaan: #deluser 8283372828`)
  user = Number(user)
  let OP = JSON.parse(fs.readFileSync("./Database/User.json"))
  let o = null
  Object.keys(OP).forEach((p) => {
    if (OP[p].id.split("@")[0] === user) o = p
  })
  if (o !== null) {
    OP.splice(o, 1)
    fs.writeFileSync("./Database/User.json", JSON.stringify(OP, null, 3))
    await replyText(`Berhasil menghapus user *${user}*`)
  } else {
    await replyText(`User tidak ditemukan!`)
  }
  break
}

case 'beli': {
  if (!isRegistered(sender)) return await replyText(alerts.daftar)
  let kodeproduk = text.split("|")[0]
  let jumlah = text.split("|")[1]
  if (!kodeproduk || !jumlah) return await replyText(`Cara Penggunaan: #beli netflix1b|2`)
  if (isNaN(jumlah)) return await replyText(`Jumlah harus berupa angka!`)
  
  let kategoriproduk = await getKategori(sender.split("@")[0], kodeproduk)
  let pos = null
  let Kategori = fs.readdirSync("./Database/Kategori/").filter(file => file.endsWith(".json"))
 Object.keys(Kategori).forEach((k) => {
   if (Kategori[k].replace("", "").toLowerCase() === kategoriproduk.toLowerCase()) {
     pos = k
   }
 })
 if (pos === null) return await replyText(`Kategori produk tidak ditemukan!`)
  if (!isExistProduk(pos, kodeproduk)) return await replyText(`Kode produk tidak ditemukan!`)
  let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Kategori[pos]))
  let ps = null
  let stok = 0
  Object.keys(Produk).forEach((p) => {
    if (Produk[p].kodeproduk.toLowerCase() === kodeproduk.toLowerCase()) {
      ps = p
    }
  })
  if (ps !== null) {
    if (Produk[ps].tipeproduk.toLowerCase() === "file") {
      stok = Produk[ps].stokproduk
    } else {
      stok = Produk[ps].dataproduk.length
    }
    if (stok < Number(jumlah)) return await replyText(`Stok produk tidak mencukupi!`)
    let harga = Number(jumlah) * Produk[ps].hargaproduk
    let Unique = require("crypto").randomBytes(6).toString("hex").toUpperCase()
    let DataBeli = {
      buyer: sender,
      unique: Unique,
      kategoriproduk: kategoriproduk.replace(".json", ""),
      kodeproduk: kodeproduk,
      harga: harga,
      jumlah: Number(jumlah)
    }
    fs.writeFileSync("./Database/Trx/" + sender.split("@")[0] + ".json", JSON.stringify(DataBeli, null, 3))
    let txt = `{ KONFIRMASI PESANAN }
*- Order ID:* ${Unique}
*- Produk:* ${Produk[ps].namaproduk}
*- Kode:* ${Produk[ps].kodeproduk}
*- Jumlah beli:* ${jumlah}
*- Harga:* ${formatrupiah(harga)}

Silahkan pilih metode pembayaran untuk melanjutkan
- #pakaiqris
- #pakaisaldo`
    await replyText(txt)
  }
  break
}

case 'pakaisaldo': {
  if (!isRegistered(sender)) return await replyText(alerts.daftar)
  if (!fs.existsSync("./Database/Trx/" + sender.split("@")[0] + ".json")) return await replyText(`Kamu belum memilih produk apapun!`)
    let Data = JSON.parse(fs.readFileSync("./Database/Trx/" + sender.split("@")[0] + ".json"))
    let User = JSON.parse(fs.readFileSync("./Database/User.json"))
    if (cekSaldo(sender, User) < Data.harga) return await replyText(`Saldo kamu tidak mencukupi!`)
    minSaldo(sender, Number(Data.harga), User)
    let DataProduk = ""
    let po = null
    let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Data.kategoriproduk + ".json"))
    Object.keys(Produk).forEach((p) => {
      if (Produk[p].kodeproduk.toLowerCase() === Data.kodeproduk.toLowerCase()) {
        po = p
      }
    })
    await replyText("Pesananmu sedang diproses.")
    await sleep(1000)
    if (Produk[po].tipeproduk.toLowerCase() === "data") {
      for (let i = 0; i < Number(Data.jumlah); i++) {
              DataProduk += Produk[po].dataproduk[0] + "\n"
              Produk[po].dataproduk.splice(0, 1)
            }
            fs.writeFileSync("./Database/Kategori/" + Data.kategoriproduk + ".json", JSON.stringify(Produk, null, 3))
            await replyText(`{ DETAIL PESANAN }
*- Order ID:* ${Data.unique}
*- Produk:* ${Produk[po].namaproduk}
*- Kode:* ${Produk[po].kodeproduk}
*- Jumlah beli:* ${Data.jumlah}
*- Harga:* ${formatrupiah(Data.harga)}

${DataProduk}

*${global.footer}*`)
    } if (Produk[po].tipeproduk.toLowerCase() === "file") {
      Produk[po].stokproduk -= 1
      fs.writeFileSync("./Database/Kategori/" + Data.kategoriproduk + ".json", JSON.stringify(Produk, null, 3))
      await replyText(`{ DETAIL PESANAN }
*- Order ID:* ${Data.unique}
*- Produk:* ${Produk[ps].namaproduk}
*- Kode:* ${Produk[ps].kodeproduk}
*- Jumlah beli:* ${Data.jumlah}
*- Harga:* ${formatrupiah(Data.harga)}

||${Produk[po].dataproduk[0]}||

Note : ${Produk[po].catatanproduk}

*${global.footer}*`)
    }
    let log = `{ LOG TRANSAKSI }
*- Order ID:* ${Data.unique}
*- Buyer:* ${sender.split("@")[0]}
*- Produk:* ${Produk[po].namaproduk}
*- Jumlah beli:* ${Data.jumlah}
*- Harga:* ${formatrupiah(Data.harga)}
*- Tanggal:* ${hariArray[require("moment-timezone")().format("d")]}, ${require("moment-timezone")().format("D")} ${bulanArray[require("moment-timezone")().format("M")]} ${require("moment-timezone")().format("YYYY")}`
await sleep(2000)
await tehtarik.sendMessage(global.nomerowner, {text: log})
let Transaksi = JSON.parse(fs.readFileSync("./Database/Transaksi.json"))
let DataTrx = {
  buyer: sender,
  unique: Data.unique,
  tanggal: `${hariArray[require("moment-timezone")().format("d")]}, ${require("moment-timezone")().format("D")} ${bulanArray[require("moment-timezone")().format("M")]} ${require("moment-timezone")().format("YYYY")}`,
  produk: Produk[po].namaproduk,
  harga: Data.harga
}
Transaksi.push(DataTrx)
fs.writeFileSync("./Database/Transaksi.json", JSON.stringify(Transaksi, null, 3))
let pp = null
Object.keys(User).forEach((user) => {
  if (User[user].id === sender) {
    pp = user
  }
})
if (pp !== null) {
  User[pp].jumlahtransaksi += 1
  User[pp].pengeluaran += Number(Data.harga)
  fs.writeFileSync("./Database/User.json", JSON.stringify(User, null, 3))
}
  break
}
case 'pakaiqris': {
  if (!isRegistered(sender)) return await replyText(alerts.daftar)
  if (!fs.existsSync("./Database/Trx/" + sender.split("@")[0] + ".json")) return await replyText(`Kamu belum memilih produk apapun!`)
    let Data = JSON.parse(fs.readFileSync("./Database/Trx/" + sender.split("@")[0] + ".json"))
    let DataProduk = ""
    let po = null
    let Produk = JSON.parse(fs.readFileSync("./Database/Kategori/" + Data.kategoriproduk + ".json"))
    Object.keys(Produk).forEach((p) => {
      if (Produk[p].kodeproduk.toLowerCase() === Data.kodeproduk.toLowerCase()) {
        po = p
      }
    })
    let Unique = require("crypto").randomBytes(6).toString("hex").toUpperCase()
    let fee = digit()
    let totalAmount = Number(Data.harga) + Number(fee)
    console.log(totalAmount)
    let time = Date.now() + toMs("10m")
    let dd = await qrisDinamis(`${totalAmount}`, `./Database/QR/${Unique}.jpg`)
    let hj = `{ KONFIRMASI PEMBAYARAN }
*- Order ID:* ${Unique}
*- Produk:* ${Produk[po].namaproduk}
*- Kode:* ${Produk[po].kodeproduk}
*- Jumlah beli:* ${Data.jumlah}
*- Fee QRIS:* ${fee}
*- Harga:* ${formatrupiah(totalAmount)}

_Scan QRIS diatas untuk melakukan pembayaran sebelum expired_`
    let msggg = await tehtarik.sendMessage(from, { image: fs.readFileSync(dd), caption: hj })
    let statusP = false
    while (!statusP) {
      await sleep(10000)
      if (Date.now() >= time) {
        statusP = true
          await tehtarik.sendMessage(from, { delete: msggg.key })
        await replyText("QRIS Pesananmu telah expired")
      }
      try {
        let response = await axios.get(`https://gateway.okeconnect.com/api/mutasi/qris/${okeconnect.merchantid}/${okeconnect.apikey}`)
    console.log(response.data)
    if (response.data.data[0] && response.data.data[0].amount && parseInt(response.data.data[0].amount) === parseInt(totalAmount)) {
    let result = response.data.data[0]
      statusP = true
    if (Produk[po].tipeproduk.toLowerCase() === "data") {
      for (let i = 0; i < Number(Data.jumlah); i++) {
              DataProduk += Produk[po].dataproduk[0] + "\n"
              Produk[po].dataproduk.splice(0, 1)
            }
            fs.writeFileSync("./Database/Kategori/" + Data.kategoriproduk + ".json", JSON.stringify(Produk, null, 3))
            await replyText(`{ DETAIL PESANAN }
*- Order ID:* ${Data.unique}
*- Produk:* ${Produk[po].namaproduk}
*- Kode:* ${Produk[po].kodeproduk}
*- Jumlah beli:* ${Data.jumlah}
*- Harga:* ${formatrupiah(Data.harga)}

${DataProduk}

*${global.footer}*`)
    } if (Produk[po].tipeproduk.toLowerCase() === "file") {
      Produk[po].stokproduk -= 1
      fs.writeFileSync("./Database/Kategori/" + Data.kategoriproduk + ".json", JSON.stringify(Produk, null, 3))
      await replyText(`{ DETAIL PESANAN }
*- Order ID:* ${Data.unique}
*- Produk:* ${Produk[ps].namaproduk}
*- Kode:* ${Produk[ps].kodeproduk}
*- Jumlah beli:* ${Data.jumlah}
*- Harga:* ${formatrupiah(Data.harga)}

||${Produk[po].dataproduk[0]}||

Note : ${Produk[po].catatanproduk}

*${global.footer}*`)
    }
    fs.unlinkSync(`${Unique}.png`)
    let log = `{ LOG TRANSAKSI }
*- Order ID:* ${Data.unique}
*- Buyer:* ${sender.split("@")[0]}
*- Produk:* ${Produk[po].namaproduk}
*- Jumlah beli:* ${Data.jumlah}
*- Harga:* ${formatrupiah(Data.harga)}
*- Tanggal:* ${hariArray[require("moment-timezone")().format("d")]}, ${require("moment-timezone")().format("D")} ${bulanArray[require("moment-timezone")().format("M")]} ${require("moment-timezone")().format("YYYY")}`
await sleep(2000)
await tehtarik.sendMessage(global.nomerowner, {text: log})
let Transaksi = JSON.parse(fs.readFileSync("./Database/Transaksi.json"))
let DataTrx = {
  buyer: sender,
  unique: Data.unique,
  tanggal: `${hariArray[require("moment-timezone")().format("d")]}, ${require("moment-timezone")().format("D")} ${bulanArray[require("moment-timezone")().format("M")]} ${require("moment-timezone")().format("YYYY")}`,
  produk: Produk[po].namaproduk,
  harga: Data.harga
}
Transaksi.push(DataTrx)
fs.writeFileSync("./Database/Transaksi.json", JSON.stringify(Transaksi, null, 3))
let User = JSON.parse(fs.readFileSync("./Database/User.json"))
let pp = null
Object.keys(User).forEach((user) => {
  if (User[user].id === sender) {
    pp = user
  }
})
if (pp !== null) {
  User[pp].jumlahtransaksi += 1
  User[pp].pengeluaran += Number(Data.harga)
  fs.writeFileSync("./Database/User.json", JSON.stringify(User, null, 3))
}
      }
      } catch (err) {
        console.log(err)
      }
    }
  break
}

case 'ownermenu': {
  //if (!isOwner)
  await replyText(`{ OWNER MENU }


*- addkategori*
*- delkategori*
*- renamekategori*
*- addproduk*
*- delproduk*
*- addstok*
*- minstok*
*- editnama*
*- editkode*
*- editharga*
*- editdeskripsi*
*- editcatatan*
*- deluser*
*- daftaruser*
*- addsaldo*
*- minsaldo*
`)
  break
}

}
  })
}
startBot()