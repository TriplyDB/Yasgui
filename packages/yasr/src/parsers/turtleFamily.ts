import Parser from "./";
import * as N3 from "n3";

function n3TermToSparqlBinding(term: N3.Term): Parser.BindingValue {
  if (term.termType === "NamedNode") {
    return {
      value: term.value,
      type: "uri",
    };
  }
  if (term.termType === "Literal") {
    const bindingVal: Parser.BindingValue = {
      value: term.value,
      type: "literal",
    };
    const lang = term.language;
    if (lang) bindingVal["xml:lang"] = lang;
    const type = term.datatypeString;
    if (type) bindingVal.datatype = type;

    return bindingVal;
  }

  if (term.termType === "BlankNode") {
    return {
      value: term.value,
      type: "bnode",
    };
  }
  return {
    value: term.value,
    type: "uri",
  };
}
export default function (queryResponse: any): Parser.SparqlResults {
  const statements = getTurtleAsStatements(queryResponse);
  const vars = ["subject", "predicate", "object"];
  const bindings = statements.map((statement) => {
    const binding: Parser.Binding = {
      subject: n3TermToSparqlBinding(statement.subject),
      predicate: n3TermToSparqlBinding(statement.predicate),
      object: n3TermToSparqlBinding(statement.object),
    };
    return binding;
  });
  return {
    head: {
      vars: vars,
    },
    results: {
      bindings: bindings,
    },
  };
}
export function getTurtleAsStatements(queryResponse: any): N3.Quad[] {
  const parser = new N3.Parser();
  // When no the response has no body use an empty string
  const parsed = parser.parse(queryResponse || "");
  return parsed;
}
