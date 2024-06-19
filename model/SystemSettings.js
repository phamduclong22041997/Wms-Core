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

class SystemSettings {
    static name = "SystemSettings";
    static collection = "System.Settings";
    static getSchema() {
        const mongoose = require("mongoose");
        return {
            type: mongoose.Schema.Types.Mixed,
            config: String,
            modifiedby: {
                type: mongoose.Schema.Types.Mixed,
                default: "system"
            },
            lastmodified: {
                type: Date,
                default: Date.now()
            },
            isdeleted: {
                type: Number,
                default: 0
            }
        }
    }
}

module.exports = SystemSettings;