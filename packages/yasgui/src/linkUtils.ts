const JsUri = require("jsuri");

import { default as Tab, PersistedJson } from "./Tab";
import { isFunction } from "lodash-es";
import Yasr from "@triply/yasr";
import { RequestConfig } from "@triply/yasqe";
var getUrlParams = function(_url?: string) {
  var urlFromWindow = false;
  if (!_url) {
    _url = window.location.href;
    urlFromWindow = true;
  }
  var url = new JsUri(_url);
  if (url.anchor().length > 0) {
    //firefox does some decoding if we're using window.location.hash (e.g. the + sign in contentType settings)
    //Don't want this. So simply get the hash string ourselves
    url.query(url.anchor());
    if (urlFromWindow) window.location.hash = ""; //clear hash
  }
  return url;
};

export type RequestArgs = { [argName: string]: string | string[] };
export function appendArgsToUrl(_url: string, args: RequestArgs): string {
  var url = new JsUri(_url);
  for (const arg in args) {
    const val = args[arg];
    if (Array.isArray(val)) {
      for (const subVal of val) {
        url.addQueryParam(arg, subVal);
      }
    } else {
      url.addQueryParam(arg, val);
    }
  }
  return url.toString();
}
export function createShareLink(forUrl: string, tab: Tab) {
  const currentUrl = new JsUri(forUrl);
  const tmpUrl = new JsUri();
  const configObject = createShareConfig(tab);
  let key: keyof ShareConfigObject; // Need to specify here because left hand side of a for..in cannot be typed
  for (key in configObject) {
    if (!configObject.hasOwnProperty(key)) continue;
    if (key === "namedGraphs") {
      configObject.namedGraphs.forEach(ng => tmpUrl.addQueryParam("namedGraph", ng));
    } else if (key === "defaultGraphs") {
      configObject.defaultGraphs.forEach(dg => tmpUrl.addQueryParam("defaultGraph", dg));
    } else if (key === "args") {
      const yasqe = tab.getYasqe();
      const args = typeof configObject.args === "function" ? configObject.args(yasqe) : configObject.args;
      args.forEach(arg => tmpUrl.addQueryParam(arg.name, arg.value));
    } else if (typeof configObject[key] === "object") {
      if (configObject[key]) tmpUrl.addQueryParam(key, JSON.stringify(configObject[key]));
    } else {
      if (configObject[key]) tmpUrl.addQueryParam(key, configObject[key]);
    }
  }

  //extend existing link, so first fetch current arguments. But: make sure we don't include items already used in share link
  // if (window.location.hash.length > 1) {
  const currentUrlParams = getUrlParams(forUrl);
  const currentParams: [string, string][] = (<any>currentUrlParams).queryPairs;
  currentParams.forEach(function(paramPair) {
    if (!tmpUrl.hasQueryParam(paramPair[0])) {
      tmpUrl.addQueryParam(paramPair[0], paramPair[1]);
    }
  });
  // }

  currentUrl.anchor(tmpUrl.query().substr(1));
  return currentUrl.toString();
}
export type ShareConfigObject = {
  query: string;
  endpoint: string;
  requestMethod: RequestConfig["method"];
  tabTitle: string;
  headers: RequestConfig["headers"];
  contentTypeConstruct: string;
  contentTypeSelect: string;
  args: RequestConfig["args"];
  namedGraphs: RequestConfig["namedGraphs"];
  defaultGraphs: RequestConfig["defaultGraphs"];
  outputFormat: string;
  outputSettings: any;
};

export function createShareConfig(tab: Tab): ShareConfigObject {
  const requestConfig = tab.getRequestConfig();
  const yasrPersistentSetting = tab.getPersistedJson().yasr.settings;
  return {
    query: tab.getQuery(),
    endpoint: tab.getEndpoint(),
    requestMethod: requestConfig.method,
    tabTitle: tab.getName(),
    headers: isFunction(requestConfig.headers) ? requestConfig.headers(tab.getYasqe()) : requestConfig.headers,
    contentTypeConstruct: isFunction(requestConfig.acceptHeaderGraph)
      ? requestConfig.acceptHeaderGraph(tab.getYasqe())
      : requestConfig.acceptHeaderGraph,
    contentTypeSelect: isFunction(requestConfig.acceptHeaderSelect)
      ? requestConfig.acceptHeaderSelect(tab.getYasqe())
      : requestConfig.acceptHeaderSelect,
    args: isFunction(requestConfig.args) ? requestConfig.args(tab.getYasqe()) : requestConfig.args,
    namedGraphs: requestConfig.namedGraphs,
    defaultGraphs: requestConfig.defaultGraphs,
    outputFormat: yasrPersistentSetting.selectedPlugin,
    outputSettings: yasrPersistentSetting.pluginsConfig[yasrPersistentSetting.selectedPlugin]
  };
}

export function getConfigFromUrl(defaults: PersistedJson, _url?: string): PersistedJson {
  const options = defaults;

  var url = getUrlParams(_url);
  var hasQuery = false;
  const currentParams: [string, string][] = (<any>url).queryPairs;
  var pluginsConfig: any;
  currentParams.forEach(function([key, value]) {
    if (key === "query") {
      hasQuery = true;
      options.yasqe.value = value;
    } else if (key === "outputFormat" && value.length) {
      if (Yasr.plugins[value]) {
        options.yasr.settings.selectedPlugin = value;
      } else {
        console.warn(`Output format plugin "${value}" not found`);
      }
    } else if (key == "outputSettings") {
      pluginsConfig = JSON.parse(value);
    } else if (key == "contentTypeConstruct") {
      options.requestConfig.acceptHeaderGraph = value;
    } else if (key == "contentTypeSelect") {
      options.requestConfig.acceptHeaderSelect = value;
    } else if (key == "endpoint") {
      options.requestConfig.endpoint = value;
    } else if (key == "requestMethod") {
      options.requestConfig.method = <any>value;
    } else if (key == "tabTitle") {
      options.name = value;
    } else if (key == "namedGraph") {
      if (!options.requestConfig.namedGraphs) options.requestConfig.namedGraphs = [];
      options.requestConfig.namedGraphs.push(value);
    } else if (key == "defaultGraph") {
      if (!options.requestConfig.defaultGraphs) options.requestConfig.defaultGraphs = [];
      options.requestConfig.defaultGraphs.push(value);
    } else if (key == "headers") {
      if (!options.requestConfig.headers) options.requestConfig.headers = {};
      options.requestConfig.headers = JSON.parse(value);
    } else {
      //regular arguments. So store them as regular arguments
      if (!options.requestConfig.args) options.requestConfig.args = [];
      (options.requestConfig.args as Array<{ name: string; value: string }>).push({ name: key, value: value });
    }
  });
  //Only know where to store the plugins config after we've saved the selected plugin
  //i.e., do this after the previous loop
  if (pluginsConfig && options.yasr.settings.selectedPlugin) {
    options.yasr.settings.pluginsConfig[options.yasr.settings.selectedPlugin] = pluginsConfig;
  }
  if (hasQuery) {
    return options;
  } else {
    return null;
  }
}

export function queryCatalogConfigToTabConfig<Q extends QueryCatalogConfig>(
  catalogConfig: Q,
  defaults?: PersistedJson
): PersistedJson {
  const options = defaults || Tab.getDefaults();
  if (catalogConfig.service) {
    options.requestConfig.endpoint = catalogConfig.service;
  }
  if (catalogConfig.requestConfig) {
    if (catalogConfig.requestConfig.payload) {
      if (catalogConfig.requestConfig.payload.query) {
        options.yasqe.value = catalogConfig.requestConfig.payload.query;
      }
      if (catalogConfig.requestConfig.payload["default-graph-uri"]) {
        options.requestConfig.defaultGraphs = Array.isArray(catalogConfig.requestConfig.payload["default-graph-uri"])
          ? catalogConfig.requestConfig.payload["default-graph-uri"]
          : [catalogConfig.requestConfig.payload["default-graph-uri"]];
      }
      if (catalogConfig.requestConfig.payload["named-graph-uri"]) {
        options.requestConfig.namedGraphs = Array.isArray(catalogConfig.requestConfig.payload["named-graph-uri"])
          ? catalogConfig.requestConfig.payload["named-graph-uri"]
          : [catalogConfig.requestConfig.payload["named-graph-uri"]];
      }
    }
    if (catalogConfig.requestConfig.headers) {
      options.requestConfig.headers = catalogConfig.requestConfig.headers;
    }
  }
  if (catalogConfig.renderConfig) {
    if (catalogConfig.renderConfig.output) {
      if (Yasr.plugins[catalogConfig.renderConfig.output]) {
        options.yasr.settings.selectedPlugin = catalogConfig.renderConfig.output;
      } else {
        console.warn(`Output format plugin "${catalogConfig.renderConfig.output}" not found`);
      }
    }
    if (catalogConfig.renderConfig.settings) {
      if (Yasr.plugins[catalogConfig.renderConfig.output]) {
        options.yasr.settings.pluginsConfig[catalogConfig.renderConfig.output] = catalogConfig.renderConfig.settings;
      } else {
        console.warn(`Output format plugin "${catalogConfig.renderConfig.output}" not found, cannot apply settings`);
      }
    }
  }
  if (catalogConfig.name) {
    options.name = catalogConfig.name;
  }
  return options;
}

export interface QueryCatalogConfig {
  service: string;
  name: string;
  description: string;
  requestConfig: {
    payload: {
      query: string;
      "default-graph-uri"?: string | string[];
      "named-graph-uri"?: string | string[];
    };
    headers?: {
      [key: string]: string;
    };
  };
  renderConfig?: {
    output: string;
    settings?: any;
  };
}
