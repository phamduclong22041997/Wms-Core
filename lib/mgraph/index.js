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

const request = require("request");
const config = require("./config");
const fs = require("fs");
const Redis = require("./../redis");
const uploadLargerFile = require("./uploadLargeFile");

let _token = "";
let _config = null;
let obj = {}

async function loadConfig(type) {
    if (!type) {
        type = "SharepointDefault";
    }
    if (_config == null) {
        _config = await config.getConfig(type);
    }

    let graphToken = await Redis.getItem('MICROSOFT_GRAPH_TOKEN');

    if (!graphToken && _config) {
        let token = await config.getToken(_config);
        graphToken = token['access_token'];
        let expireToken = 3589;
        if (token['expires_in']) {
            expireToken = parseInt(token['expires_in']) - 10;
        }
        Redis.setItem('MICROSOFT_GRAPH_TOKEN', graphToken, expireToken)
    }
    _token = graphToken;
}

async function createFolder(folder, _config, parentFolder = "") {
    let url = _config.url;
    if (parentFolder) {
        url = url.replace(/items[\/].*/ig, `items/${parentFolder}`);
    }
    var options = {
        'method': 'POST',
        'url': encodeURI(`${url}/children`),
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + _token
        },
        body: JSON.stringify({
            "name": folder.Name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "replace"
        })
    };

    return new Promise((resolve) => {
        request(options, function (error, response) {
            let resp = { Status: false, Data: '' }
            if (error) {
                resp['Data'] = error;
            }
            if (!error && response.body) {
                let sResult = JSON.parse(response.body);
                if (sResult && sResult['id']) {
                    resp['Status'] = true;
                    resp['Data'] = {
                        Id: sResult['id'],
                        Name: sResult['name'],
                        WebUrl: sResult['webUrl']
                    };
                } else {
                    resp['Data'] = response.body;
                }
            }
            resolve(resp);
        });
    })
}

obj.upload = async (fileOptions) => {
    loadConfig('sharepoint');

    if (!_config) {
        return;
    }

    var options = {
        'method': 'PUT',
        'url': encodeURI(`${_config['url']}:/${fileOptions.fileName}:/content`),
        'headers': {
            'Authorization': 'Bearer ' + _token
        },
        body: fileOptions.file
    };

    return new Promise((resolve) => {
        request(options, function (error, response) {
            if (error) {
                console.log(error);
            }
            let resp = null;
            if (!error && response.body) {
                resp = JSON.parse(response.body);
            }
            resolve(resp);
        });
    })

}

obj.shareFile = async (fileOption) => {
    loadConfig('onedrive');
    var options = {
        'method': 'POST',
        'url': `https://graph.microsoft.com/v1.0/me/drive/items/${fileOption.file}/createLink`,
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + _token
        },
        body: JSON.stringify({ "type": "view", "scope": "anonymous" })
    };
    return new Promise((resolve) => {
        request(options, function (error, response) {
            if (error) {
                console.log(error);
            }
            let resp = null;
            if (!error && response.body) {
                resp = JSON.parse(response.body);
            }
            resolve(resp);
        });
    })
}

obj.uploadAndSharing = async (file) => {
    try {
        loadConfig('onedrive');
        if (!_token) {
            return;
        }
        // _token = _token['access_token'];

        let uResult = await exports.upload({
            path: file.path,
            fileName: file.fileName,
            folder: _config['folder']
        }, _token);
        if (uResult && uResult['id']) {
            let sResult = await exports.shareFile({ file: uResult['id'] }, _token);
            if (sResult && sResult['id']) {
                return { Status: true, Data: sResult.link['webUrl'] };
            }
        } else {
            return {
                Status: false,
                data: uResult
            }
        }
    } catch (err) {
        return {
            Status: false,
            data: error
        }
    }

    return ""
}

obj.uploadToSharepoint = async (fileOptions, type, parentFolder = "") => {
    await loadConfig(type);
    let url = _config.url;

    if (fileOptions.folder && typeof fileOptions.folder == 'string') {
        let folders = fileOptions.folder.split("/");
        let _newFolder = null;
        for (let folder of folders) {
            let _result = await createFolder({ Name: folder }, _config, _newFolder);
            if (_result && _result['Data'] && _result['Data'].Id) {
                _newFolder = _result['Data'].Id;
            }
        }
        if (_newFolder) {
            parentFolder = _newFolder;
        }
    }

    if (parentFolder) {
        url = url.replace(/items[\/].*/ig, `items/${parentFolder}`);
    }

    let fileStats = fs.statSync(fileOptions.path || fileOptions.Path);
    if (fileStats) {
        if (fileStats.size * 0.0000009 > 3.9999) {
            return await uploadLargerFile.uploadStream({
                url: url,
                fileName: fileOptions.fileName,
                path: fileOptions.path || fileOptions.Path
            }, _token)
        }
    }

    var options = {
        'method': 'PUT',
        'url': encodeURI(`${url}:/${fileOptions.fileName}:/content`),
        'headers': {
            'Authorization': 'Bearer ' + _token
        },
        body: fs.readFileSync(fileOptions.path || fileOptions.Path)
    };

    return new Promise((resolve) => {
        request(options, function (error, response) {
            let resp = { Status: false, Data: '' }
            if (error) {
                resp['Data'] = error;
            }
            if (!error && response.body) {
                let sResult = JSON.parse(response.body);
                if (sResult && sResult['id']) {
                    resp['Status'] = true;
                    resp['Data'] = sResult['webUrl'];
                } else {
                    resp['Data'] = response.body;
                }
            }
            resolve(resp);
        });
    })
}


module.exports = () => {
    _config = null;
    return obj;
}