// Schema
const CUSTOMCATEGORYITEM = require('../models/newCustomItemSchema');

// MongoDB
const { ObjectId } = require('mongodb');

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { buildFilterCriteriaPipeline, buildAggregationPipeline, cloneDeep } = require('../lib/commonQueries');

exports.item = {
    createItem: async (req, res) => {
        try {
            const {
                itemList
            } = req.body;

            const createPromises = itemList?.map((item, index) => CUSTOMCATEGORYITEM.create(
                {
                    category: item.category,
                    GST: item.GST,
                    HSNCode: item.HSNCode,
                    fields: item.fields,
                    purchasePrice: item.purchasePrice
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
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $lookup: {
                        from: "newcustomcategories",
                        localField: "category",
                        foreignField: "_id",
                        as: "categoryDetails"
                    }
                },
                {
                    $unwind: "$categoryDetails"
                },
                {
                    $project: {
                        GST: 1,
                        HSNCode: 1,
                        category: "$categoryDetails.category",
                        purchasePrice: 1,
                        fields: {
                            $map: {
                                input: "$fields",
                                as: "field",
                                in: {
                                    field: "$$field.field",
                                    value: {
                                        $let: {
                                            vars: {
                                                matchingFieldValue: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input:
                                                                    "$categoryDetails.fieldsValue",
                                                                as: "fieldValue",
                                                                cond: {
                                                                    $eq: [
                                                                        "$$fieldValue.fieldName",
                                                                        "$$field.field"
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            },
                                            in: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input:
                                                                "$$matchingFieldValue.values",
                                                            as: "val",
                                                            cond: {
                                                                $eq: [
                                                                    "$$val._id",
                                                                    "$$field.value"
                                                                ]
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        GST: 1,
                        HSNCode: 1,
                        category: 1,
                        purchasePrice: 1,
                        fields: {
                            $map: {
                                input: "$fields",
                                as: "field",
                                in: {
                                    field: "$$field.field",
                                    value: "$$field.value.value"
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        GST: 1,
                        HSNCode: 1,
                        category: 1,
                        purchasePrice: 1,
                        itemName: {
                            $reduce: {
                                input: "$fields",
                                initialValue: "",
                                in: {
                                    $concat: [
                                        "$$value",
                                        {
                                            $cond: {
                                                if: { $eq: ["$$value", ""] },
                                                then: "",
                                                else: ", "
                                            }
                                        },
                                        "$$this.value"
                                    ]
                                }
                            }
                        }
                    }
                }
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, { createdAt: 1 }, page, pageSize, customAggregation);

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
    getItemsById: async (req, res) => {
        try {
            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                {
                    $match: {
                        category: new ObjectId(id)
                    }
                },
                {
                    $lookup: {
                        from: "newcustomcategories",
                        localField: "category",
                        foreignField: "_id",
                        as: "categoryDetails"
                    }
                },
                {
                    $unwind: "$categoryDetails"
                },
                {
                    $project: {
                        GST: 1,
                        HSNCode: 1,
                        category: 1,
                        purchasePrice: 1,
                        fields: {
                            $map: {
                                input: "$fields",
                                as: "field",
                                in: {
                                    field: "$$field.field",
                                    value: {
                                        $let: {
                                            vars: {
                                                matchingFieldValue: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input:
                                                                    "$categoryDetails.fieldsValue",
                                                                as: "fieldValue",
                                                                cond: {
                                                                    $eq: [
                                                                        "$$fieldValue.fieldName",
                                                                        "$$field.field"
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            },
                                            in: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input:
                                                                "$$matchingFieldValue.values",
                                                            as: "val",
                                                            cond: {
                                                                $eq: [
                                                                    "$$val._id",
                                                                    "$$field.value"
                                                                ]
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        GST: 1,
                        HSNCode: 1,
                        category: 1,
                        purchasePrice: 1,
                        fields: {
                            $map: {
                                input: "$fields",
                                as: "field",
                                in: {
                                    field: "$$field.field",
                                    value: "$$field.value.value"
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        GST: 1,
                        HSNCode: 1,
                        category: 1,
                        purchasePrice: 1,
                        itemName: {
                            $reduce: {
                                input: "$fields",
                                initialValue: "",
                                in: {
                                    $concat: [
                                        "$$value",
                                        {
                                            $cond: {
                                                if: { $eq: ["$$value", ""] },
                                                then: "",
                                                else: ", "
                                            }
                                        },
                                        "$$this.value"
                                    ]
                                }
                            }
                        }
                    }
                }
            ];

            const items = await CUSTOMCATEGORYITEM.aggregate(pipeline);

            return !items
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: items });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateItem: async (req, res) => {
        try {
            const {
                itemList
            } = req.body;

            const updatePromises = itemList?.map((item, index) => CUSTOMCATEGORYITEM.findByIdAndUpdate(
                { _id: item.id },
                {
                    category: item.category,
                    GST: item.GST,
                    HSNCode: item.HSNCode,
                    fields: item.fields,
                    purchasePrice: item.purchasePrice
                }
            )
                .then(() => ({ status: 'success' }))
                .catch((error) => ({ status: 'failed', error, index }))
            );

            const results = await Promise.all(updatePromises);

            const failedRecords = results?.filter(result => result?.status === 'failed');

            return failedRecords.length > 0
                ? badRequestResponse(res, { message: `Error while creating records. ${itemList?.length - failedRecords?.length} records created successfully, ${failedRecords?.length} failed.` })
                : successResponse(res, { message: "Item updated successfully!" });

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
    }
}