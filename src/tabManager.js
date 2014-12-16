'use strict';
var $ = require('jquery'),
	utils = require('yasgui-utils'),
	imgs = require('./imgs.js');
require('jquery-ui/position');

module.exports = function(yasgui) {
	var manager = {};
	//tab object (containing e.g. yasqe/yasr)
	manager.tabs = {};
	
	//the actual tabs parent containing the ul of tab buttons
	var $tabsParent;
	
	//contains the tabs and panes
	var $tabPanel = null;
	
	//context menu for the tab context menu
	var $contextMenu = null;
	
	//order of tab IDs
	var tabOrder = [];
	
	var getName = function(name, i) {
		if (!name) name = "Query";
		if (!i) i = 0;
		var fullName = name + (i > 0? " " + i: "");
		
		if (nameTaken(fullName)) fullName = getName(name, i+1);
		return fullName;
	}
	var nameTaken = function(name) {
		for (var tabId in manager.tabs) {
			if (manager.tabs[tabId].name == name) {
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
			.click(function(){addTab(true)})
			.text('+');
		$tabsParent.append(
				$("<li>", {role: "presentation"})
					.append($addTab)
		);
		
		//init panes
		manager.$tabPanesParent = $('<div>', {class: 'tab-content'}).appendTo($tabPanel);
		
		addTab(true);
		$tabsParent.sortable({
			placeholder: "tab-sortable-highlight",
			items: 'li:has([data-toggle="tab"])',//don't allow sorting after ('+') icon
			forcePlaceholderSize: true
				
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
	
	var closeTab = function(id) {
		delete manager.tabs[id];
		$tabsParent.find('a[href="#' + id + '"]').closest('li').remove();
        $("#"+id).remove();
	};
	var addTab = function(active, id, name) {
		if (!id) id = getRandomId();
		if (!name) name = getName();
		//first add tab
		var $tabToggle = $('<a>', {href: '#' + id, 'aria-controls': id,  role: 'tab', 'data-toggle': 'tab'})
			.click(function (e) {
				e.preventDefault();
				$(this).tab('show');
				manager.tabs[id].yasqe.refresh();
			})
			.append($('<span>').text(name))
			.append(
				$('<button>',{ class:"close",type:"button"})
					.text('x')
					.click(function() {
						closeTab(id);
					})
			);
		var $tabRename = $('<div><input></div>');
		
		var $tabItem = $("<li>", {role: "presentation"})
			.append($tabToggle)
			
			.append($tabRename)
			.dblclick(function(){
				var el = $(this);
				var val = el.find('span').text();
				el.addClass('rename');
				el.find('input').val(val);
				el.onOutsideClick(function(){
					var tabId = el.find('a[role="tab"]').attr('aria-controls');
					var val = el.find('input').val();
					$tabToggle.find('span').text(el.find('input').val());
					manager.tabs[tabId].name = val;
					yasgui.store();
					el.removeClass('rename');
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
		    		.position({
		    			my: "left top-3",
		    	        at: "left bottom",
		    	        of: $(this),
		    	        collision: "fit",
		    		})
		    		.attr('target-tab', $tabItem.find('a[role="tab"]').attr('aria-controls'))
		    });
		
		
		$tabsParent.find('li:has(a[role="addTab"])').before($tabItem);
		
		tabOrder.push(id);
		manager.tabs[id] = require('./tab.js')(yasgui, id, name);
		if (active) {
			$tabToggle.tab('show');
			manager.tabs[id].yasqe.refresh();
		}
	};
	
	manager.current = function() {
		
	};
	
	manager.generatePersistentSettings = function() {
		var persistentSettings = {
			tabOrder: tabOrder,
			tabs: {},
		};
		for (var id in manager.tabs) {
			persistentSettings.tabs[id] = manager.tabs[id].generatePersistentSettings();
		}
		return persistentSettings;
	};
	return manager;
};

