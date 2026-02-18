const P = require('pino')
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const fs = require('fs');
const qrcode = require('qrcode');

const sessions = new Map();

const startCon = async (device, socket = undefined, logout = undefined) => {

    const { state, saveCreds } = await useMultiFileAuthState(`./session-${device}.json`)
    
    // Fetch latest version of WA Web
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)
    
    const sock = makeWASocket({
        auth: state,
        version: version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'], 
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        syncFullHistory: false
    })


    sock.ev.on("connection.update", async (update) => {
        const { qr, connection, lastDisconnect } = update
        if (connection === 'close') {
            const statusCode = (lastDisconnect.error)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            
            if (shouldReconnect) {
                // Reconnect dengan delay
                setTimeout(() => {
                    startCon(device, socket)
                }, 3000)
            } else if (statusCode === DisconnectReason.loggedOut) {
                if (socket) socket.emit('Unauthorized');
                if (fs.existsSync(`./session-${device}.json`)) {
                    fs.rmSync(`./session-${device}.json`, { recursive: true });
                    sessions.delete(device);
                    if (socket) socket.emit("message", "logout device " + device);
                }
            }
            if (socket) socket.emit('Proccess')
            
        } else if (connection === 'open') {

            socket !== undefined ? socket.emit('Authenticated', sock.user) : ''
            if (logout) {
                sock.logout().then(() => {
                    sessions.delete(device);
                    if (fs.existsSync(`./session-${device}.json`)) {
                        fs.rmSync(`./session-${device}.json`, { recursive: true });
                    }
                    socket.emit('Proccess')
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
    
    sessions.set(device, sock);
    
    return {
        conn: sock,
        state: state
    }

}

const init = async () => {
    const files = fs.readdirSync('./');
    files.forEach(file => {
        if (file.startsWith('session-') && file.endsWith('.json')) {
            const device = file.replace('session-', '').replace('.json', '');
            if (fs.existsSync(`./session-${device}.json/creds.json`)) {
                startCon(device);
                console.log(`Success initialize ${device} Device`);
            }
        }
    });
}

const getSession = (device) => {
    return sessions.get(device);
}

module.exports = { startCon, init, getSession, sessions }
