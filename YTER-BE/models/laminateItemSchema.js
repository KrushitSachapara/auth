'user strict';

const mongoose = require('mongoose');

const laminateItemSchema = new mongoose.Schema(
    {
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        catalog: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateCatalog', default: null },
        finish: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateFinish', default: null },
        thickness: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateThickness', default: null },
        numberName: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateNumber', default: null },
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

module.exports = mongoose.model('laminateItem', laminateItemSchema);