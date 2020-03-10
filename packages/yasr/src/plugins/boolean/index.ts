/**
 * Make sure not to include any deps from our main index file. That way, we can easily publish the publin as standalone build
 */
import Yasr from "../../";
import { Plugin } from "../";
require("./index.scss");
export interface PluginConfig {}
import { drawSvgStringAsElement } from "@triply/yasgui-utils";
const cross =
  '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" width="30" height="30" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><g><path d="M83.288,88.13c-2.114,2.112-5.575,2.112-7.689,0L53.659,66.188c-2.114-2.112-5.573-2.112-7.687,0L24.251,87.907 c-2.113,2.114-5.571,2.114-7.686,0l-4.693-4.691c-2.114-2.114-2.114-5.573,0-7.688l21.719-21.721c2.113-2.114,2.113-5.573,0-7.686 L11.872,24.4c-2.114-2.113-2.114-5.571,0-7.686l4.842-4.842c2.113-2.114,5.571-2.114,7.686,0L46.12,33.591 c2.114,2.114,5.572,2.114,7.688,0l21.721-21.719c2.114-2.114,5.573-2.114,7.687,0l4.695,4.695c2.111,2.113,2.111,5.571-0.003,7.686 L66.188,45.973c-2.112,2.114-2.112,5.573,0,7.686L88.13,75.602c2.112,2.111,2.112,5.572,0,7.687L83.288,88.13z"/></g></svg>';
const check =
  '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" width="30" height="30" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><path d="M14.301,49.982l22.606,17.047L84.361,4.903c2.614-3.733,7.76-4.64,11.493-2.026l0.627,0.462 c3.732,2.614,4.64,7.758,2.025,11.492l-51.783,79.77c-1.955,2.791-3.896,3.762-7.301,3.988c-3.405,0.225-5.464-1.039-7.508-3.084 L2.447,61.814c-3.263-3.262-3.263-8.553,0-11.814l0.041-0.019C5.75,46.718,11.039,46.718,14.301,49.982z"/></svg>';

export default class Boolean implements Plugin<PluginConfig> {
  private yasr: Yasr;
  public priority = 10;
  hideFromSelection = true;
  constructor(yasr: Yasr) {
    this.yasr = yasr;
  }
  draw() {
    const el = document.createElement("div");
    el.className = "booleanResult";

    const boolVal = this.yasr.results?.getBoolean();
    el.appendChild(drawSvgStringAsElement(boolVal ? check : cross));
    const textEl = document.createElement("span");
    textEl.textContent = boolVal ? "True" : "False";
    el.appendChild(textEl);

    this.yasr.resultsEl.appendChild(el);
  }
  canHandleResults() {
    return (
      !!this.yasr.results?.getBoolean &&
      (this.yasr.results.getBoolean() === true || this.yasr.results.getBoolean() == false)
    );
  }
  getIcon() {
    return document.createElement("");
  }
}
