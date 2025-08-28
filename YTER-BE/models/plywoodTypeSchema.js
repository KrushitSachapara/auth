'user strict';

const mongoose = require('mongoose');

const plywoodTypeSchema = new mongoose.Schema(
    {
        type: { type: String, trim: true, default: '' },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('plywoodType', plywoodTypeSchema);