'user strict';

const mongoose = require('mongoose');

const newCustomCategorySchema = new mongoose.Schema(
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
            {
                fieldName: { type: String, trim: true, default: '' },
                values: [
                    {
                        value: { type: String, trim: true, default: '' },
                    }
                ],
            }
        ],
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('newCustomCategory', newCustomCategorySchema);