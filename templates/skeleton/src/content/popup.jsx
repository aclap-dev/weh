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
import { render } from 'react-dom';

import weh from 'weh-content';

class Link extends React.Component {

    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() {
		weh.rpc.call(this.props.messageCall);
    }

    render() {
        return (
            <a onClick={this.handleClick}>{weh._(this.props.label)}</a>
        )
    }
}

render (
    <div className="sample-popup">
        <div className="sample-panel">{weh._("sample_panel_text")}</div>
        <div className="sample-toolbar">
            <Link messageCall={"openTranslation"} label={"translation"}/>
            <Link messageCall={"openSettings"} label={"settings"}/>
        </div>
    </div>,
    document.getElementById('root')
)