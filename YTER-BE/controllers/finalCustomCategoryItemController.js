// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const CUSTOMCATEGORYITEM = require('../models/finalCustomCategoryItemSchema');
const CUSTOMCATEGORYPRICE = require('../models/customCategoryPriceSchema');

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline } = require('../lib/commonQueries');

exports.customCategoryItem = {
    createCustomCategoryItem: async (req, res) => {
        try {
            const {
                itemList
            } = req.body;

            // Create New
            const createPromises = itemList?.map((item, index) => CUSTOMCATEGORYITEM.create(
                {
                    category: item.category,
                    priceId: item.priceId,
                    GST: item.GST,
                    HSNCode: item.HSNCode,
                    itemName: item.itemName,
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
    listCustomCategoriesItems: async (req, res) => {
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
                        customCategoriesItems: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ customCategoriesItems = [], totalRecords = 0 }] = await CUSTOMCATEGORYITEM.aggregate(pipeline);

            return !customCategoriesItems
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(customCategoriesItems), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleCustomCategoryItemStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const customCategoryItem = await CUSTOMCATEGORYITEM.findOne({ _id: id });
            if (!customCategoryItem) return badRequestResponse(res, { message: 'Item not found!' });

            const isCategoryItemStatusChanged = await CUSTOMCATEGORYITEM.findByIdAndUpdate({ _id: customCategoryItem._id }, { isActive: !customCategoryItem.isActive });
            const statusMessage = !customCategoryItem.isActive ? 'activated' : 'deactivated';

            return !isCategoryItemStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Item ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getItemsByFieldsValue: async (req, res) => {
        try {
            const { category, fieldsValue } = req.body;

            const priceDetails = await CUSTOMCATEGORYPRICE.find({ category });

            // Generate Items
            const generateItemNames = async (data) => {
                const fieldsValue = data || [];
                const result = [];

                if (!fieldsValue.length) {
                    console.error("Invalid input data:", data);
                    return [];
                }

                // Helper function to generate combinations recursively
                const generateCombinations = async (currentIndex, currentItem) => {
                    if (currentIndex === fieldsValue.length) {
                        // Create itemName based on the currentItem values
                        const itemName = currentItem
                            .map(item => item.value)
                            .filter(Boolean) // Remove any undefined or empty values
                            .join(", ");

                        result.push({
                            itemName
                        });
                        return;
                    }

                    const field = fieldsValue[currentIndex];
                    for (const value of field.values) {
                        await generateCombinations(
                            currentIndex + 1,
                            [...currentItem, { fieldName: field.fieldName, value }]
                        );
                    }
                };

                await generateCombinations(0, []);

                return result;
            };

            // Match Items
            const matchItemNamesInPrice = async (priceModule, itemsToMatch) => {
                const itemNamesToMatch = itemsToMatch.map(item => item.itemName);

                const matchedItems = priceModule.filter(item =>
                    itemNamesToMatch.includes(item.itemName)
                );

                return matchedItems;
            };

            const items = await generateItemNames(fieldsValue);
            const matchItems = await matchItemNamesInPrice(priceDetails, items);

            return !matchItems?.length
                ? badRequestResponse(res, { message: "Something went wrong!" })
                : successResponse(res, { record: matchItems });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}