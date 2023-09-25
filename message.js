
const { validationResult } = require('express-validator');
const { startCon } = require('./connection')
const fs = require('fs');
//const { getFileTypeFromUrl, formatReceipt } = require('./Helper')
const { Socket } = require('socket.io');
const validationSend = async (req) => {

    const errors = validationResult(req);
    //console.log(req);
    if (!errors.isEmpty()) return { status: false, msg: errors.array()[0].msg };
    const check = await fs.readFileSync(`./session-${req.body.sender}.json/creds.json`);
    if (!check) return { status: false, msg: 'The sender is not registered or not scan yet!' }

    const { conn, state } = await startCon(req.body.sender)

    return { status: true, data: { conn, state } }
}

const sendMessage = async (req, res) => {

    const checkValidation = await validationSend(req)

    const receipt = formatReceipt(req.body.number);
    if (checkValidation.status === false) return res.status(410).json({ status: false, msg: checkValidation.msg })
    const { conn, state } = checkValidation.data

    const type = req.body.type;
    const msg = await getMessage(type, req.body)
    conn.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            const check = await conn.onWhatsApp(receipt);
            if (check.length === 0) return res.status(410).json({ status: false, msg: 'The Destination Number Is Not Registered On Whatsapp' });
            await conn.sendMessage(receipt, msg).then(() => {

                res.status(200).json({ status: true, msg: 'Message Sent!' })
            }).catch((e) => {

                res.status(410).json({ status: false, msg: e.message })
            })
            conn.end();
            setTimeout(async () => {

                await startCon(req.body.sender)
                return;
            }, 5000);

        }

    })

}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

async function getMessage(type, data) {
    try {
        let msg;
        switch (type) {
            case 'text':
                msg = { text: data.message }
                break;
            case 'image':
                msg = { image: { url: data.url }, caption: data.message }
                break;
            case 'document':
                const { explode, fileType } = getFileTypeFromUrl(data.url);
                msg = { document: { url: data.url }, fileName: explode, mimetype: `application/${fileType}` }
                break;
            default:
                break;
        }

        return msg;
    } catch (error) {
        console.log(error);
    }
}

function getFileTypeFromUrl(url) {
    try {
        const arrayUrl = url.split("/");
        const explode = arrayUrl[arrayUrl.length - 1];
        const d = explode.split(".");
        const filetype = d[d.length - 1];
        return { explode, filetype };
    } catch (error) {
        console.log(error)
    }

}


function formatReceipt(receipt) {
  
    try {
        if (receipt.endsWith('@g.us')) {
            return receipt
        }
        let formatted = receipt.replace(/\D/g, '');

        if (formatted.startsWith('0')) {
            formatted = '62' + formatted.substr(1);
        }

        if (!formatted.endsWith('@c.us')) {
            formatted += '@c.us';
        }

        return formatted;
    } catch (error) {
        console.log(error)
    }

}

module.exports = { sendMessage }
