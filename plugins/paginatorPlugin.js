/*
 * @copyright
 * Copyright (c) 2019 OVTeam
 *
 * All Rights Reserved
 *
 * Licensed under the MIT License;
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://choosealicense.com/licenses/mit/
 *
 */

function paginate(query, options) {
    query   = query || {};
    options = Object.assign({}, paginate.options, options);

    let select     = options.select;
    let sort       = options.sort;
    let populate   = options.populate;

    let limit       = options.limit || 10;
    let skip = 0, offset = 0, page = 1;

    if (options.hasOwnProperty('offset')) {
        offset = options.offset;
        skip   = offset;
    } else if (options.hasOwnProperty('page')) {
        page = options.page;
        skip = (page - 1) * limit;
    }

    let queryPromise =  Promise.resolve([]);
    let countPromise = this.countDocuments(query);

    if (limit) {
        var query = this.find(query)
                        .select(select)
                        .sort(sort)
                        .skip(skip)
                        .limit(limit)
                        .read('secondaryPreferred');

        if (populate) {
            [].concat(populate).forEach(function(item) {
                query.populate(item);
            });
        }

        queryPromise = query;
    }

    let result = {
        rows: [],
        total: 0,
        limit: limit,
        page: page || 1,
        offset: offset || 0,
        pages: 0
    }

    return doExecute(queryPromise, countPromise, result);
}

/**
 * Execute query
 * @param {Promise} queryPromise 
 * @param {Promise} countPromise 
 * @param {Object} result 
 */
async function doExecute(queryPromise, countPromise, result) {
    result.rows = await queryPromise.exec();
    result.total = await countPromise.exec();
    result.pages = Math.ceil(result.total / result.limit) || 1;
    result.offset = ((result.page - 1) || 0) * result.limit;
    return result;
}

/**
 * @param {Schema} schema
 */
module.exports = function(schema) {
    schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;