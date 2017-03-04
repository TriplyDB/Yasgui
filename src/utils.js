var $ = require("jquery");
module.exports = {
  escapeHtmlEntities: function(unescapedString) {
    var tagsToReplace = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;"
    };

    var replaceTag = function(tag) {
      return tagsToReplace[tag] || tag;
    };

    return unescapedString.replace(/[&<>]/g, replaceTag);
  }
};
