const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  name: String,
  description: String,
  level: Number,
  done: Boolean,
  date: Date
});

module.exports = TaskSchema;
