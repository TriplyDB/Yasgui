import { default as Yasqe, Token, Hint, Position, Config, HintFn, HintConfig } from "../";
import Trie from "../trie";
import { EventEmitter } from "events";
import * as superagent from "superagent";
import { take } from "lodash-es";
const CodeMirror = require("codemirror");
require("./show-hint.scss");
export class CompleterConfig {
  onInitialize?: (this: CompleterConfig, yasqe: Yasqe) => void; //allows for e.g. registering event listeners in yasqe, like the prefix autocompleter does
  isValidCompletionPosition: (yasqe: Yasqe) => boolean;
  get: (yasqe: Yasqe, token?: AutocompletionToken) => Promise<string[]> | string[];
  preProcessToken?: (yasqe: Yasqe, token: Token) => AutocompletionToken;
  postProcessSuggestion?: (yasqe: Yasqe, token: AutocompletionToken, suggestedString: string) => string;
  postprocessHints?: (yasqe: Yasqe, hints: Hint[]) => Hint[];
  async: boolean;
  bulk: boolean;
  autoShow?: boolean;
  persistenceId?: Config["persistenceId"];
  name: string;
}
const SUGGESTIONS_LIMIT = 100;
export interface AutocompletionToken extends Token {
  autocompletionString?: string;
  tokenPrefix?: string;
  tokenPrefixUri?: string;
  from?: Partial<Position>;
}
export class Completer extends EventEmitter {
  protected yasqe: Yasqe;
  private trie: Trie;
  private config: CompleterConfig;
  constructor(yasqe: Yasqe, config: CompleterConfig) {
    super();
    this.yasqe = yasqe;
    this.config = config;
  }

  // private selectHint(data:EditorChange, completion:any) {
  //   if (completion.text != this.yasqe.getTokenAt(this.yasqe.getDoc().getCursor()).string) {
  //     this.yasqe.getDoc().replaceRange(completion.text, data.from, data.to);
  //   }
  // };
  private getStorageId() {
    return this.yasqe.getStorageId(this.config.persistenceId);
  }

  /**
   * Store bulk completion in local storage, and populates the trie
   */
  private storeBulkCompletions(completions: string[]) {
    if (!completions || !(completions instanceof Array)) return;
    // store array as trie
    this.trie = new Trie();
    completions.forEach(c => this.trie.insert(c));

    // store in localstorage as well
    var storageId = this.getStorageId();
    if (storageId)
      this.yasqe.storage.set(storageId, completions, 60 * 60 * 24 * 30, this.yasqe.handleLocalStorageQuotaFull);
  }

  /**
   * Get completion list from `get` function
   */
  public getCompletions(token?: AutocompletionToken): Promise<string[]> {
    if (!this.config.get) return Promise.resolve([]);

    //No token, so probably getting as bulk
    if (!token) {
      if (this.config.get instanceof Array) return Promise.resolve(this.config.get);
      //wrapping call in a promise.resolve, so this when a `get` is both async or sync
      return Promise.resolve(this.config.get(this.yasqe)).then(suggestions => {
        if (suggestions instanceof Array) return suggestions;
        return [];
      });
    }

    //ok, there is a token
    const stringToAutocomplete = token.autocompletionString || token.string;
    if (this.trie) return Promise.resolve(take(this.trie.autoComplete(stringToAutocomplete), SUGGESTIONS_LIMIT));
    if (this.config.get instanceof Array)
      return Promise.resolve(
        this.config.get.filter(possibleMatch => possibleMatch.indexOf(stringToAutocomplete) === 0)
      );
    //assuming it's a function
    return Promise.resolve(this.config.get(this.yasqe, token)).then(r => {
      if (r instanceof Array) return r;
      return [];
    });
  }

  /**
   * Populates completions. Pre-fetches those if bulk is set to true
   */
  public initialize(): Promise<void> {
    if (this.config.onInitialize) this.config.onInitialize(this.yasqe);
    if (this.config.bulk) {
      if (this.config.get instanceof Array) {
        // we don't care whether the completions are already stored in
        // localstorage. just use this one
        this.storeBulkCompletions(this.config.get);
        return Promise.resolve();
      } else {
        // if completions are defined in localstorage, use those! (calling the
        // function may come with overhead (e.g. async calls))
        var completionsFromStorage: string[];
        var storageId = this.getStorageId();
        if (storageId) completionsFromStorage = this.yasqe.storage.get<string[]>(storageId);
        if (completionsFromStorage && completionsFromStorage.length > 0) {
          this.storeBulkCompletions(completionsFromStorage);
          return Promise.resolve();
        } else {
          return this.getCompletions().then(c => this.storeBulkCompletions(c));
        }
      }
    }
    return Promise.resolve();
  }

  private isValidPosition(): boolean {
    if (!this.config.isValidCompletionPosition) return false; //no way to check whether we are in a valid position
    if (!this.config.isValidCompletionPosition(this.yasqe)) {
      this.emit("invalidPosition", this);
      this.yasqe.hideNotification(this.config.name);
      return false;
    }
    if (!this.config.autoShow) {
      this.yasqe.showNotification(this.config.name, "Press CTRL - <spacebar> to autocomplete");
    }
    this.emit("validPosition", this);
    return true;
  }

  private getHint(autocompletionToken: AutocompletionToken, suggestedString: string): Hint {
    if (this.config.postProcessSuggestion) {
      suggestedString = this.config.postProcessSuggestion(this.yasqe, autocompletionToken, suggestedString);
    }
    var from: Position;
    var to: Position;
    if (autocompletionToken.from) {
      const cur = this.yasqe.getDoc().getCursor();
      from = { ...cur, ...autocompletionToken.from };
    }
    // Need to set a 'to' part as well, as otherwise we'd be appending the result to the already typed filter
    if (autocompletionToken.string.length > 0) {
      const line = this.yasqe.getDoc().getCursor().line;
      to = { ch: this.yasqe.getCompleteToken().end, line: line };
    } else {
      to = <any>autocompletionToken.from;
    }
    return {
      text: suggestedString,
      displayText: suggestedString,
      from: from,
      to: to
    };
  }

  private getHints(token: AutocompletionToken): Promise<Hint[]> {
    if (this.config.preProcessToken) {
      token = this.config.preProcessToken(this.yasqe, token);
    }

    if (token)
      return this.getCompletions(token)
        .then(suggestions => suggestions.map(s => this.getHint(token, s)))
        .then(hints => {
          if (this.config.postprocessHints) return this.config.postprocessHints(this.yasqe, hints);
          return hints;
        });
    return Promise.resolve([]);
  }
  public autocomplete(fromAutoShow: boolean) {
    //this part goes before the autoshow check, as we _would_ like notification showing to indicate a user can press ctrl-space
    if (!this.isValidPosition()) return false;
    if (
      fromAutoShow && // from autoShow, i.e. this gets called each time the editor content changes
      (!this.config.autoShow || // autoshow for  this particular type of autocompletion is -not- enabled
        (!this.config.bulk && this.config.async)) // async is enabled (don't want to re-do ajax-like request for every editor change)
    ) {
      return false;
    }
    const cur = this.yasqe.getDoc().getCursor();
    const token: AutocompletionToken = this.yasqe.getCompleteToken();
    const getHints: HintFn = () => {
      return this.getHints(token).then(list => {
        const hintResult = {
          list: list,
          from: <Position>{
            line: cur.line,
            ch: token.start
          },
          to: <Position>{
            line: cur.line,
            ch: token.end
          }
        };
        CodeMirror.on(hintResult, "shown", () => {
          this.yasqe.emit("autocompletionShown", (this.yasqe as any).state.completionActive.widget);
        });
        CodeMirror.on(hintResult, "close", () => {
          this.yasqe.emit("autocompletionClose");
        });
        return hintResult;
      });
    };

    getHints.async = false; //in their code, async means using a callback
    //we always return a promise, which should be properly handled regardless of this val
    var hintConfig: HintConfig = {
      closeCharacters: /(?=a)b/,
      completeSingle: false,
      hint: getHints,
      container: this.yasqe.rootEl,
      ...this.yasqe.config.hintConfig
    };
    this.yasqe.showHint(hintConfig);
    return true;
  }
}

/**
 * Converts rdf:type to http://.../type and converts <http://...> to http://...
 * Stores additional info such as the used namespace and prefix in the token object
 */
export function preprocessIriForCompletion(yasqe: Yasqe, token: AutocompletionToken) {
  var queryPrefixes = yasqe.getPrefixesFromQuery();
  var stringToPreprocess = token.string;
  //we might be in a property path... Make sure that whenever you change this, test for property paths as well
  if (
    //Only apply the property path magic, when we're actually in a property
    token.state.possibleCurrent.indexOf("a") >= 0 &&
    token.state.lastProperty &&
    token.state.lastProperty.length
  ) {
    const currentLine = yasqe.getDoc().getLine(yasqe.getDoc().getCursor().line);

    //We're not supporting property paths with line breaks in them. That way, we can more easily avoid issues
    //where we're in a property position, but are actually autocompletion the property of a triply-pattern above
    if (currentLine.indexOf(token.state.lastProperty) >= 0) {
      //The lastProperty is not neccesarily the full property (getHint messes things up).
      //Instead, it can be something like `rdf:`, where it actually should be `rdf:t`
      //So, try to reconstruct the string
      const remainingPath = currentLine.substr(token.state.lastPropertyIndex + token.state.lastProperty.length);
      const remainingProp = remainingPath.match(/^[\w\d]*/);
      stringToPreprocess = token.state.lastProperty + (remainingProp ? remainingProp[0] : "");
      token.from = {
        ch: token.start + token.string.length - token.state.lastProperty.length
      };
    }
  }
  if (stringToPreprocess.indexOf("<") < 0) {
    token.tokenPrefix = stringToPreprocess.substring(0, stringToPreprocess.indexOf(":") + 1);

    if (queryPrefixes[token.tokenPrefix.slice(0, -1)] != null) {
      token.tokenPrefixUri = queryPrefixes[token.tokenPrefix.slice(0, -1)];
    }
  }

  token.autocompletionString = stringToPreprocess.trim();
  if (stringToPreprocess.indexOf("<") < 0 && stringToPreprocess.indexOf(":") > -1) {
    // hmm, the token is prefixed. We still need the complete uri for autocompletions. generate this!
    for (var prefix in queryPrefixes) {
      if (token.tokenPrefix === prefix + ":") {
        token.autocompletionString = queryPrefixes[prefix];
        token.autocompletionString += stringToPreprocess.substring(prefix.length + 1);
        break;
      }
    }
  }

  if (token.autocompletionString.indexOf("<") == 0)
    token.autocompletionString = token.autocompletionString.substring(1);
  if (token.autocompletionString.indexOf(">", token.autocompletionString.length - 1) > 0)
    token.autocompletionString = token.autocompletionString.substring(0, token.autocompletionString.length - 1);
  return token;
}

export function postprocessIriCompletion(_yasqe: Yasqe, token: AutocompletionToken, suggestedString: string) {
  if (token.tokenPrefix && token.autocompletionString && token.tokenPrefixUri) {
    // we need to get the suggested string back to prefixed form
    suggestedString = token.tokenPrefix + suggestedString.substring(token.tokenPrefixUri.length);
  } else {
    // it is a regular uri. add '<' and '>' to string
    suggestedString = "<" + suggestedString + ">";
  }
  return suggestedString;
}

//Use protocol relative request when served via http[s]*. Otherwise (e.g. file://, fetch via http)
export function fetchFromLov(yasqe: Yasqe, type: "class" | "property", token: AutocompletionToken): Promise<string[]> {
  var reqProtocol = window.location.protocol.indexOf("http") === 0 ? "https://" : "http://";
  const notificationKey = "autocomplete_" + type;
  if (!token || !token.string || token.string.trim().length == 0) {
    yasqe.showNotification(notificationKey, "Nothing to autocomplete yet!");
    return Promise.resolve([]);
  }
  // //if notification bar is there, show a loader
  // yasqe.autocompleters.notifications
  //   .getEl(completer)
  //   .empty()
  //   .append($("<span>Fetchting autocompletions &nbsp;</span>"))
  //   .append($(yutils.svg.getElement(require("../imgs.js").loader)).addClass("notificationLoader"));
  // doRequests();
  return superagent
    .get(reqProtocol + "lov.linkeddata.es/dataset/lov/api/v2/autocomplete/terms")
    .query({
      q: token.autocompletionString,
      page_size: 50,
      type: type
    })
    .then(
      result => {
        if (result.body.results) {
          return result.body.results.map((r: any) => r.uri[0]);
        }
        return [];
      },
      _e => {
        yasqe.showNotification(notificationKey, "Failed fetching suggestions");
      }
    );
}

import variableCompleter from "./variables";
import prefixCompleter from "./prefixes";
import propertyCompleter from "./properties";
import classCompleter from "./classes";
export var completers: CompleterConfig[] = [variableCompleter, prefixCompleter, propertyCompleter, classCompleter];
