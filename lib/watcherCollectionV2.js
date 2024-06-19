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

const moment = require("moment-timezone");

let TMP_OBJECTS = {}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
class WatcherCollection {
    constructor(model, pipeline, options, asyncProcess = 0) {
        this.QUEUE_SUFFIX = "";
        this._model = model;
        this.delayTime = 0;
        this.isProcessing = 0;
        this.filters = { __vjob_status: { $in: [0, null] } };
        this.buildEvent(pipeline, options);
        this.asyncProcess = asyncProcess;
        this.changeStream = null;
        this.secondaryPreferred = false;
        this.readyState = 0;
        this.statesSignal = 1;
        this.totalRecords = 0;

        this.stageA = null;
        this.stateB = null;
    }
    hasShutdown() {
        return global.SIGTERM_SIGNAL === 1;
    }
    hasSuspend() {
        return this.statesSignal === 0;
    }
    hasDelay() {
        if (this.DelayTimeStr) {
            let _delayTime = this.DelayTimeStr.trim().split("-");
            if (_delayTime.length > 1) {
                let firstTime = _delayTime[0].split(":");
                let secondTime = _delayTime[1].split(":");
                if (firstTime.length > 1 && secondTime.length > 1) {
                    const now = moment().tz(process.env.TZ);
                    const nightStart = now.clone().set({ hour: parseInt(firstTime[0]), minute: parseInt(firstTime[1]), second: 0, millisecond: 0 });
                    const nightEnd = now.clone().set({ hour: parseInt(secondTime[0]), minute: parseInt(secondTime[1]), second: 0, millisecond: 0 });
                    if (now.isBetween(nightStart, nightEnd)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    setPriority(obj) {
        if (obj) {
            this.priorityObj = obj;
        }
    }
    setDelayTimeStr(str) {
        this.DelayTimeStr = str;
    }
    setDelayTime(delayTime) {
        this.delayTime = delayTime;
    }
    setDBPreferred(hasPreferred) {
        this.secondaryPreferred = hasPreferred;
    }
    setSuffix(suffix) {
        this.QUEUE_SUFFIX = suffix ? `_${suffix}` : "";
    }
    async getFilters() {
        return { __vjob_status: { $in: [0, null] } };
    }
    buildEvent(pipeline = null, options = null) {
        this._watcher = new (require('events')).EventEmitter();
        this._watcher.options = options;
        this._watcher.pipeline = pipeline;

        if (this._watcher.options) {
            this._watcher.options['batchSize'] = 100;
        }

        if (this._model && this._model.events) {
            if (this._model.events.listenerCount("STATES_SIGNAL") == 0) {
                this._model.events.on("STATES_SIGNAL", (signal) => {
                    this.statesSignal = signal;
                })
            }
        }
    }
    supervisor() {
        try {
            let triggerProcess = 1;
            if (!this.changeStream) {
                triggerProcess = 0;
                this.start();
            }
            if (this.changeStream && this.changeStream.closed === true) {
                triggerProcess = 0;
                this.start();
            }
            if (this.stageB) {
                let current = new Date().getTime();
                if ((current - this.stageB) >= 1800000) {
                    this.start();
                    this.isProcessing = 0;
                    triggerProcess = 0;
                    this.stateB = new Date().getTime();
                }
            }
            if (triggerProcess === 1 && this.isProcessing == 0) {
                this.processHandle();
            }
        } catch (err) { }
    }
    async publish() {
        try {
            this.processHandle();
        } catch (err) {
            console.log(`Err: ${err.message}`);
        }
    }
    async onError(id,) {
        let _saveData = {
            __vjob_status: 3,
            '__vjob_result.end_time': new Date()
        }
        await this._model.updateOne({ _id: id }, { $set: _saveData });
    }
    async onProcessing(id) {
        let _saveData = {
            __vjob_status: 2,
            __vjob_result: {
                start_time: new Date(),
                end_time: null
            }
        }
        await this._model.updateOne({ _id: id }, { $set: _saveData });
    }
    async onFinish(data, id) {
        let _saveData = {
            __vjob_status: 1,
            '__vjob_result.end_time': new Date()
        }
        if (data) {
            _saveData['__vjob_result.data'] = data;
        }
        await sleep(300);
        await this._model.updateOne({ _id: id }, { $set: _saveData });

        if(TMP_OBJECTS[id.toString()]) {
            delete TMP_OBJECTS[id.toString()];
        }
    }
    onComplete() {
        return true;
    }
    async onHandle() {
        await sleep(500);
        return null;
    }
    async exec(doc) {
        this.stageB = new Date().getTime();
        if (this.hasShutdown()) {
            return;
        }
        if(TMP_OBJECTS[doc._id.toString()]) {
            return;
        }
        TMP_OBJECTS[doc._id.toString()] = 1;
        this.onProcessing(doc._id);
        return await this.onFinish(await this.onHandle(doc), doc._id);
    }
    async processHandle() {
        if (this.hasShutdown()) {
            return;
        }
        if (this.hasSuspend()) {
            this.stageB = new Date().getTime();
            console.log(`The QUEUE_${process.env.APP_NAME}${this.QUEUE_SUFFIX} was suspended.`);
            return;
        }
        if (this.hasDelay()) {
            this.stageB = new Date().getTime();
            console.log(`The QUEUE_${process.env.APP_NAME}${this.QUEUE_SUFFIX} was suspended.`);
            return;
        }
        this.stageA = new Date().getTime();
        try {
            if (this.isProcessing == 1) {
                return;
            }
            this.isProcessing = 1;

            let filters = await this.getFilters() || {};
            filters['__vjob_status'] = { $in: [0, null] };
            let _limit = this.asyncProcess || 5;

            let _priority = { __vjob_priority: -1, _id: 1 };
            if (this.priorityObj) {
                _priority = this.priorityObj;
            }

            console.log(`Queue processing list [${process.env.APP_NAME}${this.QUEUE_SUFFIX}]: ${Object.keys(TMP_OBJECTS)}`);

            while (true) {
                let allowBreak = true;
                let cursor = {};
                this.stageB = new Date().getTime();

                if (this.secondaryPreferred) {
                    cursor = await this._model.find(filters).limit(_limit).read('secondaryPreferred').sort(_priority);
                } else {
                    cursor = await this._model.find(filters).limit(_limit).sort(_priority);
                }

                if (!this.asyncProcess) {
                    for (let i in cursor) {
                        this.stageB = new Date().getTime();
                        allowBreak = false;
                        let doc = await this._model.findOne({ _id: cursor[i]._id });
                        if (!doc) {
                            continue;
                        }

                        if (doc.__vjob_status)
                            continue;

                        if (this.hasShutdown()) {
                            break;
                        }
                        if(TMP_OBJECTS[doc._id.toString()]) {
                            return;
                        }
                        TMP_OBJECTS[doc._id.toString()] = 1;

                        this.onProcessing(doc._id);
                        this._watcher.emit('data', doc);
                        await this.onFinish(await this.onHandle(doc), doc._id);
                    }
                } else {
                    if (cursor.length) {
                        allowBreak = false;
                        await Promise.all(cursor.map(doc => this.exec(doc)))
                    }
                }

                if (this.isProcessing == 0) {
                    break;
                }

                if (this.hasShutdown()) {
                    console.log(`Has Suppending!`)
                    this.close();
                    break;
                }

                if (this.delayTime) {
                    await sleep(this.delayTime);
                }

                if (allowBreak) {
                    break;
                }
            }
        } catch (err) {
            console.log(`${process.env.APP_NAME}: Process error [${new Date().toISOString()}]`);
            console.log(err);
            TMP_OBJECTS = {};
        }

        this.isProcessing = 0;
        this.onComplete();
    }
    start() {
        // this.isProcessing = 0;
        TMP_OBJECTS = {};
        this.close();
        setTimeout(async () => {
            this.changeStream = this._model.watch(this._watcher.pipeline, this._watcher.options);
            this.changeStream.on('change', resp => {
                this.publish();
            })
                .on('error', error => {
                    console.log(`Watcher queue error: ${new Date().toISOString()}`);
                    console.log(error);
                })
                .on('end', data => {
                    console.log(`Watcher queue ${new Date().toISOString()}: End connection`);
                })
                .on('close', event => {
                    console.log(`Watcher queue [${new Date().toISOString()}]: Close connection`);
                    this.start();
                });
            this.readyState = 1
            this.publish();
        }, 1000)
    }
    connect() {
        setTimeout(async () => {
            this.supervisor();
        }, 1000);

        setInterval(() => {
            this.supervisor();
        }, 15000)

        return this._watcher;
    }
    close() {
        if (this.changeStream && this.changeStream.closed === false) {
            this.changeStream.close();
        }
    }
}

module.exports = WatcherCollection;