const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const corpusSchema = new Schema({
    name: String,
    path: {
        type: String,
        unique: true
    },
    indices: {
        readability: Array,
        lexdiv: Array,
        tokens: Number,
        vocabulary: Number
    }
});

module.exports = corpusSchema;