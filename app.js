const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http').createServer(app);
const cors = require('cors');
const io = require('socket.io')(http, {
  cors: {
    origin: true, credentials: true
  }
});
const process = require('process')
const path = require('path')
const fs = require('fs')
const utils = require('./utils')
const db = require("./models");
const Agenda = require('agenda');
const axios = require('axios')
const qs = require('qs')
process.env.TZ = 'Asia/Bangkok'

const corsOptions = {
  credentials: true, origin: true
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.static('public'))

const authJwt = require('./middlewares/verifyToken')
const verifySignUp = require('./middlewares/checkDuplicate')


const agenda = new Agenda({
  db: { address: 'mongodb+srv://' + process.env.MONGO_USER + ':' + process.env.MONGO_PW + '@node-cluster.gpjph.mongodb.net/MeePlan?retryWrites=true&w=majority', collection: "alarm" }
}, (err) => {
  if (err) {
    console.log(err);
    throw err;
  }
  agenda.cancel({ nextRunAt: null }, (err, numRemoved) => {
    console.log(err)
    console.log(numRemoved)
  })
})

agenda.define("alarm", async (job) => {
  const { userID, name, date, description, alarmID } = job.attrs.data
  console.log(`run alarm ${alarmID}`)
  
  try {
    db.user.findById(userID, (err, doc) => {
      if (err) {
        console.log(err)
        return;
      }
      //agenda.cancel({"data.alarmID": new db.mongoose.Types.ObjectId(data.alarm_id)})
      io.to(String(userID)).emit("alarm", { name, description, date:date.toLocaleString('en-GB') })
      const url = 'https://notify-api.line.me/api/notify'
      let message = 'Alarm❗- ' + name + '\n' + description
      const jsonData = {
        message
      }
      const requestOption = {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          Authorization: 'Bearer ' + doc.line_token
        },
        url,
        data: qs.stringify(jsonData)
      }
      axios(requestOption).then(async (lineRes) => {
        if (lineRes.status == 200){
          console.log('successfully sent line notification')
        }else if (lineRes.status == 401){
          console.log('invalid access token')
          console.log('resetting token')
          doc.line_token = ''
          doc.save()
        }else{
          console.log('unable to send notification')
        }
      }).catch((err) => {
          console.log(err)
        })
      doc.alarms = doc.alarms.filter(id => id !== alarmID)
      console.log('alarm deleted')
      doc.save();
      io.to(String(userID)).emit("update_alarm", {})
    })
  } catch (err) {
    console.log(err)
  }
})

agenda.start()



require('./routes/auth')(app);
require('./routes/notify')(app);
//require('./app/routes/user.routes')(app);
const verifySocket = require('./middlewares/verifySocket')
const joinRoom = require('./middlewares/joinRoom')
//const taskHandler = require('./middlewares/taskHandler')
/*
function getPage(page){
    const filePath = path.join(__dirname, page)
    return fs.readFileSync(filePath)
}
*/


io.use(verifySocket);


io.on('connection', (socket) => {
  console.log('Connected')
  console.log(socket.decoded)
  console.log(socket.decoded.id)

  socket.join(socket.decoded.id);
  console.log(socket.rooms);
  console.log(socket.id)
  socket.emit("update", {})
  socket.emit("update_setting", {})
  //console.log("JWT token: ", socket.handshake.headers)
  socket.on('create', (data) => {
    try {
      db.user.findById(socket.decoded.id, (err, doc) => {
        if (err) {
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
      io.to(socket.decoded.id).emit("update", {})
    } catch (err) {
      console.log(err)
    }

  })

  socket.on('delete', (data) => {
    try {
      db.user.findById(socket.decoded.id, (err, doc) => {
        if (err) {
          console.log(err)
          return;
        }
        doc.tasks.pull({ _id: data.id })
        console.log('task delete')
        doc.save()
        io.to(socket.decoded.id).emit("update", {})
      })
    } catch (err) {
      console.log(err)
    }

  })

  socket.on('edit', (data) => {
    try {
      db.user.findById(socket.decoded.id, (err, docs) => {
        if (err) {
          console.log(err)
        }
        for (let i = 0; i < docs.tasks.length; i++) {
          if (docs.tasks[i]._id == data._id) {
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
    } catch (err) {
      console.log(err)
    }

  })


  //range lower bound, upperbound
  //wait a minute
  //list for web
  //input lower bound date, upper bound date
  //output all date in range lower-upper, count of task in range
  socket.on('list', (data) => {
    try {
      db.user.aggregate([
        { $match: { "_id": db.mongoose.Types.ObjectId(socket.decoded.id) } },
        { $unwind: "$tasks" },
        {
          $match: {
            "tasks.date": {
              $gte: new Date(data.lwr),
              $lte: new Date(data.upr)
            }
          }
        },
        { $project: { "_id": "$tasks._id", "name": "$tasks.name", "description": "$tasks.description", "level": "$tasks.level", "done": "$tasks.done", "date": "$tasks.date" } },
        { $sort: { status: 1, date: 1 } }
      ]).exec((err, result) => {
        if (err) {
          console.log(err)
          return
        }
        let returnData = {
          tag: data.tag,
          result
        }

        console.log(returnData)
        //placeholder will replace with emit or acknowledgement
        socket.emit("list", returnData)
      })

    } catch (err) {
      console.log(err)
    }

  })


  socket.on('pgstatus_iot', (data) => {
    //db.user.findOne({devices: {"$in": [ data.iot_id ]  }},(err,doc)=>{
    //  console.log(doc);
    //})
    try {
      db.user.aggregate([
        { $match: { "_id": db.mongoose.Types.ObjectId(socket.decoded.id) } },
        { $unwind: "$tasks" },
        { $match: { "tasks.date": { $gte: new Date() } } },
        { $project: { "_id": "$tasks._id", "name": "$tasks.name", "description": "$tasks.description", "level": "$tasks.level", "done": "$tasks.done", "date": "$tasks.date" } },
      ]).exec((err, docs) => {

        if (err) {
          console.log(err)
          return
        }
        result = {
          pgcount: Math.ceil(docs.length / 4),
          count: docs.length,
          donecount: docs.filter((task) => task.done).length
        }
        console.log(result)
        socket.emit("pgstatus_iot", result)
      })
    } catch (err) {

    }

  })
  //list for iot
  //input page number
  //output all task in that page number, page number count
  socket.on('list_iot', (data) => {
    try {
      db.user.aggregate([
        { $match: { "devices": { "$in": [socket.handshake.headers["authorization"]] } } },
        { $unwind: "$tasks" },
        { $match: { "tasks.date": { $gte: new Date() } } },
        { $project: { "_id": "$tasks._id", "level": "$tasks.level", "done": "$tasks.done", "date": "$tasks.date", "name": "$tasks.name", "description": "$tasks.description" } },
        { $sort: { status: -1, date: 1 } }
      ]).exec((err, docs) => {
        console.log(docs)
        if (err) {
          console.log(err)
          return
        }
        try {
          let pg = Number(data.pg)
          let pgcount = Math.ceil(docs.length / 4)
          if (pg > pgcount) {
            pg = pgcount
          } else if (pg < 1) {
            pg = 1
          }
          let resultdata = docs.slice((4 * (pg - 1)), (4 * pg))
          resultdata.forEach((element) => {
            element.date = element.date.toLocaleDateString('en-GB')
            element.name2 = element.description.slice(0, 20)
            element.name = element.name.slice(0, 20)
          })
          let processed = []
          for (let task of resultdata) {
            processed.push(Object.values(task))
          }
          console.log(processed)
          socket.emit("list_iot", { s: processed.length, pg, pgcount, "data": processed })
        } catch (err) {
          console.log(err)
        }



      })
    } catch (err) {
      console.log(err)
    }

  })
  socket.on('edit_iot', (data) => {
    try {
      db.user.findById(socket.decoded.id, (err, docs) => {
        if (err) {
          console.log(err)
          return
        }
        console.log(docs)
        for (let i = 0; i < docs.tasks.length; i++) {
          if (docs.tasks[i]._id == data.id) {
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
    } catch (err) {
      console.log(err)
    }



  })

  socket.on('list_iot_id', (data) => {
    try {
      db.user.findById(socket.decoded.id, (err, doc) => {
        if (err) {
          console.log(err)
          return
        }
        //placeholder will replace with emit or acknowledgement
        result = doc.devices;
        socket.emit("list_iot_id", { iot_id: result })
      })
    } catch (err) {
      console.log(err)
    }

  })
  socket.on('add_iot_id', (data) => {
    try {
      db.user.findById(socket.decoded.id, (err, doc) => {
        if (err) {
          console.log(err)
          return
        }
        if (data.iot_id) {
          doc.devices.push(data.iot_id.toUpperCase())
          doc.save()
          console.log('new device saved')
        }
        io.to(socket.decoded.id).emit("update_setting", {})
      })
    } catch (err) {
      console.log(err)
    }


  })

  socket.on('delete_iot_id', (data) => {
    try {
      db.user.findById(socket.decoded.id, (err, doc) => {
        if (err) {
          console.log(err)
          return
        }
        doc.devices = doc.devices.filter(id => id !== data.iot_id)
        console.log('device deleted')
        doc.save();
        io.to(socket.decoded.id).emit("update_setting", {})
      })
    } catch (err) {
      console.log(err)
    }

  })

  socket.on('create_alarm', async (data) => {
    try {
      db.user.findById(socket.decoded.id, async (err, doc) => {
        if (err) {
          console.log(err)
          return
        }
        let newAlarmID = new db.mongoose.Types.ObjectId()
        if (!data.name) data.name = ""
        if (!data.description) data.description = ""
        await agenda.schedule(new Date(data.date), "alarm", {
          userID: new db.mongoose.Types.ObjectId(socket.decoded.id),
          name: data.name,
          date: new Date(data.date),
          description: data.description,
          alarmID: newAlarmID
        })
        doc.alarms.push(newAlarmID)
        doc.save()
        console.log('new alarm saved')

      })

      io.to(socket.decoded.id).emit("update_alarm", {})
    } catch (err) {
      console.log(err)
    }

  })

  socket.on('delete_alarm', (data) => {
    try {
      db.user.findById(socket.decoded.id, (err, doc) => {
        if (err) {
          console.log(err)
          return;
        }
        agenda.cancel({ "data.alarmID": new db.mongoose.Types.ObjectId(data.alarm_id) })
        doc.alarms = doc.alarms.filter(id => id !== data.alarm_id)
        console.log('alarm deleted')
        doc.save();
        io.to(socket.decoded.id).emit("update_alarm", {})
      })
    } catch (err) {
      console.log(err)
    }

  })

  socket.on('list_alarm', async (data) => {
    try {
      let allJobs = await agenda.jobs({ 'data.userID': new db.mongoose.Types.ObjectId(socket.decoded.id) })
      let result = []
      for (let job of allJobs) {
        let { name, date, description, alarmID } = job.attrs.data
        result.push({ name, date, description, alarmID })
      }
      socket.emit("list_alarm", result)

    } catch (err) {
      console.log(err)
    }

  })

  socket.on('test_alarm', async (data) => {
    try {
      io.to(socket.decoded.id).emit("alarm", { name: "test", description: "test description", date: new Date() })
      db.user.findById(socket.decoded.id, (err, doc) => {
        const url = 'https://notify-api.line.me/api/notify'
        const jsonData = {
          message: 'Test Message!'
        }
        const requestOption = {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer ' + doc.line_token
          },
          url,
          data: qs.stringify(jsonData)
        }
        axios(requestOption).then(async (lineRes) => {
          if (lineRes.status == 200){
            console.log('successfully sent line notification')
          }else if (lineRes.status == 401){
            console.log('invalid access token')
            console.log('resetting token')
            doc.line_token = ''
            doc.save()
          }else{
            console.log('unable to send notification')
          }
        }).catch((err) => {
            console.log(err)
          })
      })
    } catch (err) {
      console.log(err)
    }
  })


  socket.on('time', (data) => {
    console.log("Time from Client :", data)
  })
  socket.on('task', () => {
    
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

