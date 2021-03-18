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
app.post('/saveUser', (req, res) => {
    const { login, password, sex } = req.body
    const model = new ChatModel({
        login, password, sex, active: true, date: new Date()
    })
    model.save(err => {
        if (err) {
            console.log(err)
        }
        else {
            const { login, sex, friends, conversations, waitingFriends, groups } = model
            res.send({
                login,
                sex,
                friends,
                conversations,
                waitingFriends,
                groups
            })
        }
    })
})

app.post('/signIn', async (req, res) => {
    const { login, password } = req.body
    const user = await ChatModel.findOne({ login, password })
    if (user) {
        const { login, sex, friends, conversations, waitingFriends, groups } = user
        res.send({
            login,
            sex,
            friends,
            conversations,
            waitingFriends,
            groups
        })
    }
    else {
        res.send('null')
    }
})

app.post('/inviteFriend', async (req, res) => {
    const { from, to } = req.body
    await ChatModel.findOneAndUpdate({ login: to }, { "$push": { waitingFriends: { name: from, date: new Date() } } })
})

app.post('/confirmFriend', async (req, res) => {
    const { waiter, decision, recipient } = req.body
    if (decision === 'accept') {
        const waiterPerson = await ChatModel.findOne({ login: waiter })
        const recipientPerson = await ChatModel.findOne({ login: recipient })
        await ChatModel
        .findOneAndUpdate({ login: recipient }, { "$push": { friends: { name: waiter, date: new Date(), sex: waiterPerson.sex } } })
        .findOneAndUpdate({ login: waiter }, { "$push": { friends: { name: recipient, date: new Date(), sex: recipientPerson.sex } } })
    }
    await ChatModel.findOneAndUpdate({ login: recipient }, { "$pull": { waitingFriends: { name: waiter } } }, {multi: true}); 
})


io.on('connection', socket => {
    socket.on('add user to listeners', login => {
        users.push({ id: socket.id, login })
    })
    socket.on('send private message', ({name, to, mess}) => {
        const recipientId = users.find(user => user.login === to).id
        socket.to(recipientId).emit('private message', {from: name, mess})
    })    
})
  


mongoose.connect("mongodb://localhost:27017/chatDB", {
    useUnifiedTopology: true,
    useNewUrlParser: true, 
    useFindAndModify: false 
});

server.listen(1000)