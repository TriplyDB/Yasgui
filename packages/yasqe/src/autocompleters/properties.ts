import * as Autocompleter from "./";

var conf: Autocompleter.CompleterConfig = {
  onInitialize: function (_yasqe) {
    // validPosition: yasqe.autocompleters.notifications.show,
    // invalidPosition: yasqe.autocompleters.notifications.hide
  },
  get: function (yasqe, token) {
    return Autocompleter.fetchFromLov(yasqe, "property", token);
  },
  isValidCompletionPosition: function (yasqe) {
    const token = yasqe.getCompleteToken();
    if (token.string.length == 0) return false; //we want -something- to autocomplete
    if (token.string[0] === "?" || token.string[0] === "$") return false; // we are typing a var
    if (token.state.possibleCurrent.indexOf("a") >= 0) return true; // predicate pos
    return false;
  },
  preProcessToken: function (yasqe, token) {
    return Autocompleter.preprocessIriForCompletion(yasqe, token);
  },
  postProcessSuggestion: function (yasqe, token, suggestedString) {
    return Autocompleter.postprocessIriCompletion(yasqe, token, suggestedString);
  },
  bulk: false,
  name: "property",
};

export default conf;
