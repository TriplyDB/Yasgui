"use strict";
var $ = require("jquery");

$.fn.onOutsideClick = function(onOutsideClick, config) {
  config = $.extend(
    {
      skipFirst: false,
      allowedElements: $()
    },
    config
  );
  var el = $(this);

  var handler = function(e) {
    var clickOutsideIssued = function(elCheck) {
      return !elCheck.is(e.target) && // if the target of the click isn't the container...
        elCheck.has(e.target).length === 0; // ... nor a descendant of the container
    };

    if (clickOutsideIssued(el) && clickOutsideIssued(config.allowedElements)) {
      if (config.skipFirst) {
        config.skipFirst = false;
      } else {
        onOutsideClick();
        $(document).off("mousedown", handler);
      }
    }
  };
  $(document).mousedown(handler);

  return this;
};
