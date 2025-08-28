// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const PRICE = require('../models/plywoodPriceSchema');
const ITEM = require('../models/plywoodItemSchema');
const TYPE = require('../models/plywoodTypeSchema');
const CATEGORYSIZE = require('../models/plywoodSizeSchema');
const MRPCALCULATOR = require('../models/mrpCalculatorSchema');

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline, buildFilterCriteriaPipeline } = require('../lib/commonQueries');
const { basicCalculation } = require('../utils/basicCalculation');

exports.price = {
    priceItemRecords: async (req, res) => {
        try {
            const {
                company,
                category,
                brand,
                plywoodType
            } = req.body;

            const plywoodTypes = await plywoodType?.map(item => new ObjectId(item))

            const pipeline = [
                {
                    $match: {
                        category: new ObjectId(category)
                    }
                },
                {
                    $match: {
                        _id: {
                            $in: plywoodTypes
                        }
                    }
                },
                {
                    $lookup: {
                        from: "plywoodthicknesses",
                        localField: "category",
                        foreignField: "category",
                        as: "categorythicknesses",
                        pipeline: [
                            {
                                $match: {
                                    isActive: true
                                }
                            },
                            {
                                $project: {
                                    _id: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: "$categorythicknesses"
                },
                {
                    $project: {
                        _id: 0,
                        plywoodType: "$_id",
                        plywoodThickness: "$categorythicknesses._id",
                    }
                },
                {
                    $lookup: {
                        from: "plywoodprices",
                        let: {
                            plywoodType: "$plywoodType",
                            plywoodThickness: "$plywoodThickness",
                            company: new ObjectId(company),
                            category: new ObjectId(category),
                            brand: new ObjectId(brand),
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$plywoodType", "$$plywoodType"] },
                                            { $eq: ["$plywoodThickness", "$$plywoodThickness"] },
                                            { $eq: ["$company", "$$company"] },
                                            { $eq: ["$category", "$$category"] },
                                            { $eq: ["$brand", "$$brand"] },
                                            { $eq: ["$isActive", true] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "priceMatch"
                    }
                },
                {
                    $match: {
                        "priceMatch.0": {
                            $exists: false
                        }
                    }
                },
                {
                    $project: {
                        plywoodType: 1,
                        plywoodThickness: 1,
                        brand: brand,
                        company: company,
                        category: category
                    }
                }
            ]

            const priceItemRecords = await TYPE.aggregate(pipeline)

            return !priceItemRecords
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: priceItemRecords });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    createPrice: async (req, res) => {
        try {
            const { priceItems } = req.body;

            if (priceItems?.length > 0) {
                const createPromises = priceItems?.map((item, index) => PRICE.create(item)
                    .then(() => ({ status: 'success' }))
                    .catch((error) => ({ status: 'failed', error, index }))
                );

                const results = await Promise.all(createPromises);

                const failedRecords = results?.filter(result => result?.status === 'failed');

                return failedRecords.length > 0
                    ? badRequestResponse(res, { message: `Error while creating records. ${priceItems?.length - failedRecords?.length} records created successfully, ${failedRecords?.length} failed.` })
                    : successResponse(res, { message: 'Price created successfully.' });
            }

            return badRequestResponse(res);

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listPrices: async (req, res) => {
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
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    categoryName: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: { path: "$category" }
                },
                {
                    $set: { category: "$category.categoryName" }
                },
                {
                    $lookup: {
                        from: "companies",
                        localField: "company",
                        foreignField: "_id",
                        as: "company",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    companyName: 1,
                                    companyCode: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: { path: "$company" }
                },
                {
                    $set: { company: { $concat: ["$company.companyName", " - ", "$company.companyCode"] } }
                },
                {
                    $lookup: {
                        from: "plywoodtypes",
                        localField: "plywoodType",
                        foreignField: "_id",
                        as: "plywoodType",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    type: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: { path: "$plywoodType" }
                },
                {
                    $set: {
                        plywoodType:
                            "$plywoodType.type"
                    }
                },
                {
                    $lookup: {
                        from: "plywoodbrands",
                        let: { brand: "$brand" },
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    brands: 1
                                }
                            },
                            {
                                $unwind: "$brands"
                            },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$brands._id", "$$brand"]
                                    }
                                }
                            }
                        ],
                        as: "brand"
                    }
                },
                { $unwind: "$brand" },
                {
                    $set: { brand: "$brand.brands.brandName" }
                },
                {
                    $lookup: {
                        from: "plywoodthicknesses",
                        localField: "plywoodThickness",
                        foreignField: "_id",
                        as: "plywoodThickness"
                    }
                },
                {
                    $unwind: { path: "$plywoodThickness" }
                },
                {
                    $set: {
                        plywoodThickness:
                            "$plywoodThickness.thickness"
                    }
                }
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            // Aggregation
            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        prices: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ prices = [], totalRecords = 0 }] = await PRICE.aggregate(pipeline);

            return !prices
                ? badRequestResponse(res, 'Something went wrong!')
                : successResponse(res, { records: cloneDeep(prices), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updatePrice: async (req, res) => {
        try {
            const { priceItems } = req.body;

            const updatesArray = Array.isArray(priceItems) ? priceItems : [priceItems];

            const updatePromises = updatesArray.map(async (priceUpdate) => {
                const { id, price } = priceUpdate;

                const existingPrice = await PRICE.findOne({ _id: id });

                if (!existingPrice) return { id, status: 'failed', message: 'Price record not found!' };

                const updatedPrice = { price };

                const isUpdated = await PRICE.findByIdAndUpdate({ _id: existingPrice._id }, updatedPrice);

                // Update purchase price of Items
                if (isUpdated) {
                    const findItem = await ITEM.find({ plywoodType: existingPrice.plywoodType, plywoodThickness: existingPrice.plywoodThickness });

                    const updatePurchasePrice = findItem?.map(async (item) => {
                        const size = await CATEGORYSIZE.findOne({ _id: item.plywoodSize });

                        const MRPDetails = await MRPCALCULATOR.findOne({ company: existingPrice.company, category: existingPrice.category, brand: existingPrice.brand })
                        const calculateMRP = basicCalculation(price * size.height * size.width, MRPDetails)

                        const isUpdatedItem = await ITEM.findByIdAndUpdate({ _id: item._id }, {
                            purchasePrice: price * size.height * size.width,
                            minimumMRP: calculateMRP[0].minimumMRP,
                            maximumMRP: calculateMRP[0].maximumMRP,
                            prices: calculateMRP[0].prices
                        })

                        return isUpdatedItem
                    })

                    return !updatePurchasePrice
                        ? { id, status: 'failed', message: 'Something went wrong!' }
                        : { id, status: 'success', message: 'Price updated successfully.' }

                } else {
                    return { id, status: 'failed', message: 'Something went wrong!' }
                }
            });

            const results = await Promise.all(updatePromises);

            const failedUpdates = results.filter(result => result.status === 'failed');

            return failedUpdates.length > 0
                ? badRequestResponse(res, { message: `Error while updating records. ${updatesArray.length - failedUpdates.length} records updated successfully, ${failedUpdates.length} failed.` })
                : successResponse(res, { message: 'Prices updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    togglePriceStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const checkeExistPrice = await PRICE.findOne({ _id: id });
            if (!checkeExistPrice) return badRequestResponse(res, { message: 'Price list not found!' });

            const isPriceStatusChanged = await PRICE.findByIdAndUpdate({ _id: checkeExistPrice._id }, { isActive: !checkeExistPrice.isActive });
            const statusMessage = !checkeExistPrice.isActive ? 'activated' : 'deactivated';

            return !isPriceStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Price ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}