import { EventEmitter } from "events";
import { addClass, removeClass, getAsValue } from "@triply/yasgui-utils";
import { TabListEl } from "./TabElements";
import TabPanel from "./TabPanel";
import { default as Yasqe, RequestConfig, PlainRequestConfig, PartialConfig as YasqeConfig } from "@triply/yasqe";
import { default as Yasr, Parser, Config as YasrConfig, PersistentConfig as YasrPersistentConfig } from "@triply/yasr";
import { mapValues, eq, mergeWith, words, deburr, invert } from "lodash-es";
import * as shareLink from "./linkUtils";
import EndpointSelect from "./endpointSelect";
import * as superagent from "superagent";
require("./tab.scss");
import { getRandomId, default as Yasgui, YasguiRequestConfig } from "./";
export interface PersistedJsonYasr extends YasrPersistentConfig {
  responseSummary: Parser.ResponseSummary;
}
export interface PersistedJson {
  name: string;
  id: string;
  yasqe: {
    value: string;
    editorHeight?: string;
  };
  yasr: {
    settings: YasrPersistentConfig;
    response: Parser.ResponseSummary | undefined;
  };
  requestConfig: YasguiRequestConfig;
}
export interface Tab {
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  on(event: "change", listener: (tab: Tab, config: PersistedJson) => void): this;
  emit(event: "change", tab: Tab, config: PersistedJson): boolean;
  on(event: "query", listener: (tab: Tab) => void): this;
  emit(event: "query", tab: Tab): boolean;
  on(event: "queryAbort", listener: (tab: Tab) => void): this;
  emit(event: "queryAbort", tab: Tab): boolean;
  on(event: "queryResponse", listener: (tab: Tab) => void): this;
  emit(event: "queryResponse", tab: Tab): boolean;
  on(event: "close", listener: (tab: Tab) => void): this;
  emit(event: "close", tab: Tab): boolean;
  on(event: "endpointChange", listener: (tab: Tab, endpoint: string) => void): this;
  emit(event: "endpointChange", tab: Tab, endpoint: string): boolean;
  on(event: "autocompletionShown", listener: (tab: Tab, widget: any) => void): this;
  emit(event: "autocompletionShown", tab: Tab, widget: any): boolean;
  on(event: "autocompletionClose", listener: (tab: Tab) => void): this;
  emit(event: "autocompletionClose", tab: Tab): boolean;
}
export class Tab extends EventEmitter {
  private persistentJson: PersistedJson;
  public yasgui: Yasgui;
  private yasqe: Yasqe | undefined;
  private yasr: Yasr | undefined;
  private rootEl: HTMLDivElement | undefined;
  private controlBarEl: HTMLDivElement | undefined;
  private yasqeWrapperEl: HTMLDivElement | undefined;
  private yasrWrapperEl: HTMLDivElement | undefined;
  private endpointSelect: EndpointSelect | undefined;
  private tabPanel?: TabPanel;
  constructor(yasgui: Yasgui, conf: PersistedJson) {
    super();
    if (!conf || conf.id === undefined) throw new Error("Expected a valid configuration to initialize tab with");
    this.yasgui = yasgui;
    this.persistentJson = conf;
  }
  public name() {
    return this.persistentJson.name;
  }
  public getPersistedJson() {
    return this.persistentJson;
  }
  public getId() {
    return this.persistentJson.id;
  }
  private draw() {
    if (this.rootEl) return; //aready drawn
    this.rootEl = document.createElement("div");
    this.rootEl.className = "tabPanel";
    this.rootEl.id = this.persistentJson.id;
    this.rootEl.setAttribute("role", "tabpanel");
    this.rootEl.setAttribute("aria-labelledby", "tab-" + this.persistentJson.id);

    const wrapper = document.createElement("div");
    //controlbar
    this.controlBarEl = document.createElement("div");
    this.controlBarEl.className = "controlbar";
    wrapper.appendChild(this.controlBarEl);

    //yasqe
    this.yasqeWrapperEl = document.createElement("div");
    wrapper.appendChild(this.yasqeWrapperEl);

    //yasr
    this.yasrWrapperEl = document.createElement("div");
    wrapper.appendChild(this.yasrWrapperEl);

    this.initTabSettingsMenu();
    this.rootEl.appendChild(wrapper);
    this.initControlbar();
    this.initYasqe();
    this.initYasr();
    this.yasgui._setPanel(this.persistentJson.id, this.rootEl);
  }
  public hide() {
    removeClass(this.rootEl, "active");
  }
  public show() {
    this.draw();
    addClass(this.rootEl, "active");
    this.yasgui.tabElements.selectTab(this.persistentJson.id);
    if (this.yasqe) {
      this.yasqe.refresh();
      if (this.yasgui.config.autofocus) this.yasqe.focus();
    }
    if (this.yasr) {
      this.yasr.refresh();
    }
    //refresh, as other tabs might have changed the endpoint history
    this.setEndpoint(this.getEndpoint(), this.yasgui.persistentConfig.getEndpointHistory());
  }
  public select() {
    this.yasgui.selectTabId(this.persistentJson.id);
  }
  public close() {
    if (this.yasqe) this.yasqe.abortQuery();
    if (this.yasgui.getTab() === this) {
      //it's the active tab
      //first select other tab
      const tabs = this.yasgui.persistentConfig.getTabs();
      const i = tabs.indexOf(this.persistentJson.id);
      if (i > -1) {
        this.yasgui.selectTabId(tabs[i === tabs.length - 1 ? i - 1 : i + 1]);
      }
    }
    this.yasgui._removePanel(this.rootEl);
    this.yasgui.persistentConfig.deleteTab(this.persistentJson.id);
    this.yasgui.emit("tabClose", this.yasgui, this);
    this.emit("close", this);
    this.yasgui.tabElements.get(this.persistentJson.id).delete();
    delete this.yasgui._tabs[this.persistentJson.id];
  }
  public getQuery() {
    if (!this.yasqe) {
      throw new Error("Cannot get value from uninitialized editor");
    }
    return this.yasqe?.getValue();
  }
  public setQuery(query: string) {
    if (!this.yasqe) {
      throw new Error("Cannot set value for uninitialized editor");
    }
    this.yasqe.setValue(query);
    this.persistentJson.yasqe.value = query;
    this.emit("change", this, this.persistentJson);
    return this;
  }
  public getRequestConfig() {
    return this.persistentJson.requestConfig;
  }
  private initControlbar() {
    this.initEndpointSelectField();
    if (this.yasgui.config.endpointInfo && this.controlBarEl) {
      this.controlBarEl.appendChild(this.yasgui.config.endpointInfo());
    }
  }
  public getYasqe() {
    return this.yasqe;
  }
  public getYasr() {
    return this.yasr;
  }
  private initTabSettingsMenu() {
    if (!this.rootEl || !this.controlBarEl)
      throw new Error("Need to initialize wrapper elements before drawing tab pabel");
    this.tabPanel = new TabPanel(this, this.rootEl, this.controlBarEl);
  }

  private initEndpointSelectField() {
    if (!this.controlBarEl) throw new Error("Need to initialize wrapper elements before drawing endpoint field");
    this.endpointSelect = new EndpointSelect(
      this.getEndpoint(),
      this.controlBarEl,
      this.yasgui.config.endpointCatalogueOptions,
      this.yasgui.persistentConfig.getEndpointHistory()
    );
    this.endpointSelect.on("select", (endpoint, endpointHistory) => {
      this.setEndpoint(endpoint, endpointHistory);
    });
    this.endpointSelect.on("remove", (endpoint, endpointHistory) => {
      this.setEndpoint(endpoint, endpointHistory);
    });
  }

  private checkEndpointForCors(endpoint: string) {
    if (this.yasgui.config.corsProxy && !(endpoint in Yasgui.corsEnabled)) {
      superagent
        .get(endpoint)
        .query({ query: "ASK {?x ?y ?z}" })
        .then(
          () => {
            Yasgui.corsEnabled[endpoint] = true;
          },
          (e) => {
            //When we dont get a response at all (and no status code), that means
            //the browser blocked this request. Likely a cors error
            Yasgui.corsEnabled[endpoint] = e.status > 0;
          }
        );
    }
  }
  public setEndpoint(endpoint: string, endpointHistory?: string[]) {
    if (endpoint) endpoint = endpoint.trim();
    if (endpointHistory && !eq(endpointHistory, this.yasgui.persistentConfig.getEndpointHistory())) {
      this.yasgui.emit("endpointHistoryChange", this.yasgui, endpointHistory);
    }
    this.checkEndpointForCors(endpoint); //little cost in checking this as we're caching the check results

    if (this.persistentJson.requestConfig.endpoint !== endpoint) {
      this.persistentJson.requestConfig.endpoint = endpoint;
      this.emit("change", this, this.persistentJson);
      this.emit("endpointChange", this, endpoint);
    }
    if (this.endpointSelect instanceof EndpointSelect) {
      this.endpointSelect.setEndpoint(endpoint, endpointHistory);
    }
    return this;
  }
  public getEndpoint(): string {
    return getAsValue(this.persistentJson.requestConfig.endpoint, this.yasgui);
  }
  /**
   * Updates the position of the Tab's contextmenu
   * Useful for when being scrolled
   */
  public updateContextMenu(): void {
    this.getTabListEl().redrawContextMenu();
  }
  public getShareableLink(baseURL?: string): string {
    return shareLink.createShareLink(baseURL || window.location.href, this);
  }
  public getShareObject() {
    return shareLink.createShareConfig(this);
  }
  private getTabListEl(): TabListEl {
    return this.yasgui.tabElements.get(this.persistentJson.id);
  }
  public setName(newName: string) {
    this.getTabListEl().rename(newName);
    this.persistentJson.name = newName;
    this.emit("change", this, this.persistentJson);
    return this;
  }
  public hasResults() {
    return !!this.yasr?.results;
  }

  public getName() {
    return this.persistentJson.name;
  }
  public query(): Promise<any> {
    if (!this.yasqe) return Promise.reject(new Error("No yasqe editor initialized"));
    return this.yasqe.query();
  }
  public setRequestConfig(requestConfig: Partial<YasguiRequestConfig>) {
    this.persistentJson.requestConfig = {
      ...this.persistentJson.requestConfig,
      ...requestConfig,
    };

    this.emit("change", this, this.persistentJson);
  }

  /**
   * The Yasgui configuration object may contain a custom request config
   * This request config object can contain getter functions, or plain json
   * The plain json data is stored in persisted config, and editable via the
   * tab pane.
   * The getter functions are not. This function is about fetching this part of the
   * request configuration, so we can merge this with the configuration from the
   * persistent config and tab pane.
   *
   * Considering some values will never be persisted (things that should always be a function),
   * we provide that as part of a whitelist called `keepDynamic`
   */
  private getStaticRequestConfig() {
    const config: Partial<PlainRequestConfig> = {};
    let key: keyof YasguiRequestConfig;
    for (key in this.yasgui.config.requestConfig) {
      //This config option should never be static or persisted anyway
      if (key === "adjustQueryBeforeRequest") continue;
      const val = this.yasgui.config.requestConfig[key];
      if (typeof val === "function") {
        (config[key] as any) = val(this.yasgui);
      }
    }
    return config;
  }

  private initYasqe() {
    const yasqeConf: Partial<YasqeConfig> = {
      ...this.yasgui.config.yasqe,
      value: this.persistentJson.yasqe.value,
      editorHeight: this.persistentJson.yasqe.editorHeight ? this.persistentJson.yasqe.editorHeight : undefined,
      persistenceId: null, //yasgui handles persistent storing
      consumeShareLink: null, //not handled by this tab, but by parent yasgui instance
      createShareableLink: () => this.getShareableLink(),
      requestConfig: () => {
        const processedReqConfig: YasguiRequestConfig = {
          //setting defaults
          //@ts-ignore
          acceptHeaderGraph: "text/turtle",
          //@ts-ignore
          acceptHeaderSelect: "application/sparql-results+json",
          ...mergeWith({}, this.persistentJson.requestConfig, this.getStaticRequestConfig(), function customizer(
            objValue,
            srcValue
          ) {
            if (Array.isArray(objValue) || Array.isArray(srcValue)) {
              return [...(objValue || []), ...(srcValue || [])];
            }
          }),
          //Passing this manually. Dont want to use our own persistentJson, as that's flattened exclude functions
          //The adjustQueryBeforeRequest is meant to be a function though, so let's copy that as is
          adjustQueryBeforeRequest: this.yasgui.config.requestConfig.adjustQueryBeforeRequest,
        };
        if (this.yasgui.config.corsProxy && !Yasgui.corsEnabled[this.getEndpoint()]) {
          return {
            ...processedReqConfig,
            args: [
              ...(Array.isArray(processedReqConfig.args) ? processedReqConfig.args : []),
              { name: "endpoint", value: this.getEndpoint() },
              { name: "method", value: this.persistentJson.requestConfig.method },
            ],
            method: "POST",
            endpoint: this.yasgui.config.corsProxy,
          } as PlainRequestConfig;
        }
        return processedReqConfig as PlainRequestConfig;
      },
    };
    if (!yasqeConf.hintConfig) {
      yasqeConf.hintConfig = {};
    }
    if (!yasqeConf.hintConfig.container) {
      yasqeConf.hintConfig.container = this.yasgui.rootEl;
    }
    if (!this.yasqeWrapperEl) {
      throw new Error("Expected a wrapper element before instantiating yasqe");
    }
    this.yasqe = new Yasqe(this.yasqeWrapperEl, yasqeConf);

    this.yasqe.on("blur", this.handleYasqeBlur);
    this.yasqe.on("query", this.handleYasqeQuery);
    this.yasqe.on("queryAbort", this.handleYasqeQueryAbort);
    this.yasqe.on("resize", this.handleYasqeResize);

    this.yasqe.on("autocompletionShown", this.handleAutocompletionShown);
    this.yasqe.on("autocompletionClose", this.handleAutocompletionClose);

    this.yasqe.on("queryResponse", this.handleQueryResponse);
  }
  private destroyYasqe() {
    // As Yasqe extends of CM instead of eventEmitter, it doesn't expose the removeAllListeners function, so we should unregister all events manually
    this.yasqe?.off("blur", this.handleYasqeBlur);
    this.yasqe?.off("query", this.handleYasqeQuery);
    this.yasqe?.off("queryAbort", this.handleYasqeQueryAbort);
    this.yasqe?.off("resize", this.handleYasqeResize);
    this.yasqe?.off("autocompletionShown", this.handleAutocompletionShown);
    this.yasqe?.off("autocompletionClose", this.handleAutocompletionClose);
    this.yasqe?.off("queryResponse", this.handleQueryResponse);
    this.yasqe?.destroy();
    this.yasqe = undefined;
  }
  handleYasqeBlur = (yasqe: Yasqe) => {
    this.persistentJson.yasqe.value = yasqe.getValue();
    this.emit("change", this, this.persistentJson);
  };
  handleYasqeQuery = (yasqe: Yasqe) => {
    //the blur event might not have fired (e.g. when pressing ctrl-enter). So, we'd like to persist the query as well if needed
    if (yasqe.getValue() !== this.persistentJson.yasqe.value) {
      this.persistentJson.yasqe.value = yasqe.getValue();
      this.emit("change", this, this.persistentJson);
    }
    this.emit("query", this);
  };
  handleYasqeQueryAbort = () => {
    this.emit("queryAbort", this);
  };
  handleYasqeResize = (_yasqe: Yasqe, newSize: string) => {
    this.persistentJson.yasqe.editorHeight = newSize;
    this.emit("change", this, this.persistentJson);
  };
  handleAutocompletionShown = (_yasqe: Yasqe, widget: string) => {
    this.emit("autocompletionShown", this, widget);
  };
  handleAutocompletionClose = (_yasqe: Yasqe) => {
    this.emit("autocompletionClose", this);
  };
  handleQueryResponse = (_yasqe: Yasqe, response: any, duration: number) => {
    this.emit("queryResponse", this);
    if (!this.yasr) throw new Error("Resultset visualizer not initialized. Cannot draw results");
    this.yasr.setResponse(response, duration);
    if (!this.yasr.results) return;
    if (!this.yasr.results.hasError()) {
      this.persistentJson.yasr.response = this.yasr.results.getAsStoreObject(
        this.yasgui.config.yasr.maxPersistentResponseSize
      );
    } else {
      // Don't persist if there is an error and remove the previous result
      this.persistentJson.yasr.response = undefined;
    }
    this.emit("change", this, this.persistentJson);
  };

  private initYasr() {
    if (!this.yasrWrapperEl) throw new Error("Wrapper for yasr does not exist");

    const yasrConf: Partial<YasrConfig> = {
      persistenceId: null, //yasgui handles persistent storing
      prefixes: (yasr) => {
        // Prefixes defined in YASR's config
        const prefixesFromYasrConf =
          typeof this.yasgui.config.yasr.prefixes === "function"
            ? this.yasgui.config.yasr.prefixes(yasr)
            : this.yasgui.config.yasr.prefixes;
        const prefixesFromYasqe = this.yasqe?.getPrefixesFromQuery();
        // Invert twice to make sure both keys and values are unique
        // YASQE's prefixes should take president
        return invert(invert({ ...prefixesFromYasrConf, ...prefixesFromYasqe }));
      },
      defaultPlugin: this.persistentJson.yasr.settings.selectedPlugin,
      getPlainQueryLinkToEndpoint: () => {
        if (this.yasqe) {
          return shareLink.appendArgsToUrl(
            this.getEndpoint(),
            Yasqe.Sparql.getUrlArguments(this.yasqe, this.persistentJson.requestConfig as RequestConfig<any>)
          );
        }
      },
      plugins: mapValues(this.persistentJson.yasr.settings.pluginsConfig, (conf) => ({
        dynamicConfig: conf,
      })),
      errorRenderers: [
        // Use custom error renderer
        getCorsErrorRenderer(this),
        // Add default renderers to the end, to give our custom ones priority.
        ...(Yasr.defaults.errorRenderers || []),
      ],
    };
    // Allow getDownloadFilName to be overwritten by the global config
    if (yasrConf.getDownloadFileName === undefined) {
      yasrConf.getDownloadFileName = () => words(deburr(this.getName())).join("-");
    }

    this.yasr = new Yasr(this.yasrWrapperEl, yasrConf, this.persistentJson.yasr.response);

    //populate our own persistent config
    this.persistentJson.yasr.settings = this.yasr.getPersistentConfig();
    this.yasr.on("change", () => {
      if (this.yasr) {
        this.persistentJson.yasr.settings = this.yasr.getPersistentConfig();
      }

      this.emit("change", this, this.persistentJson);
    });
  }
  destroy() {
    this.removeAllListeners();
    this.tabPanel?.destroy();
    this.endpointSelect?.destroy();
    this.endpointSelect = undefined;
    this.yasr?.destroy();
    this.yasr = undefined;
    this.destroyYasqe();
  }
  public static getDefaults(yasgui?: Yasgui): PersistedJson {
    return {
      yasqe: {
        value: yasgui ? yasgui.config.yasqe.value : Yasgui.defaults.yasqe.value,
      },
      yasr: {
        response: undefined,
        settings: {
          selectedPlugin: yasgui ? yasgui.config.yasr.defaultPlugin : "table",
          pluginsConfig: {},
        },
      },
      requestConfig: yasgui ? yasgui.config.requestConfig : { ...Yasgui.defaults.requestConfig },
      id: getRandomId(),
      name: yasgui ? yasgui.createTabName() : Yasgui.defaults.tabName,
    };
  }
}

export default Tab;

function getCorsErrorRenderer(tab: Tab) {
  return async (error: Parser.ErrorSummary): Promise<HTMLElement | undefined> => {
    if (!error.status) {
      // Only show this custom error if
      const shouldReferToHttp =
        new URL(tab.getEndpoint()).protocol === "http:" && window.location.protocol === "https:";
      if (shouldReferToHttp) {
        const errorEl = document.createElement("div");
        const errorSpan = document.createElement("p");
        errorSpan.innerHTML = `You are trying to query an HTTP endpoint (<a href="${tab.getEndpoint()}" target="_blank" rel="noopener noreferrer">${tab.getEndpoint()}</a>) from an HTTP<strong>S</strong> website (<a href="${
          window.location.href
        }">${
          window.location.href
        }</a>).<br>This is not allowed in modern browsers, see <a target="_blank" rel="noopener noreferrer" href="https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy">https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy</a>.`;
        if (tab.yasgui.config.nonSslDomain) {
          const errorLink = document.createElement("p");
          errorLink.innerHTML = `As a workaround, you can use the HTTP version of Yasgui instead: <a href="${tab.getShareableLink(
            tab.yasgui.config.nonSslDomain
          )}" target="_blank">${tab.yasgui.config.nonSslDomain}</a>`;
          errorSpan.appendChild(errorLink);
        }
        errorEl.appendChild(errorSpan);
        return errorEl;
      }
    }
  };
}
