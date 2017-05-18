"use strict";
var $ = require("jquery"), selectize = require("selectize"), utils = require("yasgui-utils");

selectize.define("allowRegularTextInput", function(options) {
  var self = this;

  this.onMouseDown = (function() {
    var original = self.onMouseDown;
    return function(e) {
      if (!self.$dropdown.is(":visible")) {
        //receiving focus via mouse click
        original.apply(this, arguments);

        //this is a trick to make each value editable
        //a bit strange, but the only trick to avoid static values
        //and, this allows copy-ing (ctrl-c) of endpoints as well now
        var val = this.getValue();
        this.clear(true);
        this.setTextboxValue(val);
        this.refreshOptions(true);
      } else {
        //avoid closing the dropdown on second click. now, we can move the cursor using the mouse
        e.stopPropagation();
        e.preventDefault();
      }
    };
  })();
});

$.fn.endpointCombi = function(yasgui, options) {
  var checkCorsEnabled = function(endpoint) {
    if (!yasgui.corsEnabled) yasgui.corsEnabled = {};
    if (!(endpoint in yasgui.corsEnabled)) {
      $.ajax({
        url: endpoint + "?query=" + encodeURIComponent("ASK {?x ?y ?z}"),
        complete: function(jqXHR) {
          yasgui.corsEnabled[endpoint] = jqXHR.status > 0;
        }
      });
    }
  };
  var storeEndpoints = function(optGroup) {
    var persistencyId = null;
    if (yasgui.persistencyPrefix) {
      persistencyId = yasgui.persistencyPrefix + "endpoint_" + optGroup;
    }
    var endpoints = [];
    for (var val in $select[0].selectize.options) {
      var option = $select[0].selectize.options[val];
      if (option.optgroup == optGroup) {
        var endpoint = {
          endpoint: option.endpoint
        };
        if (option.text) endpoint.label = option.text;
        endpoints.push(endpoint);
      }
    }

    utils.storage.set(persistencyId, endpoints,null, yasgui.options.onQuotaExceeded);
  };

  //support callback
  var getEndpoints = function(callback, optGroup) {
    var persistencyId = null;
    if (yasgui.persistencyPrefix) {
      persistencyId = yasgui.persistencyPrefix + "endpoint_" + optGroup;
    }
    var endpoints = utils.storage.get(persistencyId);
    if (endpoints) return callback(endpoints, optGroup);

    if (optGroup == "catalogue" && yasgui.options.catalogueEndpoints) {
      if (typeof yasgui.options.catalogueEndpoints == "function") {
        return yasgui.options.catalogueEndpoints(yasgui, function(endpoints) {
          if (endpoints) utils.storage.set(persistencyId, endpoints,null, yasgui.options.onQuotaExceeded);
          callback(endpoints, optGroup);
        });
      } else if (typeof yasgui.options.catalogueEndpoints == "object") {
        endpoints = yasgui.options.catalogueEndpoints;
        utils.storage.set(persistencyId, endpoints,null, yasgui.options.onQuotaExceeded);
        callback(endpoints, optGroup);
      }
    }
  };

  var $select = this;

  var onClose = function() {
    $select.showAll = true;
  };

  var defaults = {
    selectize: {
      plugins: ["allowRegularTextInput"],
      create: function(input, callback) {
        callback({
          endpoint: input,
          optgroup: "own"
        });
      },
      onBlur: onClose,
      createOnBlur: true,
      onItemAdd: function(value, $item) {
        onClose();
        if (options.onChange) options.onChange(value);
        if (yasgui.options.api.corsProxy) checkCorsEnabled(value);
      },
      onOptionRemove: function(value) {
        storeEndpoints("own");
        storeEndpoints("catalogue");
      },
      optgroups: [
        {
          value: "own",
          label: "History"
        },
        {
          value: "catalogue",
          label: "Catalogue"
        }
      ],
      optgroupOrder: ["own", "catalogue"],
      sortField: "endpoint",
      valueField: "endpoint",
      labelField: "endpoint",
      searchField: ["endpoint", "text"],
      score: function(search) {
        if ($select.showAll) {
          return function() {
            $select.showAll = false;
            return 1;
          };
        } else {
          return this.getScoreFunction(search);
        }
      },
      render: {
        option: function(data, escape) {
          var remove = '<a href="javascript:void(0)"  class="close pull-right" tabindex="-1" ' +
            'title="Remove from ' +
            (data.optgroup == "own" ? "history" : "catalogue") +
            '">&times;</a>';
          var url = '<div class="endpointUrl">' + escape(data.endpoint) + "</div>";
          var label = "";
          if (data.text) label = '<div class="endpointTitle">' + escape(data.text) + "</div>";
          return '<div class="endpointOptionRow">' + remove + url + label + "</div>";
        }
      }
    }
  };

  if (options) {
    options = $.extend(true, {}, defaults, options);
  } else {
    options = defaults;
  }

  this.addClass("endpointText form-control");
  this.selectize(options.selectize);

  /**
	 * THIS IS UGLY!!!!
	 * Problem: the original option handler from selectize executes the preventDefault and stopPropagation functions
	 * I.e., I cannot add my own handler to a sub-element of the option (such as a 'deleteOption' button)
	 * Only way to do this would be to haven an inline handler ('onMousDown') definition, which is even uglier
	 * So, for now, remove all mousedown handlers for options, and add the same functionality of selectize myself.
	 * I'll keep the stopPropagation in there to keep it as consistent as possible with the original code
	 * But I'll add some logic which executed whenever the delete button is pressed...
	 */
  $select[0].selectize.$dropdown.off("mousedown", "[data-selectable]"); //disable handler set by selectize
  //add same handler (but slightly extended) myself:
  $select[0].selectize.$dropdown.on("mousedown", "[data-selectable]", function(e) {
    var value, $target, $option, self = $select[0].selectize;

    if (e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }

    $target = $(e.currentTarget);
    if ($(e.target).hasClass("close")) {
      $select[0].selectize.removeOption($target.attr("data-value"));
      $select[0].selectize.refreshOptions();
    } else if ($target.hasClass("create")) {
      self.createItem();
    } else {
      value = $target.attr("data-value");
      if (typeof value !== "undefined") {
        self.lastQuery = null;
        self.setTextboxValue("");
        self.addItem(value);
        if (!self.settings.hideSelected && e.type && /mouse/.test(e.type)) {
          self.setActiveOption(self.getOption(value));
        }
      }
    }
  });

  var optionAddCallback = function(val, option) {
    if (option.optgroup) {
      storeEndpoints(option.optgroup);
    }
  };

  var storeEndpointsInSelectize = function(endpointArray, optgroup) {
    if (endpointArray) {
      //first disable callback. don't want to run this for endpoints fetched from local storage and ckan
      $select[0].selectize.off("option_add", optionAddCallback);

      endpointArray.forEach(function(val) {
        $select[0].selectize.addOption({
          endpoint: val.endpoint,
          text: val.title,
          optgroup: optgroup
        });
      });

      //re-enable it again
      $select[0].selectize.on("option_add", optionAddCallback);
    }
  };

  getEndpoints(storeEndpointsInSelectize, "catalogue");
  getEndpoints(storeEndpointsInSelectize, "own");

  if (options.value) {
    if (!(options.value in $select[0].selectize.options)) {
      $select[0].selectize.addOption({
        endpoint: options.value,
        optgroup: "own"
      });
    }
    $select[0].selectize.addItem(options.value);
  }

  return this;
};
