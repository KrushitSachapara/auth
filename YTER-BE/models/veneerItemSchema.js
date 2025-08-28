'user strict';

const mongoose = require('mongoose');

const vennerItemSchema = new mongoose.Schema(
    {
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        veneer: { type: mongoose.Schema.Types.ObjectId, ref: 'veneer', default: null },
        size: { type: mongoose.Schema.Types.ObjectId, ref: 'veneerSize', default: null },
        lotNumber: { type: mongoose.Schema.Types.ObjectId, ref: 'veneerLotNumber', default: null },
        purchasePrice: { type: Number, default: 0 },
        minimumMRP: { type: String, default: 'N/A' },
        maximumMRP: { type: String, default: 'N/A' },
        prices: [{
            percentage: { type: Number, default: 0 },
            price: { type: Number, default: 0 }
        }],
        GST: { type: Number, default: 0 },
        HSNCode: { type: String, trim: true, default: "" },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('veneerItem', vennerItemSchema);