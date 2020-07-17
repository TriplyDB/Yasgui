import Autocomplete from "@tarekraafat/autocomplete.js";
import { EventEmitter } from "events";
import { pick } from "lodash-es";
import { addClass } from "@triply/yasgui-utils";
require("./endpointSelect.scss");
import parse from "autosuggest-highlight/parse";

//Export this here instead of from our custom-types folder of autocomplete-js
//as this interface is exported via the yasgui config. The custom typings are
//not exported as part of the yasgui typings, so we'd get typing errors.
//instead, include this interface in the yasgui typings itself by defining it here
interface AutocompleteItem<T> {
  index: number; //index of suggestion in array of suggestions
  value: T; //suggestion object
  key: keyof T; //key that matches search string. In our case, always 'all'
  match: string; //suggestion value of the key above
}
export interface CatalogueItem {
  endpoint: string;
  type?: "history";
}

export interface RenderedCatalogueItem<T> {
  matches: { [k in keyof T]?: ReturnType<typeof parse> } & { endpoint?: ReturnType<typeof parse> };
}

function listElementIsFullyVissible(el: HTMLLIElement) {
  const { top, bottom } = el.getBoundingClientRect();
  // Check if bottom of the element is off the page
  if (bottom < 0) return false;
  // Check its within the document viewport
  if (top > document.documentElement.clientHeight) return false;

  const ulRect = (el.parentNode as HTMLUListElement).getBoundingClientRect();
  if (bottom <= ulRect.bottom === false) return false;
  // Check if the element is out of view due to a container scrolling
  if (top <= ulRect.top) return false;
  return true;
}

function splitSearchString(searchString: string): string[] {
  return searchString.match(/\S+/g) || [];
}

export interface EndpointSelectConfig<T = CatalogueItem> {
  // Omit endpoint since it will be used as default, this makes sure elements don't appear twice in the list
  keys: (keyof T)[];
  getData: () => T[];
  renderItem: (data: AutocompleteItem<T> & RenderedCatalogueItem<T>, source: HTMLElement) => void;
}
export interface EndpointSelect {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  on(event: "remove", listener: (endpoint: string, history: string[]) => void): this;
  emit(event: "remove", endpoint: string, history: string[]): boolean;
  on(event: "select", listener: (endpoint: string, history: string[]) => void): this;
  emit(event: "select", endpoint: string, history: string[]): boolean;
}

export class EndpointSelect extends EventEmitter {
  private container: HTMLDivElement;
  private options: EndpointSelectConfig;
  private value: string;
  private history: CatalogueItem[];
  private inputField!: HTMLInputElement;
  constructor(initialValue: string, container: HTMLDivElement, options: EndpointSelectConfig, history: string[]) {
    super();
    this.container = container;
    this.options = options;
    this.value = initialValue;
    this.history = history.map((endpoint) => {
      return { endpoint, type: "history" };
    });
    // Add endpoint if not defined
    if (this.options.keys.indexOf("endpoint") <= 0) this.options.keys.push("endpoint");
    this.draw();
  }
  private draw() {
    // Create container, we don't need to interact with it anymore
    const autocompleteWrapper = document.createElement("div");
    addClass(autocompleteWrapper, "autocompleteWrapper");
    this.container.appendChild(autocompleteWrapper);

    // Create field
    this.inputField = document.createElement("input");
    addClass(this.inputField, "autocomplete");
    this.inputField.value = this.value;
    autocompleteWrapper.appendChild(this.inputField);

    // Init autocomplete library
    new Autocomplete<CatalogueItem>({
      placeholder: "Search or add an endpoint",
      highlight: false,
      maxResults: 100,
      trigger: {
        event: ["input", "focusin"],
        //we always want to show the autocomplete, even if no query is set
        //in that case, we'd just show the full list
        condition: () => true,
      },
      // threshold: -1,
      searchEngine: (query, record) => {
        if (!query || query.trim().length === 0) {
          //show everything when we've got an empty search string
          return true;
        }
        return splitSearchString(query).every((m) => record.indexOf(m) >= 0);
      },
      data: {
        src: async () => {
          return [...this.history, ...this.options.getData()].map((item) => ({
            ...item,
            all: Object.values(pick(item, ["endpoint", ...this.options.keys])).join(" "),
          }));
        },
        key: ["all" as any], // All is something we add as a workaround for getting multiple results of the library
        cache: false,
      },
      // Use a selector coming from the container, this is to make sure we grab our own autocomplete element
      selector: () => this.inputField,
      resultsList: {
        render: true,
        destination: this.inputField,
        container: (element) => {
          // Remove id, there can be multiple yasgui's active on one page, we can't delete since the library will then add the default
          element.id = "";
          addClass(element, "autocompleteList");
        },
      },
      resultItem: {
        content: (data, source) => {
          // Custom handling of items with history, these are able to be removed
          if (data.value.type && data.value.type === "history") {
            // Add a container to make folding work correctly
            const resultsContainer = document.createElement("div");
            // Match is highlighted text
            resultsContainer.innerHTML = parse(
              data.value.endpoint,
              createHighlights(data.value.endpoint, this.inputField.value)
            ).reduce(
              (current, object) => (object.highlight ? current + object.text.bold() : current + object.text),
              ""
            );
            source.append(resultsContainer);

            // Remove button
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "✖";
            addClass(removeBtn, "removeItem");
            removeBtn.addEventListener("mousedown", (event) => {
              this.history = this.history.filter((item) => item.endpoint !== data.value.endpoint);
              this.emit(
                "remove",
                this.value,
                this.history.map((value) => value.endpoint)
              );
              source.remove();
              event.stopPropagation();
            });

            source.appendChild(removeBtn);
          } else {
            // Add our own field highlighting
            const matches: RenderedCatalogueItem<CatalogueItem> = { matches: {} };
            for (const key of [...this.options.keys]) {
              const val = data.value[key];
              if (val) {
                matches.matches[key] = parse(val, createHighlights(val, this.inputField.value));
              }
            }
            this.options.renderItem({ ...data, ...matches }, source);
          }
        },
        element: "li",
      },
      onSelection: (feedback) => {
        const item = feedback.selection.value;
        this.value = item.endpoint;
        this.inputField.value = this.value;
        this.emit(
          "select",
          this.value,
          this.history.map((value) => value.endpoint)
        );
      },
      noResults: () => {
        const container = this.container.querySelector(".autocompleteList");
        if (container) {
          const noResults = document.createElement("div");
          addClass(noResults, "noResults");
          noResults.innerText = 'Press "enter" to add this endpoint';
          container.appendChild(noResults);
        }
      },
    });
    // New data handler
    this.inputField.addEventListener("keyup", (event) => {
      const target = <HTMLInputElement>event.target;
      // Enter
      if (event.keyCode === 13) {
        if (this.value === target.value) {
          //we have typed exactly the same value the one from the suggestion list
          //So, just close the suggestion list
          this.clearListSuggestionList();
          this.inputField.blur();
          return;
        }
        if (!target.value || !target.value.trim()) {
          this.clearListSuggestionList();
          this.inputField.blur();
          return;
        }
        if (
          this.options.getData().find((i) => i.endpoint === this.inputField.value) ||
          this.history.find((item) => item.endpoint === this.inputField.value)
        ) {
          //the value you typed is already in our catalogue or in our history
          this.value = target.value;
          this.clearListSuggestionList();
          this.emit(
            "select",
            this.value,
            this.history.map((h) => h.endpoint)
          );
          this.inputField.blur();
          return;
        }
        this.value = target.value;
        this.history.push({ endpoint: target.value, type: "history" });
        this.emit(
          "select",
          this.value,
          this.history.map((value) => value.endpoint)
        );
        this.clearListSuggestionList();
        this.inputField.blur();
      }
      // Blur and set value on enter
      if (event.keyCode === 27) {
        this.inputField.blur();
        this.inputField.value = this.value;
        this.clearListSuggestionList();
      }

      // Stop moving caret around when hitting up and down keys
      if (event.keyCode === 38 || event.keyCode === 40) {
        event.stopPropagation();
        const selected: HTMLLIElement | null = this.container.querySelector(
          ".autocompleteList .autoComplete_result.autoComplete_selected"
        );
        if (selected && !listElementIsFullyVissible(selected)) {
          selected.scrollIntoView(false);
        }
      }
    });
    this.inputField.addEventListener("blur", (event) => {
      const target = <HTMLInputElement>event.target;
      // Tabbing blur event
      if (target.className === this.inputField.className && event.relatedTarget) {
        this.clearListSuggestionList();
        this.inputField.value = this.value;
      }
    });
    // Improvised clickAway handler, Blur will fire before select or click events, causing interactive suggestion to no longer work
    document.addEventListener("mousedown", (event) => {
      if (event.button !== 2) {
        const target = <HTMLElement>event.target;
        if (
          target.className === "removeItem" ||
          target.className === "autoComplete_result" ||
          target.className === "autocomplete"
        )
          return;
        this.clearListSuggestionList();
        this.inputField.value = this.value;
      }
    });
  }
  private clearListSuggestionList = () => {
    const autocompleteList = this.container.querySelector(".autocompleteList");
    if (autocompleteList) autocompleteList.innerHTML = "";
  };

  public setEndpoint(endpoint: string, endpointHistory?: string[]) {
    this.value = endpoint;
    if (endpointHistory) {
      this.history = endpointHistory.map((endpoint) => {
        return { endpoint, type: "history" };
      });
    }
    // Force focus when the endpoint is open
    if (this.inputField === document.activeElement) {
      this.inputField.focus();
    } else {
      // Only set when the user is not using the widget at this time
      this.inputField.value = endpoint;
    }
  }
  public destroy() {
    this.removeAllListeners();
    this.inputField.remove();
  }
}

function createHighlights(text: string, query: string) {
  return splitSearchString(query)
    .reduce((result: Array<[number, number]>, word: string) => {
      if (!word.length) return result;
      const wordLen = word.length;
      // const regex = new RegExp(escapeRegexCharacters(word), 'i');
      // const { index = -1 } = text.match(regex);
      const index = text.indexOf(word);
      if (index > -1) {
        result.push([index, index + wordLen]);

        // Replace what we just found with spaces so we don't find it again.
        text = text.slice(0, index) + new Array(wordLen + 1).join(" ") + text.slice(index + wordLen);
      }

      return result;
    }, [])
    .sort((match1: [number, number], match2: [number, number]) => {
      return match1[0] - match2[0];
    });
}

export default EndpointSelect;
