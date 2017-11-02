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
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { applyMiddleware, createStore, combineReducers } from 'redux'
import { 
		reducer as prefsSettingsReducer, 
		App as PrefsSettingsApp, 
		WehParam, 
		WehPrefsControls,
		listenPrefs 
	} from 'react/weh-prefs-settings'
import logger from 'redux-logger'
import WehHeader from 'react/weh-header';
import weh from 'weh-content';

import bootstrapStyles from 'bootstrap/dist/css/bootstrap.css'

let reducers = combineReducers({
	prefs: prefsSettingsReducer,
});
let store = createStore(reducers, applyMiddleware(logger));

listenPrefs(store);

function openTranslation() {
	weh.rpc.call("openTranslation")
}

function RenderControls() {
	return (
		<div className="btn-toolbar justify-content-between">
			<button type="button"
				onClick={openTranslation}
				className="btn btn-default">
					{weh._("translation")}
			</button>
			<div className="btn-group">
				<button type="button"
					onClick={this.props.cancel}
					className={"btn btn-default " + (this.props.flags.isModified ? "" : "disabled") }>
						{weh._("cancel")}
				</button>
				<button type="button"
					onClick={this.props.reset}
					className={"btn btn-warning " + (!this.props.flags.isDefault ? "" : "disabled") }>
						{weh._("default")}
				</button>
				<button type="button"
					onClick={this.props.save}
					className={"btn btn-primary " + (this.props.flags.isModified && this.props.flags.isValid ? "" : "disabled") }>
						{weh._("save")}
				</button>
			</div>
		</div>
	)
}

render(
  	<Provider store={store}>
		<PrefsSettingsApp>
			<main style={{minHeight:"160px"}}>
				<div className="container">
					<section>
						<WehParam prefName="messages_display_mode"/>
						<WehParam prefName="display_timestamp"/>
						<WehParam prefName="display_call_duration"/>
						<WehParam prefName="max_messages"/>
					</section>
				</div>
			</main>
			<footer>
				<WehPrefsControls render={RenderControls}/>
			</footer>
		</PrefsSettingsApp>
	</Provider>,
  document.getElementById('root')
)

weh.setPageTitle(weh._("settings"));
