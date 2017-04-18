var $ = require("jquery");
var linkUtils = require('./shareLink');
var Promise = require('promise-polyfill');
var urlParse = require('url-parse');
module.exports = function() {
  $( document ).ready(function() {
    window.yasgui = []
    var yasguiDivs = $('div[data-yasgui]');
    var count = 0;
    function loadDivs() {

      if (count >= yasguiDivs.length) {
        //loaded everything, so we're done
      } else {
        loadDiv(yasguiDivs[count]).then(function() {
          count++;
          loadDivs();
        });
      }

    }
    loadDivs();
});

}
function loadDiv(el) {
  var $this = $(el)
  const url = $this.attr('data-yasgui');
  return getFullUrl(url)
    .then(linkUtils.getOptionsFromUrl)
    .then(function(options) {
      return cleanConfig(options,url)
    })
    .then(function(config) {
      initializeWrapper($this)
      window.$el = $this;
      var yasgui = YASGUI($this, $.extend(config, {
        //use persistencyPrefix so there are no conflicts between
        //different yasgui instances
          persistencyPrefix: function() {
            return 'yasgui_stories_' + url
          }
        })
      )
      $this.extend({yasgui:yasgui})
      window.yasgui.push($this.yasgui);
      if (!yasgui.current().yasr.results) {
        return new Promise(function(resolve,reject) {
          yasgui.current().yasqe.options.sparql.callbacks.error = reject
          yasgui.current().yasqe.options.sparql.callbacks.success = function() {
            resolve($this.yasgui);
          }
          yasgui.current().query()
        })
      }
      return Promise.resolve($this.yasgui);
    })
    .catch(console.error)
}
function cleanConfig(config, originalUrl) {
  if (config.yasqe.sparql && config.yasqe.sparql.endpoint && config.yasqe.sparql.endpoint.indexOf('http') !== 0) {
    //hmm, a relative path, do some magic to rewrite the endpoint
    var parsedOriginalUrl = urlParse(originalUrl);
    var parsedEndpointUrl = urlParse(config.yasqe.sparql.endpoint);
    parsedOriginalUrl.set('hash', parsedEndpointUrl.hash)
    parsedOriginalUrl.set('query', parsedEndpointUrl.query)
    parsedOriginalUrl.set('pathname', parsedEndpointUrl.pathname)
    config.yasqe.sparql.endpoint = parsedOriginalUrl.href;
  }

  return config;
}

function initializeWrapper($el, yasgui) {
  //  $el.addClass('hideYasqe');
   $el.addClass('hideTabs').addClass('stories');
   if ($el.attr('data-showQuery') === undefined) {
     $el.addClass('hideYasqe')
   }

   $('<button>')
    .addClass('btn btn-info')
    .text(($el.hasClass('hideYasqe') ? 'Show': 'Hide') + ' query')
    .click(function() {
      if ($el.hasClass('hideYasqe')) {
        $(this).text('Hide query')
        $el.removeClass('hideYasqe')
        $el.yasgui.current().yasqe.refresh()
      } else {
        $(this).text('Show query')
        $el.addClass('hideYasqe')
      }
    })
    .appendTo($el)
}
function getConfigFromUrl(url) {
  return linkUtils.getOptionsFromUrl(url);
}

function getFullUrl(url) {
  if (url.indexOf('/short') >= 0) {
    //append `url` to get the url we're redirecting to
    if (url.indexOf('/url') < 0) url += '/url';

    return Promise.resolve()
      .then(function() {
        return $.get(url);
      })


  } else {
    return Promise.resolve(url)
  }
}
