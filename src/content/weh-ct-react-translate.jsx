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


class WehTranslationItem extends React.Component {

    constructor(props) {
        super(props);
        this.handleChange=this.handleChange.bind(this);
    }

    formGroupClass() {
        if(this.props.changed)
            return "has-success";
        if(this.props.custom.message!=="")
            return "has-warning";
        return "";
    }

    handleChange(event) {
        event.stopPropagation();
        var args = {};
        var str = event.target.value;
        const substRe = new RegExp("^(?:|.*?[^\\\\])(?:\\$)arg([1-9])(?:\\$)(.*)");
        do {
            var m = substRe.exec(str);
            if(m) {
                args[m[1]] = 1;
                str = m[2];
            }
        } while(m);
        var item = {
            message: event.target.value
        }
        if(Object.keys(args).length>0) {
            item.placeholders = {};
            Object.keys(args).forEach(function(arg) {
                item.placeholders["arg"+arg] = {
                    content: "$"+arg
                }
            });
        }
        this.props.change(this.props.tkey,item);
    }

    render() {
        return (
            <div className={"form-group " + this.formGroupClass() }>
                <label className="col-sm-4 control-label" htmlFor={"weh-"+this.props.tkey}>
                    {this.props.tkey}</label>
                <div className="col-sm-8">
                    <input className="form-control"
                        onChange={this.handleChange}
                        value={this.props.custom.message}
                        type="text"
                        id={"weh-"+this.props.tkey}
                        />
                    <div className="help-block">{ this.props.original }</div>
                </div>
            </div>
        )
    }
}

class WehTranslation extends React.Component {
    constructor(props) {
        super(props);
        this.handleSave = this.handleSave.bind(this);
        this.handleChange=this.handleChange.bind(this);
        this.handleSearchChange=this.handleSearchChange.bind(this);
        var custom = {};
        try {
            custom = JSON.parse(window.localStorage.getItem("wehI18nCustom")) || {};
        } catch(e) {}
        this.state = {
            keys: [],
            custom: custom,
            customOrg: JSON.parse(JSON.stringify(custom)),
            search: ""
        }
        weh.react.attach(this,this.onWehMessage);
    }

    componentDidMount() {
        weh.post({type:"weh#get-i18n-keys"});
    }

    onWehMessage(message) {
        switch(message.type) {
            case "weh#i18n-keys":
                this.setState({keys:message.i18nKeys});
                break;
        }
    }

    handleSave() {
        window.localStorage.setItem("wehI18nCustom",JSON.stringify(this.state.custom));
        this.setState((state0) => {
            return {
                customOrg: JSON.parse(JSON.stringify(state0.custom))
            }
        });
    }

    handleChange(key,value) {
        this.setState((state0) => {
            state0.custom[key] = value;
            return {
                custom: state0.custom
            }
        });
    }

    handleSearchChange(event) {
        this.setState({
            search: event.target.value
        })
    }

    saveButtonClass() {
        for(var key in this.state.custom) {
            if((this.state.custom[key].message || "") !==
                ((this.state.customOrg[key] && this.state.customOrg[key].message) || ""))
                return "";
        }
        return "disabled";
    }

    render() {
        var self = this;
        var maxArgs = 4; // should be 9 but this is a bug in Edge
        var argPlaceHolders = new Array(maxArgs).fill("").map((v,i) => {return "$arg"+(i+1)+"$"});
        var originals = {};
        this.state.keys.forEach((key) => {
            originals[key] = browser.i18n.getMessage(key,argPlaceHolders);
        });
        var items = this.state.keys.filter((key) => {
            return self.state.search.length==0 ||
                key.indexOf(self.state.search)>=0 ||
                (self.state.customOrg[key] &&
                    self.state.customOrg[key].message.indexOf(self.state.search)>=0) ||
                originals[key].indexOf(self.state.search)>=0;
        }).sort().map((key) => {
            var original = originals[key];
            var custom = self.state.custom[key] || { message:"" };
            return (
                <WehTranslationItem
                    key={key}
                    tkey={key}
                    custom={custom}
                    original={original}
                    changed={(this.state.custom[key] && this.state.custom[key].message)!==
                        (this.state.customOrg[key] && this.state.customOrg[key].message)}
                    change={this.handleChange}
                    />
            )
        });
        return (
            <div>
                <form className="form-horizontal"
                    onChange={this.handleChange}
                    role="form">

                    <div className="form-group" style={{backgroundColor:"#eee",padding:"8px"}}>
                        <div className="col-sm-4"></div>
                        <div className="col-sm-8">
                            <input className="form-control"
                                onChange={this.handleSearchChange}
                                placeholder="Search..."
                                type="text"
                                />
                        </div>
                    </div>

                    { items }
                </form>
                <div className="text-center">
                    <br/>
                    <div className="btn-toolbar" style={{display:"inline-block"}}>
                        <button type="button"
                            onClick={this.handleSave}
                            className={"btn btn-primary "+this.saveButtonClass()}>Save</button>
                    </div>
                </div>
            </div>
        )
    }
}
