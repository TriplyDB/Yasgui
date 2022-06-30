import * as Autocompleter from "./";
import { sortBy } from "lodash-es";
var tokenTypes: { [id: string]: "prefixed" | "var" } = {
  "string-2": "prefixed",
  atom: "var",
};
import * as superagent from "superagent";

var conf: Autocompleter.CompleterConfig = {
  postprocessHints: function (_yasqe, hints) {
    return sortBy(hints, (hint) => hint.text.split(":")[0]);
  },
  onInitialize: function (yasqe) {
    /**
     * This event listener makes sure we auto-add prefixes whenever we use them
     */
    yasqe.on("change", () => {
      if (!yasqe.config.autocompleters || yasqe.config.autocompleters.indexOf(this.name) == -1) return; //this autocompleter is disabled
      var cur = yasqe.getDoc().getCursor();

      var token: Autocompleter.AutocompletionToken = yasqe.getTokenAt(cur);
      if (token.type && tokenTypes[token.type] == "prefixed") {
        var colonIndex = token.string.indexOf(":");
        if (colonIndex !== -1) {
          // check previous token isnt PREFIX, or a '<'(which would mean we are in a uri)
          //			var firstTokenString = yasqe.getNextNonWsToken(cur.line).string.toUpperCase();
          var lastNonWsTokenString = yasqe.getPreviousNonWsToken(cur.line, token).string.toUpperCase();
          var previousToken = yasqe.getTokenAt({
            line: cur.line,
            ch: token.start,
          }); // needs to be null (beginning of line), or whitespace

          if (
            lastNonWsTokenString !== "PREFIX" &&
            (previousToken.type == "ws" ||
              previousToken.type == null ||
              (previousToken.type === "punc" &&
                (previousToken.string === "|" ||
                  previousToken.string === "/" ||
                  previousToken.string == "^^" ||
                  previousToken.string == "{" ||
                  previousToken.string === "(")))
          ) {
            // check whether it isn't defined already (saves us from looping
            // through the array)
            var currentPrefix = token.string.substring(0, colonIndex + 1);

            var queryPrefixes = yasqe.getPrefixesFromQuery();
            if (queryPrefixes[currentPrefix.slice(0, -1)] == null) {
              // ok, so it isn't added yet!
              // var completions = yasqe.autocompleters.getTrie(completerName).autoComplete(currentPrefix);
              token.autocompletionString = currentPrefix;
              yasqe.autocompleters[this.name]?.getCompletions(token).then((suggestions) => {
                if (suggestions.length) {
                  yasqe.addPrefixes(suggestions[0]);
                  // Re-activate auto-completer after adding prefixes, so another auto-completer can kick in
                  yasqe.autocomplete();
                }
              }, console.warn);
            }
          }
        }
      }
    });
  },
  isValidCompletionPosition: function (yasqe) {
    var cur = yasqe.getDoc().getCursor(),
      token = yasqe.getTokenAt(cur);

    // not at end of line
    if (yasqe.getDoc().getLine(cur.line).length > cur.ch) return false;

    if (token.type != "ws") {
      // we want to complete token, e.g. when the prefix starts with an a
      // (treated as a token in itself..)
      // but we to avoid including the PREFIX tag. So when we have just
      // typed a space after the prefix tag, don't get the complete token
      token = yasqe.getCompleteToken();
    }

    // we shouldnt be at the uri part the prefix declaration
    // also check whether current token isnt 'a' (that makes codemirror
    // thing a namespace is a possiblecurrent
    if (token.string.indexOf("a") !== 0 && token.state.possibleCurrent.indexOf("PNAME_NS") < 0) return false;

    // First token of line needs to be PREFIX,
    // there should be no trailing text (otherwise, text is wrongly inserted
    // in between)
    var previousToken = yasqe.getPreviousNonWsToken(cur.line, token);
    if (!previousToken || previousToken.string.toUpperCase() != "PREFIX") return false;
    return true;
  },
  get: function (yasqe) {
    return superagent.get(yasqe.config.prefixCcApi).then((resp) => {
      var prefixArray: string[] = [];
      for (var prefix in resp.body) {
        var completeString = prefix + ": <" + resp.body[prefix] + ">";
        prefixArray.push(completeString); // the array we want to store in localstorage
      }
      return prefixArray.sort();
    });
  },
  preProcessToken: function (yasqe, token) {
    var previousToken = yasqe.getPreviousNonWsToken(yasqe.getDoc().getCursor().line, token);
    if (previousToken && previousToken.string && previousToken.string.slice(-1) == ":") {
      //combine both tokens! In this case we have the cursor at the end of line "PREFIX bla: <".
      //we want the token to be "bla: <", en not "<"
      token = {
        start: previousToken.start,
        end: token.end,
        string: previousToken.string + " " + token.string,
        state: token.state,
        type: token.type,
      };
    }
    return token;
  },
  bulk: true,
  autoShow: true,
  persistenceId: "prefixes",
  name: "prefixes",
};

export default conf;
