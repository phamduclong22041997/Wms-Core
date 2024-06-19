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

const sql = require('mssql');

async function connect(WMS_CONFIG_INFO) {
    return sql.connect({
        user: WMS_CONFIG_INFO['uid'],
        password: WMS_CONFIG_INFO['pwd'],
        server: WMS_CONFIG_INFO['host'],
        database: WMS_CONFIG_INFO['db']
    });
}

async function createRequest(params) {
    let request = new sql.Request();
    if (params.inputs && Object.keys(params.inputs).length) {
        for (let keyname in params.inputs) {
            if (params.inputs[keyname] !== undefined) {
                request.input(keyname, params.inputs[keyname])
            }
        }
    }
    return request;
}

module.exports = {
    storedProcedure: async (params, WMS_CONFIG_INFO) => {
        let conn = null;
        let rs = { Status: true, Data: null }
        try {
            conn = await connect(WMS_CONFIG_INFO);
            let request = await createRequest(params);
            let exeResult = await request.execute(params.storedName);
            if(exeResult && exeResult.recordset) {
                rs['Data'] = exeResult.recordset;
            }
        } catch (err) {
            rs['Status'] = false;
            rs['Data'] = err;
        }

        if (conn !== null) {
            conn.close();
        }

        return rs;
    },
    query: async (queryString, WMS_CONFIG_INFO) => {
        let conn = null;
        let rs = { Status: true, Data: null }
        
        try {
            conn = await connect(WMS_CONFIG_INFO);
            let exeResult = await sql.query(queryString);
            if(exeResult && exeResult.recordset) {
                rs['Data'] = exeResult.recordset || [];
            }
        } catch (err) {
            rs['Status'] = false;
            rs['Data'] = err;
        }

        if (conn !== null) {
            conn.close();
        }

        return rs;
    }
}