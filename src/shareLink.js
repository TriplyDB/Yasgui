var $ = require("jquery");
var urlParse = require('url-parse')
var deparam = function(queryString) {
  var params = [];
  if (queryString && queryString.length > 0) {
    var vars = queryString.split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      var key = pair[0];
      var val = pair[1];
      if (key.length > 0 && val && val.length > 0) {
        //we at least need a key right

        //do the decoding. Do plus sign separately (not done by the native decode function)
        val = val.replace(/\+/g, " ");
        val = decodeURIComponent(val);
        params.push({
          name: pair[0],
          value: val
        });
      }
    }
  }
  return params;
};

var getUrlParams = function(_url) {
  var urlFromWindow = false;
  if (!_url) urlFromWindow = true;
  var url = urlParse(_url || window.location.href);
  var urlParams = [];
  //first try hash
  if (url.hash.length > 1) {
    //firefox does some decoding if we're using window.location.hash (e.g. the + sign in contentType settings)
    //Don't want this. So simply get the hash string ourselves
    urlParams = deparam(url.hash.split("#")[1]);

    if (urlFromWindow) window.location.hash = ""; //clear hash
  } else if (url.query.length > 1) {
    //ok, then just try regular url params
    urlParams = deparam(url.query.substring(1));
  }
  return urlParams;
};

module.exports = {
  getShortLinkHandler: function(yasgui) {
    return function(url, callback) {
      $.ajax({
        url: yasgui.options.api.urlShortener,
        data: {
          url: url
        },
        error: function(jqXhr, textStatus, errorThrown) {
          callback(jqXhr.responseText);
        },
        success: function(data) {
          callback(null, data);
        }
      });
    };
  },
  getCreateLinkHandler: function(tab) {
    return function() {
      /**
			 * First set YASQE settings
			 */
      var params = [
        {
          name: "query",
          value: tab.yasqe.getValue()
        },
        {
          name: "contentTypeConstruct",
          value: tab.persistentOptions.yasqe.sparql.acceptHeaderGraph
        },
        {
          name: "contentTypeSelect",
          value: tab.persistentOptions.yasqe.sparql.acceptHeaderSelect
        },
        {
          name: "endpoint",
          value: tab.persistentOptions.yasqe.sparql.endpoint
        },
        {
          name: "requestMethod",
          value: tab.persistentOptions.yasqe.sparql.requestMethod
        },
        {
          name: "tabTitle",
          value: tab.persistentOptions.name
        },
        {
          name: "headers",
          value: JSON.stringify(tab.persistentOptions.yasqe.sparql.headers)
        }
      ];

      tab.persistentOptions.yasqe.sparql.args.forEach(function(paramPair) {
        params.push(paramPair);
      });
      tab.persistentOptions.yasqe.sparql.namedGraphs.forEach(function(ng) {
        params.push({
          name: "namedGraph",
          value: ng
        });
      });
      tab.persistentOptions.yasqe.sparql.defaultGraphs.forEach(function(dg) {
        params.push({
          name: "defaultGraph",
          value: dg
        });
      });

      /**
			 * Now set YASR settings
			 */
      params.push({
        name: "outputFormat",
        value: tab.yasr.options.output
      });
      if (tab.yasr.plugins[tab.yasr.options.output].getPersistentSettings) {
        var persistentPluginSettings = tab.yasr.plugins[tab.yasr.options.output].getPersistentSettings();
        if (typeof persistentPluginSettings == "object") {
          persistentPluginSettings = JSON.stringify(persistentPluginSettings);
        }
        params.push({
          name: "outputSettings",
          value: persistentPluginSettings
        });
      }

      //extend existing link, so first fetch current arguments. But: make sure we don't include items already used in share link
      if (window.location.hash.length > 1) {
        var keys = [];
        params.forEach(function(paramPair) {
          keys.push(paramPair.name);
        });
        var currentParams = deparam(window.location.hash.substring(1));
        currentParams.forEach(function(paramPair) {
          if (keys.indexOf(paramPair.name) == -1) {
            params.push(paramPair);
          }
        });
      }

      return params;
    };
  },
  getOptionsFromUrl: function(url) {
    var options = {
      yasqe: {
        sparql: {}
      },
      yasr: {}
    };

    var params = getUrlParams(url);
    var validYasguiOptions = false;

    params.forEach(function(paramPair) {
      if (paramPair.name == "query") {
        validYasguiOptions = true;
        options.yasqe.value = paramPair.value;
      } else if (paramPair.name == "outputFormat") {
        var output = paramPair.value;
        if (output == "simpleTable") output = "table"; //this query link is from v1. don't have this plugin anymore
        options.yasr.output = output;
      } else if (paramPair.name == "outputSettings") {
        options.yasr.outputSettings = JSON.parse(paramPair.value);
      } else if (paramPair.name == "contentTypeConstruct") {
        options.yasqe.sparql.acceptHeaderGraph = paramPair.value;
      } else if (paramPair.name == "contentTypeSelect") {
        options.yasqe.sparql.acceptHeaderSelect = paramPair.value;
      } else if (paramPair.name == "endpoint") {
        options.yasqe.sparql.endpoint = paramPair.value;
      } else if (paramPair.name == "requestMethod") {
        options.yasqe.sparql.requestMethod = paramPair.value;
      } else if (paramPair.name == "tabTitle") {
        options.name = paramPair.value;
      } else if (paramPair.name == "namedGraph") {
        if (!options.yasqe.sparql.namedGraphs) options.yasqe.sparql.namedGraphs = [];
        options.yasqe.sparql.namedGraphs.push(paramPair.value);
      } else if (paramPair.name == "defaultGraph") {
        if (!options.yasqe.sparql.defaultGraphs) options.yasqe.sparql.defaultGraphs = [];
        options.yasqe.sparql.defaultGraphs.push(paramPair.value);
      } else if (paramPair.name == "headers") {
        if (!options.yasqe.sparql.headers) options.yasqe.sparql.headers = {};
        var headers = JSON.parse(paramPair.value);
        if ($.isPlainObject(headers)) {
          options.yasqe.sparql.headers = headers;
        }
      } else {
        if (!options.yasqe.sparql.args) options.yasqe.sparql.args = [];
        //regular arguments. So store them as regular arguments
        options.yasqe.sparql.args.push(paramPair);
      }
    });
    if (validYasguiOptions) {
      return options;
    } else {
      return null;
    }
  }
};
