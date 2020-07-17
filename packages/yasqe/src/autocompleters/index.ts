import { default as Yasqe, Token, Hint, Position, Config, HintFn, HintConfig } from "../";
import Trie from "../trie";
import { EventEmitter } from "events";
import * as superagent from "superagent";
import { take } from "lodash-es";
const CodeMirror = require("codemirror");
require("./show-hint.scss");
export interface CompleterConfig {
  onInitialize?: (this: CompleterConfig, yasqe: Yasqe) => void; //allows for e.g. registering event listeners in yasqe, like the prefix autocompleter does
  isValidCompletionPosition: (yasqe: Yasqe) => boolean;
  get: (yasqe: Yasqe, token?: AutocompletionToken) => Promise<string[]> | string[];
  preProcessToken?: (yasqe: Yasqe, token: Token) => AutocompletionToken;
  postProcessSuggestion?: (yasqe: Yasqe, token: AutocompletionToken, suggestedString: string) => string;
  postprocessHints?: (yasqe: Yasqe, hints: Hint[]) => Hint[];
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
  to?: Partial<Position>;
}
export class Completer extends EventEmitter {
  protected yasqe: Yasqe;
  private trie?: Trie;
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
    for (const c of completions) {
      this.trie.insert(c);
    }

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
      return Promise.resolve(this.config.get(this.yasqe)).then((suggestions) => {
        if (suggestions instanceof Array) return suggestions;
        return [];
      });
    }

    //ok, there is a token
    const stringToAutocomplete = token.autocompletionString || token.string;
    if (this.trie) return Promise.resolve(take(this.trie.autoComplete(stringToAutocomplete), SUGGESTIONS_LIMIT));
    if (this.config.get instanceof Array)
      return Promise.resolve(
        this.config.get.filter((possibleMatch) => possibleMatch.indexOf(stringToAutocomplete) === 0)
      );
    //assuming it's a function
    return Promise.resolve(this.config.get(this.yasqe, token)).then((r) => {
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
        var completionsFromStorage: string[] | undefined;
        var storageId = this.getStorageId();
        if (storageId) completionsFromStorage = this.yasqe.storage.get<string[]>(storageId);
        if (completionsFromStorage && completionsFromStorage.length > 0) {
          this.storeBulkCompletions(completionsFromStorage);
          return Promise.resolve();
        } else {
          return this.getCompletions().then((c) => this.storeBulkCompletions(c));
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
    let from: Position | undefined;
    let to: Position;
    const cursor = this.yasqe.getDoc().getCursor();
    if (autocompletionToken.from) {
      from = { ...cursor, ...autocompletionToken.from };
    }
    // Need to set a 'to' part as well, as otherwise we'd be appending the result to the already typed filter
    const line = this.yasqe.getDoc().getCursor().line;
    if (autocompletionToken.to) {
      to = { ch: autocompletionToken?.to?.ch || this.yasqe.getCompleteToken().end, line: line };
    } else if (autocompletionToken.string.length > 0) {
      to = { ch: this.yasqe.getCompleteToken().end, line: line };
    } else {
      to = <any>autocompletionToken.from;
    }
    return {
      text: suggestedString,
      displayText: suggestedString,
      from: from,
      to: to,
    };
  }

  private getHints(token: AutocompletionToken): Promise<Hint[]> {
    if (this.config.preProcessToken) {
      token = this.config.preProcessToken(this.yasqe, token);
    }

    if (token)
      return this.getCompletions(token)
        .then((suggestions) => suggestions.map((s) => this.getHint(token, s)))
        .then((hints) => {
          if (this.config.postprocessHints) return this.config.postprocessHints(this.yasqe, hints);
          return hints;
        });
    return Promise.resolve([]);
  }
  public autocomplete(fromAutoShow: boolean) {
    //this part goes before the autoshow check, as we _would_ like notification showing to indicate a user can press ctrl-space
    if (!this.isValidPosition()) return false;
    const previousCompletionItem = this.yasqe.state.completionActive;

    // Showhint by defaults takes the autocomplete start position (the location of the cursor at the time of starting the autocompletion).
    const cursor = this.yasqe.getDoc().getCursor();
    if (
      // When the cursor goes before current completionItem (e.g. using arrow keys), it would close the autocompletions.
      // We want the autocompletion to be active at whatever point we are in the token, so let's modify this start pos with the start pos of the token
      previousCompletionItem &&
      cursor.sticky && // Is undefined at the end of the token, otherwise it is set as either "before" or "after" (The movement of the cursor)
      cursor.ch !== previousCompletionItem.startPos.ch
    ) {
      this.yasqe.state.completionActive.startPos = cursor;
    } else if (previousCompletionItem && !cursor.sticky && cursor.ch < previousCompletionItem.startPos.ch) {
      // A similar thing happens when pressing backspace, CodeMirror will close this autocomplete when 'startLen' changes downward
      cursor.sticky = previousCompletionItem.startPos.sticky;
      this.yasqe.state.completionActive.startPos.ch = cursor.ch;
      this.yasqe.state.completionActive.startLen--;
    }
    if (
      fromAutoShow && // from autoShow, i.e. this gets called each time the editor content changes
      (!this.config.autoShow || this.yasqe.state.completionActive) // Don't show  and don't create a new instance when its already active
    ) {
      return false;
    }

    const getHints: HintFn = () => {
      return this.getHints(this.yasqe.getCompleteToken()).then((list) => {
        const cur = this.yasqe.getDoc().getCursor();
        const token: AutocompletionToken = this.yasqe.getCompleteToken();
        const hintResult = {
          list: list,
          from: <Position>{
            line: cur.line,
            ch: token.start,
          },
          to: <Position>{
            line: cur.line,
            ch: token.end,
          },
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
      closeCharacters: /[\s>"]/,
      completeSingle: false,
      hint: getHints,
      container: this.yasqe.rootEl,
      // Override these actions back to use their default function
      // Otherwise these would navigate to the start/end of the suggestion list, while this can also be accomplished with PgUp and PgDn
      extraKeys: {
        Home: (yasqe, event) => {
          yasqe.getDoc().setCursor({ ch: 0, line: event.data.from.line });
        },
        End: (yasqe, event) => {
          yasqe.getDoc().setCursor({ ch: yasqe.getLine(event.data.to.line).length, line: event.data.to.line });
        },
      },
      ...this.yasqe.config.hintConfig,
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
  const queryPrefixes = yasqe.getPrefixesFromQuery();
  const stringToPreprocess = token.string;

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
export const fetchFromLov = (
  yasqe: Yasqe,
  type: "class" | "property",
  token?: AutocompletionToken
): Promise<string[]> => {
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
      type: type,
    })
    .then(
      (result) => {
        if (result.body.results) {
          return result.body.results.map((r: any) => r.uri[0]);
        }
        return [];
      },
      (_e) => {
        yasqe.showNotification(notificationKey, "Failed fetching suggestions");
      }
    );
};

import variableCompleter from "./variables";
import prefixCompleter from "./prefixes";
import propertyCompleter from "./properties";
import classCompleter from "./classes";
export var completers: CompleterConfig[] = [variableCompleter, prefixCompleter, propertyCompleter, classCompleter];
