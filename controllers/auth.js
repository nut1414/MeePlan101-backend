const db = require("../models");
const User = db.user;
const process = require("process");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.signup = (req, res) => {
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8)
  })
  user.save((err, user) => {
    if (err) {
      res.status(500).send({status: "error" ,message: err });
      return
    }
    res.send({status: "ok" ,message: "User was registered successfully!" }); 
  })
}

exports.signin = (req, res) => {
  User.findOne({
    username: req.body.username
  }).exec((err, user) => {
      if (err) {
        res.status(500).send({status: "error", message: err });
        return
      }
      
      if (!user) {
        return res.status(404).send({status: "error",  message: "User Not found." })
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      )

      if (!passwordIsValid) {
        return res.status(401).send({
          status: "error",
          message: "Invalid Password!"
        })
      }

      var token = jwt.sign({ id: user.id }, process.env.SECRET, {
        expiresIn: 86400 // 24 hours
      })

      res.status(200).send({
        id: user._id,
        username: user.username,
        email: user.email,
        accessToken: token,
        message: "Successfully!"

      })
    })
}

exports.verify = (req, res) => {
    jwt.verify(req.body.token,process.env.SECRET,(err,user)=>{
      if(err){
        res.status(401).send({
          status: "error",
          message: "Invalid Token!"
        })
      }else{
        res.status(200).send({status: "ok",
          message: "Token is valid."})
      }
    })
}