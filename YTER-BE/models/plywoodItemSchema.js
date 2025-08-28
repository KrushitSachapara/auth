'user strict';

const mongoose = require('mongoose');

const plywoodItemSchema = new mongoose.Schema(
    {
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        plywoodType: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodType', default: null },
        plywoodSize: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodSize', default: null },
        plywoodThickness: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodThickness', default: null },
        brand: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodBrand', default: null },
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

module.exports = mongoose.model('plywoodItem', plywoodItemSchema);