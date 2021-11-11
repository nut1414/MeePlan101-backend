const { randomInt } = require('crypto');
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
const db = require("./models/index");
db.mongoose
  .connect('mongodb+srv://' + process.env.MONGO_USER + ':' + process.env.MONGO_PW + '@node-cluster.gpjph.mongodb.net/MeePlan?retryWrites=true&w=majority')
  .then(() => {
    console.log("Successfully connect to MongoDB.");
 
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit();
  });
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

function getPage(page){
    const filePath = path.join(__dirname, page)
    return fs.readFileSync(filePath)
}







io.on('connection', (socket) => {
  console.log('Connected');
  console.log(socket.id);
  console.log("JWT token: ", socket.handshake.headers)
  socket.on('time', (data) => {
    console.log("Time from Client :", data);
  })
  socket.on('task', () => {
    let buffer = { s: 4, data: [["TEST1", `${randomInt(100000)}`, "No Due", `${randomInt(5)}`, `${randomInt(1)}`], ["TEST2", `${randomInt(100000)}`, "No Due", `${randomInt(5)}`, `${randomInt(1)}`], ["TEST3", `${randomInt(100000)}`, "No Due", `${randomInt(5)}`, `${randomInt(1)}`], ["TEST4", `${randomInt(100000)}`, "No Due", `${randomInt(5)}`, `${randomInt(1)}`]] }
    socket.emit("update", buffer);
    console.log(buffer);
  })

  socket.on('disconnect', () => {
    console.log('Disconnected');
  })

})

app.get('/', (req, res) => {
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
  res.end()
})





http.listen(8080, () => {
  console.log("Server launched on port 8080");
})

