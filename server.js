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
const { nanoid } = require('nanoid')
const ChatModel = require('./models/ChatModel')
const CommunityModel = require('./models/CommunityModel');

const messages = []
let users = []
const groups = []

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())
app.post('/saveUser', (req, res) => {
    const { login, password, sex } = req.body
    const model = new ChatModel({
        login,
        password,
        sex,
        active: true,
        date: new Date(),
        waitingFriends: [],
        waitingGroups: [],
        friends: [],
        groups: []
    })
    model.save(err => {
        if (err) {
            console.log(err)
        }
        else {
            const { login, sex, friends, conversations, waitingFriends, groups, waitingGroups } = model
            res.send({
                login,
                sex,
                friends,
                conversations,
                waitingFriends,
                waitingGroups,
                groups
            })
        }
    })
})

app.post('/signIn', async (req, res) => {
    const { login, password } = req.body
    const user = await ChatModel.findOne({ login, password })
    if (user) {
        const { login, sex, friends, conversations, waitingFriends, waitingGroups, groups } = user
        res.send({
            login,
            sex,
            friends,
            conversations,
            waitingFriends,
            waitingGroups,
            groups
        })
    }
    else {
        res.send({ message: 'Invalid login or password' })
    }
})

app.post('/inviteFriend', async (req, res) => {
    const { sender, recipient } = req.body.info
    const model = await ChatModel.findOneAndUpdate({ login: recipient }, {
        "$push": {
            waitingFriends: {
                sender,
                date: new Date()
            }
        }
    })
    res.send(true)
})

app.post('/inviteGroup', async (req) => {
    const { recipient, sender, groupName, groupId } = req.body
    await ChatModel.findOneAndUpdate({ login: recipient }, { "$push": { waitingGroups: { sender, name, groupId, date: new Date() } } })
})

app.post('/confirmFriend', async (req, res) => {
    const { waiter, decision, recipient } = req.body.info
    if (decision === 'accept') {
        const waiterPerson = await ChatModel.findOne({ login: waiter })
        const recipientPerson = await ChatModel.findOne({ login: recipient })
        await ChatModel.findOneAndUpdate({ login: recipient }, { "$push": { friends: { login: waiter, date: new Date(), sex: waiterPerson.sex } } })
        await ChatModel.findOneAndUpdate({ login: waiter }, { "$push": { friends: { login: recipient, date: new Date(), sex: recipientPerson.sex } } })
        res.send({ login: waiterPerson.login, sex: waiterPerson.sex, date: new Date() })
    }
    await ChatModel.findOneAndUpdate({ login: recipient }, { "$pull": { waitingFriends: { sender: waiter } } }, { multi: true });
})

app.post('/confirmGroup', async (req) => {
    console.log(req.body)
    // const { waiter, decision, recipient } = req.body
    // if (decision === 'accept') {
    //     const waiterPerson = await ChatModel.findOne({ login: waiter })
    //     const recipientPerson = await ChatModel.findOne({ login: recipient })
    //     await ChatModel
    //         .findOneAndUpdate({ login: recipient }, { "$push": { friends: { name: waiter, date: new Date(), sex: waiterPerson.sex } } })
    //         .findOneAndUpdate({ login: waiter }, { "$push": { friends: { name: recipient, date: new Date(), sex: recipientPerson.sex } } })
    // }
    // await ChatModel.findOneAndUpdate({ login: recipient }, { "$pull": { waitingFriends: { name: waiter } } }, { multi: true });
})

app.post('/createGroup', async (req, res) => {
    const { groupInfo: { groupName } } = req.body
    const groupId = nanoid()

    const model = await CommunityModel.findOneAndUpdate({}, {
        "$push": {
            groups: {
                name: groupName,
                groupId
            }
        }
    }, { new: true })

    groups.push({ groupName, groupId })
    res.send(model.groups[model.groups.length - 1])
})

app.post('/joinToGroup', async (req, res) => {
    const { group, group: {groupId}, login, sex } = req.body

    await ChatModel.findOneAndUpdate({ login }, {
        "$push": {
            groups: {
                ...group,
            }
        }
    }, { new: true })

    await ChatModel.updateMany({ 'groups.groupId': groupId }, {
        "$push": {
            'groups.$.members': {
                login,
                sex
            }
        }
    }, { new: true })

    const model = await ChatModel.findOne({login})

    res.send(model.groups[model.groups.length - 1])
})


io.on('connection', async (socket) => {
    let client = {}

    const community = await CommunityModel.find({})
    for (group in community.groups) {
        groups.push(group)
    }

    socket.on('add user to listeners', login => {
        users.push({ id: socket.id, login })
        client = { id: socket.id, login }
    })

    socket.on('join to group', async (login, groupId, name) => {
        socket.join(groupId)
    })

    socket.on('send private message', async ({ name, to, mess }) => {
        const recipient = users.find(user => user.login === to)
        if (recipient.id) {
            socket.to(recipient.id).emit('private message', { from: name, mess })
        }
        const friends = [name, to]
        for (const number in friends) {
            let senderLogin = name
            let recipientLogin = to

            if (number == 1) {
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