
var $ = require('jquery');

$.fn.onOutsideClick = function(onOutsideClick) {
	var el = $(this);
	$(document).mouseup(function(e) {
		if (!el.is(e.target) // if the target of the click isn't the container...
				&& el.has(e.target).length === 0) // ... nor a descendant of the container
		{
			onOutsideClick();
		}
	});
	return this;
}

