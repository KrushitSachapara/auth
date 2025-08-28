// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const THICKNESS = require('../models/plywoodThicknessSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');

exports.thickness = {
    createPlywoodThickness: async (req, res) => {
        try {
            const { thickness, category } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await THICKNESS.findOne({ thickness: thickness.replace(/\s+/g, ''), isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Plywood thickness already exist!' });

            // Create New
            const plywoodThickness = { category, thickness: thickness.replace(/\s+/g, '') };
            const isCreated = await THICKNESS.create(plywoodThickness);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Plywood thickness created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listPlywoodThickness: async (req, res) => {
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
                        plywoodThicknesses: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ plywoodThicknesses = [], totalRecords = 0 }] = await THICKNESS.aggregate(pipeline);

            return !plywoodThicknesses
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(plywoodThicknesses), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getPlywoodThicknessById: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                { $project: { thickness: 1, category: 1 } }
            ];

            const plywoodThickness = await THICKNESS.aggregate(pipeline);

            return !plywoodThickness
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: plywoodThickness.length > 0 ? plywoodThickness[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updatePlywoodThickness: async (req, res) => {
        try {
            const { id, category, thickness } = req.body;

            // Check Exist or Not
            const plywoodThickness = await THICKNESS.findOne({ _id: id });
            if (!plywoodThickness) return badRequestResponse(res, { message: 'Plywood thickness not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await THICKNESS.findOne({ _id: { $ne: id }, thickness: thickness.replace(/\s+/g, ''), isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Plywood thickness already exist!' });

            // update thickness
            const updatedPlywoodThickness = { category, thickness: thickness.replace(/\s+/g, '') };
            const isUpdated = await THICKNESS.findByIdAndUpdate({ _id: plywoodThickness._id }, updatedPlywoodThickness);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Plywood thickness updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    togglePlywoodThicknessStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const plywoodThickness = await THICKNESS.findOne({ _id: id });
            if (!plywoodThickness) return badRequestResponse(res, { message: 'Plywood thickness not found!' });

            const isPlywoodThicknessStatusChanged = await THICKNESS.findByIdAndUpdate({ _id: plywoodThickness._id }, { isActive: !plywoodThickness.isActive });
            const statusMessage = !plywoodThickness.isActive ? 'activated' : 'deactivated';

            return !isPlywoodThicknessStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Plywood thickness ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}