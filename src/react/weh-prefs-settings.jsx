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
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import 'bootstrap/dist/css/bootstrap.css'
import 'css/weh-form-states.css';

import weh from 'weh-content';

const initialState = {
	values: {},		// the saved pref values
	current: {}, // prefs values being edited
	specs: {},  // prefs specifications
	flags: {}  // prefs flags
}

export function reducer(state=initialState,action) {

	function GetFlags() {
		var flags = {
			isModified: false,
			isDefault: true,
			isValid: true
		}
		Object.keys(state.specs || {}).forEach((prefName)=>{
			var spec = (state.specs || {})[prefName];
			var value = state.current[prefName];
			if(!spec) return;
			if(spec.defaultValue!==value)
				flags.isDefault = false;
			if(value!==state.values[prefName])
				flags.isModified = true;
			if(!weh.prefs.isValid(prefName,value))
				flags.isValid = false;
		});
		return flags;
	}

	switch(action.type) {
		case "PREFS_UPDATED":
			state = Object.assign({},state,{
				values: Object.assign({},state.values,action.payload),
				current: Object.assign({},action.payload,state.current),
			});
			state.flags = GetFlags();
			break;

		case "PREFS_SPECS_UPDATED":
			state = Object.assign({},state,{
				specs: Object.assign({},state.specs,action.payload),
			})
			state.flags = GetFlags();
			break;

		case "PREF_UPDATE":
			if(state.current[action.payload.prefName] != action.payload.value) {
				state = Object.assign({},state);
				state.current = Object.assign({},state.current);
				state.current[action.payload.prefName] = action.payload.value;
				state.flags = GetFlags();
			}
			break;

		case "PREFS_RESET":
			state = Object.assign({},state);
			Object.keys(state.specs || {}).forEach((prefName)=>{
				var spec = (state.specs || {})[prefName];
				if(!spec) return;
				state.current[prefName] = spec.defaultValue;
			});
			state.flags = GetFlags();		
			break;

		case "PREFS_CANCEL":
			state = Object.assign({},state);
			Object.keys(state.specs || {}).forEach((prefName)=>{
				state.current[prefName] = state.values[prefName];
			});
			state.flags = GetFlags();		
			break;

		case "PREFS_SAVE":
			weh.prefs.assign(state.current);
			break;
	}
	return state;
}

export class App extends React.Component {
	render() {
		return (
			<form className="weh-shf" noValidate onSubmit={(e)=>e.preventDefault()}>
				<div>{this.props.children}</div>
			</form>
    	)
	}
}

var wehParamIndex = 1;
export var WehParam = connect(
	// map redux state to react component props
	(state, ownProps) => {
		return {
			initialValue: state.prefs.values[ownProps.prefName] || "",
			value: state.prefs.current[ownProps.prefName] || "",
			spec: state.prefs.specs[ownProps.prefName] || {}
		}
	},
	// make some redux actions available as react component props
	(dispatch) => {
		return bindActionCreators ({
			updateCurrentPref: (prefName,value) => {
				return {
					type: "PREF_UPDATE",
					payload: { prefName, value }
				}
			}
		},dispatch);
	})(

class extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			value: this.props.value || "",
			spec: this.props.spec
		};
        this.paramIndex = wehParamIndex++;
        this.handleChange=this.handleChange.bind(this);
	}

	componentWillReceiveProps(props) {
		this.setState({
			value: props.value || "",
			spec: props.spec
		})
	}

    handleChange(event) {
        var value = this.state.spec.type=="boolean" ? event.target.checked : event.target.value;
        this.setState({
            value: value
        });
        if(this.state.spec.type=="integer")
            value = parseInt(value);
        if(this.state.spec.type=="float")
            value = parseFloat(value);
       	this.props.updateCurrentPref(this.props.prefName,value);
	}
	
	setCustomValue(value) {
		var event = { target: {} };
		if(this.state.spec.type=="boolean")
			event.target.checked = value;
		else
			event.target.value = value;
		this.handleChange(event);
	}

    isValid(value) {
        var spec = this.state.spec;
        if(arguments.length===0)
            value = this.state.value;
        if(!spec)
            return false;
        return weh.prefs.isValid(this.props.prefName,value);
    }

    formGroupClass() {
        if(!this.isValid())
            return "has-danger";
        else if(this.state.value != this.props.initialValue)
            return "has-success";
        else if(this.state.value != this.state.spec.defaultValue)
            return "has-warning";
        else
            return "";
    }

    getInputWidth() {
        switch(this.state.spec.type) {
            case "string":
                return this.state.spec.width || "20em";
            case "integer":
            case "float":
                return this.state.spec.width || "8em";
            case "boolean":
                return "34px";
            case "choice":
                return this.state.spec.width || "12em";
        }
    }

    renderInput() {
        switch(this.state.spec.type) {
            case "string":
            case "integer":
            case "float":
                return <input className="form-control"
                           value={this.state.value}
                           onChange={this.handleChange}
                           maxLength={this.state.spec.maxLength || -1}
                           id={"weh-param-"+this.paramIndex}
                           type="text"
                           style={{ width: this.getInputWidth() }}/>
            case "boolean":
                return <div>
                        <input className="form-control"
                            checked={this.state.value}
                            onChange={this.handleChange}
                            id={"weh-param-"+this.paramIndex}
                            type="checkbox"
                            style={{width:"34px"}}
                            />
                    </div>
            case "choice":
                var options = (this.state.spec.choices || []).map(
                    (option) => <option key={option.value} value={option.value}>{option.name}</option>
                );
                if(options.length===0)
                    return false;
                return <select
                           value={this.state.value}
                           onChange={this.handleChange}
                           className="form-control"
                           id={"weh-param-"+this.paramIndex}
                           style={{ width: this.getInputWidth() }}>
                        {options}
                    </select>

        }
    }

	render() {
		return (
            <div className={"form-group row " + this.formGroupClass() }>
                <label className="col-3 col-form-label" htmlFor={"weh-param-"+this.paramIndex}>
                    {this.state.spec.label}</label>
                <div className="col-8">
                    { this.props.renderInput && this.props.renderInput.call(this) || this.renderInput()}
                    { this.state.spec.description && (
                    <div className="form-text"><em>{ this.state.spec.description }</em></div>
                    )}
                </div>
            </div>
		)
	}
}

	); // end export WehParam


export var WehPrefsControls = connect(
	(state) => {
		return {
			flags: state.prefs.flags || {}
		}
	},
	(dispatch) => {
		return bindActionCreators ({
			save: () => {
				return {
					type: "PREFS_SAVE"
				}
			},
			reset: () => {
				return {
					type: "PREFS_RESET"
				}
			},
			cancel: () => {
				return {
					type: "PREFS_CANCEL"
				}
			}
		},dispatch);
	}
)(
	class extends React.Component {

		render() {
			return this.props.render.call(this);
		}
	}
);

export function listenPrefs(store) {
	const wehPrefs = weh.prefs;
	wehPrefs.on("",{ 
			pack: true
		},(prefs)=>{
			store.dispatch({
				type: "PREFS_UPDATED",
				payload: prefs
			})
		});

	wehPrefs.on("",{ 
			pack: true,
			specs: true
		},(specs)=>{
			store.dispatch({
				type: "PREFS_SPECS_UPDATED",
				payload: specs
			})
		});

}
