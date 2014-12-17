'use strict';
var $ = require('jquery'),
	utils = require('./utils.js'),
	YASGUI = require('./main.js');
module.exports = function(yasgui, id) {
	//we only generate the settings for YASQE, as we modify lots of YASQE settings via the YASGUI interface
	//We leave YASR to store its settings separately, as this is all handled directly from the YASR controls
	var defaultPersistentYasqe = {
		endpoint: YASGUI.YASQE.defaults.sparql.endpoint,
		acceptHeaderGraph: YASGUI.YASQE.defaults.sparql.acceptHeaderGraph,
		acceptHeaderSelect: YASGUI.YASQE.defaults.sparql.acceptHeaderSelect,
		args: YASGUI.YASQE.defaults.sparql.args,
		defaultGraphs: YASGUI.YASQE.defaults.sparql.defaultGraphs,
		namedGraphs: YASGUI.YASQE.defaults.sparql.namedGraphs,
		requestMethod: YASGUI.YASQE.defaults.sparql.requestMethod,
	};
	
	var persistentOptions = yasgui.persistentOptions.tabManager.tabs[id];
	if (!persistentOptions.yasqe) persistentOptions.yasqe = defaultPersistentYasqe;
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
		var $form = $('<form>', {class: 'form-inline', role: 'form'}).appendTo($controlBar);
		
		
		var $formGroupButton = $('<div>', {class: 'form-group'}).appendTo($form);
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
			.appendTo($formGroupButton);
		
		//add endpoint text input
		var $formGroup = $('<div>', {class: 'form-group'}).appendTo($form);
		$endpointInput = $('<input>', {type: 'text', class: 'form-control endpointText', placeholder: 'Enter endpoint'})
			.on('keyup', function(){
				tab.persistentOptions.yasqe.endpoint = this.value;
				yasgui.store();
			})
			.val(tab.persistentOptions.yasqe.endpoint)
			.appendTo($formGroup);
	};
	
	addControlBar();
	var yasqeContainer = $('<div>', {id: 'yasqe_' + persistentOptions.id}).appendTo($paneContent);
	var yasrContainer = $('<div>', {id: 'yasq_' + persistentOptions.id}).appendTo($paneContent);
	
	var yasqeOptions = {};
	if (persistentOptions.yasqe.value) yasqeOptions.value = persistentOptions.yasqe.value;
	tab.yasqe = YASGUI.YASQE(yasqeContainer[0], yasqeOptions);
	tab.yasqe.on('blur', function(yasqe) {
			persistentOptions.yasqe.value = yasqe.getValue();
			yasgui.store();
		});
	tab.yasr = YASGUI.YASR(yasrContainer[0], {
		//this way, the URLs in the results are prettified using the defined prefixes in the query
		getUsedPrefixes: tab.yasqe.getPrefixesFromQuery
	});
	tab.yasqe.options.sparql.callbacks.complete = tab.yasr.setResponse;
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