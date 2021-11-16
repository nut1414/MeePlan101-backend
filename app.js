const { randomInt, } = require('crypto');
const express = require('express');
const app = express();
const { Socket } = require('socket.io');
const bodyParser = require("body-parser");
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const cors = require('cors');
const process = require('process')
const path = require('path')
const fs = require('fs')
const utils = require('./utils')
const db = require("./models");


const corsOptions = {
  origin: "http://localhost:8080"
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.static('public'))

const authJwt = require('./middlewares/verifyToken')
const verifySignUp = require('./middlewares/checkDuplicate')


require('./routes/auth')(app);
//require('./app/routes/user.routes')(app);
const verifySocket = require('./middlewares/verifySocket')
const joinRoom = require('./middlewares/joinRoom')
const taskHandler = require('./middlewares/taskHandler')
/*
function getPage(page){
    const filePath = path.join(__dirname, page)
    return fs.readFileSync(filePath)
}
*/


io.use(verifySocket)


io.on('connection', (socket) => {
  console.log('Connected')
  console.log(socket.decoded)
  console.log(socket.decoded.id)
  
  socket.join(socket.decoded.id);
  console.log(socket.rooms);
  console.log(socket.id)
  socket.emit("update",{})
  //console.log("JWT token: ", socket.handshake.headers)
  socket.on('create',(data)=>{
    try{
      db.user.findById(socket.decoded.id,(err,doc)=>{
      if(err){
        console.log(err)
        return
      }
      let newTask = {
        name: data.name,
        description: data.description,
        level: data.level,
        done: false,
        date: new Date(data.date)
      }
      doc.tasks.push(newTask);
      doc.save()
      console.log('new task saved')
      
      })
      io.to(socket.decoded.id).emit("update",{})
    }catch(err){
      console.log(err)
    }
    
  })
  
  socket.on('delete',(data)=>{
    try{
      db.user.findById(socket.decoded.id,(err,doc)=>{
      if(err){
        console.log(err)
        return;
      }
      doc.tasks.pull({ _id: data.id })
      

      console.log('task delete')
      doc.save()
      io.to(socket.decoded.id).emit("update",{})
    })
    }catch(err){

    }
    
  })

  socket.on('edit',(data)=>{
    try{
      db.user.findById(socket.decoded.id,(err,docs)=>{
      if(err){
        console.log(err)
        return
      }
       for(let i = 0; i < docs.tasks.length;  i++){
         if(docs.tasks[i]._id==data.id){
            console.log(docs.tasks[i])
            let updateTask = {
               name: data.name,
               description: data.description,
               level: data.level,
               done: data.done,
               date: data.date,
               _id: docs.tasks[i]._id
             }
            docs.tasks.set(i, updateTask)
         }
       }
      console.log('task edited')
      docs.save();

      io.to(socket.decoded.id).emit("update")
    })
    }catch(err){
      console.log(err)
    }
    
  })


//range lower bound, upperbound
//wait a minute
//list for web
//input lower bound date, upper bound date
//output all date in range lower-upper, count of task in range
  socket.on('list',(data)=>{
    try{
      db.user.aggregate([
          {$match:{"_id": db.mongoose.Types.ObjectId(socket.decoded.id)}},
          {$unwind:"$tasks"},
          {$match:{"tasks.date":{$gte: new Date(data.lwr),
                                 $lte: new Date(data.upr)}
                  }},
          {$project:{"_id":"$tasks._id","name": "$tasks.name","description":"$tasks.description","level":"$tasks.level","done":"$tasks.done","date":"$tasks.date"}},
          {$sort:{status:1,date:1}}
          ]).exec((err,result) =>{
            if(err){
              console.log(err)
              return
            }
             //placeholder will replace with emit or acknowledgement
             socket.emit("list",result)
          })

    }catch (err){
      console.log(err)
    }
    
  })

  
  socket.on('pgstatus_iot',(data)=>{
    //db.user.findOne({devices: {"$in": [ data.iot_id ]  }},(err,doc)=>{
    //  console.log(doc);
    //})
    try{
      db.user.aggregate([
      {$match:{"_id": db.mongoose.Types.ObjectId(socket.decoded.id)}},
      {$unwind:"$tasks"},
      {$match:{"tasks.date":{$gte: new Date()}}},
      {$project:{"_id":"$tasks._id","name": "$tasks.name","description":"$tasks.description","level":"$tasks.level","done":"$tasks.done","date":"$tasks.date"}},
      ]).exec((err,docs)=> {
        
        if(err){
          console.log(err)
          return
        }
        result = {
          pgcount: Math.ceil(docs.length/4),
          count: docs.length,
          donecount: docs.filter((task)=>task.done).length
        }
        console.log(result)
        socket.emit("pgstatus_iot",result)
      })
    }catch(err){

    }
    
  })
  //list for iot
  //input page number
  //output all task in that page number, page number count
  socket.on('list_iot',(data)=>{
    try{
      db.user.aggregate([
      {$match:{"_id": db.mongoose.Types.ObjectId(socket.decoded.id)}},
      {$unwind:"$tasks"},
      {$match:{"tasks.date":{$gte: new Date()}}},
      {$project:{"_id":"$tasks._id","level":"$tasks.level","done":"$tasks.done","date":"$tasks.date","name": "$tasks.name"}},
      {$sort:{status:1,date:1}}
      ]).exec((err,docs)=> {
        console.log(docs)
        if(err){
          console.log(err)
          return
        }
        try{
          let pg = Number(data.pg)
          let pgcount = Math.ceil(docs.length / 4)
          if(pg > pgcount) {
            pg = pgcount
          }else if (pg < 1){
            pg = 1
          }
        let resultdata = docs.slice((4*(pg-1)), (4*pg))
        resultdata.forEach((element)=>{
          element.date = element.date.toLocaleDateString('en-GB')
          element.name2 = element.name.slice(21,42)
          element.name = element.name.slice(0,20)
        })
        let processed = []
        for(let task of resultdata){
          processed.push( Object.values(task))
        }
        console.log(processed)
        socket.emit("list_iot",{s: processed.length,pg,pgcount,"data":processed})
        }catch(err){
          console.log(err)
        }
          
        
        
      })
    }catch(err){
      console.log(err)
    }
    
  })
  socket.on('edit_iot',(data)=>{
    try{
      if(data.done)
     db.user.findById(socket.decoded.id,(err,docs)=>{
       if(err){
          console.log(err)
          return
        }
       console.log(docs)
       for(let i = 0; i < docs.tasks.length;  i++){
        if(docs.tasks[i]._id==data.id){
           console.log(docs.tasks[i])
           let updateTask = {
              name: docs.tasks[i].name,
              description: docs.tasks[i].description,
              level: docs.tasks[i].level,
              done: data.done,
              date: docs.tasks[i].date,
              _id: docs.tasks[i]._id
            }
           docs.tasks.set(i, updateTask)
           break
        }
      }
      console.log('iot task delete')
      docs.save();
      io.to(socket.decoded.id).emit("update")
     })
    }catch(err){
      console.log(err)
    }
     

    
  })

  socket.on('list_iot_id',(data)=>{
    try{
      db.user.findById(socket.decoded.id,(err,doc)=>{
      if(err){
        console.log(err)
        return
      }
      //placeholder will replace with emit or acknowledgement
      result =  doc.devices;
      socket.emit("list_iot_id",{data:result})
    })
    }catch(err){
      console.log(err)
    }
    
  })
  socket.on('add_iot_id',(data)=>{
    try{
      db.user.findById(socket.decoded.id,(err,doc)=>{
      if(err){
        console.log(err)
        return
      }
      if(data.iot_id) {
        doc.devices.push(data.iot_id)
      doc.save()
      console.log('new device saved')
      }
      io.to(socket.decoded.id).emit("update_setting",{})
    })
    }catch(err){
      console.log(err)
    }

    
  })
  
  socket.on('delete_iot_id',(data)=>{
    try{
      db.user.findById(socket.decoded.id,(err,doc)=>{
      if(err){
        console.log(err)
        return
      }
      doc.devices = doc.devices.filter(id => id !== data.iot_id)
      console.log('device deleted')
      doc.save();
      io.to(socket.decoded.id).emit("update_setting",{})
      })
    }catch(err){
      console.log(err)
    }
    
  })

  socket.on('time', (data) => {
    console.log("Time from Client :", data)
  })
  socket.on('task', () => {
    let buffer = { s: 4, data: [["TEST1", `${randomInt(100000)}`, "No Due", `${randomInt(5)}`, `${randomInt(1)}`], ["TEST2", `${randomInt(100000)}`, "No Due", `${randomInt(5)}`, `${randomInt(1)}`], ["TEST3", `${randomInt(100000)}`, "No Due", `${randomInt(5)}`, `${randomInt(1)}`], ["TEST4", `${randomInt(100000)}`, "No Due", `${randomInt(5)}`, `${randomInt(1)}`]] }
    socket.emit("update", buffer)
    console.log(buffer)
  })

  socket.on('disconnect', () => {
    console.log('Disconnected');
  })

})

app.get('/', (req, res) => {
  /*
  const fileType = path.extname(req.url)|| '.html';
    if(fileType === '.html'){
        if(req.url === '/'){
            res.write(getPage('index.html'))
            res.end()
        }
        else{
            res.write(getPage(`${req.url}.html`))
        }
    }
  res.end()*/
  res.status(200).send("Service is Online.")
})





http.listen(8080, () => {
  console.log("Server launched on port 8080");
})

