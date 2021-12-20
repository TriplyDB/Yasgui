/**
 * Make sure not to include any deps from our main index file. That way, we can easily publish the plugin as standalone build
 */
require("./index.scss");
require("datatables.net-dt/css/jquery.dataTables.css");
require("datatables.net");
//@ts-ignore (jquery _does_ expose a default. In es6, it's the one we should use)
import $ from "jquery";
import Parser from "../../parsers";
import { escape } from "lodash-es";
import { Plugin, DownloadInfo } from "../";
import Yasr from "../../";
import { drawSvgStringAsElement, drawFontAwesomeIconAsSvg, addClass, removeClass } from "@triply/yasgui-utils";
import * as faTableIcon from "@fortawesome/free-solid-svg-icons/faTable";
import { DeepReadonly } from "ts-essentials";
import { cloneDeep } from "lodash-es";

const ColumnResizer = require("column-resizer");
const DEFAULT_PAGE_SIZE = 50;

export interface PluginConfig {
  openIriInNewWindow: boolean;
  tableConfig: DataTables.Settings;
}

export interface PersistentConfig {
  pageSize?: number;
  compact?: boolean;
  isEllipsed?: boolean;
}

type DataRow = [number, ...(Parser.BindingValue | "")[]];

function expand(this: HTMLDivElement, event: MouseEvent) {
  addClass(this, "expanded");
  event.preventDefault();
}

export default class Table implements Plugin<PluginConfig> {
  private config: DeepReadonly<PluginConfig>;
  private persistentConfig: PersistentConfig = {};
  private yasr: Yasr;
  private tableControls: Element | undefined;
  private tableEl: HTMLTableElement | undefined;
  private dataTable: DataTables.Api | undefined;
  private tableFilterField: HTMLInputElement | undefined;
  private tableSizeField: HTMLSelectElement | undefined;
  private tableCompactSwitch: HTMLInputElement | undefined;
  private tableEllipseSwitch: HTMLInputElement | undefined;
  private tableResizer:
    | {
        reset: (options: {
          disable: boolean;
          onResize?: () => void;
          partialRefresh?: boolean;
          headerOnly?: boolean;
        }) => void;
        onResize: () => {};
      }
    | undefined;
  public helpReference = "https://triply.cc/docs/yasgui#table";
  public label = "Table";
  public priority = 10;
  public getIcon() {
    return drawSvgStringAsElement(drawFontAwesomeIconAsSvg(faTableIcon));
  }
  constructor(yasr: Yasr) {
    this.yasr = yasr;
    //TODO read options from constructor
    this.config = Table.defaults;
  }
  public static defaults: PluginConfig = {
    openIriInNewWindow: true,
    tableConfig: {
      dom: "tip", //  tip: Table, Page Information and Pager, change to ipt for showing pagination on top
      pageLength: DEFAULT_PAGE_SIZE, //default page length
      lengthChange: true, //allow changing page length
      data: [],
      columns: [],
      order: [],
      deferRender: true,
      orderClasses: false,
      language: {
        paginate: {
          first: "&lt;&lt;", // Have to specify these two due to TS defs, <<
          last: "&gt;&gt;", // Have to specify these two due to TS defs, >>
          next: "&gt;", // >
          previous: "&lt;", // <
        },
      },
    },
  };
  private getRows(): DataRow[] {
    if (!this.yasr.results) return [];
    const bindings = this.yasr.results.getBindings();
    if (!bindings) return [];
    // Vars decide the columns
    const vars = this.yasr.results.getVariables();
    // Use "" as the empty value, undefined will throw runtime errors
    return bindings.map((binding, rowId) => [rowId + 1, ...vars.map((variable) => binding[variable] ?? "")]);
  }

  private getUriLinkFromBinding(binding: Parser.BindingValue, prefixes?: { [key: string]: string }) {
    const href = binding.value;
    let visibleString = href;
    let prefixed = false;
    if (prefixes) {
      for (const prefixLabel in prefixes) {
        if (visibleString.indexOf(prefixes[prefixLabel]) == 0) {
          visibleString = prefixLabel + ":" + href.substring(prefixes[prefixLabel].length);
          prefixed = true;
          break;
        }
      }
    }
    // Hide brackets when prefixed or compact
    const hideBrackets = prefixed || this.persistentConfig.compact;
    return `${hideBrackets ? "" : "&lt;"}<a class='iri' target='${
      this.config.openIriInNewWindow ? "_blank" : "_self"
    }'${this.config.openIriInNewWindow ? " ref='noopener noreferrer'" : ""} href='${href}'>${visibleString}</a>${
      hideBrackets ? "" : "&gt;"
    }`;
  }
  private getCellContent(binding: Parser.BindingValue, prefixes?: { [label: string]: string }): string {
    let content: string;
    if (binding.type == "uri") {
      content = `<span>${this.getUriLinkFromBinding(binding, prefixes)}</span>`;
    } else {
      content = `<span class='nonIri'>${this.formatLiteral(binding, prefixes)}</span>`;
    }

    return `<div>${content}</div>`;
  }
  private formatLiteral(literalBinding: Parser.BindingValue, prefixes?: { [key: string]: string }) {
    let stringRepresentation = escape(literalBinding.value);
    // Return now when in compact mode.
    if (this.persistentConfig.compact) return stringRepresentation;

    if (literalBinding["xml:lang"]) {
      stringRepresentation = `"${stringRepresentation}"<sup>@${literalBinding["xml:lang"]}</sup>`;
    } else if (literalBinding.datatype) {
      const dataType = this.getUriLinkFromBinding({ type: "uri", value: literalBinding.datatype }, prefixes);
      stringRepresentation = `"${stringRepresentation}"<sup>^^${dataType}</sup>`;
    }
    return stringRepresentation;
  }

  private getColumns(): DataTables.ColumnSettings[] {
    if (!this.yasr.results) return [];
    const prefixes = this.yasr.getPrefixes();

    return [
      {
        name: "",
        searchable: false,
        width: `${this.getSizeFirstColumn()}px`,
        type: "num",
        orderable: false,
        visible: this.persistentConfig.compact !== true,
        render: (data: number, type: any) =>
          type === "filter" || type === "sort" || !type ? data : `<div class="rowNumber">${data}</div>`,
      }, //prepend with row numbers column
      ...this.yasr.results?.getVariables().map((name) => {
        return <DataTables.ColumnSettings>{
          name: name,
          title: name,
          render: (data: Parser.BindingValue | "", type: any, _row: any, _meta: DataTables.CellMetaSettings) => {
            // Handle empty rows
            if (data === "") return data;
            if (type === "filter" || type === "sort" || !type) return data.value;
            return this.getCellContent(data, prefixes);
          },
        };
      }),
    ];
  }
  private getSizeFirstColumn() {
    const numResults = this.yasr.results?.getBindings()?.length || 0;
    return numResults.toString().length * 8;
  }

  public draw(persistentConfig: PersistentConfig) {
    this.persistentConfig = { ...this.persistentConfig, ...persistentConfig };
    this.tableEl = document.createElement("table");
    const rows = this.getRows();
    const columns = this.getColumns();

    if (rows.length <= (persistentConfig?.pageSize || DEFAULT_PAGE_SIZE)) {
      this.yasr.pluginControls;
      addClass(this.yasr.rootEl, "isSinglePage");
    } else {
      removeClass(this.yasr.rootEl, "isSinglePage");
    }

    if (this.dataTable) {
      this.destroyResizer();

      this.dataTable.destroy(true);
      this.dataTable = undefined;
    }
    this.yasr.resultsEl.appendChild(this.tableEl);
    // reset some default config properties as they couldn't be initialized beforehand
    const dtConfig: DataTables.Settings = {
      ...((cloneDeep(this.config.tableConfig) as unknown) as DataTables.Settings),
      pageLength: persistentConfig?.pageSize ? persistentConfig.pageSize : DEFAULT_PAGE_SIZE,
      data: rows,
      columns: columns,
    };
    this.dataTable = $(this.tableEl).DataTable(dtConfig);
    this.tableEl.style.removeProperty("width");
    this.tableEl.style.width = this.tableEl.clientWidth + "px";
    const widths = Array.from(this.tableEl.querySelectorAll("th")).map((h) => h.offsetWidth - 26);
    this.tableResizer = new ColumnResizer.default(this.tableEl, {
      widths: this.persistentConfig.compact === true ? widths : [this.getSizeFirstColumn(), ...widths.slice(1)],
      partialRefresh: true,
      onResize: this.persistentConfig.isEllipsed !== false && this.setEllipsisHandlers,
      headerOnly: true,
    });
    // DataTables uses the rendered style to decide the widths of columns.
    // Before a draw remove the ellipseTable styling
    if (this.persistentConfig.isEllipsed !== false) {
      this.dataTable?.on("preDraw", () => {
        this.tableResizer?.reset({ disable: true });
        removeClass(this.tableEl, "ellipseTable");
        this.tableEl?.style.removeProperty("width");
        this.tableEl?.style.setProperty("width", this.tableEl.clientWidth + "px");
        return true; // Indicate it should re-render
      });
      // After a draw
      this.dataTable?.on("draw", () => {
        if (!this.tableEl) return;
        // Width of table after render, removing width will make it fall back to 100%
        let targetSize = this.tableEl.clientWidth;
        this.tableEl.style.removeProperty("width");
        // Let's make sure the new size is not bigger
        if (targetSize > this.tableEl.clientWidth) targetSize = this.tableEl.clientWidth;
        this.tableEl?.style.setProperty("width", `${targetSize}px`);
        // Enable the re-sizer
        this.tableResizer?.reset({
          disable: false,
          partialRefresh: true,
          onResize: this.setEllipsisHandlers,
          headerOnly: true,
        });
        // Re-add the ellipsis
        addClass(this.tableEl, "ellipseTable");
        // Check if cells need the ellipsisHandlers
        this.setEllipsisHandlers();
      });
    }

    this.drawControls();
    // Draw again but with the events
    if (this.persistentConfig.isEllipsed !== false) {
      addClass(this.tableEl, "ellipseTable");
      this.setEllipsisHandlers();
    }
    // if (this.tableEl.clientWidth > width) this.tableEl.parentElement?.style.setProperty("overflow", "hidden");
  }

  private setEllipsisHandlers = () => {
    this.dataTable?.cells({ page: "current" }).every((rowIdx, colIdx) => {
      const cell = this.dataTable?.cell(rowIdx, colIdx);
      if (cell?.data() === "") return;
      const cellNode = cell?.node() as HTMLTableCellElement;
      if (cellNode) {
        const content = cellNode.firstChild as HTMLDivElement;
        if ((content.firstElementChild?.getBoundingClientRect().width || 0) > content.getBoundingClientRect().width) {
          if (!content.classList.contains("expandable")) {
            addClass(content, "expandable");
            content.addEventListener("click", expand, { once: true });
          }
        } else {
          if (content.classList.contains("expandable")) {
            removeClass(content, "expandable");
            content.removeEventListener("click", expand);
          }
        }
      }
    });
  };
  private handleTableSearch = (event: KeyboardEvent) => {
    this.dataTable?.search((event.target as HTMLInputElement).value).draw("page");
  };
  private handleTableSizeSelect = (event: Event) => {
    const pageLength = parseInt((event.target as HTMLSelectElement).value);
    // Set page length
    this.dataTable?.page.len(pageLength).draw("page");
    // Store in persistentConfig
    this.persistentConfig.pageSize = pageLength;
    this.yasr.storePluginConfig("table", this.persistentConfig);
  };
  private handleSetCompactToggle = (event: Event) => {
    // Store in persistentConfig
    this.persistentConfig.compact = (event.target as HTMLInputElement).checked;
    // Update the table
    this.draw(this.persistentConfig);
    this.yasr.storePluginConfig("table", this.persistentConfig);
  };
  private handleSetEllipsisToggle = (event: Event) => {
    // Store in persistentConfig
    this.persistentConfig.isEllipsed = (event.target as HTMLInputElement).checked;
    // Update the table
    this.draw(this.persistentConfig);
    this.yasr.storePluginConfig("table", this.persistentConfig);
  };
  /**
   * Draws controls on each update
   */
  drawControls() {
    // Remove old header
    this.removeControls();
    this.tableControls = document.createElement("div");
    this.tableControls.className = "tableControls";

    // Compact switch
    const toggleWrapper = document.createElement("div");
    const switchComponent = document.createElement("label");
    const textComponent = document.createElement("span");
    textComponent.innerText = "Simple view";
    addClass(textComponent, "label");
    switchComponent.appendChild(textComponent);
    addClass(switchComponent, "switch");
    toggleWrapper.appendChild(switchComponent);
    this.tableCompactSwitch = document.createElement("input");
    switchComponent.addEventListener("change", this.handleSetCompactToggle);
    this.tableCompactSwitch.type = "checkbox";
    switchComponent.appendChild(this.tableCompactSwitch);
    this.tableCompactSwitch.defaultChecked = !!this.persistentConfig.compact;
    this.tableControls.appendChild(toggleWrapper);

    // Ellipsis switch
    const ellipseToggleWrapper = document.createElement("div");
    const ellipseSwitchComponent = document.createElement("label");
    const ellipseTextComponent = document.createElement("span");
    ellipseTextComponent.innerText = "Ellipse";
    addClass(ellipseTextComponent, "label");
    ellipseSwitchComponent.appendChild(ellipseTextComponent);
    addClass(ellipseSwitchComponent, "switch");
    ellipseToggleWrapper.appendChild(ellipseSwitchComponent);
    this.tableEllipseSwitch = document.createElement("input");
    ellipseSwitchComponent.addEventListener("change", this.handleSetEllipsisToggle);
    this.tableEllipseSwitch.type = "checkbox";
    ellipseSwitchComponent.appendChild(this.tableEllipseSwitch);
    this.tableEllipseSwitch.defaultChecked = this.persistentConfig.isEllipsed !== false;
    this.tableControls.appendChild(ellipseToggleWrapper);

    // Create table filter
    this.tableFilterField = document.createElement("input");
    this.tableFilterField.className = "tableFilter";
    this.tableFilterField.placeholder = "Filter query results";
    this.tableFilterField.setAttribute("aria-label", "Filter query results");
    this.tableControls.appendChild(this.tableFilterField);
    this.tableFilterField.addEventListener("keyup", this.handleTableSearch);

    // Create page wrapper
    const pageSizerWrapper = document.createElement("div");
    pageSizerWrapper.className = "pageSizeWrapper";

    // Create label for page size element
    const pageSizerLabel = document.createElement("span");
    pageSizerLabel.textContent = "Page size: ";
    pageSizerLabel.className = "pageSizerLabel";
    pageSizerWrapper.appendChild(pageSizerLabel);

    // Create page size element
    this.tableSizeField = document.createElement("select");
    this.tableSizeField.className = "tableSizer";

    // Create options for page sizer
    const options = [10, 50, 100, 1000, -1];
    for (const option of options) {
      const element = document.createElement("option");
      element.value = option + "";
      // -1 selects everything so we should call it All
      element.innerText = option > 0 ? option + "" : "All";
      // Set initial one as selected
      if (this.dataTable?.page.len() === option) element.selected = true;
      this.tableSizeField.appendChild(element);
    }
    pageSizerWrapper.appendChild(this.tableSizeField);
    this.tableSizeField.addEventListener("change", this.handleTableSizeSelect);
    this.tableControls.appendChild(pageSizerWrapper);
    this.yasr.pluginControls.appendChild(this.tableControls);
  }
  download(filename?: string) {
    return {
      getData: () => this.yasr.results?.asCsv() || "",
      contentType: "text/csv",
      title: "Download result",
      filename: `${filename || "queryResults"}.csv`,
    } as DownloadInfo;
  }

  public canHandleResults() {
    return !!this.yasr.results && this.yasr.results.getVariables() && this.yasr.results.getVariables().length > 0;
  }
  private removeControls() {
    // Unregister listeners and remove references to old fields
    this.tableFilterField?.removeEventListener("keyup", this.handleTableSearch);
    this.tableFilterField = undefined;
    this.tableSizeField?.removeEventListener("change", this.handleTableSizeSelect);
    this.tableSizeField = undefined;
    this.tableCompactSwitch?.removeEventListener("change", this.handleSetCompactToggle);
    this.tableCompactSwitch = undefined;
    this.tableEllipseSwitch?.removeEventListener("change", this.handleSetEllipsisToggle);
    this.tableEllipseSwitch = undefined;
    // Empty controls
    while (this.tableControls?.firstChild) this.tableControls.firstChild.remove();
    this.tableControls?.remove();
  }
  private destroyResizer() {
    if (this.tableResizer) {
      this.tableResizer.reset({ disable: true });
      window.removeEventListener("resize", this.tableResizer.onResize);
      this.tableResizer = undefined;
    }
  }
  destroy() {
    this.removeControls();
    this.destroyResizer();
    // According to datatables docs, destroy(true) will also remove all events
    this.dataTable?.destroy(true);
    this.dataTable = undefined;
    removeClass(this.yasr.rootEl, "isSinglePage");
  }
}
