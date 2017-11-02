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

import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, combineReducers } from 'redux';
import { createLogger } from 'redux-logger';
import WehHeader from 'react/weh-header';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import ReactJson from 'react-json-view';

import weh from 'weh-content';

import bootstrapStyles from 'bootstrap/dist/css/bootstrap.css';

var messageIndex = 1;

function MessagesReducer(state={
		raw: [],
		calls: {}
	}, action) {
	switch(action.type) {
		case "CLEAR_MESSAGES":
			state = {
				raw: [],
				calls: {}
			}
			break;

		case "NEW_MESSAGE": {
				state = Object.assign({},state);
				let index = state.raw.length;
				let callKey = (action.payload.from||"!") + "#" +
					(action.payload.to||"!") + "#" +
					action.payload.rid;
				if(action.payload.type=="call") {
					let calls = Object.assign({},state.calls);
					calls[callKey] = index;
					state.calls = calls;
					state.raw = state.raw.concat({
						type: "call",
						call: action.payload,
						key: messageIndex++
					});
				} else if(action.payload.type=="reply") {
					let callIndex = state.calls[callKey];
					let entry = {
						type: "reply",
						reply: action.payload,
						key: messageIndex++
					}
					if(typeof callIndex!=="undefined") {
						let call = state.raw[callIndex];
						call.reply = action.payload;
						entry.call = call.call;
					}
					entry.result = action.payload.result;
					entry.error = action.payload.error;
					state.raw = state.raw.concat(entry);
				}
				if(weh.prefs.max_messages && state.raw.length>weh.prefs.max_messages) {
					var calls = {};
					var raw = state.raw.slice(0);
					while(raw.length>weh.prefs.max_messages) {
						Object.keys(state.calls).forEach((key)=>{
							var callIndex = state.calls[key];
							if(callIndex>0)
								calls[key] = callIndex-1;
						});
						raw.shift();
					}
					state = { calls, raw };
				}
			}
			break;
	}
	return state;
}

function AddonsReducer(state={
		all: [],
		selected: null,
		prefs: null,
		storage: null
	}, action) {
	var oldSelectedId = state.selected && state.selected.id || null;
	var selected;
	switch(action.type) {
		case "SET_PREF": {
				let { pref, value, addonId } = action.payload;
				if(state.prefs) {
					state = Object.assign({}, state, {
						prefs: Object.assign({},state.prefs,{
							[pref]: value
						})
					});
					weh.rpc.call("setAddonPref",pref,value,addonId);
				}
			}
			break;
		case "ADDONS":
			selected = action.payload.filter((addon)=>{
					return addon.id === oldSelectedId;
				})[0] || action.payload[0] || null;
			state = {
				all: action.payload,
				selected,
				prefs: null,
				storage: null
			}
			UpdateMonitoredAddon(selected && selected.id || null, oldSelectedId);
			break;
		
		case "SELECT_ADDON":
			selected = state.all.filter((addon)=>{
					return addon.id === action.payload;
				})[0] || null;
			state = {
				all: state.all,
				prefs: null,
				storage: null,
				selected
			}
			UpdateMonitoredAddon(selected && selected.id || null, oldSelectedId);
			break;

		case "SET_ADDON_PREFS":
			state = {
				all: state.all,
				prefs: action.payload.prefs,
				specs: action.payload.specs,
				storage: state.storage,
				selected: state.selected
			}
			break;

		case "SET_ADDON_STORAGE":
			state = {
				all: state.all,
				prefs: state.prefs,
				storage: action.payload.storage,
				selected: state.selected
			}
			break;
	}
	return state;
}

function AppReducer(state={
		tab: "messages"
	},action) {
	switch(action.type) {
		case "SELECT_TAB":
			state = {
				tab: action.payload
			}
			break;
	}
	return state;
}

function UpdateMonitoredAddon(newAddonId,oldAddonId) {
	if(newAddonId!==oldAddonId)
		weh.rpc.call("updateMonitoredAddon",newAddonId,oldAddonId);
}

let reducers = combineReducers({
	messages: MessagesReducer,
	addons: AddonsReducer,
	app: AppReducer,
	prefs: weh.prefs.reducer
});

var middlewares = [];
if(weh.prefs.redux_logger)
	middlewares.push(createLogger({
		collapsed: (getState, action, logEntry) => true
	}))


let store = createStore(reducers, applyMiddleware(...middlewares));

weh.prefs.reduxDispatch(store);

weh.rpc.listen({
	newMessage: (message) => {
		store.dispatch({
			type: "NEW_MESSAGE",
			payload: message
		})
	},
	setAddonStorage: (storage) => {
		store.dispatch({
			type: "SET_ADDON_STORAGE",
			payload: storage
		});
		store.dispatch({
			type: "SELECT_TAB",
			payload: "storage"
		});
	}
});

var AddonSelector = connect(
	// map redux state to react component props
	(state) => {
		return {
			addons: state.addons.all,
			addon: state.addons.selected,
		}
	},
	// make some redux actions available as react component props
	(dispatch) => {
		return bindActionCreators ({
			select: (addonId) => {
				return {
					type: "SELECT_ADDON",
					payload: addonId
				}
			}
		},dispatch);
	}	
)(
	class extends React.Component {
		constructor(props) {
			super(props);
			this.handleChange = this.handleChange.bind(this);
			this.state = {
				addon: this.props.addon || ""
			}
		}

		componentWillReceiveProps(props) {
			this.setState({
				addon: props.addon || ""
			})
		}

		handleChange(event) {
			var value = event.target.value;
			this.props.select(value || null);
		}

		render() {
			var options = (this.props.addons || [])
				.map((addon)=>{
					return (
						<option key={addon.id} value={addon.id}>{addon.name}</option>
					)
				});
			return (
				<select
					value={this.state.addon && this.state.addon.id || ""}
					onChange={this.handleChange}
					className="form-control"
					style={{ width: "100%" }}>
					{options}
				</select>
			)
		}
	}
)

var Message = connect(
	// map redux state to react component props
	(state) => {
		return {
			displayMode: state.prefs.messages_display_mode,
			displayTimestamp: state.prefs.display_timestamp,
			displayDuration: state.prefs.display_call_duration
		}
	},
	null
)(
	class extends React.Component {

		displayTimestamp(which) {
			if(this.props.displayTimestamp && this.props.src[which])
				return (
					<span className="im-timestamp">{this.props.src[which].timestamp.toFixed(3)}</span>
				)
			else
				return "";
		}

		displayCallDuration() {
			if(this.props.displayDuration && this.props.src.call && this.props.src.reply)
				return (
					<span className="im-duration">
						{(this.props.src.reply.timestamp - this.props.src.call.timestamp).toFixed(3)}ms
					</span>
				)
			else
				return "";

		}

		renderJson(obj) {
			switch(typeof obj) {
				case "number":
				case "string":
				case "boolean":
					return (
						<div className="react-json-view scalar-view">
							{JSON.stringify(obj)}
						</div>
					);
			}
			return (
				<ReactJson src={obj} 
					name={null}
					collapsed={true} 
					enableClipboard={false} 
					collapseStringsAfterLength={64}
					displayDataTypes={false}
					displayObjectSize={false}
					style={{display:"inline-block"}}
					/>
			)
		}

		renderResult() {
			if(typeof this.props.src.reply.result !=="undefined")
				return (
					<span>
						<span className="im-result-sign">=</span>
						{this.renderJson(this.props.src.reply.result)}
					</span>
				)
			else if(this.props.src.reply.error)
				return (
					<span className="im-error">
						<span className="im-error-sign" dangerouslySetInnerHTML={{__html:"&rArr;"}}/> 
							{this.props.src.reply.error}
					</span>
				)
			else
				return "";
		}

		renderSync() {
			if(this.props.displayMode=="sync_"+this.props.src.type && this.props.src.call &&
				(this.props.src.reply || this.props.src.error)) {
					var label = "<" + (this.props.src.call.caller || '') + "> => " +
						"<" + (this.props.src.call.callee || '') + ">." + this.props.src.call.method;
					return (
						<div className="insp-msg">
							{this.displayTimestamp(this.props.src.type)}
							<span className="im-caller">&lt;{this.props.src.call.caller || ''}&gt;</span>
							<span className="im-call-sign">&rArr;</span>
							<span className="im-callee">&lt;{this.props.src.call.callee || ''}&gt;
								</span>.<span className="im-method">{this.props.src.call.method}
								</span>({this.props.src.call.args.length && this.renderJson(this.props.src.call.args) || ''})
								{this.renderResult()}
								{this.displayCallDuration()}
						</div>
					)
				} else
					return null;
		}

		renderAsync() {
			if(this.props.src.type=="call" && this.props.src.call)
				return (
					<div className="insp-msg">
						<span className="im-caller">&lt;{this.props.src.call.caller || ''}#{this.props.src.call.rid}&gt;</span>
						<span className="im-call-sign">&rArr;</span>
						<span className="im-callee">&lt;{this.props.src.call.callee || ''}&gt;
							</span>.<span className="im-method">{this.props.src.call.method}
							</span>({this.props.src.call.args.length && this.renderJson(this.props.src.call.args) || ''})
					</div>
				)
			else if(this.props.src.type=="reply" && this.props.src.reply)
				return (
					<div className="insp-msg">
						<span className="im-caller">&lt;{this.props.src.call.caller || ''}#{this.props.src.call.rid}&gt;</span>
						<span className="im-call-sign">&lArr;</span>
						<span className="im-callee">&lt;{this.props.src.call.callee || ''}&gt;
							</span>.<span className="im-method">{this.props.src.call.method}
							</span>()
							{this.renderResult()}
					</div>
				)
			else
				return null;					
		}

		render() {
			if(this.props.displayMode=="async")
				return this.renderAsync();
			else if(/sync_(?:call|reply)/.test(this.props.displayMode))
				return this.renderSync();
			return null
		}
	}
)

var Messages = connect(
	// map redux state to react component props
	(state) => {
		return {
			messages: state.messages,
		}
	},
	null
)(
	class extends React.Component {

		render() {
			if(this.props.messages.raw.length==0)
				return (
					<div className="no-message">{weh._('messages_none')}</div>
				)
			var messages = this.props.messages.raw
				.map((message)=>{
					// ensures key changes when reply field added to message
					var key = message.key + "-" + (message.call && "C") + (message.reply && "R");
					return (
						<Message src={message} key={key}/>
					)
				});
			return (
				<ul className="list-group">
					{messages}
				</ul>
			)
		}
	}
)

var AddonPrefs = connect(
	// map redux state to react component props
	(state) => {
		return {
			addon: state.addons.selected,
			addonPrefs: state.addons.prefs,
			addonPrefSpecs: state.addons.specs,
		}
	},
	(dispatch) => {
		return bindActionCreators ({
			setPref: (pref,value,addonId) => {
				return {
					type: "SET_PREF",
					payload: { pref, value, addonId }
				}
			}
		},dispatch);
	}	

)(
	class extends React.Component {

		constructor(props) {
			super(props);
			this.state = {
				editing: {},
				valid: {}
			}
		}

		editingChanged(pref) {
			var self = this;
			return (event)=>{
				if(event.target.checked)
					self.setState({
						editing: Object.assign({},self.state.editing,{
							[pref]: self.props.addonPrefs[pref]
						}),
						valid: Object.assign({},self.state.valid,{
							[pref]: true
						})
					});
				else {
					var editing = Object.assign({},self.state.editing);
					delete editing[pref];
					var valid = Object.assign({},self.state.valid);
					delete valid[pref];
					self.setState({ editing, valid });
				}
			}
		}

		valueChanged(pref) {
			var self = this;
			return (event)=>{
				var value = event.target.value;
				var valid = true;
				switch(self.props.addonPrefSpecs[pref].type) {
					case "boolean":
						if(value!="true" && value!="false")
							valid = false;
						break;
					case "integer":
						valid = /^\d+$/.test(value);
						break;
					case "float":
						valid = /^(\.\d+|\d+(\.\d*)?)$/.test(value);
						break;
				}
				self.setState({
					editing: Object.assign({},self.state.editing,{
						[pref]: value
					}),
					valid: Object.assign({},self.state.editing,{
						[pref]: valid
					})
				})
			}
		}

		onKeyPress(pref) {
			var self = this;
			return (event)=>{
				if(event.key=='Enter' && self.state.valid[pref]) {
					var value = self.state.editing[pref];
					var editing = Object.assign({},self.state.editing);
					delete editing[pref];
					var valid = Object.assign({},self.state.valid);
					delete valid[pref];
					self.setState({ editing, valid });
					switch(self.props.addonPrefSpecs[pref].type) {
						case "boolean":
							value = value=="true";
							break;
						case "integer":
							value = parseInt(value);
							break;
						case "float":
							value = parseFloat(value);
							break;
					}
					self.props.setPref(pref,value,self.props.addon.id);
				}
			}
		}

		render() {
			if(!this.props.addonPrefs)
				return null;
			var self = this;
			var rows = Object.keys(this.props.addonPrefs).sort().map((key)=>{
				return (
					<tr key={key}>
						<td><input data-pref-sel={key} checked={!!this.state.editing[key]}
							onChange={this.editingChanged(key)} type="checkbox"/></td>
						<td><strong>{key}</strong></td>
						{ typeof this.state.editing[key] === "undefined" && (
							<td className="pref-value">{JSON.stringify(self.props.addonPrefs[key],null,4)}</td>
						)}
						{ typeof this.state.editing[key] !== "undefined" && (
							<td className={"pref-edit "+(this.state.valid[key]?"":"error")}>
								<input data-pref={key} type="text" 
									onChange={this.valueChanged(key)}
									onKeyPress={this.onKeyPress(key)} 
									value={this.state.editing[key]}/>
							</td>
						)}
					</tr>
				)
			})
			return (
				<div className="table-responsive">
					<table className="table prefs-table">
						<tbody>
							{rows}
						</tbody>
					</table>
				</div>
			)
		}
	}
)

var AddonStorage = connect(
	// map redux state to react component props
	(state) => {
		return {
			addonStorage: state.addons.storage,
		}
	},
	null
)(
	class extends React.Component {

		render() {
			if(!this.props.addonStorage)
				return null;
			var self = this;
			var rows = [];		
			Object.keys(this.props.addonStorage).sort().forEach((storageType)=>{
				if(Object.keys(self.props.addonStorage[storageType]).length==0)
					return;
				rows.push(
					<tr className="storage-type" key={"type."+storageType}><td colSpan={2}>{storageType}</td></tr>
				);
				Object.keys(self.props.addonStorage[storageType]).sort().forEach((key)=>{
					rows.push(
						<tr key={"type."+storageType+"."+key}>
							<td><strong>{key}</strong></td>
							<td className="insp-msg">
								{ self.props.addonStorage[storageType][key] instanceof Object && (
								<ReactJson src={self.props.addonStorage[storageType][key]} 
									name={null}
									collapsed={true} 
									enableClipboard={false} 
									collapseStringsAfterLength={256}
									displayDataTypes={true}
									displayObjectSize={true}
									/>
								)}
								{ !(self.props.addonStorage[storageType][key] instanceof Object) && (
									<span>{JSON.stringify(self.props.addonStorage[storageType][key])}</span>
								)}
							</td>
						</tr>
					);
				});
			});
			
			return (
				<div className="table-responsive">
					<table className="table storage-table">
						{rows}
					</table>
				</div>
			)
		}
	}
)

var SelectedAddon = connect(
	// map redux state to react component props
	(state) => {
		return {
			addon: state.addons.selected,
		}
	},
	null
)(
	class extends React.Component {

		render() {
			if(!this.props.addon)
				return null;
			return (
				<div className="sel-addon float-right">
					{this.props.addon.name} {this.props.addon.version}
					<span className="sel-addon-id">{this.props.addon.id}</span>
				</div>
			)
		}
	}
)

var Commands = connect(
	// map redux state to react component props
	(state) => {
		return {
			addon: state.addons.selected,
		}
	},
	// make some redux actions available as react component props
	(dispatch) => {
		return bindActionCreators ({
			clearMessages: () => {
				return {
					type: "CLEAR_MESSAGES"
				}
			},
			setAddonPrefs: (prefs) => {
				return {
					type: "SET_ADDON_PREFS",
					payload: prefs
				}
			},
			selectTab: (tab) => {
				return {
					type: "SELECT_TAB",
					payload: tab					
				}
			}
		},dispatch);
	}	

)(
	class extends React.Component {

		constructor(props) {
			super(props);
			this.getAddonPrefs = this.getAddonPrefs.bind(this);
			this.getAddonStorage = this.getAddonStorage.bind(this);
		}

		getAddonPrefs() {
			var self = this;
			weh.rpc.call("getPrefs",this.props.addon.id)
				.then((addonPrefs)=>{
					self.props.selectTab("prefs");					
					self.props.setAddonPrefs(addonPrefs);
				})
		}

		getAddonStorage() {
			var self = this;
			weh.rpc.call("getStorage",this.props.addon.id);
		}

		render() {
			return (
				<ul className="list-group commands">
					<li className="">
						<a 
							className="" 
							onClick={ScanAddons}>
								{weh._('rescan_addons')}
						</a>
					</li>
					{ this.props.addon && (
					<li className="">
						<a 
							className="" 
							onClick={this.props.clearMessages}>
								{weh._('clear_messages')}
						</a>
					</li>
					)}
					{ this.props.addon && (
					<li className="">
						<a 
							className="" 
							onClick={this.getAddonPrefs}>
								{weh._('get_prefs')}
						</a>
					</li>
					)}
					{ this.props.addon && (
					<li className="">
						<a 
							className="" 
							onClick={this.getAddonStorage}>
								{weh._('show_storage')}
						</a>
					</li>
					)}
				</ul>
			)
		}
	}
)

var App = connect(
	// map redux state to react component props
	(state) => {
		return {
			tab: state.app.tab,
			addon: state.addons.selected,
			addonPrefs: state.addons.prefs,
			addonStorage: state.addons.storage
		}
	},
	// make some redux actions available as react component props
	(dispatch) => {
		return bindActionCreators ({
			selectTabMessages: (tab) => {
				return {
					type: "SELECT_TAB",
					payload: "messages"
				}
			},
			selectTabPrefs: (tab) => {
				return {
					type: "SELECT_TAB",
					payload: "prefs"
				}
			},
			selectTabStorage: (tab) => {
				return {
					type: "SELECT_TAB",
					payload: "storage"
				}
			}
		},dispatch);
	}	

)(
	class extends React.Component {

		renderSidebar() {
			return (
				<div className="p-3 insp-scrollable">
					<AddonSelector/>
					<Commands/>
				</div>
			)
		}

		renderNavItem(tab,onClick,labelTag) {
			return (
				<li className="nav-item">
					<a 
						className={ "nav-link "+(this.props.tab==tab ? "active":"")} 
						href="#"
						data-toggle="tab"
						onClick={onClick}>
							{weh._(labelTag)}
					</a>
				</li>
			)
		}

		renderContent() {
			return (
				<div className="p-3 insp-container">
					<ul className="nav nav-tabs insp-tabs">
						{ this.renderNavItem("messages",this.props.selectTabMessages,"rpc_messages") }
						{ this.props.addonPrefs && (
							<li className="nav-item">
								<a 
									className={ "nav-link "+(this.props.tab=="prefs" ? "active":"")} 
									href="#tab-prefs"
									data-toggle="tab"
									onClick={this.props.selectTabPrefs}>
										{weh._('prefs')}
								</a>
							</li>											
						)}
						{ this.props.addonStorage && (
							<li className="nav-item">
								<a 
									className={ "nav-link "+(this.props.tab=="storage" ? "active":"")} 
									href="#tab-storage"
									data-toggle="tab"
									onClick={this.props.selectTabStorage}>
										{weh._('storage')}
								</a>
							</li>											
						)}
					</ul>
					<div className="insp-main-content">
						<div className="tab-content">
							<div className="tab-pane active">
								<br/>
								{ this.props.tab=="messages" && (<Messages/>)}
								{ this.props.tab=="prefs" && (<AddonPrefs/>)}
								{ this.props.tab=="storage" && (<AddonStorage/>)}
							</div>
						</div>
					</div>
				</div>
			)
		}

		render() {
			return (
				<div className="weh-shf">
					<WehHeader>
						<SelectedAddon/>
					</WehHeader>
					<main className="insp-layout">
						<div className="insp-main">
							<div className="insp-left">
								{this.renderSidebar()}
							</div>
							<div className="insp-content">
								{this.renderContent()}
							</div>
						</div>
					</main>
				</div>
			)
		}
	}
)

render(
	<Provider store={store}>
		<App/>
	</Provider>,
	document.getElementById('root')
);

weh.setPageTitle(weh._("weh_inspector"));

function ScanAddons() {
	weh.rpc.call("getAddons")
		.then((addons)=>{
			store.dispatch({
				type: "ADDONS",
				payload: addons
			});
		});
}
ScanAddons();