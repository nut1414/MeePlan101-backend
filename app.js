const { randomInt } = require('crypto');
const app = require('express');
const { Socket } = require('socket.io');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.on('connection', (socket) => {

    console.log('Connected');
    console.log(socket.id);
    console.log("JWT token: ", socket.handshake.headers)
    socket.on('time', (data) => {
        console.log("Time from Client :", data);
    })
    socket.on('task', ()=>{
        let buffer = {s:4,data:[["TEST1",`${randomInt(100000)}`,"No Due",`${randomInt(5)}`,`${randomInt(1)}`],["TEST2",`${randomInt(100000)}`,"No Due",`${randomInt(5)}`,`${randomInt(1)}`],["TEST3",`${randomInt(100000)}`,"No Due",`${randomInt(5)}`,`${randomInt(1)}`],["TEST4",`${randomInt(100000)}`,"No Due",`${randomInt(5)}`,`${randomInt(1)}`]]}
        socket.emit("update", buffer);
        console.log(buffer);
    })
    
    socket.on('disconnect', () => {
        console.log('Disconnected');
    })

})




http.listen(8082, () => {

    console.log("Server launched on port 8082");
})