import Parser from "./";
export default function (queryResponse: any, postProcessBinding: Parser.PostProcessBinding): Parser.SparqlResults {
  if (typeof queryResponse == "string") {
    const json = JSON.parse(queryResponse);
    if (postProcessBinding) {
      for (const binding in json.results.bindings) {
        json.results.bindings[binding] = postProcessBinding(json.results.bindings[binding]);
      }
    }
    return json;
  }
  if (typeof queryResponse == "object" && queryResponse.constructor === {}.constructor) {
    // an ASK-query only returns a "boolean" field so we should check if are undefined here
    if (postProcessBinding && queryResponse.results) {
      for (const binding in queryResponse.results.bindings) {
        queryResponse.results.bindings[binding] = postProcessBinding(queryResponse.results.bindings[binding]);
      }
    }
    return queryResponse;
  }
  throw new Error("Could not parse json");
}
