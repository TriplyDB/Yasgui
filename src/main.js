"use strict";
var $ = require('jquery'),
	yUtils = require('yasgui-utils');
require('./jquery/extendJquery.js');//extend some own jquery plugins


/**
 * set this dynamically on instantiation: this YASR setting is dependent on the corsProxy yasgui setting
 */
var setYasrOptions = function(options) {
	var corsLiHtml = 'Endpoint is not <a href="http://enable-cors.org/" target="_blank">CORS-enabled</a>';
	if (options.api.corsProxy) {
		//We have a proxy. only possible reason CORS is still an issue, is when endpoints runs on localhost, different port, and cors enabled
		corsLiHtml = 'Endpoint is not accessible from the YASGUI server and website, and the endpoint is not <a href="http://enable-cors.org/" target="_blank">CORS-enabled</a>';
	}	
	YASGUI.YASR.plugins.error.defaults.corsMessage =  $('<div>')
		.append($('<p>').append('Unable to get response from endpoint. Possible reasons:'))
		.append($('<ul>')
			.append($('<li>').text('Incorrect endpoint URL'))
			.append($('<li>').text('Endpoint is down'))
			.append($('<li>').html(corsLiHtml))
		);

}

var root = module.exports = function(parent, options) {
	var yasgui = {};
	yasgui.wrapperElement = $('<div class="yasgui"></div>').appendTo($(parent));
	yasgui.options = $.extend(true, {}, root.defaults, options);
	setYasrOptions(yasgui.options);
	yasgui.history = [];
	
	yasgui.persistencyPrefix = null;
	if (yasgui.options.persistencyPrefix) {
		yasgui.persistencyPrefix = (typeof yasgui.options.persistencyPrefix == 'function'? yasgui.options.persistencyPrefix(yasgui): yasgui.options.persistencyPrefix);
	}
	
	if (yasgui.persistencyPrefix) {
		var histFromStorage = yUtils.storage.get(yasgui.persistencyPrefix + 'history');
		if (histFromStorage) yasgui.history = histFromStorage;
	}
	yasgui.store = function() {
		if (yasgui.persistentOptions) {
			yUtils.storage.set(yasgui.persistencyPrefix, yasgui.persistentOptions);
		}
	};
	
	var getSettingsFromStorage = function() {
		var settings = yUtils.storage.get(yasgui.persistencyPrefix);
		if (!settings) settings = {};//initialize blank. Default vals will be set as we go
		return settings;
	}
	
	yasgui.persistentOptions = getSettingsFromStorage();
	
	yasgui.tabManager = require('./tabManager.js')(yasgui);
	yasgui.tabManager.init();
	yasgui.tracker = require('./tracker.js')(yasgui);
	return yasgui;
};




root.YASQE = require('./yasqe.js');
root.YASR = require('./yasr.js');
root.$ = $;
root.defaults = require('./defaults.js');