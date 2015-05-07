'use strict';

var $ = require('jquery');
module.exports = {
	persistencyPrefix: function(yasgui) {
		return "yasgui_" + $(yasgui.wrapperElement).closest('[id]').attr('id') + "_";
	},
	allowYasqeResize: true,
	api: {
		corsProxy: null,
		collections: null,
	},
	tracker: {
		googleAnalyticsId: null,
		askConsent: true,
	}
};