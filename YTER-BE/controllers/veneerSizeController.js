// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const SIZE = require('../models/veneerSizeSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');

exports.size = {
    createVeneerSize: async (req, res) => {
        try {
            const { sizes, category } = req.body;

            // Function to get the next available finish number postfix
            const getNextPostfix = async () => {
                const postfixAggregation = await SIZE.aggregate([
                    {
                        $group: {
                            _id: null,
                            maxValue: { $max: "$postfix" }
                        }
                    }
                ]);

                const currentMaxPostfix = postfixAggregation.length > 0 ? postfixAggregation[0].maxValue : 0;
                return currentMaxPostfix;
            };


            if (sizes?.length > 0) {
                const currentMaxPostfix = await getNextPostfix();

                const createPromises = sizes.map(async (item, index) => {
                    try {
                        // Check for duplicate
                        const exist = await SIZE.findOne({ height: item.height, width: item.width, isActive: true });
                        if (exist) return { status: 'exist', message: "Veneer size already exists!" }

                        // Generate a unique finish number
                        const postfix = currentMaxPostfix + index + 1;
                        const sizeNo = `S${postfix.toString().padStart(3, '0')}`;

                        // Create new size
                        await SIZE.create({
                            sizeNo,
                            category,
                            height: item.height,
                            width: item.width,
                            postfix
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
                    : successResponse(res, { message: 'Veneer size created successfully.' });
            }

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listVeneerSize: async (req, res) => {
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
                        veneerSizes: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ veneerSizes = [], totalRecords = 0 }] = await SIZE.aggregate(pipeline);

            return !veneerSizes
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(veneerSizes), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getVeneerSizeById: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                { $project: { width: 1, height: 1, category: 1 } }
            ];

            const veneerSize = await SIZE.aggregate(pipeline);

            return !veneerSize
                ? badRequestResponse(res, { message: 'Veneer size not found!' })
                : successResponse(res, { record: veneerSize.length > 0 ? veneerSize[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateVeneerSize: async (req, res) => {
        try {
            const { id, height, width } = req.body;

            // Check Exist or Not
            const veneerSize = await SIZE.findOne({ _id: id });
            if (!veneerSize) return badRequestResponse(res, { message: 'Veneer size not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await SIZE.findOne({ _id: { $ne: id }, height, width, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Veneer size already exist!' });

            // update size
            const updatedVeneerSize = { height, width, };
            const isUpdated = await SIZE.findByIdAndUpdate({ _id: veneerSize._id }, updatedVeneerSize);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Veneer size updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleVeneerSizeStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const veneerSize = await SIZE.findOne({ _id: id });
            if (!veneerSize) return badRequestResponse(res, { message: 'Veneer size not found!' });

            const isVeneerSizeStatusChanged = await SIZE.findByIdAndUpdate({ _id: veneerSize._id }, { isActive: !veneerSize.isActive });
            const statusMessage = !veneerSize.isActive ? 'activated' : 'deactivated';

            return !isVeneerSizeStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Veneer size ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    sizeOptions: async (req, res) => {
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
                        height: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: { $concat: [{ $toString: "$height" }, " x ", { $toString: "$width" }] }
                    }
                }
            ];

            const sizeOptions = await SIZE.aggregate(pipeline);

            return !sizeOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(sizeOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
}