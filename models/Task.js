const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  description: { type: String, default: "" },
  level: { type: Number, default: 0 },
  done: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

module.exports = TaskSchema;
