import { addClass, drawSvgStringAsElement, removeClass } from "@triply/yasgui-utils";
import "./TabPanel.scss";
import Tab from "./Tab";

const AcceptOptionsMap: { key: string; value: string }[] = [
  { key: "JSON", value: "application/sparql-results+json" },
  { key: "XML", value: "application/sparql-results+xml" },
  { key: "CSV", value: "text/csv" },
  { key: "TSV", value: "text/tab-separated-values" }
];
const AcceptHeaderGraphMap: { key: string; value: string }[] = [
  { key: "Turtle", value: "text/turtle" },
  { key: "JSON", value: "application/rdf+json" },
  { key: "RDF/XML", value: "application/rdf+xml" },
  { key: "TriG", value: "application/trig" },
  { key: "N-Triples", value: "application/n-triples" },
  { key: "N-Quads", value: "application/n-quads" },
  { key: "CSV", value: "text/csv" },
  { key: "TSV", value: "text/tab-separated-values" }
];
export default class TabMenu {
  menuElement: HTMLElement;
  settingsButton: HTMLElement;
  tab: Tab;
  rootEl: HTMLElement;
  isOpen: boolean;
  // We make a local copy for the following arguments in order to keep the elements
  args: { name: string; value: string }[];
  headers: { name: string; value: string }[];
  defaultGraphs: string[];
  namedGraphs: string[];
  constructor(tab: Tab, rootEl: HTMLElement, controlBarEl: HTMLElement) {
    this.tab = tab;
    this.rootEl = rootEl;
    this.isOpen = false;
    const requestConfig = tab.getRequestConfig();
    this.args = typeof requestConfig.args === 'function'?requestConfig.args(tab.getYasqe()):requestConfig.args;
    const headers= typeof requestConfig.headers === 'function'?requestConfig.headers(tab.getYasqe()):requestConfig.headers;
    this.headers = Object.keys(headers).map(key => {
      return { name: key, value: headers[key] };
    });
    this.defaultGraphs = requestConfig.defaultGraphs;
    this.namedGraphs = requestConfig.namedGraphs;
    this.init(controlBarEl);
  }
  private init(controlBarEl: HTMLElement) {
    this.settingsButton = document.createElement("div");
    this.settingsButton.appendChild(
      drawSvgStringAsElement(
        `<svg width="100.06" height="100.05" data-name="Layer 1" version="1.1" viewBox="0 0 100.06 100.05" xmlns="http://www.w3.org/2000/svg" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <metadata>
         <rdf:RDF>
          <cc:Work rdf:about="">
           <dc:format>image/svg+xml</dc:format>
           <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>
           <dc:title>Settings</dc:title>
          </cc:Work>
         </rdf:RDF>
        </metadata>
        <title>Settings</title>
        <path d="m95.868 58.018-3-3.24a42.5 42.5 0 0 0 0-9.43l3-3.22c1.79-1.91 5-4.44 4-6.85l-4.11-10c-1-2.41-5.08-1.91-7.69-2l-4.43-0.16a43.24 43.24 0 0 0-6.64-6.66l-0.14-4.43c-0.08-2.6 0.43-6.69-2-7.69l-10-4.15c-2.4-1-4.95 2.25-6.85 4l-3.23 3a42.49 42.49 0 0 0-9.44 0l-3.21-3c-1.9-1.78-4.44-5-6.85-4l-10 4.11c-2.41 1-1.9 5.09-2 7.69l-0.16 4.42a43.24 43.24 0 0 0-6.67 6.65l-4.42 0.14c-2.6 0.08-6.69-0.43-7.69 2l-4.15 10c-1 2.4 2.25 4.94 4 6.84l3 3.23a42.49 42.49 0 0 0 0 9.44l-3 3.22c-1.78 1.9-5 4.43-4 6.84l4.11 10c1 2.41 5.09 1.91 7.7 2l4.41 0.15a43.24 43.24 0 0 0 6.66 6.68l0.13 4.41c0.08 2.6-0.43 6.7 2 7.7l10 4.15c2.4 1 4.94-2.25 6.84-4l3.24-3a42.5 42.5 0 0 0 9.42 0l3.22 3c1.91 1.79 4.43 5 6.84 4l10-4.11c2.41-1 1.91-5.08 2-7.7l0.15-4.42a43.24 43.24 0 0 0 6.68-6.65l4.42-0.14c2.6-0.08 6.7 0.43 7.7-2l4.15-10c1.04-2.36-2.22-4.9-3.99-6.82zm-45.74 15.7c-12.66 0-22.91-10.61-22.91-23.7s10.25-23.7 22.91-23.7 22.91 10.61 22.91 23.7-10.25 23.7-22.91 23.7z"/>
       </svg>`
      )
    );
    addClass(this.settingsButton, "tabContextButton");
    controlBarEl.appendChild(this.settingsButton);
    this.settingsButton.onclick = ev => {
      this.open(ev);
    };
    this.menuElement = document.createElement("div");
    addClass(this.menuElement, "tabMenu");
    this.rootEl.appendChild(this.menuElement);
    this.menuElement.onclick = ev => {
      ev.stopImmediatePropagation();
      return false;
    };
    this.drawBody();
  }
  public open(ev: MouseEvent) {
    if (!this.isOpen) {
      this.isOpen = true;
      addClass(this.menuElement, "open");
      const handleClick = (ev: MouseEvent) => {
        // Stops propagation in IE11
        let parent = <HTMLElement>ev.target;
        while (!!(window as any).MSInputMethodContext && !!(document as any).documentMode && parent.parentElement) {
          if (parent.className.indexOf("tabMenu") !== -1) {
            return false;
          }
          parent = parent.parentElement;
        }
        this.close(ev);
        document.removeEventListener("click", handleClick, true);
        return false;
      };
      document.addEventListener("click", handleClick, { once: true });
      ev.stopImmediatePropagation();
    }
  }
  public close(_event?: MouseEvent) {
    if (this.isOpen) {
      this.isOpen = false;
      removeClass(this.menuElement, "open");
      this.tab.setRequestConfig({
        args: this.args.filter(arg => arg && arg.name && arg.name.trim().length > 0),
        headers: this.headers.reduce((headersObject: { [key: string]: string }, headerArrayObject) => {
          if (headerArrayObject && headerArrayObject.name && headerArrayObject.name.trim().length > 0) {
            headersObject[headerArrayObject.name] = headerArrayObject.value;
          }
          return headersObject;
        }, {}),
        defaultGraphs: this.defaultGraphs.filter(arg => arg),
        namedGraphs: this.namedGraphs.filter(arg => arg)
      });
    }
  }
  private drawRequestMethodSelector() {
    const requestTypeWrapper = document.createElement("div");
    addClass(requestTypeWrapper, "requestConfigWrapper");
    createLabel("Request method", requestTypeWrapper);

    // Create Button
    const getButton = document.createElement("button");
    addClass(getButton, "selectorButton");
    getButton.innerText = "GET";
    const postButton = document.createElement("button");
    addClass(postButton, "selectorButton");
    postButton.innerText = "POST";
    addClass(this.tab.getRequestConfig().method === "GET" ? getButton : postButton, "selected");
    getButton.onclick = () => {
      this.tab.setRequestConfig({ method: "GET" });
      addClass(getButton, "selected");
      removeClass(postButton, "selected");
    };
    postButton.onclick = () => {
      this.tab.setRequestConfig({ method: "POST" });
      addClass(postButton, "selected");
      removeClass(getButton, "selected");
    };

    // Add elements to container
    requestTypeWrapper.appendChild(getButton);
    requestTypeWrapper.appendChild(postButton);
    this.menuElement.appendChild(requestTypeWrapper);
  }
  private drawAcceptSelector() {
    const acceptWrapper = document.createElement("div");
    addClass(acceptWrapper, "requestConfigWrapper", "acceptWrapper");
    createLabel("Accept Headers", acceptWrapper);

    // Request type
    createSelector(
      AcceptOptionsMap,
      <string>this.tab.getRequestConfig().acceptHeaderSelect,
      ev => {
        this.tab.setRequestConfig({ acceptHeaderSelect: (<HTMLOptionElement>ev.target).value });
      },
      "Ask / Select",
      acceptWrapper
    );
    createSelector(
      AcceptHeaderGraphMap,
      <string>this.tab.getRequestConfig().acceptHeaderGraph,
      ev => {
        this.tab.setRequestConfig({ acceptHeaderGraph: (<HTMLOptionElement>ev.target).value });
      },
      "Construct / Describe",
      acceptWrapper
    );
    this.menuElement.appendChild(acceptWrapper);
  }
  private drawArgumentsInput() {
    const argumentsWrapper = document.createElement("div");
    addClass(argumentsWrapper, "requestConfigWrapper", "textSetting");

    createLabel("Arguments", argumentsWrapper);
    // Draw the arguments;
    for (const argIndex in this.args) {
      const argRow = drawDoubleInputWhenEmpty(argumentsWrapper, parseInt(argIndex), this.args);
      getRemoveButton(() => (this.args[argIndex] = undefined), argRow);
    }
    drawDoubleInput(argumentsWrapper, this.args);
    this.menuElement.appendChild(argumentsWrapper);
  }

  private drawHeaderInput() {
    const headerWrapper = document.createElement("div");
    addClass(headerWrapper, "requestConfigWrapper", "textSetting");

    const URLArgLabel = createLabel("Header Arguments");
    headerWrapper.appendChild(URLArgLabel);
    // Draw the arguments;
    for (const headerIndex in this.headers) {
      const headerRow = drawDoubleInputWhenEmpty(headerWrapper, parseInt(headerIndex), this.headers);
      getRemoveButton(() => (this.headers[headerIndex] = undefined), headerRow);
    }
    drawDoubleInput(headerWrapper, this.headers);
    this.menuElement.appendChild(headerWrapper);
  }

  private drawDefaultGraphInput() {
    const defaultGraphWrapper = document.createElement("div");
    addClass(defaultGraphWrapper, "requestConfigWrapper", "textSetting");

    const defaultGraphLabel = createLabel("Default Graphs");
    defaultGraphWrapper.appendChild(defaultGraphLabel);

    for (const graphIndex in this.defaultGraphs) {
      const graphDiv = drawSingleInputWhenEmpty(defaultGraphWrapper, parseInt(graphIndex), this.defaultGraphs);
      getRemoveButton(() => (this.defaultGraphs[graphIndex] = undefined), graphDiv);
    }
    drawSingleInput(defaultGraphWrapper, this.defaultGraphs);
    this.menuElement.appendChild(defaultGraphWrapper);
  }

  private drawNamedGraphInput() {
    const namedGraphWrapper = document.createElement("div");
    addClass(namedGraphWrapper, "requestConfigWrapper", "textSetting");

    const namedGraphLabel = createLabel("Named Graphs");
    namedGraphWrapper.appendChild(namedGraphLabel);

    // Draw default graphs
    for (const graphIndex in this.namedGraphs) {
      const graphDiv = drawSingleInputWhenEmpty(namedGraphWrapper, parseInt(graphIndex), this.namedGraphs);
      getRemoveButton(() => (this.namedGraphs[graphIndex] = undefined), graphDiv);
    }
    drawSingleInput(namedGraphWrapper, this.namedGraphs);
    this.menuElement.appendChild(namedGraphWrapper);
  }

  private drawBody() {
    // Draw request Method
    this.drawRequestMethodSelector();

    // Draw Accept headers
    this.drawAcceptSelector();

    // Draw URL Arguments
    this.drawArgumentsInput();

    // Draw HTTP Header body
    this.drawHeaderInput();

    // Default graphs
    this.drawDefaultGraphInput();

    // Named graphs
    this.drawNamedGraphInput();
  }
}
function createSelector(
  options: { key: string; value: string }[],
  currentValue: string,
  changeHandler: (event: Event) => void,
  label: string,
  parent: HTMLElement
) {
  const selectorWrapper = document.createElement("div");
  addClass(selectorWrapper, "selector");

  const selectorLabel = createLabel(label, selectorWrapper);
  addClass(selectorLabel, "selectorLabel");

  const selectElement = document.createElement("select");
  selectElement.onchange = changeHandler;
  selectorWrapper.appendChild(selectElement);

  for (const pair of options) {
    const option = createOption(pair, selectElement);
    option.selected = pair.value === currentValue;
  }
  parent.appendChild(selectorWrapper);
}

function getInputValues(div: HTMLElement) {
  const values = [];
  for (const child of div.getElementsByTagName("input")) {
    values.push(child.value);
  }
  return values;
}

function createLabel(content: string, parent?: HTMLElement) {
  const label = document.createElement("label");
  addClass(label, "label");
  label.innerText = content;
  if (parent) parent.appendChild(label);
  return label;
}

function createOption(content: { key: string; value: string }, parent?: HTMLElement) {
  const option = document.createElement("option");
  option.textContent = content.key;
  option.value = content.value;
  parent.appendChild(option);
  return option;
}

function createInput(content: string, parent?: HTMLElement) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = content ? content : "";
  if (parent) parent.appendChild(input);
  return input;
}
function getRemoveButton(deleteAction: () => void, parent?: HTMLElement) {
  const button = document.createElement("button");
  button.textContent = "X";
  addClass(button, "removeButton");
  if (parent) parent.appendChild(button);
  button.onclick = ev => {
    deleteAction();
    (<HTMLButtonElement>ev.target).parentElement.remove();
  };
  return button;
}
function drawSingleInput(root: HTMLElement, content: string[]) {
  const lastRow: HTMLDivElement = root.querySelector(".graphInput:last-of-type");
  if (!lastRow || getInputValues(lastRow)[0] !== "" || lastRow.getElementsByTagName("button").length !== 0) {
    const index = content.length;
    drawSingleInputWhenEmpty(root, index, content);
    if (lastRow && lastRow.getElementsByTagName("button").length === 0) {
      getRemoveButton(() => (content[index - 1] = undefined), lastRow);
    }
  }
}
function drawSingleInputWhenEmpty(root: HTMLElement, index: number, content: string[]) {
  const namedGraphItem = document.createElement("div");
  addClass(namedGraphItem, "graphInput");
  const namedGraphInput = createInput(content[index] ? content[index] : "", namedGraphItem);
  namedGraphInput.onkeyup = ev => {
    const target = <HTMLInputElement>ev.target;
    content[index] ? (content[index] = target.value) : content.push(target.value);
    drawSingleInput(root, content);
  };
  root.appendChild(namedGraphItem);
  return namedGraphItem;
}
function drawDoubleInput(root: HTMLElement, content: { name: string; value: string }[]) {
  const lastRow: HTMLDivElement = root.querySelector(".textRow:last-of-type");
  // When there are no row's or the last row has values,
  if (!lastRow || getInputValues(lastRow).filter(value => value).length !== 0) {
    const index = content.length;
    drawDoubleInputWhenEmpty(root, index, content);
    // If there is a last row and the button is not already there
    if (lastRow && lastRow.getElementsByTagName("button").length === 0) {
      getRemoveButton(() => (content[index - 1] = undefined), lastRow);
    }
  }
}
function drawDoubleInputWhenEmpty(root: HTMLElement, index: number, content: { name: string; value: string }[]) {
  const kvInput = document.createElement("div");
  addClass(kvInput, "textRow");
  const value = content[index];
  const nameField = createInput(value ? value.name : "", kvInput);
  const valueField = createInput(value ? value.value : "", kvInput);
  nameField.onkeyup = ev => {
    content[index]
      ? (content[index].name = (<HTMLInputElement>ev.target).value)
      : content.push({ name: (<HTMLInputElement>ev.target).value, value: "" });
    drawDoubleInput(root, content);
  };
  valueField.onkeyup = ev => {
    content[index]
      ? (content[index].value = (<HTMLInputElement>ev.target).value)
      : content.push({ value: (<HTMLInputElement>ev.target).value, name: "" });
    drawDoubleInput(root, content);
  };
  root.appendChild(kvInput);
  return kvInput;
}
