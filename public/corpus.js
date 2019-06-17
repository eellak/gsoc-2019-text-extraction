const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const corpusSchema = new Schema({
    name: String,
    path: {
        type: String,
        unique: true
    },
    indices: {
        readability: Object,
        lexdiv: Object,
        tokens: Array,
        vocabulary: Array
    }
});

module.exports = corpusSchema;