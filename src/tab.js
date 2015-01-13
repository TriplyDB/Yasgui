'use strict';
var $ = require('jquery'),
	utils = require('./utils.js'),
	YASGUI = require('./main.js');
//we only generate the settings for YASQE, as we modify lots of YASQE settings via the YASGUI interface
//We leave YASR to store its settings separately, as this is all handled directly from the YASR controls
var defaultPersistentYasqe = {
	sparql: {
		endpoint: YASGUI.YASQE.defaults.sparql.endpoint,
		acceptHeaderGraph: YASGUI.YASQE.defaults.sparql.acceptHeaderGraph,
		acceptHeaderSelect: YASGUI.YASQE.defaults.sparql.acceptHeaderSelect,
		args: YASGUI.YASQE.defaults.sparql.args,
		defaultGraphs: YASGUI.YASQE.defaults.sparql.defaultGraphs,
		namedGraphs: YASGUI.YASQE.defaults.sparql.namedGraphs,
		requestMethod: YASGUI.YASQE.defaults.sparql.requestMethod
	}
};



module.exports = function(yasgui, id, name) {
	if (!yasgui.persistentOptions.tabManager.tabs[id]) {
		yasgui.persistentOptions.tabManager.tabs[id] = {
			id: id,
			name: name,
			yasqe: defaultPersistentYasqe
		}
	} else {
		yasgui.persistentOptions.tabManager.tabs[id] = $.extend(true, {}, defaultPersistentYasqe, yasgui.persistentOptions.tabManager.tabs[id]);
	}
	var persistentOptions = yasgui.persistentOptions.tabManager.tabs[id];
	var tab = {
		persistentOptions: persistentOptions
	};
	
	var menu = require('./tabPaneMenu.js')(yasgui, tab);
	var $pane = $('<div>', {id:persistentOptions.id, style: 'position:relative', class: 'tab-pane', role: 'tabpanel'}).appendTo(yasgui.tabManager.$tabPanesParent);
	
	var $paneContent = $('<div>', {class:'wrapper'}).appendTo($pane);
	var $paneMenu = menu.initWrapper().appendTo($pane);
	var $endpointInput;
	var addControlBar = function() {
		var $controlBar = $('<div>', {class: 'controlbar'}).appendTo($paneContent);
		
		$('<button>', {type:'button', class: 'menuButton btn btn-default'})
			.on('click', function(e){
				if ($pane.hasClass('menu-open')) {
					$pane.removeClass('menu-open');
					menu.store();
				} else {
					menu.updateWrapper();
					$pane.addClass('menu-open');
//					utils.onOutsideClick($(".menu-slide,.menuButton"), function() {$pane.removeClass('menu-open'); menu.store();});
					$(".menu-slide,.menuButton").onOutsideClick(function() {$pane.removeClass('menu-open'); menu.store();});
					
				}
			})
			.append($('<span>', {class:'icon-bar'}))
			.append($('<span>', {class:'icon-bar'}))
			.append($('<span>', {class:'icon-bar'}))
			.appendTo($controlBar);
		
		//add endpoint text input
		$endpointInput = $('<select>')
			.appendTo($controlBar)
			.endpointCombi(yasgui, {
				value: persistentOptions.yasqe.sparql.endpoint,
				onChange: function(val){
					persistentOptions.yasqe.sparql.endpoint = val;
					yasgui.store();
					
				}
			});
		
	};
	
	addControlBar();
	var yasqeContainer = $('<div>', {id: 'yasqe_' + persistentOptions.id}).appendTo($paneContent);
	var yasrContainer = $('<div>', {id: 'yasq_' + persistentOptions.id}).appendTo($paneContent);
	
	
	
	var yasqeOptions = {
		createShareLink: require('./shareLink').getCreateLinkHandler(tab)
	};
	tab.setPersistentInYasqe = function() {
		if (tab.yasqe) {
			$.extend(true, tab.yasqe.options, persistentOptions.yasqe);
			//set value manualy, as this triggers a refresh
			tab.yasqe.setValue(persistentOptions.yasqe.value);
		}
	}
	$.extend(yasqeOptions, persistentOptions.yasqe);
	
	tab.onShow = function() {
		if (!tab.yasqe || !tab.yasr) {
			
			
			tab.yasqe = YASGUI.YASQE(yasqeContainer[0], yasqeOptions);
			tab.yasqe.on('blur', function(yasqe) {
				persistentOptions.yasqe.value = yasqe.getValue();
				yasgui.store();
			});
			tab.yasr = YASGUI.YASR(yasrContainer[0], {
				//this way, the URLs in the results are prettified using the defined prefixes in the query
				getUsedPrefixes: tab.yasqe.getPrefixesFromQuery
			});
			tab.yasqe.options.sparql.callbacks.complete = function() {
				tab.yasr.setResponse.apply(this, arguments);
				
				/**
				 * store query in hist
				 */
				persistentOptions.yasqe.value = tab.yasqe.getValue();//in case the onblur hasnt happened yet
				var resultSize = null;
				if (tab.yasr.results.getBindings()) {
					resultSize = tab.yasr.results.getBindings().length;
				}
				var histObject = {
					options: $.extend(true, {}, persistentOptions),//create copy
					resultSize: resultSize
				};
				delete histObject.options.name;//don't store this one
				yasgui.history.unshift(histObject);
			}
		}
	};
	
	tab.setOptions = function() {
	}
	tab.refreshYasqe = function() {
		$.extend(true, tab.yasqe.options, tab.persistentOptions.yasqe);
		tab.yasqe.setValue(tab.persistentOptions.yasqe.value);
//		console.log(tab.yasqe.options);
//		tab.yasqe.refresh();
	}
	tab.destroy = function() {
		console.log('todo: proper destorying of local storage');
	}
//	tab.generatePersistentSettings = function() {
//		//we only generate the settings for YASQE, as we modify lots of YASQE settings via the YASGUI interface
//		//We leave YASR to store its settings separately, as this is all handled directly from the YASR controls
//		return  {
//			name: tab.name,
//			yasqe: {
//				endpoint: tab.yasqe.options.sparql.endpoint,
//				acceptHeaderGraph: tab.yasqe.options.sparql.acceptHeaderGraph,
//				acceptHeaderSelect: tab.yasqe.options.sparql.acceptHeaderSelect,
//				args: tab.yasqe.options.sparql.args,
//				defaultGraphs: tab.yasqe.options.sparql.defaultGraphs,
//				namedGraphs: tab.yasqe.options.sparql.namedGraphs,
//				requestMethod: tab.yasqe.options.sparql.requestMethod,
//			}
//		}
//	};
	
	
	
	return tab;
}



