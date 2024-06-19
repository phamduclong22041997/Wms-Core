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

function registerDateConvertor() {
    try {
        Date.prototype.convertLocalString = function (format = "YYYY-MM-DD HH:mm:ss") {
            let moment = "";
            try {
                moment = require("moment-timezone");
            } catch (err) {
                throw Error("moment-timezone support is disabled!");
            }
            return moment(this).format(format);
        }
        global.parseNumber2String = function (val) {
            let _val = `${val}`.split('').reverse();
            let idx = Math.floor(_val.length / 3);
            for (let i = 1; i <= idx; i++) {
                _val.splice((i * 3) + (i - 1), 0, ",");
            }
            if (_val[_val.length - 1] == ",") {
                _val[_val.length - 1] = "";
            }
            return _val.reverse().join("");
        }
    } catch (err) {
        console.log(`Register system plugins error: ${err.message}`)
    }
}

function translate(key, obj = {}) {
    if (__) {
        return __(key, obj) || key;
    }
    return key;
}

exports.register = () => {
    global.translate = translate;

    registerDateConvertor();
}
