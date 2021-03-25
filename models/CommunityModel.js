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
            groupName: String,
            groupId: String,
        }
    ]
})

module.exports = mongoose.model('CommunityModel', schema, 'Community')