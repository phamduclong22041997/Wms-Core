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

let transform = null;
try {
    transform = require('camaro').transform;
} catch (err) {
    console.log('camaro support is disabled!');
}

exports.parseJson = (xml, template) => {
    if (!transform) {
        throw Error('camaro support is disabled!');
    }

    if (!template) {
        template =
            ['//Response', {
                StatusID: 'StatusID',
                MessageText: 'MessageText',
                DocumentNumber: 'DocumentNumber'
            }];
    }

    return transform(xml, template)
}