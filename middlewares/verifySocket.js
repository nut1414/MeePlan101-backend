const jwt = require('jsonwebtoken')

module.exports = (socket,next) =>{
  if(socket.handshake.query.token){
    jwt.verify(socket.handshake.query.token,process.env.SECRET, (err,decoded)=>{
      if(err) {
        return next(new Error('Auth Error'))
        }
        socket.decoded = decoded

        next()
        
    })
  }else if (socket.handshake.headers == "arduino-WebSocket-Client"){
    next()
  }
  else{
    next(new Error('Auth Error'))
  }
  
}