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

const rpc = require('weh-rpc');

class WehWorker {

	constructor(file, options = {}) {
		this.name = options.name || file;
		this.autoKill = (typeof options.autoKill !== "undefined") ? options.autoKill : false;
		this.autoKillTimer = null;
		this.file = file;
		this.callsInProgress = 0;
		this.postFn = this.post.bind(this);
		this.worker = null;
		if(options.startNow)
			this.ensureWorkerStarted();
	}

	ensureWorkerStarted() {
		if(!this.worker) {
			var self = this;
			this.startKillTimer();
			this.worker = new Worker(this.file);
			this.worker.onmessage = (event) => {
				rpc.receive(event.data,self.postFn,self.name);
			};			
		}
	}

	post(receiver,message) {
		this.ensureWorkerStarted();
		this.worker.postMessage(message);
	}

	endKillTimer() {
		if(this.autoKillTimer) {
			clearTimeout(this.autoKillTimer);
			this.autoKillTimer = null;
		}
	}

	startKillTimer() {
		this.endKillTimer();
		if(this.autoKill!==false) {
			var self = this;
			this.autoKillTimer = setTimeout(function() {
				self.worker.terminate();
				self.worker = null;
			}, this.autoKill);
		}
	}

	callEnded() {
		this.callsInProgress--;
		if(this.callsInProgress===0)
			this.startKillTimer();
	}

	call(...params) {
		var self = this;
		this.callsInProgress++;
		this.endKillTimer();
		return rpc.call(this.postFn,this.name,...params)
			.then((result)=>{
				self.callEnded();
				return result;
			})
			.catch((err)=>{
				self.callEnded();
				throw err;
			});
	}

}

module.exports = (...params) => {
	return new WehWorker(...params);
}
/*
export default (...params) => {
	return new WehWorker(...params);
}
*/
