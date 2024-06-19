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

class OVThread {
    static name = 'OVThread';
    static collection = 'Threads';
    static getSchema() {
        return {
            Name: String,
            HighestPriority: Number,
            LowestPriority: Number,
            EndPoint: String,
            Status: String,
            Data: Object,
            StartTime: String,
            EndTime: String,
            Message: String
        };
    }
}

module.exports = OVThread;