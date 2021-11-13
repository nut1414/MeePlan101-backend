const db = require("../models")

module.exports = (data,next) =>{
    if(data["date"]){
       data["date"] = Date(data["date"])
    }
    next()
};