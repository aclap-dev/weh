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
	removeAllListeners() {
		this.listeners = [];
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

const ADDON2APP = 1;
const APP2ADDON = 2;

class NativeMessagingApp {

	constructor(appId,options={}) {
		this.appId = appId;
		this.name = options.name || appId;
		this.appPort = null;
		this.pendingCalls = [];
		this.runningCalls = [];
		this.state = "idle";
		this.postFn = this.post.bind(this);
		this.postMessageFn = this.postMessage.bind(this);
		this.onAppNotFound = new EventHandler(); // general
		this.onAppNotFoundCheck = new EventHandler(); // call specific
		this.onCallCount = new EventHandler();
		this.appStatus = "unknown";
		this.app2AddonCallCount = 0;
		this.addon2AppCallCount = 0;		
	}

	post(receiver,message) {
		this.appPort.postMessage(message);
	}

	// workaround to handle the fact that returning functions do not have
	// receiver parameter
	// TODO have a unique post() function
	postMessage(message) {
		this.appPort.postMessage(message);		
	}

	updateCallCount(way,delta) {
		switch(way) {
			case APP2ADDON:
				this.app2AddonCallCount += delta;
				break;
			case ADDON2APP:
				this.addon2AppCallCount += delta;
				break;
		}
		this.onCallCount.notify(this.addon2AppCallCount,this.app2AddonCallCount);
	}

	close() {
		if(this.appPort)
			try {
				this.appPort.disconnect();
				this.cleanup();
			} catch(e) {}
	}

	call(...params) {
		var self = this;
		return this.callCatchAppNotFound(null,...params);
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

		if(appNotFoundHandler && (self.appStatus=="unknown" || self.appStatus=="checking"))
			self.onAppNotFoundCheck.addListener(appNotFoundHandler);

		self.updateCallCount(ADDON2APP,1);
			
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
				})
				.then((result)=>{
					self.updateCallCount(ADDON2APP,-1);
					return result;
				})
				.catch((err)=>{
					self.updateCallCount(ADDON2APP,-1);
					throw err;
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
							if(self.appStatus=="checking") {
								self.appStatus="ok";
								self.onAppNotFoundCheck.removeAllListeners();
							}
							rpc.receive(response,self.postMessageFn,self.name);
						});
						appPort.onDisconnect.addListener(() => {
							ProcessPending(new Error("Disconnected"));
							self.cleanup();
						});
						self.state = "running";
						ProcessPending();
					})
					.then((result)=>{
						self.updateCallCount(ADDON2APP,-1);
						return result;
					})
					.catch((err)=>{
						self.updateCallCount(ADDON2APP,-1);
						throw err;
					});
			case "pending":
				return new Promise((resolve,reject)=>{
						self.pendingCalls.push({
							resolve,
							reject,
							params: [...params]
						});
					})
					.then((result)=>{
						self.updateCallCount(ADDON2APP,-1);
						return result;
					})
					.catch((err)=>{
						self.updateCallCount(ADDON2APP,-1);
						throw err;
					});
		}
	}

	listen(handlers) {
		var self = this;
		var rpcHandlers = {}
		Object.keys(handlers).forEach((handler)=>{
			rpcHandlers[handler] = (...args) => {
				self.updateCallCount(APP2ADDON,1);
				return Promise.resolve(handlers[handler](...args))
					.then((result)=>{
						self.updateCallCount(APP2ADDON,-1);
						return result;
					})
					.catch((err)=>{
						self.updateCallCount(APP2ADDON,-1);
						throw err;						
					})
			}
		});
		return rpc.listen(rpcHandlers);
	}

	cleanup() {
		var self = this;
		if(self.appStatus=="checking") {
			self.onAppNotFoundCheck.notify(self.appPort && self.appPort.error || browser.runtime.lastError);
			self.onAppNotFoundCheck.removeAllListeners();
			if(!appNotFoundHandler)
				self.onAppNotFound.notify(self.appPort && self.appPort.error || browser.runtime.lastError);
		}
		var call;
		while(call=self.runningCalls.shift()) {
			call.reject(new Error("Native port disconnected"));
		}
		self.state = "idle";
		self.appStatus = "unknown";
		self.appPort = null;
	}
}

module.exports = function New(...params) {
	return new NativeMessagingApp(...params);
}
