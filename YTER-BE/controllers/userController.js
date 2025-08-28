const nodemailer = require('nodemailer');
const ejs = require('ejs');
const { ObjectId } = require('mongodb');

// Schema
const USER = require('../models/userShema');

// middleware
const { successResponse, badRequestResponse, existsRequestResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');

// Common Queries
const { checkDuplicateRecord, cloneDeep, sortColumn, buildFilterCriteriaPipeline, buildAggregationPipeline } = require('../lib/commonQueries');

// env 
const mail = process.env.MAIL;
const secretMail = process.env.MAIL_SECRET;
const clientURI = process.env.CLIENT_URI;

exports.user = {
    createUser: async (req, res) => {
        try {
            const {
                username,
                firstName,
                lastName,
                email,
                phone,
                area,
                address,
                userType
            } = req.body;

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                USER,
                null,
                [
                    { key: 'username', value: username },
                    { key: 'email', value: email },
                    { key: 'phone', value: phone },
                ]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'Username or Email already in use!' });

            // Create New
            const user = {
                username,
                firstName,
                lastName,
                email,
                phone,
                area,
                address,
                userType
            };

            const isCreated = await USER.create(user);
            const emailBody = await ejs.renderFile('./templates/welcomeTemplate.ejs', { clientURI, user, isCreated });

            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: mail,
                    pass: secretMail,
                },
            });

            const sendEmail = await transporter.sendMail({
                from: `yTer <${mail}>`,
                to: user.email,
                subject: 'Welcome to yTer',
                html: emailBody
            });

            return !isCreated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User created successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    listUser: async (req, res) => {
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
                        from: 'usertypes',
                        localField: 'userType',
                        foreignField: '_id',
                        as: 'userType',
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,
                                    userTypeName: 1,
                                },
                            },
                        ]
                    }
                },
                {
                    $unwind: { path: '$userType' }
                },
                {
                    $set: { userType: "$userType.userTypeName" }
                }
            ]

            // Final Pipeline with Pagination
            const pipelineStages = await buildAggregationPipeline(matchFilterCriteria, sortOptions, page, pageSize, customAggregation);

            // Aggregation
            const pipeline = [
                { $match: { isActive: true } },
                {
                    $facet: {
                        users: pipelineStages,
                        totalRecords: [
                            { $match: matchFilterCriteria },
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [{ users = [], totalRecords = 0 }] = await USER.aggregate(pipeline);

            return !users
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { records: cloneDeep(users), totalRecords: totalRecords[0]?.count || 0 });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    getUserById: async (req, res) => {
        try {

            const { id } = req.query;

            const pipeline = [
                { $match: { _id: new ObjectId(id) } },
                {
                    $project: {
                        resetPasswordOTP: 0,
                        resetPasswordOTPExpiryTime: 0,
                        resetPasswordToken: 0,
                        resetPasswordTokenExpiryTime: 0,
                        isActive: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        __v: 0
                    }
                }
            ];

            const user = await USER.aggregate(pipeline);

            return !user
                ? badRequestResponse(res, { message: 'User not found!' })
                : successResponse(res, { record: user.length > 0 ? user[0] : {} });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    updateUser: async (req, res) => {
        try {
            const {
                id,
                username,
                firstName,
                lastName,
                email,
                phone,
                area,
                address,
                userType,
            } = req.body;

            // Check Exist or Not
            const user = await USER.findOne({ _id: id });
            if (!user) return badRequestResponse(res, { message: 'User not found!' });

            // Check Duplicate
            const isCaseInsensitiveDuplicateRecord = await checkDuplicateRecord(
                USER,
                id,
                [
                    { key: 'username', value: username },
                    { key: 'email', value: email },
                    { key: 'phone', value: phone }
                ]
            );
            if (isCaseInsensitiveDuplicateRecord) return existsRequestResponse(res, { message: 'User already exist!' });

            // update user
            const updatedUser = {
                username,
                firstName,
                lastName,
                email,
                phone,
                area,
                address,
                userType,
            };
            const isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, updatedUser);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User updated successfully.' });
        } catch (error) {
            return errorResponse(error, res);
        }
    },
    toggleUserStatus: async (req, res) => {
        try {
            const { id } = req.query;

            // Check Exist or Not
            const user = await USER.findOne({ _id: id });
            if (!user) return badRequestResponse(res, { message: 'User not found!' });

            const isUserStatusChanged = await USER.findByIdAndUpdate({ _id: user._id }, { isActive: !user.isActive });
            const statusMessage = !user.isActive ? 'activated' : 'deactivated';

            return !isUserStatusChanged
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: `User ${statusMessage} successfully.` });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}