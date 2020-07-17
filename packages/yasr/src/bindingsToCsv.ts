import Parser from "./parsers";
import * as json2csv from "json2csv";
import { mapValues } from "lodash-es";
export default function (result: Parser.SparqlResults) {
  const variables = result.head.vars;

  const querySolutions = result.results?.bindings;

  const json2csvParser = new json2csv.Parser({ fields: variables });

  return json2csvParser.parse(
    querySolutions
      ? querySolutions.map((s) => {
          return mapValues(s, (binding) => binding.value);
        })
      : []
  );
}
