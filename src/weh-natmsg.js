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

const weh = require('weh');
var browser = weh.browser;
const rpc = require('weh-rpc');

class EventHandler {
	constructor() {
		this.listeners = [];
	}
	addListener(listener) {
		this.listeners.push(listener);
	}
	removeListener(listener) {
		this.listeners = this.listeners.filter((_listener) => listener !== _listener);
	}
	notify(...args) {
		this.listeners.forEach((listener) => {
			try {
				listener(...args);
			} catch(e) {
				console.warn(e);
			}
		});
	}
}

class NativeMessagingApp {

	constructor(appId,options={}) {
		this.appId = appId;
		this.name = options.name || appId;
		this.appPort = null;
		this.pendingCalls = [];
		this.runningCalls = [];
		this.state = "idle";
		this.postFn = this.post.bind(this);
		this.onAppNotFound = new EventHandler();
		this.notifyAppNotFoundListeners = this.onAppNotFound.notify.bind(this.onAppNotFound);
		this.appStatus = "unknown";
	}

	post(receiver,message) {
		this.appPort.postMessage(message);
	}

	call(...params) {
		var self = this;
		return this.callCatchAppNotFound(this.notifyAppNotFoundListeners,...params)
			.then((result) => {
				if(self.appStatus=="checking")
					self.appStatus="ok";
				return result;
			})
			.catch((err)=>{
				if(self.appStatus=="checking")
					self.appStatus="ok";
				throw err;
			});
	}

	callCatchAppNotFound(appNotFoundHandler,...params) {
		var self = this;

		function ProcessPending(err) {
			var call;
			while(call=self.pendingCalls.shift()) {
				if(err)
					call.reject(err);
				else {
					self.runningCalls.push(call);
					let _call = call;
					rpc.call(self.postFn,self.name,...call.params)
						.then((result)=>{
							self.runningCalls.splice(self.runningCalls.indexOf(_call),1);
							return result;
						})
						.then(_call.resolve)
						.catch((err) => {
							self.runningCalls.splice(self.runningCalls.indexOf(_call),1);
							_call.reject(err);
						});
				}
			}
		}

		switch(this.state) {
			case "running":
				return new Promise((resolve,reject)=>{
					var call = {
						resolve,
						reject,
						params: [...params]
					};
					self.runningCalls.push(call);
					rpc.call(self.postFn,self.name,...params)
						.then((result)=>{
							self.runningCalls.splice(self.runningCalls.indexOf(call),1);
							return result;
						})
						.then(call.resolve)
						.catch((err)=>{
							self.runningCalls.splice(self.runningCalls.indexOf(call),1);
							call.reject(err);
						})
				});
			case "idle":
				self.state = "pending";
				return new Promise((resolve,reject)=>{
						self.pendingCalls.push({
							resolve,
							reject,
							params: [...params]
						});
						var appPort = browser.runtime.connectNative(self.appId);
						self.appStatus = "checking";
						self.appPort = appPort;
						appPort.onMessage.addListener((response) => {
							rpc.receive(response,self.postFn,self.name);
						});
						appPort.onDisconnect.addListener(() => {
							console.log("MatMsg port disconnected",appPort.error || browser.runtime.lastError);
							if(self.appStatus=="checking") {
								self.appStatus = "ko";
								appNotFoundHandler(appPort.error || browser.runtime.lastError);
							}
							ProcessPending(new Error("Disconnected"));
							var call;
							while(call=self.runningCalls.shift()) {
								call.reject(new Error("Native port disconnected"));
							}
							self.state = "idle";
							self.appPort = null;
						});
						self.state = "running";
						ProcessPending();
					});
			case "pending":
				return new Promise((resolve,reject)=>{
						self.pendingCalls.push({
							resolve,
							reject,
							params: [...params]
						});
					});
		}
	}

}

module.exports = function New(...params) {
	return new NativeMessagingApp(...params);
}
