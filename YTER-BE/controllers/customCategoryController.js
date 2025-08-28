// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const CUSTOMCATEGORY = require('../models/customCategorySchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { checkDuplicateRecord, cloneDeep, sortColumn } = require('../lib/commonQueries');

exports.customCategory = {
    createCustomCategory: async (req, res) => {
        try {
            const { category, fields, fieldsValue, GST, HSNCode } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(CUSTOMCATEGORY, null, [{ key: 'category', value: category.toLowerCase() }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exist!' });

            // Create New
            const customCategory = { category: category.toLowerCase(), fields, fieldsValue, GST, HSNCode };
            const isCreated = await CUSTOMCATEGORY.create(customCategory);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listCustomCategories: async (req, res) => {
        try {
            const { sortBy, order } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            // Aggregation Pipeline
            const pipeline = [
                { $match: { isActive: true } },
                { $sort: sortOptions },
                { $unwind: { path: "$fieldsValue", preserveNullAndEmptyArrays: true } },
                {
                    $unwind: { path: "$fieldsValue", preserveNullAndEmptyArrays: true }
                },
                {
                    $group: {
                        _id: "$_id",
                        category: { $first: "$category" },
                        fields: { $first: "$fields" },
                        fieldsValue: { $push: "$fieldsValue" },
                        GST: { $first: "$GST" },
                        HSNCode: { $first: "$HSNCode" }
                    }
                },
            ];

            const customCategories = await CUSTOMCATEGORY.aggregate(pipeline);

            return !customCategories
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(customCategories) });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCustomCategoryById: async (req, res) => {
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

            const customCategory = await CUSTOMCATEGORY.aggregate(pipeline);

            return !customCategory
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: customCategory.length > 0 ? customCategory[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateCustomCategory: async (req, res) => {
        try {
            const { id, category, fields, fieldsValue, GST, HSNCode } = req.body;

            // Check Exist or Not
            const customCategory = await CUSTOMCATEGORY.findOne({ _id: id });
            if (!customCategory) return badRequestResponse(res, { message: 'Category not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(CUSTOMCATEGORY, id, [{ key: 'category', value: category.toLowerCase() }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exist!' });

            // update category
            const updatedCustomCategory = { category: category.toLowerCase(), fields, fieldsValue, GST, HSNCode };
            const isUpdated = await CUSTOMCATEGORY.findByIdAndUpdate({ _id: customCategory._id }, updatedCustomCategory);

            // Change formula in Custom Category Items
            // const 

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleCustomCategoryStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const customCategory = await CUSTOMCATEGORY.findOne({ _id: id });
            if (!customCategory) return badRequestResponse(res, { message: 'Category not found!' });

            const isCategoryStatusChanged = await CUSTOMCATEGORY.findByIdAndUpdate({ _id: customCategory._id }, { isActive: !customCategory.isActive });
            const statusMessage = !customCategory.isActive ? 'activated' : 'deactivated';

            return !isCategoryStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Category ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getcustomCategoryOptions: async (req, res) => {
        try {

            const pipeline = [
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $sort: {
                        category: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$category"
                    }
                }
            ];

            const customCategoryOptions = await CUSTOMCATEGORY.aggregate(pipeline)

            return !customCategoryOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: customCategoryOptions });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getFormulaByCustomCategory: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        _id: 0,
                        fields: {
                            fieldName: 1
                        }
                    }
                }
            ];

            const formula = await CUSTOMCATEGORY.aggregate(pipeline);

            return !formula
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: formula.length > 0 ? formula[0].fields : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}