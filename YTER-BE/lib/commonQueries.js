'use strict';

// Mongo
const { ObjectId } = require('mongodb');

var commonQueries = {};

commonQueries.cloneDeep = (array) => {
    if (array) return JSON.parse(JSON.stringify(array))
    return array
}

// Modify Response Object
commonQueries.appendExtraParams = (response, extraParams = null) => {
    if (extraParams) Object.keys(extraParams).map((item) => (response[item] = extraParams[item]));
};

// Check Duplicate Record
commonQueries.checkDuplicateRecord = async (SCHEMA, id, keyValues) => {
    const query = {};

    if (id) {
        query._id = { $ne: new ObjectId(id) };
    }

    if (Array.isArray(keyValues) && keyValues?.length > 0) {
        const orConditions = keyValues.map(({ key, value }) => {
            const normalizedString = value?.toLowerCase().trim();
            return { [key]: { $regex: new RegExp(`^${normalizedString}$`, 'i') }, isActive: true };
        });

        if (orConditions?.length > 0) {
            query.$or = orConditions;
        }
    }

    return await SCHEMA.findOne(query);
};

// Filter
commonQueries.buildFilterCriteriaPipeline = async (filter) => {
    const keys = Object.keys(filter)

    const orConditions = keys
        .filter(key => {
            const value = filter[key]
            return !(Array.isArray(value) && value.length === 0) && value !== ""
        })
        .map(key => ({
            [key]: Array.isArray(filter[key])
                ? { $in: filter[key].map(i => new ObjectId(i)) }
                : { $regex: filter[key], $options: 'i' }
        }))

    return orConditions.length > 0 ? { isActive: true, $and: orConditions } : { isActive: true }
}

// Sorting Columns
commonQueries.sortColumn = (sortBy, order) => {
    const defaultSortBy = sortBy ? sortBy : 'updatedAt'
    const defaultOrder = order ? order : 'desc'

    const sortOptions = {}
    sortOptions[defaultSortBy] = defaultOrder === 'desc' ? -1 : 1

    return sortOptions
}

// Pagination
commonQueries.buildAggregationPipeline = async (matchFilterCriteria, sortOptions, page, pageSize, customAggregation) => {
    const pipelineStages = [
        { $match: matchFilterCriteria },
        { $sort: sortOptions },
        ...(page !== -1 ? [
            { $skip: ((page || 1) - 1) * (pageSize || 10) },
            { $limit: pageSize || 10 }
        ] : []),
        ...(customAggregation?.length > 0 ? customAggregation : [])
    ]

    return pipelineStages
}

commonQueries.searchListingRecords = (array) => {
    const orConditions = array.map(item => item.value ? ({ [item.key]: { $regex: item.value, $options: 'i' } }) : null).filter(i => i);
    if (orConditions?.length > 0) {
        const key = Object.keys(orConditions[0]);
        const pipeline = [
            { $match: { $or: orConditions } },
            {
                $project: {
                    _id: 0,
                    [key]: 1
                }
            }
        ];
        return pipeline;
    } else {
        return {}
    }
}

module.exports = commonQueries;