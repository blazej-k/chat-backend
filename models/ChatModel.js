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
            name: String,
            date: Date,
            sex: String
        }
    ],
    waitingFriends: [
        {
            name: String,
            date: Date
        }
    ],
    waitingGroups: [
        {
            name: String,
            date: Date
        }
    ],
    groups: [
        {
            name: String,
            members: Number,
            dialogues: [
                {
                    login: String,
                    date: Date,
                    text: String
                }
            ]
        }
    ]
})

module.exports = mongoose.model('ChatModel', schema, 'Chat')