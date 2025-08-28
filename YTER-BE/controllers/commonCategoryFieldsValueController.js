// Schema
const COMMON_FIELDS_VALUE = require('../models/commonCategoriesFieldsValueSchema');

// Mongo DB
const { ObjectId } = require("mongodb");

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { buildAggregationPipeline, cloneDeep, sortColumn, buildFilterCriteriaPipeline } = require('../lib/commonQueries');

exports.commonFieldsValue = {
    createFieldsValue: async (req, res) => {
        try {
            const {
                category,
                fields,
                subField
            } = req.body;

            const createFieldsValue = {
                category,
                fields,
                subField
            }

            const isCreated = await COMMON_FIELDS_VALUE.create(createFieldsValue);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: "Fields created successfully!" });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listFieldsValue: async (req, res) => {
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
                {
                    $project: {
                        category: "$category.category",
                        fields: 1,
                        subField: 1,
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
                        commonFieldsValues: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ commonFieldsValues = [], totalRecords = 0 }] = await COMMON_FIELDS_VALUE.aggregate(pipeline);

            return !commonFieldsValues
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(commonFieldsValues), totalRecords: totalRecords[0]?.count || 0 });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getFieldsValue: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0
                    }
                }
            ];

            const fieldsValue = await COMMON_FIELDS_VALUE.aggregate(pipeline);

            return !fieldsValue
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: fieldsValue.length > 0 ? fieldsValue[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateFieldsValue: async (req, res) => {
        try {
            const {
                id,
                category,
                fields,
                subField
            } = req.body;

            // Check Exist or Not
            const item = await COMMON_FIELDS_VALUE.findOne({ _id: id, isActive: true });
            if (!item) return badRequestResponse(res, { message: "Field not found!" });

            const updatedFieldsValue = {
                category,
                fields,
                subField
            }
            const isUpdated = await COMMON_FIELDS_VALUE.findByIdAndUpdate({ _id: id }, updatedFieldsValue);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Fields updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleFieldsValueStatus: async (req, res) => {
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
    },
    itemsByCategory: async (req, res) => {
        try {
            const { category } = req.query;

            const getCategories = await COMMON_FIELDS_VALUE.find({ category, isActive: true });
            if (!getCategories) return badRequestResponse(res, { message: 'Category not found!' })

            const generateItemNames = async (data) => {
                const baseFields = await Promise.all(
                    data.fields.map(async (field) => ({
                        field: field.field,
                        value: field._id
                    }))
                );

                const itemNameBase = data.fields.map(field => field.value).join(', ');

                return await Promise.all(
                    data.subField.values.map(async (size) => ({
                        itemName: `${itemNameBase}, ${size.value}`,
                        category,
                        fields: [
                            ...baseFields,
                            {
                                field: data.subField.field,
                                value: size._id
                            }
                        ]
                    }))
                );
            };

            const results = await Promise.all(
                getCategories.map(async (category) => generateItemNames(category))
            );

            const flattenedResults = results.flat();

            return !flattenedResults.length
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: flattenedResults });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}