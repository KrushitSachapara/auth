'user strict';

const mongoose = require('mongoose');

const commonCategorySchema = new mongoose.Schema(
    {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'customCategory', default: null },
        field: { type: String, trim: true, default: "" },
        value: { type: String, trim: true, default: "" },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('commonCategory', commonCategorySchema);