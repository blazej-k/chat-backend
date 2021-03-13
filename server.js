const app = require('express')()
const server = require('http').createServer(app)
const mongoose = require('mongoose');
const io = require('socket.io')(server, {cors: {
      origin: "http://localhost:1000",
      methods: ["GET", "POST"]
    }
})




io.on('connection', socket => {
    socket.on('test', ({name}) => {
        console.log('There is ', name)
    })
})


mongoose.connect("mongodb://localhost:27017/chatDB", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
});

server.listen(1000, () => console.log('work'))