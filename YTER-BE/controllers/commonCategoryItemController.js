// Schema
const COMMONITEMS = require('../models/commonCategoryItemSchema');

// Mongo DB
const { ObjectId } = require("mongodb");

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { buildAggregationPipeline, cloneDeep, sortColumn, buildFilterCriteriaPipeline } = require('../lib/commonQueries');

exports.commonItem = {
    createItem: async (req, res) => {
        try {
            const { itemList } = req.body;

            const createPromises = itemList?.map((item, index) => COMMONITEMS.create(
                {
                    ...item
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
                sortBy,
                order,
                page,
                pageSize
            } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            // Filter
            const matchFilterCriteria = await buildFilterCriteriaPipeline(filter);

            // Aggregation
            const customAggregation = [
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            // Aggregation
            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        commonFieldsValues: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ commonFieldsValues = [], totalRecords = 0 }] = await COMMONITEMS.aggregate(pipeline);

            return !commonFieldsValues
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(commonFieldsValues), totalRecords: totalRecords[0]?.count || 0 });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleItemStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const commonFieldsValue = await COMMON_FIELDS_VALUE.findOne({ _id: id });
            if (!commonFieldsValue) return badRequestResponse(res, { message: "Field not found!" });

            const isFieldStatusChanged = await COMMON_FIELDS_VALUE.findByIdAndUpdate({ _id: commonFieldsValue._id }, { isActive: !commonFieldsValue.isActive });
            const statusMessage = !commonFieldsValue.isActive ? 'activated' : 'deactivated';

            return !isFieldStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Field ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}