'use strict';
module.exports = {
	persistent: function(yasgui) {
		return "yasgui_" + $(yasgui.wrapperElement).closest('[id]').attr('id');
	}
};