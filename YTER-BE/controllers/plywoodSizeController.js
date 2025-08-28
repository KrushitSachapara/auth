// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const SIZE = require('../models/plywoodSizeSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');

exports.size = {
    createPlywoodSize: async (req, res) => {
        try {
            const { sizes, category } = req.body;

            if (sizes?.length > 0) {

                const createPromises = sizes.map(async (item) => {
                    try {
                        // Check for duplicate
                        const exist = await SIZE.findOne({ height: item.height, width: item.width, isActive: true });
                        if (exist) return { status: 'exist', message: "Plywood size already exists!" }

                        // Create new size
                        await SIZE.create({
                            category,
                            height: item.height,
                            width: item.width,
                        });
                        return { status: 'success' };
                    } catch (error) {
                        return { status: 'failed', message: error.message };
                    }
                });

                const results = await Promise.all(createPromises);

                const failedRecords = results.filter(result => result.status !== 'success');

                return failedRecords.length > 0
                    ? badRequestResponse(res, { message: failedRecords[0]?.message })
                    : successResponse(res, { message: 'Plywood size created successfully.' });
            }

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listPlywoodSize: async (req, res) => {
        try {
            const { sortBy, order, page, pageSize } = req.body;

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
                        ]
                    }
                },
                {
                    $unwind: { path: '$category' }
                },
                {
                    $set: { category: "$category.categoryName" }
                }
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline({}, sortOptions, page, pageSize, customAggregation);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        plywoodSizes: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ plywoodSizes = [], totalRecords = 0 }] = await SIZE.aggregate(pipeline);

            return !plywoodSizes
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(plywoodSizes), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getPlywoodSizeById: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                { $project: { width: 1, height: 1, category: 1 } }
            ];

            const plywoodSize = await SIZE.aggregate(pipeline);

            return !plywoodSize
                ? badRequestResponse(res, { message: 'Plywood size not found!' })
                : successResponse(res, { record: plywoodSize.length > 0 ? plywoodSize[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updatePlywoodSize: async (req, res) => {
        try {
            const { id, height, width } = req.body;

            // Check Exist or Not
            const plywoodSize = await SIZE.findOne({ _id: id });
            if (!plywoodSize) return badRequestResponse(res, { message: 'Plywood size not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await SIZE.findOne({ _id: { $ne: id }, height, width, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Plywood size already exist!' });

            // update size
            const updatedPlywoodSize = { height, width, };
            const isUpdated = await SIZE.findByIdAndUpdate({ _id: plywoodSize._id }, updatedPlywoodSize);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Plywood size updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    togglePlywoodSizeStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const plywoodSize = await SIZE.findOne({ _id: id });
            if (!plywoodSize) return badRequestResponse(res, { message: 'Plywood size not found!' });

            const isPlywoodSizeStatusChanged = await SIZE.findByIdAndUpdate({ _id: plywoodSize._id }, { isActive: !plywoodSize.isActive });
            const statusMessage = !plywoodSize.isActive ? 'activated' : 'deactivated';

            return !isPlywoodSizeStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Plywood size ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}