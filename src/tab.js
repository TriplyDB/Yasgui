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
		$('<input>', {type: 'text', class: 'form-control endpointText', placeholder: 'Enter endpoint'})
			.on('keyup', function(){tab.yasqe.options.sparql.endpoint = this.value;})
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

	/**
	* Set some of the hooks to link YASR and YASQE
	*/
	tab.yasqe.options.sparql.callbacks.success =  function(data, textStatus, xhr) {
		tab.yasr.setResponse({response: data, contentType: xhr.getResponseHeader("Content-Type")});
	};
	tab.yasqe.options.sparql.callbacks.error = function(xhr, textStatus, errorThrown) {
		var exceptionMsg = textStatus + " (#" + xhr.status + ")";
		if (errorThrown && errorThrown.length) exceptionMsg += ": " + errorThrown;
		tab.yasr.setResponse({exception: exceptionMsg});
	};
	
	
	return tab;
}