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

module.exports = {
    userInfo: async (authOptions) => {
        let options = {
            'method': 'POST',
            'url': `${authOptions.host}/connect/userinfo`,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${authOptions.token}`,
                'X-From': process.env.APP_NAME
            },
            'timeout': 600,
            form: {}
        };
        return new Promise(function (resolve, reject) {
            request(options, function (error, response) {
                let resp = null;
                if (response && response.statusCode == 200 && response.body) {
                    resp = JSON.parse(response.body);
                }
                resolve(resp);
            });
        });
    },
    logout: async (authOptions) => {
        let _form = {
            'id_token_hint': authOptions.token
        };
        let options = {
            'method': 'POST',
            'url': `${authOptions.host}/connect/endsession`,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-From': process.env.APP_NAME
            },
            form: _form
        };
        return new Promise(function (resolve, reject) {
            request(options, function (error, response) {
                resolve(response.statusCode == 200);
            });
        });
    },
    authorize: async (authOptions) => {
        let _form = {
            'grant_type': authOptions.grant_type,
            'client_id': authOptions.client_id,
            'client_secret': authOptions.client_secret,
            'scope': authOptions.scope
        };

        if (authOptions.loginname && authOptions.password) {
            _form['username'] = authOptions.loginname;
            _form['password'] = authOptions.password
        }

        let options = {
            'method': 'POST',
            'url': `${authOptions.host}/connect/token`,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-From': process.env.APP_NAME
            },
            'timeout': 600,
            form: _form
        };
        return new Promise(function (resolve, reject) {
            request(options, function (error, response) {
                try {
                    if (error) {
                        console.log(error)
                    }
                    let token = "";
                    if (response && response.body) {
                        let _data = JSON.parse(response.body);
                        token = _data['access_token'];
                    }
                    resolve(token);
                } catch (err) {
                    resolve(null);
                }
            });
        });
    },
    request: async (data, requestOptions) => {
        return new Promise(function (resolve, reject) {
            let headers = {
                'Content-Type': requestOptions.contentType || 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${requestOptions.token}`,
                'X-From': process.env.APP_NAME
            }
            if (requestOptions['warehouseid']) {
                headers['warehouseid'] = requestOptions['warehouseid'];
            }
            let options = {
                'method': requestOptions.method || 'POST',
                'url': requestOptions.url,
                'headers': headers,
                'timeout': 600
            };
            if (requestOptions.formData === true) {
                options['form'] = data;
            } else {
                options['body'] = JSON.stringify(data);
            }
            if (requestOptions['warehouse']) {
                options['headers']['warehouseid'] = requestOptions['warehouse'];
            }
            if (requestOptions['timeout']) {
                options['timeout'] = requestOptions['timeout'];
            }
            request(options, function (error, response) {
                if(error) {
                    console.log(error);
                }
                if(!response) {
                    response = {
                        statusCode: ""
                    }
                }
                resolve(response)
            });
        })
    }
}
