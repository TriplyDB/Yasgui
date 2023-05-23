"use strict";
var $ = require("jquery");

$.fn.tableToCsv = function (config) {
  var csvString = "";
  config = $.extend(
    {
      quote: '"',
      delimiter: ",",
      lineBreak: "\n",
    },
    config
  );

  var needToQuoteString = function (value) {
    //quote when it contains whitespace or the delimiter
    var needQuoting = false;
    if (value.match("[\\w|" + config.delimiter + "|" + config.quote + "]")) {
      needQuoting = true;
    }
    return needQuoting;
  };
  var addValueToString = function (value) {
    //Quotes in the string need to be escaped
    value.replace(config.quote, config.quote + config.quote);
    if (needToQuoteString(value)) {
      value = config.quote + value + config.quote;
    }
    csvString += " " + value + " " + config.delimiter;
  };

  var addRowToString = function (rowArray) {
    rowArray.forEach(function (val) {
      addValueToString(val);
    });
    csvString += config.lineBreak;
  };

  var tableArrays = [];
  var $el = $(this);
  var rowspans = {};

  var totalColCount = 0;
  $el.find("tr:first *").each(function () {
    if ($(this).attr("colspan")) {
      totalColCount += +$(this).attr("colspan");
    } else {
      totalColCount++;
    }
  });

  $el.find("tr").each(function (rowId, tr) {
    var $tr = $(tr);
    var rowArray = [];

    var htmlColId = 0;
    var actualColId = 0;
    while (actualColId < totalColCount) {
      if (rowspans[actualColId]) {
        rowArray.push(rowspans[actualColId].text);
        rowspans[actualColId].rowSpan--;
        if (!rowspans[actualColId].rowSpan) rowspans[actualColId] = null;
        actualColId++;
        continue;
      }

      var $cell = $tr.find(":nth-child(" + (htmlColId + 1) + ")");
      if (!$cell) break;
      var colspan = $cell.attr("colspan") || 1;
      var rowspan = $cell.attr("rowspan") || 1;

      for (var i = 0; i < colspan; i++) {
        rowArray.push($cell.text());
        if (rowspan > 1) {
          rowspans[actualColId] = {
            rowSpan: rowspan - 1,
            text: $cell.text(),
          };
        }
        actualColId++;
      }
      htmlColId++;
    }
    addRowToString(rowArray);
  });

  return csvString;
};
