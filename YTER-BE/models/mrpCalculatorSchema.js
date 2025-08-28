'user strict';

const mongoose = require('mongoose');

const mrpCalculatorSchema = new mongoose.Schema(
    {
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        brand: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodBrand', default: null },
        catalog: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateCatalog', default: null },
        veneer: { type: mongoose.Schema.Types.ObjectId, ref: 'veneer', default: null },
        billPercentage: { type: Number, default: 0 },
        skimPercentage: { type: Number, default: 0 },
        brokerCommission: { type: Number, default: 0 },
        showroomProfit: {
            minimum: { type: Number, default: 0 },
            maximum: { type: Number, default: 0 }
        },
        discountPercentage: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('mrpCalculator', mrpCalculatorSchema);