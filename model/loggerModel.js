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

class Logs {
    static name = "Logs";
    static collection = "Logs";
    static getSchema() {
        const mongoose = require("mongoose");
        return {
            data: mongoose.Schema.Types.Mixed,
            url: String,
            log_id: String,
            LastModified: {
                type: Date,
                default: new Date()
            },
            IsDeleted: {
                type: Number,
                default: 0
            }
        }
    }
}

module.exports = Logs;