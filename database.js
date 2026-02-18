const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, 'wagw.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables();
    }
});

function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS message_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT,
        recipient TEXT,
        message TEXT,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating table message_logs: ' + err.message);
    });

    db.run(`CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating table api_keys: ' + err.message);
        else {
            // Check if there are any keys, if not create a default one
            db.get("SELECT count(*) as count FROM api_keys", [], (err, row) => {
                if (err) return console.error(err.message);
                if (row.count === 0) {
                    const defaultKey = 'wagw-secret-key'; // Default key for initial setup
                    createApiKey(defaultKey, 'Default API Key');
                    console.log(`Default API Key created: ${defaultKey}`);
                }
            });
        }
    });
}

function logMessage(sender, recipient, message, status) {
    const sql = `INSERT INTO message_logs (sender, recipient, message, status) VALUES (?, ?, ?, ?)`;
    db.run(sql, [sender, recipient, message, status], function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
    });
}

function getLogs(limit = 100, callback) {
    const sql = `SELECT * FROM message_logs ORDER BY timestamp DESC LIMIT ?`;
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            console.error(err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

function createApiKey(key, description) {
    const sql = `INSERT INTO api_keys (key, description) VALUES (?, ?)`;
    db.run(sql, [key, description], function(err) {
        if (err) return console.error(err.message);
        console.log(`API Key created: ${key}`);
    });
}

function validateApiKey(key) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM api_keys WHERE key = ?`;
        db.get(sql, [key], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

module.exports = { db, logMessage, getLogs, createApiKey, validateApiKey };
