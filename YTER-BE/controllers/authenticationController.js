const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const ejs = require('ejs');

// Schema
const USER = require('../models/userShema');

// middleware
const { badRequestResponse, successResponse } = require('../middleware/responses');
const { errorResponse } = require('../middleware/error');
const { generateAuthToken, generateUniqueString } = require('../middleware/auth');

// env
const mail = process.env.MAIL;
const secretMail = process.env.SECRET_MAIL;
const clientURI = process.env.CLIENT_URI;
const saltRounds = process.env.SALT_ROUNDS;

exports.authentication = {
    signIn: async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await USER.findOne({
                $or: [
                    { username: email },
                    { email: email }
                ]
            });
            if (!user) return badRequestResponse(res, { message: "Incorrect username or password!" });

            if (!user.isActive) return badRequestResponse(res, { message: 'Something went wrong, Please contact admin!' });

            if (!password) return badRequestResponse(res, { message: 'Password is required!' });

            const isMatched = await bcrypt.compare(password, user.password)
            if (!isMatched) return badRequestResponse(res, { message: "Incorrect username or password!" });

            const accessToken = await generateAuthToken(user);

            return !accessToken
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { accessToken: accessToken.token });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    sendOTP: async (req, res) => {
        try {
            const { email } = req.body;

            const user = await USER.findOne({
                $or: [
                    { username: email },
                    { email: email }
                ]
            });
            if (!user) return badRequestResponse(res, { message: "User not found!" });

            if (!user.isActive) return badRequestResponse(res, { message: 'Something went wrong, Please contact admin!' });

            const otpCode = parseFloat(`${Math.ceil(Math.random() * 5 * 1000)}`.padEnd(4, '0'));

            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: mail,
                    pass: secretMail,
                },
            });

            const emailBody = await ejs.renderFile('./templates/resetPasswordTemplate.ejs', { clientURI, user, otpCode });

            const emailSended = await transporter.sendMail({
                from: mail,
                to: user.email,
                subject: 'Reset Your Password',
                text: 'We have received your forget password request...',
                html: emailBody,
            });

            if (emailSended.accepted) {
                await USER.findOneAndUpdate(
                    { _id: user._id },
                    {
                        $set: {
                            resetPasswordOTP: otpCode,
                            resetPasswordOTPExpiryTime: new Date(new Date().getTime() + 10 * 60 * 1000),
                            resetPasswordToken: '',
                            resetPasswordTokenExpiryTime: null
                        }
                    }
                );
                return successResponse(res, { message: 'OTP sent to your email address, Please check your mail' });
            } else {
                return errorResponse({ message: 'Something went wrong, Please try again' }, res);
            }

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    verifyOTP: async (req, res) => {
        try {
            const { resetPasswordOTP, id } = req.body;

            if (String(resetPasswordOTP)?.length !== 4) return badRequestResponse(res, { message: 'Enter valid OTP length!' });

            const user = await USER.findOne({ _id: id });
            if (!user) return badRequestResponse(res, { message: 'User not found!' });

            if (!user.resetPasswordOTP) {
                const updatedUser = { resetPasswordToken: '', resetPasswordTokenExpiryTime: null };
                const isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, updatedUser);

                return !isUpdated
                    ? badRequestResponse(res, { message: 'Something went wrong!' })
                    : badRequestResponse(res, { message: 'You have to request for new OTP!' });
            }

            if (new Date(user.resetPasswordOTPExpiryTime) < new Date()) {
                const updateduser = { resetPasswordOTP: null, resetPasswordOTPExpiryTime: null };
                const isUpdated = await USER.findOneAndUpdate({ _id: user._id }, updateduser);

                return !isUpdated
                    ? badRequestResponse(res, { message: 'Something went wrong!' })
                    : badRequestResponse(res, { message: 'OTP is expired, Please Request for new OTP!' });
            }

            if (String(user.resetPasswordOTP) !== resetPasswordOTP) return badRequestResponse(res, { message: 'Invalid OTP!' });

            const uniqueString = await generateUniqueString();

            const updateduser = {
                resetPasswordToken: uniqueString,
                resetPasswordTokenExpiryTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
                resetPasswordOTP: null,
                resetPasswordOTPExpiryTime: null
            };
            const isUpdated = await USER.findOneAndUpdate({ _id: user._id }, updateduser);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { resetPasswordToken: uniqueString });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { id, password, resetPasswordToken } = req.body;

            const user = await USER.findOne({ _id: id });
            if (!user) return badRequestResponse(res, { message: "User not found!" });

            if (!user.resetPasswordToken) return badRequestResponse(res, { message: 'You have to request for new OTP!' });

            if (new Date(user.resetPasswordTokenExpiryTime) < new Date()) {
                const updateduser = { resetPasswordToken: '', resetPasswordOTPExpiryTime: null };
                const isUpdated = await USER.findOneAndUpdate({ _id: user._id }, updateduser);
                return !isUpdated
                    ? badRequestResponse(res, { message: 'Something went wrong!' })
                    : badRequestResponse(res, { message: 'Session expired, Please Request for new OTP!' });
            }

            if (user.resetPasswordToken !== resetPasswordToken) return badRequestResponse(res, { message: 'Something went wrong!' });
            if (!password) return badRequestResponse(res, { message: "Password is required!" });

            const updatedUser = {
                password: await bcrypt.hash(password, Number(saltRounds)),
                resetPasswordToken: '',
                resetPasswordTokenExpiryTime: null
            };
            const isUpdated = await USER.findByIdAndUpdate({ _id: id }, updatedUser);

            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Password updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    },
    setUserPassword: async (req, res) => {
        try {
            const { id, password } = req.body;

            const user = await USER.findOne({ _id: id });
            if (!user) return badRequestResponse(res, { message: 'User not found!' });

            if (!password) return badRequestResponse(res, { message: 'Password is required!' });

            const hashedPassword = await bcrypt.hash(password, Number(saltRounds));

            const isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, { password: hashedPassword, status: 'Active' });
            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'User updated successfully.' });

        } catch (error) {
            return badRequestResponse(res, { message: 'Something went wrong!' });
        }
    },
    changeUserPassword: async (req, res) => {
        try {
            const { id, currentPassword, newPassword } = req.body;

            const user = await USER.findOne({ _id: id });

            const comparePassword = await bcrypt.compare(currentPassword, user.password);
            if (!comparePassword) return badRequestResponse(res, { message: 'Incorrect current password!' });

            const hashedPassword = await bcrypt.hash(newPassword, Number(saltRounds));

            const isUpdated = await USER.findByIdAndUpdate({ _id: user._id }, { password: hashedPassword, status: 'Active' });
            return !isUpdated
                ? badRequestResponse(res, { message: 'Something went wrong!' })
                : successResponse(res, { message: 'Password updated successfully.' });

        } catch (error) {
            return errorResponse(error, res);
        }
    }
}