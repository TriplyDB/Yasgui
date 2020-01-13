import { default as Yasqe, Config, RequestConfig } from "./";
import * as superagent from "superagent";
import { merge, isFunction } from "lodash-es";
import * as queryString from "query-string";
export type YasqeAjaxConfig = Config["requestOpts"];
export interface PopulatedAjaxConfig {
  url: string;
  reqMethod: "POST" | "GET";
  headers: { [key: string]: string };
  accept: string;
  args: RequestArgs;
  withCredentials: boolean;
}
function getRequestConfigSettings(yasqe: Yasqe, conf: Partial<Config["requestOpts"]>): RequestConfig {
  return isFunction(conf) ? conf(yasqe) : conf;
}
// type callback = AjaxConfig.callbacks['complete'];
export function getAjaxConfig(yasqe: Yasqe, _config: Partial<Config["requestOpts"]> = {}): PopulatedAjaxConfig {
  const config: RequestConfig = merge(
    {},
    getRequestConfigSettings(yasqe, yasqe.config.requestOpts),
    getRequestConfigSettings(yasqe, _config)
  );
  if (!config.endpoint || config.endpoint.length == 0) return; // nothing to query!

  var queryMode = yasqe.getQueryMode();
  /**
   * initialize ajax config
   */
  const endpoint = isFunction(config.endpoint) ? config.endpoint(yasqe) : config.endpoint;
  var reqMethod: "GET" | "POST" =
    queryMode == "update" ? "POST" : isFunction(config.method) ? config.method(yasqe) : config.method;
  const headers = isFunction(config.headers) ? config.headers(yasqe) : config.headers;
  return {
    reqMethod,
    url: endpoint,
    args: getUrlArguments(yasqe, config),
    headers: headers,
    accept: getAcceptHeader(yasqe, config),
    withCredentials: config.withCredentials
  };
  /**
   * merge additional request headers
   */
}

export function executeQuery(yasqe: Yasqe, config?: YasqeAjaxConfig): Promise<any> {
  const populatedConfig = getAjaxConfig(yasqe, config);
  var queryStart = Date.now();

  var req: superagent.SuperAgentRequest;
  if (populatedConfig.reqMethod === "POST") {
    req = superagent
      .post(populatedConfig.url)
      .type("form")
      .send(populatedConfig.args);
  } else {
    req = superagent.get(populatedConfig.url).query(populatedConfig.args);
  }
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  req.accept(populatedConfig.accept).set(populatedConfig.headers);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  if (populatedConfig.withCredentials) req.withCredentials();
  yasqe.emit("query", req, populatedConfig);
  return req.then(
    result => {
      yasqe.emit("queryResponse", result, Date.now() - queryStart);
      yasqe.emit("queryResults", result.body, Date.now() - queryStart);
      return result.body;
    },
    e => {
      yasqe.emit("queryResponse", e, Date.now() - queryStart);
      yasqe.emit("error", e);
      throw e;
    }
  );
}

export type RequestArgs = { [argName: string]: string | string[] };
export function getUrlArguments(yasqe: Yasqe, _config: Config["requestOpts"]): RequestArgs {
  var queryMode = yasqe.getQueryMode();

  var data: RequestArgs = {};
  const config: RequestConfig = getRequestConfigSettings(yasqe, _config);
  var queryArg = isFunction(config.queryArgument) ? config.queryArgument(yasqe) : config.queryArgument;
  if (!queryArg) queryArg = yasqe.getQueryMode();
  data[queryArg] = config.adjustQueryBeforeRequest ? config.adjustQueryBeforeRequest(yasqe) : yasqe.getValue();

  /**
   * add named graphs to ajax config
   */
  if (config.namedGraphs && config.namedGraphs.length > 0) {
    let argName = queryMode === "query" ? "named-graph-uri" : "using-named-graph-uri ";
    data[argName] = config.namedGraphs;
  }
  /**
   * add default graphs to ajax config
   */
  if (config.defaultGraphs && config.defaultGraphs.length > 0) {
    let argName = queryMode == "query" ? "default-graph-uri" : "using-graph-uri ";
    data[argName] = config.namedGraphs;
  }

  /**
   * add additional request args
   */
  const args = isFunction(config.args) ? config.args(yasqe) : config.args;
  if (args && args.length > 0)
    merge(
      data,
      args.reduce((argsObject: { [key: string]: string[] }, arg) => {
        argsObject[arg.name] ? argsObject[arg.name].push(arg.value) : (argsObject[arg.name] = [arg.value]);
        return argsObject;
      }, {})
    );

  return data;
}
export function getAcceptHeader(yasqe: Yasqe, _config: Config["requestOpts"]) {
  const config: RequestConfig = getRequestConfigSettings(yasqe, _config);
  var acceptHeader = null;
  if (yasqe.getQueryMode() == "update") {
    acceptHeader = isFunction(config.acceptHeaderUpdate) ? config.acceptHeaderUpdate(yasqe) : config.acceptHeaderUpdate;
  } else {
    var qType = yasqe.getQueryType();
    if (qType == "DESCRIBE" || qType == "CONSTRUCT") {
      acceptHeader = isFunction(config.acceptHeaderGraph) ? config.acceptHeaderGraph(yasqe) : config.acceptHeaderGraph;
    } else {
      acceptHeader = isFunction(config.acceptHeaderSelect)
        ? config.acceptHeaderSelect(yasqe)
        : config.acceptHeaderSelect;
    }
  }
  return acceptHeader;
}
export function getAsCurlString(yasqe: Yasqe, _config: Config["requestOpts"]) {
  var ajaxConfig = getAjaxConfig(yasqe, getRequestConfigSettings(yasqe, _config));
  var url = ajaxConfig.url;
  if (ajaxConfig.url.indexOf("http") !== 0) {
    //this is either a relative or absolute url, which is not supported by CURL.
    //Add domain, schema, etc etc
    var url = window.location.protocol + "//" + window.location.host;
    if (ajaxConfig.url.indexOf("/") === 0) {
      //its an absolute path
      url += ajaxConfig.url;
    } else {
      //relative, so append current location to url first
      url += window.location.pathname + ajaxConfig.url;
    }
  }
  var cmds: string[] = ["curl", url, "-X", ajaxConfig.reqMethod];
  if (ajaxConfig.reqMethod == "POST") {
    cmds.push(`--data '${queryString.stringify(ajaxConfig.args)}'`);
  }
  for (var header in ajaxConfig.headers) {
    cmds.push(`-H  '${header} : ${ajaxConfig.headers[header]}'`);
  }
  return cmds.join(" ");
}
