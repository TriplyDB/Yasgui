"use strict";
var $ = require("jquery"),
  imgs = require("./imgs.js"),
  selectize = require("selectize"),
  utils = require("yasgui-utils");

module.exports = function(yasgui, tab) {
  var $menu = null;
  var $tabPanel = null;
  var $tabsParent = null;
  var $tabPanesParent = null;
  var $paneReqConfig = null;
  var $histList = null;

  var $btnPost;
  var $btnGet;
  var $acceptSelect;
  var $acceptGraph;
  var $urlArgsDiv;
  var $httpHeadersDiv;
  var $defaultGraphsDiv;
  var $namedGraphsDiv;
  var initWrapper = function() {
    $menu = $("<nav>", {
      class: "menu-slide",
      id: "navmenu"
    });
    $menu.append(
      $(utils.svg.getElement(imgs.yasgui)).addClass("yasguiLogo").attr("title", "About YASGUI").click(function() {
        window.open("http://about.yasgui.org", "_blank");
      })
    );

    //tab panel contains tabs and panes
    $tabPanel = $("<div>", {
      role: "tabpanel"
    }).appendTo($menu);

    //init tabs
    $tabsParent = $("<ul>", {
      class: "nav nav-pills tabPaneMenuTabs",
      role: "tablist"
    }).appendTo($tabPanel);

    //init panes
    $tabPanesParent = $("<div>", {
      class: "tab-content"
    }).appendTo($tabPanel);

    /**
		 * Init request tab
		 */
    var li = $("<li>", {
      role: "presentation"
    }).appendTo($tabsParent);
    var reqPaneId = "yasgui_reqConfig_" + tab.persistentOptions.id;
    li.append(
      $("<a>", {
        href: "#" + reqPaneId,
        "aria-controls": reqPaneId,
        role: "tab",
        "data-toggle": "tab"
      })
        .text("Configure Request")
        .click(function(e) {
          e.preventDefault();
          $(this).tab("show");
        })
    );
    var $reqPanel = $("<div>", {
      id: reqPaneId,
      role: "tabpanel",
      class: "tab-pane requestConfig container-fluid"
    }).appendTo($tabPanesParent);

    //request method
    var $reqRow = $("<div>", {
      class: "reqRow"
    }).appendTo($reqPanel);
    $("<div>", {
      class: "rowLabel"
    })
      .appendTo($reqRow)
      .append($("<span>").text("Request Method"));
    $btnPost = $("<button>", {
      class: "btn btn-default ",
      "data-toggle": "button"
    })
      .text("POST")
      .click(function() {
        $btnPost.addClass("active");
        $btnGet.removeClass("active");
      });
    $btnGet = $("<button>", {
      class: "btn btn-default",
      "data-toggle": "button"
    })
      .text("GET")
      .click(function() {
        $btnGet.addClass("active");
        $btnPost.removeClass("active");
      });
    $("<div>", {
      class: "btn-group col-md-8",
      role: "group"
    })
      .append($btnGet)
      .append($btnPost)
      .appendTo($reqRow);

    //Accept headers
    var $acceptRow = $("<div>", {
      class: "reqRow"
    }).appendTo($reqPanel);
    $("<div>", {
      class: "rowLabel"
    })
      .appendTo($acceptRow)
      .text("Accept Headers");

    $acceptSelect = $("<select>", {
      class: "acceptHeader"
    })
      .append(
        $("<option>", {
          value: "application/sparql-results+json"
        }).text("JSON")
      )
      .append(
        $("<option>", {
          value: "application/sparql-results+xml"
        }).text("XML")
      )
      .append(
        $("<option>", {
          value: "text/csv"
        }).text("CSV")
      )
      .append(
        $("<option>", {
          value: "text/tab-separated-values"
        }).text("TSV")
      );
    $("<div>", {
      class: "col-md-4",
      role: "group"
    })
      .append($("<label>").text("Ask / Select").append($acceptSelect))
      .appendTo($acceptRow);
    $acceptSelect.selectize();

    $acceptGraph = $("<select>", {
      class: "acceptHeader"
    })
      .append(
        $("<option>", {
          value: "text/turtle"
        }).text("Turtle")
      )
      .append(
        $("<option>", {
          value: "application/rdf+json"
        }).text("JSON")
      )
      .append(
        $("<option>", {
          value: "application/rdf+xml"
        }).text("RDF-XML")
      )
      .append(
        $("<option>", {
          value: "application/trig"
        }).text("TriG")
      )
      .append(
        $("<option>", {
          value: "application/n-triples"
        }).text("N-Triples")
      )
      .append(
        $("<option>", {
          value: "application/n-quads"
        }).text("N-Quads")
      )
      .append(
        $("<option>", {
          value: "text/csv"
        }).text("CSV")
      )
      .append(
        $("<option>", {
          value: "text/tab-separated-values"
        }).text("TSV")
      );
    $("<div>", {
      class: "col-md-4",
      role: "group"
    })
      .append($("<label>").text("Construct / Describe").append($acceptGraph))
      .appendTo($acceptRow);
    $acceptGraph.selectize();

    //URL args headers
    var $urlArgsRow = $("<div>", {
      class: "reqRow"
    }).appendTo($reqPanel);
    $("<div>", {
      class: "rowLabel"
    })
      .appendTo($urlArgsRow)
      .text("URL Arguments");
    $urlArgsDiv = $("<div>", {
      class: "col-md-8",
      role: "group"
    }).appendTo($urlArgsRow);

    //HTTP headers
    var $headersRow = $("<div>", {
      class: "reqRow"
    }).appendTo($reqPanel);
    $("<div>", {
      class: "rowLabel"
    })
      .appendTo($headersRow)
      .text("HTTP Headers");
    $httpHeadersDiv = $("<div>", {
      class: "col-md-8",
      role: "group"
    }).appendTo($headersRow);

    //Default graphs
    var $defaultGraphsRow = $("<div>", {
      class: "reqRow"
    }).appendTo($reqPanel);
    $("<div>", {
      class: "rowLabel"
    })
      .appendTo($defaultGraphsRow)
      .text("Default graphs");
    $defaultGraphsDiv = $("<div>", {
      class: "col-md-8",
      role: "group"
    }).appendTo($defaultGraphsRow);

    //Named graphs
    var $namedGraphsRow = $("<div>", {
      class: "reqRow"
    }).appendTo($reqPanel);
    $("<div>", {
      class: "rowLabel"
    })
      .appendTo($namedGraphsRow)
      .text("Named graphs");
    $namedGraphsDiv = $("<div>", {
      class: "col-md-8",
      role: "group"
    }).appendTo($namedGraphsRow);

    /**
		 * Init history tab
		 */
    var li = $("<li>", {
      role: "presentation"
    }).appendTo($tabsParent);
    var historyPaneId = "yasgui_history_" + tab.persistentOptions.id;
    li.append(
      $("<a>", {
        href: "#" + historyPaneId,
        "aria-controls": historyPaneId,
        role: "tab",
        "data-toggle": "tab"
      })
        .text("History")
        .click(function(e) {
          e.preventDefault();
          $(this).tab("show");
        })
    );

    var $histPanel = $("<div>", {
      id: historyPaneId,
      role: "tabpanel",
      class: "tab-pane history container-fluid"
    }).appendTo($tabPanesParent);
    $histList = $("<ul>", {
      class: "list-group"
    }).appendTo($histPanel);

    /**
		 * Init collections tab
		 */
    if (yasgui.options.api.collections) {
      var li = $("<li>", {
        role: "presentation"
      }).appendTo($tabsParent);
      var collectionsPaneId = "yasgui_collections_" + tab.persistentOptions.id;
      li.append(
        $("<a>", {
          href: "#" + collectionsPaneId,
          "aria-controls": collectionsPaneId,
          role: "tab",
          "data-toggle": "tab"
        })
          .text("Collections")
          .click(function(e) {
            e.preventDefault();
            $(this).tab("show");
          })
      );
      var $reqPanel = $("<div>", {
        id: collectionsPaneId,
        role: "tabpanel",
        class: "tab-pane collections container-fluid"
      }).appendTo($tabPanesParent);
    }

    return $menu;
  };

  var addTextInputsTo = function($el, num, animate, vals) {
    var $inputsAndTogglesContainer = $("<div>", {
      class: "textInputsRow"
    });
    for (var i = 0; i < num; i++) {
      var val = vals && vals[i] ? vals[i] : "";
      $("<input>", {
        type: "text"
      })
        .val(val)
        .keyup(function() {
          var lastHasContent = false;
          $el.find(".textInputsRow:last input").each(function(i, input) {
            if ($(input).val().trim().length > 0) lastHasContent = true;
          });
          if (lastHasContent) addTextInputsTo($el, num, true);
        })
        .css("width", 92 / num + "%")
        .appendTo($inputsAndTogglesContainer);
    }
    $inputsAndTogglesContainer.append(
      $("<button>", {
        class: "close",
        type: "button"
      })
        .text("x")
        .click(function() {
          $(this).closest(".textInputsRow").remove();
        })
      //				$(utils.svg.getElement(imgs.cross, {width: '14px', height: '14px'}))
      //				.addClass('closeBtn')
      //				.css('display', '')//let our style sheets do the work here
      //				.click(function(){
      //					$(this).closest('.textInputsRow').remove();
      //				})
    );
    if (animate) {
      $inputsAndTogglesContainer.hide().appendTo($el).show("fast");
    } else {
      $inputsAndTogglesContainer.appendTo($el);
    }
  };

  var updateWrapper = function() {
    /**
		 * update request tab
		 */
    //if no tab is active, select first one
    if ($menu.find(".tabPaneMenuTabs li.active").length == 0) $menu.find(".tabPaneMenuTabs a:first").tab("show");

    //we got most of the html. Now set the values in the html
    var options = tab.persistentOptions.yasqe;

    //Request method
    if (options.sparql.requestMethod.toUpperCase() == "POST") {
      $btnPost.addClass("active");
    } else {
      $btnGet.addClass("active");
    }
    //Request method
    $acceptGraph[0].selectize.setValue(options.sparql.acceptHeaderGraph);
    $acceptSelect[0].selectize.setValue(options.sparql.acceptHeaderSelect);

    //url args
    $urlArgsDiv.empty();
    if (options.sparql.args && options.sparql.args.length > 0) {
      options.sparql.args.forEach(function(el) {
        var vals = [el.name, el.value];
        addTextInputsTo($urlArgsDiv, 2, false, vals);
      });
    }
    addTextInputsTo($urlArgsDiv, 2, false); //and, always add one item

    //http headers
    $httpHeadersDiv.empty();
    if (!$.isEmptyObject(options.sparql.headers)) {
      $.each(options.sparql.headers, function(key, val) {
        addTextInputsTo($httpHeadersDiv, 2, false, [key, val]);
      });
    }
    addTextInputsTo($httpHeadersDiv, 2, false); //and, always add one item

    //default graphs
    $defaultGraphsDiv.empty();
    if (options.sparql.defaultGraphs && options.sparql.defaultGraphs.length > 0) {
      addTextInputsTo($defaultGraphsDiv, 1, false, options.sparql.defaultGraphs);
    }
    addTextInputsTo($defaultGraphsDiv, 1, false); //and, always add one item

    //default graphs
    $namedGraphsDiv.empty();
    if (options.sparql.namedGraphs && options.sparql.namedGraphs.length > 0) {
      addTextInputsTo($namedGraphsDiv, 1, false, options.sparql.namedGraphs);
    }
    addTextInputsTo($namedGraphsDiv, 1, false); //and, always add one item

    /**
		 * update history tab
		 */
    $histList.empty();
    if (yasgui.history.length == 0) {
      $histList.append(
        $("<a>", {
          class: "list-group-item disabled",
          href: "#"
        })
          .text("No items in history yet")
          .click(function(e) {
            e.preventDefault();
          })
      );
    } else {
      yasgui.history.forEach(function(histObject) {
        var text = histObject.options.yasqe.sparql.endpoint;
        if (histObject.resultSize) text += " (" + histObject.resultSize + " results)";
        $histList.append(
          $("<a>", {
            class: "list-group-item",
            href: "#",
            title: histObject.options.yasqe.value
          })
            .text(text)
            .click(function(e) {
              //update tab
              var tab = yasgui.tabs[histObject.options.id];
              $.extend(true, tab.persistentOptions, histObject.options);
              tab.refreshYasqe();

              yasgui.store();

              //and close menu
              $menu.closest(".tab-pane").removeClass("menu-open");
              e.preventDefault();
            })
        );
      });
    }
  };

  var store = function() {
    var options = tab.persistentOptions.yasqe.sparql;
    if ($btnPost.hasClass("active")) {
      options.requestMethod = "POST";
    } else if ($btnGet.hasClass("active")) {
      options.requestMethod = "GET";
    }

    //Request method
    options.acceptHeaderGraph = $acceptGraph[0].selectize.getValue();
    options.acceptHeaderSelect = $acceptSelect[0].selectize.getValue();

    //url args
    var args = [];
    $urlArgsDiv.find("div").each(function(i, el) {
      var inputVals = [];
      $(el).find("input").each(function(i, input) {
        inputVals.push($(input).val());
      });
      if (inputVals[0] && inputVals[0].trim().length > 0) {
        args.push({
          name: inputVals[0],
          value: inputVals[1] ? inputVals[1] : ""
        });
      }
    });
    options.args = args;

    //http headers
    var headers = {};
    $httpHeadersDiv.find("div").each(function(i, el) {
      var inputVals = [];
      $(el).find("input").each(function(i, input) {
        inputVals.push($(input).val());
      });
      if (inputVals[0] && inputVals[0].trim().length > 0) {
        headers[inputVals[0]] = inputVals[1] ? inputVals[1] : "";
      }
    });
    options.headers = headers;

    //default graphs
    var defaultGraphs = [];
    $defaultGraphsDiv.find("div").each(function(i, el) {
      var inputVals = [];
      $(el).find("input").each(function(i, input) {
        inputVals.push($(input).val());
      });
      if (inputVals[0] && inputVals[0].trim().length > 0) defaultGraphs.push(inputVals[0]);
    });
    options.defaultGraphs = defaultGraphs;

    //named graphs
    var namedGraphs = [];
    $namedGraphsDiv.find("div").each(function(i, el) {
      var inputVals = [];
      $(el).find("input").each(function(i, input) {
        inputVals.push($(input).val());
      });
      if (inputVals[0] && inputVals[0].trim().length > 0) namedGraphs.push(inputVals[0]);
    });
    options.namedGraphs = namedGraphs;
    yasgui.store();
    tab.setPersistentInYasqe();
  };

  return {
    initWrapper: initWrapper,
    updateWrapper: updateWrapper,
    store: store
  };
};
