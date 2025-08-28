// Schema
const COMMONCATEGORY = require('../models/commonCategorySchema');
const { ObjectId } = require('mongodb');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline, cloneDeep, } = require('../lib/commonQueries');

exports.category = {
    createCommonCategory: async (req, res) => {
        try {
            const {
                category,
                field,
                value
            } = req.body;

            const checkDuplicateRecord = await COMMONCATEGORY.findOne({
                category,
                field: field?.toLowerCase(),
                value: value?.toLowerCase(),
                isActive: true
            });
            if (checkDuplicateRecord) return existsRequestResponse(res, { message: "Category already exist!" });

            // Create New
            const commonCategory = {
                category,
                field: field?.toLowerCase(),
                value: value?.toLowerCase()
            };
            const isCreated = await COMMONCATEGORY.create(commonCategory);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listCommonCategory: async (req, res) => {
        try {
            const {
                filter,
                sortBy,
                order,
                page,
                pageSize
            } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            // Filter
            const matchFilterCriteria = await buildFilterCriteriaPipeline(filter);

            const customAggregation = [
                {
                    $lookup: {
                        from: 'customcategories',
                        localField: 'category',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    category: 1
                                }
                            }
                        ],
                        as: 'category'
                    }
                },
                {
                    $unwind: { path: '$category' }
                },
                {
                    $set: { category: "$category.category" }
                }
            ]

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            // Aggregation
            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        commonCategories: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ commonCategories = [], totalRecords = 0 }] = await COMMONCATEGORY.aggregate(pipeline);

            return !commonCategories
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(commonCategories), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCommonCategoryById: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        isActive: 0,
                        __v: 0,
                    }
                },
            ];

            const commonCategory = await COMMONCATEGORY.aggregate(pipeline);

            return !commonCategory
                ? badRequestResponse(res, { message: 'Category not found!' })
                : successResponse(res, { record: commonCategory?.length > 0 ? commonCategory[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateCommonCategory: async (req, res) => {
        try {
            const {
                id,
                category,
                field,
                value
            } = req.body;

            // Check Exist or Not
            const commonCategory = await COMMONCATEGORY.findOne({ _id: id, isActive: true });
            if (!commonCategory) return badRequestResponse(res, { message: "Category not found!" });

            // Check Duplicate
            const checkDuplicateRecord = await COMMONCATEGORY.findOne({
                _id: { $ne: id },
                category,
                field: field?.toLowerCase(),
                value: value?.toLowerCase(),
                isActive: true
            });
            if (checkDuplicateRecord) return existsRequestResponse(res, { message: "Category already exist!" });

            // // Update
            const updatedCommonCategory = {
                category,
                field: field?.toLowerCase(),
                value: value?.toLowerCase(),
            };
            const isUpdated = await COMMONCATEGORY.findByIdAndUpdate({ _id: commonCategory._id }, updatedCommonCategory);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleCommonCategoryStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const commonCategory = await COMMONCATEGORY.findOne({ _id: id });
            if (!commonCategory) return badRequestResponse(res, { message: 'Category not found!' });

            const isCommonCategoryStatusChanged = await COMMONCATEGORY.findByIdAndUpdate({ _id: commonCategory._id }, { isActive: !commonCategory.isActive });
            const statusMessage = !commonCategory.isActive ? 'activated' : 'deactivated';

            return !isCommonCategoryStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Category ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}