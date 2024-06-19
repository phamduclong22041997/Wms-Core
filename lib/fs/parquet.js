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

//Ref: https://www.npmjs.com/package/parquets

let parquet = null;
let Storage = null;

try {
    parquet = require('parquets');
    Storage = require("@google-cloud/storage").Storage;
} catch (err) {
    console.log('parquetjs support is disabled!');
}
module.exports = class Parquet {
    constructor(filePath = "", schema) {
        if(!parquet) {
            throw Error('parquetjs support is disabled!');
        }
        this.filePath = filePath;
        this.schema = schema;
    }
    async __init() {
        if(/[.]parquet$/.test(this.filePath) == false) {
            this.filePath += ".parquet";
        }
        this.writer = await parquet.ParquetWriter.openFile( new parquet.ParquetSchema(this.schema), this.filePath);
    }
    async start() {
        await this.__init();
    }
    async write(data) {
        await this.writer.appendRow(data);
    }
    async end() {
        await this.writer.close();
        return this.filePath;
    }
    /**
     * 
     * @param {FilePath: String, BucketName: String, DestFileName: String} config 
     * @param {*} retryTime 
     * @returns 
     */
    async sync2GCP(config, retryTime = 0) {
        if (!process.env.GCP_OVFOCUS_CREDENTIALS) {
            throw Error(`Invalid GCP CREDENTIALS.`);
        }
        if (!fs.existsSync(config.FilePath)) {
            return "";
        }
    
        let filePath = "";
        try {
            let stats = fs.statSync(config.FilePath);
            if (stats.size > 0) {
                // Creates a client
                const storage = new Storage({
                    keyFilename: process.env.GCP_OVFOCUS_CREDENTIALS,
                });
    
                let resp = await storage
                    .bucket(config.BucketName)
                    .upload(config.FilePath, {
                        destination: config.DestFileName,
                        timeout: 300000,
                        resumable: true
                    });
                if (resp && resp.length) {
                    console.log(
                        `-----${config.FilePath} uploaded to ${config.BucketName}`
                    );
                    filePath = `gs://${resp[0].metadata["bucket"]}/${resp[0].metadata["name"]}`;
                } else {
                    console.log(
                        `-----Fail upload file ${config.FilePath} to ${config.BucketName}`
                    );
                }
            }
    
            fs.unlinkSync(config.FilePath);
        } catch (err) {
            console.log(err);
            if (retryTime <= 3) {
                await sleep(1000);
                await pushFileToStorage(config, ++retryTime);
            } else {
                throw Error(err.message);
            }
        }
    
        return filePath;
    }
}