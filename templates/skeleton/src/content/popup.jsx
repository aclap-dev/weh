
class Link extends React.Component {

    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() {
        weh.post({
            type: this.props.messageType
        });
    }

    render() {
        return (
            <a onClick={this.handleClick}>{weh._(this.props.label)}</a>
        )
    }
}

ReactDOM.render (
    <div>
        <div className="sample-panel">{weh._("sample_panel_text")}</div>
        <div className="sample-toolbar">
            <Link messageType={"open-settings"} label={"settings"}/>
        </div>
    </div>,
    document.getElementById('root')
)
