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

function trans(key) {
    if (global.translate) {
        return translate(key);
    }
    return key;
}
class Response {

    constructor() {
        this.Status = true;
        this.Code = 0;
        this.Data = null;
    }

    async logs(req) {
        if(!global.Logger) {
            return;
        }

        Logger.logData('WFTRequest', {
            request_id: req.id || "",
            request_by: req.RequestBy || 0,
            request_by_name: req.RequestByName || "",
            api: req.originalUrl || "",
            request: {
                headers: JSON.stringify(req.headers),
                params: JSON.stringify(req.params || {}),
                query: JSON.stringify(req.query || {}),
                body: JSON.stringify(req.body || {}),
                url: req.originalUrl || "",
                method: req.method || ""
            },
            response: JSON.stringify(this)
        });

    }

    error(msg, code) {
        this.Status = false;
        if (msg) {
            if (typeof (msg) == 'object') {
                this.Data = msg;
                if (this.Data.Message) {
                    this.Data.Message = trans(this.Data.Message);
                }
            } else {
                this.Data = { Message: trans(msg) };
            }
        }
        this.Code = code || 0;
    }

    success(data, code) {
        this.Status = true;
        this.Data = data;
        this.Code = code || 0;
    }
}

module.exports = Response;