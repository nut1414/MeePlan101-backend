const jwt = require('jsonwebtoken')
const db = require("../models");



verifySocket = async (socket,next) =>{
  if(socket.handshake.query.token){
    jwt.verify(socket.handshake.query.token,process.env.SECRET, (err,decoded)=>{
      if(err) {
        return next(new Error('Auth Error'))
        }
        socket.decoded = decoded

        next()
        
    })
  }else if (socket.handshake.headers["user-agent"] == 'arduino-WebSocket-Client'){
    try{
      let user = await db.user.aggregate([
      {$match:{"devices":{"$in": [ socket.handshake.headers["authorization"] ]  }}},
      {$limit:1}
      ])
      socket.decoded = {id:String(user[0]._id)}
      console.log(user)
    }catch(err){
      console.log(err)
      return next(new Error('Auth Error'))
    } 
       
    
    next()
  }
  else{
    next(new Error('Auth Error'))
  }
  
}

module.exports = verifySocket