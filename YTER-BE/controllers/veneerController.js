// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const VENEER = require('../models/veneerSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');

exports.veneer = {
    createVeneer: async (req, res) => {
        try {
            const {
                category,
                company,
                veneerName
            } = req.body;

            // Function to get the next available veneer postfix
            const getNextPostfix = async () => {
                const postfixAggregation = await VENEER.aggregate([
                    {
                        $group: {
                            _id: null,
                            maxValue: { $max: "$postfix" }
                        }
                    }
                ]);

                const postfix = postfixAggregation.length > 0 ? postfixAggregation[0].maxValue + 1 : 1;
                const veneerNo = `V${postfix.toString().padStart(3, '0')}`;

                return { veneerNo, postfix };
            };

            const { veneerNo, postfix } = await getNextPostfix();

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await VENEER.findOne({ company, veneerName, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Veneer already exist!' });

            // Create New
            const veneer = {
                category,
                veneerNo,
                company,
                veneerName,
                veneerSKU: `V${Math.ceil(Math.random() * 1000).toString().padStart(3, "0")}`,
                postfix
            };
            const isCreated = await VENEER.create(veneer);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Veneer created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listVeneer: async (req, res) => {
        try {
            const { sortBy, order, page, pageSize } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            // Aggregation Pipeline
            const customAggregation = [
                {
                    $lookup: {
                        from: 'companies',
                        localField: 'company',
                        foreignField: '_id',
                        as: 'company',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    companyName: 1,
                                },
                            },
                        ]
                    }
                },
                {
                    $unwind: { path: '$company' }
                },
                {
                    $set: { company: "$company.companyName" }
                },
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
                        veneers: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ veneers = [], totalRecords = 0 }] = await VENEER.aggregate(pipeline);

            return !veneers
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(veneers), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getVeneerById: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        postfix: 0,
                        isActive: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0,
                    }
                }
            ];

            const veneer = await VENEER.aggregate(pipeline);

            return !veneer
                ? badRequestResponse(res, { message: 'Veneer not found!' })
                : successResponse(res, { record: veneer.length > 0 ? veneer[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateVeneer: async (req, res) => {
        try {
            const {
                id,
                category,
                company,
                veneerName
            } = req.body;

            const veneer = await VENEER.findOne({ _id: id });
            if (!veneer) return existsRequestResponse(res, { message: 'Veneer not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await VENEER.findOne({ _id: { $ne: id }, company, veneerName, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Veneer already exist!' });

            // Update New
            const updatedVeneer = {
                category,
                company,
                veneerName
            };
            const isUpdated = await VENEER.findByIdAndUpdate({ _id: veneer._id }, updatedVeneer);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Veneer updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleVeneerStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const veneer = await VENEER.findOne({ _id: id });
            if (!veneer) return badRequestResponse(res, { message: 'Veneer not found!' });

            const isVeneerStatusChanged = await VENEER.findByIdAndUpdate({ _id: veneer._id }, { isActive: !veneer.isActive });
            const statusMessage = !veneer.isActive ? 'activated' : 'deactivated';

            return !isVeneerStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Veneer ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    veneerOptions: async (req, res) => {
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
                        veneerName: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$veneerName"
                    }
                }
            ];

            const veneerOptions = await VENEER.aggregate(pipeline);

            return !veneerOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(veneerOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getVeneerByCompanyOptions: async (req, res) => {
        try {
            const id = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        company: new ObjectId(id)
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$veneerName"
                    }
                }
            ];

            const veneerByCompanyOptions = await VENEER.aggregate(pipeline);

            return !veneerByCompanyOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: veneerByCompanyOptions });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCompanyByVeneerOptions: async (req, res) => {
        try {
            const id = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        _id: new ObjectId(id)
                    }
                },
                {
                    $lookup: {
                        from: "companies",
                        localField: "company",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    companyName: 1,
                                    companyCode: 1,
                                }
                            }
                        ],
                        as: "company"
                    }
                },
                {
                    $unwind: "$company"
                },
                {
                    $project: {
                        value: "$company._id",
                        label: { $concat: ["$company.companyName", " - ", "$company.companyCode"] },
                        _id: 0
                    }
                }
            ];

            const companyByVeneerOptions = await VENEER.aggregate(pipeline);

            return !companyByVeneerOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: companyByVeneerOptions });
        } catch (error) {
            return errorResponse(error, res);
        }
    }
}