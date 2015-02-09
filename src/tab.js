'use strict';
var $ = require('jquery'),
	utils = require('./utils.js'),
	yUtils = require('yasgui-utils'),
	YASGUI = require('./main.js');
//we only generate the settings for YASQE, as we modify lots of YASQE settings via the YASGUI interface
//We leave YASR to store its settings separately, as this is all handled directly from the YASR controls
var defaultPersistent = {
	yasqe: {
		sparql: {
			endpoint: YASGUI.YASQE.defaults.sparql.endpoint,
			acceptHeaderGraph: YASGUI.YASQE.defaults.sparql.acceptHeaderGraph,
			acceptHeaderSelect: YASGUI.YASQE.defaults.sparql.acceptHeaderSelect,
			args: YASGUI.YASQE.defaults.sparql.args,
			defaultGraphs: YASGUI.YASQE.defaults.sparql.defaultGraphs,
			namedGraphs: YASGUI.YASQE.defaults.sparql.namedGraphs,
			requestMethod: YASGUI.YASQE.defaults.sparql.requestMethod
		}
	}
};



module.exports = function(yasgui, id, name, endpoint) {
	if (!yasgui.persistentOptions.tabManager.tabs[id]) {
		yasgui.persistentOptions.tabManager.tabs[id] = $.extend(true, {
			id: id,
			name: name
		}, defaultPersistent);
	} else {
		yasgui.persistentOptions.tabManager.tabs[id] = $.extend(true, {}, defaultPersistent, yasgui.persistentOptions.tabManager.tabs[id]);
	}
	var persistentOptions = yasgui.persistentOptions.tabManager.tabs[id];
	if (endpoint) persistentOptions.yasqe.sparql.endpoint = endpoint;
	var tab = {
		persistentOptions: persistentOptions
	};
	
	var menu = require('./tabPaneMenu.js')(yasgui, tab);
	var $pane = $('<div>', {id:persistentOptions.id, style: 'position:relative', class: 'tab-pane', role: 'tabpanel'}).appendTo(yasgui.tabManager.$tabPanesParent);
	
	var $paneContent = $('<div>', {class:'wrapper'}).appendTo($pane);
	var $controlBar = $('<div>', {class: 'controlbar'}).appendTo($paneContent);
	var $paneMenu = menu.initWrapper().appendTo($pane);
	var $endpointInput;
	var addControlBar = function() {
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
					tab.refreshYasqe();
					yasgui.store();
					
				}
			});
		
	};
	
	
	var yasqeContainer = $('<div>', {id: 'yasqe_' + persistentOptions.id}).appendTo($paneContent);
	var yasrContainer = $('<div>', {id: 'yasq_' + persistentOptions.id}).appendTo($paneContent);
	
	
	
	var yasqeOptions = {
		createShareLink: require('./shareLink').getCreateLinkHandler(tab)
	};
	
	var storeInHist = function() {
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
		
		var maxHistSize = 50;
		if (yasgui.history.length > maxHistSize) {
			yasgui.history = yasgui.history.slice(0, maxHistSize);
		}
		
		
		//store in localstorage as well
		if (yasgui.persistencyPrefix) {
			yUtils.storage.set(yasgui.persistencyPrefix + 'history', yasgui.history);
		}
		
		
	};
	
	tab.setPersistentInYasqe = function() {
		if (tab.yasqe) {
			$.extend(tab.yasqe.options.sparql, persistentOptions.yasqe.sparql);
			//set value manualy, as this triggers a refresh
			if (persistentOptions.yasqe.value) tab.yasqe.setValue(persistentOptions.yasqe.value);
		}
	}
	$.extend(yasqeOptions, persistentOptions.yasqe);
	
	tab.onShow = function() {
		if (!tab.yasqe || !tab.yasr) {
			var getQueryString = function() {
				return persistentOptions.yasqe.sparql.endpoint + "?" +
					$.param(tab.yasqe.getUrlArguments(persistentOptions.yasqe.sparql));
			};
			YASGUI.YASR.plugins.error.defaults.tryQueryLink = getQueryString;
			tab.yasqe = YASGUI.YASQE(yasqeContainer[0], yasqeOptions);
			tab.yasqe.on('blur', function(yasqe) {
				persistentOptions.yasqe.value = yasqe.getValue();
				yasgui.store();
			});
			tab.yasr = YASGUI.YASR(yasrContainer[0], $.extend({
				//this way, the URLs in the results are prettified using the defined prefixes in the query
				getUsedPrefixes: tab.yasqe.getPrefixesFromQuery
			}, persistentOptions.yasr));
			var beforeSend = null;
			tab.yasqe.options.sparql.callbacks.beforeSend = function() {
				beforeSend = +new Date();
			}
			tab.yasqe.options.sparql.callbacks.complete = function() {
				var end = +new Date();
				yasgui.tracker.track(persistentOptions.yasqe.sparql.endpoint, tab.yasqe.getValueWithoutComments(), end - beforeSend);
				tab.yasr.setResponse.apply(this, arguments);
				storeInHist();
			}
			
			tab.yasqe.query = function() {
				if (yasgui.options.api.corsProxy && yasgui.corsEnabled) {
					if (!yasgui.corsEnabled[persistentOptions.yasqe.sparql.endpoint]) {
						//use the proxy //name value
						var options = $.extend(true, {}, tab.yasqe.options.sparql);
						options.args.push({name: 'endpoint', value: options.endpoint});
						options.args.push({name: 'requestMethod', value: options.requestMethod});
						options.requestMethod = "POST";
						options.endpoint = yasgui.options.api.corsProxy;
						YASGUI.YASQE.executeQuery(tab.yasqe, options);
					} else {
						YASGUI.YASQE.executeQuery(tab.yasqe);
					}
				} else {
					YASGUI.YASQE.executeQuery(tab.yasqe);
				}
			};
			addControlBar();
		}
	};
	tab.refreshYasqe = function() {
		$.extend(true, tab.yasqe.options, tab.persistentOptions.yasqe);
		if (tab.persistentOptions.yasqe.value) tab.yasqe.setValue(tab.persistentOptions.yasqe.value);
	};
	tab.destroy = function() {
		if (!tab.yasr) {
			//instantiate yasr (without rendering results, to avoid load)
			//this way, we can clear the yasr persistent results
			tab.yasr = YASGUI.YASR(yasrContainer[0], {}, '');
		}
		yUtils.storage.remove(tab.yasr.getPersistencyId(tab.yasr.options.persistency.results.key));
		
		
	}
	tab.getEndpoint = function() {
		var endpoint = null;
		if (yUtils.nestedExists(tab.persistentOptions, 'yasqe', 'sparql', 'endpoint')) {
			endpoint = tab.persistentOptions.yasqe.sparql.endpoint;
		}
		return endpoint;
	}
	
	return tab;
}



