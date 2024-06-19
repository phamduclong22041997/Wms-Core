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
const request = require('request');
const jwtDecode = require("jwt-decode");

global.NCONFIG = {};

exports.getConfig = async (type = "onedrive") => {
    if (global.NCONFIG[type]) {
        return global.NCONFIG[type];
    }
    let obj = await DB.getCollection("SystemSettings").findOne({ type: type, isdeleted: 0 }).exec();
    if (!obj) {
        return null;
    }
    let _config = obj['config'];
    global.NCONFIG[type] = jwtDecode(_config);
    return global.NCONFIG[type];
}

exports.getToken = async (_confg) => {
    return new Promise((resolve) => {
        var options = {
            'method': 'POST',
            'url': `https://login.microsoftonline.com/${_confg['tenant']}/oauth2/v2.0/token`,
            'headers': {
                'Content-Type': ['application/x-www-form-urlencoded', 'application/x-www-form-urlencoded'],
            },
            form: {
                'client_id': _confg['client_id'],
                'scope': _confg['scope'],
                'client_secret': _confg['client_secret'],
                'grant_type': _confg['grant_type']
            }
        };
        request(options, function (error, response) {
            if (error) {
                console.log(error);
            }
            let resp = null;
            if (!error && response.statusCode === 200 && response.body) {
                resp = JSON.parse(response.body);
            }
            resolve(resp);
        });
    })

}