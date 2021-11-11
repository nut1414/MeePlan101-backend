const mongoose = require('mongoose');
var Task = require('./Task');

var UserModel = mongoose.model("User",new mongoose.Schema({
  username: String,
  email: String,
  tasks: [Task],
  password: String, //for password
}, {timestamps: true}));

module.exports = UserModel;