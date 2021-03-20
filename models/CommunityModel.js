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
            members: Number
        }
    ]
})

module.exports = mongoose.model('CommunitySchema', schema, 'Chat')