var ATTRS = {
  URL_LINK: "data-query",
  SPARQL_REF: "data-query-sparql",
  ENDPOINT: "data-query-endpoint",
  OUTPUT: "data-query-output"
};

var $ = require("jquery");
var linkUtils = require("./shareLink");
var Promise = require("promise-polyfill");
//This lib _requires_ a catch clause (we use just a second arg in the then)
//so disable these warning
Promise._unhandledRejectionFn = function(rejectError) {};
var urlParse = require("url-parse");
module.exports = function(yasguiOptions) {
  $(document).ready(function() {
    window.yasgui = [];
    var yasguiStoryItems = $("[" + ATTRS.URL_LINK + "]");
    var count = 0;
    function loadEls() {
      if (count >= yasguiStoryItems.length) {
        //loaded everything, so we're done
      } else {
        loadEl(yasguiStoryItems[count], 0, count).then(function() {
          count++;
          loadEls();
        });
      }
    }
    loadEls();
  });
  function getInfoFromParent($el) {
    var info = {
      queryRef: undefined,
      yasguiOptions: {
        yasqe: {
          value: undefined,
          sparql: {
            endpoint: undefined
          }
        },
        yasr: {
          output: undefined
        }
      }
    };
    var parents = $el.parents().toArray();
    parents.push($el[0]);

    parents.forEach(function(parent) {
      var $parent = $(parent);
      if ($parent.attr(ATTRS.SPARQL_REF)) info.queryRef = $parent.attr(ATTRS.SPARQL_REF);
      if ($parent.attr(ATTRS.ENDPOINT)) info.yasguiOptions.yasqe.sparql.endpoint = $parent.attr(ATTRS.ENDPOINT);
      if ($parent.attr(ATTRS.OUTPUT)) info.yasguiOptions.yasr.output = $parent.attr(ATTRS.OUTPUT);
    });
    return info;
  }

  function getConfigForEl($el) {
    var url = $el.attr(ATTRS.URL_LINK);
    var optionsFromUrl = Promise.resolve({});
    if (url) {
      optionsFromUrl = getFullUrl(url).then(linkUtils.getOptionsFromUrl).then(function(options) {
        return cleanConfig(options, url);
      });
    }
    var parentInfo = getInfoFromParent($el);
    var queryValue = parentInfo.queryRef
      ? Promise.resolve().then(function() {
          return $.get(parentInfo.queryRef);
        })
      : Promise.resolve(undefined);

    var finalOptions;
    return optionsFromUrl
      .then(function(opts) {
        finalOptions = $.extend(true, opts, parentInfo.yasguiOptions);
        return queryValue;
      })
      .then(function(queryValue) {
        if (queryValue) finalOptions.yasqe.value = queryValue;
        return finalOptions;
      });
  }
  function loadEl(el, retryCount, index) {
    if (!retryCount) retryCount = 0;
    var $this = $(el);

    return getConfigForEl($this).then(
      function(config) {
        if (!retryCount) initializeWrapper($this);
        window.$el = $this;
        var yasgui = YASGUI(
          $this,
          $.extend(
            config,
            {
              //use persistencyPrefix so there are no conflicts between
              //different yasgui instances
              persistencyPrefix: function() {
                //if we're changing one of the attributes (e.g. output, query, endpoint) we don't want the cached value
                //so take these into account for the persistencyPrefix
                return (
                  "yasgui_stories_" +
                  config.yasqe.value +
                  config.yasqe.sparql.endpoint +
                  config.yasr.output +
                  index +
                  Math.random()
                );
              },
              onQuotaExceeded: function() {
                console.log("On quota exceede!");
                //want to avoid a loop, so first check whether we're not already resetting the localstorage
                if (!YASGUI.shouldResetStorage()) {
                  var searchString = window.location.search;
                  searchString += (searchString.length > 0 ? "&" : "?") + "_resetYasgui";
                  window.location.search = searchString;
                }
              }
            },
            yasguiOptions || {}
          )
        );

        $this.extend({ yasgui: yasgui });
        window.yasgui.push($this.yasgui);
        if (!yasgui.current().yasr.results) {
          return new Promise(function(resolve, reject) {
            yasgui.current().yasqe.options.sparql.callbacks.error = reject;
            yasgui.current().yasqe.options.sparql.callbacks.success = function() {
              resolve($this.yasgui);
            };
            yasgui.current().query();
          });
        }
        return Promise.resolve($this.yasgui);
      },
      function(e) {
        if (retryCount < 3) {
          console.warn("failed request, retrying");
          return loadEl(el, retryCount + 1);
        } else {
          console.error(e);
        }
      }
    );
  }
  function cleanConfig(config, originalUrl) {
    if (config.yasqe.sparql && config.yasqe.sparql.endpoint && config.yasqe.sparql.endpoint.indexOf("http") !== 0) {
      //hmm, a relative path, do some magic to rewrite the endpoint
      var parsedOriginalUrl = urlParse(originalUrl);
      var parsedEndpointUrl = urlParse(config.yasqe.sparql.endpoint);
      parsedOriginalUrl.set("hash", parsedEndpointUrl.hash);
      parsedOriginalUrl.set("query", parsedEndpointUrl.query);
      parsedOriginalUrl.set("pathname", parsedEndpointUrl.pathname);
      config.yasqe.sparql.endpoint = parsedOriginalUrl.href;
    }

    return config;
  }

  function initializeWrapper($el, yasgui) {
    //first clear content. Need this because for a 'retry' we might be adding duplicate els
    $el.empty();
    //  $el.addClass('hideYasqe');
    $el.addClass("hideTabs").addClass("stories");
    if ($el.attr("data-showQuery") === undefined) {
      $el.addClass("hideYasqe");
    }

    $("<button>")
      .addClass("btn btn-info")
      .text(($el.hasClass("hideYasqe") ? "Show" : "Hide") + " query")
      .click(function() {
        if ($el.hasClass("hideYasqe")) {
          $(this).text("Hide query");
          $el.removeClass("hideYasqe");
          $el.yasgui.current().yasqe.refresh();
        } else {
          $(this).text("Show query");
          $el.addClass("hideYasqe");
        }
      })
      .appendTo($el);
  }

  function getFullUrl(url) {
    if (url.indexOf("/short") >= 0) {
      //append `url` to get the url we're redirecting to
      if (url.indexOf("/url") < 0) url += "/url";

      return Promise.resolve().then(function() {
        return $.get(url);
      });
    } else {
      return Promise.resolve(url);
    }
  }
};
