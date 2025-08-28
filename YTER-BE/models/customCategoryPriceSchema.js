'user strict';

const mongoose = require('mongoose');

const customCategoryPriceSchema = new mongoose.Schema(
    {
        category: { type: mongoose.Schema.Types.ObjectId, ref: "finalCustomCategory", default: null },
        GST: { type: Number, default: 0 },
        HSNCode: { type: String, trim: true, default: "" },
        fields: [
            {
                fieldName: { type: String, trim: true, default: '' }
            }
        ],
        fieldsValue: [
            {
                fieldName: { type: String, trim: true, default: '' },
                values: [
                    {
                        value: { type: String, trim: true, default: '' },
                    }
                ],
            }
        ],
        items: [
            {
                GST: { type: Number, default: 0 },
                HSNCode: { type: String, trim: true, default: "" },
                itemName: { type: String, trim: true, default: "" },
                purchasePrice: { type: Number, default: 0 },
            }
        ],
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('customCategoryPrice', customCategoryPriceSchema);