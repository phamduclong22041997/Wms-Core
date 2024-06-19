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

const redis = require("redis");
const jwtDecode = require("jwt-decode");
let redisClient = null;


function getRedisClient(forceNew = false) {
    try {
        if (!process.env.CACHE_REDIS) {
            return null;;
        }
        if (forceNew) {
            if(redisClient) {
                redisClient.quit();
            }
            redisClient = new redis.createClient(jwtDecode(process.env.CACHE_REDIS));
        }
        if (!redisClient) {
            let config = jwtDecode(process.env.CACHE_REDIS);
            redisClient = new redis.createClient(config);
        }
        return redisClient;
    } catch (error) {
        console.log(error);
        return null;
    }
}

exports.getClient = (forceNew = false) => {
    return getRedisClient(forceNew);
}

exports.getItem = async function (key) {
    return new Promise((resolve, reject) => {
        let _redisClient = getRedisClient();
        if (_redisClient) {
            _redisClient.get(key, (err, rs) => {
                if (rs) {
                    resolve(rs);
                } else {
                    resolve(null);
                }
            });
        } else {
            resolve(null);
        }
    })
}

exports.setItem = function (key, val, expire = -1) {
    let data = val;
    if (typeof (data) == 'object') {
        data = JSON.stringify(data);
    }
    let _redisClient = getRedisClient();
    if (_redisClient) {
        _redisClient.setex(key, expire, data);
    }
}

exports.removeItem = async function (key) {
    return new Promise((resolve, reject) => {
        let _redisClient = getRedisClient();
        if (_redisClient) {
            _redisClient.del(key, (err, reply) => {
                console.log(`Delete key [${key}]: ${reply}`);
                resolve(true);
            });
        } else {
            resolve(false);
        }
    });
}