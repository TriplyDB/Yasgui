import CodeMirror from "codemirror";
export interface State {
  tokenize: (stream: CodeMirror.StringStream, state: State) => string;
  inLiteral: "SINGLE" | "DOUBLE" | undefined;
  errorStartPos: number | undefined;
  errorEndPos: number | undefined;
  queryType:
    | "SELECT"
    | "CONSTRUCT"
    | "ASK"
    | "DESCRIBE"
    | "INSERT"
    | "DELETE"
    | "LOAD"
    | "CLEAR"
    | "CREATE"
    | "DROP"
    | "COPY"
    | "MOVE"
    | "ADD"
    | undefined;
  inPrefixDecl: boolean;
  allowVars: boolean;
  allowBnodes: boolean;
  storeProperty: boolean;
  OK: boolean;
  possibleCurrent: string[];
  possibleNext: string[];
  stack: any[];
  variables: { [varName: string]: string };
  prefixes: { [prefLabel: string]: string };
  complete: boolean;
  lastProperty: string;
  lastPropertyIndex: number;
  errorMsg: string | undefined;
  lastPredicateOffset: number;
  currentPnameNs: string | undefined;
  possibleFullIri: boolean;
}
export interface Token {
  quotePos: "end" | "start" | "content" | undefined;
  cat: string;
  style: string;
  string: string;
  start: number;
}
export default function (config: CodeMirror.EditorConfiguration): CodeMirror.Mode<State> {
  const grammar = require("./_tokenizer-table.js");
  const ll1_table = grammar.table;

  const IRI_REF = '<[^<>"`|{}^\\\x00-\x20]*>';
  const PN_CHARS_BASE =
    "[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]";
  const PN_CHARS_U = PN_CHARS_BASE + "|_";

  const PN_CHARS = "(" + PN_CHARS_U + "|-|[0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040])";
  const VARNAME = "(" + PN_CHARS_U + "|[0-9])" + "(" + PN_CHARS_U + "|[0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040])*";
  const VAR1 = "\\?" + VARNAME;
  const VAR2 = "\\$" + VARNAME;

  const PN_PREFIX = "(" + PN_CHARS_BASE + ")(((" + PN_CHARS + ")|\\.)*(" + PN_CHARS + "))?";

  const HEX = "[0-9A-Fa-f]";
  const PERCENT = "(%" + HEX + HEX + ")";
  const PN_LOCAL_ESC = "(\\\\[_~\\.\\-!\\$&'\\(\\)\\*\\+,;=/\\?#@%])";
  const PLX = "(" + PERCENT + "|" + PN_LOCAL_ESC + ")";
  const PN_LOCAL =
    "(" + PN_CHARS_U + "|:|[0-9]|" + PLX + ")((" + PN_CHARS + "|\\.|:|" + PLX + ")*(" + PN_CHARS + "|:|" + PLX + "))?";
  const BLANK_NODE_LABEL = "_:(" + PN_CHARS_U + "|[0-9])((" + PN_CHARS + "|\\.)*" + PN_CHARS + ")?";
  const PNAME_NS = "(" + PN_PREFIX + ")?:";
  const PNAME_LN = PNAME_NS + PN_LOCAL;
  const LANGTAG = "@[a-zA-Z]+(-[a-zA-Z0-9]+)*";

  const EXPONENT = "[eE][\\+-]?[0-9]+";
  const INTEGER = "[0-9]+";
  const DECIMAL = "[0-9]*\\.[0-9]+";
  const DOUBLE = "(([0-9]+\\.[0-9]*" + EXPONENT + ")|(\\.[0-9]+" + EXPONENT + ")|([0-9]+" + EXPONENT + "))";

  const INTEGER_POSITIVE = "\\+" + INTEGER;
  const DECIMAL_POSITIVE = "\\+" + DECIMAL;
  const DOUBLE_POSITIVE = "\\+" + DOUBLE;
  const INTEGER_NEGATIVE = "-" + INTEGER;
  const DECIMAL_NEGATIVE = "-" + DECIMAL;
  const DOUBLE_NEGATIVE = "-" + DOUBLE;

  const ECHAR = "\\\\[tbnrf\\\\\"']";

  //IMPORTANT: this unicode rule is not in the official grammar.
  //Reason: https://github.com/YASGUI/YASQE/issues/49
  //unicode escape sequences (which the sparql spec considers part of the pre-processing of sparql queries)
  //are marked as invalid. We have little choice (other than adding a layer of complixity) than to modify the grammar accordingly
  //however, for now only allow these escape sequences in literals (where actually, this should be allows in e.g. prefixes as well)
  const hex4 = HEX + "{4}";
  const unicode = "(\\\\u" + hex4 + "|\\\\U00(10|0" + HEX + ")" + hex4 + ")";
  const STRING_LITERAL1 = "'(([^\\x27\\x5C\\x0A\\x0D])|" + ECHAR + "|" + unicode + ")*'";
  const STRING_LITERAL2 = '"(([^\\x22\\x5C\\x0A\\x0D])|' + ECHAR + "|" + unicode + ')*"';

  const STRING_LITERAL_LONG: {
    [key: string]: {
      CAT: string;
      QUOTES: string;
      CONTENTS: string;
      COMPLETE?: string;
    };
  } = {
    SINGLE: {
      CAT: "STRING_LITERAL_LONG1",
      QUOTES: "'''",
      CONTENTS: "(('|'')?([^'\\\\]|" + ECHAR + "|" + unicode + "))*",
    },
    DOUBLE: {
      CAT: "STRING_LITERAL_LONG2",
      QUOTES: '"""',
      CONTENTS: '(("|"")?([^"\\\\]|' + ECHAR + "|" + unicode + "))*",
    },
  };
  for (const key in STRING_LITERAL_LONG) {
    STRING_LITERAL_LONG[key].COMPLETE =
      STRING_LITERAL_LONG[key].QUOTES + STRING_LITERAL_LONG[key].CONTENTS + STRING_LITERAL_LONG[key].QUOTES;
  }
  //some regular expressions not used in regular terminals, because this is used accross lines
  interface LiteralRegex {
    name: string;
    regex: RegExp;
    style: string;
  }
  var stringLiteralLongRegex: {
    [k: string]: {
      complete: LiteralRegex;
      contents: LiteralRegex;
      closing: LiteralRegex;
      quotes: LiteralRegex;
    };
  } = {};
  for (const key in STRING_LITERAL_LONG) {
    stringLiteralLongRegex[key] = {
      complete: {
        name: "STRING_LITERAL_LONG_" + key,
        regex: new RegExp("^" + STRING_LITERAL_LONG[key].COMPLETE),
        style: "string",
      },
      contents: {
        name: "STRING_LITERAL_LONG_" + key,
        regex: new RegExp("^" + STRING_LITERAL_LONG[key].CONTENTS),
        style: "string",
      },
      closing: {
        name: "STRING_LITERAL_LONG_" + key,
        regex: new RegExp("^" + STRING_LITERAL_LONG[key].CONTENTS + STRING_LITERAL_LONG[key].QUOTES),
        style: "string",
      },
      quotes: {
        name: "STRING_LITERAL_LONG_QUOTES_" + key,
        regex: new RegExp("^" + STRING_LITERAL_LONG[key].QUOTES),
        style: "string",
      },
    };
  }

  const WS = "[\\x20\\x09\\x0D\\x0A]";
  // Careful! Code mirror feeds one line at a time with no \n
  // ... but otherwise comment is terminated by \n
  const COMMENT = "#([^\\n\\r]*[\\n\\r]|[^\\n\\r]*$)";
  const WS_OR_COMMENT_STAR = "(" + WS + "|(" + COMMENT + "))*";
  const NIL = "\\(" + WS_OR_COMMENT_STAR + "\\)";
  const ANON = "\\[" + WS_OR_COMMENT_STAR + "\\]";
  const terminals = [
    {
      name: "WS",
      regex: new RegExp("^" + WS + "+"),
      style: "ws",
    },

    {
      name: "COMMENT",
      regex: new RegExp("^" + COMMENT),
      style: "comment",
    },

    {
      name: "IRI_REF",
      regex: new RegExp("^" + IRI_REF),
      style: "variable-3",
    },

    {
      name: "VAR1",
      regex: new RegExp("^" + VAR1),
      style: "atom",
    },

    {
      name: "VAR2",
      regex: new RegExp("^" + VAR2),
      style: "atom",
    },

    {
      name: "LANGTAG",
      regex: new RegExp("^" + LANGTAG),
      style: "meta",
    },

    {
      name: "DOUBLE",
      regex: new RegExp("^" + DOUBLE),
      style: "number",
    },

    {
      name: "DECIMAL",
      regex: new RegExp("^" + DECIMAL),
      style: "number",
    },

    {
      name: "INTEGER",
      regex: new RegExp("^" + INTEGER),
      style: "number",
    },

    {
      name: "DOUBLE_POSITIVE",
      regex: new RegExp("^" + DOUBLE_POSITIVE),
      style: "number",
    },

    {
      name: "DECIMAL_POSITIVE",
      regex: new RegExp("^" + DECIMAL_POSITIVE),
      style: "number",
    },

    {
      name: "INTEGER_POSITIVE",
      regex: new RegExp("^" + INTEGER_POSITIVE),
      style: "number",
    },

    {
      name: "DOUBLE_NEGATIVE",
      regex: new RegExp("^" + DOUBLE_NEGATIVE),
      style: "number",
    },

    {
      name: "DECIMAL_NEGATIVE",
      regex: new RegExp("^" + DECIMAL_NEGATIVE),
      style: "number",
    },

    {
      name: "INTEGER_NEGATIVE",
      regex: new RegExp("^" + INTEGER_NEGATIVE),
      style: "number",
    },
    //		stringLiteralLongRegex.SINGLE.complete,
    //		stringLiteralLongRegex.DOUBLE.complete,
    //		stringLiteralLongRegex.SINGLE.quotes,
    //		stringLiteralLongRegex.DOUBLE.quotes,

    {
      name: "STRING_LITERAL1",
      regex: new RegExp("^" + STRING_LITERAL1),
      style: "string",
    },

    {
      name: "STRING_LITERAL2",
      regex: new RegExp("^" + STRING_LITERAL2),
      style: "string",
    },

    // Enclosed comments won't be highlighted
    {
      name: "NIL",
      regex: new RegExp("^" + NIL),
      style: "punc",
    },

    // Enclosed comments won't be highlighted
    {
      name: "ANON",
      regex: new RegExp("^" + ANON),
      style: "punc",
    },

    {
      name: "PNAME_LN",
      regex: new RegExp("^" + PNAME_LN),
      style: "string-2",
    },

    {
      name: "PNAME_NS",
      regex: new RegExp("^" + PNAME_NS),
      style: "string-2",
    },

    {
      name: "BLANK_NODE_LABEL",
      regex: new RegExp("^" + BLANK_NODE_LABEL),
      style: "string-2",
    },
  ];

  function getPossibles(symbol: string) {
    var possibles = [],
      possiblesOb = ll1_table[symbol];
    if (possiblesOb != undefined) {
      for (const property in possiblesOb) {
        possibles.push(property.toString());
      }
    } else {
      possibles.push(symbol);
    }
    return possibles;
  }

  function tokenBase(stream: CodeMirror.StringStream, state: State) {
    function nextToken(): Token {
      let consumed: string[];
      if (state.inLiteral) {
        var closingQuotes = false;
        //multi-line literal. try to parse contents.
        consumed = stream.match(stringLiteralLongRegex[state.inLiteral].contents.regex as any, true, false) as any;
        if (consumed && consumed[0].length == 0) {
          //try seeing whether we can consume closing quotes, to avoid stopping
          consumed = stream.match(stringLiteralLongRegex[state.inLiteral].closing.regex as any, true, false) as any;
          closingQuotes = true;
        }

        if (consumed && consumed[0].length > 0) {
          //some string content here.
          const returnObj: Token = {
            quotePos: closingQuotes ? "end" : "content",
            cat: STRING_LITERAL_LONG[state.inLiteral].CAT,
            style: stringLiteralLongRegex[state.inLiteral].complete.style,
            string: consumed[0],
            start: stream.start,
          };
          if (closingQuotes) state.inLiteral = undefined;
          return returnObj;
        }
      }

      //Multiline literals
      for (const quoteType in stringLiteralLongRegex) {
        consumed = stream.match(stringLiteralLongRegex[quoteType].quotes.regex as any, true, false) as any;
        if (consumed) {
          var quotePos: Token["quotePos"];
          if (state.inLiteral) {
            //end of literal. everything is fine
            state.inLiteral = undefined;
            quotePos = "end";
          } else {
            state.inLiteral = <any>quoteType;
            quotePos = "start";
          }
          return {
            cat: STRING_LITERAL_LONG[quoteType].CAT,
            style: stringLiteralLongRegex[quoteType].quotes.style,
            string: consumed[0],
            quotePos: quotePos,
            start: stream.start,
          };
        }
      }

      // Tokens defined by individual regular expressions
      for (var i = 0; i < terminals.length; ++i) {
        consumed = stream.match(terminals[i].regex as any, true, false) as any;
        if (consumed) {
          return {
            cat: terminals[i].name,
            style: terminals[i].style,
            string: consumed[0],
            start: stream.start,
            quotePos: undefined,
          };
        }
      }

      // Keywords
      consumed = stream.match(grammar.keywords, true, false) as any;
      if (consumed)
        return {
          cat: stream.current().toUpperCase(),
          style: "keyword",
          string: consumed[0],
          start: stream.start,
          quotePos: undefined,
        };

      // Punctuation
      consumed = stream.match(grammar.punct, true, false) as any;
      if (consumed)
        return {
          cat: stream.current(),
          style: "punc",
          string: consumed[0],
          start: stream.start,
          quotePos: undefined,
        };

      // Token is invalid
      // better consume something anyway, or else we're stuck
      consumed = stream.match(/^.[A-Za-z0-9]*/ as any, true, false) as any;
      return {
        cat: "<invalid_token>",
        style: "error",
        string: consumed[0],
        start: stream.start,
        quotePos: undefined,
      };
    }

    function recordFailurePos() {
      // tokenOb.style= "sp-invalid";
      const col = stream.column();
      state.errorStartPos = col;
      state.errorEndPos = col + tokenOb.string.length;
    }
    function setQueryType(s: string) {
      if (state.queryType == null) {
        switch (s) {
          case "SELECT":
          case "CONSTRUCT":
          case "ASK":
          case "DESCRIBE":
          case "INSERT":
          case "DELETE":
          case "LOAD":
          case "CLEAR":
          case "CREATE":
          case "DROP":
          case "COPY":
          case "MOVE":
          case "ADD":
            state.queryType = s;
        }
      }
    }

    // Some fake non-terminals are just there to have side-effect on state
    // - i.e. allow or disallow variables and bnodes in certain non-nesting
    // contexts
    function setSideConditions(topSymbol: string) {
      if (topSymbol === "prefixDecl") {
        state.inPrefixDecl = true;
      } else {
        state.inPrefixDecl = false;
      }
      switch (topSymbol) {
        case "disallowVars":
          state.allowVars = false;
          break;
        case "allowVars":
          state.allowVars = true;
          break;
        case "disallowBnodes":
          state.allowBnodes = false;
          break;
        case "allowBnodes":
          state.allowBnodes = true;
          break;
        case "storeProperty":
          state.storeProperty = true;
          break;
      }
    }

    function checkSideConditions(topSymbol: string) {
      return (
        (state.allowVars || topSymbol != "var") &&
        (state.allowBnodes ||
          (topSymbol != "blankNode" &&
            topSymbol != "blankNodePropertyList" &&
            topSymbol != "blankNodePropertyListPath"))
      );
    }

    // CodeMirror works with one line at a time,
    // but newline should behave like whitespace
    // - i.e. a definite break between tokens (for autocompleter)
    if (stream.pos == 0) state.possibleCurrent = state.possibleNext;

    const tokenOb = nextToken();

    if (tokenOb.cat == "<invalid_token>") {
      // set error state, and
      if (state.OK == true) {
        state.OK = false;
        recordFailurePos();
      }
      state.complete = false;
      // alert("Invalid:"+tokenOb.text);
      return tokenOb.style;
    }
    if (tokenOb.cat === "WS" || tokenOb.cat === "COMMENT" || (tokenOb.quotePos && tokenOb.quotePos != "end")) {
      state.possibleCurrent = state.possibleNext;
      state.possibleFullIri = false;
      return tokenOb.style;
    }
    // Otherwise, run the parser until the token is digested
    // or failure
    var finished = false;
    var topSymbol;
    const tokenCat = tokenOb.cat;
    if (state.possibleFullIri && tokenOb.string === ">") {
      state.possibleFullIri = false;
    }
    if (!state.possibleFullIri && tokenOb.string === "<") {
      state.possibleFullIri = true;
    }
    if (!tokenOb.quotePos || tokenOb.quotePos == "end") {
      // Incremental LL1 parse
      while (state.stack.length > 0 && tokenCat && state.OK && !finished) {
        topSymbol = state.stack.pop();
        if (topSymbol === "var" && tokenOb.string) state.variables[tokenOb.string] = tokenOb.string;
        if (!ll1_table[topSymbol]) {
          // Top symbol is a terminal
          if (topSymbol == tokenCat) {
            if (state.inPrefixDecl) {
              if (topSymbol === "PNAME_NS" && tokenOb.string.length > 0) {
                state.currentPnameNs = tokenOb.string.slice(0, -1);
              } else if (typeof state.currentPnameNs === "string" && tokenOb.string.length > 1) {
                state.prefixes[state.currentPnameNs] = tokenOb.string.slice(1, -1);
                //reset current pname ns
                state.currentPnameNs = undefined;
              }
            }
            // Matching terminals
            // - consume token from input stream
            finished = true;
            setQueryType(topSymbol);
            // Check whether $ (end of input token) is poss next
            // for everything on stack
            var allNillable = true;
            for (var sp = state.stack.length; sp > 0; --sp) {
              const item = ll1_table[state.stack[sp - 1]];
              if (!item || !item["$"]) allNillable = false;
            }

            state.complete = allNillable;
            if (state.storeProperty && tokenCat != "punc") {
              state.lastProperty = tokenOb.string;
              state.lastPropertyIndex = tokenOb.start;
              state.storeProperty = false;
            } else if (tokenCat === "." || tokenCat === ";") {
              // the last property wont be relevant for what follows, so we reset it
              state.lastProperty = "";
              state.lastPropertyIndex = 0;
            }

            //check whether a used prefix is actually defined
            if (!state.inPrefixDecl && (tokenCat === "PNAME_NS" || tokenCat === "PNAME_LN")) {
              const colonIndex = tokenOb.string.indexOf(":");
              if (colonIndex >= 0) {
                const prefNs = tokenOb.string.slice(0, colonIndex);
                if (state.prefixes[prefNs] === undefined) {
                  state.OK = false;
                  recordFailurePos();
                  state.errorMsg = "Prefix '" + prefNs + "' is not defined";
                }
              }
            }
          } else {
            state.OK = false;
            state.complete = false;
            recordFailurePos();
          }
        } else {
          // topSymbol is nonterminal
          // - see if there is an entry for topSymbol
          // and nextToken in table
          const nextSymbols = ll1_table[topSymbol][tokenCat];
          if (nextSymbols != undefined && checkSideConditions(topSymbol)) {
            // Match - copy RHS of rule to stack
            for (var i = nextSymbols.length - 1; i >= 0; --i) {
              state.stack.push(nextSymbols[i]);
            }
            // Peform any non-grammatical side-effects
            setSideConditions(topSymbol);
          } else {
            // No match in table - fail
            state.OK = false;
            state.complete = false;
            recordFailurePos();
            state.stack.push(topSymbol); // Shove topSymbol back on stack
          }
        }
      }
    }
    if (!finished && state.OK) {
      state.OK = false;
      state.complete = false;
      recordFailurePos();
    }
    if (state.possibleNext.indexOf("a") >= 0) {
      //only store last pred offset when this prop isnt part of a property path
      //see #https://github.com/TriplyDB/YASGUI.YASQE/issues/105
      const line = stream.string;
      for (let i = tokenOb.start; i >= 0; i--) {
        if (line[i - 1] === " ") {
          //continue search
          continue;
        }
        if (line[i - 1] === "|" || line[i - 1] === "/") {
          //part of property path, not setting this val
        } else if (tokenOb.style === "punc") {
          //we've moved past the property path, and reached punctuation. This can happens when the object is a literal
          //So, simply not set this val (i.e. use value that was defined before this token)
        } else {
          state.lastPredicateOffset = tokenOb.start;
        }
        break;
      }
    }

    state.possibleCurrent = state.possibleNext;

    state.possibleNext = getPossibles(state.stack[state.stack.length - 1]);

    return tokenOb.style;
  }

  const indentTop: { [symbol: string]: number } = {
    "*[,, object]": 3,
    "*[(,),object]": 3,
    "*[(,),objectPath]": 3,
    "*[/,pathEltOrInverse]": 2,
    object: 2,
    objectPath: 2,
    objectList: 2,
    objectListPath: 2,
    storeProperty: 2,
    pathMod: 2,
    "?pathMod": 2,
    propertyListNotEmpty: 1,
    propertyList: 1,
    propertyListPath: 1,
    propertyListPathNotEmpty: 1,
    "?[verb,objectList]": 1,
    //		"?[or([verbPath, verbSimple]),objectList]": 1,
  };

  const indentTable: { [char: string]: number } = {
    "}": 1,
    "]": 1,
    ")": 1,
    "{": -1,
    "(": -1,
    "[": -1,
    //		"*[;,?[or([verbPath,verbSimple]),objectList]]": 1,
  };

  function indent(state: State, textAfter: string) {
    //just avoid we don't indent multi-line  literals
    if (state.inLiteral) return 0;
    if (
      state.lastPredicateOffset !== undefined &&
      state.stack.length &&
      state.stack[state.stack.length - 1] == "?[or([verbPath,verbSimple]),objectListPath]"
    ) {
      //we are after a semi-colon. I.e., nicely align this line with predicate position of previous line
      return state.lastPredicateOffset;
    } else {
      var n = 0; // indent level
      var i = state.stack.length - 1;
      if (/^[\}\]\)]/.test(textAfter)) {
        // Skip stack items until after matching bracket
        const closeBracket = textAfter.substr(0, 1);
        for (; i >= 0; --i) {
          if (state.stack[i] == closeBracket) {
            --i;
            break;
          }
        }
      } else {
        // Consider nullable non-terminals if at top of stack
        let dn = indentTop[state.stack[i]];
        if (dn) {
          n += dn;
          --i;
        }
      }
      for (; i >= 0; --i) {
        let dn = indentTable[state.stack[i]];
        if (dn) {
          n += dn;
        }
      }
      return n * (config.indentUnit ?? 2);
    }
  }

  return {
    token: tokenBase,
    startState: function (): State {
      return {
        tokenize: tokenBase,
        OK: true,
        complete: grammar.acceptEmpty,
        errorStartPos: undefined,
        errorEndPos: undefined,
        queryType: undefined,
        possibleCurrent: getPossibles(grammar.startSymbol),
        possibleNext: getPossibles(grammar.startSymbol),
        allowVars: true,
        allowBnodes: true,
        storeProperty: false,
        lastProperty: "",
        lastPropertyIndex: 0,
        inLiteral: undefined,
        stack: [grammar.startSymbol],
        lastPredicateOffset: config.indentUnit || 2,
        prefixes: {},
        variables: {},
        currentPnameNs: undefined,
        errorMsg: undefined,
        inPrefixDecl: false,
        possibleFullIri: false,
      };
    },
    indent: indent,
    electricChars: "}])",
  };
}
