import { default as Yasqe, Token } from "./";
export type Prefixes = { [prefixLabel: string]: string };
export function addPrefixes(yasqe: Yasqe, prefixes: string | Prefixes) {
  var existingPrefixes = yasqe.getPrefixesFromQuery();
  //for backwards compatability, we stil support prefixes value as string (e.g. 'rdf: <http://fbfgfgf>'
  if (typeof prefixes == "string") {
    addPrefixAsString(yasqe, prefixes);
  } else {
    for (var pref in prefixes) {
      if (!(pref in existingPrefixes)) addPrefixAsString(yasqe, pref + ": <" + prefixes[pref] + ">");
    }
  }
  yasqe.collapsePrefixes(false);
}

export function addPrefixAsString(yasqe: Yasqe, prefixString: string) {
  yasqe.getDoc().replaceRange("PREFIX " + prefixString + "\n", {
    line: 0,
    ch: 0,
  });

  yasqe.collapsePrefixes(false);
}
export function removePrefixes(yasqe: Yasqe, prefixes: Prefixes) {
  var escapeRegex = function (string: string) {
    //taken from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  };
  for (var pref in prefixes) {
    yasqe.setValue(
      yasqe
        .getValue()
        .replace(new RegExp("PREFIX\\s*" + pref + ":\\s*" + escapeRegex("<" + prefixes[pref] + ">") + "\\s*", "ig"), "")
    );
  }
  yasqe.collapsePrefixes(false);
}

/**
 * Get defined prefixes from query as array, in format {"prefix:" "uri"}
 *
 * @param cm
 * @returns {Array}
 */
export function getPrefixesFromQuery(yasqe: Yasqe): Token["state"]["prefixes"] {
  //Use precise here. We want to be sure we use the most up to date state. If we're
  //not, we might get outdated prefixes from the current query (creating loops such
  //as https://github.com/TriplyDB/YASGUI/issues/84)
  return yasqe.getTokenAt(
    { line: yasqe.getDoc().lastLine(), ch: yasqe.getDoc().getLine(yasqe.getDoc().lastLine()).length },
    true
  ).state.prefixes;
}

export function getIndentFromLine(yasqe: Yasqe, line: number, charNumber: number = 1): string {
  var token = yasqe.getTokenAt({
    line: line,
    ch: charNumber,
  });
  if (token == null || token == undefined || token.type != "ws") {
    return "";
  } else {
    return token.string + getIndentFromLine(yasqe, line, token.end + 1);
  }
}
