"use strict";
var $ = require('jquery'),
	yUtils = require('yasgui-utils');
require('./jquery/extendJquery.js');//extend some own jquery plugins




var root = module.exports = function(parent, options) {
	var yasgui = {};
	yasgui.wrapperElement = $('<div class="yasgui"></div>').appendTo($(parent));
	yasgui.options = $.extend(true, {}, root.defaults, options);
	yasgui.history = [];
	
	yasgui.persistencyPrefix = null;
	if (yasgui.options.persistencyPrefix) {
		yasgui.persistencyPrefix = (typeof yasgui.options.persistencyPrefix == 'function'? yasgui.options.persistencyPrefix(yasgui): yasgui.options.persistencyPrefix);
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
	return yasgui;
};




root.YASQE = require('yasgui-yasqe');
root.YASQE.defaults = $.extend(true, root.YASQE.defaults, require('./defaultsYasqe.js'));
root.YASR = require('yasgui-yasr');
root.defaults = require('./defaults.js');