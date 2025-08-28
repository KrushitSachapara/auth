// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const THICKNESS = require('../models/laminateThicknessSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');

exports.thickness = {
    createLaminateThickness: async (req, res) => {
        try {
            const { thickness, category } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await THICKNESS.findOne({ thickness: thickness.replace(/\s+/g, ''), isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Laminate thickness already exist!' });

            // Create New
            const laminateThickness = { category, thickness: thickness.replace(/\s+/g, '') };
            const isCreated = await THICKNESS.create(laminateThickness);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Laminate thickness created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listLaminateThickness: async (req, res) => {
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
                        ],
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
                        laminateThicknesses: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ laminateThicknesses = [], totalRecords = 0 }] = await THICKNESS.aggregate(pipeline);

            return !laminateThicknesses
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(laminateThicknesses), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getLaminateThicknessById: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                { $project: { thickness: 1, category: 1 } }
            ];

            const laminateThickness = await THICKNESS.aggregate(pipeline);

            return !laminateThickness
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: laminateThickness.length > 0 ? laminateThickness[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateLaminateThickness: async (req, res) => {
        try {
            const { id, category, thickness } = req.body;

            // Check Exist or Not
            const laminateThickness = await THICKNESS.findOne({ _id: id });
            if (!laminateThickness) return badRequestResponse(res, { message: 'Laminate thickness not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await THICKNESS.findOne({ _id: { $ne: id }, thickness: thickness.replace(/\s+/g, ''), isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Laminate thickness already exist!' });

            // update thickness
            const updatedLaminateThickness = { category, thickness: thickness.replace(/\s+/g, '') };
            const isUpdated = await THICKNESS.findByIdAndUpdate({ _id: laminateThickness._id }, updatedLaminateThickness);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Laminate thickness updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleLaminateThicknessStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const laminateThickness = await THICKNESS.findOne({ _id: id });
            if (!laminateThickness) return badRequestResponse(res, { message: 'Laminate thickness not found!' });

            const isLaminateThicknessStatusChanged = await THICKNESS.findByIdAndUpdate({ _id: laminateThickness._id }, { isActive: !laminateThickness.isActive });
            const statusMessage = !laminateThickness.isActive ? 'activated' : 'deactivated';

            return !isLaminateThicknessStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Laminate thickness ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    thicknessOptions: async (req, res) => {
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
                        thickness: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$thickness"
                    }
                }
            ];

            const thicknessOptions = await THICKNESS.aggregate(pipeline);

            return !thicknessOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(thicknessOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
}