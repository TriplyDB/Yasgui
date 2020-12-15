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

const ColumnResizer = require("column-resizer");
const DEFAULT_PAGE_SIZE = 50;

export interface PluginConfig {
  openIriInNewWindow: boolean;
  tableConfig: DataTables.Settings;
}

export interface PersistentConfig {
  pageSize?: number;
}

export default class Table implements Plugin<PluginConfig> {
  private config: PluginConfig;
  private persistentConfig: PersistentConfig = {};
  private yasr: Yasr;
  private tableControls: Element | undefined;
  private dataTable: DataTables.Api | undefined;
  private tableFilterField: HTMLInputElement | undefined;
  private tableSizeField: HTMLSelectElement | undefined;
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
  private getRows(): string[][] {
    const rows: string[][] = [];

    if (!this.yasr.results) return [];
    const bindings = this.yasr.results.getBindings();
    if (!bindings) return rows;
    const vars = this.yasr.results.getVariables();
    const prefixes = this.yasr.getPrefixes();
    for (let rowId = 0; rowId < bindings.length; rowId++) {
      const binding = bindings[rowId];
      const row: string[] = ["<div>" + (rowId + 1) + "</div>"];
      for (let colId = 0; colId < vars.length; colId++) {
        const sparqlVar = vars[colId];
        if (sparqlVar in binding) {
          row.push(this.getCellContent(binding, sparqlVar, prefixes));
        } else {
          row.push("");
        }
      }
      rows.push(row);
    }
    return rows;
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
    return `${prefixed ? "" : "&lt;"}<a class='iri' target='${
      this.config.openIriInNewWindow ? '_blank ref="noopener noreferrer"' : "_self"
    }' href='${href}'>${visibleString}</a>${prefixed ? "" : "&gt;"}`;
  }
  private getCellContent(bindings: Parser.Binding, sparqlVar: string, prefixes?: { [label: string]: string }): string {
    const binding = bindings[sparqlVar];
    let content: string;
    if (binding.type == "uri") {
      content = this.getUriLinkFromBinding(binding, prefixes);
    } else {
      content = `<span class='nonIri'>${this.formatLiteral(binding, prefixes)}</span>`;
    }
    return "<div>" + content + "</div>";
  }
  private formatLiteral(literalBinding: any, prefixes?: { [key: string]: string }) {
    let stringRepresentation = escape(literalBinding.value);
    if (literalBinding["xml:lang"]) {
      stringRepresentation = `"${stringRepresentation}"<sup>@${literalBinding["xml:lang"]}</sup>`;
    } else if (literalBinding.datatype) {
      const dataType = this.getUriLinkFromBinding({ type: "uri", value: literalBinding.datatype }, prefixes);
      stringRepresentation = `"${stringRepresentation}"<sup>^^${dataType}</sup>`;
    }
    return stringRepresentation;
  }

  private getColumns() {
    if (!this.yasr.results) return [];
    return [
      { name: "", searchable: false, width: this.getSizeFirstColumn(), sortable: false }, //prepend with row numbers column
      ...this.yasr.results?.getVariables().map((name) => {
        return { name: name, title: name };
      }),
    ];
  }
  private getSizeFirstColumn() {
    const numResults = this.yasr.results?.getBindings()?.length || 0;
    if (numResults > 999) {
      return "30px";
    } else if (numResults > 99) {
      return "20px";
    }
    return "10px";
  }

  public draw(persistentConfig: PersistentConfig) {
    const table = document.createElement("table");
    const rows = this.getRows();
    const columns = this.getColumns();

    if (rows.length <= (persistentConfig?.pageSize || DEFAULT_PAGE_SIZE)) {
      this.yasr.pluginControls;
      addClass(this.yasr.rootEl, "isSinglePage");
    } else {
      removeClass(this.yasr.rootEl, "isSinglePage");
    }

    if (this.dataTable) {
      this.dataTable.destroy(true);
      this.dataTable = undefined;
    }
    this.yasr.resultsEl.appendChild(table);

    // reset some default config properties as they couldn't be initialized beforehand
    this.config.tableConfig.pageLength =
      persistentConfig && persistentConfig.pageSize ? persistentConfig.pageSize : DEFAULT_PAGE_SIZE;
    this.config.tableConfig.data = rows;
    this.config.tableConfig.columns = columns;

    const dtConfig: DataTables.Settings = { ...this.config.tableConfig };
    this.dataTable = $(table).DataTable(dtConfig);
    // .api();
    new ColumnResizer.default(table, { widths: [], partialRefresh: true });
    this.drawControls();
  }

  private handleTableSearch = (event: KeyboardEvent) => {
    this.dataTable?.search((event.target as HTMLInputElement).value).draw();
  };
  private handleTableSizeSelect = (event: Event) => {
    const pageLength = parseInt((event.target as HTMLSelectElement).value);
    // Set page length
    this.dataTable?.page.len(pageLength).draw();
    // Store in persistentConfig
    this.persistentConfig.pageSize = pageLength;
    this.yasr.storePluginConfig("table", this.persistentConfig);
  };

  drawControls() {
    // Remove old header
    this.removeControls();
    this.tableControls = document.createElement("div");
    this.tableControls.className = "tableControls";
    // Create table filter
    this.tableFilterField = document.createElement("input");
    this.tableFilterField.className = "tableFilter";
    this.tableFilterField.placeholder = "Filter query results";
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

    // Empty controls
    while (this.tableControls?.firstChild) this.tableControls.firstChild.remove();
    this.tableControls?.remove();
  }
  destroy() {
    this.removeControls();
    this.dataTable?.destroy(true);
    this.dataTable = undefined;
    removeClass(this.yasr.rootEl, "isSinglePage");
  }
}
