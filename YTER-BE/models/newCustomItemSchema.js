'user strict';

const mongoose = require('mongoose');

const newCustomItemSchema = new mongoose.Schema(
    {
        category: { type: mongoose.Schema.Types.ObjectId, ref: "newCustomCategory", default: null },
        GST: { type: Number, default: 0 },
        HSNCode: { type: String, trim: true, default: "" },
        fields: [
            {
                field: { type: String, trim: true, default: "" },
                value: { type: mongoose.Schema.Types.ObjectId, ref: "newCustomCategory", default: null }
            }
        ],
        purchasePrice: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('newCustomItem', newCustomItemSchema);