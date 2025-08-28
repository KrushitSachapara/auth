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

exports.catalog = {
    createLaminateCatalog: async (req, res) => {
        try {
            const {
                category,
                company,
                catalogName,
                priceBase,
                price
            } = req.body;

            // Function to get the next available catalog postfix
            const getNextPostfix = async () => {
                const postfixAggregation = await CATALOG.aggregate([
                    {
                        $group: {
                            _id: null,
                            maxValue: { $max: "$postfix" }
                        }
                    }
                ]);

                const postfix = postfixAggregation.length > 0 ? postfixAggregation[0].maxValue + 1 : 1;
                const catalogNo = `C${postfix.toString().padStart(3, '0')}`;

                return { catalogNo, postfix };
            };

            const { catalogNo, postfix } = await getNextPostfix();

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await CATALOG.findOne({ company, catalogName, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Catalog already exist!' });

            // Create New
            const catalog = {
                catalogNo,
                category,
                company,
                catalogName,
                priceBase,
                price,
                catalogSKU: `C${Math.ceil(Math.random() * 1000).toString().padStart(3, "0")}`,
                postfix
            };
            const isCreated = await CATALOG.create(catalog);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Catalog created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listLaminateCatalog: async (req, res) => {
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
                }
            ];

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline({}, sortOptions, page, pageSize, customAggregation);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        catalogs: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ catalogs = [], totalRecords = 0 }] = await CATALOG.aggregate(pipeline);

            return !catalogs
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(catalogs), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getLaminateCatalogById: async (req, res) => {
        try {

            const { id } = req.query;

            // Aggregation Pipeline
            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        isActive: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0,
                    }
                }
            ];

            const catalog = await CATALOG.aggregate(pipeline);

            return !catalog
                ? badRequestResponse(res, { message: 'Plywood size not found!' })
                : successResponse(res, { record: catalog.length > 0 ? catalog[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateLaminateCatalog: async (req, res) => {
        try {
            const {
                id,
                category,
                company,
                catalogName,
                priceBase,
                price
            } = req.body;

            const catalog = await CATALOG.findOne({ _id: id });
            if (!catalog) return existsRequestResponse(res, { message: 'Catalog not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await CATALOG.findOne({ _id: { $ne: id }, company, catalogName, isActive: true });
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Catalog already exist!' });

            // Create New
            const updatedCatalog = {
                category,
                company,
                catalogName,
                priceBase,
                price
            };
            const isUpdated = await CATALOG.findByIdAndUpdate({ _id: catalog._id }, updatedCatalog);
            if (!isUpdated) return badRequestResponse(res, { message: 'Failed to update catalog details!' })

            // Update Finish Price 
            const finishList = await FINISH.find({ catalog: id });
            if (finishList?.length > 0) {
                const updateFinishPromises = finishList.map(async (item) => {
                    try {
                        const updatedFinish = await FINISH.findByIdAndUpdate(item._id, { price: price });

                        return !updatedFinish
                            ? { id: item._id, status: 'failed', message: 'Failed to update finish!' }
                            : { id: item._id, status: 'success', message: 'Finish updated successfully.' }

                    } catch (error) {
                        return { id: item._id, status: 'failed', message: 'Error updating item!' };
                    }
                });
                const updatedFinish = await Promise.all(updateFinishPromises);
                const failedFinishRecords = updatedFinish.filter(result => result.status === 'failed');
                if (failedFinishRecords?.length > 0) return badRequestResponse(res, { message: 'Failed to update finish details!' });
            }

            // Update purchase price of Items
            const itemList = await LAMINATEITEM.find({ catalog: catalog._id });

            const mrpDetails = await MRPDETAILS.findOne({ company, category, catalog: catalog._id });

            const updateItemPromises = itemList.map(async (item) => {
                try {
                    const calculateMRP = basicCalculation(price, mrpDetails);

                    const updatedItem = await LAMINATEITEM.findByIdAndUpdate(item._id, {
                        purchasePrice: price,
                        minimumMRP: calculateMRP[0]?.minimumMRP,
                        maximumMRP: calculateMRP[0]?.maximumMRP,
                        prices: calculateMRP[0]?.prices
                    });

                    return !updatedItem
                        ? { id: item._id, status: 'failed', message: 'Failed to update item!' }
                        : { id: item._id, status: 'success', message: 'Catalog updated successfully.' }

                } catch (error) {
                    return { id: item._id, status: 'failed', message: 'Error updating item!' };
                }
            });

            const results = await Promise.all(updateItemPromises);

            const failedRecords = results.filter(result => result.status === 'failed');

            return failedRecords.length > 0
                ? badRequestResponse(res, { message: `Error while updating records. ${itemList.length - failedRecords.length} records updated successfully, ${failedRecords.length} failed.` })
                : successResponse(res, { message: 'Catalog updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleLaminateCatalogStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const catalog = await CATALOG.findOne({ _id: id });
            if (!catalog) return badRequestResponse(res, { message: 'Catalog not found!' });

            const isLaminateCatalogStatusChanged = await CATALOG.findByIdAndUpdate({ _id: catalog._id }, { isActive: !catalog.isActive });
            const statusMessage = !catalog.isActive ? 'activated' : 'deactivated';

            return !isLaminateCatalogStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Catalog ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    catalogOptions: async (req, res) => {
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
                        catalogName: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$catalogName"
                    }
                }
            ];

            const catalogOptions = await CATALOG.aggregate(pipeline);

            return !catalogOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(catalogOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    catalogNameByCompanyOptions: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        company: new ObjectId(id)
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$catalogName"
                    }
                }
            ];

            const catalogNameByCompanyOptions = await CATALOG.aggregate(pipeline);

            return !catalogNameByCompanyOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: catalogNameByCompanyOptions });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    companyByCatalogNameOptions: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        _id: new ObjectId(id)
                    }
                },
                {
                    $project: {
                        _id: 0,
                        company: 1,
                    }
                },
                {
                    $lookup: {
                        from: "companies",
                        let: { company: "$company" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$company"]
                                    }
                                }
                            },
                            {
                                $project: {
                                    companyName: 1,
                                    companyCode: 1
                                }
                            }
                        ],
                        as: "company"
                    }
                },
                { $unwind: "$company" },
                {
                    $project: {
                        value: "$company._id",
                        label: { $concat: ["$company.companyName", " - ", "$company.companyCode"] },
                    }
                }
            ];

            const companyByCatalogNameOptions = await CATALOG.aggregate(pipeline);

            return !companyByCatalogNameOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: companyByCatalogNameOptions });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    priceBaseByCatalogNameOptions: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        _id: new ObjectId(id)
                    }
                },
                {
                    $project: {
                        _id: 0,
                        priceBase: 1
                    }
                }
            ];

            const priceBaseByCatalogNameOptions = await CATALOG.aggregate(pipeline);

            return !priceBaseByCatalogNameOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { record: priceBaseByCatalogNameOptions.length > 0 ? priceBaseByCatalogNameOptions[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}