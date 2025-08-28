'user strict';

const mongoose = require('mongoose');

const newCustomCategorySchema = new mongoose.Schema(
    {
        category: { type: String, trim: true, default: '' },
        GST: { type: Number, default: 0 },
        HSNCode: { type: String, trim: true, default: "" },
        fields: [{ type: String, trim: true, default: '' }],
        profit: { type: Number, default: 0 },
        scheme: { type: Number, default: 0 },
        architectCommission: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('finalCustomCategory', newCustomCategorySchema);