var $ = require("jquery");
var root = module.exports = require("yasgui-yasqe");

root.defaults = $.extend(true, root.defaults, {
  persistent: null, //handled in YASGUI directly
  consumeShareLink: null,
  createShareLink: null,
  sparql: {
    showQueryButton: true,
    acceptHeaderGraph: "text/turtle",
    acceptHeaderSelect: "application/sparql-results+json"
  }
});
