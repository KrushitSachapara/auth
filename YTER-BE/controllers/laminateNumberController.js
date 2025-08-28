// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const NUMBER = require('../models/laminateNumberSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');

exports.number = {
    createLaminateNumber: async (req, res) => {
        try {
            const {
                category,
                company,
                catalog,
                finish,
                numberNames
            } = req.body;

            // Function to get the next available number postfix
            const getNextPostfix = async () => {
                const postfixAggregation = await NUMBER.aggregate([
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

            if (numberNames?.length > 0) {
                const currentMaxPostfix = await getNextPostfix();
                let nextPostfix = currentMaxPostfix + 1;

                const createPromises = numberNames.map(async (item) => {
                    try {
                        // Check for duplicate number
                        const checkDuplicateRecord = await NUMBER.findOne({ company, catalog, finish, numberName: item.number, isActive: true });
                        if (checkDuplicateRecord) return { status: 'exist', message: "Laminate number already exists!" };

                        // Generate a unique number
                        const postfix = nextPostfix++;
                        const numberId = `N${postfix.toString().padStart(3, '0')}`;

                        // Create new number record
                        await NUMBER.create({
                            numberId,
                            numberName: item.number,
                            category,
                            company,
                            catalog,
                            finish,
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
                    ? badRequestResponse(res, { message: `Error while creating records. ${createPromises?.length - failedRecords?.length} records created successfully, ${failedRecords?.length} records already exist.` })
                    : successResponse(res, { message: 'Laminate number created successfully.' });
            }

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listLaminateNumber: async (req, res) => {
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
                        from: 'laminatecatalogs',
                        localField: 'catalog',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    catalogName: 1,
                                },
                            },
                        ],
                        as: 'catalog',
                    }
                },
                {
                    $unwind: { path: '$catalog' }
                },
                {
                    $set: {
                        catalog: "$catalog.catalogName",
                    }
                },
                {
                    $lookup: {
                        from: 'laminatefinishes',
                        localField: 'finish',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    finishName: 1,
                                    thickness: 1,
                                    price: 1,
                                    priceBase: 1
                                },
                            },
                        ],
                        as: 'finish',
                    }
                },
                {
                    $unwind: { path: '$finish' }
                },
                {
                    $lookup: {
                        from: 'laminatethicknesses',
                        let: { thickness: "$finish.thickness" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$thickness"]
                                    }
                                }
                            },
                        ],
                        as: 'thickness',
                    }
                },
                {
                    $unwind: { path: '$thickness' }
                },
                {
                    $set: {
                        thickness: "$thickness.thickness",
                        price: "$finish.price",
                        priceBase: "$finish.priceBase",
                        finish: "$finish.finishName"
                    }
                }
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline({}, sortOptions, page, pageSize, customAggregation);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        laminateNumbers: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ laminateNumbers = [], totalRecords = 0 }] = await NUMBER.aggregate(pipeline);

            return !laminateNumbers
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(laminateNumbers), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getLaminateNumberById: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $group: {
                        _id: "$_id",
                        category: { $first: "$category" },
                        company: { $first: "$company" },
                        catalog: { $first: "$catalog" },
                        finish: { $first: "$finish" },
                        numberNames: {
                            $push: {
                                number: "$numberName"
                            }
                        }
                    }
                }
            ];

            const laminateNumber = await NUMBER.aggregate(pipeline);

            return !laminateNumber
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: laminateNumber.length > 0 ? laminateNumber[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateLaminateNumber: async (req, res) => {
        try {
            const {
                id,
                category,
                company,
                catalog,
                finish,
                numberName
            } = req.body;

            // Check Exist or Not
            const laminateNumber = await NUMBER.findOne({ _id: id });
            if (!laminateNumber) return badRequestResponse(res, { message: 'Laminate number not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await NUMBER.findOne({ _id: { $ne: id }, company, catalog, finish, numberName, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Laminate number already exist!' });

            // // update number
            const updatedLaminateNumber = {
                category,
                company,
                catalog,
                finish,
                numberName
            };
            const isUpdated = await NUMBER.findByIdAndUpdate({ _id: laminateNumber._id }, updatedLaminateNumber);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Laminate number updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleLaminateNumberStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const laminateNumber = await NUMBER.findOne({ _id: id });
            if (!laminateNumber) return badRequestResponse(res, { message: 'Laminate thickness not found!' });

            const isLaminateNumberStatusChanged = await NUMBER.findByIdAndUpdate({ _id: laminateNumber._id }, { isActive: !laminateNumber.isActive });
            const statusMessage = !laminateNumber.isActive ? 'activated' : 'deactivated';

            return !isLaminateNumberStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Laminate number ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}