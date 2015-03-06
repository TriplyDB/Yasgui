"use strict";
var $ = require('jquery'),
	EventEmitter = require('events').EventEmitter,
	imgs = require('./imgs.js'),
	utils = require('yasgui-utils');
require('./jquery/extendJquery.js');//extend some own jquery plugins
require('jquery-ui/position');

/**
 * set this dynamically on instantiation: this YASR setting is dependent on the corsProxy yasgui setting
 */
var setYasrOptions = function(options) {
	var corsLiHtml = 'Endpoint is not <a href="http://enable-cors.org/" target="_blank">CORS-enabled</a>';
	if (options.api.corsProxy) {
		//We have a proxy. only possible reason CORS is still an issue, is when endpoints runs on localhost, different port, and cors enabled
		corsLiHtml = 'Endpoint is not accessible from the YASGUI server and website, and the endpoint is not <a href="http://enable-cors.org/" target="_blank">CORS-enabled</a>';
	}	
	module.exports.YASR.plugins.error.defaults.corsMessage =  $('<div>')
		.append($('<p>').append('Unable to get response from endpoint. Possible reasons:'))
		.append($('<ul>')
			.append($('<li>').text('Incorrect endpoint URL'))
			.append($('<li>').text('Endpoint is down'))
			.append($('<li>').html(corsLiHtml))
		);

}
var YASGUI = function(parent, options) {
	EventEmitter.call(this);
	var yasgui = this;
	yasgui.wrapperElement = $('<div class="yasgui"></div>').appendTo($(parent));
	yasgui.options = $.extend(true, {}, module.exports.defaults, options);
	setYasrOptions(yasgui.options);
	yasgui.history = [];
	
	yasgui.persistencyPrefix = null;
	if (yasgui.options.persistencyPrefix) {
		yasgui.persistencyPrefix = (typeof yasgui.options.persistencyPrefix == 'function'? yasgui.options.persistencyPrefix(yasgui): yasgui.options.persistencyPrefix);
	}
	
	if (yasgui.persistencyPrefix) {
		var histFromStorage = utils.storage.get(yasgui.persistencyPrefix + 'history');
		if (histFromStorage) yasgui.history = histFromStorage;
	}
	
	
	yasgui.store = function() {
		if (yasgui.persistentOptions) {
			utils.storage.set(yasgui.persistencyPrefix, yasgui.persistentOptions);
		}
	};
	
	var getSettingsFromStorage = function() {
		var settings = utils.storage.get(yasgui.persistencyPrefix);
		if (!settings) settings = {};//initialize blank. Default vals will be set as we go
		return settings;
	}
	
	yasgui.persistentOptions = getSettingsFromStorage();
	
	if (yasgui.persistentOptions.tabManager) yasgui.persistentOptions = yasgui.persistentOptions.tabManager;//for backwards compatability
	var persistentOptions = yasgui.persistentOptions;
	
	//tab object (containing e.g. yasqe/yasr)
	yasgui.tabs = {};
	
	//the actual tabs parent containing the ul of tab buttons
	var $tabsParent;
	
	//contains the tabs and panes
	var $tabPanel = null;
	
	//context menu for the tab context menu
	var $contextMenu = null;
	
	var getTabName = function(name, i) {
		if (!name) name = "Query";
		if (!i) i = 0;
		var fullName = name + (i > 0? " " + i: "");
		
		if (tabNameTaken(fullName)) fullName = getTabName(name, i+1);
		return fullName;
	}
	var tabNameTaken = function(name) {
		for (var tabId in yasgui.tabs) {
			if (yasgui.tabs[tabId].persistentOptions.name == name) {
				return true;
			}
		}
		return false;
	};
	
	var getRandomId = function() {
		return Math.random().toString(36).substring(7);
	};
	
	
	yasgui.init = function() {
		
		//tab panel contains tabs and panes
		$tabPanel = $('<div>', {role: 'tabpanel'}).appendTo(yasgui.wrapperElement);
		
		//init tabs
		$tabsParent = $('<ul>', {class:'nav nav-tabs mainTabs', role: 'tablist'}).appendTo($tabPanel);
		
		
		//init add button
		var $addTab= $('<a>', {role: 'addTab'})
			.click(function(e){ 
				addTab();
			})
			.text('+');
		$tabsParent.append(
				$("<li>", {role: "presentation"})
					.append($addTab)
		);
		
		//init panes
		yasgui.$tabPanesParent = $('<div>', {class: 'tab-content'}).appendTo($tabPanel);
		
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
			yasgui.once('ready', function() {
				if (persistentOptions.tabs[tabId].yasr.outputSettings) {
					var plugin = yasgui.current().yasr.plugins[persistentOptions.tabs[tabId].yasr.output];
					if (plugin.options) {
						$.extend(plugin.options, persistentOptions.tabs[tabId].yasr.outputSettings);
					}
					delete persistentOptions.tabs[tabId]['yasr']['outputSettings'];
				}

				yasgui.current().query();
			})
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
		addMenuItem('Add new Tab', function(tabId) {
			addTab();
		});
		addMenuItem('Rename', function(tabId) {
			$tabsParent.find('a[href="#' +tabId+ '"]').dblclick();
		});
		addMenuItem('Copy', function(tabId){
			var newTabId = getRandomId();
			var copiedSettings = $.extend(true, {}, persistentOptions.tabs[tabId]);
			copiedSettings.id = newTabId;
			persistentOptions.tabs[newTabId] = copiedSettings;
			addTab(newTabId);
			selectTab(newTabId);
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
		return yasgui.current();
	}
	var closeTab = function(id) {
		/**
		 * cleanup local storage
		 */
		yasgui.tabs[id].destroy();
		
		/**cleanup variables**/
		delete yasgui.tabs[id];
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
        return yasgui.current();
	};
	var addTab = function(tabId) {
		var newItem = !tabId;
		if (!tabId) tabId = getRandomId();
		if (!('tabs' in persistentOptions)) persistentOptions.tabs = {};
		var name = null;
		if (persistentOptions.tabs[tabId] && persistentOptions.tabs[tabId].name) {
			name = persistentOptions.tabs[tabId].name
		}
		if (!name) name = getTabName();
		
		
		//Initialize new tab with endpoint from currently selected tab (if there is one)
		var endpoint = null;
		if (yasgui.current() && yasgui.current().getEndpoint()) {
			endpoint = yasgui.current().getEndpoint();
		}
		
		//first add tab
		var $tabToggle = $('<a>', {href: '#' + tabId, 'aria-controls': tabId,  role: 'tab', 'data-toggle': 'tab'})
			.click(function (e) {
				e.preventDefault();
				$(this).tab('show');
				yasgui.tabs[tabId].yasqe.refresh();
			})
			.on('shown.bs.tab', function (e) {
				persistentOptions.selected = $(this).attr('aria-controls');
				yasgui.tabs[tabId].onShow();
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
		yasgui.tabs[tabId] = require('./tab.js')(yasgui, tabId, name, endpoint);
		if (newItem || persistentOptions.selected == tabId) {
			yasgui.tabs[tabId].beforeShow();
			$tabToggle.tab('show');
		}
		return yasgui.tabs[tabId];
	};

	
	yasgui.current = function() {
		return yasgui.tabs[persistentOptions.selected];
	}
	yasgui.addTab = addTab;
	
	yasgui.init();
	
	yasgui.tracker = require('./tracker.js')(yasgui);
	
	yasgui.emit('ready');
	return yasgui;
};
YASGUI.prototype = new EventEmitter;

module.exports = function(parent, options) {
	return new YASGUI(parent, options);
}

module.exports.YASQE = require('./yasqe.js');
module.exports.YASR = require('./yasr.js');
module.exports.$ = $;
module.exports.defaults = require('./defaults.js');