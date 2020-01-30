import { EventEmitter } from "events";
import { merge, filter, mapValues } from "lodash-es";
import getDefaults from "./defaults";
import type { Plugin } from "./plugins";
import {
  Storage as YStorage,
  drawFontAwesomeIconAsSvg,
  drawSvgStringAsElement,
  removeClass,
  addClass,
  hasClass
} from "@triply/yasgui-utils";
import Parser from "./parsers";
export { default as Parser } from "./parsers";
import { addScript, addCss, sanitize } from "./helpers";
import * as faDownload from "@fortawesome/free-solid-svg-icons/faDownload";
import * as faQuestionCircle from "@fortawesome/free-solid-svg-icons/faQuestionCircle";
require("./main.scss");

export interface PersistentConfig {
  selectedPlugin?: string;
  pluginsConfig?: { [pluginName: string]: any };
}

export interface Yasr {
  on(event: "change", listener: (instance: Yasr) => void): this;
  emit(event: "change", instance: Yasr): boolean;
  on(event: "draw", listener: (instance: Yasr, plugin: Plugin<any>) => void): this;
  emit(event: "draw", instance: Yasr, plugin: Plugin<any>): boolean;
  on(event: "drawn", listener: (instance: Yasr, plugin: Plugin<any>) => void): this;
  emit(event: "drawn", instance: Yasr, plugin: Plugin<any>): boolean;
  on(event: "toggle-help", listener: (instance: Yasr) => void): this;
  emit(event: "toggle-help", instance: Yasr): boolean;
}
export class Yasr extends EventEmitter {
  public results?: Parser;
  public rootEl: HTMLDivElement;
  public headerEl: HTMLDivElement;
  public fallbackInfoEl: HTMLDivElement;
  public resultsEl: HTMLDivElement;
  public pluginControls!: HTMLDivElement;
  public config: Config;
  public storage: YStorage;
  public plugins: { [name: string]: Plugin<any> } = {};
  // private persistentConfig: PersistentConfig;
  public helpDrawn: Boolean = false;
  private drawnPlugin: string | undefined;
  private selectedPlugin: string | undefined;

  // Utils
  public utils = { addScript: addScript, addCSS: addCss, sanitize: sanitize };

  constructor(parent: HTMLElement, conf: Partial<Config> = {}, data?: any) {
    super();
    if (!parent) throw new Error("No parent passed as argument. Dont know where to draw YASR");
    this.rootEl = document.createElement("div");
    this.rootEl.className = "yasr";
    parent.appendChild(this.rootEl);
    this.config = merge({}, Yasr.defaults, conf);

    //Do some post processing
    this.storage = new YStorage(Yasr.storageNamespace);
    this.getConfigFromStorage();
    this.headerEl = document.createElement("div");
    this.headerEl.className = "yasr_header";
    this.rootEl.appendChild(this.headerEl);
    this.fallbackInfoEl = document.createElement("div");
    this.fallbackInfoEl.className = "yasr_fallback_info";
    this.rootEl.appendChild(this.fallbackInfoEl);
    this.resultsEl = document.createElement("div");
    this.resultsEl.className = "yasr_results";
    this.rootEl.appendChild(this.resultsEl);
    this.initializePlugins();
    this.drawHeader();

    const resp = data || this.getResponseFromStorage();
    if (resp) this.setResponse(resp);
  }
  private getConfigFromStorage() {
    const storageId = this.getStorageId(this.config.persistenceLabelConfig);
    if (storageId) {
      const persistentConfig: PersistentConfig | undefined = this.storage.get(storageId);
      if (persistentConfig) {
        this.selectedPlugin = persistentConfig.selectedPlugin;
        for (const pluginName in persistentConfig.pluginsConfig) {
          const pConf = persistentConfig.pluginsConfig[pluginName];
          if (pConf && this.config.plugins[pluginName]) this.config.plugins[pluginName].dynamicConfig = pConf;
        }
      }
    }
  }
  public getStorageId(label: string, getter?: Config["persistenceId"]): string | undefined {
    const persistenceId = getter || this.config.persistenceId;
    if (!persistenceId) return ;
    if (typeof persistenceId === "string") return persistenceId + "_" + label;
    return persistenceId(this) + "_" + label;
  }

  public somethingDrawn() {
    return !!this.resultsEl.children.length;
  }
  /**
   * Empties fallback element
   * CSS will make sure the outline is hidden when empty
   */
  public emptyFallbackElement() {
    // This is quicker than `<node>.innerHtml = ""`
    while (this.fallbackInfoEl.firstChild) this.fallbackInfoEl.removeChild(this.fallbackInfoEl.firstChild);
  }
  public getSelectedPluginName(): string {
    return this.selectedPlugin || this.config.defaultPlugin;
  }
  public getSelectedPlugin() {
    if (this.plugins[this.getSelectedPluginName()]) {
      return this.plugins[this.getSelectedPluginName()];
    }
    console.warn(`Tried using plugin ${this.getSelectedPluginName()}, but seems this plugin isnt registered in yasr.`);
  }
  /**
   * Update selectors, based on whether they can actuall draw something, and which plugin is currently selected
   */
  private updatePluginSelectors(enabledPlugins?: string[]) {
    if (!this.pluginSelectorsEl) return;
    for (const pluginName in this.config.plugins) {
      const plugin = this.plugins[pluginName];
      if (plugin && !plugin.hideFromSelection) {
        if (enabledPlugins) {
          if (enabledPlugins.indexOf(pluginName) >= 0) {
            //make sure enabled
            removeClass(this.pluginSelectorsEl.querySelector(".select_" + pluginName), "disabled");
          } else {
            //make sure disabled
            addClass(this.pluginSelectorsEl.querySelector(".select_" + pluginName), "disabled");
          }
        }
        if (pluginName === this.getSelectedPluginName()) {
          addClass(this.pluginSelectorsEl.querySelector(".select_" + pluginName), "selected");
        } else {
          removeClass(this.pluginSelectorsEl.querySelector(".select_" + pluginName), "selected");
        }
      }
    }
  }

  private getCompatiblePlugins(): string[] {
    if (!this.results)
      return Object.keys(filter(this.config.plugins, val => (typeof val === "object" && val.enabled) || val === true));

    // var autoSelectedPlugin: string = null;
    // var pluginPriority = -1;
    var supportedPlugins: { name: string; priority: number }[] = [];
    for (var pluginName in this.plugins) {
      if (this.plugins[pluginName].canHandleResults()) {
        supportedPlugins.push({ name: pluginName, priority: this.plugins[pluginName].priority });
      }
    }
    return supportedPlugins.sort((p1, p2) => p2.priority - p1.priority).map(p => p.name);
  }
  public draw() {
    this.updateHelpButton();
    this.updateResponseInfo();
    if (!this.results) return;
    const compatiblePlugins = this.getCompatiblePlugins();
    if (this.drawnPlugin && this.getSelectedPluginName() !== this.drawnPlugin) {
      const length = this.pluginControls.children.length;
      for (var i = length - 1; i >= 0; i--) {
        this.pluginControls.children[i].remove();
      }
      this.plugins[this.drawnPlugin].destroy?.();
    }
    let pluginToDraw: string | undefined;
    if (this.getSelectedPlugin() && this.getSelectedPlugin()?.canHandleResults()) {
      pluginToDraw = this.getSelectedPluginName();
      // When present remove fallback box
      this.emptyFallbackElement();
    } else if (compatiblePlugins[0]) {
      if (this.drawnPlugin) {
        this.plugins[this.drawnPlugin].destroy?.();
      }
      pluginToDraw = compatiblePlugins[0];
      // Signal to create the plugin+
      this.fillFallbackBox(pluginToDraw);
    }
    if (pluginToDraw) {
      this.drawnPlugin = pluginToDraw;

      this.emit("draw", this, this.plugins[pluginToDraw]);
      const initFn = this.plugins[pluginToDraw].initialize
      const initialize: Promise<any> = initFn
        ? initFn()
        : Promise.resolve();
      initialize.then(
        () => {
          if (pluginToDraw) {

            //make sure to clear the innerhtml _here_
            //otherwise we run into race conditions when draw is executed shortly after each other, and the plugin uses an initialize function
            //as a result, things can be rendered _twice_
            this.resultsEl.innerHTML = "";
            this.plugins[pluginToDraw].draw(this.config.plugins[pluginToDraw].dynamicConfig);
            this.emit("drawn", this, this.plugins[pluginToDraw]);
            this.updateExportHeaders();
            this.updatePluginSelectors(compatiblePlugins);
          }
        },
        _e => console.error
      );
    } else {
      this.resultsEl.textContent = "cannot render result";
      this.updateExportHeaders();
      this.updatePluginSelectors(compatiblePlugins);
    }
  }
  //just an alias for `draw`. That way, we've got a consistent api with yasqe
  public refresh() {
    this.draw();
  }
  getPrefixes(): Prefixes {
    if (this.config.prefixes) {
      if (typeof this.config.prefixes === "function") {
        return this.config.prefixes(this);
      } else {
        return this.config.prefixes;
      }
    }
    return {};
  }
  public selectPlugin(plugin: string) {
    if (this.selectedPlugin === plugin) {
      // Don't re-render when selecting the same plugin. Also see #1893
      return;
    }
    if (this.config.plugins[plugin]) {
      this.selectedPlugin = plugin;
    } else {
      console.warn(`Plugin ${plugin} does not exist.`);
      this.selectedPlugin = this.config.defaultPlugin;
    }
    this.storeConfig();
    this.emit("change", this);
    this.updatePluginSelectors();
    this.draw();
  }
  private pluginSelectorsEl!: HTMLDivElement;
  drawPluginSelectors() {
    this.pluginSelectorsEl = document.createElement("div");
    this.pluginSelectorsEl.className = "yasr_btnGroup";
    const pluginOrder = this.config.pluginOrder;
    Object.keys(this.config.plugins)
      .sort()
      .forEach(plugin => {
        if (pluginOrder.indexOf(plugin) === -1) pluginOrder.push(plugin);
      });
    for (const pluginName of pluginOrder) {
      if (!this.config.plugins[pluginName] || !this.config.plugins[pluginName].enabled) {
        continue;
      }
      const plugin = this.plugins[pluginName];

      if (!plugin) continue; //plugin not loaded
      if (plugin.hideFromSelection) continue;
      const name = plugin.label || pluginName;
      const div = document.createElement("div");
      addClass(div, "yasr_btn", "select_" + pluginName);
      div.title = name;
      if (plugin.getIcon) {
        const icon = plugin.getIcon();
        if (icon) {
          // icon.className = '';
          addClass(icon, "plugin_icon");
          div.appendChild(icon);
        }
      }
      // div.textContent = name;
      const nameEl = document.createElement("span");
      nameEl.textContent = name;
      div.appendChild(nameEl);
      div.onclick = () => this.selectPlugin(pluginName);
      const li = document.createElement("div");
      li.appendChild(div);
      this.pluginSelectorsEl.appendChild(li);
    }

    if (this.pluginSelectorsEl.children.length >= 1) this.headerEl.appendChild(this.pluginSelectorsEl);
    this.updatePluginSelectors();
  }
  private fillFallbackBox(fallbackElement?: string) {
    this.emptyFallbackElement();
    const selectedPlugin = this.getSelectedPlugin()
    const fallbackPluginLabel =
      this.plugins[(fallbackElement || this.drawnPlugin) || '']?.label || fallbackElement || this.drawnPlugin;
    const selectedPluginLabel = selectedPlugin?.label || this.getSelectedPluginName;

    const textElement = document.createElement("p");
    textElement.innerText = `Could not render results with the ${selectedPluginLabel} plugin, the results currently are rendered with the ${fallbackPluginLabel} plugin. ${
      this.getSelectedPlugin()?.helpReference ? "See " : ""
    }`;

    if (selectedPlugin?.helpReference) {
      const linkElement = document.createElement("a");
      linkElement.innerText = `${selectedPluginLabel} documentation`;
      linkElement.href = selectedPlugin.helpReference;
      linkElement.rel = "noopener noreferrer";
      linkElement.target = "_blank";
      textElement.append(linkElement);
      textElement.innerHTML += " for more information.";
    }

    this.fallbackInfoEl.appendChild(textElement);
  }
  private drawPluginElement() {
    const spaceElement = document.createElement("div");
    addClass(spaceElement, "space_element");
    this.headerEl.appendChild(spaceElement);
    this.pluginControls = document.createElement("div");
    this.pluginControls.setAttribute("id", "yasr_plugin_control");
    addClass(this.pluginControls, "yasr_plugin_control");
    this.headerEl.appendChild(this.pluginControls);
  }

  private drawHeader() {
    this.drawPluginSelectors();
    this.drawResponseInfo();
    this.drawPluginElement();
    this.drawDownloadIcon();
    this.drawDocumentationButton();
  }
  private stringToBlob(string: string, contentType: string): string | undefined{
    if (this.stringToBlobSupported()) {
      var blob = new Blob([string], { type: contentType });
      return window.URL.createObjectURL(blob);
    }
  }
  private stringToBlobSupported() {
    return window.URL && Blob;
  }
  private downloadBtn: HTMLDivElement | undefined;
  private drawDownloadIcon() {
    if (!this.stringToBlobSupported()) return;
    this.downloadBtn = document.createElement("div");
    addClass(this.downloadBtn, "yasr_btn", "yasr_downloadIcon", "btn_icon");
    this.downloadBtn.appendChild(drawSvgStringAsElement(drawFontAwesomeIconAsSvg(faDownload)));
    this.downloadBtn.onclick = () => {
      if (hasClass(this.downloadBtn, "disabled")) return;
      this.download();
    };

    this.headerEl.appendChild(this.downloadBtn);
  }
  private dataElement!: HTMLDivElement;
  private drawResponseInfo() {
    this.dataElement = document.createElement("div");
    addClass(this.dataElement, "yasr_response_chip");
    this.headerEl.appendChild(this.dataElement);
    this.updateResponseInfo();
  }
  private updateResponseInfo() {
    var innerText = "";
    if (this.results) {
      removeClass(this.dataElement, "empty");
      const bindings = this.results.getBindings()
      if (bindings) {
        innerText += `${bindings.length} result${bindings.length === 1 ? "" : "s"}`; // Set amount of results
      }
      const responseTime = this.results.getResponseTime()
      if (responseTime) {
        if (!innerText) innerText = "Response";
        const time = responseTime / 1000;
        innerText += ` in ${time} second${time === 1 ? "" : "s"}`;
      }
    } else {
      addClass(this.dataElement, "empty");
    }
    this.dataElement.innerText = innerText;
  }
  private updateHelpButton() {
    const selectedPlugin = this.getSelectedPlugin()
    if (selectedPlugin?.helpReference) {
      this.documentationButton.href = selectedPlugin.helpReference;
      this.documentationButton.title = `View documentation of ${selectedPlugin.label ||
        this.getSelectedPluginName()}`;
      removeClass(this.documentationButton, "disabled");
    } else {
      addClass(this.documentationButton, "disabled");
      this.documentationButton.title =
        "This plugin doesn't have a help reference yet. Please contact the maintainer to fix this";
    }
  }
  updateExportHeaders() {
    if (this.downloadBtn && this.drawnPlugin) {

    this.downloadBtn.title = "";
    const plugin = this.plugins[this.drawnPlugin];
    if (plugin && plugin.download) {
      const downloadInfo = plugin.download();
      removeClass(this.downloadBtn, "disabled");
      if (downloadInfo) {
        if (downloadInfo.title) this.downloadBtn.title = downloadInfo.title;
        return;
      }
    }
    this.downloadBtn.title = "Download not supported";
    addClass(this.downloadBtn, "disabled");
  }
  }

  private documentationButton!: HTMLAnchorElement;
  private drawDocumentationButton() {
    this.documentationButton = document.createElement("a");
    addClass(this.documentationButton, "yasr_btn", "yasr_external_ref_btn");
    this.documentationButton.appendChild(drawSvgStringAsElement(drawFontAwesomeIconAsSvg(faQuestionCircle)));
    this.documentationButton.href = "//triply.cc/docs/yasgui";
    this.documentationButton.target = "_blank";
    this.documentationButton.rel = "noopener noreferrer";
    this.headerEl.appendChild(this.documentationButton); // We can do this as long as the help-element is the last item in the row
  }
  download() {
    if (!this.drawnPlugin) return
    const currentPlugin = this.plugins[this.drawnPlugin];
    if (currentPlugin && currentPlugin.download) {
      const downloadInfo = currentPlugin.download();
      if (!downloadInfo) return;
      const downloadUrl = this.stringToBlob(
        downloadInfo.getData(),
        downloadInfo.contentType ? downloadInfo.contentType : "text/plain"
      );
      if (downloadUrl) {
        const mockLink = document.createElement("a");
        mockLink.href = downloadUrl;
        mockLink.download = downloadInfo.filename;
        //simulate click
        if (document.dispatchEvent as any) {
          // W3C
          const oEvent = document.createEvent("MouseEvents");
          oEvent.initMouseEvent("click", true, true, window, 1, 1, 1, 1, 1, false, false, false, false, 0, mockLink);
          mockLink.dispatchEvent(oEvent);
        } else if ((<any>document).fireEvent) {
          // IE
          mockLink.click();
        }
      }

    }
  }

  public handleLocalStorageQuotaFull(_e: any) {
    console.warn("Localstorage quota exceeded. Clearing all queries");
    Yasr.clearStorage();
  }

  public getResponseFromStorage() {
    const storageId = this.getStorageId(this.config.persistenceLabelResponse);
    if (storageId) {
      return this.storage.get(storageId);
    }
  }
  public getPersistentConfig(): PersistentConfig {
    return {
      selectedPlugin: this.getSelectedPluginName(),
      pluginsConfig: mapValues(this.config.plugins, plugin => plugin.dynamicConfig)
    };
  }
  //This doesnt store the plugin complete config. Only those configs we want persisted
  public storePluginConfig(pluginName: string, conf: any) {
    this.config.plugins[pluginName].dynamicConfig = conf;
    this.storeConfig();
    this.emit("change", this);
  }
  private storeConfig() {
    const storageId = this.getStorageId(this.config.persistenceLabelConfig);
    if (storageId) {
      this.storage.set(
        storageId,
        this.getPersistentConfig(),
        this.config.persistencyExpire,
        this.handleLocalStorageQuotaFull
      );
    }
  }
  private storeResponse() {
    const storageId = this.getStorageId(this.config.persistenceLabelResponse);
    if (storageId && this.results) {
      const storeObj = this.results.getAsStoreObject(this.config.maxPersistentResponseSize);
      if (storeObj && !storeObj.error) {
        this.storage.set(storageId, storeObj, this.config.persistencyExpire, this.handleLocalStorageQuotaFull);
      } else {
        //remove old string;
        this.storage.remove(storageId);
      }
    }
  }
  public setResponse(data: any, duration?: number) {
    if (!data) return;
    this.results = new Parser(data, duration);

    this.draw();

    this.storeResponse();
  }

  private initializePlugins() {
    for (const plugin in this.config.plugins) {
      if (!this.config.plugins[plugin]) continue; //falsy value, so assuming it should be disabled
      if (Yasr.plugins[plugin]) {
        this.plugins[plugin] = new (<any>Yasr.plugins[plugin])(this);
      } else {
        console.warn("Wanted to initialize plugin " + plugin + " but could not find a matching registered plugin");
      }
    }
  }

  static defaults: Config = getDefaults();
  static plugins: { [key: string]: typeof Plugin & { defaults?: any } } = {};
  static registerPlugin(name: string, plugin: typeof Plugin, enable = true) {
    Yasr.plugins[name] = plugin;
    if (enable) {
      Yasr.defaults.plugins[name] = { enabled: true };
    } else {
      Yasr.defaults.plugins[name] = { enabled: false };
    }
  }
  /**
   * Collection of Promises to load external scripts used by Yasr Plugins
   * That way, the plugins wont load similar scripts simultaneously
   */
  static Dependencies: { [name: string]: Promise<any> } = {};
  static storageNamespace = "triply";
  static clearStorage() {
    const storage = new YStorage(Yasr.storageNamespace);
    storage.removeNamespace();
  }
}

export type Prefixes = { [prefixLabel: string]: string };
export interface PluginConfig {
  dynamicConfig?: any;
  staticConfig?: any;
  enabled?: boolean;
}
export interface Config {
  persistenceId: ((yasr: Yasr) => string) | string;
  persistenceLabelResponse: string;
  persistenceLabelConfig: string;
  maxPersistentResponseSize: number;
  persistencyExpire: number;
  getPlainQueryLinkToEndpoint: (() => string | undefined) | undefined;
  plugins: { [pluginName: string]: PluginConfig };
  pluginOrder: string[];
  defaultPlugin: string;

  prefixes: Prefixes | ((yasr: Yasr) => Prefixes);
}

export function registerPlugin(name: string, plugin: typeof Plugin, enable = true) {
  Yasr.plugins[name] = plugin;
  if (enable) {
    Yasr.defaults.plugins[name] = { enabled: true };
  } else {
    Yasr.defaults.plugins[name] = { enabled: false };
  }
}

import * as YasrPluginTable from "./plugins/table";
import * as YasrPluginBoolean from "./plugins/boolean";
import * as YasrPluginResponse from "./plugins/response";
import * as YasrPluginError from "./plugins/error";

Yasr.registerPlugin("table", YasrPluginTable.default as any);
Yasr.registerPlugin("boolean", YasrPluginBoolean.default as any);
Yasr.registerPlugin("response", YasrPluginResponse.default as any);
Yasr.registerPlugin("error", YasrPluginError.default as any);

export { Plugin, DownloadInfo } from "./plugins";

export default Yasr;
