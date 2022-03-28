/**
 * Make sure not to include any deps from our main index file. That way, we can easily publish the publin as standalone build
 */
import { Plugin } from "../";
import Yasr from "../../";
import { addClass } from "@triply/yasgui-utils";
require("./index.scss");

export default class Error implements Plugin<never> {
  private yasr: Yasr;
  constructor(yasr: Yasr) {
    this.yasr = yasr;
  }
  canHandleResults() {
    return !!this.yasr.results && !!this.yasr.results.getError();
  }
  private getTryBtn(link: string) {
    const tryBtn = document.createElement("a");
    tryBtn.href = link;
    tryBtn.rel = "noopener noreferrer";
    tryBtn.target = "_blank";
    tryBtn.className = "yasr_tryQuery";
    tryBtn.textContent = "Try query in a new browser window";
    return tryBtn;
  }
  private getCorsMessage() {
    const corsEl = document.createElement("div");
    corsEl.className = "redOutline";
    const mainMsg = document.createElement("p");
    mainMsg.textContent = "Unable to get response from endpoint. Possible reasons:";
    corsEl.appendChild(mainMsg);

    const list = document.createElement("ul");
    const incorrectEndpoint = document.createElement("li");
    incorrectEndpoint.textContent = "Incorrect endpoint URL";
    list.appendChild(incorrectEndpoint);

    const endpointDown = document.createElement("li");
    endpointDown.textContent = "Endpoint is down";
    list.appendChild(endpointDown);

    const cors = document.createElement("li");
    const firstPart = document.createElement("span");
    firstPart.textContent = "Endpoint is not accessible from the YASGUI server and website, and the endpoint is not ";
    cors.appendChild(firstPart);
    const secondPart = document.createElement("a");
    secondPart.textContent = "CORS-enabled";
    secondPart.href = "http://enable-cors.org/";
    secondPart.target = "_blank";
    secondPart.rel = "noopener noreferrer";
    cors.appendChild(secondPart);
    list.appendChild(cors);

    corsEl.appendChild(list);
    return corsEl;
  }
  async draw() {
    const el = document.createElement("div");
    el.className = "errorResult";
    this.yasr.resultsEl.appendChild(el);

    const error = this.yasr.results?.getError();
    if (!error) return;
    const header = document.createElement("div");
    header.className = "errorHeader";
    el.appendChild(header);

    // Try whether a custom rendering of the error exists
    const newMessage = await this.yasr.renderError(error);
    if (newMessage) {
      const customMessage = document.createElement("div");
      customMessage.className = "redOutline";
      customMessage.appendChild(newMessage);
      el.appendChild(customMessage);
      return;
    }

    // No custom rendering? Let's render it ourselves!
    if (error.status) {
      var statusText = "Error";
      if (error.statusText && error.statusText.length < 100) {
        //use a max: otherwise the alert span will look ugly
        statusText = error.statusText;
      }
      statusText += ` (#${error.status})`;
      const statusTextEl = document.createElement("span");
      statusTextEl.className = "status";
      statusTextEl.textContent = statusText;

      header.appendChild(statusTextEl);
      if (this.yasr.config.getPlainQueryLinkToEndpoint) {
        const link = this.yasr.config.getPlainQueryLinkToEndpoint();
        if (link) header.appendChild(this.getTryBtn(link));
      }

      if (error.text) {
        const textContainer = document.createElement("div");
        addClass(textContainer, "errorMessageContainer");
        el.appendChild(textContainer);
        const errTextEl = document.createElement("pre");
        addClass(errTextEl, "errorMessage");
        errTextEl.textContent = error.text;
        textContainer.appendChild(errTextEl);
      }
    } else {
      if (this.yasr.config.getPlainQueryLinkToEndpoint) {
        const link = this.yasr.config.getPlainQueryLinkToEndpoint();
        if (link) header.appendChild(this.getTryBtn(link));
      }
      if (!error.text || error.text.indexOf("Request has been terminated") >= 0) {
        el.appendChild(this.getCorsMessage());
      } else {
        const errTextEl = document.createElement("pre");
        errTextEl.textContent = error.text;
        el.appendChild(errTextEl);
      }
    }
  }
  getIcon() {
    return document.createElement("");
  }
  priority = 20;
  hideFromSelection = true;
}
