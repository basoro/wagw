const { startCon } = require('./connection')
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const router = express.Router();
const { Server } = require('socket.io');
const io = new Server(server);
const fs = require('fs');
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 1000000 }))
app.use(router);
require('./routes')(router)

io.on('connection', (socket) => {
    socket.on('StartConnection', async (device) => {
        startCon(device, socket)
        fs.writeFile('./number.txt', device, err => {
          if (err) {
            console.error(err);
          }
        });
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
    })
  }
});
