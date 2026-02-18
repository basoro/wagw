
const { validationResult } = require('express-validator');
const { getSession, sessions } = require('./connection')
const { logMessage } = require('./database');
const fs = require('fs');
//const { getFileTypeFromUrl, formatReceipt } = require('./Helper')
const { Socket } = require('socket.io');

const validationSend = async (req) => {

    const errors = validationResult(req);
    //console.log(req);
    if (!errors.isEmpty()) return { status: false, msg: errors.array()[0].msg };
    
    const sender = req.body.sender;
    const conn = getSession(sender);
    
    if (!conn) return { status: false, msg: 'The sender is not registered or not scan yet!' }

    return { status: true, data: { conn } }
}

const sendMessage = async (req, res) => {

    const checkValidation = await validationSend(req)

    const receipt = formatReceipt(req.body.number);
    if (checkValidation.status === false) return res.status(410).json({ status: false, msg: checkValidation.msg })
    const { conn } = checkValidation.data

    const type = req.body.type || 'text';
    const msg = await getMessage(type, req.body)
    
    try {
        const check = await conn.onWhatsApp(receipt);
        if (check.length === 0) return res.status(410).json({ status: false, msg: 'The Destination Number Is Not Registered On Whatsapp' });
        await conn.sendMessage(receipt, msg).then(() => {
            logMessage(req.body.sender, receipt, JSON.stringify(msg), 'success');
            res.status(200).json({ status: true, msg: 'Message Sent!' })
        }).catch((e) => {
            logMessage(req.body.sender, receipt, JSON.stringify(msg), 'failed: ' + e.message);
            res.status(410).json({ status: false, msg: e.message })
        })
    } catch (e) {
         res.status(410).json({ status: false, msg: e.message })
    }

}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const sendBulkMessage = async (req, res) => {
    const { numbers, messages, type } = req.body;
    
    if (!Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ status: false, msg: 'Invalid numbers array' });
    }
    
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ status: false, msg: 'Invalid messages array' });
    }

    const activeSessions = Array.from(sessions.keys());
    
    if (activeSessions.length === 0) {
        return res.status(500).json({ status: false, msg: 'No active sessions available' });
    }

    // Return immediate response
    res.json({ status: true, msg: 'Bulk process started in background' });

    console.log(`Starting bulk blast to ${numbers.length} numbers using ${activeSessions.length} devices.`);

    for (const number of numbers) {
        // Randomly select a device
        const randomDevice = activeSessions[Math.floor(Math.random() * activeSessions.length)];
        const conn = sessions.get(randomDevice);

        if (!conn) continue; // Skip if connection somehow lost

        // Randomly select a message
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // Prepare message data
        const messageData = {
            message: randomMessage,
            url: req.body.url // Optional for media
        };

        const msgContent = await getMessage(type || 'text', messageData);
        const receipt = formatReceipt(number);

        try {
            const check = await conn.onWhatsApp(receipt);
            if (check.length > 0) {
                await conn.sendMessage(receipt, msgContent);
                logMessage(randomDevice, receipt, JSON.stringify(msgContent), 'success');
                console.log(`Sent to ${number} via ${randomDevice}`);
            } else {
                 logMessage(randomDevice, receipt, JSON.stringify(msgContent), 'failed: not registered');
                 console.log(`Failed ${number} not registered`);
            }
        } catch (e) {
            logMessage(randomDevice, receipt, JSON.stringify(msgContent), 'failed: ' + e.message);
            console.error(`Error sending to ${number}:`, e.message);
        }

        // Random delay between 1-5 seconds to avoid block
        const delay = Math.floor(Math.random() * 4000) + 1000;
        await sleep(delay);
    }
    
    console.log('Bulk blast finished.');
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

module.exports = { sendMessage, sendBulkMessage }
