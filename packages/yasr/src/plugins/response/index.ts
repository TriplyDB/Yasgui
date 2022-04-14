/**
 * Make sure not to include any deps from our main index file. That way, we can easily publish the publin as standalone build
 */
import { Plugin } from "../";
import Yasr from "../../";
require("./index.scss");
const CodeMirror = require("codemirror");
require("codemirror/addon/fold/foldcode.js");
require("codemirror/addon/fold/foldgutter.js");
require("codemirror/addon/fold/xml-fold.js");
require("codemirror/addon/fold/brace-fold.js");

require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/mode/xml/xml.js");

require("codemirror/mode/javascript/javascript.js");
require("codemirror/lib/codemirror.css");
import { drawSvgStringAsElement, addClass, removeClass, drawFontAwesomeIconAsSvg } from "@triply/yasgui-utils";
import * as faAlignIcon from "@fortawesome/free-solid-svg-icons/faAlignLeft";
import { DeepReadonly } from "ts-essentials";
import * as imgs from "../../imgs";

export interface PluginConfig {
  maxLines: number;
}
export default class Response implements Plugin<PluginConfig> {
  private yasr: Yasr;
  label = "Response";
  priority = 2;
  helpReference = "https://triply.cc/docs/yasgui#response";
  private config: DeepReadonly<PluginConfig>;
  private overLay: HTMLDivElement | undefined;
  private cm: CodeMirror.Editor | undefined;
  constructor(yasr: Yasr) {
    this.yasr = yasr;
    this.config = Response.defaults;
    if (yasr.config.plugins["response"] && yasr.config.plugins["response"].dynamicConfig) {
      this.config = {
        ...this.config,
        ...yasr.config.plugins["response"].dynamicConfig,
      };
    }
  }
  // getDownloadInfo: getDownloadInfo
  canHandleResults() {
    if (!this.yasr.results) return false;
    if (!this.yasr.results.getOriginalResponseAsString) return false;
    var response = this.yasr.results.getOriginalResponseAsString();
    if ((!response || response.length == 0) && this.yasr.results.getError()) return false; //in this case, show exception instead, as we have nothing to show anyway
    return true;
  }
  public getIcon() {
    return drawSvgStringAsElement(drawFontAwesomeIconAsSvg(faAlignIcon));
  }
  download(filename?: string) {
    if (!this.yasr.results) return;
    const contentType = this.yasr.results.getContentType();
    const type = this.yasr.results.getType();
    const extension = type === "xml" ? "rdf" : type;
    return {
      getData: () => {
        return this.yasr.results?.getOriginalResponseAsString() || "";
      },
      filename: `${filename || "queryResults"}${extension ? "." + extension : ""}`,
      contentType: contentType ? contentType : "text/plain",
      title: "Download result",
    };
  }
  draw(persistentConfig: PluginConfig) {
    const config: DeepReadonly<PluginConfig> = {
      ...this.config,
      ...persistentConfig,
    };
    // When the original response is empty, use an empty string
    let value = this.yasr.results?.getOriginalResponseAsString() || "";
    const lines = value.split("\n");
    if (lines.length > config.maxLines) {
      value = lines.slice(0, config.maxLines).join("\n");
    }

    const codemirrorOpts: Partial<CodeMirror.EditorConfiguration> = {
      readOnly: true,
      lineNumbers: true,
      lineWrapping: true,
      foldGutter: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      value: value,
      extraKeys: { Tab: false },
    };
    const mode = this.yasr.results?.getType();
    if (mode === "json") {
      codemirrorOpts.mode = { name: "javascript", json: true };
    }

    this.cm = CodeMirror(this.yasr.resultsEl, codemirrorOpts);
    // Don't show less originally we've already set the value in the codemirrorOpts
    if (lines.length > config.maxLines) this.showLess(false);
  }
  private limitData(value: string) {
    const lines = value.split("\n");
    if (lines.length > this.config.maxLines) {
      value = lines.slice(0, this.config.maxLines).join("\n");
    }
    return value;
  }
  /**
   *
   * @param setValue Optional, if set to false the string will not update
   */
  showLess(setValue = true) {
    if (!this.cm) return;
    // Add overflow
    addClass(this.cm.getWrapperElement(), "overflow");

    // Remove old instance
    if (this.overLay) {
      this.overLay.remove();
      this.overLay = undefined;
    }

    // Wrapper
    this.overLay = document.createElement("div");
    addClass(this.overLay, "overlay");

    // overlay content
    const overlayContent = document.createElement("div");
    addClass(overlayContent, "overlay_content");

    const showMoreButton = document.createElement("button");
    showMoreButton.title = "Show all";
    addClass(showMoreButton, "yasr_btn", "overlay_btn");
    showMoreButton.textContent = "Show all";
    showMoreButton.addEventListener("click", () => this.showMore());
    overlayContent.append(showMoreButton);

    const downloadButton = document.createElement("button");
    downloadButton.title = "Download result";
    addClass(downloadButton, "yasr_btn", "overlay_btn");

    const text = document.createElement("span");
    text.innerText = "Download result";
    downloadButton.appendChild(text);
    downloadButton.appendChild(drawSvgStringAsElement(imgs.download));
    downloadButton.addEventListener("click", () => this.yasr.download());
    downloadButton.addEventListener("keydown", (event) => {
      if (event.code === "Space" || event.code === "Enter") this.yasr.download();
    });

    overlayContent.appendChild(downloadButton);
    this.overLay.appendChild(overlayContent);
    this.cm.getWrapperElement().appendChild(this.overLay);
    if (setValue) {
      this.cm.setValue(this.limitData(this.yasr.results?.getOriginalResponseAsString() || ""));
    }
  }
  /**
   * Render the raw response full length
   */
  showMore() {
    if (!this.cm) return;
    removeClass(this.cm.getWrapperElement(), "overflow");
    this.overLay?.remove();
    this.overLay = undefined;
    this.cm.setValue(this.yasr.results?.getOriginalResponseAsString() || "");
    this.cm.refresh();
  }
  public static defaults: PluginConfig = {
    maxLines: 30,
  };
}
