
const { sendMessage, sendBulkMessage } = require('./message')
const { getLogs, validateApiKey } = require('./database')
const { sessions, startCon } = require('./connection')
const { enableAutoReply, disableAutoReply, isAutoReplyEnabled } = require('./auto-reply')
const { body, validationResult } = require('express-validator')
const fs = require('fs');

// Only allow safe device IDs: alphanumeric, hyphen, and underscore
const DEVICE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const validateDeviceId = body('device_id', 'Wrong Parameters!')
    .notEmpty()
    .matches(DEVICE_ID_PATTERN).withMessage('device_id contains invalid characters');

const deviceExists = (device_id) => {
    const conn = sessions.get(device_id);
    if (conn) return true;
    // Compare against directory listing to avoid constructing file paths from user input
    const expectedFilename = `session-${device_id}.json`;
    try {
        return fs.readdirSync(__dirname).includes(expectedFilename);
    } catch (_) {
        return false;
    }
};

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

    /**
     * @swagger
     * /wagateway/kirimpesan:
     *   post:
     *     summary: Send a text message
     *     tags: [Messages]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - sender
     *               - number
     *               - message
     *             properties:
     *               sender:
     *                 type: string
     *                 description: Device ID to send from
     *               number:
     *                 type: string
     *                 description: Recipient phone number (e.g., 628123456789)
     *               message:
     *                 type: string
     *                 description: Message content
     *     responses:
     *       200:
     *         description: Message sent successfully
     *       410:
     *         description: Failed to send message
     */
    router.post('/wagateway/kirimpesan', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('message', 'Wrong Parameters!').notEmpty()
    ], sendMessage)

    /**
     * @swagger
     * /wagateway/kirimgambar:
     *   post:
     *     summary: Send an image message
     *     tags: [Messages]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - sender
     *               - number
     *               - message
     *               - url
     *             properties:
     *               sender:
     *                 type: string
     *               number:
     *                 type: string
     *               message:
     *                 type: string
     *                 description: Image caption
     *               url:
     *                 type: string
     *                 description: Image URL
     *     responses:
     *       200:
     *         description: Image sent successfully
     */
    router.post('/wagateway/kirimgambar', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('message', 'Wrong Parameters!').notEmpty(),
        body('url', 'Wrong Parameters!').notEmpty(),
    ], sendMessage)

    /**
     * @swagger
     * /wagateway/kirimfile:
     *   post:
     *     summary: Send a document/file
     *     tags: [Messages]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - sender
     *               - number
     *               - url
     *             properties:
     *               sender:
     *                 type: string
     *               number:
     *                 type: string
     *               url:
     *                 type: string
     *                 description: File URL
     *     responses:
     *       200:
     *         description: File sent successfully
     */
    router.post('/wagateway/kirimfile', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('url', 'Wrong Parameters!').notEmpty(),
    ], sendMessage)

    /**
     * @swagger
     * /wagateway/blast:
     *   post:
     *     summary: Send bulk messages (Blast)
     *     tags: [Bulk]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - receiver
     *               - messages
     *             properties:
     *               receiver:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     number:
     *                       type: string
     *                       example: "6281234567890"
     *                     nama:
     *                       type: string
     *                       example: "Fatimah"
     *                     other_key:
     *                       type: string
     *                       description: "Any other key to be replaced in message"
     *               messages:
     *                 type: array
     *                 items:
     *                   type: string
     *                   example: "Halo {nama}, pesan ini untuk Anda."
     *               type:
     *                 type: string
     *                 enum: [text, image, document]
     *                 default: text
     *               url:
     *                 type: string
     *                 description: Required if type is image/document
     *     responses:
     *       200:
     *         description: Bulk process started
     */
    router.post('/wagateway/blast', [
        body('receiver', 'Wrong Parameters!').isArray(),
        body('messages', 'Wrong Parameters!').isArray(),
    ], sendBulkMessage)

    /**
     * @swagger
     * /wagateway/logs:
     *   get:
     *     summary: Get message logs
     *     tags: [Logs]
     *     security:
     *       - ApiKeyAuth: []
     *     responses:
     *       200:
     *         description: List of message logs
     */
    router.get('/wagateway/logs', (req, res) => {
        getLogs(100, (err, rows) => {
             if (err) {
                 res.status(500).json({ status: false, msg: err.message });
             } else {
                 res.json({ status: true, data: rows });
             }
        });
    });

    /**
     * @swagger
     * /wagateway/devices:
     *   get:
     *     summary: Get registered devices
     *     tags: [Devices]
     *     security:
     *       - ApiKeyAuth: []
     *     responses:
     *       200:
     *         description: List of devices and their status
     */
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
                name: isConnected ? conn.user.name : null,
                auto_reply: isAutoReplyEnabled(device)
            });
        });

        res.json({
            status: true,
            data: connectedDevices
        });
    });

    /**
     * @swagger
     * /wagateway/delete-device:
     *   post:
     *     summary: Delete a device
     *     tags: [Devices]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - device_id
     *             properties:
     *               device_id:
     *                 type: string
     *     responses:
     *       200:
     *         description: Device deleted successfully
     */
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

    /**
     * @swagger
     * /wagateway/auto-reply/enable:
     *   post:
     *     summary: Enable auto-reply for a specific device
     *     tags: [Auto Reply]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - device_id
     *             properties:
     *               device_id:
     *                 type: string
     *                 description: Device ID to enable auto-reply on
     *     responses:
     *       200:
     *         description: Auto-reply enabled
     *       404:
     *         description: Device not found
     */
    // All /wagateway/* routes are protected by router.use('/wagateway/*', authenticate) above.
    // authenticate is also listed explicitly here for consistency with the endpoint documentation.
    router.post('/wagateway/auto-reply/enable', [authenticate, validateDeviceId], (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ status: false, msg: errors.array()[0].msg });
        const { device_id } = req.body;
        if (!deviceExists(device_id)) {
            return res.status(404).json({ status: false, msg: `Device ${device_id} not found` });
        }
        enableAutoReply(device_id);
        res.json({ status: true, msg: `Auto reply enabled for device ${device_id}` });
    });

    /**
     * @swagger
     * /wagateway/auto-reply/disable:
     *   post:
     *     summary: Disable auto-reply for a specific device
     *     tags: [Auto Reply]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - device_id
     *             properties:
     *               device_id:
     *                 type: string
     *                 description: Device ID to disable auto-reply on
     *     responses:
     *       200:
     *         description: Auto-reply disabled
     *       404:
     *         description: Device not found
     */
    router.post('/wagateway/auto-reply/disable', [authenticate, validateDeviceId], (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ status: false, msg: errors.array()[0].msg });
        const { device_id } = req.body;
        if (!deviceExists(device_id)) {
            return res.status(404).json({ status: false, msg: `Device ${device_id} not found` });
        }
        disableAutoReply(device_id);
        res.json({ status: true, msg: `Auto reply disabled for device ${device_id}` });
    });

}
