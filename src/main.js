"use strict";
var $ = require('jquery');
require('./jquery/extendJquery.js');//extend some own jquery plugins




var root = module.exports = function(parent, options) {
	var yasgui = {};
	yasgui.wrapperElement = $('<div class="yasgui"></div>').appendTo($(parent));
	yasgui.tabManager = require('./tabManager.js')(yasgui);
	
	yasgui.tabManager.init();
	return yasgui;
};




root.YASQE = require('yasgui-yasqe');
root.YASQE.defaults = $.extend(true, root.YASQE.defaults, require('./defaultsYasqe.js'));
root.YASR = require('yasgui-yasr');
root.defaults = require('./defaults.js');