'use strict';
//adding tabs: http://jsfiddle.net/dogoku/KdPdZ/2/
var $ = require('jquery'),
	utils = require('yasgui-utils'),
	imgs = require('./imgs.js');


module.exports = function(yasgui) {
	var manager = {};
	manager.tabs = {};
	var $tabsParent;
	
	var $tabPanel = null;
	
	var panes = {};
	
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
	};
	
	var closeTab = function(tabEl, id) {
		delete manager.tabs[id];
		tabEl.parents('li').remove();
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
						closeTab($(this), id);
					})
			);
		var $tabRename = $('<div><input></div>');
		
		$tabsParent.find('li:has(a[role="addTab"])').before(
				$("<li>", {role: "presentation"})
					.append($tabToggle)
					
					.append($tabRename)
					.dblclick(function(){
						var el = $(this);
						var val = el.find('span').text();
						el.addClass('rename');
						el.find('input').val(val);
						el.onOutsideClick(function(){
							var val = el.find('input').val();
							$tabToggle.find('span').text(el.find('input').val());
							el.removeClass('rename');
						})
					})
		);
		
		
		manager.tabs[id] = require('./tab.js')(yasgui, id, name);
		if (active) {
			$tabToggle.tab('show');
			manager.tabs[id].yasqe.refresh();
		}
	};
	
	manager.current = function() {
		
	};

	return manager;
};

