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
const moment = require("moment-timezone");

exports.register = function (schema) {
    schema.pre('save', function (next) {
        if (!this.CreatedDate) {
            this.set({ CreatedDate: new Date() });
        }
        if(!this.CalendarDay) {
            this.set({CalendarDay: moment().tz(process.env.TZ).format("YYYYMMDD")});
        }
        if (!this.UpdatedDate || (this.UpdatedDate > this.CreatedDate)) {
            this.set({ UpdatedDate: new Date() });
        }
        if (next) {
            next();
        }
    });
    schema.pre(['updateOne', 'updateMany'], function (next) {
        this.set({UpdatedDate: new Date()});
        if (next) {
            next();
        }
    });
    schema.post(['updateOne', 'updateMany'], function (docs) {
        if(docs && docs.n == undefined && docs.matchedCount != undefined) {
            docs.n = docs.matchedCount;
        }
    });
};