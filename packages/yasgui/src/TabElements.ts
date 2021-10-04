import Yasgui from "./";
import TabContextMenu from "./TabContextMenu";
import { hasClass, addClass, removeClass } from "@triply/yasgui-utils";
const sortablejs = require("sortablejs");
require("./TabElements.scss");
export interface TabList {}
export class TabListEl {
  private tabList: TabList;
  private tabId: string;
  private yasgui: Yasgui;
  private renameEl?: HTMLInputElement;
  private nameEl?: HTMLSpanElement;
  public tabEl?: HTMLDivElement;
  constructor(yasgui: Yasgui, tabList: TabList, tabId: string) {
    this.tabList = tabList;
    this.yasgui = yasgui;
    this.tabId = tabId;
  }
  public delete() {
    if (this.tabEl) {
      this.tabList._tabsListEl?.removeChild(this.tabEl);
      delete this.tabList._tabs[this.tabId];
    }
  }
  public startRename() {
    if (this.renameEl) {
      const tab = this.yasgui.getTab(this.tabId);
      if (tab) {
        this.renameEl.value = tab.name();
        addClass(this.tabEl, "renaming");
        this.renameEl.focus();
      }
    }
  }
  public active(active: boolean) {
    if (!this.tabEl) return;
    if (active) {
      addClass(this.tabEl, "active");
      // add aria-properties
      this.tabEl.children[0].setAttribute("aria-selected", "true"); // change with changeTabs func
      this.tabEl.children[0].setAttribute("tabindex", "0"); // change with changeTabs func
    } else {
      removeClass(this.tabEl, "active");
      // remove aria-properties
      this.tabEl.children[0].setAttribute("aria-selected", "false"); // change with changeTabs func
      this.tabEl.children[0].setAttribute("tabindex", "-1"); // change with changeTabs func
    }
  }
  public rename(name: string) {
    if (this.nameEl) {
      this.nameEl.textContent = name;
    }
  }
  public setAsQuerying(querying: boolean) {
    if (querying) {
      addClass(this.tabEl, "querying");
    } else {
      removeClass(this.tabEl, "querying");
    }
  }
  public draw(name: string) {
    this.tabEl = document.createElement("div");
    this.tabEl.setAttribute("role", "presentation");
    this.tabEl.ondblclick = () => {
      this.startRename();
    };
    addClass(this.tabEl, "tab");

    const tabLinkEl = document.createElement("a"); // This is our tab
    tabLinkEl.setAttribute("role", "tab");
    tabLinkEl.href = "#" + this.tabId;
    tabLinkEl.id = "tab-" + this.tabId; // why is the tab id the same as the panel id?
    tabLinkEl.setAttribute("aria-controls", this.tabId); // respective tabPanel id
    tabLinkEl.addEventListener("blur", () => {
      const activeTabId = this.yasgui.persistentConfig.getActiveId();
      if (activeTabId === this.tabId) {
        tabLinkEl.setAttribute("tabindex", "0");
      } else {
        tabLinkEl.setAttribute("tabindex", "-1");
      }
      return;
    });
    tabLinkEl.addEventListener("focus", () => {
      console.log("focus tab");
      const activeTabId = this.yasgui.persistentConfig.getActiveId();
      if (activeTabId === this.tabId) {
        const allTabs = this.yasgui.getAllTabArray();
        const activeTabIndex = allTabs.indexOf(activeTabId);
        this.tabList.ariaTabIndex = activeTabIndex;
      }
    });
    // if (this.yasgui.persistentConfig.tabIsActive(this.tabId)) {
    //   this.yasgui.store.dispatch(selectTab(this.tabId))
    // }
    tabLinkEl.onclick = (e) => {
      e.preventDefault();
      this.yasgui.selectTabId(this.tabId);
    };

    //tab name
    this.nameEl = document.createElement("span");
    this.nameEl.textContent = name;
    tabLinkEl.appendChild(this.nameEl);

    //tab close btn
    const closeBtn = document.createElement("div");
    closeBtn.innerHTML = "&#x2716;";
    closeBtn.title = "Close tab";
    addClass(closeBtn, "closeTab");
    closeBtn.onclick = (e) => {
      e.preventDefault();
      this.yasgui.getTab(this.tabId)?.close();
    };
    tabLinkEl.appendChild(closeBtn);

    const renameEl = (this.renameEl = document.createElement("input"));
    renameEl.type = "text";
    renameEl.value = name;
    renameEl.onkeyup = (event) => {
      if (event.key === "Enter") {
        this.yasgui.getTab(this.tabId)?.setName(renameEl.value);
        removeClass(this.tabEl, "renaming");
      }
    };
    renameEl.onblur = () => {
      this.yasgui.getTab(this.tabId)?.setName(renameEl.value);
      removeClass(this.tabEl, "renaming");
    };
    tabLinkEl.appendChild(this.renameEl);
    tabLinkEl.oncontextmenu = (ev: MouseEvent) => {
      // Close possible old
      this.tabList.tabContextMenu?.closeConfigMenu();
      this.openTabConfigMenu(ev);
      ev.preventDefault();
      ev.stopPropagation();
    };
    this.tabEl.appendChild(tabLinkEl);

    //draw loading animation overlay
    const loaderEl = document.createElement("div");
    addClass(loaderEl, "loader");
    this.tabEl.appendChild(loaderEl);

    return this.tabEl;
  }
  private openTabConfigMenu(event: MouseEvent) {
    this.tabList.tabContextMenu?.openConfigMenu(this.tabId, this, event);
  }
  redrawContextMenu() {
    this.tabList.tabContextMenu?.redraw();
  }
}

export class TabList {
  yasgui: Yasgui;

  private _selectedTab?: string;
  private addTabEl?: HTMLDivElement;
  public _tabs: { [tabId: string]: TabListEl } = {};
  public _tabsListEl?: HTMLDivElement; //the list of actual tabs
  public tabContextMenu?: TabContextMenu;
  public ariaTabIndex: number | undefined;

  constructor(yasgui: Yasgui) {
    this.yasgui = yasgui;
    this.registerListeners();
    this.ariaTabIndex = yasgui.persistentConfig.getActiveIndex();
  }
  get(tabId: string) {
    return this._tabs[tabId];
  }

  private registerListeners() {
    this.yasgui.on("query", (_yasgui, tab) => {
      const id = tab.getId();
      if (this._tabs[id]) {
        this._tabs[id].setAsQuerying(true);
      }
    });
    this.yasgui.on("queryResponse", (_yasgui, tab) => {
      const id = tab.getId();
      if (this._tabs[id]) {
        this._tabs[id].setAsQuerying(false);
      }
    });
    this.yasgui.on("queryAbort", (_yasgui, tab) => {
      const id = tab.getId();
      if (this._tabs[id]) {
        this._tabs[id].setAsQuerying(false);
      }
    });
  }
  drawTabsList() {
    this._tabsListEl = document.createElement("div");
    addClass(this._tabsListEl, "tabsList");
    this._tabsListEl.setAttribute("role", "tablist");
    this._tabsListEl.addEventListener("keydown", (e: KeyboardEvent) => {
      // determines tabfocus using the keyboard
      // console.log("tablist");
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        // console.log("tablist arrowKeys", e.code);
        if (!this._tabsListEl) return;
        const numOfChildren = this._tabsListEl.childElementCount - 1; // minus 1 to not count the add new tab
        if (typeof this.ariaTabIndex !== "number") return;
        const divTab = this._tabsListEl.children[this.ariaTabIndex];
        divTab.children[0].setAttribute("tabindex", "-1"); // cur tab removed from tab index
        // a) if tab is active, dont remove ariaTabIndex
        // b) on tabList event blur tabindex "0" for active tab
        if (e.code === "ArrowLeft") {
          // console.log("left");
          this.ariaTabIndex--;
          if (this.ariaTabIndex < 0) {
            this.ariaTabIndex = numOfChildren - 1;
          }
        }
        if (e.code === "ArrowRight") {
          // console.log("right");
          this.ariaTabIndex++;
          if (this.ariaTabIndex >= numOfChildren) {
            this.ariaTabIndex = 0;
          }
        }
        const newDivTab = this._tabsListEl.children[this.ariaTabIndex];
        newDivTab.children[0].setAttribute("tabindex", "0"); // include the new tab in the tab index, would this be better to specify an anchor tag?
        (newDivTab.children[0] as HTMLElement).focus(); // focus on the a tag inside the div for click event
      }
    });

    sortablejs.default.create(this._tabsListEl, {
      group: "tabList",
      animation: 100,
      onUpdate: (_ev: any) => {
        const tabs = this.deriveTabOrderFromEls();
        this.yasgui.emit("tabOrderChanged", this.yasgui, tabs);
        this.yasgui.persistentConfig.setTabOrder(tabs);
      },
      filter: ".addTab",
      onMove: (ev: any, _origEv: any) => {
        return hasClass(ev.related, "tab");
      },
    });

    this.addTabEl = document.createElement("div");
    this.addTabEl.setAttribute("role", "presentation");

    const addTabLink = document.createElement("a");
    addTabLink.className = "addTab";
    addTabLink.textContent = "+";
    addTabLink.title = "Add tab";
    addTabLink.setAttribute("tabindex", "0");
    addTabLink.addEventListener("click", this.handleAddNewTab);
    addTabLink.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.code === "Enter") {
        console.log("add new tab");
        this.handleAddNewTab(e);
      }
    });
    this.addTabEl.appendChild(addTabLink);
    this._tabsListEl.appendChild(this.addTabEl);
    this.tabContextMenu = TabContextMenu.get(
      this.yasgui,
      this.yasgui.config.contextMenuContainer ? this.yasgui.config.contextMenuContainer : this._tabsListEl
    );
    return this._tabsListEl;
  }
  handleAddNewTab = (event: Event) => {
    event.preventDefault();
    this.yasgui.addTab(true);
  };
  // drawPanels() {
  //   this.tabPanelsEl = document.createElement("div");
  //   return this.tabsListEl;
  // }

  //

  public addTab(tabId: string, index?: number) {
    return this.drawTab(tabId, index);
  }
  public deriveTabOrderFromEls() {
    const tabs: string[] = [];
    if (this._tabsListEl) {
      for (let i = 0; i < this._tabsListEl.children.length; i++) {
        const child = this._tabsListEl.children[i]; //this is the tab div
        const anchorTag = child.children[0]; //this one has an href
        if (anchorTag) {
          const href = (<HTMLAnchorElement>anchorTag).href;
          if (href && href.indexOf("#") >= 0) {
            tabs.push(href.substr(href.indexOf("#") + 1));
          }
        }
      }
    }
    return tabs;
  }

  public selectTab(tabId: string) {
    this._selectedTab = tabId;
    for (const id in this._tabs) {
      this._tabs[id].active(this._selectedTab === id);
    }
  }

  public drawTab(tabId: string, index?: number) {
    this._tabs[tabId] = new TabListEl(this.yasgui, this, tabId);
    const tabConf = this.yasgui.persistentConfig.getTab(tabId);
    if (index !== undefined && index < this.yasgui.persistentConfig.getTabs().length - 1) {
      this._tabsListEl?.insertBefore(
        this._tabs[tabId].draw(tabConf.name),
        this._tabs[this.yasgui.persistentConfig.getTabs()[index + 1]].tabEl || null
      );
    } else {
      this._tabsListEl?.insertBefore(this._tabs[tabId].draw(tabConf.name), this.addTabEl || null);
    }
  }
  public destroy() {
    for (const tabId in this._tabs) {
      const tab = this._tabs[tabId];
      tab.delete();
    }
    this._tabs = {};
    this.tabContextMenu?.destroy();
    this._tabsListEl?.remove();
    this._tabsListEl = undefined;
  }
}

export default TabList;
