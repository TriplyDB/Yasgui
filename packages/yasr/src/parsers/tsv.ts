import Parser from "./";

export default function (tsvString: string) {
  const lines = tsvString.split("\n");

  lines.pop(); //remove the last empty line

  const [headersString, ...sparqlDataStringArr] = lines;
  const headers = headersString.split("\t").map((header) => header.substring(1));

  const sparqlData = sparqlDataStringArr.map((row) => {
    const binding: Parser.Binding = {};
    for (const [index, value] of row.split("\t").entries()) {
      const bindingName = headers[index];
      if (value[0] === "<") {
        binding[bindingName] = { value: value.substring(1, value.length - 1), type: "uri" };
      } else if (value[0] === '"') {
        const lastDoubleQuote = value.lastIndexOf('"');
        const literalValue = value.substring(1, lastDoubleQuote);
        if (lastDoubleQuote === value.length - 1) binding[bindingName] = { value: literalValue, type: "literal" };
        else if (lastDoubleQuote < value.lastIndexOf("@")) {
          const langTag = value.substring(value.lastIndexOf("@") + 1);
          binding[bindingName] = { value: literalValue, type: "literal", "xml:lang": langTag };
        } else if (lastDoubleQuote < value.lastIndexOf("^^")) {
          const dataTag = value.substring(value.lastIndexOf("^^") + 2);
          binding[bindingName] = { value: literalValue, type: "typed-literal", datatype: dataTag };
        }
      }
    }
    return binding;
  });

  const sparqlResults: Parser.SparqlResults = {
    head: {
      vars: headers,
    },
    results: {
      bindings: sparqlData,
    },
  };

  return sparqlResults;
}
