'use strict';
var $ = require('jquery'),
	imgs = require('./imgs.js'),
	utils = require('yasgui-utils');
module.exports = function(yasgui, tab) {
	var $menu = null;
	var $tabPanel = null;
	var $tabsParent = null;
	var $tabPanesParent = null;
	var $paneReqConfig = null;
	
	
	var $btnPost;
	var $btnGet;
	var $acceptSelect; 
	var $acceptGraph;
	var $urlArgsDiv;
	var $defaultGraphsDiv;
	var $namedGraphsDiv;
	var initWrapper = function() {
		$menu = $('<nav>', {class: 'menu-slide', id: 'navmenu'});
		$(utils.svg.getElement(imgs.yasgui, {width: '40px', height: '40px'})).appendTo($menu);
		
		//tab panel contains tabs and panes
		$tabPanel = $('<div>', {role: 'tabpanel'}).appendTo($menu);
		
		//init tabs
		$tabsParent = $('<ul>', {class:'nav nav-pills', role: 'tablist'}).appendTo($tabPanel);
		
		//init panes
		$tabPanesParent = $('<div>', {class: 'tab-content'}).appendTo($tabPanel);
		
		
		/**
		 * Init request tab
		 */
		var li = $("<li>", {role: "presentation", class: "active"}).appendTo($tabsParent);
		var reqPaneId = 'yasgui_reqConfig_' +tab.id;
		li.append($('<a>', {href: '#' + reqPaneId, 'aria-controls': reqPaneId,  role: 'tab', 'data-toggle': 'pill'}).text("Configure Request"));
		var $reqPanel = $('<div>', {id: reqPaneId, class: 'tabPane requestConfig container-fluid'}).appendTo($tabPanesParent);
		
		//request method
		var $reqRow = $('<div>', {class: 'row'}).appendTo($reqPanel);
		$('<div>', {class:'col-md-4 rowLabel'}).appendTo($reqRow).append($('<span>').text('Request Method'));
		$btnPost = $('<button>', {class:'btn btn-default ','data-toggle':"button"}).text('POST').click(function(){
			$btnPost.addClass('active');
			$btnGet.removeClass('active');
		});
		$btnGet = $('<button>', {class:'btn btn-default', 'data-toggle':"button"}).text('GET').click(function(){
			$btnGet.addClass('active');
			$btnPost.removeClass('active');
		});
		$('<div>', {class:'btn-group col-md-8', role: 'group'}).append($btnGet).append($btnPost).appendTo($reqRow);
		
		//Accept headers
		var $acceptRow = $('<div>', {class: 'row'}).appendTo($reqPanel);
		$('<div>', {class:'col-md-4 rowLabel'}).appendTo($acceptRow).text('Accept Headers');
		$acceptSelect = $('<select>', {class: 'form-control'})
//			.append($("<option>", {value: ''}).text('---'))
			.append($("<option>", {value: 'application/sparql-results+json'}).text('JSON'))
			.append($("<option>", {value: 'application/sparql-results+xml'}).text('XML'))
			.append($("<option>", {value: 'text/csv'}).text('CSV'))
			.append($("<option>", {value: 'text/tab-separated-values'}).text('TSV'));
		$acceptGraph = $('<select>', {class: 'form-control'})
//			.append($("<option>", {value: ''}).text('---'))
			.append($("<option>", {value: 'text/turtle'}).text('Turtle'))
			.append($("<option>", {value: 'application/rdf+xml'}).text('RDF-XML'))
			.append($("<option>", {value: 'text/csv'}).text('CSV'))
			.append($("<option>", {value: 'text/tab-separated-values'}).text('TSV'));
		$('<div>', {class:'btn-group col-md-4', role: 'group'}).append($('<label>').text('SELECT').append($acceptSelect)).appendTo($acceptRow);
		$('<div>', {class:'btn-group col-md-4', role: 'group'}).append($('<label>').text('Graph').append($acceptGraph)).appendTo($acceptRow);
		
		
		//URL args headers
		var $urlArgsRow = $('<div>', {class: 'row'}).appendTo($reqPanel);
		$('<div>', {class:'col-md-4 rowLabel'}).appendTo($urlArgsRow).text('URL Arguments');
		$urlArgsDiv = $('<div>', {class:'btn-group col-md-8', role: 'group'}).appendTo($urlArgsRow);
		
		
		//Default graphs
		var $defaultGraphsRow = $('<div>', {class: 'row'}).appendTo($reqPanel);
		$('<div>', {class:'col-md-4 rowLabel'}).appendTo($defaultGraphsRow).text('Default graphs');
		$defaultGraphsDiv = $('<div>', {class:'btn-group col-md-8', role: 'group'}).appendTo($defaultGraphsRow);
		
		
		//Named graphs
		var $namedGraphsRow = $('<div>', {class: 'row'}).appendTo($reqPanel);
		$('<div>', {class:'col-md-4 rowLabel'}).appendTo($namedGraphsRow).text('Named graphs');
		$namedGraphsDiv = $('<div>', {class:'btn-group col-md-8', role: 'group'}).appendTo($namedGraphsRow);

		
		
		return $menu;
	};
	
	var addTextInputsTo = function($el, num, animate, vals) {
		var $inputsContainer = $('<div>').appendTo($el);
		for (var i = 0; i < num; i++) {
			
			var val = (vals && vals[i]? vals[i]: "");
			var $input = $('<input>', {type: 'text'}).val(val).keyup(function() {
				var lastHasContent = false;
				$el.find('div:last input').each(function(i, input) {
					if ($(input).val().trim().length > 0) lastHasContent = true;
				});
				if (lastHasContent) addTextInputsTo($el, num, true);
			});
			if (animate) {
				$input.hide().appendTo($inputsContainer).show('fast');
			} else {
				$input.appendTo($inputsContainer);
			}
		}
	};

	
	var updateWrapper = function() {
		//we got most of the html. Now set the values in the html
		var options = tab.yasqe.options.sparql;
		
		
		//Request method
		if (options.requestMethod.toUpperCase() == "POST") {
			$btnPost.addClass('active');
		} else {
			$btnGet.addClass('active');
		}
		//Request method
		$acceptGraph.val(options.acceptHeaderGraph);
		$acceptSelect.val(options.acceptHeaderSelect);
		
		//url args
		$urlArgsDiv.empty();
		if (options.args && options.args.length > 0) {
			options.args.forEach(function(el) {
				var vals = [el.name, el.value];
				addTextInputsTo($urlArgsDiv, 2, false, vals)
			});
		}
		addTextInputsTo($urlArgsDiv, 2, false);//and, always add one item
		
		
		//default graphs
		$defaultGraphsDiv.empty();
		if (options.defaultGraphs && options.defaultGraphs.length > 0) {
			addTextInputsTo($defaultGraphsDiv, 1, false, options.defaultGraphs)
		}
		addTextInputsTo($defaultGraphsDiv, 1, false);//and, always add one item
		
		//default graphs
		$namedGraphsDiv.empty();
		if (options.namedGraphs && options.namedGraphs.length > 0) {
			addTextInputsTo($namedGraphsDiv, 1, false, options.namedGraphs)
		}
		addTextInputsTo($namedGraphsDiv, 1, false);//and, always add one item
		
	};
	
	var store = function() {
		var options = tab.yasqe.options.sparql;
		if ($btnPost.hasClass('active')) {
			options.requestMethod = "POST"; 
		} else if ($btnGet.hasClass('active')) {
			options.requestMethod = "GET"; 
		}
		
		//Request method
		options.acceptHeaderGraph = $acceptGraph.val();
		options.acceptHeaderSelect = $acceptSelect.val();
		
		//url args
		var args = [];
		$urlArgsDiv.find('div').each(function(i, el) {
			var inputVals = [];
			$(el).find('input').each(function(i, input) {
				inputVals.push($(input).val());
			});
			if (inputVals[0] && inputVals[0].trim().length > 0) {
				args.push({name: inputVals[0], value: (inputVals[1]? inputVals[1]: "")});
			}
		});
		options.args = args;
		
		
		//default graphs
		var defaultGraphs = [];
		$defaultGraphsDiv.find('div').each(function(i, el) {
			var inputVals = [];
			$(el).find('input').each(function(i, input) {
				inputVals.push($(input).val());
			});
			if (inputVals[0] && inputVals[0].trim().length > 0) defaultGraphs.push(inputVals[0]);
		});
		options.defaultGraphs = defaultGraphs;
		
		//named graphs
		var namedGraphs = [];
		$namedGraphsDiv.find('div').each(function(i, el) {
			var inputVals = [];
			$(el).find('input').each(function(i, input) {
				inputVals.push($(input).val());
			});
			if (inputVals[0] && inputVals[0].trim().length > 0) namedGraphs.push(inputVals[0]);
		});
		options.namedGraphs = namedGraphs;
	};
	
	
	
	return {
		initWrapper: initWrapper,
		updateWrapper: updateWrapper,
		store: store
	};
};