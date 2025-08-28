'user strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        username: { type: String, trim: true, default: '' },
        firstName: { type: String, trim: true, default: '' },
        lastName: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        password: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        area: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
        userType: { type: mongoose.Schema.Types.ObjectId, ref: 'userType', default: null },
        status: { type: String, trim: true, default: 'Pending' },
        resetPasswordOTP: { type: Number, default: null },
        resetPasswordOTPExpiryTime: { type: Date, default: null },
        resetPasswordToken: { type: String, trim: true, default: '' },
        resetPasswordTokenExpiryTime: { type: Date, default: null },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('user', userSchema);