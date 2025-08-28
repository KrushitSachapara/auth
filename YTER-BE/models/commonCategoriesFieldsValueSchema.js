'user strict';

const mongoose = require('mongoose');

const commonCategoriesFieldsValueSchema = new mongoose.Schema(
    {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'customCategories', default: null },
        fields: [
            {
                field: { type: String, trim: true, default: '' },
                value: { type: String, trim: true, default: '' }
            }
        ],
        subField: {
            field: { type: String, trim: true, default: '' },
            values: [{
                value: { type: String, trim: true, default: '' }
            }]
        },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('commonCategoriesFieldsValue', commonCategoriesFieldsValueSchema);