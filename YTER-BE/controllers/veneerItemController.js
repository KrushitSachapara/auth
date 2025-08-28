// Schema
const ITEM = require('../models/veneerItemSchema');
const LOTNUMBER = require('../models/veneerLotNumberSchema');
const MRPCALCULATOR = require('../models/mrpCalculatorSchema');

const { ObjectId } = require('mongodb');

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline, buildFilterCriteriaPipeline } = require('../lib/commonQueries');
const { basicCalculation } = require('../utils/basicCalculation');

exports.item = {
    itemsList: async (req, res) => {
        try {
            const {
                company,
                veneer
            } = req.body;

            const pipeline = [
                {
                    $match: {
                        $and: [
                            {
                                company: new ObjectId(company),
                                veneer: new ObjectId(veneer)
                            }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    GST: 1,
                                    HSNCode: 1,
                                    categoryName: 1
                                }
                            }
                        ],
                        as: "categoryLabel"
                    }
                },
                {
                    $unwind: "$categoryLabel"
                },
                {
                    $lookup: {
                        from: "veneers",
                        localField: "veneer",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    veneerName: 1
                                }
                            }
                        ],
                        as: "veneerLabel"
                    }
                },
                {
                    $unwind: "$veneerLabel"
                },
                {
                    $lookup: {
                        from: "veneersizes",
                        localField: "size",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    height: 1,
                                    width: 1
                                }
                            }
                        ],
                        as: "sizeLabel"
                    }
                },
                {
                    $unwind: "$sizeLabel"
                },
                {
                    $set: {
                        itemName: {
                            $concat: [
                                "$categoryLabel.categoryName",
                                ", ",
                                "$veneerLabel.veneerName",
                                ", ",
                                {
                                    $toString: "$sizeLabel.height"
                                },
                                " x ",
                                {
                                    $toString: "$sizeLabel.width"
                                },
                                ", ",
                                "$lotNumber"
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "veneeritems",
                        let: {
                            company: "$company",
                            veneer: "$veneer",
                            size: "$size",
                            lotNumber: "$_id"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$veneer", "$$veneer"]
                                            },
                                            {
                                                $eq: ["$company", "$$company"]
                                            },
                                            {
                                                $eq: ["$size", "$$size"]
                                            },
                                            {
                                                $eq: ["$lotNumber", "$$lotNumber"]
                                            },
                                            { $eq: ["$isActive", true] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "duplicates"
                    }
                },
                {
                    $match: {
                        "duplicates.0": {
                            $exists: false
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: 1,
                        company: 1,
                        veneer: 1,
                        size: 1,
                        lotNumber: "$_id",
                        purchasePrice: "$price",
                        GST: "$categoryLabel.GST",
                        HSNCode: "$categoryLabel.HSNCode",
                        itemName: 1
                    }
                }
            ]

            const itemList = await LOTNUMBER.aggregate(pipeline);

            return !itemList
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: itemList });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    createItem: async (req, res) => {
        try {
            const {
                company,
                category,
                veneer,
                itemList
            } = req.body;

            const MRPDetails = await MRPCALCULATOR.findOne({ company, category, veneer })

            const calculateMRP = await basicCalculation(itemList?.map(i => i.purchasePrice), MRPDetails)
            const createPromises = itemList?.map((item, index) => ITEM.create(
                {
                    ...item,
                    minimumMRP: calculateMRP[index]?.minimumMRP,
                    maximumMRP: calculateMRP[index]?.maximumMRP,
                    prices: calculateMRP[index]?.prices
                }
            )
                .then(() => ({ status: 'success' }))
                .catch((error) => ({ status: 'failed', error, index }))
            );

            const results = await Promise.all(createPromises);

            const failedRecords = results?.filter(result => result?.status === 'failed');

            return failedRecords.length > 0
                ? badRequestResponse(res, { message: `Error while creating records. ${itemList?.length - failedRecords?.length} records created successfully, ${failedRecords?.length} failed.` })
                : successResponse(res, { message: "Item created successfully!" });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listItems: async (req, res) => {
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
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    categoryName: 1
                                }
                            }
                        ],
                        as: "categoryLabel"
                    }
                },
                {
                    $unwind: "$categoryLabel"
                },
                {
                    $lookup: {
                        from: "veneers",
                        localField: "veneer",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    veneerName: 1
                                }
                            }
                        ],
                        as: "veneerLabel"
                    }
                },
                {
                    $unwind: "$veneerLabel"
                },
                {
                    $lookup: {
                        from: "veneersizes",
                        localField: "size",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    height: 1,
                                    width: 1
                                }
                            }
                        ],
                        as: "sizeLabel"
                    }
                },
                {
                    $unwind: "$sizeLabel"
                },
                {
                    $lookup: {
                        from: "veneerlotnumbers",
                        localField: "lotNumber",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    lotNumber: 1,
                                }
                            }
                        ],
                        as: "lotNumberLabel"
                    }
                },
                {
                    $unwind: "$lotNumberLabel"
                },
                {
                    $set: {
                        itemName: {
                            $concat: [
                                "$categoryLabel.categoryName",
                                ", ",
                                "$veneerLabel.veneerName",
                                ", ",
                                {
                                    $toString: "$sizeLabel.height"
                                },
                                " x ",
                                {
                                    $toString: "$sizeLabel.width"
                                },
                                ", ",
                                "$lotNumberLabel.lotNumber"
                            ]
                        }
                    }
                },
                {
                    $project: {
                        company: 1,
                        category: 1,
                        veneer: 1,
                        size: 1,
                        lotNumber: 1,
                        purchasePrice: 1,
                        minimumMRP: 1,
                        maximumMRP: 1,
                        prices: 1,
                        GST: 1,
                        HSNCode: 1,
                        itemName: 1
                    }
                }
            ]

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            // Aggregation
            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        items: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ items = [], totalRecords = 0 }] = await ITEM.aggregate(pipeline);

            return !items
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(items), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleItemStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const item = await ITEM.findOne({ _id: id });
            if (!item) return badRequestResponse(res, { message: 'Item not found!' });

            const isItemStatusChanged = await ITEM.findByIdAndUpdate({ _id: item._id }, { isActive: !item.isActive });
            const statusMessage = !item.isActive ? 'activated' : 'deactivated';

            return !isItemStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Item ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }

}