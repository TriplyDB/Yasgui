"use strict";
var $ = require('jquery'),
	yUtils = require('yasgui-utils');
require('./jquery/extendJquery.js');//extend some own jquery plugins




var root = module.exports = function(parent, options) {
	var yasgui = {};
	yasgui.wrapperElement = $('<div class="yasgui"></div>').appendTo($(parent));
	yasgui.options = $.extend(true, {}, root.defaults, options);
	
	
	var persistencyId = null;
	if (yasgui.options.persistent) persistencyId = (typeof yasgui.options.persistent == 'function'? yasgui.options.persistent(yasgui): yasgui.options.persistent);
	
	yasgui.store = function() {
		if (yasgui.persistentOptions) {
			yUtils.storage.set(persistencyId, yasgui.persistentOptions);
		}
	};
	
	var getSettingsFromStorage = function() {
		var settings = yUtils.storage.get(persistencyId);
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