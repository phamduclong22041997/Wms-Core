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

const request = require('request');
const queryString = require("querystring");

/**
 * @param options Include (method, url, body)
 */
function post(_options, v2 = false) {
    return new Promise(function (resolve, reject) {
        let options = {
            'method': 'POST',
            'url': _options.url,
            'body': JSON.stringify(_options.body || {}),
            'form': _options.form || {},
            'headers': _options.headers || {},
            'json': _options.json || false,
        };
        if(v2 === true) {
            options = {
                'method': 'POST',
                'url': _options.url,
                'body': JSON.stringify(_options.body || {}),
                'headers': _options.headers || {}
            };
        }
        if(_options['formData']) {
            options = {
                'method': 'POST',
                'url': _options.url,
                'formData': _options['formData'],
                'headers': _options.headers || {}
            };
        }
        
        request(options, function (error, response) {
            var data = {
                Body: "",
                Status: false
            };
            if (response && response.body) {
                let _date = new Date();
                data.Body = JSON.parse(response.body)
                data.Status = true
                data.Date = _date
            }
            resolve(data);
        });
    })
}

/**
 * @param options Include (method, url, body)
 */
 function put(_options, v2 = false) {
    return new Promise(function (resolve, reject) {
        let options = {
            'method': 'PUT',
            'url': _options.url,
            'body': JSON.stringify(_options.body || {}),
            'form': _options.form || {},
            'headers': _options.headers || {},
            'json': _options.json || false,
        };
        if(v2 === true) {
            options = {
                'method': 'PUT',
                'url': _options.url,
                'body': JSON.stringify(_options.body || {}),
                'headers': _options.headers || {}
            };
        }
        if(_options['formData']) {
            options = {
                'method': 'PUT',
                'url': _options.url,
                'formData': _options['formData'],
                'headers': _options.headers || {}
            };
        }
        
        request(options, function (error, response) {
            var data = {
                Body: "",
                Status: false
            };
            if (response && response.body) {
                let _date = new Date();
                data.Body = JSON.parse(response.body)
                data.Status = true
                data.Date = _date
            }
            resolve(data);
        });
    })
}


/**
 * @param options Include (method, url, body)
 */
function get(_options) {
    return new Promise(function (resolve, reject) {
        let options = {
            'method': 'GET',
            'url': _options.url + '?' + queryString.stringify(_options.params),
            'headers': _options.headers || {}
        };
        request(options, function (error, response) {
            var data = {
                Body: "",
                Status: false
            };
            if (response && response.body) {
                let _date = new Date();
                data.Body = JSON.parse(response.body)
                data.Status = true
                data.Date = _date
            }
            resolve(data);
        });
    })
}

module.exports = {
    post,
    put,
    get
}
