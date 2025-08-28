'user strict';

const mongoose = require('mongoose');

const veneerLotNumberSchema = new mongoose.Schema(
    {
        lotNumberId: { type: String, trim: true, default: '' },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        veneer: { type: mongoose.Schema.Types.ObjectId, ref: 'veneer', default: null },
        size: { type: mongoose.Schema.Types.ObjectId, ref: 'veneerSize', default: null },
        lotNumber: { type: String, trim: true, default: '' },
        price: { type: Number, default: 0 },
        postfix: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('veneerLotNumber', veneerLotNumberSchema);