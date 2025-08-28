'user strict';

const mongoose = require('mongoose');

const customCategory = new mongoose.Schema(
    {
        category: { type: String, trim: true, default: '' },
        GST: { type: Number, default: 0 },
        HSNCode: { type: String, trim: true, default: "" },
        fields: [
            {
                fieldName: { type: String, trim: true, default: '' }
            }
        ],
        fieldsValue: [
            [
                {
                    fieldName: { type: String, trim: true, default: '' },
                    value: { type: String, trim: true, default: '' }
                }
            ]
        ],
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('customCategory', customCategory);