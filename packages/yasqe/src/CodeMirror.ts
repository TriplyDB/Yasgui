//Do not want to import this using typescript. Somehow, we get a tangled mess when transpiling to es6 with ts,
//and applying babel.
import {
  Editor as CmEditor,
  Doc as CmDoc,
  Token as CmToken,
  Position as CmPosition,
  EditorConfiguration as CmEditorConfiguration,
} from "codemirror";

const _CodeMirror = require("codemirror");

import * as sparql11Mode from "../grammar/tokenizer";
import { default as prefixFold } from "./prefixFold";
import { TokenizerState } from "./index";

require("codemirror/addon/fold/foldcode.js");
require("codemirror/addon/fold/foldgutter.js");
require("codemirror/addon/fold/xml-fold.js");
require("codemirror/addon/fold/brace-fold.js");
require("codemirror/addon/hint/show-hint.js");
require("codemirror/addon/search/searchcursor.js");
require("codemirror/addon/search/match-highlighter.js");
require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/addon/runmode/runmode.js");
require("codemirror/lib/codemirror.css");
require("codemirror/addon/fold/foldgutter.css");
require("./scss/codemirrorMods.scss");

_CodeMirror.registerHelper("fold", "prefix", prefixFold);
_CodeMirror.defineMode("sparql11", sparql11Mode.default);

namespace CodeMirror {
  export type Doc = CmDoc;
  export type Position = CmPosition;
  export type EditorConfiguration = CmEditorConfiguration;
  export interface Token extends CmToken {
    state: sparql11Mode.State;
  }
}
interface CodeMirror extends Omit<CmEditor, "getOption" | "setOption" | "on" | "off"> {
  /**
   * Added some more specific typings for `getOption`
   * For some functions (called from keyboard combinations like ctrl-enter) we cannot use member props of our object
   * as these are lost when we are receiving the native CM object as argument
   * Only way to persistently store these options is by using getOption and setOption
   */
  getOption(opt: "queryType"): TokenizerState["queryType"];
  setOption(opt: "queryType", val: TokenizerState["queryType"]): void;

  foldCode(firstPrefixLine: number, prefix: string, collapse: "fold" | "unfold"): void;
}
const CodeMirror: { new (): CodeMirror; signal: (target: any, name: string, ...args: any[]) => void } = _CodeMirror;
export default CodeMirror;
