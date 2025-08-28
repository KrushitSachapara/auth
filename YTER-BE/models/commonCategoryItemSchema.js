'user strict';

const mongoose = require('mongoose');

const commonCategoriesItemSchema = new mongoose.Schema(
    {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'customCategories', default: null },
        fields: [
            {
                field: { type: String, trim: true, default: '' },
                value: { type: String, trim: true, default: '' }
            }
        ],
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('commonCategoriesItem', commonCategoriesItemSchema);