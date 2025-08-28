'user strict';

const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
    {
        brandName: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

const plywoodBrandSchema = new mongoose.Schema(
    {
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        brands: [brandSchema],
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('plywoodBrand', plywoodBrandSchema);