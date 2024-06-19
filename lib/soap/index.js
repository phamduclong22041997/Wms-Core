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

let soap = null;
const Utils = require("./../utils");

try {
    soap = require('soap');
} catch (err) {
    console.log('soap support is disabled!');
}

module.exports = class SOAP {
    constructor(endpoint, name, auth) {
        if (soap == null) {
            throw Error('soap support is disabled!');
        }
        this.SOAP_OPTIONS = {
            wsdl_headers: {
                'Authorization': 'Basic ' + Utils.decrypt(auth)
            },
            wsdl_options: {
                timeout: process.env.SOAP_TIMEOUT || 10000
            }
        }

        this.SOAP_ENPOINT = endpoint;
        this.CLIENT = null;
        this.RESPONSE_TEMPLATE = null;
        this.SERVICE_NAME = name;
        this.RETRY_TIME = process.env.RETRY_TIME || 1;
        this.SOAP_AUTHENTICATION = auth;
        this.PROXY = "";
    }
    async connect() {
        console.log(`Soap: Connect to server [${new Date().toISOString()}] ...`);
        return new Promise((resolve, reject) => {
            soap.createClient(this.SOAP_ENPOINT, this.SOAP_OPTIONS, (err, client) => {
                if (err) {
                    console.log(`Soap: Connect error [${new Date().toISOString()}]: ${err.message}`);
                    reject(err.message);
                    throw Error(`Soap: Connect error [${new Date().toISOString()}]: ${err.message}`);
                } else {
                    console.log(`Soap: Connect successful [${new Date().toISOString()}]`);
                    this.CLIENT = client;
                    this.applySecurity();
                    resolve(this);
                }
            });
        })
    }
    applySecurity() {
        let secret = Buffer.from(Utils.decrypt(this.SOAP_AUTHENTICATION), 'base64').toString('utf8');
        secret = secret.split(":");
        this.CLIENT.setSecurity(new soap.BasicAuthSecurity(secret[0], secret[1]));
    }
    disconnect() {
        if (this.CLIENT) {
            this.CLIENT.close();
        }
    }
    setEndpoint(endpoint) {
        if (this.CLIENT) {
            this.CLIENT.setEndpoint(endpoint);
        }
    }
    setResponseTemplate(template) {
        //ref: https://www.npmjs.com/package/camaro
        this.RESPONSE_TEMPLATE = template;
    }
    setProxy(proxy) {
        this.PROXY = proxy;
    }
    async send(func, postData) {
        return await this.exec(func, postData);
    }
    async exec(func, postData) {
        if (!this.CLIENT) {
            return null;
        }
        return new Promise((resolve, reject) => {
            try {
                let options = {}
                if(this.PROXY) {
                    options['proxy']  =this.PROXY;
                }
                this.CLIENT[func](postData, (err, result, rawResponse, soapHeader, rawRequest) => {
                    if (err) {
                        console.log(`Soap: Error [${new Date().toISOString()}]: [${err.message}]`);
                        this.logger({
                            'Service': this.SOAP_ENPOINT,
                            'ServiceName': this.SERVICE_NAME,
                            'Function': func,
                            'Request': rawRequest,
                            'Response': typeof err == 'object'? err.message:err
                        });
                        resolve({
                            Error: err.message,
                            Code: 1
                        });
                    } else {
                        // console.log(`Response [${new Date().toISOString()}]: [${rawResponse}]`);
                        this.logger({
                            'Service': this.SOAP_ENPOINT,
                            'ServiceName': this.SERVICE_NAME,
                            'Function': func,
                            'Request': rawRequest,
                            'Response': rawResponse
                        });
                        let resp = { Code: 0, Data: result ? result.Response : rawResponse, Raw: rawResponse, Result: result }
                        if(!resp.Data && result) {
                            resp.Data = result['ReturnMess'] || result;
                        }
                        resolve(resp)
                    }
                }, options);
            } catch (err) {
                this.logger({
                    'Service': this.SOAP_ENPOINT,
                    'ServiceName': this.SERVICE_NAME,
                    'Function': func,
                    'Request': "",
                    'Response': typeof err == 'object'? err.message:err
                });
                resolve({
                    Error: err.message,
                    Code: 1
                });
            }
        })
    }
    info() {
        if (!this.CLIENT) {
            return null;
        }
        return this.CLIENT.describe();
    }
    logger(data) {
        try {
            if (!global.Logger) {
                return false;
            }
            Logger.logData("SOAPServiceRequestResponse", data);
        } catch (err) {
            console.log(err);
            return false;
        }
    }
}