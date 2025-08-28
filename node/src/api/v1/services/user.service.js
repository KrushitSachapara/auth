const User = require('../models/user.model');
const { buildAggregation } = require('../../../lib/aggregationBuilder');
const { httpStatus } = require('../../../utils/constants');

class UserService {
    static async getUsers(query) {
        const { dataPipeline, countPipeline } = buildAggregation(query);

        const [users, total] = await Promise.all([
            User.aggregate(dataPipeline),
            User.aggregate(countPipeline),
        ]);

        return {
            data: users,
            meta: {
                total: total[0]?.total || 0,
                page: parseInt(query.page, 10) || 1,
                limit: parseInt(query.limit, 10) || 10,
            },
        };
    }

    static async createUser(userData) {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            const error = new Error('User already exists');
            error.statusCode = httpStatus.BAD_REQUEST;
            throw error;
        }
        return User.create(userData);
    }

    // Add updateUser, deleteUser, getUserById methods similarly
}

module.exports = UserService;