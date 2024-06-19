/*
 * @copyright
 * Copyright (c) 2022 OVTeam
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

class ValidateLogs {
    static name = "ValidateLogs";
    static collection = "__validate_logs";
    static expires = 300;

    static getSchema() {
        return {
            key: {
                type: String,
                index: true,
                unique: true
            },
            db: String,
            coll: String
        }
    }
}

module.exports = ValidateLogs;