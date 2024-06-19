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

const path = require('path');
const express = require('express');
const compression = require("compression");
const cors = require('cors');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const i18n = require("i18n");
const fs = require("fs");
const fileUpload = require('express-fileupload');
const Logger = require("./../lib/logger");
const Connection = require("./../lib/connection");
const Plugin = require("./../plugins/systemPlugin");
process.env.APP_ROOT = path.dirname(require.main.filename);
module.exports = class HTTP {
    constructor(options = {}) {
        this.EnableDB = options['EnableDB'] !== false;
        this.DBConfigName = options['DBConfigName'] || "MONGO_URI";
        this.EnableLog = options['EnableLog'] !== false;
        this.RoutePath = options['RoutePath'] || `${process.env.APP_ROOT}/start/routing.js`;
        this.ModelDBPath = options['ModelDBPath'] || `${process.env.APP_ROOT}/start/model.js`;
        this.loadConfig();
        this.APP = express();
        this.SERVER = null;
    }
    async start() {
        this.configure();
        return new Promise((resolve, reject) => {
            this.SERVER = this.APP.listen(parseInt(process.env.PORT), function () {
                console.log("Server running at localhost:" + process.env.PORT);
                if (this.EnableDB) {
                    mongoose.connection.once('open', () => {
                        resolve(true);
                    });
                } else {
                    resolve(true);
                }
            });
        })
    }
    configure() {
        this.APP.use(compression({
            filter: (req, res) => {
                if (!req.headers['x-compression']) {
                    return false
                }
                return compression.filter(req, res)
            }
        }));
        this.APP.use(cors());
        this.APP.use(fileUpload({
            useTempFiles: true,
            tempFileDir: '/tmp/'
        }));
        this.APP.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '50mb' }));
        this.APP.use(bodyParser.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '50mb' }));
        this.APP.use(bodyParser.json());
        this.APP.use(cookieParser());

        i18n.configure({
            locales: ['vi', 'en'],
            directory: process.env.APP_ROOT + '/locales',
            register: global,
            defaultLocale: 'vi',
            updateFiles: false,
            queryParameter: "lang"
        });

        Plugin.register();

        if (fs.existsSync(this.RoutePath)) {
            require(this.RoutePath).register(this.APP);
        }

        if (process.env.TZ) {
            require('moment-timezone').tz.setDefault(process.env.TZ);
        }

        this.dbConnect(this.DBConfigName);
        this.logger();

        // this.APP.get('*', function (req, res) {
        //     res.send('Ok!');
        // });
    }
    loadConfig() {
        process.env["NO_PROXY"] = "*";
        process.env.APP_INSTANCE = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        const configs = require(`${process.env.APP_ROOT}/conf.json`);

        for (let cfg in configs) {
            let val = configs[cfg];
            if (typeof (val) === 'object') {
                val = JSON.stringify(val);
            }
            process.env[cfg] = val;
        }

        if (!configs['UV_THREADPOOL_SIZE']) {
            process.env.UV_THREADPOOL_SIZE = 128;
        }

        if(process.env.REGION && process.env.APP_NAME) {
            process.env.APP_NAME += `_${process.env.REGION.toUpperCase()}`;
        }
    }
    dbConnect(configName = "MONGO_URI") {
        if (this.EnableDB && process.env[configName]) {
            let conn = new Connection(process.env[configName]);
            conn.connect(true);
            global.DB = conn;

            if (fs.existsSync(this.ModelDBPath)) {
                require(this.ModelDBPath).load();
            }
        }
    }
    logger() {
        if (this.EnableLog) {
            global.Logger = new Logger();
        }
    }
}