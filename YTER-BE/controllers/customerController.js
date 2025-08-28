// Schema
const CUSTOMER = require('../models/customerSchema');
const { ObjectId } = require('mongodb');

// middleware
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline } = require('../lib/commonQueries');

exports.customer = {
    createLedger: async (req, res) => {
        try {
            const {
                name,
                email,
                phone,
                siteAddress,
                customerType,
                architect,
                discount,
                referenceBy,
                firmName,
                commission,
                officeAddress,
                address,
                otherDetails,
            } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await CUSTOMER.findOne({ email, phone, customerType: customerType.toLowerCase() })
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Email or phone already in use!' });

            const ledger = {
                name,
                email,
                phone,
                siteAddress,
                customerType: customerType.toLowerCase(),
                architect,
                discount,
                referenceBy,
                firmName,
                commission,
                officeAddress,
                address,
                otherDetails,
            };
            const isCreated = await CUSTOMER.create(ledger);
            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `${customerType.toLowerCase() === 'customer' ? "Customer" : customerType.toLowerCase() === 'supplier' ? "Supplier" : customerType.toLowerCase() === 'architect' ? "Architect" : "Mistry"} created successfully.`, customerId: isCreated._id });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listLedger: async (req, res) => {
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

            const customAggregation = [

                {
                    $lookup: {
                        from: "customers",
                        localField: "architect",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    name: 1
                                }
                            }
                        ],
                        as: "architect"
                    }
                },
                { $unwind: { path: "$architect", preserveNullAndEmptyArrays: true } },
                {
                    $set: {
                        architect: '$architect.name'
                    }
                }
            ]

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        ledgers: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ ledgers = [], totalRecords = 0 }] = await CUSTOMER.aggregate(pipeline);

            return !ledgers
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(ledgers), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getLedgerById: async (req, res) => {
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
                }
            ];

            const customer = await CUSTOMER.aggregate(pipeline);

            return !customer
                ? badRequestResponse(res, { message: 'Customer not found!' })
                : successResponse(res, { record: customer.length > 0 ? customer[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateLedger: async (req, res) => {
        try {
            const {
                id,
                name,
                email,
                phone,
                siteAddress,
                customerType,
                architect,
                discount,
                referenceBy,
                firmName,
                commission,
                officeAddress,
                address,
                otherDetails,
            } = req.body;

            // Check Exist
            const ledger = await CUSTOMER.findOne({ _id: id });
            if (!ledger) return existsRequestResponse(res, { message: "Ledger not found!" });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await CUSTOMER.findOne({ _id: { $ne: id }, email, phone, customerType: customerType.toLowerCase() })
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Email or phone already in use!' });

            const updatedLedger = {
                name,
                email,
                phone,
                siteAddress,
                customerType: customerType.toLowerCase(),
                architect,
                discount,
                referenceBy,
                firmName,
                commission,
                officeAddress,
                address,
                otherDetails,
            };
            const isUpdated = await CUSTOMER.findByIdAndUpdate({ _id: ledger._id }, updatedLedger);
            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `${customerType.toLowerCase() === 'customer' ? "Customer" : customerType.toLowerCase() === 'supplier' ? "Supplier" : customerType.toLowerCase() === 'architect' ? "Architect" : "Mistry"} updated successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleLedgerStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const ledger = await CUSTOMER.findOne({ _id: id });
            if (!ledger) return existsRequestResponse(res, { message: 'Ledger not found!' });

            const isLedgerStatusChanged = await CUSTOMER.findByIdAndUpdate({ _id: ledger._id }, { isActive: !ledger.isActive });
            const statusMessage = !ledger.isActive ? 'activated' : 'deactivated';

            return !isLedgerStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Ledger ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    customerOptions: async (req, res) => {
        try {
            // Aggregation Pipeline
            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        customerType: "customer"
                    }
                },
                {
                    $sort: {
                        name: 1,
                        phone: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: {
                            "$concat": ["$name", " - ", "$customerType"]
                        }
                    }
                }
            ];

            const customerOptions = await CUSTOMER.aggregate(pipeline);

            return !customerOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(customerOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    architectOptions: async (req, res) => {
        try {
            // Aggregation Pipeline
            const pipeline = [
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $eq: ["$customerType", "architect"] },
                                { $eq: ["$customerType", "mistry"] }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        customerType: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: {
                            $concat: ["$name", " - ", "$customerType"]
                        }
                    }
                }
            ];

            const brokerOptions = await CUSTOMER.aggregate(pipeline);

            return !brokerOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(brokerOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    }
}