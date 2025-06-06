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

class ChangeStreamLogs {
    static name = "ChangeStreamLogs";
    static collection = "__change_stream_logs";
    static getSchema() {
        return {
            key: String,
            db: String,
            coll: String,
            token: String
        }
    }
}

module.exports = ChangeStreamLogs;