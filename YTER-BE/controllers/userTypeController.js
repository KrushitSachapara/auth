// Schema
const USERTYPE = require('../models/userTypeSchema');
const { ObjectId } = require('mongodb');

// Responses
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { checkDuplicateRecord, cloneDeep, sortColumn } = require('../lib/commonQueries');

exports.userType = {
    createUserType: async (req, res) => {
        try {
            const { userTypeName } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(USERTYPE, null, [{ key: 'userTypeName', value: userTypeName }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'User type already exist!' });

            // Create New
            const userType = { userTypeName };
            const isCreated = await USERTYPE.create(userType);

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User type created successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listUserType: async (req, res) => {
        try {
            const { sortBy, order } = req.body;

            // Sorting
            const sortOptions = sortColumn(sortBy, order);

            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        userTypes: [
                            { $sort: sortOptions },
                            { $project: { __v: 0 } },
                        ],
                        totalRecords: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ userTypes = [], totalRecords = 0 }] = await USERTYPE.aggregate(pipeline);

            return !userTypes
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(userTypes), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getUserTypeById: async (req, res) => {
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

            const userType = await USERTYPE.aggregate(pipeline);

            return !userType
                ? badRequestResponse(res, { message: 'User type not found!' })
                : successResponse(res, { record: userType.length > 0 ? userType[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateUserType: async (req, res) => {
        try {
            const { id, userTypeName } = req.body;

            // Check Exist or Not
            const userType = await USERTYPE.findOne({ _id: id });
            if (!userType) return badRequestResponse(res, { message: 'User type not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(USERTYPE, id, [{ key: 'userTypeName', value: userTypeName }]);
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'User type already exist!' });

            // update userType
            const updatedUserType = { userTypeName };
            const isUpdated = await USERTYPE.findByIdAndUpdate({ _id: userType._id }, updatedUserType);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User type updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleUserTypeStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const userType = await USERTYPE.findOne({ _id: id });
            if (!userType) return badRequestResponse(res, { message: 'User type not found!' });

            const isUserTypeStatusChanged = await USERTYPE.findByIdAndUpdate({ _id: userType._id }, { isActive: !userType.isActive });
            const statusMessage = !userType.isActive ? 'activated' : 'deactivated';

            return !isUserTypeStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `User Type ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    userTypeOptions: async (req, res) => {
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
                        userTypeName: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        value: "$_id",
                        label: "$userTypeName"
                    }
                }
            ];

            const userTypeOptions = await USERTYPE.aggregate(pipeline);

            return !userTypeOptions
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(userTypeOptions) });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
}