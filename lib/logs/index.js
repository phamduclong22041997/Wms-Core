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

async function writeRequestLog(req, namespace) {
    try {
        if (!namespace) {
            return;
        }
        if (!global.Logger) {
            return;
        }
        if (!req.method) {
            return;
        }
        if (["POST", "PUT"].indexOf(req.method.toUpperCase()) == -1) {
            return;
        }
        let requestBy = req.userInfo || {};

        Logger.logData(namespace, {
            URL: req.originalUrl,
            LogId: req.id || "",
            RequestBy: requestBy,
            Data: {
                Headers: req.headers,
                Params: req.params || {},
                Query: req.query || {},
                Body: req.body || {},
                OriginalUrl: req.originalUrl || "",
                Method: req.method || ""
            }
        });
    } catch (err) {

    }
}

module.exports = {
    writeRequestLog
}