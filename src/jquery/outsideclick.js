
var $ = require('jquery');

$.fn.onOutsideClick = function(onOutsideClick, config) {
	config = $.extend({
		skipFirst: false
	}, config)
	var el = $(this);
	
	var handler = function(e) {
		if (!el.is(e.target) // if the target of the click isn't the container...
				&& el.has(e.target).length === 0) // ... nor a descendant of the container
		{
			if (config.skipFirst) {
				config.skipFirst = false;
			} else {
				onOutsideClick();
				$(document).off('mouseup', handler);
			}
		}
	};
	$(document).mouseup(handler);
	
	return this;
}

