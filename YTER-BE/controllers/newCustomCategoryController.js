// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const CUSTOMCATEGORY = require('../models/newCustomCategorySchema');
const CUSTOMCATEGORYITEMS = require('../models/newCustomItemSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { checkDuplicateRecord, cloneDeep, sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline } = require('../lib/commonQueries');

exports.customCategory = {
    createCustomCategory: async (req, res) => {
        try {
            const { category, fields, fieldsValue, GST, HSNCode } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await CUSTOMCATEGORY.findOne({ category: category.toLowerCase(), isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exist!' });

            // Create New
            const customCategory = { category: category.toLowerCase(), fields, fieldsValue, GST, HSNCode };
            const isCreated = await CUSTOMCATEGORY.create(customCategory);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category created successfully.', id: isCreated._id });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listCustomCategories: async (req, res) => {
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

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        customCategories: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ customCategories = [], totalRecords = 0 }] = await CUSTOMCATEGORY.aggregate(pipeline);

            return !customCategories
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(customCategories), totalRecords: totalRecords[0]?.count || 0 });

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

            // Check if the category exists
            const customCategory = await CUSTOMCATEGORY.findOne({ _id: id });
            if (!customCategory) return badRequestResponse(res, { message: 'Category not found!' });

            const oldCustomCategoryValues = customCategory.fieldsValue.map((item) => {
                return item.values.map((innerItem) => {
                    return String(innerItem._id)
                })
            }).flat()

            // Check for duplicate category
            const isCaseInsensitiveDuplicateRecord = await CUSTOMCATEGORY.findOne({ _id: { $ne: id }, category: category.toLowerCase(), isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Category already exists!' });

            // Update the custom category
            const updatedCustomCategory = { category: category.toLowerCase(), fields, fieldsValue, GST, HSNCode };
            const isUpdated = await CUSTOMCATEGORY.findByIdAndUpdate({ _id: customCategory._id }, updatedCustomCategory, { new: true });

            const newCustomCategoryValues = isUpdated.fieldsValue.map((item) => {
                return item.values.map((innerItem) => {
                    return String(innerItem._id)
                })
            }).flat()

            const itemToDelete = oldCustomCategoryValues.filter(i => !newCustomCategoryValues.includes(i))

            // Convert strings to ObjectId
            const objectIds = itemToDelete?.map(value => new ObjectId(value));

            await CUSTOMCATEGORYITEMS.deleteMany({
                "fields.value": { $in: objectIds }
            });

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Category updated successfully.', oldCustomCategoryValues, newCustomCategoryValues, itemToDelete });
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

            const findCustomCategory = await CUSTOMCATEGORYITEMS.findOne({ category: id });
            if (findCustomCategory) return badRequestResponse(res, { message: `You can't delete ${customCategory.category} category, because ${customCategory.category} category is use in item!` });

            const isCategoryStatusChanged = await CUSTOMCATEGORY.findByIdAndUpdate({ _id: customCategory._id }, { isActive: !customCategory.isActive });
            const statusMessage = !customCategory.isActive ? 'activated' : 'deactivated';

            return !isCategoryStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Category ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    generateItemsByCategory: async (req, res) => {
        try {
            const { id } = req.query;

            const customCategoryDetails = await CUSTOMCATEGORY.findOne({ _id: id });
            if (!customCategoryDetails) return badRequestResponse(res, { message: "Category not found!" });

            const generateItemNames = async (data) => {
                const fieldsValue = data.fieldsValue;
                const result = [];
                const fieldOrder = data.fields.map(field => field.fieldName); // Extract the desired field order

                // Helper function to generate combinations recursively
                const generateCombinations = async (currentFields, currentIndex, currentItem) => {
                    if (currentIndex === fieldsValue.length) {
                        // Create itemName based on the specified field order
                        const itemName = fieldOrder
                            .map(orderField => {
                                const matchedField = currentItem.find(item => item.fieldName === orderField);
                                return matchedField ? matchedField.value : "";
                            })
                            .filter(Boolean) // Remove any undefined or empty values
                            .join(", ");

                        result.push({
                            category: data._id,
                            GST: data.GST,
                            HSNCode: data.HSNCode,
                            itemName,
                            fields: currentItem.map(item => ({
                                field: item.fieldName,
                                value: item?.id
                            }))
                        });
                        return;
                    }

                    const field = fieldsValue[currentIndex];
                    for (const value of field.values) {
                        await generateCombinations(
                            currentFields,
                            currentIndex + 1,
                            [...currentItem, { fieldName: field.fieldName, value: value.value, id: value._id }]
                        );
                    }
                };

                try {
                    await generateCombinations(fieldsValue, 0, []);
                } catch (error) {
                    console.error("Error generating item names:", error);
                    throw error;
                }

                return result;
            };

            // Generate new items
            const generatedItems = await generateItemNames(customCategoryDetails)
            const getItemsByCategory = await CUSTOMCATEGORYITEMS.find({ category: id, isActive: true });

            const uniqueItems = generatedItems?.filter((newItem) => {
                return !getItemsByCategory?.some((existingItem) => {
                    // Check if categories are the same
                    const isCategoryMatch = newItem.category.toString() === existingItem.category.toString();

                    // Check if fields arrays match
                    const areFieldsMatch =
                        newItem.fields.length === existingItem.fields.length &&
                        newItem.fields.every((field) =>
                            existingItem.fields.some(
                                (existingField) =>
                                    field.field === existingField.field && field.value.toString() === existingField.value.toString()
                            )
                        );

                    return isCategoryMatch && areFieldsMatch;
                });
            });


            return uniqueItems?.length === 0
                ? badRequestResponse(res, { message: "No new unique items found!" })
                : successResponse(res, { record: uniqueItems });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    customCategoryOptions: async (req, res) => {
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

            const categoryOptions = await CUSTOMCATEGORY.aggregate(pipeline);

            return !categoryOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(categoryOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
}