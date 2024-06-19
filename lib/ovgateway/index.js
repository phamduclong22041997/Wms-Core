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

 function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function callGatewayAPI(api, data, retryTime = 0, logName = "") {
    if (!process.env.OVGATEWAY_URI) {
        throw Error('OVGATEWAY_URI support is disabled!');
    }
    if (!process.env.AUTH_INTERNAL_TOKEN) {
        throw Error('AUTH_INTERNAL_TOKEN support is disabled!');
    }
    return new Promise((resolve, reject) => {
        const request = require('request');
        var options = {
            'method': 'POST',
            'url': `${process.env.OVGATEWAY_URI}${api}`,
            'headers': {
                'Authorization': process.env.AUTH_INTERNAL_TOKEN,
                'Content-Type': 'application/json',
                'x-geo-region': process.env.REGION || "HCM"
            },
            body: JSON.stringify(data)
        };
        request(options, function (error, response) {
            let result = { Status: false, Code: 0, StatusCode: 0 }
            if (error) {
                result['Data'] = error.message;
            } else {
                result['StatusCode'] = response.statusCode;
                if (response.statusCode == 200) {
                    if (response.body) {
                        result = JSON.parse(response.body);
                    }
                } else {
                    result.Data = JSON.stringify({Data: response.body});
                }
            }
            if (global.Logger && logName) {
                Logger.logData(logName, {
                    Api: api,
                    RequestData: data,
                    ResponseData: result,
                    RetryTime: retryTime
                });
            }
            resolve(result);
        });
    });
}

function checkAllowRetry(result) {
    let allowRetry = false;
    if(result && !result.Status) {
        allowRetry = /getaddrinfo EAI_AGAIN/.test(result.Data) || result.StatusCode == 502;
    }
    return allowRetry;
}

exports.push2Gateway = async (api, data, logName = "") => {
    let retryTime = 0;
    let result = { Status: false, Data: null };
    while (retryTime < 1) {
        result = await callGatewayAPI(api, data, retryTime, logName);
        if(checkAllowRetry(result)) {
            await sleep(3000);
            result = await callGatewayAPI(api, data, retryTime, logName);
        }
        if(checkAllowRetry(result)) {
            await sleep(2000);
            result = await callGatewayAPI(api, data, retryTime, logName);
        }
        if (result.Status) {
            break;
        }
        retryTime += 1;
    }
    return result;
}