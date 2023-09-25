const P = require('pino')
const axios = require('axios');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const fs = require('fs');
const qrcode = require('qrcode');

const startCon = async (device, socket = undefined, logout = undefined) => {

    const { state, saveCreds } = await useMultiFileAuthState(`./session-${device}.json`)
    const sock = makeWASocket({
        auth: state,
        version: [2, 2206, 9],
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['mLITE', "Desktop", '10.0']

    })


    sock.ev.on("connection.update", async (update) => {
        const { qr, connection, lastDisconnect } = update
        if (connection === 'close') {
            if ((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                if ((lastDisconnect.error)?.output?.message === 'Restart Required') {
                    startCon(device)
                }
                // console.log((lastDisconnect.error))
                socket !== undefined ? socket.emit('Proccess') : ''
            } else if ((lastDisconnect.error)?.output?.statusCode === 401) {

                socket.emit('Unauthorized');
                if (fs.existsSync(`./session-${device}.json`)) {
                    fs.rmSync(`./session-${device}.json`, { recursive: true });
                    fs.rmSync(`./number.txt`, { recursive: true });
                    socket.emit("message", "logout device " + device);
                }
            }
        } else if (connection === 'open') {

            socket !== undefined ? socket.emit('Authenticated', sock.user) : ''
            if (logout) {
                sock.logout().then(() => {
                    socket.emit('Pro`ccess')
                })
                return
            }

        }
        if (qr) {
            qrcode.toDataURL(qr, (err, url) => {
                if (err) console.log(err);
                socket !== undefined ? socket.emit('QrGenerated', url) : ''
            })
        }
    })
    sock.ev.on('creds.update', saveCreds)
    return {
        conn: sock,
        state: state
    }

}

// init
setInterval(async () => {
    fs.readFile('./number.txt', 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      } else {
        var data = data.split('\n').shift();
        if (fs.existsSync(`./session-${data}.json/creds.json`)) {
            startCon(data);
            console.log(`Success initialize ${data} Device`);
        }
      }
    });
}, 50000);

module.exports = { startCon: startCon }
