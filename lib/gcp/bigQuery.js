/*
 * @copyright
 * Copyright (c) 2021 OVTeam
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

let BQuery = null;
try {
    BQuery = require('@google-cloud/bigquery').BigQuery;
} catch (err) {
    console.log('@google-cloud/bigquery support is disabled!');
}

class BigQuery {
    constructor(datasetId, tableId, options = {}) {
        if (BigQuery == null) {
            throw Error('@google-cloud/bigquery support is disabled!');
        }
        this.datasetId = datasetId;
        this.tableId = tableId;
        this.BQ = new BQuery(this.loadOptions(options));
    }

    loadOptions(options) {
        if (!options) {
            options = {};
        }
        let envName = options['KeyFile'] || "GCP_SERVICE_ACCOUNT";

        if (!process.env[envName]) {
            throw Error('Missing GCP_SERVICE_ACCOUNT configuration.');
        }
        let config = require(process.env[envName]);
        return {
            keyFilename: process.env[envName],
            projectId: config.project_id,
        }
    }

    async addColumns(cols) {
        let result = null;
        try {
            // Retrieve current table metadata
            const table = this.BQ.dataset(this.datasetId).table(this.tableId);
            const [metadata] = await table.getMetadata();

            // Update table schema
            const schema = metadata.schema;
            const new_schema = schema;
            for (const col of cols) {
                if (col.name && col.type) {
                    new_schema.fields.push(col);
                }
            }

            metadata.schema = new_schema;

            result = await table.setMetadata(metadata);
        } catch (err) {
            console.log(err)
        }
        this.loging({ Action: 'ADD_COLUMN', DatasetId: this.datasetId, TableId: this.tableId, Data: cols }, result);
    }

    async insert(rows) {
        let result = null;
        try {
            result = await this.BQ
                .dataset(this.datasetId)
                .table(this.tableId)
                .insert(rows);
        } catch (err) {
            console.log(err);
            result = err.message;
        }
        this.loging({ Action: 'INSERT', DatasetId: this.datasetId, TableId: this.tableId, Data: rows }, result);
    }

    async query(sqlQuery, options = {}) {
        try {
            if (!options) {
                options = {}
            }
            options['query'] = sqlQuery;
            return await this.BQ.query(options);
        } catch (err) {
            console.log(err);
        }
        return [];
    }

    async loging(request, response) {
        if (global.Logger) {
            global.Logger.logData("GCPDataSetLog", {
                Request: request,
                Response: response
            })
        }
    }
}

module.exports = BigQuery;