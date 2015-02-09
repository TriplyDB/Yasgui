'use strict';
var $ = require('jquery'),
	utils = require('yasgui-utils'),
	imgs = require('./imgs.js');
require('jquery-ui/position');

module.exports = function(yasgui) {
	if (!yasgui.persistentOptions.tabManager) {
		yasgui.persistentOptions.tabManager = {}
	}
	var persistentOptions = yasgui.persistentOptions.tabManager;
	var manager = {};
	//tab object (containing e.g. yasqe/yasr)
	manager.tabs = {};
	
	//the actual tabs parent containing the ul of tab buttons
	var $tabsParent;
	
	//contains the tabs and panes
	var $tabPanel = null;
	
	//context menu for the tab context menu
	var $contextMenu = null;
	
	var getName = function(name, i) {
		if (!name) name = "Query";
		if (!i) i = 0;
		var fullName = name + (i > 0? " " + i: "");
		
		if (nameTaken(fullName)) fullName = getName(name, i+1);
		return fullName;
	}
	var nameTaken = function(name) {
		for (var tabId in manager.tabs) {
			if (manager.tabs[tabId].persistentOptions.name == name) {
				return true;
			}
		}
		return false;
	};
	
	var getRandomId = function() {
		return Math.random().toString(36).substring(7);
	};
	
	
	manager.init = function() {
		
		//tab panel contains tabs and panes
		$tabPanel = $('<div>', {role: 'tabpanel'}).appendTo(yasgui.wrapperElement);
		
		//init tabs
		$tabsParent = $('<ul>', {class:'nav nav-tabs mainTabs', role: 'tablist'}).appendTo($tabPanel);
		
		
		//init add button
		var $addTab= $('<a>', {role: 'addTab'})
			.click(function(){addTab()})
			.text('+');
		$tabsParent.append(
				$("<li>", {role: "presentation"})
					.append($addTab)
		);
		
		//init panes
		manager.$tabPanesParent = $('<div>', {class: 'tab-content'}).appendTo($tabPanel);
		
		if (!persistentOptions || $.isEmptyObject(persistentOptions)) {
			//ah, this is on first load. initialize some stuff
			persistentOptions.tabOrder = [];
			persistentOptions.tabs = {};
			persistentOptions.selected = null;
		}
		var optionsFromUrl = require('./shareLink.js').getOptionsFromUrl();
		if (optionsFromUrl) {
			//hmm, we have options from the url. make sure we initialize everything using this tab
			//the one thing we don't have is the ID. generate it.
			var tabId = getRandomId();
			optionsFromUrl.id = tabId;
			persistentOptions.tabs[tabId] = optionsFromUrl;
			persistentOptions.tabOrder.push(tabId);
			persistentOptions.selected = tabId;
		}
		
		if (persistentOptions.tabOrder.length > 0) {
			persistentOptions.tabOrder.forEach(addTab);
		} else {
			//hmm, nothing to be drawn. just initiate a single tab
			addTab();
		}
			
		$tabsParent.sortable({
			placeholder: "tab-sortable-highlight",
			items: 'li:has([data-toggle="tab"])',//don't allow sorting after ('+') icon
			forcePlaceholderSize: true,
			update: function() {
				var newTabOrder = [];
				$tabsParent.find('a[data-toggle="tab"]').each(function(){
					newTabOrder.push($(this).attr('aria-controls'));
				});
				persistentOptions.tabOrder = newTabOrder;
				yasgui.store();
			}
				
		});
		
		//Add context menu
		$contextMenu = $('<div>', {class:'tabDropDown'}).appendTo(yasgui.wrapperElement);
		var $contextMenuList = $('<ul>', {class:'dropdown-menu', role: 'menu'}).appendTo($contextMenu);
		var addMenuItem = function(name, onClick) {
			var $listItem = $('<li>', {role: 'presentation'}).appendTo($contextMenuList);
			if (name) {
				$listItem.append($('<a>', {role:'menuitem', href: '#'}).text(name))
					.click(function(){
						$contextMenu.hide();
						event.preventDefault();
						if (onClick) onClick($contextMenu.attr('target-tab'));
					})
			} else {
				$listItem.addClass('divider');
			}
		};
		addMenuItem('Rename', function(tabId) {
			$tabsParent.find('a[href="#' +tabId+ '"]').dblclick();
		});
		addMenuItem('Copy', function(tabId){
			console.log('todo');
		});
		addMenuItem();
		addMenuItem('Close', closeTab);
		addMenuItem('Close others', function(tabId) {
			$tabsParent.find('a[role="tab"]').each(function() {
				var currentId = $(this).attr('aria-controls');
				if (currentId != tabId) closeTab(currentId);
			})
		});
		addMenuItem('Close all', function() {
			$tabsParent.find('a[role="tab"]').each(function() {
				closeTab($(this).attr('aria-controls'));
			})
		});
	};
	var selectTab = function(id) {
		$tabsParent.find('a[aria-controls="' + id + '"]').tab('show');
		return manager.current();
	}
	var closeTab = function(id) {
		/**
		 * cleanup local storage
		 */
		manager.tabs[id].destroy();
		
		/**cleanup variables**/
		delete manager.tabs[id];
		delete persistentOptions.tabs[id];
		var orderIndex = persistentOptions.tabOrder.indexOf(id);
		if (orderIndex > -1) persistentOptions.tabOrder.splice(orderIndex, 1);
		
		/**
		 * select new tab
		 */
		var newSelectedIndex = null;
		if (persistentOptions.tabOrder[orderIndex]) {
			//use the tab now in position of the old one
			newSelectedIndex = orderIndex;
		} else if (persistentOptions.tabOrder[orderIndex-1]) {
			//use the tab in the previous position
			newSelectedIndex = orderIndex-1;
		}
		if (newSelectedIndex !== null) selectTab(persistentOptions.tabOrder[newSelectedIndex]);
		
		/**
		 * cleanup dom
		 */
		$tabsParent.find('a[href="#' + id + '"]').closest('li').remove();
        $("#"+id).remove();
        
        
        yasgui.store();
        return manager.current();
	};
	var addTab = function(tabId) {
		var newItem = !tabId;
		if (!tabId) tabId = getRandomId();
		if (!('tabs' in persistentOptions)) persistentOptions.tabs = {};
		var name = (persistentOptions.tabs[tabId]? persistentOptions.tabs[tabId].name: getName());
		
		
		//Initialize new tab with endpoint from currently selected tab (if there is one)
		var endpoint = null;
		if (manager.current && manager.current() && manager.current().getEndpoint()) {
			endpoint = manager.current().getEndpoint();
		}
		
		//first add tab
		var $tabToggle = $('<a>', {href: '#' + tabId, 'aria-controls': tabId,  role: 'tab', 'data-toggle': 'tab'})
			.click(function (e) {
				e.preventDefault();
				$(this).tab('show');
				manager.tabs[tabId].yasqe.refresh();
			})
			.on('shown.bs.tab', function (e) {
				persistentOptions.selected = $(this).attr('aria-controls');
				manager.tabs[tabId].onShow();
				yasgui.store();
			})
			.append($('<span>').text(name))
			.append(
				$('<button>',{ class:"close",type:"button"})
					.text('x')
					.click(function() {
						closeTab(tabId);
					})
			);
		var $tabRename = $('<div><input type="text"></div>')
			.keydown(function(e) {
				if (event.which == 27 || event.keyCode == 27) {
					//esc
					$(this).closest('li').removeClass('rename');
				} else if (event.which == 13 || event.keyCode == 13) {
					//enter
					storeRename($(this).closest('li'));
				}
			})
		
		
		var storeRename = function($liEl) {
			var tabId = $liEl.find('a[role="tab"]').attr('aria-controls');
			var val = $liEl.find('input').val();
			$tabToggle.find('span').text($liEl.find('input').val());
			persistentOptions.tabs[tabId].name = val;
			yasgui.store();
			$liEl.removeClass('rename');
		};
		var $tabItem = $("<li>", {role: "presentation"})
			.append($tabToggle)
			
			.append($tabRename)
			.dblclick(function(){
				var el = $(this);
				var val = el.find('span').text();
				el.addClass('rename');
				el.find('input').val(val);
				el.onOutsideClick(function(){
					storeRename(el);
				})
			})
			.bind('contextmenu', function(e){ 
		    	e.preventDefault();
		    	$contextMenu
		    		.show()
			    	.onOutsideClick(function() {
						$contextMenu.hide();
					}, {allowedElements: $(this).closest('li')})
		    		.addClass('open')
		    		.attr('target-tab', $tabItem.find('a[role="tab"]').attr('aria-controls'))
		    		.position({
		    			my: "left top-3",
		    	        at: "left bottom",
		    	        of: $(this),
		    		});
		    		
		    });
		
		
		$tabsParent.find('li:has(a[role="addTab"])').before($tabItem);
		
		if (newItem) persistentOptions.tabOrder.push(tabId);
		manager.tabs[tabId] = require('./tab.js')(yasgui, tabId, name, endpoint);
		if (newItem || persistentOptions.selected == tabId) {
			$tabToggle.tab('show');
		}
		return manager.tabs[tabId];
	};
	
	manager.current = function() {
		return manager.tabs[persistentOptions.selected];
	}
	return manager;
};

