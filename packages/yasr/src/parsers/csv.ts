import Parser from "./";
import * as Papa from "papaparse";

export default function (csvString: string) {
  const csvStringToJsonObject = Papa.parse(csvString, { header: true, skipEmptyLines: true });
  if (csvStringToJsonObject.meta.fields === undefined) {
    throw new Error("Could not parse CSV, no headers found!");
  }
  const header = csvStringToJsonObject.meta.fields;
  const lines = csvStringToJsonObject.data as Record<string, string>[];

  const sparqlData = lines.map((row) => {
    const bindingObject: Parser.Binding = {};
    for (const variable in row) {
      bindingObject[variable] = { value: row[variable], type: "literal" };
    }
    return bindingObject;
  });

  const sparqlResults: Parser.SparqlResults = {
    head: {
      vars: header,
    },
    results: {
      bindings: sparqlData,
    },
  };

  return sparqlResults;
}
