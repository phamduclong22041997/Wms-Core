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

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
class WatcherCollection {
    constructor(model, pipeline, options, asyncProcess = 0) {
        this.QUEUE_SUFFIX = "";
        this._model = model;
        this.buildEvent(pipeline, options);
        this.asyncProcess = asyncProcess;
        this.docs = [];
        this.isProcessing = false;
        this.state = 0;
        this.changeStream = null;
        this.statesSignal = 1;
        this.coll = options['CollectionName'];
        this.enableValidate = false;
    }
    hasShutdown() {
        return global.SIGTERM_SIGNAL === 1;
    }
    hasSuspend() {
        return this.statesSignal === 0;
    }
    setPriority(obj) {
        if (obj) {
            this.priorityObj = obj;
        }
    }
    setSuffix(suffix) {
        this.QUEUE_SUFFIX = suffix ? `_${suffix}` : "";
    }
    setEnableValidate(validate) {
        this.enableValidate = validate;
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
    async supervisor() {
        try {
            if (!this.changeStream) {
                this.start();
            }
            if (this.changeStream && this.changeStream.closed === true) {
                this.start();
            }
            this.state += 1;
            if (this.asyncProcess && this.state >= 5) {
                if (this.asyncProcess && !this.isProcessing && this.docs.length > 0) {
                    console.log("Process last docs.");
                    this.isProcessing = true;
                    await Promise.all(this.docs.map(doc => this.exec(doc)));
                    this.docs = [];
                    this.isProcessing = false;
                }
            }
        } catch (err) { console.log(err) }
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
        await this._model.updateOne({ _id: id }, { $set: _saveData });
    }
    async onHandle() {
        await sleep(500);
        return null;
    }
    async exec(doc) {
        try {
            if (this.hasShutdown()) {
                return;
            }
            if (!await this.hasNext(doc._id)) {
                return;
            }
            if (this.enableValidate) {
                await DB.getCollection("ValidateLogs").create({
                    key: doc._id.toString(),
                    db: DB._db['name'],
                    coll: this.coll
                });
            }
            await this.onProcessing(doc._id);
            return await this.onFinish(await this.onHandle(doc), doc._id);
        } catch (err) {
            return;
        }
    }
    async captureResumeToken(data) {
        await DB.getCollection("ChangeStreamLogs").deleteMany({
            db: data.db,
            coll: this.coll,
            key: `${process.env.APP_NAME}${this.QUEUE_SUFFIX}`
        });
        await DB.getCollection("ChangeStreamLogs").create({
            db: data.db,
            coll: this.coll,
            key: `${process.env.APP_NAME}${this.QUEUE_SUFFIX}`,
            token: data.token
        });
    }
    async getResumeToken(data) {
        let obj = await DB.getCollection("ChangeStreamLogs").findOne({ db: data.db, coll: this.coll, key: `${process.env.APP_NAME}${this.QUEUE_SUFFIX}` });
        if (obj) {
            return {
                _data: obj.token
            }
        }
        return null;
    }
    async trigger() {
        console.log("Trigger");
        let filters = {
            CalendarDay: moment().tz(process.env.TZ).format("YYYYMMDD"),
            __vjob_status: { $in: [null, 0] }
        }
        let saveData = {
            __vjob_change_stream: new Date().getTime()
        }
        await this._model.updateMany(filters, { $set: saveData });
    }
    async hasNext(id) {
        let filters = {
            _id: id
        }
        let obj = await this._model.findOne(filters, { __vjob_status: 1 });
        return !(obj && obj['__vjob_status'])
    }
    async processHandle(doc) {
        try {
            if (this.hasShutdown()) {
                return;
            }
            if (!await this.hasNext(doc._id)) {
                return;
            }
            if (this.enableValidate) {
                await DB.getCollection("ValidateLogs").create({
                    key: doc._id.toString(),
                    db: DB._db['name'],
                    coll: this.coll
                });
            }
            await this.onProcessing(doc._id);
            await this.onFinish(await this.onHandle(doc), doc._id);
        } catch (err) { 
            return;
        }
    }
    async start() {
        try {
            this.close();
            this.isProcessing = false;
            let resumeToken = await this.getResumeToken({
                db: DB._db['name']
            });
            if (resumeToken) {
                this._watcher.options['resumeAfter'] = resumeToken;
            }
            console.log(`Start ovqueue: ${process.env.APP_NAME}${this.QUEUE_SUFFIX}`);
            this.changeStream = this._model.watch(this._watcher.pipeline, this._watcher.options);
            if (!resumeToken) {
                setTimeout(() => {
                    this.trigger();
                }, 100);
            }

            let stopSignal = 0;
            while (true) {
                if (this.hasShutdown()) {
                    break;
                }

                if (this.asyncProcess && this.docs.length >= this.asyncProcess && !this.isProcessing) {
                    this.isProcessing = true;
                    await Promise.all(this.docs.map(doc => this.exec(doc)));
                    this.isProcessing = false;
                    this.docs = [];
                }

                const next = await this.changeStream.next();
                this.state = 0;

                if (this.asyncProcess) {
                    let startTime = new Date().getTime();
                    while (this.isProcessing) {
                        let endTime = new Date().getTime();
                        if (endTime - startTime >= 180000) {
                            stopSignal = 1;
                            break;
                        }
                    }
                    if (stopSignal) {
                        break;
                    }
                    if (this.docs.length == 0) {
                        this.captureResumeToken({
                            db: next.ns['db'],
                            token: next._id['_data']
                        });
                    }
                    this.docs.push(next.fullDocument);
                } else {
                    this.captureResumeToken({
                        db: next.ns['db'],
                        token: next._id['_data']
                    });
                    await this.processHandle(next.fullDocument);
                }
            }

            if (stopSignal) {
                console.log("Restart change stream.");
                this.start();
            }
        } catch (err) {
            console.log("OVQueue:")
            console.log(err);
        }
    }
    connect() {
        setInterval(() => {
            this.supervisor();
        }, 1000)
        return this._watcher;
    }
    close() {
        if (this.changeStream && this.changeStream.closed === false) {
            this.changeStream.close();
        }
    }
}

module.exports = WatcherCollection;