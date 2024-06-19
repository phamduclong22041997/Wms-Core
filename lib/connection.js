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

const mongoose = require('mongoose');
const paginationPlugin = require('./../plugins/paginatorPlugin');
const modelPlugin = require('./../plugins/mongoModelPlugin');
const fs = require('fs');

const OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    maxPoolSize: 100,
    minPoolSize: 20,
    socketTimeoutMS: 90000,
    serverSelectionTimeoutMS: 5000,
    family: 4,
    keepAlive: true,
    keepAliveInitialDelay: 300000
}
class Connection {
    constructor(url, name) {
        this._url = url;
        this.session = null;
        this.readyState = 0; //1: connected, 0: disconnected
        if (name) {
            this.NAME = name;
        }
    }
    connect(isDefault) {
        if(process.env.REGION) {
            this._url = this._url.replace("%suffix%", process.env.REGION.toLowerCase());
        }
        console.log("DB: " + this._url)
        if (isDefault === false) {
            mongoose.set('useCreateIndex', true);
            this._db = mongoose.createConnection(this._url, OPTIONS);
            this._db.once('connected', () => {
                this.readyState = 1;
                console.log("connect database successful.");
            });
            this._db.once('error', (err) => {
                this.readyState = 0;
                console.log(err);
            });
            this._db.once('disconnected', () => {
                this.readyState = 0;
                console.log("disconnected database.")
            });
        } else {
            mongoose.connection.on('error', (err) => {
                this.readyState = 0;
                console.log(err);
            });
            mongoose.connection.once('open', () => {
                this.readyState = 1;
                console.log("connect database successful.")
            });
            mongoose.connection.once('disconnected', () => {
                this.readyState = 0;
                console.log("disconnected database.")
            });
            mongoose.set('useCreateIndex', true);
            mongoose.connect(this._url, OPTIONS);
            this._db = mongoose.connections[0];
        }
        this.addModel(require("./../model/validateLogs"));
    }

    addModel(model, plugins = []) {
        if (this._db.models[model.name] === undefined) {
            let _modelSchema = model.getSchema();

            _modelSchema['IsDeleted'] = { type: Number, default: 0 };
            _modelSchema['CreatedDate'] = { type: Date };
            _modelSchema['UpdatedDate'] = { type: Date };;
            // _modelSchema['LastModified'] = Date;
            _modelSchema['CreatedBy'] = mongoose.Schema.Types.Mixed;
            // _modelSchema['CreatedByName'] = mongoose.Schema.Types.Mixed;
            _modelSchema['UpdatedBy'] = mongoose.Schema.Types.Mixed;
            // _modelSchema['UpdatedByName'] = mongoose.Schema.Types.Mixed;
            _modelSchema['__vjob_status'] = { type: Number, default: 0, index: true };
            _modelSchema['__vjob_priority'] = { type: Number, default: 0, index: true };
            _modelSchema['__vjob_retry_time'] = { type: Number, default: 0 };
            _modelSchema['__vjob_result'] = mongoose.Schema.Types.Mixed;
            _modelSchema['CalendarDay'] = String;


            if (model.expires) {
                _modelSchema['CreatedDate'].index = { expires: model.expires };
            }

            let schema = new mongoose.Schema(_modelSchema);
            schema.plugin(paginationPlugin);
            if (plugins && Array.isArray(plugins)) {
                for (let plugin of plugins) {
                    schema.plugin(plugin);
                }
            }
            modelPlugin.register(schema);
            //Register indexing
            if(model.indexes) {
                for(let item of model.indexes || []) {
                    if(typeof item == 'object') {
                        schema.index(item);
                    }
                }
            }
            
            (this._db.model(model.name, schema, model.collection))['DB_NAME'] = this.NAME || "DEFAULT";

            if (model.enableHistory) {
                const schemaHis = new mongoose.Schema(_modelSchema);
                (this._db.model(model.name + 'History', schemaHis, model.collection + 'History'))['DB_NAME'] = this.NAME || "DEFAULT";
            }
        }
    }

    exists(name) {
        return this._db.models[name] != undefined;
    }

    loadModel(dir) {
        let pwd = process.env.PWD;
        fs.readdirSync(`${pwd}/${dir}`).forEach(file => {
            let model = require(`${pwd}/${dir}/${file}`);
            this.addModel(model);
        });
    }

    getCollection(name) {
        return this._db.model(name);
    }
    getInstance() {
        return this._db;
    }
    async close(allConnection = false) {
        if (allConnection) {
            await mongoose.disconnect();
        } else {
            if (this._db) {
                await this._db.close(true);
            }
        }
    }

    async startTransaction() {
        this.session = await this._db.startSession();
        this.session.startTransaction();
    }

    async commitTransaction() {
        if (this.session) {
            await this.session.commitTransaction();
            this.session.endSession();
            this.session = null;
        }
    }

    async rollbackTransction() {
        if (this.session) {
            await this.session.abortTransaction();
            this.session.endSession();
            this.session = null;
        }
    }

    getSession() {
        return this.session;
    }
}

module.exports = Connection;