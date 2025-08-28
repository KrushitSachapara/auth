'user strict';

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
    {
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
        plywoodType: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodType', default: null },
        plywoodSize: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodSize', default: null },
        plywoodThickness: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodThickness', default: null },
        brand: { type: mongoose.Schema.Types.ObjectId, ref: 'plywoodBrand', default: null },
        catalog: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateCatalog', default: null },
        finish: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateFinish', default: null },
        laminateThickness: { type: mongoose.Schema.Types.ObjectId, ref: 'laminateThickness', default: null },
        veneer: { type: mongoose.Schema.Types.ObjectId, ref: 'veneer', default: null },
        veneerSize: { type: mongoose.Schema.Types.ObjectId, ref: 'veneerSize', default: null },
        lotNumber: { type: mongoose.Schema.Types.ObjectId, ref: 'veneerLotNumber', default: null },
        minimumMRP: { type: Number, default: 0 },
        maximumMRP: { type: Number, default: 0 },
        prices: [
            {
                percentage: { type: Number, default: 1 },
                price: { type: Number, default: 0 },
            }
        ],
        discountPercentage: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        customerMRP: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 },
        totalPrice: { type: Number, default: 0 },
        groupName: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true
    }
)

const generalBookSchema = new mongoose.Schema(
    {
        generalNo: { type: String, trim: true, default: null },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'customer', default: null },
        customerNo: { type: String, trim: true, default: '' },
        broker: { type: mongoose.Schema.Types.ObjectId, ref: 'customer', default: null },
        generalBookDate: { type: Date, default: '' },
        items: [itemSchema],
        groupByItems: [{ type: String, trim: true, default: null }],
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('generalBook', generalBookSchema);