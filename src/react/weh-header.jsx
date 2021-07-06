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
import toolbarCss from 'css/weh-header.css';
import shfCss from 'css/weh-shf.css';

import weh from 'weh-content';

export default class WehHeader extends React.Component {

	close() {
		weh.rpc.call("closePanel",weh.uiName);
	}

	render() {
		var title;
		if(this.props.title)
			title = this.props.title;
		else
			title = manifest.name;

		var titleStyle = {
			backgroundImage: "url("+(this.props.image || "images/icon-32.png")+")"
		}
		return (
			<header className="weh-header">
				<span className="weh-header-title"
					style={titleStyle}
					>
					{title}
				</span>
				<span className="weh-header-close" style={{float:"right"}}onClick={this.close}>{"\u2297"}</span>
				{this.props.children}
			</header>
		)
	}
}
