const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
    login: String,
    password: String,
    date: Date,
    sex: String,
    active: Boolean,
    conversations: [
        {
            login: String,
            id: String,
            dialogues: [
                {
                    date: Date,
                    text: String
                }
            ]
        }
    ],
    friends: [
        {
            login: String,
            date: Date,
            sex: String
        }
    ],
    waitingFriends: [
        {
            sender: String,
            date: Date
        }
    ],
    waitingGroups: [
        {
            sender: String,
            login: String,
            name: String,
            groupId: String,
            date: Date
        }
    ],
    groups: [
        {
            name: String,
            groupId: String,
            dialogues: [
                {
                    login: String,
                    date: Date,
                    text: String
                }
            ],
            members: [
                {
                    login: String,
                    sex: String,
                }
            ]
        }
    ]
})

module.exports = mongoose.model('ChatModel', schema, 'Chat')