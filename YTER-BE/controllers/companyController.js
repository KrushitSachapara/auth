// MongoDB
const { ObjectId } = require('mongodb');

// Schema
const COMPANY = require('../models/companySchema');
const BRAND = require('../models/plywoodBrandSchema');
const CATALOG = require('../models/laminateCatalogSchema');
const VENEER = require('../models/veneerSchema');

// Responses
const { successResponse, badRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline, searchListingRecords } = require('../lib/commonQueries');

exports.company = {
    createCompany: async (req, res) => {
        try {
            const {
                companyName,
                city,
                area
            } = req.body;

            // Generate Company Code
            const generateUniqueCompanyCode = async (companyName) => {
                let baseCode = companyName.split(" ").map(item => item.slice(0, 2)).join("").toUpperCase();
                let companyCode = baseCode;
                let suffix = 1;

                while (await COMPANY.findOne({ companyCode })) {
                    companyCode = baseCode + (suffix < 10 ? '0' : '') + suffix;
                    suffix++;
                }

                return companyCode;
            };

            const uniqueCompanyCode = await generateUniqueCompanyCode(companyName);

            // Create New
            const company = { companyName, companyCode: uniqueCompanyCode, city, area };

            const isCreated = await COMPANY.create(company);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Company created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listCompany: async (req, res) => {
        try {
            const {
                sortBy,
                order,
                page,
                pageSize
            } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline({}, sortOptions, page, pageSize, {});

            // Aggregation
            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        companies: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ companies = [], totalRecords = 0 }] = await COMPANY.aggregate(pipeline);

            return !companies
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(companies), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getCompanyById: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                { $project: { companyName: 1, companyCode: 1, city: 1, area: 1 } }
            ];

            const company = await COMPANY.aggregate(pipeline);

            return !company
                ? badRequestResponse(res, { message: 'Company not found!' })
                : successResponse(res, { record: company.length > 0 ? company[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateCompany: async (req, res) => {
        try {
            const {
                id,
                companyName,
                companyCode,
                city,
                area
            } = req.body;

            // Check Exist or Not
            const company = await COMPANY.findOne({ _id: id });
            if (!company) return badRequestResponse(res, { message: "Company not found!" });

            // Check Duplicate
            const checkDuplicateRecord = await COMPANY.findOne({ companyCode, _id: { $ne: id }, isActive: true });
            if (checkDuplicateRecord) return badRequestResponse(res, { message: "Company code already exist!" });

            // update company
            const updatedCompany = {
                companyName,
                companyCode,
                city,
                area
            };
            const isUpdated = await COMPANY.findByIdAndUpdate({ _id: company._id }, updatedCompany);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Company updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleCompanyStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const company = await COMPANY.findOne({ _id: id });
            if (!company) return badRequestResponse(res, { message: 'Company not found!' });

            const isCompanyStatusChanged = await COMPANY.findByIdAndUpdate({ _id: company._id }, { isActive: !company.isActive });
            const statusMessage = !company.isActive ? 'activated' : 'deactivated';

            return !isCompanyStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Company ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    ListingRecordsBySearch: async (req, res) => {
        try {
            const { companyName, area, city } = req.body;

            const searchBy = searchListingRecords([
                { key: 'companyName', value: companyName },
                { key: 'area', value: area },
                { key: 'city', value: city },
            ]);

            if (Object.keys(searchBy)?.length > 0) {
                const listRecords = await COMPANY.aggregate(searchBy);
                const key = listRecords?.length > 0 ? Object.keys(listRecords[0])[0] : ''

                const uniqueRecords = [...new Set(listRecords.map(i => i[key]))];

                return !uniqueRecords
                    ? badRequestResponse(res, { message: 'Something went wrong!' })
                    : successResponse(res, { records: uniqueRecords });
            } else {
                return successResponse(res, { records: [] });
            }

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    companyOptions: async (req, res) => {
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
                        companyName: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: {
                            "$concat": ["$companyName", " - ", "$companyCode"]
                        }
                    }
                }
            ];

            const companyOptions = await COMPANY.aggregate(pipeline);

            return !companyOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(companyOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    companyByPlywoodCategory: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        category: new ObjectId(id)
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
                                    companyCode: 1,
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

            const companyByPlywoodCategory = await BRAND.aggregate(pipeline);

            return !companyByPlywoodCategory
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: companyByPlywoodCategory });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    companyByLaminateCategory: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        category: new ObjectId(id)
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
                                    companyCode: 1,
                                }
                            }
                        ],
                        as: "company"
                    }
                },
                { $unwind: "$company" },
                {
                    $group: {
                        _id: "$company._id",
                        label: { $first: { $concat: ["$company.companyName", " - ", "$company.companyCode"] } }
                    }
                },
                {
                    $project: {
                        value: "$_id",
                        label: 1,
                        _id: 0
                    }
                },
            ];

            const companyByLaminateCategory = await CATALOG.aggregate(pipeline);

            return !companyByLaminateCategory
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: companyByLaminateCategory });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    companyByVeneerCategory: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        category: new ObjectId(id)
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
                    $group: {
                        _id: "$company._id",
                        label: { $first: { $concat: ["$company.companyName", " - ", "$company.companyCode"] } }
                    }
                },
                {
                    $project: {
                        value: "$_id",
                        label: 1,
                        _id: 0
                    }
                }
            ];

            const companyByVeneerCategory = await VENEER.aggregate(pipeline);

            return !companyByVeneerCategory
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: companyByVeneerCategory });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
}