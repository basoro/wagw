
const { sendMessage, sendBulkMessage } = require('./message')
const { getLogs, validateApiKey } = require('./database')
const { sessions, startCon } = require('./connection')
const { body } = require('express-validator')
const fs = require('fs');

const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
        return res.status(401).json({ status: false, msg: 'API Key is missing' });
    }

    try {
        const key = await validateApiKey(apiKey);
        if (!key) {
            return res.status(403).json({ status: false, msg: 'Invalid API Key' });
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, msg: 'Internal Server Error' });
    }
};

module.exports = function (router) {

    router.use('/wagateway/*', authenticate);

    router.post('/wagateway/kirimpesan', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('message', 'Wrong Parameters!').notEmpty()
    ], sendMessage)
    router.post('/wagateway/kirimgambar', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('message', 'Wrong Parameters!').notEmpty(),
        body('url', 'Wrong Parameters!').notEmpty(),
    ], sendMessage)
    router.post('/wagateway/kirimfile', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('url', 'Wrong Parameters!').notEmpty(),
    ], sendMessage)

    router.post('/wagateway/blast', [
        body('numbers', 'Wrong Parameters!').isArray(),
        body('messages', 'Wrong Parameters!').isArray(),
    ], sendBulkMessage)

    router.get('/wagateway/logs', (req, res) => {
        getLogs(100, (err, rows) => {
             if (err) {
                 res.status(500).json({ status: false, msg: err.message });
             } else {
                 res.json({ status: true, data: rows });
             }
        });
    });

    router.get('/wagateway/devices', (req, res) => {
        const connectedDevices = [];
        
        // Scan folder for session files to find all registered devices
        const files = fs.readdirSync('./');
        const allDevices = files
            .filter(file => file.startsWith('session-') && file.endsWith('.json'))
            .map(file => file.replace('session-', '').replace('.json', ''));

        allDevices.forEach(device => {
            const conn = sessions.get(device);
            const isConnected = conn && conn.user; // Check if socket exists and user is defined (logged in)
            
            connectedDevices.push({
                device_id: device,
                status: isConnected ? 'connected' : 'disconnected',
                phone: isConnected ? conn.user.id.split(':')[0] : null,
                name: isConnected ? conn.user.name : null
            });
        });

        res.json({
            status: true,
            data: connectedDevices
        });
    });

    router.post('/wagateway/delete-device', [
        body('device_id', 'Wrong Parameters!').notEmpty(),
    ], async (req, res) => {
        const { device_id } = req.body;
        
        // Check if device exists in memory
        const conn = sessions.get(device_id);
        
        if (conn) {
             try {
                // Logout from WA
                if (conn.user) { // Only logout if connected
                    await conn.logout();
                } else {
                    conn.end(undefined); // Close connection if not logged in
                }
                sessions.delete(device_id);
             } catch (error) {
                 console.log('Error logout device', error)
             }
        }
        
        // Delete session file
        const sessionFile = `./session-${device_id}.json`;
        if (fs.existsSync(sessionFile)) {
            fs.rmSync(sessionFile, { recursive: true, force: true });
            res.json({ status: true, msg: `Device ${device_id} deleted successfully` });
        } else {
            // Check if it was just in memory but no file (edge case)
            if (conn) {
                res.json({ status: true, msg: `Device ${device_id} deleted from memory` });
            } else {
                res.status(404).json({ status: false, msg: `Device ${device_id} not found` });
            }
        }

    });

}
