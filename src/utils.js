module.exports = {
	escapeHtmlEntities : function(unescapedString) {
		var tagsToReplace = {
			'&' : '&amp;',
			'<' : '&lt;',
			'>' : '&gt;'
		};

		var replaceTag = function(tag) {
			return tagsToReplace[tag] || tag;
		}

		return unescapedString.replace(/[&<>]/g, replaceTag);
	},
	onOutsideClick : function(container, onOutsideClick) {
		$(document).mouseup(function(e) {
			if (!container.is(e.target) // if the target of the click isn't the container...
					&& container.has(e.target).length === 0) // ... nor a descendant of the container
			{
				onOutsideClick();
			}
		});
	}
}