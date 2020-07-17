import { Config } from "./";
export default function get(): Config {
  return {
    persistenceId: function (yasr) {
      //Traverse parents untl we've got an id
      // Get matching parent elements
      var id = "";
      var elem: any = yasr.rootEl;
      if ((<any>elem).id) id = (<any>elem).id;
      for (; elem && elem !== <any>document; elem = elem.parentNode) {
        if (elem) {
          if ((<any>elem).id) id = (<any>elem).id;
          break;
        }
      }
      return "yasr_" + id;
    },
    getPlainQueryLinkToEndpoint: undefined,
    persistencyExpire: 60 * 60 * 24 * 30,
    persistenceLabelResponse: "response",
    persistenceLabelConfig: "config",
    maxPersistentResponseSize: 100000,
    prefixes: {},
    plugins: {},
    pluginOrder: ["table", "response"], // Default plugins, others are sorted alphabetically
    defaultPlugin: "table",
  };
}
