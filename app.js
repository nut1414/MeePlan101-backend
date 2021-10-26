const app = require('express');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.on('connection', (socket) => {

    console.log('Connected');
    console.log(socket.id);
    console.log("JWT token: ", socket.handshake.headers)
    socket.on('time', (data) => {
        console.log("Time from Client :", data);
    })

    socket.on('disconnect', () => {
        console.log('Disconnected');
    })

})

http.listen(8080, () => {

    console.log("Server launched on port 8080");
})