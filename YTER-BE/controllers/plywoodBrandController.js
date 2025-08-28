// Schema
const BRAND = require('../models/plywoodBrandSchema');
const { ObjectId } = require('mongodb');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { cloneDeep, sortColumn, buildAggregationPipeline } = require('../lib/commonQueries');

exports.brand = {
    createPlywoodBrand: async (req, res) => {
        try {
            const {
                company,
                category,
                brands
            } = req.body;

            const checkDuplicateRecord = await BRAND.findOne({ company, isActive: true });
            if (checkDuplicateRecord) return existsRequestResponse(res, { message: "Plywood brand already exist!" });

            // Check Duplicate Brands
            const key = brands?.length > 0 ? Object.keys(brands[0])[0] : ''
            const uniqueBrands = [...new Set(brands.map(i => i[key]))]

            // Create New
            const plywoodBrand = { company, category, brands: uniqueBrands.map(i => ({ brandName: i })) };
            const isCreated = await BRAND.create(plywoodBrand);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Plywood brand created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listPlywoodBrand: async (req, res) => {
        try {
            const {
                sortBy,
                order,
                page,
                pageSize
            } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            const customAggregation = [
                {
                    $lookup: {
                        from: 'companies',
                        localField: 'company',
                        foreignField: '_id',
                        as: 'company'
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
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                {
                    $unwind: { path: '$category' }
                },
                {
                    $set: { category: "$category.categoryName" }
                }
            ]

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline({}, sortOptions, page, pageSize, customAggregation);

            // Aggregation
            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        plywoodBrands: pipelineStages,
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];;

            const [{ plywoodBrands = [], totalRecords = 0 }] = await BRAND.aggregate(pipeline);

            return !plywoodBrands
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(plywoodBrands), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getPlywoodBrandById: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        isActive: 0,
                        __v: 0,
                    }
                },
                { $unwind: { path: '$brands' } },
                {
                    $project: {
                        'brands.isActive': 0,
                        'brands.createdAt': 0,
                        'brands.updatedAt': 0,
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        company: { $first: "$company" },
                        category: { $first: "$category" },
                        brands: {
                            $push: "$brands"
                        }
                    }
                }
            ];;

            const plywoodBrand = await BRAND.aggregate(pipeline);

            return !plywoodBrand
                ? badRequestResponse(res, { message: 'Plywood brand not found!' })
                : successResponse(res, { record: plywoodBrand?.length > 0 ? plywoodBrand[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updatePlywoodBrand: async (req, res) => {
        try {
            const {
                id,
                company,
                category,
                brands
            } = req.body;

            // Check Exist or Not
            const plywoodBrand = await BRAND.findOne({ _id: id });
            if (!plywoodBrand) return badRequestResponse(res, { message: "Plywood brand not found!" });

            // Check Duplicate
            const checkDuplicateRecord = await BRAND.findOne({ company, category, _id: { $ne: id }, isActive: true });
            if (checkDuplicateRecord) return badRequestResponse(res, { message: "Plywood brand already exist!" });

            // Check Duplicate Brands
            const uniqueBrandNames = [...new Set(brands.map(i => i.brandName))];
            const uniqueBrands = brands.map((i, index) => ({ ...(i.id && { _id: i.id }), ...(uniqueBrandNames[index]) && { brandName: uniqueBrandNames[index] } })).filter(i => i.brandName)

            // // Update
            const updatedPlywoodBrand = { company, category, brands: uniqueBrands };
            const isUpdated = await BRAND.findByIdAndUpdate({ _id: plywoodBrand._id }, updatedPlywoodBrand);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Plywood brand updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    togglePlywoodBrandStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const plywoodBrand = await BRAND.findOne({ _id: id });
            if (!plywoodBrand) return badRequestResponse(res, { message: 'Plywood brand not found!' });

            const isPlywoodBrandStatusChanged = await BRAND.findByIdAndUpdate({ _id: plywoodBrand._id }, { isActive: !plywoodBrand.isActive });
            const statusMessage = !plywoodBrand.isActive ? 'activated' : 'deactivated';

            return !isPlywoodBrandStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `Plywood brand ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    brandByCompanyOptions: async (req, res) => {
        try {
            const { id } = req.query;

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $match: {
                        $and: [
                            { company: new ObjectId(id) }
                        ]
                    }
                },
                {
                    $project: {
                        _id: 0,
                        brands: 1
                    }
                },
                {
                    $unwind: "$brands"
                },
                {
                    $project: {
                        value: "$brands._id",
                        label: "$brands.brandName"
                    }
                }
            ];

            const brandByCompanyOptions = await BRAND.aggregate(pipeline);

            return !brandByCompanyOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: brandByCompanyOptions });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}