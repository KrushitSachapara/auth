'user strict';

const mongoose = require('mongoose');

const plywoodPriceSchema = new mongoose.Schema(
    {
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        brand: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodBrand', default: null },
        plywoodType: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodType', default: null },
        plywoodThickness: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodThickness', default: null },
        price: { type: Number, default: 1 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('plywoodPrice', plywoodPriceSchema);