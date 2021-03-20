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
const CommunityModel = require('./models/CommunityModel')
const messages = []
let users = []
const groups = []

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
        res.send({message: 'Invalid login or password'})
    }
})

app.post('/inviteFriend', async (req) => {
    const { from, to } = req.body
    await ChatModel.findOneAndUpdate({ login: to }, { "$push": { waitingFriends: { name: from, date: new Date() } } })
})

app.post('/confirmFriend', async (req) => {
    const { waiter, decision, recipient } = req.body
    if (decision === 'accept') {
        const waiterPerson = await ChatModel.findOne({ login: waiter })
        const recipientPerson = await ChatModel.findOne({ login: recipient })
        await ChatModel
            .findOneAndUpdate({ login: recipient }, { "$push": { friends: { name: waiter, date: new Date(), sex: waiterPerson.sex } } })
            .findOneAndUpdate({ login: waiter }, { "$push": { friends: { name: recipient, date: new Date(), sex: recipientPerson.sex } } })
    }
    await ChatModel.findOneAndUpdate({ login: recipient }, { "$pull": { waitingFriends: { name: waiter } } }, { multi: true });
})


io.on('connection', socket => {
    let client = {}

    const community = await CommunityModel.find({})
    for(group in community.groups){
        groups.push(group)
    }

    socket.on('add user to listeners', login => {
        users.push({ id: socket.id, login })
        client = { id: socket.id, login }
    })

    socket.on('create group', async(groupName, login) => {
        const groupObj = {
            name: groupName,
            members: 1,
        }

        await ChatModel.findOneAndUpdate({login}, {
            "$push": {
                ...groupObj,
                dialogues: []
            }
        })

        await CommunityModel.updateOne({
            "$push": {
                groups: groupObj
            }
        })

        groups.push(groupObj)
        socket.join()
    })

    socket.on('join to group', (login, groupId))

    socket.on('send private message', async ({ name, to, mess }) => {
        const recipient = users.find(user => user.login === to)
        if (recipient.id) { 
            socket.to(recipient.id).emit('private message', { from: name, mess })
        }
        const friends = [name, to] 
        for (const number in friends) {
            let senderLogin = name
            let recipientLogin = to

            if(number == 1){
                senderLogin = to, 
                recipientLogin = name 
            }

            const sender = await ChatModel.findOne({ login: senderLogin })
            const recipientIndex = sender.conversations.findIndex(el => el.login === recipientLogin)

            if (recipientIndex !== -1) {
                await ChatModel.findOneAndUpdate({ login: senderLogin, "conversations.login": recipientLogin }, {
                    "$push": {
                        "conversations.$.dialogues": {
                            date: new Date(),
                            text: mess
                        }
                    }
                })
            }
            else {
                await ChatModel.findOneAndUpdate({ login: senderLogin }, {
                    "$push": {
                        conversations:
                        {
                            login: recipientLogin,
                            dialogues:
                            {
                                date: new Date(),
                                text: mess
                            }
                        }
                    } 
                })
            }
        }
    })

    socket.on('disconnect', () => {
        users = users.filter(user => user.login !== client.login)
    })
})



mongoose.connect("mongodb://localhost:27017/chatDB", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
});

server.listen(1000)