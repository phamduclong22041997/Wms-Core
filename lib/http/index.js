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

 /**
  * Load config
  */
function loadConfig() {
    // const dns = require("dns");
    // dns.setServers([ '8.8.8.8', '8.8.4.4' ]);
    process.env["NO_PROXY"]="*";
    process.env.APP_INSTANCE = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    process.env.APP_INSTANCE += `${new Date().getTime()}`;

    const path = require('path');
    process.env.APP_ROOT = path.dirname(require.main.filename);

    const configs = require(`${process.env.APP_ROOT}/conf.json`);

    for (let cfg in configs) {
        let val = configs[cfg];
        if (typeof (val) === 'object') {
            val = JSON.stringify(val);
        }
        process.env[cfg] = val;
    }

    if(!configs['UV_THREADPOOL_SIZE']) {
        process.env.UV_THREADPOOL_SIZE = 128;
    }

    if(process.env.REGION && process.env.APP_NAME) {
        process.env.APP_NAME += `_${process.env.REGION.toUpperCase()}`;
    }
}

/**
 * Connect to Database
 */
function dbConnect() {
    if(process.env.MONGO_URI) {
        const Connection = require("./../connection");
        let conn = new Connection(process.env.MONGO_URI);
        conn.connect(true);
        global.DB = conn;
    }
}

function logger() {
    const Logger = require("./../logger");
    global.Logger = new Logger();
}
 
/**
 * Production mode
 */
exports.start = function(_app, _httpServer) {
    //Load configuration
    loadConfig();
    let app = _app;
    let httpServer = _httpServer;
    if(!_app) {
        const express = require('express');
        app = express();

        httpServer = app.listen(process.env.PORT, function () {
            console.log("Server running at localhost:" + process.env.PORT)
        });
    }

    init(app, httpServer);

    return {app: app, server: httpServer};
}

/**
 * Initial server
 * @param {*} app
 * @param {*} httpServer
 */
function init(app) {
    const cors = require('cors')
    const bodyParser    = require("body-parser");
    const cookieParser  = require('cookie-parser');
    const i18n  = require("i18n");
    const fs    = require("fs");
    const compression = require("compression");

    app.use(compression({
        filter: (req, res) => {
            if (!req.headers['x-compression']) {
                return false
            }
            return compression.filter(req, res)
        }
    }));
    
    app.use(cors());
    app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '50mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '50mb' }));
    app.use(bodyParser.json());
    app.use(cookieParser());

    i18n.configure({
        locales:['vi', 'en'],
        directory: process.env.APP_ROOT + '/locales',
        register: global,
        defaultLocale: 'vi',
        updateFiles: false,
        queryParameter: "lang"
    });

    require("./../../plugins/systemPlugin").register();
    
    dbConnect();
    logger();

    if(fs.existsSync(`${process.env.APP_ROOT}/start/routing.js`)) {
        require(`${process.env.APP_ROOT}/start/routing`).register(app);
    }

    if(process.env.TZ) {
        require('moment-timezone').tz.setDefault(process.env.TZ);
    }
}