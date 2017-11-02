
module.exports = [{
    name: "messages_display_mode",
    type: "choice",
    defaultValue: "sync_reply",
	width: "20em",
    choices: ["async","sync_call","sync_reply"]
},{
    name: "display_timestamp",
    type: "boolean",
    defaultValue: false
},{
    name: "display_call_duration",
    type: "boolean",
    defaultValue: true
},{
    name: "max_messages",
    type: "integer",
    defaultValue: 100
},{
    name: "redux_logger",
    type: "boolean",
	defaultValue: false,
	hidden: true
}];
