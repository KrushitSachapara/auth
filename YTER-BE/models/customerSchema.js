'user strict';

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        siteAddress: { type: String, trim: true, default: '' },
        customerType: { type: String, trim: true, default: '' },
        architect: { type: mongoose.Schema.Types.ObjectId, ref: 'customer', default: null },
        discount: [{
            category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
            percentage: { type: Number, default: 0 }
        }],
        referenceBy: { type: String, trim: true, default: '' },
        firmName: { type: String, trim: true, default: '' },
        commission: [{
            category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
            percentage: { type: Number, default: 0 }
        }],
        officeAddress: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
        otherDetails: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('customer', customerSchema);