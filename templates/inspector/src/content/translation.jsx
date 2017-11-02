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
import logger from 'redux-logger'
import { reducer as translateReducer, WehTranslationForm } from 'react/weh-translation'

import weh from 'weh-content';

let reducers = combineReducers({
	translate: translateReducer
});

let store = createStore(reducers, applyMiddleware(logger));

render(
	<Provider store={store}>
		<WehTranslationForm />
	</Provider>,
	document.getElementById('root')
);

weh.setPageTitle(weh._("translation"));
