const express = require('express')
const app = express()
const server = require('http').createServer(app)
const cors = require('cors')
const mongoose = require('mongoose');
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:1000",
        methods: ["GET", "POST"]
    }
})
const ChatModel = require('./models/ChatModel')
const messages = []
const users = []

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())
// app.post('/saveUser', (req, res) => {
//     console.log(req.body)
//     const { login, password, sex } = req.body
//     const model = new ChatModel({
//         login, password, sex, active: true, date: new Date()
//     })
//     model.save(err => {
//         if (err) {
//             console.log(err)
//         }
//         else {
//             res.send(model)  
//         }
//     })
// })


io.on('connection', socket => {
    socket.on('setuser', ({ id }) => { 
        users
    })
    socket.on('test', ({ name }) => {
        messages.push(name)
        io.emit('test', messages)
    })
})



mongoose.connect("mongodb://localhost:27017/chatDB", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
});

server.listen(1000) 