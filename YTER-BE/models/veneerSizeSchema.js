'user strict';

const mongoose = require('mongoose');

const veneerSizeSchema = new mongoose.Schema(
    {
        sizeNo: { type: String, trim: true, default: '' },
        width: { type: Number, default: 1 },
        height: { type: Number, default: 1 },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        postfix: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('veneerSize', veneerSizeSchema);