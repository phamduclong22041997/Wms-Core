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

const fs = require("fs");
const request = require('request');
const moment = require("moment-timezone");

/**
 * @param options Include (method, url, body)
 */
function pushNotification(postData) {
    let url = process.env.OV_DYNAMICREPORT_URL;
    console.log('Url: ' + url)
    if (!url) {
        return {
            Data: "Error",
            Status: false
        };
    }
    return new Promise(function (resolve, reject) {
        let options = {
            'method': 'POST',
            'url': `${url}/v1/notification/push`,
            'headers': {
                'Authorization': `Bearer ${process.env.AUTH_INTERNAL_TOKEN}`,
                'Content-Type': 'application/json'
            },
            'body': JSON.stringify(postData || {})
        };
        request(options, function (error, response) {
            console.log("Start...");
            var data = {
                Data: "Error",
                Status: false
            };
            if (error) {
                data.Data = error.message;
            } else {
                if (response && response.body) {
                    data = response.body;
                }
            }
            resolve(data);
        });
    })
}

async function sendNotification(data, template, channel, region) {
    if (!process.env.OV_EXTERNALAPI_URL) {
        return;
    }
    let notifyDate = moment().tz(process.env.TZ).format("DD/MM/YYYY HH:mm");
    let postData = {
        notifyDate: notifyDate,
        data: data,
        template: template,
        region: region || process.env.REGION || ""
    }
    let options = {
        'method': 'POST',
        'url': `${process.env.OV_EXTERNALAPI_URL}/v1/notification`,
        'headers': {
            'Authorization': `Bearer ${process.env.AUTH_INTERNAL_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "type": "telegram",
            "data": {
                "channel": channel,
                "content": postData
            }
        })
    };
    request(options, function (error, response) {
        if (error) {
            console.log(error)
        }
    });

}

async function uploadFile(file, uploadType, folder) {
    if (!process.env.OV_EXTERNALAPI_URL || !uploadType) {
        return;
    }
    let postData = {
        'file': {
            'value': fs.createReadStream(file.Path),
            'options': {
                'filename': file.Name,
                'contentType': null
            }
        },
        'uploadtype': uploadType
    }
    if (folder) {
        postData['folder'] = folder;
    }
    return new Promise((resolve) => {
        let request = require('request');
        let fs = require('fs');
        let options = {
            'method': 'POST',
            'url': `${process.env.OV_EXTERNALAPI_URL}/v1/upload`,
            'headers': {
                'authorization': `Bearer ${process.env.AUTH_INTERNAL_TOKEN}`,
            },
            formData: postData
        };
        request(options, function (error, response) {
            if (error) {
                resolve({
                    Status: false,
                    Data: error.message
                });
            } else {
                fs.unlinkSync(file.Path);
                if (response.statusCode == 200 && response.body) {
                    resolve(JSON.parse(response.body));
                } else {
                    resolve({
                        Status: false,
                        Data: response.body
                    });
                }

            }
        });
    });
}

module.exports = {
    pushNotification,
    sendNotification,
    uploadFile
}
