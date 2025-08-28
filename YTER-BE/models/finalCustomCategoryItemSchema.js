'user strict';

const mongoose = require('mongoose');

const customCategoryItemSchema = new mongoose.Schema(
    {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'finalCustomCategory', default: null },
        priceId: { type: mongoose.Schema.Types.ObjectId, ref: 'customCategoryPrice', default: null },
        GST: { type: Number, default: 0 },
        HSNCode: { type: String, trim: true, default: "" },
        itemName: { type: String, trim: true, default: "" },
        purchasePrice: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('finalCustomCategoryItem', customCategoryItemSchema);