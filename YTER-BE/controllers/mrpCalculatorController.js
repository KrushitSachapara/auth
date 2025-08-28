// Schema
const MRPCALCULATOR = require('../models/mrpCalculatorSchema');
const PLYWOODITEM = require('../models/plywoodItemSchema');
const LAMINATEITEM = require('../models/laminateItemSchema');
const VENEERITEM = require('../models/veneerItemSchema');
const { ObjectId } = require('mongodb');

// middleware
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline } = require('../lib/commonQueries');
const { basicCalculation } = require('../utils/basicCalculation');

exports.mrpCalculator = {
    createMRP: async (req, res) => {
        try {
            const {
                company,
                category,
                brand,
                catalog,
                veneer,
                billPercentage,
                skimPercentage,
                brokerCommission,
                showroomProfit,
                discountPercentage
            } = req.body;

            // Check Exist or Not
            const checkDuplicateRecord = await MRPCALCULATOR.findOne({ company, category, ...(catalog) && { catalog }, ...(brand) && { brand }, ...(veneer) && { veneer } });
            if (checkDuplicateRecord) return badRequestResponse(res, { message: "MRP already exist!" });

            const mrpCalculateDetails = {
                company,
                category,
                brand,
                catalog,
                veneer,
                billPercentage,
                skimPercentage,
                brokerCommission,
                showroomProfit,
                discountPercentage
            };
            const isCreated = await MRPCALCULATOR.create(mrpCalculateDetails);

            if (!isCreated) {
                return badRequestResponse(res, { message: 'Failed to create finish details!' });
            }

            let schema;
            if (catalog) {
                schema = LAMINATEITEM;
            } else if (veneer) {
                schema = VENEERITEM;
            } else {
                schema = PLYWOODITEM;
            }

            // Update purchase price of Items
            const itemList = await eval(schema).find({ $and: [{ company, category, ...(catalog) && { catalog }, ...(brand) && { brand }, ...(veneer) && { veneer } }] });
            const createPromises = itemList?.map(async (item) => {
                try {
                    const calculateMRP = basicCalculation(item.purchasePrice, isCreated);

                    const createdItem = await eval(schema).findByIdAndUpdate(item._id, {
                        minimumMRP: calculateMRP[0]?.minimumMRP,
                        maximumMRP: calculateMRP[0]?.maximumMRP,
                        prices: calculateMRP[0]?.prices
                    });

                    return !createdItem
                        ? { id: item._id, status: 'failed', message: 'Failed to create item!' }
                        : { id: item._id, status: 'success', message: 'MRP created successfully.' }

                } catch (error) {
                    return { id: item._id, status: 'failed', message: 'Error creating item!' };
                }
            });

            const results = await Promise.all(createPromises);

            const failedRecords = results.filter(result => result.status === 'failed');

            return failedRecords.length > 0
                ? badRequestResponse(res, { message: `Error while creating records. ${itemList.length - failedRecords.length} records created successfully, ${failedRecords.length} failed.` })
                : successResponse(res, { message: 'MRP created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listMRPCalculator: async (req, res) => {
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

            const customAggregation = [
                {
                    $lookup: {
                        from: 'companies',
                        localField: 'company',
                        foreignField: '_id',
                        as: 'company'
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
                        as: 'category'
                    }
                },
                {
                    $unwind: { path: '$category' }
                },
                {
                    $set: { category: "$category.categoryName" }
                },
                {
                    $lookup: {
                        from: 'plywoodbrands',
                        let: { brand: '$brand' },
                        pipeline: [
                            { $unwind: '$brands' },
                            {
                                $match: {
                                    $expr: { $eq: ['$brands._id', '$$brand'] }
                                }
                            }
                        ],
                        as: 'brand'
                    }
                },
                {
                    $unwind: { path: '$brand', preserveNullAndEmptyArrays: true }
                },
                {
                    $set: { brand: '$brand.brands.brandName' }
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
                                    catalogName: 1
                                }
                            }
                        ],
                        as: 'catalog'
                    }
                },
                {
                    $unwind: { path: '$catalog', preserveNullAndEmptyArrays: true }
                },
                {
                    $set: { catalog: "$catalog.catalogName" }
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
                                    veneerName: 1
                                }
                            }
                        ],
                        as: 'veneer'
                    }
                },
                {
                    $unwind: { path: '$veneer', preserveNullAndEmptyArrays: true }
                },
                {
                    $set: { veneer: "$veneer.veneerName" }
                },
            ]

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        MRPList: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];;

            const [{ MRPList, totalRecords }] = await MRPCALCULATOR.aggregate(pipeline);

            return !MRPList
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(MRPList), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getMRPById: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        isActive: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0
                    }
                }
            ];;

            const mrpDetails = await MRPCALCULATOR.aggregate(pipeline);

            return !mrpDetails
                ? badRequestResponse(res, { message: 'MRP not found!' })
                : successResponse(res, { record: mrpDetails.length > 0 ? mrpDetails[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateMRP: async (req, res) => {
        try {
            const {
                id,
                company,
                category,
                brand,
                catalog,
                veneer,
                billPercentage,
                skimPercentage,
                brokerCommission,
                showroomProfit,
                discountPercentage
            } = req.body;

            // Check if MRP details exist
            const mrpDetails = await MRPCALCULATOR.findOne({ _id: id });
            if (!mrpDetails) return badRequestResponse(res, { message: 'MRP details not found!' })

            // Check for duplicate record
            const checkDuplicateRecord = await MRPCALCULATOR.findOne({ company, category, _id: { $ne: id }, ...(catalog) && { catalog }, ...(brand) && { brand }, ...(veneer) && { veneer } });
            if (checkDuplicateRecord) return badRequestResponse(res, { message: "MRP already exist!" })

            const updatedMrpDetails = {
                company,
                category,
                brand,
                catalog,
                veneer,
                billPercentage,
                skimPercentage,
                brokerCommission,
                showroomProfit,
                discountPercentage
            };

            // Update MRP details in MRPCALCULATOR collection
            const isUpdated = await MRPCALCULATOR.findByIdAndUpdate(id, updatedMrpDetails, { new: true });

            if (!isUpdated) {
                return badRequestResponse(res, { message: 'Failed to update MRP details!' });
            }

            let schema;
            if (catalog) {
                schema = LAMINATEITEM;
            } else if (veneer) {
                schema = VENEERITEM;
            } else {
                schema = PLYWOODITEM;
            }

            // Update purchase price of Items
            const itemList = await eval(schema).find({ $and: [{ company, category, ...(catalog) && { catalog }, ...(brand) && { brand }, ...(veneer) && { veneer } }] });

            const updatePromises = itemList.map(async (item) => {
                try {
                    const calculateMRP = basicCalculation(item.purchasePrice, isUpdated);

                    const createdItem = await eval(schema).findByIdAndUpdate(item._id, {
                        minimumMRP: calculateMRP[0]?.minimumMRP,
                        maximumMRP: calculateMRP[0]?.maximumMRP,
                        prices: calculateMRP[0]?.prices
                    });

                    return !createdItem
                        ? { id: item._id, status: 'failed', message: 'Failed to update item!' }
                        : { id: item._id, status: 'success', message: 'MRP updated successfully.' }

                } catch (error) {
                    return { id: item._id, status: 'failed', message: 'Error updating item!' };
                }
            });

            const results = await Promise.all(updatePromises);

            const failedRecords = results.filter(result => result.status === 'failed');

            return failedRecords.length > 0
                ? badRequestResponse(res, { message: `Error while updating records. ${itemList.length - failedRecords.length} records updated successfully, ${failedRecords.length} failed.` })
                : successResponse(res, { message: 'MRP updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}