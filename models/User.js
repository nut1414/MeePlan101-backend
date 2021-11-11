const mongoose = require('mongoose');
var Task = require('./Task');

var UserModel = mongoose.model("User",new mongoose.Schema({
  username: String,
  email: String,
  tasks: [Task],
  password: String, //for password
}, {timestamps: true,strictPopulate:false}),"users");

module.exports = UserModel;