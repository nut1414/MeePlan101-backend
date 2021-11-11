const jwt = require('jsonwebtoken')

module.exports = (socket,next) =>{
  console.log(socket.handshake.query)
  if(socket.handshake.query.token){
    jwt.verify(socket.handshake.query.token,process.env.SECRET, (err,decoded)=>{
      if(err) {
        return next(new Error('Auth Error'))
        }
        socket.decoded = decoded
        next()
        
    })
  }else{
    next(new Error('Auth Error'))
  }
  
}