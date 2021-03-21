const { ObjectId } = require('bson')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
    users: [
        {
            login: String,
            password: String,
            sex: String,
            date: Date,
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

module.exports = mongoose.model('CommunityModel', schema, 'Community')