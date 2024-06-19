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
const FileType = require('file-type');
const fs = require("fs");

async function createUploadSession(data, token) {
    const options = {
        'method': 'POST',
        'url': `${data.url}:/${data.fileName}:/createUploadSession`,
        'headers': {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "@microsoft.graph.conflictBehavior": "replace",
            "description": "description",
            "fileSystemInfo": { "@odata.type": "microsoft.graph.fileSystemInfo" },
            "name": `${data.fileName}`
        })

    };
    return new Promise((resolve) => {
        request(options, function (error, response) {
            if (error) throw new Error(error);
            if (response.body) {
                try {
                    let resp = JSON.parse(response.body);
                    resolve({ Status: resp['uploadUrl'] ? true : false, Data: resp['uploadUrl'] })
                } catch (err) {
                    resolve({ Status: false, Data: "" })
                }
            } else {
                resolve({ Status: false, Data: "" })
            }
        });
    })
}

exports.uploadStream = async (fileOptions, token) => {
    let resp = await createUploadSession(fileOptions, token);
    
    if (resp && !resp['Status']) {
        return { Status: false, Data: "" };
    }
    let filePath = fileOptions.path || fileOptions.Path;
    let fileStats = fs.statSync(filePath)
    let mime = await FileType.fromFile(filePath);
    const options = {
        'method': 'PUT',
        'url': resp['Data'],
        'headers': {
            'Content-Length': fileStats.size,
            'Content-Range': `bytes 0-${fileStats.size - 1}/${fileStats.size}`,
            'Content-Type': mime['mime']
        },
        body: fs.readFileSync(fileOptions.path || fileOptions.Path)
    };
    return new Promise((resolve) => {
        request(options, function (error, response) {
            if (response.body) {
                try {
                    let resp = JSON.parse(response.body);
                    resolve({ Status: resp['webUrl'] ? true : false, Data: resp['webUrl'] })
                } catch (err) {
                    resolve({ Status: false, Data: "" })
                }
            } else {
                resolve({ Status: false, Data: "" })
            }
        });
    })
}