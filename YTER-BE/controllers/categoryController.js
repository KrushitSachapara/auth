// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const CATEGORY = require('../models/categorySchema');
const CATEGORYBRAND = require('../models/plywoodBrandSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { checkDuplicateRecord, cloneDeep, sortColumn } = require('../lib/commonQueries');

exports.category = {
    createCategory: async (req, res) => {
        try {
            const { categoryName, GST, HSNCode } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(CATEGORY, null, [{ key: 'categoryName', value: categoryName }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exist!' });

            // Create New
            const category = { categoryName, GST, HSNCode };
            const isCreated = await CATEGORY.create(category);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listCategories: async (req, res) => {
        try {
            const { sortBy, order } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            // Aggregation Pipeline
            const pipeline = [
                { $match: { isActive: true } },
                { $sort: sortOptions },
                { $project: { createdAt: 0, updatedAt: 0, __v: 0 } },
            ];

            const categories = await CATEGORY.aggregate(pipeline);

            return !categories
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(categories) });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCategoryById: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                { $project: { _id: 1, categoryName: 1, GST: 1, HSNCode: 1 } }
            ];

            const category = await CATEGORY.aggregate(pipeline);

            return !category
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: category.length > 0 ? category[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateCategory: async (req, res) => {
        try {
            const { id, categoryName, GST, HSNCode } = req.body;

            // Check Exist or Not
            const category = await CATEGORY.findOne({ _id: id });
            if (!category) return badRequestResponse(res, { message: 'Category not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(CATEGORY, id, [{ key: 'categoryName', value: categoryName }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exist!' });

            // update category
            const updatedCategory = { categoryName, GST, HSNCode };
            const isUpdated = await CATEGORY.findByIdAndUpdate({ _id: category._id }, updatedCategory);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleCategoryStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const category = await CATEGORY.findOne({ _id: id });
            if (!category) return badRequestResponse(res, { message: 'Category not found!' });

            const isCategoryStatusChanged = await CATEGORY.findByIdAndUpdate({ _id: category._id }, { isActive: !category.isActive });
            const statusMessage = !category.isActive ? 'activated' : 'deactivated';

            return !isCategoryStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Category ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    categoryOptions: async (req, res) => {
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
                        categoryName: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$categoryName"
                    }
                }
            ];

            const categoryOptions = await CATEGORY.aggregate(pipeline);

            return !categoryOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(categoryOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    categoryByCompanyOptions: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        company: new ObjectId(id)
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: 1
                    }
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category",
                        pipeline: [
                            {
                                $project: {
                                    categoryName: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: "$category"
                },
                {
                    $project: {
                        value: "$category._id",
                        label: "$category.categoryName"
                    }
                }
            ];

            const categoryByCompanyOptions = await CATEGORYBRAND.aggregate(pipeline);

            return !categoryByCompanyOptions
                ? badRequestResponse(res, { message: "Something went wrong!" })
                : successResponse(res, { records: categoryByCompanyOptions });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    uniqueCategoryByCompanyOptions: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $project: {
                        category: {
                            $cond: {
                                if: { $eq: ["$company", new ObjectId(id)] },
                                then: "$category",
                                else: ''
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: 0,
                        categories: { $push: "$category" }
                    }
                },
                {
                    $lookup: {
                        from: "categories",
                        let: {
                            categoriesArray: "$categories",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $not: {
                                            $in: ["$_id", "$$categoriesArray"]
                                        }
                                    },
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    value: "$_id",
                                    label: "$categoryName"
                                }
                            }
                        ],
                        as: "uniqueCategories"
                    }
                },
                {
                    $unwind: "$uniqueCategories"
                },
                {
                    $project: {
                        value: "$uniqueCategories.value",
                        label: "$uniqueCategories.label"
                    }
                }
            ];

            const uniqueCategoryByCompanyOptions = await CATEGORYBRAND.aggregate(pipeline);

            return !uniqueCategoryByCompanyOptions
                ? badRequestResponse(res, { message: "Something went wrong!" })
                : successResponse(res, { records: uniqueCategoryByCompanyOptions });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}