// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const CUSTOMCATEGORY = require('../models/finalCustomCategorySchema');
const CUSTOMCATEGORYPRICE = require('../models/customCategoryPriceSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline } = require('../lib/commonQueries');

exports.customCategory = {
    createCustomCategory: async (req, res) => {
        try {
            const { category, fields, GST, HSNCode, profit, scheme, architectCommission, discount } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await CUSTOMCATEGORY.findOne({ category: category.toLowerCase(), isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exist!' });

            // Create New
            const customCategory = { category: category.toLowerCase(), fields, GST, HSNCode, profit, scheme, architectCommission, discount };
            const isCreated = await CUSTOMCATEGORY.create(customCategory);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category created successfully.', id: isCreated._id });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listCustomCategories: async (req, res) => {
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

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        customCategories: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ customCategories = [], totalRecords = 0 }] = await CUSTOMCATEGORY.aggregate(pipeline);

            return !customCategories
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(customCategories), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCustomCategoryById: async (req, res) => {
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

            const customCategory = await CUSTOMCATEGORY.aggregate(pipeline);

            return !customCategory
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: customCategory.length > 0 ? customCategory[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateCustomCategory: async (req, res) => {
        try {
            const {
                id,
                category,
                fields,
                GST,
                HSNCode,
                profit,
                scheme,
                architectCommission,
                discount
            } = req.body;

            // Check if the category exists
            const customCategory = await CUSTOMCATEGORY.findOne({ _id: id });
            if (!customCategory) return badRequestResponse(res, { message: 'Category not found!' });

            // Check for duplicate category
            const isCaseInsensitiveDuplicateRecord = await CUSTOMCATEGORY.findOne({ _id: { $ne: id }, category: category.toLowerCase(), isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exists!' });

            // Update the custom category
            const updatedCustomCategory = {
                category: category.toLowerCase(),
                fields,
                GST,
                HSNCode,
                profit,
                scheme,
                architectCommission,
                discount
            };
            const isUpdated = await CUSTOMCATEGORY.findByIdAndUpdate({ _id: customCategory._id }, updatedCustomCategory, { new: true });

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleCustomCategoryStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const customCategory = await CUSTOMCATEGORY.findOne({ _id: id });
            if (!customCategory) return badRequestResponse(res, { message: 'Category not found!' });

            const findCustomCategory = await CUSTOMCATEGORYPRICE.findOne({ category: id });
            if (findCustomCategory) return badRequestResponse(res, { message: `You can't delete ${customCategory.category} category, because ${customCategory.category} category is use in Price!` });

            const isCategoryStatusChanged = await CUSTOMCATEGORY.findByIdAndUpdate({ _id: customCategory._id }, { isActive: !customCategory.isActive });
            const statusMessage = !customCategory.isActive ? 'activated' : 'deactivated';

            return !isCategoryStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Category ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    customCategoryOptions: async (req, res) => {
        try {
            const pipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $sort: {
                        category: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$category"
                    }
                }
            ];

            const categoryOptions = await CUSTOMCATEGORY.aggregate(pipeline);

            return !categoryOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(categoryOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    }
}