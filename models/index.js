const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.user = require("./User");
db.task = require("./Task");

db.mongoose
  .connect('mongodb+srv://' + process.env.MONGO_USER + ':' + process.env.MONGO_PW + '@node-cluster.gpjph.mongodb.net/MeePlan?retryWrites=true&w=majority')
  .then(() => {
    console.log("Successfully connect to MongoDB.");
 
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit();
  });

module.exports = db; 