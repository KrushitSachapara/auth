'user strict';

const mongoose = require('mongoose');

const customCategoriesItemSchema = new mongoose.Schema(
    {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'customCategories', default: null },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'company', default: null },
        fields: [
            {
                fieldName: { type: String, trim: true, default: '' }
            }
        ],
        item: [
            {
                fieldName: { type: String, trim: true, default: '' },
                value: { type: String, trim: true, default: '' }
            }
        ],
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('customCategoriesItem', customCategoriesItemSchema);