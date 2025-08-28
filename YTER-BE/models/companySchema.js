'user strict';

const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
    {
        companyName: { type: String, trim: true, default: '' },
        companyCode: { type: String, trim: true, default: '' },
        city: { type: String, trim: true, default: null },
        area: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('company', companySchema);