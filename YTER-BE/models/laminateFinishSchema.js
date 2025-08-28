'user strict';

const mongoose = require('mongoose');

const laminateFinishSchema = new mongoose.Schema(
    {
        finishNo: { type: String, trim: true, default: '' },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        catalog: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        finishName: { type: String, trim: true, default: '' },
        thickness: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateThickness', default: null },
        price: { type: Number, default: 0 },
        priceBase: { type: String, trim: true, default: '' },
        postfix: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('laminateFinish', laminateFinishSchema);