var $ = jQuery = require("jquery");
require("../node_modules/bootstrap-sass/assets/javascripts/bootstrap/affix.js");
require("../node_modules/bootstrap-sass/assets/javascripts/bootstrap/scrollspy.js");

$(document).ready(function() {
  //get the latest hosted version
  if ($("#cdnDownload").length > 0) {
    var name = "yasgui";
    //only draw when we've got some place to print this info (might not be on all pages where we include this js file)
    $.get("http://api.jsdelivr.com/v1/jsdelivr/libraries?name=" + name + "&fields=lastversion", function(data) {
      if (data.length > 0) {
        var version = data[0].lastversion;
        $("#" + name + "Css").text(
          "<link href='//cdn.jsdelivr.net/" +
            name +
            "/" +
            version +
            "/" +
            name +
            ".min.css' rel='stylesheet' type='text/css'/>"
        );
        $("#" + name + "JsBundled").text(
          "<script src='//cdn.jsdelivr.net/" + name + "/" + version + "/" + name + ".bundled.min.js'></script" + ">"
        );
        $("#" + name + "Js").text(
          "<script src='//cdn.jsdelivr.net/" + name + "/" + version + "/" + name + ".min.js'></script" + ">"
        );
      } else {
        console.log("failed accessing jsdelivr api");
        $("#cdnDownload").hide();
      }
    }).fail(function() {
      console.log("failed accessing jsdelivr api");
      $("#cdnDownloads").hide();
      $("#releases").hide();
    });
  }
  var gistContainer = $("#gistContainer");
  if (gistContainer.length > 0) {
    $.get("https://api.github.com/users/LaurensRietveld/gists", function(data) {
      var processLabel = function(origLabel) {
        var label = origLabel.replace("#YASQE", "YASQE");
        label = label.replace("#YASR", "YASR");
        label = label.replace("#YASGUI", "YASGUI");
        var splitted = label.split(" ");
        if (splitted.length > 0) {
          if (
            (splitted[0].indexOf("YASGUI") || splitted[0].indexOf("YASQE") == 0 || splitted[0].indexOf("YASR") == 0) &&
            splitted[0].slice(-1) == ":"
          ) {
            //we want to change "#YASQE: some gist" into "some gist". So, remove the first item
            return splitted.splice(1).join(" ");
          } else {
            return splitted.join(" ");
          }
        } else {
          return label;
        }
      };
      data.forEach(function(gist) {
        if (gist.description.indexOf("#YASGUI") >= 0) {
          $("#gists").show();
          $("#gistsUl").show();
          var gistDiv = $("<div>").addClass("gist").addClass("well").appendTo(gistContainer);
          $("<h4>").text(processLabel(gist.description)).appendTo(gistDiv);
          if (gist.files["README.md"]) {
            var description = $("<p>").appendTo(gistDiv);
            $.get(gist.url, function(gistFile) {
              description.text(gistFile.files["README.md"].content);
            });
          }
          var buttonContainer = $("<p>").appendTo(gistDiv);
          $("<a class='btn btn-primary btn-sm' target='_blank' href='#' role='button'>Demo</a>")
            .attr("href", "http://bl.ocks.org/LaurensRietveld/raw/" + gist.id)
            .appendTo(buttonContainer);
          $(
            "<a style='margin-left: 4px;' target='_blank' class='btn btn-default btn-sm' href='#' role='button'>Code <img class='pull-right gistIcon' src='imgs/blacktocat_black.png'></a>"
          )
            .attr("href", gist["html_url"])
            .appendTo(buttonContainer);
        }
      });
    });
  }
});
