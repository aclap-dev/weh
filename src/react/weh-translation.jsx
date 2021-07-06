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

import {browser} from 'weh';
import React from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import i18nKeys from 'weh-i18n-keys';
import WehHeader from 'react/weh-header';

import 'bootstrap/dist/css/bootstrap.css'
import 'css/weh-form-states.css';

const manifest = browser.runtime.getManifest();

const initialState = {};
var needRestore = false;

function Initialize() {
	var custom = {};
	function SetCustomMessages(customMessages) {
	}
	try {
		var customMessages = JSON.parse(window.localStorage.getItem("wehI18nCustom"));
		if(customMessages===null) {
			customMessages = {};
			needRestore = true;
		} else
			Object.keys(customMessages).forEach((key)=>{
				custom[key] = customMessages[key].message;
			});
	} catch(e) {}
	initialState.custom = custom;
	initialState.keys = Object.keys(i18nKeys);
	initialState.modified = {};
}
Initialize();

export function reducer(state=initialState,action) {
	switch(action.type) {
		case "UPDATE_STRING":
			state = Object.assign({}, state, {
				modified: Object.assign({},state.modified)
			});
			if(state.custom[action.payload.key]===action.payload.value || 
				typeof state.custom[action.payload.key]==="undefined" && action.payload.value.trim()==="")
				delete state.modified[action.payload.key];
			else
				state.modified[action.payload.key] = action.payload.value;
			break;

		case "SAVE":
			state = Object.assign({}, state, {
				custom: Object.assign({},state.custom,state.modified),
				modified: {}
			});
			var customMessages = {};
			Object.keys(state.custom).forEach((key)=>{
				customMessages[key] = {
					message: state.custom[key]
				}
			});
	        window.localStorage.setItem("wehI18nCustom",JSON.stringify(customMessages));
			browser.storage.local.set({
				"wehI18nCustom": customMessages
			});
			break;

		case "CANCEL":
			state = Object.assign({}, state, {
				modified: {}
			});
			break;
		case "IMPORT":
			state = Object.assign({}, state, {
				modified: action.payload
			});
			break;
		case "RESET":
			state = Object.assign({}, state, {
				modified: {},
				custom: {}
			});
			break;
		case "RESTORE":
			var customMessages = {};
			Object.keys(action.payload).forEach((key)=>{
				customMessages[key] = action.payload[key].message
			});
			state = Object.assign({}, state, {
				custom: customMessages,
				modified: {}
			});
			break;
	}
	return state;
}

function IsObjectEmpty(obj) {
	var empty = true;
	for(var f in obj)
		if(obj.hasOwnProperty(f)) {
			empty = false;
			break;
		}
	return empty;
}

export var WehTranslationForm = connect(
	// map redux state to react component props
	(state) => {
		return {
			keys: state.translate.keys || [],
			custom: state.translate.custom,
			isModified: !IsObjectEmpty(state.translate.modified),
			modified: state.translate.modified
		}
	},
	// make some redux actions available as react component props
	(dispatch) => {
		return bindActionCreators ({
			save: () => {
				return {
					type: "SAVE"
				}
			},
			cancel: () => {
				return {
					type: "CANCEL"
				}
			},
			import: (data) => {
				return {
					type: "IMPORT",
					payload: data
				}
			},
			reset: (data) => {
				return {
					type: "RESET"
				}
			},
			restore: (data) => {
				return {
					type: "RESTORE",
					payload: data
				}
			}
		},dispatch);
	}
)(
	class extends React.Component {

		constructor(props) {
			super(props);
			this.state = {
				search: "",
				filter: props.missingTags && props.missingTags.length>0 && "missing" || "all"
			}
	        var maxArgs = 4; // should be 9 but this is a bug in Edge
    	    this.argPlaceHolders = new Array(maxArgs).fill("").map((v,i) => {return ""});

			this.handleSearchChange = this.handleSearchChange.bind(this);
			this.searchFilter = this.searchFilter.bind(this);
			this.fileInputChange = this.fileInputChange.bind(this);
		}

		componentWillMount(props) {
			var self = this;
			if(needRestore) {
				needRestore = false;
				browser.storage.local.get("wehI18nCustom")
					.then((result)=>{
						const weCustomMessages = result.wehI18nCustom;
						weCustomMessages && self.props.restore(weCustomMessages);
					});
			}
		}

		handleSearchChange(event) {
			var search = event.target.value;
			this.setState({ search });
		}

		searchFilter() {
			var self = this;
			return (key) => {
				key = key.toLowerCase();
				var search = self.state.search.toLowerCase().trim();
				if(search.length===0)
					return true;
				if(typeof self.props.modified[key]!=="undefined")
					return true;
				if(key.indexOf(search)>=0)
					return true;
				if(self.props.custom[key] && self.props.custom[key].toLowerCase().indexOf(search)>=0)
					return true;
				if(self.props.modified[key] && self.props.modified[key].toLowerCase().indexOf(search)>=0)
					return true;
				var original = browser.i18n.getMessage(key,self.argPlaceHolders).toLowerCase();
				if(original.indexOf(search)>=0)
					return true;
				return false;
			}
		}

		typeFilter() {
			var self = this;
			return (key)=>{
				return self.state.filter!="missing" || !self.props.missingTags || 
					self.props.missingTags.length==0 || self.props.missingTags.indexOf(key)>=0;
			}
		}

		changedFilter() {
			var self = this;
			return (event) => {
				self.setState({
					filter: event.target.value
				})
			}
		}

		reset() {
			var self = this;
			return ()=>{
				this.props.reset();
			}
		}

		import() {
			var self = this;
			return () => {
				self.fileInput.click();
			}
		}

		fileInputChange(event) {
			var self = this;
			var file = self.fileInput.files[0];
			if(file) {
				var reader = new FileReader();
				reader.onload = (event) => {
					try {
						var data = JSON.parse(event.target.result);
						self.props.import(data);
					} catch(e) {
						alert("File "+file.name+": Invalid format "+e.message);
					}
				}
				reader.readAsText(file);
			}
		}

		setFileInput(input) {
			var self = this;
			return (input) => {
				if(input)
					input.removeEventListener("change",self.fileInputChange);
				self.fileInput = input;
				if(!input)
					return;
				input.addEventListener("change",self.fileInputChange);
			}
		}

		export() {
			var self = this;
			return () => {
				var data = Object.assign({},self.props.custom,self.props.modified);
				var blob = new Blob([JSON.stringify(data,null,4)]);
				browser.downloads.download({
					url: window.URL.createObjectURL(blob),
					filename: "messages.json",
					saveAs: true,
					conflictAction: "uniquify"
				});
			}
		}

		render() {
			var items = this.props.keys.filter(this.searchFilter()).filter(this.typeFilter()).sort().map((key)=>{
				return (
					<WehTranslationItem key={key} keyName={key}/>
				)
			});
			return (
					<form className="weh-shf"
						onChange={this.handleChange}
						role="form">
						<WehHeader image={this.props.titleImage || "images/icon-32.png"}>
							<div className="col-sm-4 float-sm-right" style={{display:"inline-flex",marginTop:"2px"}}>
								<input className="form-control"
									onChange={this.handleSearchChange}
									placeholder="Filter..."
									type="text"
									value={this.state.search}
									/>
								{"\u00a0"}
								{ this.props.missingTags && this.props.missingTags.length>0 && (
									<select className="form-control" value={this.state.filter} onChange={this.changedFilter()}>
										<option value="all">All strings</option>
										<option value="missing">Missing strings</option>
									</select>
								)}
							</div>
						</WehHeader>
						<main>
							<div className="container">
								<section>
									{ items }
								</section>
							</div>
						</main>
						<footer>
							<div style={{display:"none"}}>
								<input type="file" accept="application/json" ref={this.setFileInput()}/>
							</div>
							{ this.props.footerExtra && (
								<div className="form-control translation-footer-extra">
									{this.props.footerExtra}
								</div>
							)}
							<div className="btn-toolbar justify-content-end">
								<div className="btn-group pull-right">
									<button type="button"
										onClick={this.import()}
										className="btn">Import</button>
									<button type="button"
										onClick={this.export()}
										className="btn">Export</button>
									<button type="button"
										className="btn btn-danger"
										onClick={this.reset()}
										className="btn btn-danger">Reset</button>
									<button type="button"
										onClick={this.props.cancel}
										className={"btn "+(this.props.isModified?"":"disabled")}>Cancel</button>
									<button type="button"
										onClick={this.props.save}
										className={"btn btn-primary "+(this.props.isModified?"":"disabled")}>Save</button>
								</div>
							</div>
						</footer>
					</form>
			)
		}
	}
);

export var WehTranslationItem = connect(
	(state,ownProps) => {
		var orgValue = state.translate.custom[ownProps.keyName];
		var value = orgValue;
		if(typeof state.translate.modified[ownProps.keyName]!=="undefined")
			value = state.translate.modified[ownProps.keyName];
		return {
			value: value || "",
			orgValue: orgValue || ""
		}
	},
	(dispatch) => {
		return bindActionCreators ({
			updateString: (key,value) => {
				return {
					type: "UPDATE_STRING",
					payload: {
						key: key,
						value: value
					}
				}
			}
		},dispatch);
	}
)(
	class extends React.Component {

		constructor(props) {
			super(props);
			this.state = {
				value: this.props.value || "",
				orgValue: this.props.orgValue || ""
			}
			var maxArgs = 4; // should be 9 but this is a bug in Edge
			var argPlaceHolders = new Array(maxArgs).fill("").map((v,i) => {return "$ARG"+(i+1)+"$"});
			this.defaultString = browser.i18n.getMessage(this.props.keyName,argPlaceHolders);
			this.handleChange = this.handleChange.bind(this);
			this.formClass = this.formClass.bind(this);
		}

		componentWillReceiveProps(props) {
			this.setState({
				value: props.value || "",
				orgValue: props.orgValue || ""
			})
		}

		formClass(prefix="") {
			if(this.state.value!==this.state.orgValue)
				return prefix + "success";
			if(this.state.value!=="")
				return prefix + "warning";
			return "";
		}
		
		handleChange(event) {
			var value = event.target.value;
			this.setState({
				value: value
			});
			this.props.updateString(this.props.keyName,value);
		}

		render() {
			return (
				<div className={"form-group row " + this.formClass("has-") }>
					<label className="col-4 col-form-label" htmlFor={"weh-"+this.props.keyName} title={this.props.keyName}>
						{this.props.keyName}</label>
					<div className="col-8">
						<input className="form-control"
							onChange={this.handleChange}
							value={this.state.value}
							type="text"
							id={"weh-"+this.props.keyName}
							/>
						<div className="form-text"><em>{ this.defaultString }</em></div>
					</div>
				</div>
			)
		}
	}
);