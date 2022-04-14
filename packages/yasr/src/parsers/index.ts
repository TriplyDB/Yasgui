import * as SuperAgent from "superagent";
import SparqlJsonParser from "./json";
import TurtleParser, { getTurtleAsStatements } from "./turtleFamily";
import SparqlXmlParser from "./xml";
import SparqlCsvParser from "./csv";
import SparqlTsvParser from "./tsv";
import bindingsToCsv from "../bindingsToCsv";
import { cloneDeep } from "lodash-es";
import N3 from "n3";

namespace Parser {
  export interface ErrorSummary {
    status?: number;
    text: string;
    statusText?: string;
  }
  export interface BindingValue {
    value: string;
    type: "uri" | "literal" | "typed-literal" | "bnode";
    datatype?: string;
    "xml:lang"?: string;
  }
  export interface Binding {
    [varname: string]: BindingValue;
  }
  export interface SparqlResults {
    head: {
      vars: string[];
    };
    boolean?: boolean;
    results?: {
      bindings: Binding[];
    };
  }
  //a json response summary, that we can store in localstorage
  export interface ResponseSummary {
    data?: any;
    error?: ErrorSummary;
    status?: number;
    contentType?: string;
    executionTime?: number;
  }
  export type PostProcessBinding = (binding: Binding) => Binding;
}
const applyMustacheToLiterals: Parser.PostProcessBinding = (binding: Parser.Binding) => {
  for (const lit in binding) {
    if (binding[lit].type === "uri") continue;
    binding[lit].value = binding[lit].value.replace(/{{(.*?)}}/g, (variable) => {
      variable = variable.substring(2, variable.length - 2).trim();
      if (binding[variable]) {
        return binding[variable].value;
      } else {
        return variable;
      }
    });
  }
  return binding;
};
class Parser {
  private res: SuperAgent.Response | undefined;
  private summary: Parser.ResponseSummary | undefined;
  private errorSummary: Parser.ErrorSummary | undefined;
  // Contrary to the typings, statusText is part of responseError
  private error: Error | (SuperAgent.ResponseError & { response: { statusText: string } }) | undefined;
  private type: "json" | "xml" | "csv" | "tsv" | "ttl" | undefined;
  private executionTime: number | undefined;
  constructor(responseOrObject: Parser.ResponseSummary | SuperAgent.Response | Error | any, executionTime?: number) {
    if (responseOrObject.executionTime) this.executionTime = responseOrObject.executionTime;
    if (executionTime) this.executionTime = executionTime; // Parameter has priority
    if (responseOrObject instanceof Error) {
      this.error = responseOrObject;
    } else if ((<any>responseOrObject).xhr) {
      this.setResponse(<SuperAgent.Response>responseOrObject);
    } else {
      this.setSummary(<Parser.ResponseSummary>responseOrObject);
    }
  }
  public setResponse(res: SuperAgent.Response) {
    this.res = res;
  }
  public setSummary(summary: Parser.ResponseSummary | any) {
    if (!summary.data && !summary.error) {
      //This isnt a summary object, just try to recreate a summary object ourselves (assuming we're just passed a sparql-result object directly)
      this.summary = {
        data: summary,
      };
    } else {
      this.summary = summary;
    }
  }

  public hasError() {
    if (this.res && this.res.status >= 400) return true;
    if (this.errorSummary) return true;
    if (this.error) return true;
    if (this.summary && this.summary.error) return true;
    return false;
  }
  public getError() {
    if (!this.errorSummary) {
      if (this.res && this.res.status >= 400) {
        this.errorSummary = {
          text: this.res.text,
          status: this.res.status,
          statusText: this.res.error ? this.res.error.text : undefined,
        };
      }
      if (this.summary && this.summary.error) {
        this.errorSummary = this.summary.error;
      }
      if (this.error) {
        if ("response" in this.error && this.error.response !== undefined) {
          this.errorSummary = {
            text: this.error.response.text,
            status: this.error.response.status,
            statusText: this.error.response.statusText,
          };
          if (
            this.error.response.body &&
            typeof this.error.response.body === "object" &&
            "message" in this.error.response.body
          ) {
            this.errorSummary.text = this.error.response.body.message;
          }
        } else {
          this.errorSummary = {
            text: this.error.message,
          };
        }
      }
    }
    return this.errorSummary;
  }
  public getContentType() {
    if (this.res) return this.res.header["content-type"];
    if (this.summary) return this.summary.contentType;
  }
  private json: false | Parser.SparqlResults | undefined;
  getAsJson() {
    if (this.json) return this.json;
    if (this.json === false || this.hasError()) return; //already tried parsing this, and failed. do not try again...
    if (this.getParserFromContentType()) return this.json;
    if (this.doLuckyGuess()) return this.json;

    if (!this.json) this.json = false; //explicitly set to false, so we don't try to parse this thing again..
    return this.json;
  }
  private getData(): any {
    if (this.res) {
      if (this.res.body) return this.res.body;
      if (this.res.text) return this.res.text; //probably a construct or something
    }
    if (this.summary) return this.summary.data;
  }
  public getResponseTime() {
    return this.executionTime;
  }
  private getParserFromContentType(): boolean {
    const contentType = this.getContentType();
    if (contentType) {
      const data = cloneDeep(this.getData());
      try {
        if (contentType.indexOf("json") > -1) {
          if (contentType.indexOf("sparql-results+json") >= 0) {
            this.json = SparqlJsonParser(data, applyMustacheToLiterals);
            this.type = "json";
            return true;
          } else if (contentType.indexOf("application/rdf+json") > -1) {
            this.type = "json";
            return true;
          }
          this.type = "json";
        } else if (contentType.indexOf("xml") > -1) {
          this.json = SparqlXmlParser(data, applyMustacheToLiterals);
          this.type = "xml";
          return true;
        } else if (contentType.indexOf("csv") > -1) {
          this.json = SparqlCsvParser(data);
          this.type = "csv";
          return true;
        } else if (contentType.indexOf("tab-separated") > -1) {
          this.json = SparqlTsvParser(data);
          this.type = "tsv";
          return true;
        } else if (
          contentType.indexOf("turtle") > 0 ||
          contentType.indexOf("trig") > 0 ||
          contentType.indexOf("triple") > 0 ||
          contentType.indexOf("quad") > 0
        ) {
          this.json = TurtleParser(data);
          this.type = "ttl";
          return true;
        }
      } catch (e) {
        if (e instanceof Error) {
          this.errorSummary = { text: e.message };
        } else {
          this.errorSummary = { text: e as any };
        }
      }
    }
    return false;
  }
  private doLuckyGuess(): boolean {
    const data = cloneDeep(this.getData());
    try {
      this.json = SparqlJsonParser(data, applyMustacheToLiterals);
      this.type = "json";
      return true;
    } catch {}
    try {
      this.json = SparqlXmlParser(data, applyMustacheToLiterals);
      this.type = "xml";
      return true;
    } catch {}
    return false;
  }

  public getVariables(): string[] {
    const json = this.getAsJson();

    if (json && json.head) return json.head.vars;

    return [];
  }

  public getBoolean(): boolean | undefined {
    const json = this.getAsJson();
    if (json && "boolean" in json) return json.boolean;
  }

  public getBindings() {
    const json = this.getAsJson();
    if (json && json.results) return json.results.bindings;
    else return null;
  }
  private statements: false | N3.Quad[] | undefined;
  public getStatements() {
    if (!this.statements && this.type === "ttl") {
      this.statements = getTurtleAsStatements(this.getData());
    }
    if (this.statements) return this.statements;
    return null;
  }
  getOriginalResponseAsString(): string {
    const data = this.getData();
    if (typeof data === "string") {
      return data;
    } else if (this.type === "json") {
      return JSON.stringify(data, undefined, 2);
    }
    return data;
  }

  getOriginalResponse() {
    return this.res?.body;
  }

  getType() {
    if (!this.type) this.getAsJson(); //detects type as well
    return this.type;
  }
  getStatus(): number | undefined {
    if (this.res) return this.res.status;
    if (this.summary) return this.summary.status;
  }

  //process the input parameters in such a way that we can store it in local storage (i.e., no function)
  //and, make sure we can easily pass it on back to this wrapper function when loading it again from storage
  //When an object is too large to store, this method returns undefined
  public getAsStoreObject(maxResponseSize: number): Parser.ResponseSummary | undefined {
    let summary = this.summary;
    if (!summary && this.res) {
      summary = {
        contentType: this.getContentType(),
        data: this.getOriginalResponseAsString(),
        error: this.getError(),
        status: this.getStatus(),
        executionTime: this.getResponseTime(),
      };
    }
    if (summary) {
      //if data is set, it should be less than max limit. If not set, it's probably a response error that we'd like to store as well
      if (summary.data && summary.data.length > maxResponseSize) {
        return undefined;
      }
      return summary;
    }
    if (this.error) {
      return {
        error: this.getError(),
        executionTime: this.getResponseTime(),
      };
    }
  }

  public asCsv() {
    const json = this.getAsJson();
    if (this.type === "csv") return this.getOriginalResponseAsString();
    if (json && json.results) {
      return bindingsToCsv(json);
    }
  }
}
export default Parser;
