const express = require('express')
const app = express()
const server = require('http').createServer(app)
const cors = require('cors')
const mongoose = require('mongoose');
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:1000",
        methods: ["GET", "POST"],
    },
    reconnectionDelay: 0,
    randomizationFactor: 0
})
const { nanoid } = require('nanoid')
const ChatModel = require('./models/ChatModel')
const CommunityModel = require('./models/CommunityModel');

let users = []
const groups = []

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())
app.post('/saveUser', async (req, res) => {
    const { login, password, sex } = req.body
    const otherUser = await ChatModel.findOne({ login })
    if (!otherUser) {
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
        await CommunityModel.findOneAndUpdate({}, {
            "$push": {
                users: {
                    login,
                    password,
                    sex,
                    date: new Date(),
                }
            }
        })
    }
    else {
        res.send({ message: 'Login is occupied' })
    }
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
    const invitedUser = await CommunityModel.findOne({ "users.login": recipient })
    if (invitedUser) {
        await ChatModel.findOneAndUpdate({ login: recipient }, {
            "$push": {
                waitingFriends: {
                    sender,
                    date: new Date()
                }
            }
        })
        res.send(true)
    }
    else {
        res.send({ message: "No such a user" })
    }
})

app.post('/inviteGroup', async (req, res) => {
    const { recipient, sender, groupName, groupId, members } = req.body.info
    const invitedUser = await CommunityModel.findOne({ "users.login": recipient })
    if (invitedUser) {
        await ChatModel.findOneAndUpdate({ login: recipient }, {
            "$push": {
                waitingGroups: {
                    sender,
                    groupName,
                    groupId,
                    date: new Date(),
                    members
                }
            }
        })
        res.send(true)
    }
    else {
        res.send({ message: "No such a user" })
    }
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

app.post('/createGroup', async (req, res) => {
    const { groupInfo: { groupName } } = req.body
    const groupId = nanoid()

    const model = await CommunityModel.findOneAndUpdate({}, {
        "$push": {
            groups: {
                groupName,
                groupId,
                members: []
            }
        }
    }, { new: true })

    groups.push({ groupName, groupId })
    res.send(model.groups[model.groups.length - 1])
})

app.post('/joinToGroup', async (req, res) => {
    const { group: { groupId, groupName, members }, login, sex, decision } = req.body

    if (decision === 'accept') {

        const otherUser = await ChatModel.findOne({ 'groups.groupId': groupId })
        //get dialogues from user who exist in this group
        let oldDialogues = []
        if (otherUser) {
            oldDialogues = otherUser.groups.map(group => {
                if (group.groupId === groupId) {
                    return group.dialogues
                }
            })
            oldDialogues = oldDialogues.filter(dialogue => Array.isArray(dialogue))
        }

        await ChatModel.findOneAndUpdate({ login }, {
            "$push": {
                groups: {
                    groupId,
                    groupName,
                    dialogues: oldDialogues[0], //to fix
                    members
                }
            }
        }, { new: true, returnOriginal: false })

        await ChatModel.updateMany({ 'groups.groupId': groupId }, {
            "$push": {
                'groups.$.members': {
                    login,
                    sex
                }
            }
        }, { new: true, multi: true })

        const model = await ChatModel.findOne({ login })
        res.send(model.groups[model.groups.length - 1])
    }
    await ChatModel.findOneAndUpdate({ login }, { "$pull": { waitingGroups: { groupId } } }, { multi: true });
})

app.get('/getUsers', async (req, res) => {
    const [community] = await CommunityModel.find({})
    const users = community.users.map(user => {
        return {
            login: user.login,
            sex: user.sex,
            _id: user._id
        }
    })
    res.send(users)
})

app.post('/getCurrentUser', async (req, res) => {
    const {login} = req.body
    const user = await ChatModel.findOne({login})
    console.log(user)
})


io.on('connection', async (socket) => {
    let client = {}

    console.log('ok')
    const community = await CommunityModel.find({})
    for (group in community.groups) {
        groups.push(group)
    }

    socket.on('error', (e) => console.log(e))

    socket.on('add user to listeners', login => {
        if (login) {
            users.push({ id: socket.id, login })
            console.log(users)
            client = { id: socket.id, login, groups: [] }
        }
    })

    socket.on('join to group', (groupId) => {
        if (client.groups) {
            socket.join(groupId)
            client.groups.push(groupId)
        }
    })
    socket.on('send group message', async (groupId, message, login) => {
        const messageObj = {
            text: message,
            date: new Date(),
            sender: login
        }
        socket.to(groupId).emit('group message', messageObj, groupId)

        await ChatModel.updateMany({ 'groups.groupId': groupId }, {
            "$push": {
                'groups.$.dialogues': {
                    login,
                    date: new Date(),
                    text: message
                }
            }
        })
    })

    socket.on('send private message', async ({ name, to, mess }) => {
        if (mess.length > 0) {
            const recipient = users.find(user => user.login === to)
            console.log('spm', recipient)
            if (recipient) {
                console.log('to', recipient, 'from', name, mess)
                socket.to(recipient.id).emit('private message', { from: name, text: mess })
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
                                from: name,
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
                                    from: name,
                                    date: new Date(),
                                    text: mess
                                }
                            }
                        }
                    })
                }
            }
        }
    })

    socket.on('disconnect', () => {
        users = users.filter(user => user.login !== client.login)
        console.log('diss', users)
        for (const group in client.groups) {
            socket.leave(client.groups[group].groupId)
        }
    })
})



mongoose.connect("mongodb://localhost:27017/chatDB", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
});

server.listen(1000)