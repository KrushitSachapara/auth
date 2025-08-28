// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const CUSTOMCATEGORYPRICE = require('../models/customCategoryPriceSchema');
const CUSTOMCATEGORYITEM = require('../models/finalCustomCategoryItemSchema')
const CUSTOMCATEGORY = require('../models/finalCustomCategorySchema')

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline } = require('../lib/commonQueries');

exports.customCategoryPrice = {
    createCustomCategoryPrice: async (req, res) => {
        try {
            const {
                category,
                fields,
                fieldsValue,
                items
            } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await CUSTOMCATEGORYPRICE.findOne({ category: category, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exist!' });

            // Create New
            const customCategoryPrice = {
                category,
                fields,
                fieldsValue,
                items
            };
            const isCreated = await CUSTOMCATEGORYPRICE.create(customCategoryPrice);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category price created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listCustomCategoryPrices: async (req, res) => {
        try {
            const {
                sortBy,
                order,
                filter,
                page,
                pageSize
            } = req.body;

            // Filter
            const matchFilterCriteria = await buildFilterCriteriaPipeline(filter);

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            const customAggregation = [
                {
                    $lookup: {
                        from: 'finalcustomcategories',
                        localField: 'category',
                        foreignField: "_id",
                        pipeline: [
                            {
                                $match: {
                                    _id: 0,
                                    category: 1,
                                }
                            }
                        ],
                        as: 'category'
                    }
                },
                {
                    $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
                },
                {
                    $set: {
                        category: '$category.category'
                    }
                }
            ]

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        customCategoryPrices: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ customCategoryPrices = [], totalRecords = 0 }] = await CUSTOMCATEGORYPRICE.aggregate(pipeline);

            return !customCategoryPrices
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(customCategoryPrices), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCustomCategoryPriceById: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0
                    }
                }
            ];

            const customCategoryPrice = await CUSTOMCATEGORYPRICE.aggregate(pipeline);

            return !customCategoryPrice
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: customCategoryPrice.length > 0 ? customCategoryPrice[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateCustomCategoryPrice: async (req, res) => {
        try {
            const {
                id,
                category,
                fields,
                fieldsValue,
                items
            } = req.body;

            // Check if the category exists
            const customCategory = await CUSTOMCATEGORYPRICE.findOne({ _id: id });
            if (!customCategory) return badRequestResponse(res, { message: 'Category price not found!' });

            // Check for duplicate category
            const isCaseInsensitiveDuplicateRecord = await CUSTOMCATEGORYPRICE.findOne({ _id: { $ne: id }, category: category, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category price already exists!' });

            // Update the custom category
            const updatedCustomCategory = {
                category,
                fields,
                fieldsValue,
                items
            };
            const isUpdated = await CUSTOMCATEGORYPRICE.findByIdAndUpdate({ _id: customCategory._id }, updatedCustomCategory, { new: true });

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category price updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleCustomCategoryPriceStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const customCategoryPrice = await CUSTOMCATEGORYPRICE.findOne({ _id: id });
            if (!customCategoryPrice) return badRequestResponse(res, { message: 'Category price not found!' });

            const findCustomCategory = await CUSTOMCATEGORYITEM.findOne({ category: customCategoryPrice.category });
            if (findCustomCategory) return badRequestResponse(res, { message: `You can't delete this price, because this price is use in Item!` });

            const isCategoryPriceStatusChanged = await CUSTOMCATEGORYPRICE.findByIdAndUpdate({ _id: customCategoryPrice._id }, { isActive: !customCategoryPrice.isActive });
            const statusMessage = !customCategoryPrice.isActive ? 'activated' : 'deactivated';

            return !isCategoryPriceStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Category price ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    generateItemsByCategoryPrice: async (req, res) => {
        try {
            const values = req.body;

            // Fetch category details
            const category = await CUSTOMCATEGORY.findOne({ _id: values.category });

            const generateItemNames = async (data) => {
                const fieldsValue = data.fieldsValue || [];
                const result = [];
                const fieldOrder = data.fields || [];

                if (!fieldsValue.length || !fieldOrder.length) {
                    console.error("Invalid input data:", data);
                    return [];
                }

                // Helper function to generate combinations recursively
                const generateCombinations = async (currentIndex, currentItem) => {
                    if (currentIndex === fieldsValue.length) {
                        // Create itemName based on the specified field order
                        const itemName = fieldOrder
                            .map(orderField => {
                                const matchedField = currentItem.find(item => item.fieldName === orderField);
                                return matchedField ? matchedField.value : "";
                            })
                            .filter(Boolean) // Remove any undefined or empty values
                            .join(", ");

                        result.push({
                            GST: category?.GST || 0,
                            HSNCode: category?.HSNCode || "",
                            itemName
                        });
                        return;
                    }

                    const field = fieldsValue[currentIndex];
                    for (const value of field.values) {
                        await generateCombinations(
                            currentIndex + 1,
                            [...currentItem, { fieldName: field.fieldName, value }]
                        );
                    }
                };

                try {
                    await generateCombinations(0, []);
                } catch (error) {
                    console.error("Error generating item names:", error);
                    throw error;
                }

                return result;
            };

            const items = await generateItemNames(values);

            return !items?.length
                ? badRequestResponse(res, { message: "Something went wrong!" })
                : successResponse(res, { record: items });
        } catch (error) {
            return errorResponse(error, res);
        }
    }
}