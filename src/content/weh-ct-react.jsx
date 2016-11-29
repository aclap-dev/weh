/*
 * weh - WebExtensions Help
 *
 * @summary workflow and base code for developing WebExtensions browser add-ons
 * @author Michel Gutierrez
 * @link https://github.com/mi-g/weh
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

function wehReactAttach(component,callback) {
    var previous = {
        componentDidMount: component.componentDidMount,
        componentWillUnmount: component.componentWillUnmount
    }
    var receiveCallback = callback.bind(component);
    component.componentDidMount = function() {
        weh.on(receiveCallback);
        if(previous.componentDidMount)
            previous.componentDidMount.apply(component,arguments);
    }
    component.componentWillUnmount = function() {
        weh.off(receiveCallback);
        if(previous.componentWillUnmount)
            previous.componentWillUnmount.apply(component,arguments);
    }    
}

class WehParams extends React.Component {
    constructor(props) {
        super(props);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleDefault = this.handleDefault.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.onPrefs = this.onPrefs.bind(this);
        this.onPrefsSpecs = this.onPrefsSpecs.bind(this);
        this.state = {
            canCancel: false,
            canDefault: false,
            canSave: false
        }
        this.specs = {};
        this.originalValues = {};
        this.invalid = {};
        this.values = {};
    }
    
    componentDidMount() {
        weh.prefs.on({pack:true},this.onPrefs);
        weh.prefs.on({pack:true,specs:true},this.onPrefsSpecs);
        Object.assign(this.originalValues,weh.prefs);
        Object.assign(this.values,weh.prefs);
        Object.assign(this.specs,weh.prefSpecs);
        var prefs = {};
        Object.keys(this.values).forEach(function(prefName) {
            prefs[prefName] = 1;
        })
        weh.postLocal({
            type: "weh#reload-prefs",
            prefs: prefs
        });
        this.updateCan();
    }

    componentWillUnmoun() {
        weh.prefs.off(this.onPrefs);
        weh.prefs.off(this.onPrefsSpecs);
    }

    onPrefs() {
        this.originalValues = weh.prefs.getAll();
        var newPrefs = weh.prefs.getAll();
        var prefsKeys = {};
        for(var k in newPrefs) {
            prefsKeys[k] = 1;
            delete this.invalid[k];
            this.values[k] = this.originalValues[k];
        }
        this.values = newPrefs;
        weh.postLocal({
            type: "weh#reload-prefs",
            prefs: prefsKeys
        });
        this.updateCan();
    }

    onPrefsSpecs() {
        var newSpecs = weh.prefs.getSpecs();
        var prefsKeys = {};
        for(var k in newSpecs) {
            prefsKeys[k] = 1;
            delete this.invalid[k];
            if(typeof this.originalValues[k]=="undefined")
                this.originalValues[k] = newSpecs[k].defaultValue;
            this.values[k] = this.originalValues[k];
        }
        this.specs = newSpecs;
        weh.postLocal({
            type: "weh#reload-prefs",
            prefs: prefsKeys
        });
    }
    
    getChildContext() {
        return {
            setPref: this.setPref.bind(this),
            invalidPref: this.invalidPref.bind(this),
            getPref: this.getPref.bind(this),
            getOriginalPref: this.getOriginalPref.bind(this),
            getSpec: this.getSpec.bind(this),
        };
    }

    setPref(name,value) {
        if(this.values[name]===value)
            return;
        this.values[name] = value;
        delete this.invalid[name];
        var prefs = {};
        prefs[name] = 1;
        weh.postLocal({
            type: "weh#reload-prefs",
            prefs: prefs
        });
        this.updateCan();
    }
    
    invalidPref(name) {
        delete this.values[name];
        this.invalid[name] = 1;
        this.updateCan();
    }

    getPref(name) {
        return this.values[name];
    }

    getOriginalPref(name) {
        return this.originalValues[name];
    }

    getSpec(name) {
        return this.specs[name];
    }

    handleCancel() {
        var prefs = {};
        for(var k in this.values)
            if(this.values[k] !== this.originalValues[k])
                prefs[k] = 1;
        Object.assign(this.values,prefs,weh.prefs);
        weh.postLocal({
            type: "weh#reload-prefs",
            prefs: prefs
        });
        this.updateCan();
    }
    
    handleDefault() {
        var prefs = {};
        for(var k in this.values)
            if(this.specs[k] && this.specs[k].defaultValue !== this.values[k]) {
                prefs[k] = 1;
                this.values[k] = this.specs[k].defaultValue;
            }
        weh.postLocal({
            type: "weh#reload-prefs",
            prefs: prefs
        });
        this.updateCan();
    }
    
    handleSave() {
        weh.prefs.assign(this.values);
    }

    updateCan() {
        var state = {
            canCancel: false,
            canDefault: false,
            canSave: false
        }
        for(var k in this.values) {
            if(this.originalValues[k] !== this.values[k]) {
                state.canCancel = true;
                state.canSave = true;
            }
            if(this.specs[k] && this.values[k] !== this.specs[k].defaultValue) {
                state.canDefault = true;
            }
        }
        if(Object.keys(this.invalid).length>0) 
            state.canSave = false;
        this.setState(state);
    }
    
    render() {
        var self = this;
        var children = React.Children.map(this.props.children,
            (child) => React.cloneElement(child,{
                handlePref: self.handlePref
            })
        )
        return (
            <div>
                { children }
                <div className="text-center">
                <br/>
                <div className="btn-toolbar" style={{display:"inline-block"}}>
                    <button type="button" 
                        onClick={this.handleCancel}
                        className={"btn btn-default " + (this.state.canCancel ? "" : "disabled") } >{weh._("cancel")}</button>
                    <button type="button" 
                        onClick={this.handleDefault}
                        className={"btn btn-warning " + (this.state.canDefault ? "" : "disabled") }>{weh._("default")}</button>
                    <button type="button" 
                        onClick={this.handleSave}
                        className={"btn btn-primary " + (this.state.canSave ? "" : "disabled") }>{weh._("save")}</button>
                </div>
                </div>
            </div>
        )
    }
}

WehParams.childContextTypes = {
    setPref: React.PropTypes.func,
    invalidPref: React.PropTypes.func,
    getPref: React.PropTypes.func,
    getOriginalPref: React.PropTypes.func,
    getSpec: React.PropTypes.func
};


class WehParamSet extends React.Component {
    constructor(props) {
        super(props);
    }
    
    render() {
        var self = this;
        var prefElements = this.props.wehPrefs.map((pref) =>
            React.cloneElement(React.Children.only(self.props.children),{
                key: pref,
                wehPref: pref,
            })
        );
        return (
            <form className="form-horizontal" role="form">
                { prefElements }
            </form>
        )
    }
}

var wehParamIndex = 1;
class WehParam extends React.Component {
    constructor(props) {
        super(props);
        this.prefName = props.wehPref;
        this.handleChange=this.handleChange.bind(this);
        wehReactAttach(this,this.onWehMessage);
        this.paramIndex = wehParamIndex++;
        this.originalValue = null;
        this.state = {
            spec: null,
            value: null
        };
    }
    
    update() {
        var spec = this.context.getSpec(this.prefName);
        var value = this.context.getPref(this.prefName);
        if(typeof value=="undefined" && spec)
            value = spec.defaultValue;
        this.originalValue = this.context.getOriginalPref(this.prefName);
        this.setState({
            spec: spec,
            value: value
        });
        if(spec)
            this.notify(this.prefName,value);
    }
    
    componentDidMount() {
        this.update();        
    }
    

    onWehMessage(message) {
        switch(message.type) {
            case "weh#reload-prefs":
                if(message.prefs[this.prefName])
                    this.update();
                break;
        }
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
    
    notify(param,value) {
        if(value===null || typeof value=="undefined")
            return;
        if(this.isValid(value))
            this.context.setPref(param,value);
        else 
            this.context.invalidPref(param);
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
        this.notify(this.prefName,value,this.state.spec);
    }
    
    isValid(value) {
        var spec = this.state.spec;
        if(arguments.length==0)
            value = this.state.value;
        if(!spec)
            return false;
        switch(spec.type) {
            case "string":
                if(spec.regexp && !new RegExp(spec.regexp).test(value))
                    return false;
                break;
            case "integer":
                if(!/^-?[0-9]+$/.test(value))
                    return false;
                if(isNaN(parseInt(value)))
                    return false;
            case "float":
                if(spec.type=="float") {
                    if(!/^-?[0-9]+(\.[0-9]+)$/.test(value))
                        return false;
                    if(isNaN(parseFloat(value)))
                        return false;
                }
                if(typeof spec.minimum!="undefined" && value<spec.minimum)
                    return false;
                if(typeof spec.maximum!="undefined" && value>spec.maximum)
                    return false;
                break;
            case "choice":
                var ok = false;
                (spec.choices || []).forEach((choice) => {
                    if(value==choice.value)
                        ok = true;
                });
                if(!ok)
                    return false;
                break;
        }
        return true;
    }
    
    formGroupClass() {
        if(!this.isValid())
            return "has-error";
        else if(this.state.value !== this.originalValue)
            return "has-success";
        else if(this.state.value != this.state.spec.defaultValue)
            return "has-warning";
        else
            return "";
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
                if(options.length==0)
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
        if(!this.state.spec || this.state.value===null || typeof this.state.value=="undefined")
            return false;
        return (
            <div className={"form-group " + this.formGroupClass() }>
                <label className="col-sm-4 control-label" htmlFor={"weh-param-"+this.paramIndex}>
                    {this.state.spec.label}</label>
                <div className="col-sm-8">
                    {this.renderInput()}
                    { this.state.spec.description && (
                    <div className="help-block">{ this.state.spec.description }</div>
                    )}
                </div>
            </div>
        )
    }
}

WehParam.contextTypes = {
    setPref: React.PropTypes.func,
    invalidPref: React.PropTypes.func,
    getPref: React.PropTypes.func,
    getOriginalPref: React.PropTypes.func,
    getSpec: React.PropTypes.func
};

class WehVersion extends React.Component {
    
    versionName() {
        var manifest = browser.runtime.getManifest();
        var version = manifest.version;
        var version_name = manifest.version_name;
        if(version_name)
            if(version && version!=version_name)
                return version_name + " (" + version + ")";
            else
                return version_name;
        else
            return version;
    }
    
    render() {
        return (
            <form className="form-horizontal">
                <div className="form-group">
                    <label className="col-sm-4 control-label">
                        {weh._("version")}</label>
                    <div className="col-sm-8">
                        <p className="form-control-static">{this.versionName()}</p>
                    </div>
                </div>
            </form>
        )
    }
}


Object.assign(window,{
    WehParams: WehParams,
    WehParamSet: WehParamSet,
    WehParam: WehParam,
    WehVersion: WehVersion
});

window.weh.react = {
    wehReactAttach: wehReactAttach
}

