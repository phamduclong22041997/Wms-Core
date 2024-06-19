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
const Model = require("./Model");

const {
    isMainThread,
    Worker
} = require('worker_threads');

const STATUS = {
    COMPLETED: 'COMPLETED',
    PROCESSING: 'PROCESSING',
    NEW: 'NEW'
}
module.exports = class OVThread {
    constructor(name, options = {}) {
        this.Name = name;
        if (!DB.exists(Model.name)) {
            DB.addModel(Model);
        }

        this.NUNBER_OF_THREAD = options['NumberOfThread'] || 8;
        this.MAX_SIZE = options['MaxSize'] || 20;
        this.CONTAINER = {};
        this.COUNTER = 0;
        this.TOTAL = 0;
    }
    async analyze(data, options) {
        await DB.getCollection("OVThread").updateMany({ Name: this.Name, IsDeleted: 0, Status: STATUS.NEW }, { $set: { IsDeleted: 1 } })
        let saveData = [];
        let _tmp = [];
        for (let i in data) {
            _tmp.push(data[i]);
            if (_tmp.length == this.MAX_SIZE) {
                saveData.push({
                    Name: this.Name,
                    HighestPriority: options['HighestPriority'],
                    LowestPriority: _tmp.length,
                    EndPoint: options['EndPoint'],
                    Status: STATUS.NEW,
                    Data: _tmp
                });
                _tmp = [];
            }
        }
        if (_tmp.length > 0) {
            saveData.push({
                Name: this.Name,
                HighestPriority: options['HighestPriority'],
                LowestPriority: _tmp.length,
                Status: STATUS.NEW,
                EndPoint: options['EndPoint'],
                Data: _tmp
            });
            _tmp = null;
        }
        if (saveData.length) {
            await DB.getCollection("OVThread").create(saveData);
        }
        this.TOTAL = saveData.length;
        return this;
    }
    onFinish(flag) {
    }
    async next(result, filters) {
        if (!isMainThread) {
            return;
        }
        if (result && result.Id) {
            await DB.getCollection("OVThread").updateOne({ _id: result.Id }, {
                $set: {
                    Message: result.Message,
                    Status: STATUS.COMPLETED,
                    EndTime: moment().tz(process.env.TZ).format("YYYY/MM/DD HH:mm:ss.SSS")
                }
            });
        }
        let _limit = this.NUNBER_OF_THREAD;
        if (result != null) {
            _limit = 1;
        }

        let cursor = await DB.getCollection("OVThread").find({ Name: this.Name, IsDeleted: 0, Status: STATUS.NEW })
            .limit(_limit).sort({ LowestPriority: 1 }).exec();

        let _counter = 0;
        for (let doc of cursor) {
            let key = doc._id.toString();
            if (this.CONTAINER[key]) {
                continue;
            }
            if(_counter >= _limit) {
                break;
            }
            this.CONTAINER[key] = 1;
            await DB.getCollection("OVThread").updateOne({ _id: doc._id }, {
                $set: {
                    Status: STATUS.PROCESSING,
                    StartTime: moment().tz(process.env.TZ).format("YYYY/MM/DD HH:mm:ss.SSS")
                }
            });
            this.start(doc, filters);
            _counter += 1;
        }
    }
    start(data, filters) {
        const worker = new Worker(data.EndPoint, { workerData: { value: data.Data, filters: filters } });
        worker.Id = data._id;
        worker.once('message', (result) => {
            this.COUNTER += 1;
            console.log(`Processed [${worker.threadId}]: ${worker.Id}`);
            if (this.COUNTER == this.TOTAL) {
                this.onFinish(true);
            }
        });
        worker.once('exit', (code) => {
            if (code !== 0) {
                this.next({ Id: worker.Id, Message: `Process error: ${code}` }, filters)
            } else {
                this.next({ Id: worker.Id, Message: "" }, filters);
            }
        });
    }
    exec(filters) {
        this.next(null, filters);
    }
}