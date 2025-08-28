// Schema
const VENEERITEM = require('../models/veneerItemSchema');
const PLYWOODITEM = require('../models/plywoodItemSchema');
const LAMINATEITEM = require('../models/laminateItemSchema');
const CUSTOMCATEGORY = require('../models/customCategorySchema');
const CUSTOMCATEGORYITEM = require('../models/customCategoriesItemSchema');

// Mongo DB
const { ObjectId } = require("mongodb");

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { buildFilterCriteriaPipeline, buildAggregationPipeline, cloneDeep } = require('../lib/commonQueries');

exports.item = {
    itemsList: async (req, res) => {
        try {
            const {
                category,
                fieldName,
                value,
            } = req.body;

            const pipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                { $match: { _id: new ObjectId(category) } },
                {
                    $project: {
                        _id: 0,
                        fieldsValue: 1
                    }
                },
                { $unwind: "$fieldsValue" },
                { $unwind: "$fieldsValue" },
                {
                    $match: {
                        "fieldsValue.fieldName": fieldName,
                        "fieldsValue.value": { $regex: value, $options: 'i' },
                    }
                },
                {
                    $project: {
                        label: "$fieldsValue.value",
                    }
                }
            ]

            const itemList = await CUSTOMCATEGORY.aggregate(pipeline);

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
                fields,
                fieldsValue
            } = req.body;

            const createPromises = fieldsValue?.map((item, index) => CUSTOMCATEGORYITEM.create(
                {
                    category,
                    company,
                    fields,
                    item: fieldsValue[index]
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
                filter,
                page,
                pageSize
            } = req.body;

            // Filter
            const matchFilterCriteria = await buildFilterCriteriaPipeline(filter);

            // Aggregation
            const customAggregation = [
                { $match: matchFilterCriteria },
                {
                    $lookup: {
                        from: "companies",
                        localField: "company",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    companyName: 1
                                }
                            }
                        ],
                        as: "company"
                    }
                },
                { $unwind: "$company" },
                {
                    $lookup: {
                        from: 'customcategories',
                        localField: 'category',
                        foreignField: '_id',
                        pipeline: [{
                            $project: {
                                _id: 0,
                                category: 1,
                            }
                        }],
                        as: 'category'
                    }
                },
                { $unwind: "$category" },
                { $unwind: "$item" },
                {
                    $set: {
                        "item.value": {
                            $cond: {
                                if: {
                                    $or: [
                                        { $eq: ["$item.fieldName", "category"] },
                                        { $eq: ["$item.fieldName", "Category"] }
                                    ]
                                },
                                then: "$category.category",
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $eq: ["$item.fieldName", "company"] },
                                                { $eq: ["$item.fieldName", "Company"] }
                                            ]
                                        },
                                        then: "$company.companyName",
                                        else: "$item.value"
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        purchasePrice: {
                            $last: {
                                $cond: {
                                    if: {
                                        $or: [
                                            { $eq: ["$item.fieldName", "purchasePrice"] },
                                            { $eq: ["$item.fieldName", "PurchasePrice"] }
                                        ]
                                    },
                                    then: "$item.value",
                                    else: ""
                                }
                            }
                        },
                        itemsName: {
                            $push: "$item.value"
                        }
                    }
                },
                {
                    $project: {
                        purchasePrice: 1,
                        itemName: {
                            $reduce: {
                                input: {
                                    $slice: ["$itemsName", 0, { $subtract: [{ $size: "$itemsName" }, 1] }]
                                },
                                initialValue: "",
                                in: {
                                    $cond: {
                                        if: { $eq: ["$$value", ""] },
                                        then: "$$this",
                                        else: { $concat: ["$$value", ", ", "$$this"] }
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, { updatedAt: -1 }, page, pageSize, customAggregation);

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

            const [{ items = [], totalRecords = 0 }] = await CUSTOMCATEGORYITEM.aggregate(pipeline);

            return !items
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(items), totalRecords: totalRecords[0]?.count || 0 });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCustomCategorItemyById: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $group: {
                        _id: '$_id',
                        category: { $first: '$category' },
                        company: { $first: '$company' },
                        fields: { $first: '$fields' },
                        fieldsValue: { $push: '$item' }
                    }
                }
            ];

            const customCategoryItem = await CUSTOMCATEGORYITEM.aggregate(pipeline);

            return !customCategoryItem
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: customCategoryItem.length > 0 ? customCategoryItem[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateItem: async (req, res) => {
        try {
            const {
                id,
                company,
                category,
                fields,
                fieldsValue
            } = req.body;

            // Check Exist or Not
            const item = await CUSTOMCATEGORYITEM.findOne({ _id: id });
            if (!item) return badRequestResponse(res, { message: "Item not found!" });

            const updatedItem = {
                category,
                company,
                fields,
                item: fieldsValue[0]
            }
            const isUpdated = await CUSTOMCATEGORYITEM.findByIdAndUpdate({ _id: id }, updatedItem);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Item updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleItemStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const customCategoryItem = await CUSTOMCATEGORYITEM.findOne({ _id: id });

            const isItemStatusChanged = await CUSTOMCATEGORYITEM.findByIdAndUpdate({ _id: customCategoryItem._id }, { isActive: !customCategoryItem.isActive });
            const statusMessage = !customCategoryItem.isActive ? 'activated' : 'deactivated';

            return !isItemStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Item ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    generalBookItemsList: async (req, res) => {
        try {
            const { search, isGST, customerId } = req.body;

            // Aggregation for Plywood Items
            const plywoodItems = await PLYWOODITEM.aggregate([
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $match: {
                        $expr: {
                            $cond: {
                                if: { $eq: [isGST, true] },
                                then: { $ne: ["$GST", 0] },
                                else: { $eq: ["$GST", 0] }
                            }
                        }
                    }
                },
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $ne: ["$maximumMRP", "N/A"] },
                                { $ne: ["$minimumMRP", "N/A"] }
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "customers",
                        let: { category: "$category" },
                        pipeline: [
                            {
                                $match: {
                                    isActive: true,
                                    _id: new ObjectId(customerId)
                                }
                            },
                            {
                                $project: {
                                    discount: {
                                        $filter: {
                                            input: "$discount",
                                            as: "item",
                                            cond: { $eq: ["$$item.category", "$$category"] }
                                        }
                                    }
                                }
                            },
                            {
                                $unwind: {
                                    path: "$discount",
                                    preserveNullAndEmptyArrays: true
                                }
                            }
                        ],
                        as: "discountByCategory"
                    }
                },
                {
                    $unwind: {
                        path: "$discountByCategory",
                        preserveNullAndEmptyArrays: true
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
                                "$companyLabel.companyCode"
                            ]
                        }
                    }
                },
                {
                    $project: {
                        company: 1,
                        category: 1,
                        discountByCategory: "$discountByCategory.discount.percentage",
                        categoryName: "Plywood",
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
                },
                {
                    $match: {
                        itemName: { $regex: search, $options: 'i' }
                    }
                }
            ]);

            // Aggregation for Laminate Items
            const laminateItems = await LAMINATEITEM.aggregate([
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $match: {
                        $expr: {
                            $cond: {
                                if: { $eq: [isGST, true] },
                                then: { $ne: ["$GST", 0] },
                                else: { $eq: ["$GST", 0] }
                            }
                        }
                    }
                },
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $ne: ["$maximumMRP", "N/A"] },
                                { $ne: ["$minimumMRP", "N/A"] },
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "customers",
                        let: { category: "$category" },
                        pipeline: [
                            {
                                $match: {
                                    isActive: true,
                                    _id: new ObjectId(customerId)
                                }
                            },
                            {
                                $project: {
                                    discount: {
                                        $filter: {
                                            input: "$discount",
                                            as: "item",
                                            cond: { $eq: ["$$item.category", "$$category"] }
                                        }
                                    }
                                }
                            },
                            {
                                $unwind: {
                                    path: "$discount",
                                    preserveNullAndEmptyArrays: true
                                }
                            }
                        ],
                        as: "discountByCategory"
                    }
                },
                {
                    $unwind: {
                        path: "$discountByCategory",
                        preserveNullAndEmptyArrays: true
                    }
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
                                    _id: 0,
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
                        company: 1,
                        category: 1,
                        discountByCategory: "$discountByCategory.discount.percentage",
                        categoryName: "Laminate",
                        catalog: 1,
                        finish: 1,
                        thickness: 1,
                        numberName: 1,
                        purchasePrice: 1,
                        minimumMRP: 1,
                        maximumMRP: 1,
                        prices: 1,
                        GST: 1,
                        HSNCode: 1,
                        itemName: 1
                    }
                },
                {
                    $match: {
                        itemName: { $regex: search, $options: 'i' }
                    }
                }
            ]);

            // Aggregation for Veneer Items
            const veneerItems = await VENEERITEM.aggregate([
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $match: {
                        $expr: {
                            $cond: {
                                if: { $eq: [isGST, true] },
                                then: { $ne: ["$GST", 0] },
                                else: { $eq: ["$GST", 0] }
                            }
                        }
                    }
                },
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $ne: ["$maximumMRP", "N/A"] },
                                { $ne: ["$minimumMRP", "N/A"] }
                            ],
                        }
                    }
                },
                {
                    $lookup: {
                        from: "customers",
                        let: { category: "$category" },
                        pipeline: [
                            {
                                $match: {
                                    isActive: true,
                                    _id: new ObjectId(customerId)
                                }
                            },
                            {
                                $project: {
                                    discount: {
                                        $filter: {
                                            input: "$discount",
                                            as: "item",
                                            cond: { $eq: ["$$item.category", "$$category"] }
                                        }
                                    }
                                }
                            },
                            {
                                $unwind: {
                                    path: "$discount",
                                    preserveNullAndEmptyArrays: true
                                }
                            }
                        ],
                        as: "discountByCategory"
                    }
                },
                {
                    $unwind: {
                        path: "$discountByCategory",
                        preserveNullAndEmptyArrays: true
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
                        discountByCategory: "$discountByCategory.discount.percentage",
                        categoryName: "$categoryLabel.categoryName",
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
                },
                {
                    $match: {
                        itemName: { $regex: search, $options: 'i' }
                    }
                }
            ]);

            // Combine all results
            const allItems = [
                ...plywoodItems.map(item => ({ ...item })),
                ...laminateItems.map(item => ({ ...item })),
                ...veneerItems.map(item => ({ ...item }))
            ];

            return !allItems
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: allItems, totalRecords: allItems?.length || 0 });
        } catch (error) {
            return errorResponse(error, res);
        }
    }
}