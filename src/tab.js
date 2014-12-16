'use strict';
var $ = require('jquery'),
	utils = require('./utils.js'),
	YASGUI = require('./main.js');

module.exports = function(yasgui, id, name) {
	
	var tab = {id: id, name: name};
	var menu = require('./tabPaneMenu.js')(yasgui, tab);
	var $pane = $('<div>', {id:id, style: 'position:relative', class: 'tab-pane', role: 'tabpanel'}).appendTo(yasgui.tabManager.$tabPanesParent);
	
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
				tab.yasqe.options.sparql.endpoint = this.value;
				yasgui.store();
			})
			.appendTo($formGroup);
	};
	
	addControlBar();
	var yasqeContainer = $('<div>', {id: 'yasqe_' + id}).appendTo($paneContent);
	var yasrContainer = $('<div>', {id: 'yasq_' + id}).appendTo($paneContent);
	
	
	tab.yasqe = YASGUI.YASQE(yasqeContainer[0]);
	tab.yasr = YASGUI.YASR(yasrContainer[0], {
		//this way, the URLs in the results are prettified using the defined prefixes in the query
		getUsedPrefixes: tab.yasqe.getPrefixesFromQuery
	});
	tab.yasqe.options.sparql.callbacks.complete =  tab.yasr.setResponse;
	
	tab.generatePersistentSettings = function() {
		//we only generate the settings for YASQE, as we modify lots of YASQE settings via the YASGUI interface
		//We leave YASR to store its settings separately, as this is all handled directly from the YASR controls
		return  {
			name: tab.name,
			yasqe: {
				endpoint: tab.yasqe.options.sparql.endpoint,
				acceptHeaderGraph: tab.yasqe.options.sparql.acceptHeaderGraph,
				acceptHeaderSelect: tab.yasqe.options.sparql.acceptHeaderSelect,
				args: tab.yasqe.options.sparql.args,
				defaultGraphs: tab.yasqe.options.sparql.defaultGraphs,
				namedGraphs: tab.yasqe.options.sparql.namedGraphs,
				requestMethod: tab.yasqe.options.sparql.requestMethod,
			}
		}
	};
	
	$endpointInput.val(tab.yasqe.options.sparql.endpoint);
	
	return tab;
}