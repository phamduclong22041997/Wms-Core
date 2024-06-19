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

let crypto = null;

try {
    crypto = require('crypto');
} catch (err) {
    console.log('crypto support is disabled!');
}

exports.hash = (text) => {
    if (!crypto) {
        throw Error('crypto support is disabled!');
    }
    return crypto.createHmac('sha256', process.env.CRYPTO_PRIVATE_KEY)
        .update(text)
        .digest('hex');
}

exports.encrypt = (text, privateKey = null) => {
    if (!crypto) {
        throw Error('crypto support is disabled!');
    }
    let algorithm = 'aes-192-cbc';
    if(process.env.CRYPTO_ALGORITHM) {
        algorithm = process.env.CRYPTO_ALGORITHM;
    }
    let keyLength = 24;
    if(algorithm == "aes-256-cbc") {
        keyLength = 32;
    }
    const key = crypto.scryptSync(privateKey || process.env.CRYPTO_PRIVATE_KEY, 'salt', keyLength);
    // Generate a random iv
    const iv = Buffer.alloc(16, 0);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

exports.decrypt = (encrypted, privateKey = null) => {
    if (!crypto) {
        throw Error('crypto support is disabled!');
    }

    let algorithm = 'aes-192-cbc';
    if(process.env.CRYPTO_ALGORITHM) {
        algorithm = process.env.CRYPTO_ALGORITHM;
    }
    let keyLength = 24;
    if(algorithm == "aes-256-cbc") {
        keyLength = 32;
    }
    const key = crypto.scryptSync(privateKey || process.env.CRYPTO_PRIVATE_KEY, 'salt', keyLength);
    // Generate a random iv
    const iv = Buffer.alloc(16, 0);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    // decipher.setAutoPadding(false);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

exports.convertXML2Json = async (xml, options = {}) => {
    let xml2js = null;
    try {
        xml2js = require('xml2js');
    } catch (err) {
        throw Error('xml2js support is disabled!');
    }

    if(!options) {
        options = {};
    }
    options['mergeAttrs'] = true;
    options['explicitArray'] = false;

    return await xml2js.parseStringPromise(xml, options);
}