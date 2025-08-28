'user strict';

const mongoose = require('mongoose');

const laminateCatalogSchema = new mongoose.Schema(
    {
        catalogNo: { type: String, trim: true, default: '' },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        catalogName: { type: String, trim: true, default: '' },
        priceBase: { type: String, trim: true, default: '' },
        catalogSKU: { type: String, trim: true, default: '' },
        price: { type: Number, default: 0 },
        postfix: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('laminateCatalog', laminateCatalogSchema);