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

const Connection = require("./connection");
const LoggerModel = require("./../model/loggerModel");

const { createLogger, format, transports } = require('winston');
const { combine, timestamp } = format;
const levels = {
    error: 'error',
    warn: 'warn',
    info: 'info',
    http: 'http',
    verbose: 'verbose',
    debug: 'debug',
    silly: 'silly'
};

class Logger {
    constructor(level) {
        if (!level || !levels[level]) {
            this._level = levels['debug'];
            let _env = process.env['ENV'] ? process.env['ENV'].toLocaleUpperCase() : 'DEV';
            switch (_env) {
                case 'PROD':
                    this._level = levels['verbose'];
                    break;
                default:
                    this._level = levels['debug'];
            }
        } else {
            this._level = levels[level];
        }
        this._nsp = (process.env['APP_NAME'] || "default").toLocaleLowerCase();
        this.makeLogger();

        this.defaultEvent();
    }

    getCollection(name) {
        if (!this._logAdapter) {
            this.createLogAdapter();
        }
        if (this._logAdapter) {
            if (this._logAdapter['_db'].models[name] === undefined) {
                let logModel = class LogModel extends LoggerModel { static name = name; static collection = name; };
                this._logAdapter.addModel(logModel);
            }
            return this._logAdapter.getCollection(name);
        }
    }

    async logData(nsp, _data) {
        try {
        if (!nsp || !_data) {
            return;
        }
        if (!this._logAdapter) {
            this.createLogAdapter();
        }
        if (this._logAdapter) {
            let name = `${nsp}`;
            if (this._logAdapter['_db'].models[name] === undefined) {
                let logModel = class LogModel extends LoggerModel { static name = name; static collection = name; };
                this._logAdapter.addModel(logModel);
            }
            let collection = this._logAdapter.getCollection(name);
            await collection.create({
                data: _data,
                log_id: _data['id'] || `${new Date().getTime()}`,
                LastModified: new Date(),
                CreatedDate: new Date()
            });
        }
    }catch(err) {
        console.log(err);
        console.log(_data);
    }
    }

    async logResponse(nsp, res) {
        if (!nsp || !res) {
            return;
        }
        if (!this._logAdapter) {
            this.createLogAdapter();
        }
        if (this._logAdapter) {
            let name = `${nsp}`;
            if (this._logAdapter['_db'].models[name] === undefined) {
                let logModel = class LogModel extends LoggerModel { static name = name; static collection = name; };
                this._logAdapter.addModel(logModel);
            }
            let collection = this._logAdapter.getCollection(name);
            collection.create({
                url: res.request.href,
                data: {
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage || "",
                    body: res.body,
                    request: {
                        headers: JSON.stringify(res.request.headers),
                        params: JSON.stringify(res.request.params || {}),
                        query: JSON.stringify(res.request.query || {}),
                        body: JSON.stringify(res.request.body || {}),
                        originalUrl: res.request.originalUrl || "",
                        method: res.request.method || ""
                    }
                },
                LastModified: new Date(),
                CreatedDate: new Date()
            });
        }
    }

    async logRequest(nsp, req) {
        if (!nsp || !req) {
            return;
        }
        if (req.method.toUpperCase() !== "POST") {
            return;
        }
        if (!this._logAdapter) {
            this.createLogAdapter();
        }
        if (this._logAdapter) {
            let name = `${nsp}`;
            if (this._logAdapter['_db'].models[name] === undefined) {
                let logModel = class LogModel extends LoggerModel { static name = name; static collection = name; };
                this._logAdapter.addModel(logModel);
            }
            let collection = this._logAdapter.getCollection(name);
            collection.create({
                url: req.originalUrl,
                log_id: req.id || "",
                data: {
                    headers: JSON.stringify(req.headers),
                    params: JSON.stringify(req.params || {}),
                    query: JSON.stringify(req.query || {}),
                    body: JSON.stringify(req.body || {}),
                    originalUrl: req.originalUrl || "",
                    method: req.method || ""
                },
                LastModified: new Date(),
                CreatedDate: new Date()
            });
        }
    }

    createLogAdapter() {
        if (process.env.LOGGER_URI) {
            let _conn = new Connection(process.env.LOGGER_URI);
            _conn.connect(false, false);
            this._logAdapter = _conn;
        }
    }

    defaultEvent() {
        process.on('uncaughtException', (err) => {
            console.log(err);
        });
    }

    makeLogger() {
        let _transports = [];
        if (this._level === levels['debug']) {
            _transports.push(new transports.Console());
            _transports.push(new transports.File({ filename: 'debug.log' }));
        }
        this._logger = createLogger({
            format: combine(
                timestamp(),
                format.json()
            ),
            level: this._level,
            transports: _transports
        });
    }

    async log(msg) {
        return new Promise(() => {
            this._logger.log({
                level: this._level,
                message: JSON.stringify(msg),
                nsp: this._nsp
            })
        });
    }
    tracing(data) {
        if (!process.env.OVGATEWAY_URI || !data) {
            return;
        }
        try {
            var request = require('request');
            var options = {
                'method': 'POST',
                'url': `${process.env.OVGATEWAY_URI}/v1/api/trackings`,
                'headers': {
                    'Authorization': `Bearer ${process.env.AUTH_INTERNAL_TOKEN}`,
                    'Content-Type': 'application/json',
                    'X-From': process.env.APP_NAME
                },
                body: JSON.stringify(data)
            };
            request(options, function (error, response) {
                if(error) {
                    console.log(error)
                }
            });
        } catch (err) {
    
        }
    }
}

module.exports = Logger;