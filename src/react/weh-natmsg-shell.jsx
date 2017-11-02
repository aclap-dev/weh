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

 import React from 'react'
import ReactJson from 'react-json-view';
import natmsgshStyles from '../css/weh-natmsg-shell.css';
import weh from 'weh-content';
import rpc from 'weh-rpc';

export class NativeMessagingShell extends React.Component {

    constructor(props) {
		super(props);
		this.state = {
			className: "",
			method: null,
			args: null,
			items: []
		};
		this.itemIndex = 0;
		this.history = [];
		this.historyIndex = 0;
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.clear = this.clear.bind(this);
	}
	
	resetInput() {
		this.input.value = "";
		this.setState({
			className: "",
			method: null,
			args: null
		});
	}

	clear() {
		this.setState({
			items: []
		});
	}

    handleChange(event) {
		var value = this.input.value.trim();
		var className = "", method = null, args = null;
		if(value.length) {
			className = "syntax-error";
			var parts = /^\s*([^\s\(\)]+)\s*\((.*)\)\s*$/.exec(value);
			if(parts) {
				var argsStr = "[" + parts[2] +"]";
				try {
					args = JSON.parse(argsStr);
					method = parts[1];
					className = "syntax-ok"
				} catch(e) {}
			}
		}
        this.setState({
			className: className,
			method: method,
			args: args
        });
	}

	addItem(item) {
		item = Object.assign({},item,{
			key: ++this.itemIndex
		});
		this.setState({
			items: this.state.items.concat([item])
		})
	}
	
	handleKeyDown(event) {
		var self = this;
		if(event.keyCode==13 && this.state.method) {
			this.history.push({
				method: this.state.method,
				args: this.state.args
			});
			this.historyIndex = this.history.push();
			this.addItem({
				type: "call",
				method: this.state.method,
				args: this.state.args
			});
			rpc.call(this.props.proxyFnName,this.state.method,...this.state.args)
				.then((result)=>{
					console.info("result",result);
					self.addItem({
						type: "result",
						result
					});
				})
				.catch((error)=>{
					console.info("error",error);
					self.addItem({
						type: "error",
						error
					});
				});
			this.resetInput();
		}
		if(event.keyCode==38 && this.historyIndex>0) {
			let entry = this.history[--this.historyIndex];
			this.setState({
				method: entry.method,
				args: entry.args,
				className: "syntax-ok",
			});
			this.input.value = this.entryString(entry);
		}
		if(event.keyCode==40 && this.historyIndex<this.history.length) {
			let entry = this.history[++this.historyIndex];
			if(entry) {
				this.setState({
					method: entry.method,
					args: entry.args,
					className: "syntax-ok",
				});
				this.input.value = this.entryString(entry);
			} else
				this.resetInput();
		}
	}

	entryString(entry) {
		return entry.method+"("+entry.args.map((arg)=>JSON.stringify(arg)).join(", ")+")";
	}

	scrollToBottom() {
		this.itemsEnd.scrollIntoView({ behavior: "smooth" });
	}

	componentDidMount() {
		this.scrollToBottom();
	}

	componentDidUpdate() {
		this.scrollToBottom();
	}

	renderJson(obj) {
		switch(typeof obj) {
			case "undefined":
				return (
						<div className="react-json-view scalar-view">
							<em>no explicit return value</em>
						</div>
					);
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

    render() {
		var self = this;
		var items = this.state.items.map((item)=>{
			return (
				<div key={item.key} className="natmsgsh-item">
					{ item.type == 'call' && (
						<div className="natmsgsh-call">
							{self.entryString(item)}
						</div>
					)}
					{ item.type == 'result' && (
						<div className="natmsgsh-return">
							<span className="natmsgsh-ret-marker" dangerouslySetInnerHTML={{__html:"&rArr;"}}/> 
								{ self.renderJson(item.result) }
						</div>
					)}
					{ item.type == 'error' && (
						<div className="natmsgsh-error">
							<span className="natmsgsh-ret-marker" dangerouslySetInnerHTML={{__html:"&rArr;"}}/> 
							{ item.error.message }
						</div>
					)}
				</div>
			)
		});
        return (
			<div className="natmsgsh">
				<div className="natmsgsh-result">
					{items}
					<div style={{ float: "left", clear: "both" }}
						ref={(el) => { this.itemsEnd = el; }}>
					</div>
				</div>
				<div className="natmsgsh-input">
					<input 
						ref={(input) => this.input = input}
						className={this.state.className}
						onChange={this.handleChange}
						placeholder="RPC call as: method(arg1,arg2)"
						onKeyDown={this.handleKeyDown}
						type="text"
						/>
						<button className="btn btn-outline-secondary"
							onClick={()=>{rpc.call(this.props.proxyFnName,"quit")}}>
							{this.props.exitAppText || "Exit app"}
						</button>
						<button  className="btn btn-outline-secondary"
							onClick={this.clear}>{this.props.clearText || "Clear"}</button>
					</div>
			</div>
        )
    }
}
