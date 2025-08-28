'user strict';

const mongoose = require('mongoose');

const userTypeSchema = new mongoose.Schema(
    {
        userTypeName: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('userType', userTypeSchema);