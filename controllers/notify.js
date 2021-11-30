const db = require("../models");
const User = db.user;
const process = require("process");
const axios = require("axios");
const qs = require('qs')

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


exports.verify = (req,res) => {
  const userToken = req.body.state
  const userCode = req.body.code
  jwt.verify(userToken,process.env.SECRET,(err,user)=>{
        if(err) {
        res.status(500).send({status: "error" ,message: err })
        }
        const url = 'https://notify-bot.line.me/oauth/token'
        const jsonData = {
          grant_type: 'authorization_code',
          code: userCode,
          redirect_uri: 'https://me.pannanap.pw/notify',
          client_id: process.env.LINE_CLIENTID,
          client_secret: process.env.LINE_CLIENTSECRET,
        }
        const requestOption = {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          data: qs.stringify(jsonData),
          url
        }
        console.log(userToken)
        console.log(userCode)
        
        axios(requestOption).then(async (lineRes) =>{
          if(lineRes.status === 200){
              const accessToken = lineRes.data.access_token
              const tokenData = {line_token:accessToken}
              console.log(tokenData)
              
              User.findById(user.id,(err,doc)=>{
                if(doc.line_token){
                    const url = 'https://notify-api.line.me/api/revoke'
                    const requestOption = {
                      method: 'POST',
                      headers: { 'content-type': 'application/x-www-form-urlencoded',
                      Authorization: 'Bearer ' + doc.line_token },
                      url
                    }
                    axios(requestOption).then(async (lineRes) =>{
                    
                    }).catch((err) => {
                      
                    })
                }

              })


              let newTokenAdd = await User.findOneAndUpdate({_id:user.id},{$set:tokenData})

              if (newTokenAdd){
                console.log('added token')
                res.status(200).send({status: "ok" ,message: "Token verified!" })
              
              
              
              }else{
                res.status(404).send({status: "error" ,message: "Not Found" })
              }
              
            
            }else{
              console.log('Error Request to Line')
              res.status(400).send({status: "error" ,message: "Bad Request" })
            }
        }).catch((err) => {
          //console.log(err)
          console.log("Line token err")
          res.status(500).send({status: "error" ,message: "Internal Error" })
        })
      })

}
  


exports.revoke = (req,res) =>{
  const userToken = req.body.token
  jwt.verify(userToken,process.env.SECRET,(err,user)=>{

    User.findById(user.id,(err,doc)=>{
     if(doc.line_token){
        const url = 'https://notify-api.line.me/api/revoke'
        const requestOption = {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded',
          Authorization: 'Bearer ' + doc.line_token },
          url
        }
        axios(requestOption).then(async (lineRes) =>{
          if(lineRes.status === 200){
            const tokenData = {line_token:""}
            let newTokenAdd = await User.findOneAndUpdate({_id:user.id},{$set:tokenData})
            if (newTokenAdd){
                res.status(200).send({status: "ok" ,message: "Token revoked!!" })
              }else{
                res.status(500).send({status: "error" ,message: "Internal Error" })
              }
          }else{
            res.status(200).send({status: "ok" ,message: "No token to remove." })
          }
        }).catch((err) => {
          console.log(err)
          res.status(500).send({status: "error" ,message: "Internal Error" })
        })
     }else{
        res.status(400).send({status: "error" ,message: "Bad Request" })
     }

    })
  })
}