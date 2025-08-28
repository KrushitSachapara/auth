// Schema
const ITEM = require('../models/plywoodItemSchema');
const PRICE = require('../models/plywoodPriceSchema');
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
                category,
                brand
            } = req.body;

            const pipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $match: {
                        $expr: {
                            $and: [
                                {
                                    $eq: [{ $toObjectId: "$company" }, { $toObjectId: new ObjectId(company) }]
                                },
                                {
                                    $eq: [{ $toObjectId: "$category" }, { $toObjectId: new ObjectId(category) }]
                                },
                                {
                                    $eq: [{ $toObjectId: "$brand" }, { $toObjectId: new ObjectId(brand) }]
                                }
                            ]
                        }
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
                                    HSNCode: 1
                                }
                            }
                        ],
                        as: "categoryDetails"
                    }
                },
                {
                    $unwind: "$categoryDetails"
                },
                {
                    $lookup: {
                        from: "companies",
                        localField: "company",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    companyName: 1,
                                    companyCode: 1
                                }
                            }
                        ],
                        as: "companyLabel"
                    }
                },
                {
                    $unwind: "$companyLabel"
                },
                {
                    $lookup: {
                        from: "plywoodtypes",
                        localField: "plywoodType",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    type: 1
                                }
                            }
                        ],
                        as: "plywoodTypeLabel"
                    }
                },
                {
                    $unwind: "$plywoodTypeLabel"
                },
                {
                    $lookup: {
                        from: "plywoodthicknesses",
                        localField: "plywoodThickness",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    thickness: 1
                                }
                            }
                        ],
                        as: "plywoodThicknessLabel"
                    }
                },
                {
                    $unwind: "$plywoodThicknessLabel"
                },
                {
                    $lookup: {
                        from: "plywoodsizes",
                        localField: "category",
                        foreignField: "category",
                        pipeline: [
                            {
                                $match: {
                                    isActive: true
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
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
                        plywoodSize: "$sizeLabel._id",
                        purchasePrice: { $multiply: ["$price", "$sizeLabel.height", "$sizeLabel.width"] },
                        itemName: {
                            $concat: [
                                "$plywoodThicknessLabel.thickness",
                                ", ",
                                {
                                    $toString: "$sizeLabel.height"
                                },
                                " x ",
                                {
                                    $toString: "$sizeLabel.width"
                                },
                                ", ",
                                "$plywoodTypeLabel.type",
                                ", ",
                                "$companyLabel.companyCode",
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "plywooditems",
                        let: {
                            category: "$category",
                            company: "$company",
                            brand: "$brand",
                            plywoodType: "$plywoodType",
                            plywoodThickness: "$plywoodThickness",
                            plywoodSize: "$plywoodSize",
                            purchasePrice: "$purchasePrice"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$company", "$$company"] },
                                            { $eq: ["$category", "$$category"] },
                                            { $eq: ["$brand", "$$brand"] },
                                            { $eq: ["$plywoodType", "$$plywoodType"] },
                                            { $eq: ["$plywoodThickness", "$$plywoodThickness"] },
                                            { $eq: ["$plywoodSize", "$$plywoodSize"] },
                                            { $eq: ["$purchasePrice", "$$purchasePrice"] },
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
                        company: 1,
                        category: 1,
                        plywoodType: 1,
                        plywoodSize: 1,
                        plywoodThickness: 1,
                        brand: 1,
                        itemName: 1,
                        GST: "$categoryDetails.GST",
                        HSNCode: "$categoryDetails.HSNCode",
                        purchasePrice: 1
                    }
                }
            ]

            const itemList = await PRICE.aggregate(pipeline);

            return !itemList
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: itemList });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    createItem: async (req, res) => {
        try {
            const { company, category, brand, itemList } = req.body;

            const MRPDetails = await MRPCALCULATOR.findOne({ company, category, brand })

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
                        from: "companies",
                        localField: "company",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    companyName: 1,
                                    companyCode: 1
                                }
                            }
                        ],
                        as: "companyLabel"
                    }
                },
                {
                    $unwind: "$companyLabel"
                },
                {
                    $lookup: {
                        from: "plywoodtypes",
                        localField: "plywoodType",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    type: 1
                                }
                            }
                        ],
                        as: "plywoodTypeLabel"
                    }
                },
                {
                    $unwind: "$plywoodTypeLabel"
                },
                {
                    $lookup: {
                        from: "plywoodthicknesses",
                        localField: "plywoodThickness",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    thickness: 1
                                }
                            }
                        ],
                        as: "plywoodThicknessLabel"
                    }
                },
                {
                    $unwind: "$plywoodThicknessLabel"
                },
                {
                    $lookup: {
                        from: "plywoodsizes",
                        localField: "plywoodSize",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
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
                                "$plywoodThicknessLabel.thickness",
                                ", ",
                                {
                                    $toString: "$sizeLabel.height"
                                },
                                " x ",
                                {
                                    $toString: "$sizeLabel.width"
                                },
                                ", ",
                                "$plywoodTypeLabel.type",
                                ", ",
                                "$companyLabel.companyCode",
                            ]
                        }
                    }
                },
                {
                    $project: {
                        company: 1,
                        category: 1,
                        brand: 1,
                        plywoodType: 1,
                        plywoodThickness: 1,
                        plywoodSize: 1,
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