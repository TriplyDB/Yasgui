"use strict";
var $ = require('jquery'),
	yUtils = require('yasgui-utils');
require('./jquery/extendJquery.js');//extend some own jquery plugins




var root = module.exports = function(parent, options) {
	var yasgui = {};
	yasgui.wrapperElement = $('<div class="yasgui"></div>').appendTo($(parent));
	yasgui.tabManager = require('./tabManager.js')(yasgui);
	yasgui.options = $.extend(true, {}, root.defaults, options);
	yasgui.tabManager.init();
	
	
	var persistencyId = null;
	if (yasgui.options.persistent) persistencyId = (typeof yasgui.options.persistent == 'function'? yasgui.options.persistent(yasgui): yasgui.options.persistent);
	yasgui.generatePersistentSettings = function() {
		return {
			tabManager: yasgui.tabManager.generatePersistentSettings()
		};
	};
	yasgui.store = function() {
		if (persistencyId) {
			var settingsToStore = yasgui.generatePersistentSettings();
			if (settingsToStore) {
				yUtils.storage.set(persistencyId, settingsToStore);
			}
		}
	};
	yasgui.getFromStorage = function() {
		return yUtils.storage.get(persistencyId);
	}
	return yasgui;
};




root.YASQE = require('yasgui-yasqe');
root.YASQE.defaults = $.extend(true, root.YASQE.defaults, require('./defaultsYasqe.js'));
root.YASR = require('yasgui-yasr');
root.defaults = require('./defaults.js');