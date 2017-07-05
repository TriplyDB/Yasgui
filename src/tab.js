"use strict";

//		mod.emit('initError')
//		mod.once('initDone', load);

var $ = require("jquery"),
  EventEmitter = require("events").EventEmitter,
  utils = require("./utils.js"),
  yUtils = require("yasgui-utils"),
  _ = require("underscore"),
  YASGUI = require("./main.js");
//we only generate the settings for YASQE, as we modify lots of YASQE settings via the YASGUI interface
//We leave YASR to store its settings separately, as this is all handled directly from the YASR controls

module.exports = function(yasgui, options) {
  return new Tab(yasgui, options);
};
var Tab = function(yasgui, options) {
  EventEmitter.call(this);
  if (!options) options = {};
  if (!options.yasqe) options.yasqe = {};
  if (!options.yasr) options.yasr = {};
  var id = options.id;
  yasgui.persistentOptions.tabs[id] = $.extend(
    true,
    {},
    { yasqe: YASGUI.defaults.yasqe, yasr: YASGUI.defaults.yasr },
    options,
    yasgui.persistentOptions.tabs[id] || {}
  );
  var persistentOptions = yasgui.persistentOptions.tabs[id];
  var tab = this;
  tab.persistentOptions = persistentOptions;

  var menu = require("./tabPaneMenu.js")(yasgui, tab);
  var $pane = $("<div>", {
    id: persistentOptions.id,
    style: "position:relative",
    class: "tab-pane",
    role: "tabpanel"
  }).appendTo(yasgui.$tabPanesParent);

  var $paneContent = $("<div>", {
    class: "wrapper"
  }).appendTo($pane);
  var $controlBar = $("<div>", {
    class: "controlbar"
  }).appendTo($paneContent);
  var $paneMenu = menu.initWrapper().appendTo($pane);
  var addControlBar = function() {
    $("<button>", {
      type: "button",
      class: "menuButton btn btn-default"
    })
      .on("click", function(e) {
        if ($pane.hasClass("menu-open")) {
          $pane.removeClass("menu-open");
          menu.store();
        } else {
          menu.updateWrapper();
          $pane.addClass("menu-open");
          //					utils.onOutsideClick($(".menu-slide,.menuButton"), function() {$pane.removeClass('menu-open'); menu.store();});
          $(".menu-slide,.menuButton").onOutsideClick(function() {
            $pane.removeClass("menu-open");
            menu.store();
          });
        }
      })
      .append(
        $("<span>", {
          class: "icon-bar"
        })
      )
      .append(
        $("<span>", {
          class: "icon-bar"
        })
      )
      .append(
        $("<span>", {
          class: "icon-bar"
        })
      )
      .appendTo($controlBar);

    //add endpoint text input
    if (yasgui.options.endpointInput && typeof yasgui.options.endpointInput === 'function') {
      yasgui.options.endpointInput(yasgui, persistentOptions.yasqe,$, $controlBar, function(val) {
        persistentOptions.yasqe.sparql.endpoint = val;
        tab.refreshYasqe();
        yasgui.store();
      });
    }

  };

  var yasqeContainer = $("<div>", {
    id: "yasqe_" + persistentOptions.id
  }).appendTo($paneContent);
  var yasrContainer = $("<div>", {
    id: "yasq_" + persistentOptions.id
  }).appendTo($paneContent);

  var yasqeOptions = {
    createShareLink: require("./shareLink").getCreateLinkHandler(tab),
    onQuotaExceeded: yasgui.options.onQuotaExceeded
  };
  if (yasgui.options.api.urlShortener) {
    yasqeOptions.createShortLink = require("./shareLink").getShortLinkHandler(yasgui);
  }
  var storeInHist = function() {
    persistentOptions.yasqe.value = tab.yasqe.getValue(); //in case the onblur hasnt happened yet
    var resultSize = null;
    if (tab.yasr.results.getBindings()) {
      resultSize = tab.yasr.results.getBindings().length;
    }
    var histObject = {
      options: $.extend(true, {}, persistentOptions), //create copy
      resultSize: resultSize
    };
    delete histObject.options.name; //don't store this one
    yasgui.history.unshift(histObject);

    var maxHistSize = 50;
    if (yasgui.history.length > maxHistSize) {
      yasgui.history = yasgui.history.slice(0, maxHistSize);
    }

    //store in localstorage as well
    if (yasgui.persistencyPrefix) {
      yUtils.storage.set(yasgui.persistencyPrefix + "history", yasgui.history, null, yasgui.options.onQuotaExceeded);
    }
  };

  tab.setPersistentInYasqe = function() {
    if (tab.yasqe) {
      $.extend(tab.yasqe.options.sparql, persistentOptions.yasqe.sparql);
      //set value manualy, as this triggers a refresh
      if (persistentOptions.yasqe.value) tab.yasqe.setValue(persistentOptions.yasqe.value);
    }
  };
  $.extend(yasqeOptions, persistentOptions.yasqe);

  var initYasr = function() {
    if (!tab.yasr) {
      if (!tab.yasqe) initYasqe(); //we need this one to initialize yasr
      var getQueryString = function() {
        return (
          persistentOptions.yasqe.sparql.endpoint +
          "?" +
          $.param(tab.yasqe.getUrlArguments(persistentOptions.yasqe.sparql))
        );
      };
      YASGUI.YASR.plugins.error.defaults.tryQueryLink = getQueryString;

      tab.yasr = new YASGUI.YASR(
        yasrContainer[0],
        $.extend(
          {
            //this way, the URLs in the results are prettified using the defined prefixes in the query
            getUsedPrefixes: tab.yasqe.getPrefixesFromQuery
          },
          persistentOptions.yasr,
          {
            onQuotaExceeded: yasgui.options.onQuotaExceeded
          }
        )
      );
      tab.yasr.on("drawn", function(yasr, plugin) {
        if (tab.yasqe.lastQueryDuration && plugin.name == "Table" && yasr === tab.yasr) {
          var tableInfo = tab.yasr.resultsContainer.find(".dataTables_info");
          if (tableInfo.length > 0) {
            var text = tableInfo.first().text();
            tableInfo.text(text + " (in " + tab.yasqe.lastQueryDuration / 1000 + " seconds)");
          }
        }
      });
    }
  };
  tab.query = function(callbackOrConfig) {
    tab.yasqe.query(callbackOrConfig);
  };

  var initYasqe = function() {
    if (!tab.yasqe) {
      addControlBar();
      YASGUI.YASQE.defaults.extraKeys["Ctrl-Enter"] = function() {
        tab.yasqe.query.apply(this, arguments);
      };
      YASGUI.YASQE.defaults.extraKeys["Cmd-Enter"] = function() {
        tab.yasqe.query.apply(this, arguments);
      };
      tab.yasqe = YASGUI.YASQE(yasqeContainer[0], yasqeOptions);
      tab.yasqe.setSize("100%", persistentOptions.yasqe.height);
      tab.yasqe.on("blur", function(yasqe) {
        persistentOptions.yasqe.value = yasqe.getValue();
        yasgui.store();
      });
      tab.yasqe.on("query", function() {
        yasgui.$tabsParent.find('a[href="#' + id + '"]').closest("li").addClass("querying");
        yasgui.emit("query", yasgui, tab);
      });
      tab.yasqe.on("queryFinish", function() {
        yasgui.$tabsParent.find('a[href="#' + id + '"]').closest("li").removeClass("querying");
        yasgui.emit("queryFinish", yasgui, tab);
      });
      var beforeSend = null;
      tab.yasqe.options.sparql.callbacks.beforeSend = function() {
        beforeSend = +new Date();
      };
      tab.yasqe.options.sparql.callbacks.complete = function() {
        var end = +new Date();
        yasgui.tracker.track(
          persistentOptions.yasqe.sparql.endpoint,
          tab.yasqe.getValueWithoutComments(),
          end - beforeSend
        );
        tab.yasr.setResponse.apply(this, arguments);
        storeInHist();
      };

      tab.yasqe.query = function() {
        var options = {};
        options = $.extend(true, options, tab.yasqe.options.sparql);

        if (yasgui.options.api.corsProxy && yasgui.corsEnabled) {
          if (!yasgui.corsEnabled[persistentOptions.yasqe.sparql.endpoint]) {
            //use the proxy //name value

            options.args.push({
              name: "endpoint",
              value: options.endpoint
            });
            options.args.push({
              name: "requestMethod",
              value: options.requestMethod
            });
            options.requestMethod = "POST";
            options.endpoint = yasgui.options.api.corsProxy;
            YASGUI.YASQE.executeQuery(tab.yasqe, options);
          } else {
            YASGUI.YASQE.executeQuery(tab.yasqe, options);
          }
        } else {
          YASGUI.YASQE.executeQuery(tab.yasqe, options);
        }
      };
    }
  };
  tab.onShow = function() {
    initYasqe();
    tab.yasqe.refresh();
    initYasr();
    if (yasgui.options.allowYasqeResize) {
      $(tab.yasqe.getWrapperElement()).resizable({
        minHeight: 150,
        handles: "s",
        resize: function() {
          _.debounce(function() {
            tab.yasqe.setSize("100%", $(this).height());
            tab.yasqe.refresh();
          }, 500);
        },
        stop: function() {
          persistentOptions.yasqe.height = $(this).height();
          tab.yasqe.refresh();
          yasgui.store();
        }
      });
      $(tab.yasqe.getWrapperElement()).find(".ui-resizable-s").click(function() {
        $(tab.yasqe.getWrapperElement()).css("height", "auto");
        persistentOptions.yasqe.height = "auto";
        yasgui.store();
      });
    }
    YASGUI.YASQE.positionButtons(tab.yasqe);
  };

  tab.beforeShow = function() {
    initYasqe();
  };
  tab.refreshYasqe = function() {
    if (tab.yasqe) {
      $.extend(true, tab.yasqe.options, tab.persistentOptions.yasqe);
      if (tab.persistentOptions.yasqe.value) tab.yasqe.setValue(tab.persistentOptions.yasqe.value);
    }
  };
  tab.destroy = function() {
    if (!tab.yasr) {
      //instantiate yasr (without rendering results, to avoid load)
      //this way, we can clear the yasr persistent results
      tab.yasr = YASGUI.YASR(
        yasrContainer[0],
        {
          outputPlugins: []
        },
        ""
      );
    }
    yUtils.storage.removeAll(function(key, val) {
      return key.indexOf(tab.yasr.getPersistencyId("")) == 0;
    });
  };
  tab.getEndpoint = function() {
    var endpoint = null;
    if (yUtils.nestedExists(tab.persistentOptions, "yasqe", "sparql", "endpoint")) {
      endpoint = tab.persistentOptions.yasqe.sparql.endpoint;
    }
    return endpoint;
  };

  return tab;
};

Tab.prototype = new EventEmitter();
