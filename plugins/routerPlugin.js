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

function checkHealthy(req, res) {
    if (req.query['showEnv'] == 1) {
        res.json(process.env);
    } else {
        res.json({
            Status: true,
            Data: {
                request_id: req.id
            }
        })
    }
}

exports.register = (router) => {
    router.route("/healthy").get(checkHealthy);
}