'user strict';

const mongoose = require('mongoose');

const veneerSchema = new mongoose.Schema(
    {
        veneerNo: { type: String, trim: true, default: '' },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        veneerName: { type: String, trim: true, default: '' },
        veneerSKU: { type: String, trim: true, default: '' },
        postfix: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('veneer', veneerSchema);