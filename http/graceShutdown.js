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
 * Modified by: Duy Huynh
 * Modified date: 2021/09/28
 * Ref: https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
 *      https://github.com/godaddy/terminus
 */

const mongoose = require('mongoose');
let createTerminus = null;

try {
    createTerminus = require('@godaddy/terminus').createTerminus;
} catch (err) {
    console.log('@godaddy/terminus is disabled!');
}

async function onSignal() {
    console.log('service is starting cleanup');
    await mongoose.disconnect();
}

async function onHealthCheck() {
    // checks if the system is healthy, like the db connection is live
    // resolves, if health, rejects if not
}

function beforeShutdown() {
    // given your readiness probes run every 5 second
    // may be worth using a bigger number so you won't
    // run into any race conditions
    console.log('Before shutting down');
    global.SIGTERM_SIGNAL = 1;

    return new Promise(resolve => {
        setTimeout(resolve, 60000)
    })
}

function register(server) {
    if (createTerminus) {
        createTerminus(server, {
            signal: 'SIGTERM',
            healthChecks: { '/healthcheck': onHealthCheck },
            onSignal,
            beforeShutdown
        });
    }
}

module.exports = {
    register
}