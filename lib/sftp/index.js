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

let sftpClient = null;
const fs = require("fs");

try {
    sftpClient = require('ssh2-sftp-client');
} catch (err) {
    console.log('ssh2-sftp-client support is disabled!');
}

module.exports = class SFTP {
    constructor(config) {
        if (sftpClient == null) {
            throw Error('ssh2-sftp-client support is disabled!');
        }
        this.CLIENT = new sftpClient();
        this.CONF = config;
    }
    async connect() {
        await this.CLIENT.connect(this.CONF['AUTH']);
        return this;
    }
    async putFile(srcFile, filename) {
        let remotePath = this.CONF['SOURCE_DIR'] + '/' + srcFile;
        if(filename) {
            remotePath = this.CONF['SOURCE_DIR'] + '/' + filename;
        }
        
        let localPath = this.CONF['DESTINATION_DIR'] + '/' + srcFile;
        if(!fs.existsSync(localPath)) {
            throw Error(`File [${filename}] not found.`);
        }
        let data = fs.createReadStream(localPath);
        return await this.CLIENT.put(data, remotePath);
    }
    async getFileByStream(filename) {
        if (!this.CLIENT) {
            return false;
        }
        let remotePath = this.CONF['SOURCE_DIR'] + '/' + filename;
        let localPath = this.CONF['DESTINATION_DIR'] + '/' + filename;
        let data = await this.CLIENT.get(remotePath);
        if(data) {
            fs.writeFileSync(localPath, data, {encoding: "utf8"});
            return localPath;
        }
        return "";
    }
    async getFile(filename) {
        if (!this.CLIENT) {
            return false;
        }
        let remotePath = this.CONF['SOURCE_DIR'] + '/' + filename;
        let localPath = this.CONF['DESTINATION_DIR'] + '/' + filename;
        return await this.CLIENT.fastGet(remotePath, localPath);
    }
    async listFile(dir, pattern = /.*/) {
        if (!this.CLIENT) {
            return [];
        }
        return await this.CLIENT.list(dir, pattern);
    }
    async remove(filename) {
        let remotePath = this.CONF['SOURCE_DIR'] + '/' + filename;
        return await this.CLIENT.delete(remotePath);
    }
    async stat(path) {
        if (!this.CLIENT) {
            return {};
        }
        return await this.CLIENT.stat(path);
    }
    async end() {
        if (!this.CLIENT) {
            return;
        }
        await this.CLIENT.end();
    }
}