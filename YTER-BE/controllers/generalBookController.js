// Schema
const GENERALBOOK = require('../models/generalBookSchema');
const CUSTOMER = require('../models/customerSchema');

const { ObjectId } = require('mongodb');

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildFilterCriteriaPipeline } = require('../lib/commonQueries');

exports.generalBook = {
    createGeneralBook: async (req, res) => {
        try {
            const {
                customerId,
                broker,
                groupByItems,
                items
            } = req.body;

            // General No.
            const generalBooks = await GENERALBOOK.find({});
            const generalNo = `GB${new Date().getFullYear()}${(generalBooks.length + 1).toString().padStart(2, '0')}`;

            // Customer No.
            const customer = await CUSTOMER.aggregate([{ $match: { _id: new ObjectId(customerId) } }])

            // Create New
            const generalBook = {
                customerId,
                customerNo: customer?.length ? customer[0].phone : '',
                broker,
                generalNo,
                generalBookDate: Date.now(),
                groupByItems,
                items
            };
            const isCreated = await GENERALBOOK.create(generalBook);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'General book created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listGeneralBook: async (req, res) => {
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
                        from: 'customers',
                        localField: 'broker',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    customerType: 1
                                }
                            }
                        ],
                        as: 'broker'
                    }
                },
                {
                    $set: {
                        broker: {
                            $cond: {
                                if: { $ne: [{ $size: "$broker" }, 0] },
                                then: "$broker",
                                else: null
                            }
                        }
                    }
                },
                { $unwind: { path: "$broker", preserveNullAndEmptyArrays: true } },
                {
                    $set: {
                        customerId: "$customerId.name",
                        broker: {
                            $cond: {
                                if: { $ne: ["$broker", null] },
                                then: "$broker.customerType",
                                else: ''
                            }
                        },
                        generalBookDate: {
                            $concat: [
                                { $toString: { $dayOfMonth: "$generalBookDate" } }, "-",
                                { $toString: { $month: "$generalBookDate" } }, "-",
                                { $toString: { $year: "$generalBookDate" } }
                            ]
                        }
                    }
                }
            ];

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        generalBooks: [
                            { $match: matchFilterCriteria },
                            { $sort: sortOptions },
                            ...(customAggregation?.length > 0 ? customAggregation : []),
                            {
                                $project: {
                                    items: 0,
                                    groupByItems: 0
                                }
                            }
                        ]
                    }
                }
            ];

            const [{ generalBooks = [] }] = await GENERALBOOK.aggregate(pipeline);

            return !generalBooks
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(generalBooks) });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getGeneralBookById: async (req, res) => {
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
                },
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
                            categoryName: "$categoryLabel.categoryName",
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
                        _id: '$_id',
                        generalNo: { $first: '$generalNo' },
                        customerId: { $first: '$customerId' },
                        customerNo: { $first: '$customerNo' },
                        broker: { $first: '$broker' },
                        generalBookDate: { $first: '$generalBookDate' },
                        groupByItems: { $first: '$groupByItems' },
                        items: {
                            $push: "$items"
                        }
                    }
                },
                {
                    $project: {
                        items: {
                            createdAt: 0,
                            updatedAt: 0,
                            isActive: 0
                        }
                    }
                }
            ];

            const generalBook = await GENERALBOOK.aggregate(pipeline);

            return !generalBook
                ? badRequestResponse(res, { message: 'General book not found!' })
                : successResponse(res, { record: generalBook.length > 0 ? generalBook[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateGeneralBook: async (req, res) => {
        try {
            const {
                id,
                customerId,
                broker,
                groupByItems,
                items
            } = req.body;

            // Check Exist or Not
            const generalBook = await GENERALBOOK.findOne({ _id: id });
            if (!generalBook) return badRequestResponse(res, { message: 'General book not found!' });

            const updatedGeneralBook = {
                customerId,
                broker,
                groupByItems,
                items
            };
            const isUpdated = await GENERALBOOK.findByIdAndUpdate({ _id: generalBook._id }, updatedGeneralBook);
            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'General book updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleGeneralBookStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const generalBook = await GENERALBOOK.findOne({ _id: id });
            if (!generalBook) return badRequestResponse(res, { message: 'General book not found!' });

            const isGeneralBookStatusChanged = await GENERALBOOK.findByIdAndUpdate({ _id: generalBook._id }, { isActive: !generalBook.isActive });
            const statusMessage = !generalBook.isActive ? 'activated' : 'deactivated';

            return !isGeneralBookStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `General book ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getQuotationItemsById: async (req, res) => {
        try {
            const { id } = req.query;

            const customAggregation = [
                { $match: { _id: new ObjectId(id) } },
                { $unwind: "$items" },
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
                        _id: null,
                        customerId: { $first: "$customerId" },
                        generalNo: { $first: "$_id" },
                        broker: { $first: "$broker" },
                        groupByItems: { $first: "$groupByItems" },
                        items: { $push: "$items" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        items: {
                            createdAt: 0,
                            updatedAt: 0,
                            isActive: 0
                        }
                    }
                }
            ];

            const items = await GENERALBOOK.aggregate(customAggregation);

            return !items
                ? badRequestResponse(res, { message: 'General book not found!' })
                : successResponse(res, { records: items?.length > 0 ? items : [] });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    generateQuotationList: async (req, res) => {
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
                    $set: {
                        quotationDate: {
                            $concat: [
                                { $toString: { $dayOfMonth: new Date() } }, "/",
                                { $toString: { $month: new Date() } }, "/",
                                { $toString: { $year: new Date() } }
                            ]
                        }
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
                                            " ",
                                            "$plywoodTypeLabel.type",
                                            " ",
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
                        customerId: { $first: '$customerId' },
                        quotationDate: { $first: '$quotationDate' },
                        items: { $push: "$items" }
                    }
                },
                {
                    $project: {
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
                            itemName: 1
                        }
                    }
                }
            ];

            const generateQuotationItems = await GENERALBOOK.aggregate(pipeline);

            return !generateQuotationItems
                ? badRequestResponse(res, { message: 'General book not found!' })
                : successResponse(res, { records: cloneDeep(generateQuotationItems) });
        } catch (error) {
            return errorResponse(error, res);
        }
    }
}