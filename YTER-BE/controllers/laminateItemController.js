// Schema
const ITEM = require('../models/laminateItemSchema');
const NUMBER = require('../models/laminateNumberSchema');
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
                catalog
            } = req.body;

            const pipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $match: {
                        $and: [
                            {
                                company: new ObjectId(company),
                                catalog: new ObjectId(catalog)
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
                        from: "laminatefinishes",
                        localField: "finish",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    finishName: 1,
                                    thickness: 1,
                                    price: 1
                                }
                            }
                        ],
                        as: "finishLabel"
                    }
                },
                {
                    $unwind: "$finishLabel"
                },
                {
                    $lookup: {
                        from: "laminatethicknesses",
                        localField: "finishLabel.thickness",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    thickness: 1
                                }
                            }
                        ],
                        as: "thicknessLabel"
                    }
                },
                {
                    $unwind: "$thicknessLabel"
                },
                {
                    $lookup: {
                        from: "laminatecatalogs",
                        localField: "catalog",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    catalogSKU: 1
                                }
                            }
                        ],
                        as: "catalogLabel"
                    }
                },
                {
                    $unwind: "$catalogLabel"
                },
                {
                    $set: {
                        itemName: {
                            $concat: [
                                "$thicknessLabel.thickness",
                                ", ",
                                "$numberName",
                                ", ",
                                "$finishLabel.finishName",
                                " ",
                                "$catalogLabel.catalogSKU"
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "laminateitems",
                        let: {
                            category: "$category",
                            company: "$company",
                            catalog: "$catalog",
                            finish: "$finish",
                            thickness: "$finishLabel.thickness",
                            numberName: "$_id"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$company", "$$company"] },
                                            { $eq: ["$category", "$$category"] },
                                            { $eq: ["$catalog", "$$catalog"] },
                                            { $eq: ["$finish", "$$finish"] },
                                            { $eq: ["$thickness", "$$thickness"] },
                                            { $eq: ["$numberName", "$$numberName"] },
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
                        category: 1,
                        company: 1,
                        catalog: 1,
                        finish: 1,
                        numberName: "$_id",
                        thickness: "$finishLabel.thickness",
                        purchasePrice: "$finishLabel.price",
                        GST: "$categoryLabel.GST",
                        HSNCode: "$categoryLabel.HSNCode",
                        itemName: 1,
                        _id: 0
                    }
                }
            ]

            const itemList = await NUMBER.aggregate(pipeline);

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
                catalog,
                itemList
            } = req.body;

            const MRPDetails = await MRPCALCULATOR.findOne({ company, category, catalog })

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
                        from: "laminatefinishes",
                        localField: "finish",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    finishName: 1,
                                    thickness: 1,
                                    price: 1
                                }
                            }
                        ],
                        as: "finishLabel"
                    }
                },
                {
                    $unwind: "$finishLabel"
                },
                {
                    $lookup: {
                        from: "laminatethicknesses",
                        localField: "thickness",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    thickness: 1
                                }
                            }
                        ],
                        as: "thicknessLabel"
                    }
                },
                {
                    $unwind: "$thicknessLabel"
                },
                {
                    $lookup: {
                        from: "laminatecatalogs",
                        localField: "catalog",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    catalogSKU: 1
                                }
                            }
                        ],
                        as: "catalogLabel"
                    }
                },
                {
                    $unwind: "$catalogLabel"
                },
                {
                    $lookup: {
                        from: "laminatenumbers",
                        localField: "numberName",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    numberName: 1
                                }
                            }
                        ],
                        as: "numberNameLabel"
                    }
                },
                {
                    $unwind: "$numberNameLabel"
                },
                {
                    $set: {
                        itemName: {
                            $concat: [
                                "$thicknessLabel.thickness",
                                ", ",
                                "$numberNameLabel.numberName",
                                ", ",
                                "$finishLabel.finishName",
                                " ",
                                "$catalogLabel.catalogSKU"
                            ]
                        }
                    }
                },
                {
                    $project: {
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