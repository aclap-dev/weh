
class AddonSelector extends React.Component {

    constructor(props) {
        super(props);
        this.selectElement = null;
        this.pickAddon = this.pickAddon.bind(this);
        this.install = this.install.bind(this);
    }

    pickAddon(event) {
        this.props.pickAddon(event.target.value);
    }

    install(selectElement) {
        this.selectElement = selectElement;
        var self = this;
        $(document).ready(function() {
            var plugin = $(selectElement).select2({
                minimumResultsForSearch: Infinity,
                placeholder: weh._("pick_addon")
            }).on("change",self.pickAddon);
            if(self.props.addonId) {
                console.info("set select2",self.props.addonId);
                plugin.val(self.props.addonId)
            }
        });
    }

    render() {
        var items = this.props.addons.map((addon) =>
            <option key={addon.id} value={addon.id}>
                    {addon.name}
            </option>
        );
        items.unshift(
            <option key="" value=""></option>
        );
        return (
            <div className="addon-selector">
                <select
                    ref={(element) => { this.install(element) }}>
                    {items}
                </select>
                <div className="commands">
                {browser.management && (
                    <a onClick={this.props.rescanAddons}>{weh._("rescan_addons")}</a>
                )}
                </div>
            </div>
        )
    }
}

class AddonControl extends React.Component {

    render() {
        return (
            <div className={"addon-control "+(this.props.addon ? "selected" : "none")}>
                { this.props.addon && (
                    <div>
                        <div className="info">
                            <div className="addon-name">{ this.props.addon.name }</div>
                            <div className="addon-version">{ this.props.addon.version_name || this.props.addon.version }</div>
                            <div className="addon-id">{ this.props.addon.id }</div>
                        </div>
                        <div className="commands">
                            { this.props.addon.monitorBgUi && (
                                <a onClick={(() => this.props.addonControl("stopMonitorBgUi")).bind(this)}>
                                    {weh._("stop_monitor_bgui")}
                                </a>
                            ) || (
                                <a onClick={(() => this.props.addonControl("startMonitorBgUi")).bind(this)}>
                                    {weh._("start_monitor_bgui")}
                                </a>
                            )}
                            <a onClick={(() => this.props.addonControl("getStorage")).bind(this)}>
                                {weh._("show_storage")}
                            </a>
                            <a onClick={(() => this.props.addonControl("getPrefs")).bind(this)}>
                                {weh._("get_prefs")}
                            </a>

                        </div>
                    </div>
                )}
            </div>
        )
    }
}

class Message extends React.Component {

    install(element) {
        this.element = element;
        var self = this;
        $(document).ready(function() {
            $(element).jsonViewer(self.props.message.message, {collapsed: true});
        });
    }

    render() {
        var message = this.props.message;
        return (
            <tr key={message.key} className={"message-way-"+this.props.message.way}>
                <td>{message.timestamp - this.props.timestamp0}</td>
                <td>{this.props.addonName}</td>
                <td>{message.panel}</td>
                <td>{weh._("message_way_"+message.way)}</td>
                <td>{this.props.message.message.type || "???"}</td>
                <td><span ref={(element) => { this.install(element) }}></span></td>
            </tr>
        )
    }
}

class MessagesTab extends React.Component {

    constructor() {
        super();
        this.state = {
            messages: [],
        }
        this.clearMessages = this.clearMessages.bind(this);
        wehReactAttach(this,this.onWehMessage);
    }

    clearMessages() {
        this.setState({
            messages: []
        });
    }

    onWehMessage(message) {
        switch(message.type) {
            case "weh#bgui":
                this.setState((state0) => {
                    var messages = state0.messages.slice();
                    messages.push(message);
                    return {
                        messages: messages
                    }
                });
                break;
        }
    }

    render() {
        var timestamp0 = this.state.messages[0] && this.state.messages[0].timestamp;
        var items = this.state.messages.map((message) =>
            <Message
                key={message.key}
                timestamp0={timestamp0}
                message={message}
                addonName={this.props.addons[message.addonId].name}
                />
        );
        setTimeout((() => {
            if(this.scrollingElement)
                this.scrollingElement.scrollTop = this.scrollingElement.scrollHeight;
        }).bind(this),10);
        return (
            <div className="weh-table messages-tab">
                <div>
                    { this.state.messages.length>0 && (
                        <div>
                            <div className="weh-table-content fullheight">
                                <div ref={(element)=>{this.scrollingElement=element}}>
                                    <table className="message-table">
                                        <thead>
                                            <tr>
                                                <th>{weh._("msgtable_delta_t")}</th>
                                                <th>{weh._("msgtable_addon")}</th>
                                                <th>{weh._("msgtable_panel")}</th>
                                                <th>{weh._("msgtable_direction")}</th>
                                                <th>{weh._("msgtable_type")}</th>
                                                <th>{weh._("msgtable_message")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) || (
                        <div className="weh-table-middle messages-none">{weh._("messages_none")}</div>
                    )}
                </div>
                <div className="statusbar">
                    <div className="weh-table-middle">
                        <div>
                            <a onClick={this.clearMessages}>{weh._("clear_messages")}</a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

}

class StorageTab extends React.Component {

    install(element,store,key) {
        var self = this;
        $(document).ready(function() {
            $(element).jsonViewer(self.props.storage[store][key], {collapsed: true});
        });
    }

    render() {
        var self = this;
        var stores = Object.keys(this.props.storage).map((storeName) => {
            var store = this.props.storage[storeName];
            var items = Object.keys(store).map((key) => {
                var value = store[key];
                return (
                    <li key={key} className="storage-item">
                        <span className="storage-item-name">{key}</span>
                        <span className="storage-item-value"
                            ref={(element) => { self.install(element,storeName,key) }}></span>
                    </li>
                )
            });
            return (
                <li key={storeName} className="storage-store">
                    <div className="storage-store-name">{storeName}</div>
                    <ul className="storage-store-items">{items}</ul>
                </li>
            )
        });
        return (
            <div className="weh-table storage-tab">
                <div>
                    <div className="storage-addon">
                        { this.props.addon && (
                            <div>{weh._("storage_for",[this.props.addon.name])}</div>
                        )}
                    </div>
                </div>
                <div>
                    <div>
                        <div className="weh-table-content fullheight">
                            <div>
                                <div>
                                    <ul className="storage-stores">{stores}</ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="statusbar">
                    <div className="weh-table-middle">
                        <div>
                            <a onClick={()=>{this.props.addonControl("closeStorage")}}>{weh._("close")}</a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

class PrefsTab extends React.Component {

    constructor(props) {
        super(props);
        this.paramIndex = 1;
        this.handleChange = this.handleChange.bind(this);
    }

    formGroupClass(param) {
        if(this.props.specs[param].defaultValue!==this.props.prefs[param])
            return "has-warning";
        return "";
    }

     getInputWidth(spec) {
        switch(spec.type) {
            case "string":
                return spec.width || "20em";
            case "integer":
            case "float":
                return spec.width || "8em";
            case "boolean":
                return "34px";
            case "choice":
                return spec.width || "12em";
        }
    }

    handleChange(event) {
        var param = event.target.name;
        var value = this.props.specs[param].type=="boolean" ? event.target.checked : event.target.value;
        this.props.changePref(param,value);
    }

    renderInput(name,spec,paramIndex) {
        var value = this.props.prefs[name];
        switch(spec.type) {
            case "string":
            case "integer":
            case "float":
                return <input className="form-control"
                           name={name}
                           value={value}
                           onChange={this.handleChange}
                           maxLength={spec.maxLength || -1}
                           id={"weh-param-"+paramIndex}
                           type="text"
                           style={{ width: this.getInputWidth(spec) }}/>
            case "boolean":
                return <div>
                        <input className="form-control"
                            name={name}
                            checked={value}
                            onChange={this.handleChange}
                            id={"weh-param-"+paramIndex}
                            type="checkbox"
                            style={{width:"34px"}}
                            />
                    </div>
            case "choice":
                var options = (spec.choices || []).map(
                    (option) => <option key={option.value} value={option.value}>{option.name}</option>
                );
                if(options.length==0)
                    return false;
                return <select
                           name={name}
                           value={value}
                           onChange={this.handleChange}
                           className="form-control"
                           id={"weh-param-"+paramIndex}
                           style={{ width: this.getInputWidth(spec) }}>
                        {options}
                    </select>
        }
    }

    renderParam(name,spec) {
        var paramIndex = this.paramIndex++;
        return (
            <div key={name} className={"form-group param " + this.formGroupClass(name) }>
                <label className="col-sm-4 control-label" htmlFor={"weh-param-"+paramIndex}>
                    {name}</label>
                <div className="col-sm-8">
                    {this.renderInput(name,spec,paramIndex)}
                    <label>{spec.label}</label>
                    { spec.description && (
                    <div className="help-block">{ spec.description }</div>
                    )}
                </div>
            </div>
        );
    }

    render() {

        var self = this;
        var params = Object.keys(this.props.specs).sort().map((name) => self.renderParam(name,self.props.specs[name]));

        return (
            <div className="weh-table prefs-tab">
                <div>
                    <div className="prefs-addon">
                        { this.props.addon && (
                            <div>{weh._("prefs_for",[this.props.addon.name])}</div>
                        )}
                    </div>
                </div>
                <div>
                    <div>
                        <div className="weh-table-content fullheight">
                            <div>
                                <div>
                                    <div className="container fullwidth">
                                        <form className="form-horizontal">
                                            {params}
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="statusbar">
                    <div className="weh-table-middle">
                        <div>
                            <a onClick={()=>{this.props.addonControl("closePrefs")}}>{weh._("close")}</a>
                            <a onClick={()=>{this.props.addonControl("savePrefs")}}>{weh._("prefs_save")}</a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

class App extends React.Component {

    constructor() {
        super();
        this.state = {
            addons: {},
            addonId: null,
            storage: null,
            storageAddonId: null,
            prefs: null,
            prefsAddonId: null,
            activeTab: "messages"
        }
        this.rescanAddons = this.rescanAddons.bind(this);
        this.pickAddon = this.pickAddon.bind(this);
        this.addonControl = this.addonControl.bind(this);
        this.selectTab = this.selectTab.bind(this);
        this.changePref = this.changePref.bind(this);
        wehReactAttach(this,this.onWehMessage);
    }

    onWehMessage(message) {
        switch(message.type) {
            case "addons":
                this.setState((state0) => {
                    return {
                        addons: message.addons,
                        addonId: message.addons[state0.addonId] || null
                    }
                });
                break;
            case "add-addon":
                this.setState(function(state0) {
                    state0.addons[message.addon.id] = message.addon;
                    return {
                        addons: state0.addons
                    }
                });
                break;
            case "remove-addon":
                this.setState(function(state0) {
                    delete state0[message.id];
                    return {
                        addons: state0.addons
                    }
                });
                break;
            case "weh#storage":
                this.setState({
                    storageAddonId: message.addonId,
                    storage: message.storage,
                    activeTab: "storage"
                });
                break;
            case "weh#foreign-prefs":
                this.setState({
                    prefsAddonId: message.addonId,
                    prefs: message.prefs,
                    specs: message.specs,
                    activeTab: "prefs"
                });
                break;
        }
    }

    componentDidMount() {
        weh.post({
            type: "get-addons"
        });
    }

    rescanAddons() {
        this.setState({
            addons: {}
        });
        weh.post({
            type: "scan-addons",
        });
    }

    pickAddon(id) {
        this.setState({
            addonId: id
        });
    }

    addonControl(command) {
        switch(command) {
            case "startMonitorBgUi":
            case "stopMonitorBgUi":
                var status = command == "startMonitorBgUi"
                this.setState((state0) => {
                    this.state.addons[this.state.addonId].monitorBgUi = status;
                    return state0;
                });
                weh.post({
                    type: "monitor-bgui",
                    addonId: this.state.addonId,
                    status: status
                });
                this.setState({
                    monitorBgUi: status
                });
                break;
            case "getStorage":
                weh.post({
                    type: "get-storage",
                    addonId: this.state.addonId
                });
                break;
            case "getPrefs":
                weh.post({
                    type: "get-prefs",
                    addonId: this.state.addonId
                });
                break;
            case "savePrefs":
                weh.post({
                    type: "save-prefs",
                    addonId: this.state.prefsAddonId,
                    prefs: this.state.prefs
                });
                break;
            case "closePrefs":
                this.setState({
                    prefs: null,
                    specs: null,
                    prefsAddondId: null,
                    activeTab: "messages"
                });
                break;
            case "closeStorage":
                this.setState({
                    storage: null,
                    storageAddondId: null,
                    activeTab: "messages"
                });
                break;
        }
    }

    selectTab(tabName) {
        this.setState({
            activeTab: tabName
        });
    }

    tabClass(tabName) {
        return tabName==this.state.activeTab ? "active":"";
    }

    changePref(name,value) {
        if(this.state.prefs)
            this.setState((state0) => {
                state0.prefs[name] = value;
                return state0;
            });
    }

    render() {
        var self = this;
        var addonList = Object.keys(this.state.addons).map((id) => this.state.addons[id]);
        var monitoredBgUiCount = 0;
        Object.keys(this.state.addons).forEach((id) => {
             if(self.state.addons[id].monitorBgUi)
                 monitoredBgUiCount ++;
        });

        return (
            <div className="fullheight">
                <div className="sidebar fullheight col-md-3">
                    <h1>{weh._("weh_inspector")}</h1>
                    <AddonSelector
                        addons={addonList}
                        addonId={this.state.addonId}
                        rescanAddons={this.rescanAddons}
                        pickAddon={this.pickAddon}
                        />
                    { this.state.addons[this.state.addonId] && (
                        <AddonControl
                            addon={this.state.addons[this.state.addonId]}
                            addonControl={this.addonControl}
                            />
                    )}
                </div>
                <div className="addon-tabs col-md-9 fullheight">
                    <div className="weh-table">
                        <div className="addon-tabs-tabs">
                            <div>
                                <ul className="nav nav-tabs" role="tablist">
                                    <li role="presentation" className={this.tabClass("messages")}>
                                        <a href="#messages" role="tab"
                                            onClick={()=>this.selectTab("messages")}
                                            data-toggle="tab">{weh._("bgui_messages")}</a>
                                    </li>
                                    { this.state.storage && (
                                        <li role="presentation" className={this.tabClass("storage")}>
                                            <a href="#storage" role="tab"
                                            onClick={()=>this.selectTab("storage")}
                                            data-toggle="tab">{weh._("storage")}</a>
                                        </li>
                                    )}
                                    { this.state.prefs && (
                                        <li role="presentation" className={this.tabClass("prefs")}>
                                            <a href="#prefs" role="tab"
                                            onClick={()=>this.selectTab("prefs")}
                                            data-toggle="tab">{weh._("prefs")}</a>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        <div>
                            <div>
                                <div className="fullheight weh-table-content">
                                    <div className="tab-content">
                                        <div role="tabpanel"
                                            className={"tab-pane fullheight "+this.tabClass("messages")}
                                            id="messages">
                                            <MessagesTab
                                                addons={this.state.addons}
                                                />
                                        </div>
                                        { this.state.storage && (
                                            <div role="tabpanel"
                                                className={"tab-pane fullheight "+this.tabClass("storage")}
                                                id="storage">
                                                <StorageTab
                                                    addon={this.state.addons[this.state.storageAddonId]}
                                                    storage={this.state.storage}
                                                    addonControl={this.addonControl}
                                                    />
                                            </div>
                                        )}
                                        { this.state.prefs && (
                                            <div role="tabpanel"
                                                className={"tab-pane fullheight "+this.tabClass("prefs")}
                                                id="prefs">
                                                <PrefsTab
                                                    addon={this.state.addons[this.state.prefsAddonId]}
                                                    prefs={this.state.prefs}
                                                    specs={this.state.specs}
                                                    changePref={this.changePref}
                                                    addonControl={this.addonControl}
                                                    />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

ReactDOM.render (
    <div className="container fullheight">
        <App/>
    </div>,
    document.getElementById('root')
)
