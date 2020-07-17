import Parser from "./";
import { unescape, isEmpty } from "lodash-es";
function parseHead(node: ChildNode): Parser.SparqlResults["head"] {
  const head: Parser.SparqlResults["head"] = {
    vars: [],
  };
  for (let headNodeIt = 0; headNodeIt < node.childNodes.length; headNodeIt++) {
    const headNode = node.childNodes[headNodeIt] as Element;
    if (headNode.nodeName == "variable") {
      const name = headNode.getAttribute("name");
      if (name) head.vars.push(name);
    }
  }
  return head;
}

const allowedBindingValueTypes: Array<Parser.BindingValue["type"]> = ["uri", "literal", "bnode", "typed-literal"];
function parseResults(node: ChildNode, postProcessBinding: Parser.PostProcessBinding): Parser.SparqlResults["results"] {
  const results: Parser.SparqlResults["results"] = {
    bindings: [],
  };

  for (let resultIt = 0; resultIt < node.childNodes.length; resultIt++) {
    const resultNode = node.childNodes[resultIt];
    const binding: Parser.Binding = {};

    for (let bindingIt = 0; bindingIt < resultNode.childNodes.length; bindingIt++) {
      const bindingNode = resultNode.childNodes[bindingIt] as Element;
      if (bindingNode.nodeName == "binding") {
        const varName = bindingNode.getAttribute("name");
        if (varName) {
          for (let bindingInfIt = 0; bindingInfIt < bindingNode.childNodes.length; bindingInfIt++) {
            const bindingInf = bindingNode.childNodes[bindingInfIt] as Element;
            if (bindingInf.nodeName === "#text") continue;
            if (allowedBindingValueTypes.indexOf(bindingInf.nodeName as any) < 0) continue;
            const bindingValue: Parser.BindingValue = {
              type: bindingInf.nodeName as Parser.BindingValue["type"],
              value: unescape(bindingInf.innerHTML),
            };
            const dataType = bindingInf.getAttribute("datatype");
            if (dataType) bindingValue.datatype = dataType;
            binding[varName] = bindingValue;
          }
        }
      }
    }

    if (!isEmpty) {
    }
    if (!isEmpty(binding)) results.bindings.push(postProcessBinding(binding));
  }
  return results;
}

function parseBoolean(node: Element) {
  return node.innerHTML === "true";
}
export default function (
  xmlString: string,
  postProcessBinding: Parser.PostProcessBinding
): Parser.SparqlResults | undefined {
  if (typeof xmlString !== "string") return;
  const domParser = new DOMParser();
  let mainXml = domParser.parseFromString(xmlString, "text/xml");
  if (!mainXml.childNodes.length) return;

  const xml = mainXml.childNodes[0];

  const json: Partial<Parser.SparqlResults> = {};

  for (let i = 0; i < xml.childNodes.length; i++) {
    const node = xml.childNodes[i];
    if (node.nodeName == "head") json.head = parseHead(node as Element);
    if (node.nodeName == "results") json.results = parseResults(node as Element, postProcessBinding);
    if (node.nodeName == "boolean") json.boolean = parseBoolean(node as Element);
  }

  return json as Parser.SparqlResults;
}
