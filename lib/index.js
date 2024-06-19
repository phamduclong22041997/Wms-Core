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

'use struct';
const Connection = require("./connection");
const ServerResponse = require("./response");
const Logger = require("./logger");
const WatcherCollection = require("./watcherCollection");
const Notification = require("./notification");
const OVGateway = require("./ovgateway");
const MGraph = require("./mgraph/uploadFile");
const Redis = require("./redis");

module.exports = {
    Connection,
    ServerResponse,
    Logger,
    WatcherCollection,
    Notification,
    OVGateway,
    MGraph,
    Redis,
    RegisterInstance: () => {
        // const dns = require("dns");
        // dns.setServers(['8.8.8.8', '8.8.4.4']);
        process.env["NO_PROXY"] = "*";
        process.env.UV_THREADPOOL_SIZE = 128;

        let guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        process.env.APP_INSTANCE = guid + new Date().getTime();
    }
}