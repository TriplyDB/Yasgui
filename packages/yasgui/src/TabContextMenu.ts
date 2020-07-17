import { addClass } from "@triply/yasgui-utils";
import { default as Yasgui, getRandomId } from "./";
import Tab from "./Tab";
import { TabListEl } from "./TabElements";
import { cloneDeep } from "lodash-es";
require("./TabContextMenu.scss");
export interface TabContextConfig {
  name: string;
  action: (this: HTMLElement, ev: MouseEvent) => any;
  enabled: boolean;
}
export default class TabContextMenu {
  private yasgui: Yasgui;
  private contextEl!: HTMLElement;
  private newTabEl!: HTMLElement;
  private renameTabEl!: HTMLElement;
  private copyTabEl!: HTMLElement;
  private closeTabEl!: HTMLElement;
  private closeOtherTabsEl!: HTMLElement;
  private reOpenOldTab!: HTMLElement;
  private rootEl: HTMLElement;
  private tabRef: TabListEl | undefined; // Need to store it due to scrolling updates
  constructor(yasgui: Yasgui, rootEl: HTMLElement) {
    this.yasgui = yasgui;
    this.rootEl = rootEl;
    document.addEventListener("click", this.handleContextClick);
    document.addEventListener("keyup", this.closeConfigMenu);
  }
  private getMenuItemEl(text?: string) {
    const item = document.createElement("li");
    addClass(item, "context-menu-item");
    // Make sure hitting 'rmb' multiple times doesn't close the menu
    item.addEventListener("contextmenu", (event) => {
      event.stopPropagation();
    });
    if (text !== undefined) item.innerText = text;
    return item;
  }
  private draw(rootEl: HTMLElement) {
    this.contextEl = document.createElement("div");
    const dropDownList = document.createElement("ul");
    addClass(dropDownList, "context-menu-list");

    this.newTabEl = this.getMenuItemEl("New Tab");
    // We can set the function for addTab here already, as it doesn't need any outside data
    this.newTabEl.onclick = () => this.yasgui.addTab(true);

    this.renameTabEl = this.getMenuItemEl("Rename Tab");

    this.copyTabEl = this.getMenuItemEl("Copy Tab");

    this.closeTabEl = this.getMenuItemEl("Close Tab");

    this.closeOtherTabsEl = this.getMenuItemEl("Close other tabs");

    this.reOpenOldTab = this.getMenuItemEl("Undo close Tab");

    // Add items to list
    dropDownList.appendChild(this.newTabEl);
    dropDownList.appendChild(this.renameTabEl);
    dropDownList.appendChild(this.copyTabEl);
    // Add divider
    dropDownList.appendChild(document.createElement("hr"));
    dropDownList.appendChild(this.closeTabEl);
    dropDownList.appendChild(this.closeOtherTabsEl);
    dropDownList.appendChild(this.reOpenOldTab);
    this.contextEl.appendChild(dropDownList);
    addClass(this.contextEl, "yasgui", "context-menu");
    rootEl.appendChild(this.contextEl);
  }
  public redraw() {
    if (this.contextEl && this.tabRef?.tabEl) {
      const bounding = this.tabRef.tabEl.getBoundingClientRect();
      this.contextEl.style.top = `${window.pageYOffset + bounding.bottom}px`;
    }
  }
  handleContextClick = (event: MouseEvent) => {
    if (event.button !== 2) {
      this.closeConfigMenu();
    } else if (event.target !== this.contextEl) {
      this.closeConfigMenu();
    } else {
      event.stopImmediatePropagation();
    }
  };

  public openConfigMenu(currentTabId: string, currentTabEl: TabListEl, event: MouseEvent) {
    if (!currentTabEl.tabEl) return;
    this.draw(this.rootEl);
    this.tabRef = currentTabEl;
    const tab = this.yasgui.getTab(currentTabId);
    const bounding = currentTabEl.tabEl.getBoundingClientRect();
    this.contextEl.style.left = `${window.pageXOffset + bounding.left}px`;
    this.contextEl.style.top = `${window.pageYOffset + bounding.bottom}px`;
    event.stopPropagation();

    // Set rename functionality
    this.renameTabEl.onclick = () => currentTabEl.startRename();

    // Copy tab functionality`
    this.copyTabEl.onclick = () => {
      if (!tab) return;
      const config = cloneDeep(tab.getPersistedJson());
      config.id = getRandomId();
      this.yasgui.addTab(true, config);
    };

    // Close tab functionality
    this.closeTabEl.onclick = () => tab?.close();

    // Close other tab functionality
    if (Object.keys(this.yasgui._tabs).length === 1) {
      addClass(this.closeOtherTabsEl, "disabled");
    } else {
      this.closeOtherTabsEl.onclick = () => {
        for (const tabId of Object.keys(this.yasgui._tabs)) {
          if (tabId !== currentTabId) (this.yasgui.getTab(tabId) as Tab).close();
        }
      };
    }
    if (this.yasgui.persistentConfig && this.yasgui.persistentConfig.hasLastClosedTab()) {
      this.reOpenOldTab.onclick = () => this.yasgui.restoreLastTab();
    } else {
      addClass(this.reOpenOldTab, "disabled");
    }
  }
  public closeConfigMenu = () => {
    this.tabRef = undefined;
    if (this.contextEl) this.contextEl.remove();
  };

  public static get(yasgui: Yasgui, rootEl: HTMLElement) {
    const instance = new TabContextMenu(yasgui, rootEl);
    return instance;
  }
  public unregisterEventListeners() {
    document.removeEventListener("click", this.handleContextClick);
    document.removeEventListener("keyup", this.closeConfigMenu);
  }
  public destroy() {
    this.unregisterEventListeners();
  }
}
