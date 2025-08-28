'user strict';

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        categoryName: { type: String, trim: true, default: '' },
        GST: { type: Number, default: 0 },
        HSNCode: { type: String, trim: true, default: "" },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('category', categorySchema);