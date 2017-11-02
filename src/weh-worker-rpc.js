/*
 * weh - WebExtensions Helper
 *
 * @summary workflow and base code for developing WebExtensions browser add-ons
 * @author Michel Gutierrez
 * @link https://github.com/mi-g/weh
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* setting up RPC */
const rpc = require('./weh-rpc');

/* connecting with main thread */
rpc.setPost(postMessage);
global.onmessage = (event)=>{
	rpc.receive(event.data, postMessage);
};

module.exports = rpc;