// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const CATALOG = require('../models/laminateCatalogSchema');
const FINISH = require('../models/laminateFinishSchema');
const LAMINATEITEM = require('../models/laminateItemSchema');
const MRPDETAILS = require('../models/mrpCalculatorSchema');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');
const { basicCalculation } = require('../utils/basicCalculation');

exports.finish = {
    createLaminateFinish: async (req, res) => {
        try {
            const {
                category,
                company,
                catalog,
                priceBase,
                finishList
            } = req.body;

            // Get Price By Catalog
            const catalogBasePrice = await CATALOG.findOne({ _id: catalog });

            // Function to get the next available finish number postfix
            const getNextPostfix = async () => {
                const postfixAggregation = await FINISH.aggregate([
                    {
                        $group: {
                            _id: null,
                            maxValue: { $max: "$postfix" }
                        }
                    }
                ]);

                const currentMaxPostfix = postfixAggregation.length > 0 ? postfixAggregation[0].maxValue : 0;
                return currentMaxPostfix;
            };

            if (finishList?.length > 0) {
                const currentMaxPostfix = await getNextPostfix();
                let nextPostfix = currentMaxPostfix + 1;

                const createPromises = finishList.map(async (item) => {
                    try {
                        // Check for duplicate finish
                        const checkDuplicateRecord = await FINISH.findOne({
                            company,
                            catalog,
                            finishName: item.finishName,
                            thickness: item.thickness,
                            isActive: true
                        });

                        if (checkDuplicateRecord) {
                            return { status: 'exist', message: "Finish already exists!" };
                        }

                        // Generate a unique finish number
                        const postfix = nextPostfix++;
                        const finishNo = `F${postfix.toString().padStart(3, '0')}`;

                        // Create new finish record
                        await FINISH.create({
                            finishNo,
                            category,
                            company,
                            catalog,
                            priceBase,
                            finishName: item.finishName,
                            thickness: item.thickness,
                            price: priceBase === "finish" ? item.price : catalogBasePrice?.price,
                            postfix
                        });

                        return { status: 'success' };
                    } catch (error) {
                        return { status: 'failed', message: error.message };
                    }
                });

                const results = await Promise.all(createPromises);

                const failedRecords = results.filter(result => result.status !== 'success');

                return failedRecords.length > 0
                    ? badRequestResponse(res, { message: `Error while creating records. ${createPromises?.length - failedRecords?.length} records created successfully, ${failedRecords?.length} records already exist.` })
                    : successResponse(res, { message: 'Finish created successfully.' });
            }

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listLaminateFinish: async (req, res) => {
        try {
            const { sortBy, order, page, pageSize } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            // Aggregation Pipeline
            const customAggregation = [
                {
                    $lookup: {
                        from: 'companies',
                        localField: 'company',
                        foreignField: '_id',
                        as: 'company',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    companyName: 1,
                                },
                            },
                        ]
                    }
                },
                {
                    $unwind: { path: '$company' }
                },
                {
                    $set: { company: "$company.companyName" }
                },
                {
                    $lookup: {
                        from: 'laminatecatalogs',
                        localField: 'catalog',
                        foreignField: '_id',
                        as: 'catalog',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    catalogName: 1,
                                },
                            },
                        ]
                    }
                },
                {
                    $unwind: { path: '$catalog' }
                },
                {
                    $set: { catalog: "$catalog.catalogName" }
                },
                {
                    $lookup: {
                        from: 'laminatethicknesses',
                        localField: 'thickness',
                        foreignField: '_id',
                        as: 'thickness',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    thickness: 1,
                                },
                            },
                        ]
                    }
                },
                {
                    $unwind: { path: '$thickness' }
                },
                {
                    $set: { thickness: "$thickness.thickness" }
                }
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline({}, sortOptions, page, pageSize, customAggregation);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        finishes: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ finishes = [], totalRecords = 0 }] = await FINISH.aggregate(pipeline);

            return !finishes
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(finishes), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateLaminateFinish: async (req, res) => {
        try {
            const {
                id,
                price
            } = req.body;

            const finish = await FINISH.findOne({ _id: id });
            if (!finish) return existsRequestResponse(res, { message: 'Finish not found!' });

            // Update New
            const isUpdated = await FINISH.findByIdAndUpdate({ _id: finish._id }, { price }, { new: true });
            if (!isUpdated) return badRequestResponse(res, { message: 'Failed to update finish details!' });

            if (isUpdated.priceBase === 'catalog') {
                const catalog = await CATALOG.findOne({ _id: isUpdated.catalog });
                if (!catalog) return badRequestResponse(res, { message: 'Catalog not found!' });

                // Update catalog base price in finish module
                const getFinishByCatalogId = await FINISH.find({ catalog: catalog._id });

                const updatePromises = getFinishByCatalogId?.map(async (item) => {
                    try {
                        const updatedItem = await FINISH.findByIdAndUpdate(item._id, { price });

                        return !updatedItem
                            ? { id: item._id, status: 'failed', message: 'Failed to update item!' }
                            : { id: item._id, status: 'success', message: 'Finish updated successfully.' }

                    } catch (error) {
                        return { id: item._id, status: 'failed', message: 'Error updating item!' };
                    }
                });
                const results = await Promise.all(updatePromises);

                const failedRecords = results.filter(result => result.status === 'failed');
                if (failedRecords?.length > 0) return badRequestResponse(res, { message: 'Failed to update finish price!' });

                // Update catalog module price 
                const updatedCatalog = await CATALOG.findByIdAndUpdate({ _id: catalog._id }, { price });
                if (!updatedCatalog) return badRequestResponse(res, { message: 'Failed to update catalog price!' });

            }

            // Update purchase price of Items
            let itemList;
            if (isUpdated.priceBase === 'finish') {
                itemList = await LAMINATEITEM.find(
                    {
                        $and: [
                            { company: isUpdated.company, category: isUpdated.category, catalog: isUpdated.catalog, finish: isUpdated._id, thickness: isUpdated.thickness }
                        ]
                    }
                );
            } else {
                itemList = await LAMINATEITEM.find({ catalog: isUpdated.catalog });
            }

            const mrpDetails = await MRPDETAILS.findOne({ company: isUpdated.company, category: isUpdated.category, catalog: isUpdated.catalog });

            const updatePromises = itemList.map(async (item) => {
                try {
                    const calculateMRP = basicCalculation(isUpdated.price, mrpDetails);

                    const updatedItem = await LAMINATEITEM.findByIdAndUpdate(item._id, {
                        purchasePrice: isUpdated.price,
                        minimumMRP: calculateMRP[0]?.minimumMRP,
                        maximumMRP: calculateMRP[0]?.maximumMRP,
                        prices: calculateMRP[0]?.prices
                    });

                    return !updatedItem
                        ? { id: item._id, status: 'failed', message: 'Failed to update item!' }
                        : { id: item._id, status: 'success', message: 'Finish updated successfully.' }

                } catch (error) {
                    return { id: item._id, status: 'failed', message: 'Error updating item!' };
                }
            });

            const results = await Promise.all(updatePromises);

            const failedRecords = results.filter(result => result.status === 'failed');

            return failedRecords.length > 0
                ? badRequestResponse(res, { message: `Error while updating records. ${itemList.length - failedRecords.length} records updated successfully, ${failedRecords.length} failed.` })
                : successResponse(res, { message: 'Finish updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleLaminateFinishStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const finish = await FINISH.findOne({ _id: id });
            if (!finish) return badRequestResponse(res, { message: 'Finish not found!' });

            const isLaminateFinishStatusChanged = await FINISH.findByIdAndUpdate({ _id: finish._id }, { isActive: !finish.isActive });
            const statusMessage = !finish.isActive ? 'activated' : 'deactivated';

            return !isLaminateFinishStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Finish ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    finishByCatalogOptions: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        catalog: new ObjectId(id)
                    }
                },
                {
                    $project: {
                        value: "$_id",
                        label: "$finishName",
                        _id: 0
                    }
                }
            ];

            const finishByCatalogOptions = await FINISH.aggregate(pipeline);

            return !finishByCatalogOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: finishByCatalogOptions });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}