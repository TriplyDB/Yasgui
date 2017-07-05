"use strict";
var $ = require("jquery"),
  EventEmitter = require("events").EventEmitter,
  utils = require("yasgui-utils"),
  imgs = require("./imgs.js"),
  stories = require("./stories.js"),
  md5 = require("blueimp-md5");
require("./jquery/extendJquery.js"); //extend some own jquery plugins

/**
 * set this dynamically on instantiation: this YASR setting is dependent on the corsProxy yasgui setting
 */
var setYasrOptions = function(options) {
  var corsLiHtml = 'Endpoint is not <a href="http://enable-cors.org/" target="_blank">CORS-enabled</a>';
  if (options.api.corsProxy) {
    //We have a proxy. only possible reason CORS is still an issue, is when endpoints runs on localhost, different port, and cors enabled
    corsLiHtml =
      'Endpoint is not accessible from the YASGUI server and website, and the endpoint is not <a href="http://enable-cors.org/" target="_blank">CORS-enabled</a>';
  }
  module.exports.YASR.plugins.error.defaults.corsMessage = $("<div>")
    .append($("<p>").append("Unable to get response from endpoint. Possible reasons:"))
    .append(
      $("<ul>")
        .append($("<li>").text("Incorrect endpoint URL"))
        .append($("<li>").text("Endpoint is down"))
        .append($("<li>").html(corsLiHtml))
    );
};

var YASGUI = function(parent, options) {
  EventEmitter.call(this);
  var yasgui = this;
  yasgui.wrapperElement = $('<div class="yasgui"></div>').appendTo($(parent));
  yasgui.options = $.extend(true, {}, module.exports.defaults, options);
  setYasrOptions(yasgui.options);
  yasgui.history = [];

  yasgui.persistencyPrefix = null;
  if (yasgui.options.persistencyPrefix) {
    yasgui.persistencyPrefix = typeof yasgui.options.persistencyPrefix == "function"
      ? yasgui.options.persistencyPrefix(yasgui)
      : yasgui.options.persistencyPrefix;
    yasgui.persistencyPrefix = md5(yasgui.persistencyPrefix);
  }

  if (yasgui.persistencyPrefix) {
    var histFromStorage = utils.storage.get(yasgui.persistencyPrefix + "history");
    if (histFromStorage) yasgui.history = histFromStorage;
  }

  yasgui.store = function() {
    if (yasgui.persistentOptions) {
      utils.storage.set(yasgui.persistencyPrefix, yasgui.persistentOptions, null, yasgui.options.onQuotaExceeded);
    }
  };

  var getSettingsFromStorage = function() {
    var settings = utils.storage.get(yasgui.persistencyPrefix);
    if (!settings) settings = {}; //initialize blank. Default vals will be set as we go
    return settings;
  };

  yasgui.persistentOptions = getSettingsFromStorage();

  if (yasgui.persistentOptions.tabManager) yasgui.persistentOptions = yasgui.persistentOptions.tabManager; //for backwards compatability
  var persistentOptions = yasgui.persistentOptions;

  //tab object (containing e.g. yasqe/yasr)
  yasgui.tabs = {};

  //the actual tabs parent containing the ul of tab buttons
  var $tabsParent;

  //contains the tabs and panes
  var $tabPanel = null;

  //context menu for the tab context menu
  var $contextMenu = null;

  var getTabName = function(name, i) {
    if (!name) name = "Query";
    if (!i) i = 0;
    var fullName = name + (i > 0 ? " " + i : "");

    if (tabNameTaken(fullName)) fullName = getTabName(name, i + 1);
    return fullName;
  };
  var tabNameTaken = function(name) {
    for (var tabId in yasgui.tabs) {
      if (yasgui.tabs[tabId].persistentOptions.name == name) {
        return true;
      }
    }
    return false;
  };

  var getRandomId = function() {
    return Math.random().toString(36).substring(7);
  };
  var getTabInputEl = function() {
    return $('<div><input type="text"></div>').keydown(function(e) {
      if (e.which == 27 || e.keyCode == 27) {
        //esc
        $(this).closest("li").removeClass("rename");
      } else if (e.which == 13 || e.keyCode == 13) {
        //enter
        storeRename($(this).closest("li"));
      }
    });
  };
  var renameStart = function(tabEl) {
    var val = tabEl.find("span").text();
    tabEl.addClass("rename");
    tabEl.find("input").val(val).focus();
    tabEl.onOutsideClick(function() {
      storeRename(tabEl);
    });
  };
  var storeRename = function($liEl) {
    var tabId = $liEl.find('a[role="tab"]').attr("aria-controls");
    var val = $liEl.find("input").val();
    $liEl.find("span").text($liEl.find("input").val());
    persistentOptions.tabs[tabId].name = val;
    yasgui.store();
    $liEl.removeClass("rename");
  };
  yasgui.init = function() {
    //tab panel contains tabs and panes
    $tabPanel = $("<div>", {
      role: "tabpanel"
    }).appendTo(yasgui.wrapperElement);

    //init tabs
    $tabsParent = $("<ul>", {
      class: "nav nav-tabs mainTabs",
      role: "tablist"
    }).appendTo($tabPanel);
    yasgui.$tabsParent = $tabsParent;

    //init add button
    var $addTab = $("<a>", {
      role: "addTab"
    })
      .click(function(e) {
        addTab();
      })
      .text("+");
    $tabsParent.append(
      $("<li>", {
        role: "presentation"
      }).append($addTab)
    );

    //init panes
    yasgui.$tabPanesParent = $("<div>", {
      class: "tab-content"
    }).appendTo($tabPanel);

    if (!persistentOptions || $.isEmptyObject(persistentOptions)) {
      //ah, this is on first load. initialize some stuff
      persistentOptions = {
        tabOrder: [],
        tabs: {},
        selected: null
      };
      yasgui.options.tabs.forEach(function(tab) {
        var id = getRandomId();
        if (!persistentOptions.selected) persistentOptions.selected = id;
        persistentOptions.tabOrder.push(id);
        persistentOptions.tabs[id] = $.extend(
          true,
          {},
          {
            id: id
          },
          tab
        );
      });
      yasgui.persistentOptions = persistentOptions;
      yasgui.store();
    }
    var optionsFromUrl = require("./shareLink.js").getOptionsFromUrl();
    if (optionsFromUrl) {
      //hmm, we have options from the url. make sure we initialize everything using this tab
      //the one thing we don't have is the ID. generate it.
      var tabId = getRandomId();
      optionsFromUrl.id = tabId;
      persistentOptions.tabs[tabId] = optionsFromUrl;
      persistentOptions.tabOrder.push(tabId);
      persistentOptions.selected = tabId;
      yasgui.once("ready", function() {
        if (persistentOptions.tabs[tabId].yasr.outputSettings) {
          var plugin = yasgui.current().yasr.plugins[persistentOptions.tabs[tabId].yasr.output];
          if (plugin.options) {
            $.extend(plugin.options, persistentOptions.tabs[tabId].yasr.outputSettings);
          }
          delete persistentOptions.tabs[tabId]["yasr"]["outputSettings"];
        }

        yasgui.current().query();
      });
    }

    persistentOptions.tabOrder.forEach(addTab);

    $tabsParent.sortable({
      placeholder: "tab-sortable-highlight",
      items: 'li:has([data-toggle="tab"])', //don't allow sorting after ('+') icon
      forcePlaceholderSize: true,
      update: function() {
        var newTabOrder = [];
        $tabsParent.find('a[data-toggle="tab"]').each(function() {
          newTabOrder.push($(this).attr("aria-controls"));
        });
        persistentOptions.tabOrder = newTabOrder;
        yasgui.store();
      }
    });

    //Add context menu
    $contextMenu = $("<div>", {
      class: "tabDropDown"
    }).appendTo(yasgui.wrapperElement);
    var $contextMenuList = $("<ul>", {
      class: "dropdown-menu",
      role: "menu"
    }).appendTo($contextMenu);
    var addMenuItem = function(name, onClick) {
      var $listItem = $("<li>", {
        role: "presentation"
      }).appendTo($contextMenuList);
      if (name) {
        $listItem
          .append(
            $("<a>", {
              role: "menuitem",
              href: "#"
            }).text(name)
          )
          .click(function(event) {
            $contextMenu.hide();
            event.preventDefault();
            if (onClick) onClick($contextMenu.attr("target-tab"));
          });
      } else {
        $listItem.addClass("divider");
      }
    };
    addMenuItem("Add new Tab", function(tabId) {
      addTab();
    });
    addMenuItem("Rename", function(tabId) {
      renameStart($tabsParent.find('a[href="#' + tabId + '"]').parent());
    });
    addMenuItem("Copy", function(tabId) {
      var newTabId = getRandomId();
      var copiedSettings = $.extend(true, {}, persistentOptions.tabs[tabId]);
      copiedSettings.id = newTabId;
      persistentOptions.tabs[newTabId] = copiedSettings;
      addTab(newTabId);
      selectTab(newTabId);
    });
    addMenuItem();
    addMenuItem("Close", closeTab);
    addMenuItem("Close others", function(tabId) {
      $tabsParent.find('a[role="tab"]').each(function() {
        var currentId = $(this).attr("aria-controls");
        if (currentId != tabId) closeTab(currentId);
      });
    });
    addMenuItem("Close all", function() {
      $tabsParent.find('a[role="tab"]').each(function() {
        closeTab($(this).attr("aria-controls"));
      });
    });
  };
  var selectTab = function(id) {
    $tabsParent.find('a[aria-controls="' + id + '"]').tab("show");
    return yasgui.current();
  };
  yasgui.selectTab = selectTab;
  var closeTab = function(id) {
    /**
		 * cleanup local storage
		 */
    yasgui.tabs[id].destroy();

    /**cleanup variables**/
    delete yasgui.tabs[id];
    delete persistentOptions.tabs[id];
    var orderIndex = persistentOptions.tabOrder.indexOf(id);
    if (orderIndex > -1) persistentOptions.tabOrder.splice(orderIndex, 1);

    /**
		 * select new tab
		 */
    var newSelectedIndex = null;
    if (persistentOptions.tabOrder[orderIndex]) {
      //use the tab now in position of the old one
      newSelectedIndex = orderIndex;
    } else if (persistentOptions.tabOrder[orderIndex - 1]) {
      //use the tab in the previous position
      newSelectedIndex = orderIndex - 1;
    }
    if (newSelectedIndex !== null) selectTab(persistentOptions.tabOrder[newSelectedIndex]);

    /**
		 * cleanup dom
		 */
    $tabsParent.find('a[href="#' + id + '"]').closest("li").remove();
    $("#" + id).remove();

    yasgui.store();
    return yasgui.current();
  };
  yasgui.closeTab = closeTab;
  var addTab = function(tabId) {
    var newItem = !tabId;
    if (!tabId) tabId = getRandomId();
    if (!("tabs" in persistentOptions)) persistentOptions.tabs = {};
    var name = null;
    if (persistentOptions.tabs[tabId] && persistentOptions.tabs[tabId].name) {
      name = persistentOptions.tabs[tabId].name;
    }
    if (!name) name = getTabName();

    //Initialize new tab with endpoint from currently selected tab (if there is one)
    var endpoint = yasgui.options.endpoint;
    if (!endpoint && yasgui.current() && yasgui.current().getEndpoint()) {
      endpoint = yasgui.current().getEndpoint();
    }

    //first add tab
    var $tabToggle = $("<a>", {
      href: "#" + tabId,
      "aria-controls": tabId,
      role: "tab",
      "data-toggle": "tab"
    })
      .click(function(e) {
        e.preventDefault();
        $(this).tab("show");
        if (yasgui.tabs[tabId].yasqe) yasgui.tabs[tabId].yasqe.refresh();
      })
      .on("shown.bs.tab", function(e) {
        persistentOptions.selected = $(this).attr("aria-controls");
        yasgui.tabs[tabId].onShow();
        yasgui.store();
      })
      .append($("<div>", { class: "loader" }))
      .append($("<span>").text(name))
      .append(
        $("<button>", {
          class: "close",
          type: "button"
        })
          .text("x")
          .click(function() {
            closeTab(tabId);
          })
      );

    var $tabItem = $("<li>", {
      role: "presentation"
    })
      .append($tabToggle)
      .append(getTabInputEl())
      .dblclick(function() {
        var el = $(this);
        renameStart(el);
      })
      .mousedown(function(e) {
        if (e.which == 2) {
          //middle Click
          closeTab(tabId);
        }
      })
      .bind("contextmenu", function(e) {
        e.preventDefault();
        $contextMenu
          .show()
          .onOutsideClick(
            function() {
              $contextMenu.hide();
            },
            {
              allowedElements: $(this).closest("li")
            }
          )
          .addClass("open")
          .attr("target-tab", $tabItem.find('a[role="tab"]').attr("aria-controls"))
          .position({
            my: "left top-3",
            at: "left bottom",
            of: $(this)
          });
      });

    $tabsParent.find('li:has(a[role="addTab"])').before($tabItem);

    if (newItem) persistentOptions.tabOrder.push(tabId);
    var Tab = require("./tab.js");
    var options = {
      id: tabId,
      name: name,
      yasqe: yasgui.options.yasqe,
      yasr: yasgui.options.yasr
    };
    if (endpoint)
      options.yasqe = {
        sparql: {
          endpoint: endpoint
        }
      };
    yasgui.tabs[tabId] = new Tab(yasgui, options);
    if (newItem || persistentOptions.selected == tabId) {
      yasgui.tabs[tabId].beforeShow();
      $tabToggle.tab("show");
    }
    return yasgui.tabs[tabId];
  };

  yasgui.current = function() {
    return yasgui.tabs[persistentOptions.selected];
  };
  yasgui.addTab = addTab;

  yasgui.init();

  yasgui.tracker = require("./tracker.js")(yasgui);

  yasgui.emit("ready");
  return yasgui;
};
YASGUI.prototype = new EventEmitter();

module.exports = function(parent, options) {
  return new YASGUI(parent, options);
};
module.exports.sparqlStories = stories;
module.exports.stories = stories;
module.exports.shouldResetStorage = function() {
  return document.location.search.substring(1).split("&").indexOf("_resetYasgui") >= 0;
};

//Before we start initializing, check whether we need to reset our storage layer
if (module.exports.shouldResetStorage()) {
  utils.storage.removeAll();
}
module.exports.YASQE = require("./yasqe.js");
module.exports.YASR = require("./yasr.js");
module.exports.version = {
  YASGUI: require("../package.json").version,
  jquery: $.fn.jquery,
  "yasgui-utils": require("yasgui-utils").version,
  YASQE: module.exports.YASQE.version,
  YASR: module.exports.YASR.version
};
module.exports.$ = $;
module.exports.defaults = require("./defaults.js");
