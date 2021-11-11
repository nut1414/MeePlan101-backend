const db = require("../models");
const User = db.user;

checkDuplicateUsernameOrEmail = (req, res, next) => {
  // Username
  console.log(req.body)
  User.findOne({
    username: req.body.username
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    if (user) {
      res.status(400).send({ message: "Failed! Username is already in use!" });
      return;
    }
    if(!req.body.email){
      res.status(500).send({message: "Require Email."})
      return;
    }
    // Email
    User.findOne({
      email: req.body.email
    }).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (user) {
        res.status(400).send({ message: "Failed! Email is already in use!" });
        return;
      }

      next();
    });
  });
};


module.exports = checkDuplicateUsernameOrEmail;
