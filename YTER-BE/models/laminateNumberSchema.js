'user strict';

const mongoose = require('mongoose');

const laminateNumberSchema = new mongoose.Schema(
    {
        numberId: { type: String, trim: true, default: '' },
        numberName: { type: String, trim: true, default: '' },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        catalog: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateCatalog', default: null },
        finish: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateFinish', default: null },
        postfix: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('laminateNumber', laminateNumberSchema);