'use strict';
//adding tabs: http://jsfiddle.net/dogoku/KdPdZ/2/
var $ = require('jquery');
module.exports = function(yasgui) {
	var manager = {};
	manager.tabs = {};
	var $tabsParent;
	
	var $tabPanel = null;
	
	var panes = {};
	manager.init = function() {
		//tab panel contains tabs and panes
		$tabPanel = $('<div>', {role: 'tabpanel'}).appendTo(yasgui.wrapperElement);
		
		//init tabs
		$tabsParent = $('<ul>', {class:'nav nav-tabs mainTabs', role: 'tablist'}).appendTo($tabPanel);
		
		//init panes
		manager.$tabPanesParent = $('<div>', {class: 'tab-content'}).appendTo($tabPanel);
		
		addTab('test', 'blaat', true);
	};
	

	var addTab = function(id, name, active) {
		//first add tab
		var li = $("<li>", {role: "presentation", class: (active?"active": "")}).appendTo($tabsParent);
		li.append($('<a>', {href: '#' + id, 'aria-controls': id,  role: 'tab', 'data-toggle': 'tab'}).text(name));
		
		manager.tabs[id] = require('./tab.js')(yasgui, id);
	};
	
	manager.current = function() {
		
	};
	
	
//	addTab('test', 'blaat', true);
//	addPane('test');
	
	return manager;
};


//<form class="form-inline" role="form">
//<div class="form-group">
//  <div class="input-group">
//    <label class="sr-only" for="exampleInputEmail2">Email address</label>
//    <div class="input-group-addon">@</div>
//    <input type="email" class="form-control" id="exampleInputEmail2" placeholder="Enter email">
//  </div>
//</div>
//<div class="form-group">
//  <label class="sr-only" for="exampleInputPassword2">Password</label>
//  <input type="password" class="form-control" id="exampleInputPassword2" placeholder="Password">
//</div>
//<div class="checkbox">
//  <label>
//    <input type="checkbox"> Remember me
//  </label>
//</div>
//<button type="submit" class="btn btn-default">Sign in</button>
//</form>