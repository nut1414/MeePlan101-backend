const jwt = require('jsonwebtoken')

module.exports = (socket,next) =>{
  if(socket.handshake.query && socket.handshake.query.token){
    jwt.verify(socket.handshake.query.token,process.env.SECRET, (err,decoded)=>{
      if(err) {
        return next(new Error('Auth error'))
        socket.decoded = decoded
        next()
        }
    })
  }else{
    next(new Error('Auth error'));
  }
  
}