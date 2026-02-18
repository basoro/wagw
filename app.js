const { startCon, init } = require('./connection')
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const router = express.Router();
const { Server } = require('socket.io');
const io = new Server(server);
const fs = require('fs');
const marked = require('marked');

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 1000000 }))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/logs-view', (req, res) => {
  res.sendFile(__dirname + '/logs.html');
});

app.get('/docs', (req, res) => {
    fs.readFile('./README.md', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading documentation');
        }
        const htmlContent = marked.parse(data);
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>WAGW Documentation</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
                    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
                    code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 85%; background: rgba(27,31,35,0.05); padding: 0.2em 0.4em; border-radius: 3px; }
                    pre code { background: transparent; padding: 0; }
                    h1, h2, h3 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
                    blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; padding-left: 1em; margin-left: 0; }
                    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
                    th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
                    th { background-color: #f6f8fa; }
                    tr:nth-child(2n) { background-color: #f6f8fa; }
                    a { color: #0366d6; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `);
    });
});

app.use(router);
require('./routes')(router)

io.on('connection', (socket) => {
    socket.on('StartConnection', async (device) => {
        startCon(device, socket)
        return;
    })
    socket.on('LogoutDevice', (device) => {
        startCon(device, socket, true)
        return
    })
})
fs.readFile('./port.pl', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  } else {
    var port = data.split('\n').shift();
    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
        init();
    })
  }
});
