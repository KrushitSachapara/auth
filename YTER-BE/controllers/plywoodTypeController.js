// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const TYPE = require('../models/plywoodTypeSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { checkDuplicateRecord, cloneDeep, sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline } = require('../lib/commonQueries');

exports.type = {
    createPlywoodType: async (req, res) => {
        try {
            const { type, category } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(TYPE, null, [{ key: 'type', value: type }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Plywood type already exist!' });

            // Create New
            const plywoodType = { type, category };
            const isCreated = await TYPE.create(plywoodType);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Plywood type created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listPlywoodType: async (req, res) => {
        try {
            const {
                sortBy,
                order,
                page,
                pageSize,
                filter
            } = req.body;

            // Filter
            const matchFilterCriteria = await buildFilterCriteriaPipeline(filter);

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            // Aggregation Pipeline
            const customAggregation = [
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'category',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    categoryName: 1,
                                },
                            },
                        ],
                    }
                },
                {
                    $unwind: { path: '$category' }
                },
                {
                    $set: { category: "$category.categoryName" }
                }
            ]

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            // Final Aggregation Pipeline
            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        plywoodTypes: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ plywoodTypes = [], totalRecords = 0 }] = await TYPE.aggregate(pipeline);

            return !plywoodTypes
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(plywoodTypes), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getPlywoodTypeById: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                { $project: { type: 1, category: 1 } }
            ];

            const plywoodType = await TYPE.aggregate(pipeline);

            return !plywoodType
                ? badRequestResponse(res, { message: 'Plywood type not found!' })
                : successResponse(res, { record: plywoodType.length > 0 ? plywoodType[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updatePlywoodType: async (req, res) => {
        try {
            const { id, category, type } = req.body;

            // Check Exist or Not
            const plywoodType = await TYPE.findOne({ _id: id });
            if (!plywoodType) return badRequestResponse(res, { message: 'Plywood type not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(TYPE, id, [{ key: 'type', value: type }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Plywood type already exist!' });

            // update category type
            const updatedCategoryType = { category, type };
            const isUpdated = await TYPE.findByIdAndUpdate({ _id: plywoodType._id }, updatedCategoryType);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Plywood type updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    togglePlywoodTypeStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const plywoodType = await TYPE.findOne({ _id: id });
            if (!plywoodType) return badRequestResponse(res, { message: 'Plywood type not found!' });

            const isPlywoodTypeStatusChanged = await TYPE.findByIdAndUpdate({ _id: plywoodType._id }, { isActive: !plywoodType.isActive });
            const statusMessage = !plywoodType.isActive ? 'activated' : 'deactivated';

            return !isPlywoodTypeStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Plywood type ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    plywoodTypeOptions: async (req, res) => {
        try {

            // Aggregation Pipeline
            const pipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $sort: {
                        type: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$type"
                    }
                }
            ];

            const plywoodTypeOptions = await TYPE.aggregate(pipeline);

            return !plywoodTypeOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(plywoodTypeOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    categoryTypeByCategoryOptions: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        category: new ObjectId(id)
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$type"
                    }
                }
            ];

            const categoryTypeByCategoryOptions = await TYPE.aggregate(pipeline);

            return !categoryTypeByCategoryOptions
                ? badRequestResponse(res, { message: "Something went wrong!" })
                : successResponse(res, { records: categoryTypeByCategoryOptions });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}