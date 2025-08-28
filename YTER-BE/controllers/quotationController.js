// Schema
const QUOTATION = require('../models/quotationSchema');

const { ObjectId } = require('mongodb');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildFilterCriteriaPipeline } = require('../lib/commonQueries');

exports.quotation = {
    createQuotation: async (req, res) => {
        try {
            const {
                customerId,
                generalNo,
                broker,
                groupByItems,
                username,
                quotationDate,
                items
            } = req.body;

            // Quotation No.
            const quotations = await QUOTATION.find({});
            const quotationNo = `Q${new Date().getFullYear()}${(quotations.length + 1).toString().padStart(2, '0')}`;

            // Create New
            const quotation = {
                quotationNo,
                customerId,
                generalNo,
                broker,
                groupByItems,
                username,
                quotationDate,
                items
            };
            const isCreated = await QUOTATION.create(quotation);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Quotation created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listQuotation: async (req, res) => {
        try {
            const {
                sortBy,
                order,
                filter
            } = req.body;

            // Filter
            const matchFilterCriteria = await buildFilterCriteriaPipeline(filter);

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            const customAggregation = [
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'customerId',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    name: 1
                                }
                            }
                        ],
                        as: 'customerId'
                    }
                },
                { $unwind: "$customerId" },
                {
                    $lookup: {
                        from: 'generalbooks',
                        localField: 'generalNo',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    generalNo: 1,
                                }
                            }
                        ],
                        as: 'generalNo'
                    }
                },
                { $unwind: { path: "$generalNo", preserveNullAndEmptyArrays: true } },
                {
                    $set: {
                        customerId: "$customerId.name",
                        generalNo: "$generalNo.generalNo"
                    }
                }
            ];

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        quotations: [
                            { $match: matchFilterCriteria },
                            { $sort: sortOptions },
                            ...(customAggregation?.length > 0 ? customAggregation : []),
                            {
                                $project: {
                                    items: 0
                                }
                            }
                        ]
                    }
                }
            ];

            const [{ quotations = [] }] = await QUOTATION.aggregate(pipeline);

            return !quotations
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(quotations) });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getQuotationById: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $unwind: "$items"
                },
                {
                    $lookup: {
                        from: "customers",
                        let: { category: "$items.category", customerId: "$customerId" },
                        pipeline: [
                            {
                                $match: {
                                    isActive: true
                                }
                            },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$customerId"]
                                    }
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
                        localField: "items.company",
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
                    $unwind: { path: "$companyLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "items.category",
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
                    $unwind: { path: "$categoryLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodtypes",
                        localField: "items.plywoodType",
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
                    $unwind: { path: "$plywoodTypeLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodthicknesses",
                        localField: "items.plywoodThickness",
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
                    $unwind: { path: "$plywoodThicknessLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodsizes",
                        localField: "items.plywoodSize",
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
                        as: "plywoodSizeLabel"
                    }
                },
                {
                    $unwind: { path: "$plywoodSizeLabel", preserveNullAndEmptyArrays: true }
                },
                // Laminate
                {
                    $lookup: {
                        from: "laminatefinishes",
                        localField: "items.finish",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    finishName: 1
                                }
                            }
                        ],
                        as: "finishLabel"
                    }
                },
                {
                    $unwind: { path: "$finishLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "laminatethicknesses",
                        localField: "items.laminateThickness",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    thickness: 1
                                }
                            }
                        ],
                        as: "laminateThicknessLabel"
                    }
                },
                {
                    $unwind: { path: "$laminateThicknessLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "laminatecatalogs",
                        localField: "items.catalog",
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
                    $unwind: { path: "$catalogLabel", preserveNullAndEmptyArrays: true }
                },
                // Veneer
                {
                    $lookup: {
                        from: "veneers",
                        localField: "items.veneer",
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
                    $unwind: { path: "$veneerLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "veneersizes",
                        localField: "items.veneerSize",
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
                        as: "veneerSizeLabel"
                    }
                },
                {
                    $unwind: { path: "$veneerSizeLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "veneerlotnumbers",
                        localField: "items.lotNumber",
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
                    $unwind: { path: "$lotNumberLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $set: {
                        items: {
                            categoryName: "$categoryLabel.categoryName",
                            discountByCategory: "$discountByCategory.discount.percentage",
                            itemName: {
                                $cond: {
                                    if: { $eq: ["$items.brand", null] },
                                    then: {
                                        $cond: {
                                            if: { $ne: ["$items.catalog", null] },
                                            then: {
                                                $concat: [
                                                    "$laminateThicknessLabel.thickness",
                                                    ", ",
                                                    "$finishLabel.finishName",
                                                    " ",
                                                    "$catalogLabel.catalogSKU"
                                                ]
                                            },
                                            else: {
                                                $concat: [
                                                    "$categoryLabel.categoryName",
                                                    ", ",
                                                    "$veneerLabel.veneerName",
                                                    ", ",
                                                    {
                                                        $toString: "$veneerSizeLabel.height"
                                                    },
                                                    " x ",
                                                    {
                                                        $toString: "$veneerSizeLabel.width"
                                                    },
                                                    ", ",
                                                    "$lotNumberLabel.lotNumber"
                                                ]
                                            }
                                        }
                                    },
                                    else: {
                                        $concat: [
                                            "$plywoodThicknessLabel.thickness",
                                            ", ",
                                            {
                                                $toString: "$plywoodSizeLabel.height"
                                            },
                                            " x ",
                                            {
                                                $toString: "$plywoodSizeLabel.width"
                                            },
                                            ", ",
                                            "$plywoodTypeLabel.type",
                                            ", ",
                                            "$companyLabel.companyCode",
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $set: {
                        "items.categoryName": "$categoryLabel.categoryName",
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        quotationNo: { $first: "$quotationNo" },
                        customerId: { $first: "$customerId" },
                        quotationDate: { $first: "$quotationDate" },
                        groupByItems: { $first: "$groupByItems" },
                        broker: { $first: "$broker" },
                        items: { $push: "$items" }
                    }
                }
            ];

            const quotation = await QUOTATION.aggregate(pipeline);

            return !quotation
                ? badRequestResponse(res, { message: 'Quotation not found!' })
                : successResponse(res, { record: quotation.length > 0 ? quotation[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateQuotation: async (req, res) => {
        try {
            const {
                id,
                customerId,
                generalNo,
                broker,
                groupByItems,
                username,
                quotationDate,
                items
            } = req.body;

            const quotation = await QUOTATION.findOne({ _id: id });
            if (!quotation) return existsRequestResponse(res, { message: "Quotation not found!" });

            // Update New
            const updatedQuotation = {
                customerId,
                generalNo,
                broker,
                groupByItems,
                username,
                quotationDate,
                items
            };
            const isUpdated = await QUOTATION.findByIdAndUpdate({ _id: quotation._id }, updatedQuotation);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Quotation updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleQuotationStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const quotation = await QUOTATION.findOne({ _id: id });
            if (!quotation) return badRequestResponse(res, { message: 'Quotation not found!' });

            const isQuotationStatusChanged = await QUOTATION.findByIdAndUpdate({ _id: quotation._id }, { isActive: !quotation.isActive });
            const statusMessage = !quotation.isActive ? 'activated' : 'deactivated';

            return !isQuotationStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Quotation ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    generateQuotationById: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $unwind: "$items"
                },
                {
                    $lookup: {
                        from: "companies",
                        localField: "items.company",
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
                    $unwind: { path: "$companyLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "items.category",
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
                    $unwind: { path: "$categoryLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodtypes",
                        localField: "items.plywoodType",
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
                    $unwind: { path: "$plywoodTypeLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodthicknesses",
                        localField: "items.plywoodThickness",
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
                    $unwind: { path: "$plywoodThicknessLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodsizes",
                        localField: "items.plywoodSize",
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
                        as: "plywoodSizeLabel"
                    }
                },
                {
                    $unwind: { path: "$plywoodSizeLabel", preserveNullAndEmptyArrays: true }
                },
                // Laminate
                {
                    $lookup: {
                        from: "laminatefinishes",
                        localField: "items.finish",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    finishName: 1
                                }
                            }
                        ],
                        as: "finishLabel"
                    }
                },
                {
                    $unwind: { path: "$finishLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "laminatethicknesses",
                        localField: "items.laminateThickness",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    thickness: 1
                                }
                            }
                        ],
                        as: "laminateThicknessLabel"
                    }
                },
                {
                    $unwind: { path: "$laminateThicknessLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "laminatecatalogs",
                        localField: "items.catalog",
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
                    $unwind: { path: "$catalogLabel", preserveNullAndEmptyArrays: true }
                },
                // Veneer
                {
                    $lookup: {
                        from: "veneers",
                        localField: "items.veneer",
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
                    $unwind: { path: "$veneerLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "veneersizes",
                        localField: "items.veneerSize",
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
                        as: "veneerSizeLabel"
                    }
                },
                {
                    $unwind: { path: "$veneerSizeLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "veneerlotnumbers",
                        localField: "items.lotNumber",
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
                    $unwind: { path: "$lotNumberLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $set: {
                        items: {
                            itemName: {
                                $cond: {
                                    if: { $eq: ["$items.brand", null] },
                                    then: {
                                        $cond: {
                                            if: { $ne: ["$items.catalog", null] },
                                            then: {
                                                $concat: [
                                                    "$laminateThicknessLabel.thickness",
                                                    ", ",
                                                    "$finishLabel.finishName",
                                                    " ",
                                                    "$catalogLabel.catalogSKU"
                                                ]
                                            },
                                            else: {
                                                $concat: [
                                                    "$categoryLabel.categoryName",
                                                    ", ",
                                                    "$veneerLabel.veneerName",
                                                    ", ",
                                                    {
                                                        $toString: "$veneerSizeLabel.height"
                                                    },
                                                    " x ",
                                                    {
                                                        $toString: "$veneerSizeLabel.width"
                                                    },
                                                    ", ",
                                                    "$lotNumberLabel.lotNumber"
                                                ]
                                            }
                                        }
                                    },
                                    else: {
                                        $concat: [
                                            "$plywoodThicknessLabel.thickness",
                                            ", ",
                                            {
                                                $toString: "$plywoodSizeLabel.height"
                                            },
                                            " x ",
                                            {
                                                $toString: "$plywoodSizeLabel.width"
                                            },
                                            ", ",
                                            "$plywoodTypeLabel.type",
                                            ", ",
                                            "$companyLabel.companyCode",
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "customers",
                        localField: "customerId",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    name: 1,
                                    siteAddress: 1,
                                    phone: 1
                                }
                            }
                        ],
                        as: "customerId"
                    }
                },
                {
                    $unwind: "$customerId"
                },
                {
                    $group: {
                        _id: "$items.groupName",
                        quotationNo: { $first: "$quotationNo" },
                        customerId: { $first: "$customerId" },
                        quotationDate: { $first: "$quotationDate" },
                        items: { $push: "$items" }
                    }
                },
                {
                    $project: {
                        items: {
                            company: 0,
                            category: 0,
                            plywoodType: 0,
                            plywoodSize: 0,
                            plywoodThickness: 0,
                            brand: 0,
                            createdAt: 0,
                            updatedAt: 0,
                            isActive: 0,
                        }
                    }
                }
            ];

            const quotation = await QUOTATION.aggregate(pipeline);

            return !quotation
                ? badRequestResponse(res, { message: 'Quotation not found!' })
                : successResponse(res, { records: quotation.length > 0 ? quotation : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    generateQuotationListByItems: async (req, res) => {
        try {
            const { quotationList } = req.body;

            const pipeline = [
                { $unwind: "$items" },
                { $match: { "items._id": { $in: quotationList.map(i => (new ObjectId(i))) } } },
                {
                    $lookup: {
                        from: "customers",
                        localField: "customerId",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    name: 1,
                                    siteAddress: 1,
                                    phone: 1
                                }
                            }
                        ],
                        as: "customerId"
                    }
                },
                {
                    $unwind: "$customerId"
                },
                {
                    $lookup: {
                        from: "companies",
                        localField: "items.company",
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
                    $unwind: { path: "$companyLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "items.category",
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
                    $unwind: { path: "$categoryLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodtypes",
                        localField: "items.plywoodType",
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
                    $unwind: { path: "$plywoodTypeLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodthicknesses",
                        localField: "items.plywoodThickness",
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
                    $unwind: { path: "$plywoodThicknessLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "plywoodsizes",
                        localField: "items.plywoodSize",
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
                        as: "plywoodSizeLabel"
                    }
                },
                {
                    $unwind: { path: "$plywoodSizeLabel", preserveNullAndEmptyArrays: true }
                },
                // Laminate
                {
                    $lookup: {
                        from: "laminatefinishes",
                        localField: "items.finish",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    finishName: 1
                                }
                            }
                        ],
                        as: "finishLabel"
                    }
                },
                {
                    $unwind: { path: "$finishLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "laminatethicknesses",
                        localField: "items.laminateThickness",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    thickness: 1
                                }
                            }
                        ],
                        as: "laminateThicknessLabel"
                    }
                },
                {
                    $unwind: { path: "$laminateThicknessLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "laminatecatalogs",
                        localField: "items.catalog",
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
                    $unwind: { path: "$catalogLabel", preserveNullAndEmptyArrays: true }
                },
                // Veneer
                {
                    $lookup: {
                        from: "veneers",
                        localField: "items.veneer",
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
                    $unwind: { path: "$veneerLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "veneersizes",
                        localField: "items.veneerSize",
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
                        as: "veneerSizeLabel"
                    }
                },
                {
                    $unwind: { path: "$veneerSizeLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: "veneerlotnumbers",
                        localField: "items.lotNumber",
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
                    $unwind: { path: "$lotNumberLabel", preserveNullAndEmptyArrays: true }
                },
                {
                    $set: {
                        items: {
                            itemName: {
                                $cond: {
                                    if: { $eq: ["$items.brand", null] },
                                    then: {
                                        $cond: {
                                            if: { $ne: ["$items.catalog", null] },
                                            then: {
                                                $concat: [
                                                    "$laminateThicknessLabel.thickness",
                                                    ", ",
                                                    "$finishLabel.finishName",
                                                    " ",
                                                    "$catalogLabel.catalogSKU"
                                                ]
                                            },
                                            else: {
                                                $concat: [
                                                    "$categoryLabel.categoryName",
                                                    ", ",
                                                    "$veneerLabel.veneerName",
                                                    ", ",
                                                    {
                                                        $toString: "$veneerSizeLabel.height"
                                                    },
                                                    " x ",
                                                    {
                                                        $toString: "$veneerSizeLabel.width"
                                                    },
                                                    ", ",
                                                    "$lotNumberLabel.lotNumber"
                                                ]
                                            }
                                        }
                                    },
                                    else: {
                                        $concat: [
                                            "$plywoodThicknessLabel.thickness",
                                            ", ",
                                            {
                                                $toString: "$plywoodSizeLabel.height"
                                            },
                                            " x ",
                                            {
                                                $toString: "$plywoodSizeLabel.width"
                                            },
                                            ", ",
                                            "$plywoodTypeLabel.type",
                                            ", ",
                                            "$companyLabel.companyCode",
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$items.groupName",
                        quotationNo: { $first: "$quotationNo" },
                        quotationId: { $first: "$_id" },
                        customerId: { $first: '$customerId' },
                        quotationDate: { $first: '$quotationDate' },
                        items: { $push: "$items" }
                    }
                },
                {
                    $project: {
                        quotationId: 1,
                        quotationNo: 1,
                        customerId: 1,
                        quotationDate: 1,
                        items: {
                            _id: 1,
                            minimumMRP: 1,
                            maximumMRP: 1,
                            prices: 1,
                            customerMRP: 1,
                            quantity: 1,
                            totalPrice: 1,
                            groupName: 1,
                            GST: 1,
                            HSNCode: 1,
                            itemName: 1
                        }
                    }
                }
            ];

            const generateQuotationItems = await QUOTATION.aggregate(pipeline);

            return !generateQuotationItems
                ? badRequestResponse(res, { message: 'Quotation not found!' })
                : successResponse(res, { records: cloneDeep(generateQuotationItems) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    createAndPreviewQuotation: async (req, res) => {
        try {
            const {
                customerId,
                generalNo,
                broker,
                groupByItems,
                username,
                quotationDate,
                items
            } = req.body;

            // Quotation No.
            const quotations = await QUOTATION.find({});
            const quotationNo = `Q${new Date().getFullYear()}${(quotations.length + 1).toString().padStart(2, '0')}`;

            // Create New
            const quotation = {
                quotationNo,
                customerId,
                generalNo,
                broker,
                groupByItems,
                username,
                quotationDate,
                items
            };
            const isCreated = await QUOTATION.create(quotation);

            const itemsId = isCreated.items?.map(i => i._id)

            return !itemsId
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Quotation created successfully.', itemsId });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateAndPreviewQuotation: async (req, res) => {
        try {
            const {
                id,
                customerId,
                generalNo,
                broker,
                groupByItems,
                username,
                quotationDate,
                items
            } = req.body;

            const quotation = await QUOTATION.findOne({ _id: id });
            if (!quotation) return existsRequestResponse(res, { message: "Quotation not found!" });

            // Update
            const updatedQuotation = {
                customerId,
                generalNo,
                broker,
                groupByItems,
                username,
                quotationDate,
                items
            };
            const isUpdated = await QUOTATION.findByIdAndUpdate({ _id: quotation._id }, updatedQuotation, { new: true });

            const itemsId = isUpdated?.items?.map(i => i._id);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Quotation updated successfully.', itemsId });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    quotationOptions: async (req, res) => {
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
                        quotationNo: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$quotationNo"
                    }
                }
            ];

            const quotationOptions = await QUOTATION.aggregate(pipeline);

            return !quotationOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(quotationOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
}