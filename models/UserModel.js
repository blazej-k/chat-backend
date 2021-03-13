const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
    users: [
        {
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
                    id: String,
                    date: Date,
                    sex: String
                }
            ],
            groups: [
                {
                    name: String,
                    members: Number
                }
            ]
        }
    ]
})

exports.module = mongoose.model('ChatModel', schema, 'Chat')