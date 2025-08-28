// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const LOTNUMBER = require('../models/veneerLotNumberSchema');
const VENEERITEM = require('../models/veneerItemSchema');
const MRPDETAILS = require('../models/mrpCalculatorSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');
const { basicCalculation } = require('../utils/basicCalculation');

exports.lotNumber = {
    createVeneerLotNumber: async (req, res) => {
        try {
            const {
                category,
                company,
                veneer,
                lotNumberList
            } = req.body;

            // Function to get the next available lot number postfix
            const getNextPostfix = async () => {
                const postfixAggregation = await LOTNUMBER.aggregate([
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

            if (lotNumberList?.length > 0) {
                const currentMaxPostfix = await getNextPostfix();
                let nextPostfix = currentMaxPostfix + 1;

                const createPromises = lotNumberList.map(async (item) => {
                    try {
                        // Check for duplicate lot number
                        const checkDuplicateRecord = await LOTNUMBER.findOne({
                            company,
                            veneer,
                            lotNumber: item.lotNumber,
                            size: item.size,
                            isActive: true
                        });
                        if (checkDuplicateRecord) { return { status: 'exist', message: "Lot number already exists!" } }

                        // Generate a unique lot number
                        const postfix = nextPostfix++;
                        const lotNumberId = `V${postfix.toString().padStart(3, '0')}`;


                        // Create new finish record
                        await LOTNUMBER.create({
                            lotNumberId,
                            category,
                            company,
                            veneer,
                            lotNumber: item.lotNumber,
                            size: item.size,
                            price: item.price,
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
                    ? badRequestResponse(res, { message: `Error while creating records. ${createPromises.length - failedRecords.length} records created successfully, ${failedRecords.length} records already exist.` })
                    : successResponse(res, { message: 'Lot number created successfully.' });
            }

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listVeneerLotNumber: async (req, res) => {
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
                        from: 'veneers',
                        localField: 'veneer',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    veneerName: 1,
                                },
                            },
                        ],
                        as: 'veneer',
                    }
                },
                {
                    $unwind: { path: '$veneer' }
                },
                {
                    $set: { veneer: "$veneer.veneerName" }
                },
                {
                    $lookup: {
                        from: 'veneersizes',
                        localField: 'size',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    height: 1,
                                    width: 1
                                },
                            },
                        ],
                        as: 'size',
                    }
                },
                {
                    $unwind: { path: '$size' }
                },
                {
                    $set: {
                        size: { $concat: [{ $toString: "$size.height" }, " x ", { $toString: "$size.width" }] }
                    }
                }
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline({}, sortOptions, page, pageSize, customAggregation);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        veneerLotNumbers: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ veneerLotNumbers = [], totalRecords = 0 }] = await LOTNUMBER.aggregate(pipeline);

            return !veneerLotNumbers
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(veneerLotNumbers), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getVeneerLotNumberById: async (req, res) => {
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

            const veneerLotNumber = await LOTNUMBER.aggregate(pipeline);

            return !veneerLotNumber
                ? badRequestResponse(res, { message: 'Lot number not found!' })
                : successResponse(res, { record: veneerLotNumber.length > 0 ? veneerLotNumber[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateVeneerLotNumber: async (req, res) => {
        try {
            const {
                id,
                price
            } = req.body;

            const veneerLotNumber = await LOTNUMBER.findOne({ _id: id });
            if (!veneerLotNumber) return existsRequestResponse(res, { message: 'Lot number not found!' });

            // Update New
            const updatedVeneerLotNumber = { price };
            const isUpdated = await LOTNUMBER.findByIdAndUpdate({ _id: veneerLotNumber._id }, updatedVeneerLotNumber, { new: true });

            if (!isUpdated) return badRequestResponse(res, { message: 'Failed to update lot number details!' })

            // Update purchase price of Items
            const itemList = await VENEERITEM.find(
                {
                    $and: [
                        { company: isUpdated.company, category: isUpdated.category, veneer: isUpdated.veneer, size: isUpdated.size, lotNumber: isUpdated._id }
                    ]
                }
            );

            const mrpDetails = await MRPDETAILS.findOne({ company: isUpdated.company, category: isUpdated.category, veneer: isUpdated.veneer });

            const updatePromises = itemList.map(async (item) => {
                try {
                    const calculateMRP = basicCalculation(isUpdated.price, mrpDetails);

                    const updatedItem = await VENEERITEM.findByIdAndUpdate(item._id, {
                        purchasePrice: isUpdated.price,
                        minimumMRP: calculateMRP[0]?.minimumMRP,
                        maximumMRP: calculateMRP[0]?.maximumMRP,
                        prices: calculateMRP[0]?.prices
                    });

                    return !updatedItem
                        ? { id: item._id, status: 'failed', message: 'Failed to update item!' }
                        : { id: item._id, status: 'success', message: 'Lot number updated successfully.' }

                } catch (error) {
                    return { id: item._id, status: 'failed', message: 'Error updating item!' };
                }
            });

            const results = await Promise.all(updatePromises);

            const failedRecords = results.filter(result => result.status === 'failed');

            return failedRecords.length > 0
                ? badRequestResponse(res, { message: `Error while updating records. ${itemList.length - failedRecords.length} records updated successfully, ${failedRecords.length} failed.` })
                : successResponse(res, { message: 'Lot number updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleVeneerLotNumberStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const veneerLotNumber = await LOTNUMBER.findOne({ _id: id });
            if (!veneerLotNumber) return badRequestResponse(res, { message: 'Lot number not found!' });

            const isVeneerLotNumberStatusChanged = await LOTNUMBER.findByIdAndUpdate({ _id: veneerLotNumber._id }, { isActive: !veneerLotNumber.isActive });
            const statusMessage = !veneerLotNumber.isActive ? 'activated' : 'deactivated';

            return !isVeneerLotNumberStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Lot number ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}