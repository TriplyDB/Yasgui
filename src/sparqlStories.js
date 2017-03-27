var $ = require("jquery");
var linkUtils = require('./shareLink');
var Promise = require('promise-polyfill');

module.exports = function() {
  $( document ).ready(function() {
    $('div[data-yasgui]').each(function(i) {
      var $this = $(this)
      const url = $this.attr('data-yasgui');
      getFullUrl(url)
        .then(linkUtils.getOptionsFromUrl)
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
          if (!yasgui.current().yasr.results) {
            yasgui.current().query()
          }
          window.yasgui = $this.yasgui;
        })
        .then(console.log)
        .catch(console.error)
    })
});

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
