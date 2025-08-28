'user strict';

const mongoose = require('mongoose');

const plywoodSizeSchema = new mongoose.Schema(
    {
        width: { type: Number, default: 1 },
        height: { type: Number, default: 1 },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('plywoodSize', plywoodSizeSchema);