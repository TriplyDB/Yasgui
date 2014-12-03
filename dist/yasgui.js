!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.YASGUI=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
require('./bsTab.js');



var root = module.exports = function(parent, options) {
	var yasgui = {};
	yasgui.wrapperElement = $('<div class="yasgui"></div>').appendTo($(parent));
	yasgui.tabManager = require('./tabManager.js')(yasgui);
	
	yasgui.tabManager.init();
	return yasgui;
};




root.YASQE = require('yasgui-yasqe');
root.YASQE.defaults = $.extend(true, root.YASQE.defaults, require('./defaultsYasqe.js'));
root.YASR = require('yasgui-yasr');
root.defaults = require('./defaults.js');
},{"./bsTab.js":67,"./defaults.js":68,"./defaultsYasqe.js":69,"./tabManager.js":72,"jquery":undefined,"yasgui-yasqe":33,"yasgui-yasr":58}],2:[function(require,module,exports){
;(function(win){
	var store = {},
		doc = win.document,
		localStorageName = 'localStorage',
		scriptTag = 'script',
		storage

	store.disabled = false
	store.version = '1.3.17'
	store.set = function(key, value) {}
	store.get = function(key, defaultVal) {}
	store.has = function(key) { return store.get(key) !== undefined }
	store.remove = function(key) {}
	store.clear = function() {}
	store.transact = function(key, defaultVal, transactionFn) {
		if (transactionFn == null) {
			transactionFn = defaultVal
			defaultVal = null
		}
		if (defaultVal == null) {
			defaultVal = {}
		}
		var val = store.get(key, defaultVal)
		transactionFn(val)
		store.set(key, val)
	}
	store.getAll = function() {}
	store.forEach = function() {}

	store.serialize = function(value) {
		return JSON.stringify(value)
	}
	store.deserialize = function(value) {
		if (typeof value != 'string') { return undefined }
		try { return JSON.parse(value) }
		catch(e) { return value || undefined }
	}

	// Functions to encapsulate questionable FireFox 3.6.13 behavior
	// when about.config::dom.storage.enabled === false
	// See https://github.com/marcuswestin/store.js/issues#issue/13
	function isLocalStorageNameSupported() {
		try { return (localStorageName in win && win[localStorageName]) }
		catch(err) { return false }
	}

	if (isLocalStorageNameSupported()) {
		storage = win[localStorageName]
		store.set = function(key, val) {
			if (val === undefined) { return store.remove(key) }
			storage.setItem(key, store.serialize(val))
			return val
		}
		store.get = function(key, defaultVal) {
			var val = store.deserialize(storage.getItem(key))
			return (val === undefined ? defaultVal : val)
		}
		store.remove = function(key) { storage.removeItem(key) }
		store.clear = function() { storage.clear() }
		store.getAll = function() {
			var ret = {}
			store.forEach(function(key, val) {
				ret[key] = val
			})
			return ret
		}
		store.forEach = function(callback) {
			for (var i=0; i<storage.length; i++) {
				var key = storage.key(i)
				callback(key, store.get(key))
			}
		}
	} else if (doc.documentElement.addBehavior) {
		var storageOwner,
			storageContainer
		// Since #userData storage applies only to specific paths, we need to
		// somehow link our data to a specific path.  We choose /favicon.ico
		// as a pretty safe option, since all browsers already make a request to
		// this URL anyway and being a 404 will not hurt us here.  We wrap an
		// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
		// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
		// since the iframe access rules appear to allow direct access and
		// manipulation of the document element, even for a 404 page.  This
		// document can be used instead of the current document (which would
		// have been limited to the current path) to perform #userData storage.
		try {
			storageContainer = new ActiveXObject('htmlfile')
			storageContainer.open()
			storageContainer.write('<'+scriptTag+'>document.w=window</'+scriptTag+'><iframe src="/favicon.ico"></iframe>')
			storageContainer.close()
			storageOwner = storageContainer.w.frames[0].document
			storage = storageOwner.createElement('div')
		} catch(e) {
			// somehow ActiveXObject instantiation failed (perhaps some special
			// security settings or otherwse), fall back to per-path storage
			storage = doc.createElement('div')
			storageOwner = doc.body
		}
		var withIEStorage = function(storeFunction) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0)
				args.unshift(storage)
				// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
				// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
				storageOwner.appendChild(storage)
				storage.addBehavior('#default#userData')
				storage.load(localStorageName)
				var result = storeFunction.apply(store, args)
				storageOwner.removeChild(storage)
				return result
			}
		}

		// In IE7, keys cannot start with a digit or contain certain chars.
		// See https://github.com/marcuswestin/store.js/issues/40
		// See https://github.com/marcuswestin/store.js/issues/83
		var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
		function ieKeyFix(key) {
			return key.replace(/^d/, '___$&').replace(forbiddenCharsRegex, '___')
		}
		store.set = withIEStorage(function(storage, key, val) {
			key = ieKeyFix(key)
			if (val === undefined) { return store.remove(key) }
			storage.setAttribute(key, store.serialize(val))
			storage.save(localStorageName)
			return val
		})
		store.get = withIEStorage(function(storage, key, defaultVal) {
			key = ieKeyFix(key)
			var val = store.deserialize(storage.getAttribute(key))
			return (val === undefined ? defaultVal : val)
		})
		store.remove = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			storage.removeAttribute(key)
			storage.save(localStorageName)
		})
		store.clear = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			for (var i=0, attr; attr=attributes[i]; i++) {
				storage.removeAttribute(attr.name)
			}
			storage.save(localStorageName)
		})
		store.getAll = function(storage) {
			var ret = {}
			store.forEach(function(key, val) {
				ret[key] = val
			})
			return ret
		}
		store.forEach = withIEStorage(function(storage, callback) {
			var attributes = storage.XMLDocument.documentElement.attributes
			for (var i=0, attr; attr=attributes[i]; ++i) {
				callback(attr.name, store.deserialize(storage.getAttribute(attr.name)))
			}
		})
	}

	try {
		var testKey = '__storejs__'
		store.set(testKey, testKey)
		if (store.get(testKey) != testKey) { store.disabled = true }
		store.remove(testKey)
	} catch(e) {
		store.disabled = true
	}
	store.enabled = !store.disabled

	if (typeof module != 'undefined' && module.exports && this.module !== module) { module.exports = store }
	else if (typeof define === 'function' && define.amd) { define(store) }
	else { win.store = store }

})(Function('return this')());

},{}],3:[function(require,module,exports){
module.exports={
  "name": "yasgui-utils",
  "version": "1.4.1",
  "description": "Utils for YASGUI libs",
  "main": "src/main.js",
  "repository": {
    "type": "git",
    "url": "git://github.com/YASGUI/Utils.git"
  },
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasgui.github.io/license.txt"
    }
  ],
  "author": {
    "name": "Laurens Rietveld"
  },
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "url": "http://laurensrietveld.nl"
    }
  ],
  "bugs": {
    "url": "https://github.com/YASGUI/Utils/issues"
  },
  "homepage": "https://github.com/YASGUI/Utils",
  "dependencies": {
    "store": "^1.3.14"
  },
  "readme": "A simple utils repo for the YASGUI tools\n",
  "readmeFilename": "README.md",
  "_id": "yasgui-utils@1.4.1",
  "_from": "yasgui-utils@1.4.1"
}

},{}],4:[function(require,module,exports){
window.console = window.console || {"log":function(){}};//make sure any console statements don't break IE
module.exports = {
	storage: require("./storage.js"),
	svg: require("./svg.js"),
	version: {
		"yasgui-utils" : require("../package.json").version,
	}
};

},{"../package.json":3,"./storage.js":5,"./svg.js":6}],5:[function(require,module,exports){
var store = require("store");
var times = {
	day: function() {
		return 1000 * 3600 * 24;//millis to day
	},
	month: function() {
		times.day() * 30;
	},
	year: function() {
		times.month() * 12;
	}
};

var root = module.exports = {
	set : function(key, val, exp) {
		if (typeof exp == "string") {
			exp = times[exp]();
		}
		//try to store string for dom objects (e.g. XML result). Otherwise, we might get a circular reference error when stringifying this
		if (val.documentElement) val = new XMLSerializer().serializeToString(val.documentElement);
		store.set(key, {
			val : val,
			exp : exp,
			time : new Date().getTime()
		});
	},
	get : function(key) {
		var info = store.get(key);
		if (!info) {
			return null;
		}
		if (info.exp && new Date().getTime() - info.time > info.exp) {
			return null;
		}
		return info.val;
	}

};

},{"store":2}],6:[function(require,module,exports){
module.exports = {
	draw: function(parent, svgString, config) {
		if (!parent) return;
		var el = module.exports.getElement(svgString, config);
		if (el) {
			if (parent.append) {
				parent.append(el);
			} else {
				//regular dom doc
				parent.appendChild(el);
			}
		}
	},
	getElement: function(svgString, config) {
		if (svgString && svgString.indexOf("<svg") == 0) {
			if (!config.width) config.width = "100%";
			if (!config.height) config.height = "100%";
			
			var parser = new DOMParser();
			var dom = parser.parseFromString(svgString, "text/xml");
			var svg = dom.documentElement;
			
			var svgContainer = document.createElement("div");
			svgContainer.style.display = "inline-block";
			svgContainer.style.width = config.width;
			svgContainer.style.height = config.height;
			svgContainer.appendChild(svg);
			return svgContainer;
		}
		return false;
	}
};
},{}],7:[function(require,module,exports){
'use strict';
/*
  jQuery deparam is an extraction of the deparam method from Ben Alman's jQuery BBQ
  http://benalman.com/projects/jquery-bbq-plugin/
*/
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
$.deparam = function (params, coerce) {
var obj = {},
	coerce_types = { 'true': !0, 'false': !1, 'null': null };
  
// Iterate over all name=value pairs.
$.each(params.replace(/\+/g, ' ').split('&'), function (j,v) {
  var param = v.split('='),
	  key = decodeURIComponent(param[0]),
	  val,
	  cur = obj,
	  i = 0,
		
	  // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
	  // into its component parts.
	  keys = key.split(']['),
	  keys_last = keys.length - 1;
	
  // If the first keys part contains [ and the last ends with ], then []
  // are correctly balanced.
  if (/\[/.test(keys[0]) && /\]$/.test(keys[keys_last])) {
	// Remove the trailing ] from the last keys part.
	keys[keys_last] = keys[keys_last].replace(/\]$/, '');
	  
	// Split first keys part into two parts on the [ and add them back onto
	// the beginning of the keys array.
	keys = keys.shift().split('[').concat(keys);
	  
	keys_last = keys.length - 1;
  } else {
	// Basic 'foo' style key.
	keys_last = 0;
  }
	
  // Are we dealing with a name=value pair, or just a name?
  if (param.length === 2) {
	val = decodeURIComponent(param[1]);
	  
	// Coerce values.
	if (coerce) {
	  val = val && !isNaN(val)              ? +val              // number
		  : val === 'undefined'             ? undefined         // undefined
		  : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
		  : val;                                                // string
	}
	  
	if ( keys_last ) {
	  // Complex key, build deep object structure based on a few rules:
	  // * The 'cur' pointer starts at the object top-level.
	  // * [] = array push (n is set to array length), [n] = array if n is 
	  //   numeric, otherwise object.
	  // * If at the last keys part, set the value.
	  // * For each keys part, if the current level is undefined create an
	  //   object or array based on the type of the next keys part.
	  // * Move the 'cur' pointer to the next level.
	  // * Rinse & repeat.
	  for (; i <= keys_last; i++) {
		key = keys[i] === '' ? cur.length : keys[i];
		cur = cur[key] = i < keys_last
		  ? cur[key] || (keys[i+1] && isNaN(keys[i+1]) ? {} : [])
		  : val;
	  }
		
	} else {
	  // Simple key, even simpler rules, since only scalars and shallow
	  // arrays are allowed.
		
	  if ($.isArray(obj[key])) {
		// val is already an array, so push on the next value.
		obj[key].push( val );
		  
	  } else if (obj[key] !== undefined) {
		// val isn't an array, but since a second value has been specified,
		// convert val into an array.
		obj[key] = [obj[key], val];
		  
	  } else {
		// val is a scalar.
		obj[key] = val;
	  }
	}
	  
  } else if (key) {
	// No value was defined, so set something meaningful.
	obj[key] = coerce
	  ? undefined
	  : '';
  }
});
  
return obj;
};

},{"jquery":undefined}],8:[function(require,module,exports){
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  
	CodeMirror.defineMode("sparql11", function(config, parserConfig) {
	
		var indentUnit = config.indentUnit;
	
		// ll1_table is auto-generated from grammar
		// - do not edit manually
		// %%%table%%%
	var ll1_table=
	{
	  "*[&&,valueLogical]" : {
	     "&&": ["[&&,valueLogical]","*[&&,valueLogical]"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     ";": []}, 
	  "*[,,expression]" : {
	     ",": ["[,,expression]","*[,,expression]"], 
	     ")": []}, 
	  "*[,,objectPath]" : {
	     ",": ["[,,objectPath]","*[,,objectPath]"], 
	     ".": [], 
	     ";": [], 
	     "]": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "*[,,object]" : {
	     ",": ["[,,object]","*[,,object]"], 
	     ".": [], 
	     ";": [], 
	     "]": [], 
	     "}": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": []}, 
	  "*[/,pathEltOrInverse]" : {
	     "/": ["[/,pathEltOrInverse]","*[/,pathEltOrInverse]"], 
	     "|": [], 
	     ")": [], 
	     "(": [], 
	     "[": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "*[;,?[or([verbPath,verbSimple]),objectList]]" : {
	     ";": ["[;,?[or([verbPath,verbSimple]),objectList]]","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     ".": [], 
	     "]": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "*[;,?[verb,objectList]]" : {
	     ";": ["[;,?[verb,objectList]]","*[;,?[verb,objectList]]"], 
	     ".": [], 
	     "]": [], 
	     "}": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": []}, 
	  "*[UNION,groupGraphPattern]" : {
	     "UNION": ["[UNION,groupGraphPattern]","*[UNION,groupGraphPattern]"], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "(": [], 
	     "[": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     ".": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "*[graphPatternNotTriples,?.,?triplesBlock]" : {
	     "{": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "OPTIONAL": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "MINUS": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "GRAPH": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "SERVICE": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "FILTER": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "BIND": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "VALUES": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "}": []}, 
	  "*[quadsNotTriples,?.,?triplesTemplate]" : {
	     "GRAPH": ["[quadsNotTriples,?.,?triplesTemplate]","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "}": []}, 
	  "*[|,pathOneInPropertySet]" : {
	     "|": ["[|,pathOneInPropertySet]","*[|,pathOneInPropertySet]"], 
	     ")": []}, 
	  "*[|,pathSequence]" : {
	     "|": ["[|,pathSequence]","*[|,pathSequence]"], 
	     ")": [], 
	     "(": [], 
	     "[": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "*[||,conditionalAndExpression]" : {
	     "||": ["[||,conditionalAndExpression]","*[||,conditionalAndExpression]"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     ";": []}, 
	  "*dataBlockValue" : {
	     "UNDEF": ["dataBlockValue","*dataBlockValue"], 
	     "IRI_REF": ["dataBlockValue","*dataBlockValue"], 
	     "TRUE": ["dataBlockValue","*dataBlockValue"], 
	     "FALSE": ["dataBlockValue","*dataBlockValue"], 
	     "PNAME_LN": ["dataBlockValue","*dataBlockValue"], 
	     "PNAME_NS": ["dataBlockValue","*dataBlockValue"], 
	     "STRING_LITERAL1": ["dataBlockValue","*dataBlockValue"], 
	     "STRING_LITERAL2": ["dataBlockValue","*dataBlockValue"], 
	     "STRING_LITERAL_LONG1": ["dataBlockValue","*dataBlockValue"], 
	     "STRING_LITERAL_LONG2": ["dataBlockValue","*dataBlockValue"], 
	     "INTEGER": ["dataBlockValue","*dataBlockValue"], 
	     "DECIMAL": ["dataBlockValue","*dataBlockValue"], 
	     "DOUBLE": ["dataBlockValue","*dataBlockValue"], 
	     "INTEGER_POSITIVE": ["dataBlockValue","*dataBlockValue"], 
	     "DECIMAL_POSITIVE": ["dataBlockValue","*dataBlockValue"], 
	     "DOUBLE_POSITIVE": ["dataBlockValue","*dataBlockValue"], 
	     "INTEGER_NEGATIVE": ["dataBlockValue","*dataBlockValue"], 
	     "DECIMAL_NEGATIVE": ["dataBlockValue","*dataBlockValue"], 
	     "DOUBLE_NEGATIVE": ["dataBlockValue","*dataBlockValue"], 
	     "}": [], 
	     ")": []}, 
	  "*datasetClause" : {
	     "FROM": ["datasetClause","*datasetClause"], 
	     "WHERE": [], 
	     "{": []}, 
	  "*describeDatasetClause" : {
	     "FROM": ["describeDatasetClause","*describeDatasetClause"], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "GROUP": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "WHERE": [], 
	     "{": [], 
	     "VALUES": [], 
	     "$": []}, 
	  "*graphNode" : {
	     "(": ["graphNode","*graphNode"], 
	     "[": ["graphNode","*graphNode"], 
	     "VAR1": ["graphNode","*graphNode"], 
	     "VAR2": ["graphNode","*graphNode"], 
	     "NIL": ["graphNode","*graphNode"], 
	     "IRI_REF": ["graphNode","*graphNode"], 
	     "TRUE": ["graphNode","*graphNode"], 
	     "FALSE": ["graphNode","*graphNode"], 
	     "BLANK_NODE_LABEL": ["graphNode","*graphNode"], 
	     "ANON": ["graphNode","*graphNode"], 
	     "PNAME_LN": ["graphNode","*graphNode"], 
	     "PNAME_NS": ["graphNode","*graphNode"], 
	     "STRING_LITERAL1": ["graphNode","*graphNode"], 
	     "STRING_LITERAL2": ["graphNode","*graphNode"], 
	     "STRING_LITERAL_LONG1": ["graphNode","*graphNode"], 
	     "STRING_LITERAL_LONG2": ["graphNode","*graphNode"], 
	     "INTEGER": ["graphNode","*graphNode"], 
	     "DECIMAL": ["graphNode","*graphNode"], 
	     "DOUBLE": ["graphNode","*graphNode"], 
	     "INTEGER_POSITIVE": ["graphNode","*graphNode"], 
	     "DECIMAL_POSITIVE": ["graphNode","*graphNode"], 
	     "DOUBLE_POSITIVE": ["graphNode","*graphNode"], 
	     "INTEGER_NEGATIVE": ["graphNode","*graphNode"], 
	     "DECIMAL_NEGATIVE": ["graphNode","*graphNode"], 
	     "DOUBLE_NEGATIVE": ["graphNode","*graphNode"], 
	     ")": []}, 
	  "*graphNodePath" : {
	     "(": ["graphNodePath","*graphNodePath"], 
	     "[": ["graphNodePath","*graphNodePath"], 
	     "VAR1": ["graphNodePath","*graphNodePath"], 
	     "VAR2": ["graphNodePath","*graphNodePath"], 
	     "NIL": ["graphNodePath","*graphNodePath"], 
	     "IRI_REF": ["graphNodePath","*graphNodePath"], 
	     "TRUE": ["graphNodePath","*graphNodePath"], 
	     "FALSE": ["graphNodePath","*graphNodePath"], 
	     "BLANK_NODE_LABEL": ["graphNodePath","*graphNodePath"], 
	     "ANON": ["graphNodePath","*graphNodePath"], 
	     "PNAME_LN": ["graphNodePath","*graphNodePath"], 
	     "PNAME_NS": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL1": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL2": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL_LONG1": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL_LONG2": ["graphNodePath","*graphNodePath"], 
	     "INTEGER": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE": ["graphNodePath","*graphNodePath"], 
	     "INTEGER_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "INTEGER_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     ")": []}, 
	  "*groupCondition" : {
	     "(": ["groupCondition","*groupCondition"], 
	     "STR": ["groupCondition","*groupCondition"], 
	     "LANG": ["groupCondition","*groupCondition"], 
	     "LANGMATCHES": ["groupCondition","*groupCondition"], 
	     "DATATYPE": ["groupCondition","*groupCondition"], 
	     "BOUND": ["groupCondition","*groupCondition"], 
	     "IRI": ["groupCondition","*groupCondition"], 
	     "URI": ["groupCondition","*groupCondition"], 
	     "BNODE": ["groupCondition","*groupCondition"], 
	     "RAND": ["groupCondition","*groupCondition"], 
	     "ABS": ["groupCondition","*groupCondition"], 
	     "CEIL": ["groupCondition","*groupCondition"], 
	     "FLOOR": ["groupCondition","*groupCondition"], 
	     "ROUND": ["groupCondition","*groupCondition"], 
	     "CONCAT": ["groupCondition","*groupCondition"], 
	     "STRLEN": ["groupCondition","*groupCondition"], 
	     "UCASE": ["groupCondition","*groupCondition"], 
	     "LCASE": ["groupCondition","*groupCondition"], 
	     "ENCODE_FOR_URI": ["groupCondition","*groupCondition"], 
	     "CONTAINS": ["groupCondition","*groupCondition"], 
	     "STRSTARTS": ["groupCondition","*groupCondition"], 
	     "STRENDS": ["groupCondition","*groupCondition"], 
	     "STRBEFORE": ["groupCondition","*groupCondition"], 
	     "STRAFTER": ["groupCondition","*groupCondition"], 
	     "YEAR": ["groupCondition","*groupCondition"], 
	     "MONTH": ["groupCondition","*groupCondition"], 
	     "DAY": ["groupCondition","*groupCondition"], 
	     "HOURS": ["groupCondition","*groupCondition"], 
	     "MINUTES": ["groupCondition","*groupCondition"], 
	     "SECONDS": ["groupCondition","*groupCondition"], 
	     "TIMEZONE": ["groupCondition","*groupCondition"], 
	     "TZ": ["groupCondition","*groupCondition"], 
	     "NOW": ["groupCondition","*groupCondition"], 
	     "UUID": ["groupCondition","*groupCondition"], 
	     "STRUUID": ["groupCondition","*groupCondition"], 
	     "MD5": ["groupCondition","*groupCondition"], 
	     "SHA1": ["groupCondition","*groupCondition"], 
	     "SHA256": ["groupCondition","*groupCondition"], 
	     "SHA384": ["groupCondition","*groupCondition"], 
	     "SHA512": ["groupCondition","*groupCondition"], 
	     "COALESCE": ["groupCondition","*groupCondition"], 
	     "IF": ["groupCondition","*groupCondition"], 
	     "STRLANG": ["groupCondition","*groupCondition"], 
	     "STRDT": ["groupCondition","*groupCondition"], 
	     "SAMETERM": ["groupCondition","*groupCondition"], 
	     "ISIRI": ["groupCondition","*groupCondition"], 
	     "ISURI": ["groupCondition","*groupCondition"], 
	     "ISBLANK": ["groupCondition","*groupCondition"], 
	     "ISLITERAL": ["groupCondition","*groupCondition"], 
	     "ISNUMERIC": ["groupCondition","*groupCondition"], 
	     "VAR1": ["groupCondition","*groupCondition"], 
	     "VAR2": ["groupCondition","*groupCondition"], 
	     "SUBSTR": ["groupCondition","*groupCondition"], 
	     "REPLACE": ["groupCondition","*groupCondition"], 
	     "REGEX": ["groupCondition","*groupCondition"], 
	     "EXISTS": ["groupCondition","*groupCondition"], 
	     "NOT": ["groupCondition","*groupCondition"], 
	     "IRI_REF": ["groupCondition","*groupCondition"], 
	     "PNAME_LN": ["groupCondition","*groupCondition"], 
	     "PNAME_NS": ["groupCondition","*groupCondition"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "$": [], 
	     "}": []}, 
	  "*havingCondition" : {
	     "(": ["havingCondition","*havingCondition"], 
	     "STR": ["havingCondition","*havingCondition"], 
	     "LANG": ["havingCondition","*havingCondition"], 
	     "LANGMATCHES": ["havingCondition","*havingCondition"], 
	     "DATATYPE": ["havingCondition","*havingCondition"], 
	     "BOUND": ["havingCondition","*havingCondition"], 
	     "IRI": ["havingCondition","*havingCondition"], 
	     "URI": ["havingCondition","*havingCondition"], 
	     "BNODE": ["havingCondition","*havingCondition"], 
	     "RAND": ["havingCondition","*havingCondition"], 
	     "ABS": ["havingCondition","*havingCondition"], 
	     "CEIL": ["havingCondition","*havingCondition"], 
	     "FLOOR": ["havingCondition","*havingCondition"], 
	     "ROUND": ["havingCondition","*havingCondition"], 
	     "CONCAT": ["havingCondition","*havingCondition"], 
	     "STRLEN": ["havingCondition","*havingCondition"], 
	     "UCASE": ["havingCondition","*havingCondition"], 
	     "LCASE": ["havingCondition","*havingCondition"], 
	     "ENCODE_FOR_URI": ["havingCondition","*havingCondition"], 
	     "CONTAINS": ["havingCondition","*havingCondition"], 
	     "STRSTARTS": ["havingCondition","*havingCondition"], 
	     "STRENDS": ["havingCondition","*havingCondition"], 
	     "STRBEFORE": ["havingCondition","*havingCondition"], 
	     "STRAFTER": ["havingCondition","*havingCondition"], 
	     "YEAR": ["havingCondition","*havingCondition"], 
	     "MONTH": ["havingCondition","*havingCondition"], 
	     "DAY": ["havingCondition","*havingCondition"], 
	     "HOURS": ["havingCondition","*havingCondition"], 
	     "MINUTES": ["havingCondition","*havingCondition"], 
	     "SECONDS": ["havingCondition","*havingCondition"], 
	     "TIMEZONE": ["havingCondition","*havingCondition"], 
	     "TZ": ["havingCondition","*havingCondition"], 
	     "NOW": ["havingCondition","*havingCondition"], 
	     "UUID": ["havingCondition","*havingCondition"], 
	     "STRUUID": ["havingCondition","*havingCondition"], 
	     "MD5": ["havingCondition","*havingCondition"], 
	     "SHA1": ["havingCondition","*havingCondition"], 
	     "SHA256": ["havingCondition","*havingCondition"], 
	     "SHA384": ["havingCondition","*havingCondition"], 
	     "SHA512": ["havingCondition","*havingCondition"], 
	     "COALESCE": ["havingCondition","*havingCondition"], 
	     "IF": ["havingCondition","*havingCondition"], 
	     "STRLANG": ["havingCondition","*havingCondition"], 
	     "STRDT": ["havingCondition","*havingCondition"], 
	     "SAMETERM": ["havingCondition","*havingCondition"], 
	     "ISIRI": ["havingCondition","*havingCondition"], 
	     "ISURI": ["havingCondition","*havingCondition"], 
	     "ISBLANK": ["havingCondition","*havingCondition"], 
	     "ISLITERAL": ["havingCondition","*havingCondition"], 
	     "ISNUMERIC": ["havingCondition","*havingCondition"], 
	     "SUBSTR": ["havingCondition","*havingCondition"], 
	     "REPLACE": ["havingCondition","*havingCondition"], 
	     "REGEX": ["havingCondition","*havingCondition"], 
	     "EXISTS": ["havingCondition","*havingCondition"], 
	     "NOT": ["havingCondition","*havingCondition"], 
	     "IRI_REF": ["havingCondition","*havingCondition"], 
	     "PNAME_LN": ["havingCondition","*havingCondition"], 
	     "PNAME_NS": ["havingCondition","*havingCondition"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "ORDER": [], 
	     "$": [], 
	     "}": []}, 
	  "*or([[ (,*dataBlockValue,)],NIL])" : {
	     "(": ["or([[ (,*dataBlockValue,)],NIL])","*or([[ (,*dataBlockValue,)],NIL])"], 
	     "NIL": ["or([[ (,*dataBlockValue,)],NIL])","*or([[ (,*dataBlockValue,)],NIL])"], 
	     "}": []}, 
	  "*or([[*,unaryExpression],[/,unaryExpression]])" : {
	     "*": ["or([[*,unaryExpression],[/,unaryExpression]])","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "/": ["or([[*,unaryExpression],[/,unaryExpression]])","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     "+": [], 
	     "-": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     ";": []}, 
	  "*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])" : {
	     "+": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "-": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER_POSITIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL_POSITIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE_POSITIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER_NEGATIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL_NEGATIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE_NEGATIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     ";": []}, 
	  "*or([var,[ (,expression,AS,var,)]])" : {
	     "(": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "VAR1": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "VAR2": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "WHERE": [], 
	     "{": [], 
	     "FROM": []}, 
	  "*orderCondition" : {
	     "ASC": ["orderCondition","*orderCondition"], 
	     "DESC": ["orderCondition","*orderCondition"], 
	     "VAR1": ["orderCondition","*orderCondition"], 
	     "VAR2": ["orderCondition","*orderCondition"], 
	     "(": ["orderCondition","*orderCondition"], 
	     "STR": ["orderCondition","*orderCondition"], 
	     "LANG": ["orderCondition","*orderCondition"], 
	     "LANGMATCHES": ["orderCondition","*orderCondition"], 
	     "DATATYPE": ["orderCondition","*orderCondition"], 
	     "BOUND": ["orderCondition","*orderCondition"], 
	     "IRI": ["orderCondition","*orderCondition"], 
	     "URI": ["orderCondition","*orderCondition"], 
	     "BNODE": ["orderCondition","*orderCondition"], 
	     "RAND": ["orderCondition","*orderCondition"], 
	     "ABS": ["orderCondition","*orderCondition"], 
	     "CEIL": ["orderCondition","*orderCondition"], 
	     "FLOOR": ["orderCondition","*orderCondition"], 
	     "ROUND": ["orderCondition","*orderCondition"], 
	     "CONCAT": ["orderCondition","*orderCondition"], 
	     "STRLEN": ["orderCondition","*orderCondition"], 
	     "UCASE": ["orderCondition","*orderCondition"], 
	     "LCASE": ["orderCondition","*orderCondition"], 
	     "ENCODE_FOR_URI": ["orderCondition","*orderCondition"], 
	     "CONTAINS": ["orderCondition","*orderCondition"], 
	     "STRSTARTS": ["orderCondition","*orderCondition"], 
	     "STRENDS": ["orderCondition","*orderCondition"], 
	     "STRBEFORE": ["orderCondition","*orderCondition"], 
	     "STRAFTER": ["orderCondition","*orderCondition"], 
	     "YEAR": ["orderCondition","*orderCondition"], 
	     "MONTH": ["orderCondition","*orderCondition"], 
	     "DAY": ["orderCondition","*orderCondition"], 
	     "HOURS": ["orderCondition","*orderCondition"], 
	     "MINUTES": ["orderCondition","*orderCondition"], 
	     "SECONDS": ["orderCondition","*orderCondition"], 
	     "TIMEZONE": ["orderCondition","*orderCondition"], 
	     "TZ": ["orderCondition","*orderCondition"], 
	     "NOW": ["orderCondition","*orderCondition"], 
	     "UUID": ["orderCondition","*orderCondition"], 
	     "STRUUID": ["orderCondition","*orderCondition"], 
	     "MD5": ["orderCondition","*orderCondition"], 
	     "SHA1": ["orderCondition","*orderCondition"], 
	     "SHA256": ["orderCondition","*orderCondition"], 
	     "SHA384": ["orderCondition","*orderCondition"], 
	     "SHA512": ["orderCondition","*orderCondition"], 
	     "COALESCE": ["orderCondition","*orderCondition"], 
	     "IF": ["orderCondition","*orderCondition"], 
	     "STRLANG": ["orderCondition","*orderCondition"], 
	     "STRDT": ["orderCondition","*orderCondition"], 
	     "SAMETERM": ["orderCondition","*orderCondition"], 
	     "ISIRI": ["orderCondition","*orderCondition"], 
	     "ISURI": ["orderCondition","*orderCondition"], 
	     "ISBLANK": ["orderCondition","*orderCondition"], 
	     "ISLITERAL": ["orderCondition","*orderCondition"], 
	     "ISNUMERIC": ["orderCondition","*orderCondition"], 
	     "SUBSTR": ["orderCondition","*orderCondition"], 
	     "REPLACE": ["orderCondition","*orderCondition"], 
	     "REGEX": ["orderCondition","*orderCondition"], 
	     "EXISTS": ["orderCondition","*orderCondition"], 
	     "NOT": ["orderCondition","*orderCondition"], 
	     "IRI_REF": ["orderCondition","*orderCondition"], 
	     "PNAME_LN": ["orderCondition","*orderCondition"], 
	     "PNAME_NS": ["orderCondition","*orderCondition"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "$": [], 
	     "}": []}, 
	  "*prefixDecl" : {
	     "PREFIX": ["prefixDecl","*prefixDecl"], 
	     "$": [], 
	     "CONSTRUCT": [], 
	     "DESCRIBE": [], 
	     "ASK": [], 
	     "INSERT": [], 
	     "DELETE": [], 
	     "SELECT": [], 
	     "LOAD": [], 
	     "CLEAR": [], 
	     "DROP": [], 
	     "ADD": [], 
	     "MOVE": [], 
	     "COPY": [], 
	     "CREATE": [], 
	     "WITH": []}, 
	  "*usingClause" : {
	     "USING": ["usingClause","*usingClause"], 
	     "WHERE": []}, 
	  "*var" : {
	     "VAR1": ["var","*var"], 
	     "VAR2": ["var","*var"], 
	     ")": []}, 
	  "*varOrIRIref" : {
	     "VAR1": ["varOrIRIref","*varOrIRIref"], 
	     "VAR2": ["varOrIRIref","*varOrIRIref"], 
	     "IRI_REF": ["varOrIRIref","*varOrIRIref"], 
	     "PNAME_LN": ["varOrIRIref","*varOrIRIref"], 
	     "PNAME_NS": ["varOrIRIref","*varOrIRIref"], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "GROUP": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "WHERE": [], 
	     "{": [], 
	     "FROM": [], 
	     "VALUES": [], 
	     "$": []}, 
	  "+graphNode" : {
	     "(": ["graphNode","*graphNode"], 
	     "[": ["graphNode","*graphNode"], 
	     "VAR1": ["graphNode","*graphNode"], 
	     "VAR2": ["graphNode","*graphNode"], 
	     "NIL": ["graphNode","*graphNode"], 
	     "IRI_REF": ["graphNode","*graphNode"], 
	     "TRUE": ["graphNode","*graphNode"], 
	     "FALSE": ["graphNode","*graphNode"], 
	     "BLANK_NODE_LABEL": ["graphNode","*graphNode"], 
	     "ANON": ["graphNode","*graphNode"], 
	     "PNAME_LN": ["graphNode","*graphNode"], 
	     "PNAME_NS": ["graphNode","*graphNode"], 
	     "STRING_LITERAL1": ["graphNode","*graphNode"], 
	     "STRING_LITERAL2": ["graphNode","*graphNode"], 
	     "STRING_LITERAL_LONG1": ["graphNode","*graphNode"], 
	     "STRING_LITERAL_LONG2": ["graphNode","*graphNode"], 
	     "INTEGER": ["graphNode","*graphNode"], 
	     "DECIMAL": ["graphNode","*graphNode"], 
	     "DOUBLE": ["graphNode","*graphNode"], 
	     "INTEGER_POSITIVE": ["graphNode","*graphNode"], 
	     "DECIMAL_POSITIVE": ["graphNode","*graphNode"], 
	     "DOUBLE_POSITIVE": ["graphNode","*graphNode"], 
	     "INTEGER_NEGATIVE": ["graphNode","*graphNode"], 
	     "DECIMAL_NEGATIVE": ["graphNode","*graphNode"], 
	     "DOUBLE_NEGATIVE": ["graphNode","*graphNode"]}, 
	  "+graphNodePath" : {
	     "(": ["graphNodePath","*graphNodePath"], 
	     "[": ["graphNodePath","*graphNodePath"], 
	     "VAR1": ["graphNodePath","*graphNodePath"], 
	     "VAR2": ["graphNodePath","*graphNodePath"], 
	     "NIL": ["graphNodePath","*graphNodePath"], 
	     "IRI_REF": ["graphNodePath","*graphNodePath"], 
	     "TRUE": ["graphNodePath","*graphNodePath"], 
	     "FALSE": ["graphNodePath","*graphNodePath"], 
	     "BLANK_NODE_LABEL": ["graphNodePath","*graphNodePath"], 
	     "ANON": ["graphNodePath","*graphNodePath"], 
	     "PNAME_LN": ["graphNodePath","*graphNodePath"], 
	     "PNAME_NS": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL1": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL2": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL_LONG1": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL_LONG2": ["graphNodePath","*graphNodePath"], 
	     "INTEGER": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE": ["graphNodePath","*graphNodePath"], 
	     "INTEGER_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "INTEGER_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE_NEGATIVE": ["graphNodePath","*graphNodePath"]}, 
	  "+groupCondition" : {
	     "(": ["groupCondition","*groupCondition"], 
	     "STR": ["groupCondition","*groupCondition"], 
	     "LANG": ["groupCondition","*groupCondition"], 
	     "LANGMATCHES": ["groupCondition","*groupCondition"], 
	     "DATATYPE": ["groupCondition","*groupCondition"], 
	     "BOUND": ["groupCondition","*groupCondition"], 
	     "IRI": ["groupCondition","*groupCondition"], 
	     "URI": ["groupCondition","*groupCondition"], 
	     "BNODE": ["groupCondition","*groupCondition"], 
	     "RAND": ["groupCondition","*groupCondition"], 
	     "ABS": ["groupCondition","*groupCondition"], 
	     "CEIL": ["groupCondition","*groupCondition"], 
	     "FLOOR": ["groupCondition","*groupCondition"], 
	     "ROUND": ["groupCondition","*groupCondition"], 
	     "CONCAT": ["groupCondition","*groupCondition"], 
	     "STRLEN": ["groupCondition","*groupCondition"], 
	     "UCASE": ["groupCondition","*groupCondition"], 
	     "LCASE": ["groupCondition","*groupCondition"], 
	     "ENCODE_FOR_URI": ["groupCondition","*groupCondition"], 
	     "CONTAINS": ["groupCondition","*groupCondition"], 
	     "STRSTARTS": ["groupCondition","*groupCondition"], 
	     "STRENDS": ["groupCondition","*groupCondition"], 
	     "STRBEFORE": ["groupCondition","*groupCondition"], 
	     "STRAFTER": ["groupCondition","*groupCondition"], 
	     "YEAR": ["groupCondition","*groupCondition"], 
	     "MONTH": ["groupCondition","*groupCondition"], 
	     "DAY": ["groupCondition","*groupCondition"], 
	     "HOURS": ["groupCondition","*groupCondition"], 
	     "MINUTES": ["groupCondition","*groupCondition"], 
	     "SECONDS": ["groupCondition","*groupCondition"], 
	     "TIMEZONE": ["groupCondition","*groupCondition"], 
	     "TZ": ["groupCondition","*groupCondition"], 
	     "NOW": ["groupCondition","*groupCondition"], 
	     "UUID": ["groupCondition","*groupCondition"], 
	     "STRUUID": ["groupCondition","*groupCondition"], 
	     "MD5": ["groupCondition","*groupCondition"], 
	     "SHA1": ["groupCondition","*groupCondition"], 
	     "SHA256": ["groupCondition","*groupCondition"], 
	     "SHA384": ["groupCondition","*groupCondition"], 
	     "SHA512": ["groupCondition","*groupCondition"], 
	     "COALESCE": ["groupCondition","*groupCondition"], 
	     "IF": ["groupCondition","*groupCondition"], 
	     "STRLANG": ["groupCondition","*groupCondition"], 
	     "STRDT": ["groupCondition","*groupCondition"], 
	     "SAMETERM": ["groupCondition","*groupCondition"], 
	     "ISIRI": ["groupCondition","*groupCondition"], 
	     "ISURI": ["groupCondition","*groupCondition"], 
	     "ISBLANK": ["groupCondition","*groupCondition"], 
	     "ISLITERAL": ["groupCondition","*groupCondition"], 
	     "ISNUMERIC": ["groupCondition","*groupCondition"], 
	     "VAR1": ["groupCondition","*groupCondition"], 
	     "VAR2": ["groupCondition","*groupCondition"], 
	     "SUBSTR": ["groupCondition","*groupCondition"], 
	     "REPLACE": ["groupCondition","*groupCondition"], 
	     "REGEX": ["groupCondition","*groupCondition"], 
	     "EXISTS": ["groupCondition","*groupCondition"], 
	     "NOT": ["groupCondition","*groupCondition"], 
	     "IRI_REF": ["groupCondition","*groupCondition"], 
	     "PNAME_LN": ["groupCondition","*groupCondition"], 
	     "PNAME_NS": ["groupCondition","*groupCondition"]}, 
	  "+havingCondition" : {
	     "(": ["havingCondition","*havingCondition"], 
	     "STR": ["havingCondition","*havingCondition"], 
	     "LANG": ["havingCondition","*havingCondition"], 
	     "LANGMATCHES": ["havingCondition","*havingCondition"], 
	     "DATATYPE": ["havingCondition","*havingCondition"], 
	     "BOUND": ["havingCondition","*havingCondition"], 
	     "IRI": ["havingCondition","*havingCondition"], 
	     "URI": ["havingCondition","*havingCondition"], 
	     "BNODE": ["havingCondition","*havingCondition"], 
	     "RAND": ["havingCondition","*havingCondition"], 
	     "ABS": ["havingCondition","*havingCondition"], 
	     "CEIL": ["havingCondition","*havingCondition"], 
	     "FLOOR": ["havingCondition","*havingCondition"], 
	     "ROUND": ["havingCondition","*havingCondition"], 
	     "CONCAT": ["havingCondition","*havingCondition"], 
	     "STRLEN": ["havingCondition","*havingCondition"], 
	     "UCASE": ["havingCondition","*havingCondition"], 
	     "LCASE": ["havingCondition","*havingCondition"], 
	     "ENCODE_FOR_URI": ["havingCondition","*havingCondition"], 
	     "CONTAINS": ["havingCondition","*havingCondition"], 
	     "STRSTARTS": ["havingCondition","*havingCondition"], 
	     "STRENDS": ["havingCondition","*havingCondition"], 
	     "STRBEFORE": ["havingCondition","*havingCondition"], 
	     "STRAFTER": ["havingCondition","*havingCondition"], 
	     "YEAR": ["havingCondition","*havingCondition"], 
	     "MONTH": ["havingCondition","*havingCondition"], 
	     "DAY": ["havingCondition","*havingCondition"], 
	     "HOURS": ["havingCondition","*havingCondition"], 
	     "MINUTES": ["havingCondition","*havingCondition"], 
	     "SECONDS": ["havingCondition","*havingCondition"], 
	     "TIMEZONE": ["havingCondition","*havingCondition"], 
	     "TZ": ["havingCondition","*havingCondition"], 
	     "NOW": ["havingCondition","*havingCondition"], 
	     "UUID": ["havingCondition","*havingCondition"], 
	     "STRUUID": ["havingCondition","*havingCondition"], 
	     "MD5": ["havingCondition","*havingCondition"], 
	     "SHA1": ["havingCondition","*havingCondition"], 
	     "SHA256": ["havingCondition","*havingCondition"], 
	     "SHA384": ["havingCondition","*havingCondition"], 
	     "SHA512": ["havingCondition","*havingCondition"], 
	     "COALESCE": ["havingCondition","*havingCondition"], 
	     "IF": ["havingCondition","*havingCondition"], 
	     "STRLANG": ["havingCondition","*havingCondition"], 
	     "STRDT": ["havingCondition","*havingCondition"], 
	     "SAMETERM": ["havingCondition","*havingCondition"], 
	     "ISIRI": ["havingCondition","*havingCondition"], 
	     "ISURI": ["havingCondition","*havingCondition"], 
	     "ISBLANK": ["havingCondition","*havingCondition"], 
	     "ISLITERAL": ["havingCondition","*havingCondition"], 
	     "ISNUMERIC": ["havingCondition","*havingCondition"], 
	     "SUBSTR": ["havingCondition","*havingCondition"], 
	     "REPLACE": ["havingCondition","*havingCondition"], 
	     "REGEX": ["havingCondition","*havingCondition"], 
	     "EXISTS": ["havingCondition","*havingCondition"], 
	     "NOT": ["havingCondition","*havingCondition"], 
	     "IRI_REF": ["havingCondition","*havingCondition"], 
	     "PNAME_LN": ["havingCondition","*havingCondition"], 
	     "PNAME_NS": ["havingCondition","*havingCondition"]}, 
	  "+or([var,[ (,expression,AS,var,)]])" : {
	     "(": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "VAR1": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "VAR2": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"]}, 
	  "+orderCondition" : {
	     "ASC": ["orderCondition","*orderCondition"], 
	     "DESC": ["orderCondition","*orderCondition"], 
	     "VAR1": ["orderCondition","*orderCondition"], 
	     "VAR2": ["orderCondition","*orderCondition"], 
	     "(": ["orderCondition","*orderCondition"], 
	     "STR": ["orderCondition","*orderCondition"], 
	     "LANG": ["orderCondition","*orderCondition"], 
	     "LANGMATCHES": ["orderCondition","*orderCondition"], 
	     "DATATYPE": ["orderCondition","*orderCondition"], 
	     "BOUND": ["orderCondition","*orderCondition"], 
	     "IRI": ["orderCondition","*orderCondition"], 
	     "URI": ["orderCondition","*orderCondition"], 
	     "BNODE": ["orderCondition","*orderCondition"], 
	     "RAND": ["orderCondition","*orderCondition"], 
	     "ABS": ["orderCondition","*orderCondition"], 
	     "CEIL": ["orderCondition","*orderCondition"], 
	     "FLOOR": ["orderCondition","*orderCondition"], 
	     "ROUND": ["orderCondition","*orderCondition"], 
	     "CONCAT": ["orderCondition","*orderCondition"], 
	     "STRLEN": ["orderCondition","*orderCondition"], 
	     "UCASE": ["orderCondition","*orderCondition"], 
	     "LCASE": ["orderCondition","*orderCondition"], 
	     "ENCODE_FOR_URI": ["orderCondition","*orderCondition"], 
	     "CONTAINS": ["orderCondition","*orderCondition"], 
	     "STRSTARTS": ["orderCondition","*orderCondition"], 
	     "STRENDS": ["orderCondition","*orderCondition"], 
	     "STRBEFORE": ["orderCondition","*orderCondition"], 
	     "STRAFTER": ["orderCondition","*orderCondition"], 
	     "YEAR": ["orderCondition","*orderCondition"], 
	     "MONTH": ["orderCondition","*orderCondition"], 
	     "DAY": ["orderCondition","*orderCondition"], 
	     "HOURS": ["orderCondition","*orderCondition"], 
	     "MINUTES": ["orderCondition","*orderCondition"], 
	     "SECONDS": ["orderCondition","*orderCondition"], 
	     "TIMEZONE": ["orderCondition","*orderCondition"], 
	     "TZ": ["orderCondition","*orderCondition"], 
	     "NOW": ["orderCondition","*orderCondition"], 
	     "UUID": ["orderCondition","*orderCondition"], 
	     "STRUUID": ["orderCondition","*orderCondition"], 
	     "MD5": ["orderCondition","*orderCondition"], 
	     "SHA1": ["orderCondition","*orderCondition"], 
	     "SHA256": ["orderCondition","*orderCondition"], 
	     "SHA384": ["orderCondition","*orderCondition"], 
	     "SHA512": ["orderCondition","*orderCondition"], 
	     "COALESCE": ["orderCondition","*orderCondition"], 
	     "IF": ["orderCondition","*orderCondition"], 
	     "STRLANG": ["orderCondition","*orderCondition"], 
	     "STRDT": ["orderCondition","*orderCondition"], 
	     "SAMETERM": ["orderCondition","*orderCondition"], 
	     "ISIRI": ["orderCondition","*orderCondition"], 
	     "ISURI": ["orderCondition","*orderCondition"], 
	     "ISBLANK": ["orderCondition","*orderCondition"], 
	     "ISLITERAL": ["orderCondition","*orderCondition"], 
	     "ISNUMERIC": ["orderCondition","*orderCondition"], 
	     "SUBSTR": ["orderCondition","*orderCondition"], 
	     "REPLACE": ["orderCondition","*orderCondition"], 
	     "REGEX": ["orderCondition","*orderCondition"], 
	     "EXISTS": ["orderCondition","*orderCondition"], 
	     "NOT": ["orderCondition","*orderCondition"], 
	     "IRI_REF": ["orderCondition","*orderCondition"], 
	     "PNAME_LN": ["orderCondition","*orderCondition"], 
	     "PNAME_NS": ["orderCondition","*orderCondition"]}, 
	  "+varOrIRIref" : {
	     "VAR1": ["varOrIRIref","*varOrIRIref"], 
	     "VAR2": ["varOrIRIref","*varOrIRIref"], 
	     "IRI_REF": ["varOrIRIref","*varOrIRIref"], 
	     "PNAME_LN": ["varOrIRIref","*varOrIRIref"], 
	     "PNAME_NS": ["varOrIRIref","*varOrIRIref"]}, 
	  "?." : {
	     ".": ["."], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "(": [], 
	     "[": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "?DISTINCT" : {
	     "DISTINCT": ["DISTINCT"], 
	     "!": [], 
	     "+": [], 
	     "-": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "(": [], 
	     "STR": [], 
	     "LANG": [], 
	     "LANGMATCHES": [], 
	     "DATATYPE": [], 
	     "BOUND": [], 
	     "IRI": [], 
	     "URI": [], 
	     "BNODE": [], 
	     "RAND": [], 
	     "ABS": [], 
	     "CEIL": [], 
	     "FLOOR": [], 
	     "ROUND": [], 
	     "CONCAT": [], 
	     "STRLEN": [], 
	     "UCASE": [], 
	     "LCASE": [], 
	     "ENCODE_FOR_URI": [], 
	     "CONTAINS": [], 
	     "STRSTARTS": [], 
	     "STRENDS": [], 
	     "STRBEFORE": [], 
	     "STRAFTER": [], 
	     "YEAR": [], 
	     "MONTH": [], 
	     "DAY": [], 
	     "HOURS": [], 
	     "MINUTES": [], 
	     "SECONDS": [], 
	     "TIMEZONE": [], 
	     "TZ": [], 
	     "NOW": [], 
	     "UUID": [], 
	     "STRUUID": [], 
	     "MD5": [], 
	     "SHA1": [], 
	     "SHA256": [], 
	     "SHA384": [], 
	     "SHA512": [], 
	     "COALESCE": [], 
	     "IF": [], 
	     "STRLANG": [], 
	     "STRDT": [], 
	     "SAMETERM": [], 
	     "ISIRI": [], 
	     "ISURI": [], 
	     "ISBLANK": [], 
	     "ISLITERAL": [], 
	     "ISNUMERIC": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "COUNT": [], 
	     "SUM": [], 
	     "MIN": [], 
	     "MAX": [], 
	     "AVG": [], 
	     "SAMPLE": [], 
	     "GROUP_CONCAT": [], 
	     "SUBSTR": [], 
	     "REPLACE": [], 
	     "REGEX": [], 
	     "EXISTS": [], 
	     "NOT": [], 
	     "IRI_REF": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "*": []}, 
	  "?GRAPH" : {
	     "GRAPH": ["GRAPH"], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": []}, 
	  "?SILENT" : {
	     "SILENT": ["SILENT"], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": []}, 
	  "?SILENT_1" : {
	     "SILENT": ["SILENT"], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": []}, 
	  "?SILENT_2" : {
	     "SILENT": ["SILENT"], 
	     "GRAPH": [], 
	     "DEFAULT": [], 
	     "NAMED": [], 
	     "ALL": []}, 
	  "?SILENT_3" : {
	     "SILENT": ["SILENT"], 
	     "GRAPH": []}, 
	  "?SILENT_4" : {
	     "SILENT": ["SILENT"], 
	     "DEFAULT": [], 
	     "GRAPH": [], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": []}, 
	  "?WHERE" : {
	     "WHERE": ["WHERE"], 
	     "{": []}, 
	  "?[,,expression]" : {
	     ",": ["[,,expression]"], 
	     ")": []}, 
	  "?[.,?constructTriples]" : {
	     ".": ["[.,?constructTriples]"], 
	     "}": []}, 
	  "?[.,?triplesBlock]" : {
	     ".": ["[.,?triplesBlock]"], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "?[.,?triplesTemplate]" : {
	     ".": ["[.,?triplesTemplate]"], 
	     "}": [], 
	     "GRAPH": []}, 
	  "?[;,SEPARATOR,=,string]" : {
	     ";": ["[;,SEPARATOR,=,string]"], 
	     ")": []}, 
	  "?[;,update]" : {
	     ";": ["[;,update]"], 
	     "$": []}, 
	  "?[AS,var]" : {
	     "AS": ["[AS,var]"], 
	     ")": []}, 
	  "?[INTO,graphRef]" : {
	     "INTO": ["[INTO,graphRef]"], 
	     ";": [], 
	     "$": []}, 
	  "?[or([verbPath,verbSimple]),objectList]" : {
	     "VAR1": ["[or([verbPath,verbSimple]),objectList]"], 
	     "VAR2": ["[or([verbPath,verbSimple]),objectList]"], 
	     "^": ["[or([verbPath,verbSimple]),objectList]"], 
	     "a": ["[or([verbPath,verbSimple]),objectList]"], 
	     "!": ["[or([verbPath,verbSimple]),objectList]"], 
	     "(": ["[or([verbPath,verbSimple]),objectList]"], 
	     "IRI_REF": ["[or([verbPath,verbSimple]),objectList]"], 
	     "PNAME_LN": ["[or([verbPath,verbSimple]),objectList]"], 
	     "PNAME_NS": ["[or([verbPath,verbSimple]),objectList]"], 
	     ";": [], 
	     ".": [], 
	     "]": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "?[pathOneInPropertySet,*[|,pathOneInPropertySet]]" : {
	     "a": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     "^": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     "IRI_REF": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     "PNAME_LN": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     "PNAME_NS": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     ")": []}, 
	  "?[update1,?[;,update]]" : {
	     "INSERT": ["[update1,?[;,update]]"], 
	     "DELETE": ["[update1,?[;,update]]"], 
	     "LOAD": ["[update1,?[;,update]]"], 
	     "CLEAR": ["[update1,?[;,update]]"], 
	     "DROP": ["[update1,?[;,update]]"], 
	     "ADD": ["[update1,?[;,update]]"], 
	     "MOVE": ["[update1,?[;,update]]"], 
	     "COPY": ["[update1,?[;,update]]"], 
	     "CREATE": ["[update1,?[;,update]]"], 
	     "WITH": ["[update1,?[;,update]]"], 
	     "$": []}, 
	  "?[verb,objectList]" : {
	     "a": ["[verb,objectList]"], 
	     "VAR1": ["[verb,objectList]"], 
	     "VAR2": ["[verb,objectList]"], 
	     "IRI_REF": ["[verb,objectList]"], 
	     "PNAME_LN": ["[verb,objectList]"], 
	     "PNAME_NS": ["[verb,objectList]"], 
	     ";": [], 
	     ".": [], 
	     "]": [], 
	     "}": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": []}, 
	  "?argList" : {
	     "NIL": ["argList"], 
	     "(": ["argList"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     "+": [], 
	     "-": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "*": [], 
	     "/": [], 
	     ";": []}, 
	  "?baseDecl" : {
	     "BASE": ["baseDecl"], 
	     "$": [], 
	     "CONSTRUCT": [], 
	     "DESCRIBE": [], 
	     "ASK": [], 
	     "INSERT": [], 
	     "DELETE": [], 
	     "SELECT": [], 
	     "LOAD": [], 
	     "CLEAR": [], 
	     "DROP": [], 
	     "ADD": [], 
	     "MOVE": [], 
	     "COPY": [], 
	     "CREATE": [], 
	     "WITH": [], 
	     "PREFIX": []}, 
	  "?constructTriples" : {
	     "VAR1": ["constructTriples"], 
	     "VAR2": ["constructTriples"], 
	     "NIL": ["constructTriples"], 
	     "(": ["constructTriples"], 
	     "[": ["constructTriples"], 
	     "IRI_REF": ["constructTriples"], 
	     "TRUE": ["constructTriples"], 
	     "FALSE": ["constructTriples"], 
	     "BLANK_NODE_LABEL": ["constructTriples"], 
	     "ANON": ["constructTriples"], 
	     "PNAME_LN": ["constructTriples"], 
	     "PNAME_NS": ["constructTriples"], 
	     "STRING_LITERAL1": ["constructTriples"], 
	     "STRING_LITERAL2": ["constructTriples"], 
	     "STRING_LITERAL_LONG1": ["constructTriples"], 
	     "STRING_LITERAL_LONG2": ["constructTriples"], 
	     "INTEGER": ["constructTriples"], 
	     "DECIMAL": ["constructTriples"], 
	     "DOUBLE": ["constructTriples"], 
	     "INTEGER_POSITIVE": ["constructTriples"], 
	     "DECIMAL_POSITIVE": ["constructTriples"], 
	     "DOUBLE_POSITIVE": ["constructTriples"], 
	     "INTEGER_NEGATIVE": ["constructTriples"], 
	     "DECIMAL_NEGATIVE": ["constructTriples"], 
	     "DOUBLE_NEGATIVE": ["constructTriples"], 
	     "}": []}, 
	  "?groupClause" : {
	     "GROUP": ["groupClause"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "$": [], 
	     "}": []}, 
	  "?havingClause" : {
	     "HAVING": ["havingClause"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "ORDER": [], 
	     "$": [], 
	     "}": []}, 
	  "?insertClause" : {
	     "INSERT": ["insertClause"], 
	     "WHERE": [], 
	     "USING": []}, 
	  "?limitClause" : {
	     "LIMIT": ["limitClause"], 
	     "VALUES": [], 
	     "$": [], 
	     "}": []}, 
	  "?limitOffsetClauses" : {
	     "LIMIT": ["limitOffsetClauses"], 
	     "OFFSET": ["limitOffsetClauses"], 
	     "VALUES": [], 
	     "$": [], 
	     "}": []}, 
	  "?offsetClause" : {
	     "OFFSET": ["offsetClause"], 
	     "VALUES": [], 
	     "$": [], 
	     "}": []}, 
	  "?or([DISTINCT,REDUCED])" : {
	     "DISTINCT": ["or([DISTINCT,REDUCED])"], 
	     "REDUCED": ["or([DISTINCT,REDUCED])"], 
	     "*": [], 
	     "(": [], 
	     "VAR1": [], 
	     "VAR2": []}, 
	  "?or([LANGTAG,[^^,iriRef]])" : {
	     "LANGTAG": ["or([LANGTAG,[^^,iriRef]])"], 
	     "^^": ["or([LANGTAG,[^^,iriRef]])"], 
	     "UNDEF": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "a": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "^": [], 
	     "!": [], 
	     "(": [], 
	     ".": [], 
	     ";": [], 
	     ",": [], 
	     "AS": [], 
	     ")": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     "+": [], 
	     "-": [], 
	     "*": [], 
	     "/": [], 
	     "}": [], 
	     "[": [], 
	     "NIL": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "]": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": []}, 
	  "?or([[*,unaryExpression],[/,unaryExpression]])" : {
	     "*": ["or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "/": ["or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "+": [], 
	     "-": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     ";": []}, 
	  "?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])" : {
	     "=": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "!=": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "<": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     ">": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "<=": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     ">=": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "IN": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "NOT": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     ";": []}, 
	  "?orderClause" : {
	     "ORDER": ["orderClause"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "$": [], 
	     "}": []}, 
	  "?pathMod" : {
	     "*": ["pathMod"], 
	     "?": ["pathMod"], 
	     "+": ["pathMod"], 
	     "{": ["pathMod"], 
	     "|": [], 
	     "/": [], 
	     ")": [], 
	     "(": [], 
	     "[": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "?triplesBlock" : {
	     "VAR1": ["triplesBlock"], 
	     "VAR2": ["triplesBlock"], 
	     "NIL": ["triplesBlock"], 
	     "(": ["triplesBlock"], 
	     "[": ["triplesBlock"], 
	     "IRI_REF": ["triplesBlock"], 
	     "TRUE": ["triplesBlock"], 
	     "FALSE": ["triplesBlock"], 
	     "BLANK_NODE_LABEL": ["triplesBlock"], 
	     "ANON": ["triplesBlock"], 
	     "PNAME_LN": ["triplesBlock"], 
	     "PNAME_NS": ["triplesBlock"], 
	     "STRING_LITERAL1": ["triplesBlock"], 
	     "STRING_LITERAL2": ["triplesBlock"], 
	     "STRING_LITERAL_LONG1": ["triplesBlock"], 
	     "STRING_LITERAL_LONG2": ["triplesBlock"], 
	     "INTEGER": ["triplesBlock"], 
	     "DECIMAL": ["triplesBlock"], 
	     "DOUBLE": ["triplesBlock"], 
	     "INTEGER_POSITIVE": ["triplesBlock"], 
	     "DECIMAL_POSITIVE": ["triplesBlock"], 
	     "DOUBLE_POSITIVE": ["triplesBlock"], 
	     "INTEGER_NEGATIVE": ["triplesBlock"], 
	     "DECIMAL_NEGATIVE": ["triplesBlock"], 
	     "DOUBLE_NEGATIVE": ["triplesBlock"], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "?triplesTemplate" : {
	     "VAR1": ["triplesTemplate"], 
	     "VAR2": ["triplesTemplate"], 
	     "NIL": ["triplesTemplate"], 
	     "(": ["triplesTemplate"], 
	     "[": ["triplesTemplate"], 
	     "IRI_REF": ["triplesTemplate"], 
	     "TRUE": ["triplesTemplate"], 
	     "FALSE": ["triplesTemplate"], 
	     "BLANK_NODE_LABEL": ["triplesTemplate"], 
	     "ANON": ["triplesTemplate"], 
	     "PNAME_LN": ["triplesTemplate"], 
	     "PNAME_NS": ["triplesTemplate"], 
	     "STRING_LITERAL1": ["triplesTemplate"], 
	     "STRING_LITERAL2": ["triplesTemplate"], 
	     "STRING_LITERAL_LONG1": ["triplesTemplate"], 
	     "STRING_LITERAL_LONG2": ["triplesTemplate"], 
	     "INTEGER": ["triplesTemplate"], 
	     "DECIMAL": ["triplesTemplate"], 
	     "DOUBLE": ["triplesTemplate"], 
	     "INTEGER_POSITIVE": ["triplesTemplate"], 
	     "DECIMAL_POSITIVE": ["triplesTemplate"], 
	     "DOUBLE_POSITIVE": ["triplesTemplate"], 
	     "INTEGER_NEGATIVE": ["triplesTemplate"], 
	     "DECIMAL_NEGATIVE": ["triplesTemplate"], 
	     "DOUBLE_NEGATIVE": ["triplesTemplate"], 
	     "}": [], 
	     "GRAPH": []}, 
	  "?whereClause" : {
	     "WHERE": ["whereClause"], 
	     "{": ["whereClause"], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "GROUP": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "VALUES": [], 
	     "$": []}, 
	  "[ (,*dataBlockValue,)]" : {
	     "(": ["(","*dataBlockValue",")"]}, 
	  "[ (,*var,)]" : {
	     "(": ["(","*var",")"]}, 
	  "[ (,expression,)]" : {
	     "(": ["(","expression",")"]}, 
	  "[ (,expression,AS,var,)]" : {
	     "(": ["(","expression","AS","var",")"]}, 
	  "[!=,numericExpression]" : {
	     "!=": ["!=","numericExpression"]}, 
	  "[&&,valueLogical]" : {
	     "&&": ["&&","valueLogical"]}, 
	  "[*,unaryExpression]" : {
	     "*": ["*","unaryExpression"]}, 
	  "[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]" : {
	     "WHERE": ["*datasetClause","WHERE","{","?triplesTemplate","}","solutionModifier"], 
	     "FROM": ["*datasetClause","WHERE","{","?triplesTemplate","}","solutionModifier"]}, 
	  "[+,multiplicativeExpression]" : {
	     "+": ["+","multiplicativeExpression"]}, 
	  "[,,expression]" : {
	     ",": [",","expression"]}, 
	  "[,,integer,}]" : {
	     ",": [",","integer","}"]}, 
	  "[,,objectPath]" : {
	     ",": [",","objectPath"]}, 
	  "[,,object]" : {
	     ",": [",","object"]}, 
	  "[,,or([},[integer,}]])]" : {
	     ",": [",","or([},[integer,}]])"]}, 
	  "[-,multiplicativeExpression]" : {
	     "-": ["-","multiplicativeExpression"]}, 
	  "[.,?constructTriples]" : {
	     ".": [".","?constructTriples"]}, 
	  "[.,?triplesBlock]" : {
	     ".": [".","?triplesBlock"]}, 
	  "[.,?triplesTemplate]" : {
	     ".": [".","?triplesTemplate"]}, 
	  "[/,pathEltOrInverse]" : {
	     "/": ["/","pathEltOrInverse"]}, 
	  "[/,unaryExpression]" : {
	     "/": ["/","unaryExpression"]}, 
	  "[;,?[or([verbPath,verbSimple]),objectList]]" : {
	     ";": [";","?[or([verbPath,verbSimple]),objectList]"]}, 
	  "[;,?[verb,objectList]]" : {
	     ";": [";","?[verb,objectList]"]}, 
	  "[;,SEPARATOR,=,string]" : {
	     ";": [";","SEPARATOR","=","string"]}, 
	  "[;,update]" : {
	     ";": [";","update"]}, 
	  "[<,numericExpression]" : {
	     "<": ["<","numericExpression"]}, 
	  "[<=,numericExpression]" : {
	     "<=": ["<=","numericExpression"]}, 
	  "[=,numericExpression]" : {
	     "=": ["=","numericExpression"]}, 
	  "[>,numericExpression]" : {
	     ">": [">","numericExpression"]}, 
	  "[>=,numericExpression]" : {
	     ">=": [">=","numericExpression"]}, 
	  "[AS,var]" : {
	     "AS": ["AS","var"]}, 
	  "[IN,expressionList]" : {
	     "IN": ["IN","expressionList"]}, 
	  "[INTO,graphRef]" : {
	     "INTO": ["INTO","graphRef"]}, 
	  "[NAMED,iriRef]" : {
	     "NAMED": ["NAMED","iriRef"]}, 
	  "[NOT,IN,expressionList]" : {
	     "NOT": ["NOT","IN","expressionList"]}, 
	  "[UNION,groupGraphPattern]" : {
	     "UNION": ["UNION","groupGraphPattern"]}, 
	  "[^^,iriRef]" : {
	     "^^": ["^^","iriRef"]}, 
	  "[constructTemplate,*datasetClause,whereClause,solutionModifier]" : {
	     "{": ["constructTemplate","*datasetClause","whereClause","solutionModifier"]}, 
	  "[deleteClause,?insertClause]" : {
	     "DELETE": ["deleteClause","?insertClause"]}, 
	  "[graphPatternNotTriples,?.,?triplesBlock]" : {
	     "{": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "OPTIONAL": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "MINUS": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "GRAPH": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "SERVICE": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "FILTER": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "BIND": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "VALUES": ["graphPatternNotTriples","?.","?triplesBlock"]}, 
	  "[integer,or([[,,or([},[integer,}]])],}])]" : {
	     "INTEGER": ["integer","or([[,,or([},[integer,}]])],}])"]}, 
	  "[integer,}]" : {
	     "INTEGER": ["integer","}"]}, 
	  "[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]" : {
	     "INTEGER_POSITIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL_POSITIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE_POSITIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "INTEGER_NEGATIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL_NEGATIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE_NEGATIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"]}, 
	  "[or([verbPath,verbSimple]),objectList]" : {
	     "VAR1": ["or([verbPath,verbSimple])","objectList"], 
	     "VAR2": ["or([verbPath,verbSimple])","objectList"], 
	     "^": ["or([verbPath,verbSimple])","objectList"], 
	     "a": ["or([verbPath,verbSimple])","objectList"], 
	     "!": ["or([verbPath,verbSimple])","objectList"], 
	     "(": ["or([verbPath,verbSimple])","objectList"], 
	     "IRI_REF": ["or([verbPath,verbSimple])","objectList"], 
	     "PNAME_LN": ["or([verbPath,verbSimple])","objectList"], 
	     "PNAME_NS": ["or([verbPath,verbSimple])","objectList"]}, 
	  "[pathOneInPropertySet,*[|,pathOneInPropertySet]]" : {
	     "a": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"], 
	     "^": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"], 
	     "IRI_REF": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"], 
	     "PNAME_LN": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"], 
	     "PNAME_NS": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"]}, 
	  "[quadsNotTriples,?.,?triplesTemplate]" : {
	     "GRAPH": ["quadsNotTriples","?.","?triplesTemplate"]}, 
	  "[update1,?[;,update]]" : {
	     "INSERT": ["update1","?[;,update]"], 
	     "DELETE": ["update1","?[;,update]"], 
	     "LOAD": ["update1","?[;,update]"], 
	     "CLEAR": ["update1","?[;,update]"], 
	     "DROP": ["update1","?[;,update]"], 
	     "ADD": ["update1","?[;,update]"], 
	     "MOVE": ["update1","?[;,update]"], 
	     "COPY": ["update1","?[;,update]"], 
	     "CREATE": ["update1","?[;,update]"], 
	     "WITH": ["update1","?[;,update]"]}, 
	  "[verb,objectList]" : {
	     "a": ["verb","objectList"], 
	     "VAR1": ["verb","objectList"], 
	     "VAR2": ["verb","objectList"], 
	     "IRI_REF": ["verb","objectList"], 
	     "PNAME_LN": ["verb","objectList"], 
	     "PNAME_NS": ["verb","objectList"]}, 
	  "[|,pathOneInPropertySet]" : {
	     "|": ["|","pathOneInPropertySet"]}, 
	  "[|,pathSequence]" : {
	     "|": ["|","pathSequence"]}, 
	  "[||,conditionalAndExpression]" : {
	     "||": ["||","conditionalAndExpression"]}, 
	  "add" : {
	     "ADD": ["ADD","?SILENT_4","graphOrDefault","TO","graphOrDefault"]}, 
	  "additiveExpression" : {
	     "!": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "+": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "-": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "VAR1": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "VAR2": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "(": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STR": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "LANG": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "LANGMATCHES": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DATATYPE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "BOUND": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "IRI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "URI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "BNODE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "RAND": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ABS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "CEIL": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "FLOOR": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ROUND": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "CONCAT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRLEN": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "UCASE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "LCASE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ENCODE_FOR_URI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "CONTAINS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRSTARTS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRENDS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRBEFORE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRAFTER": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "YEAR": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MONTH": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DAY": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "HOURS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MINUTES": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SECONDS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "TIMEZONE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "TZ": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "NOW": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "UUID": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRUUID": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MD5": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SHA1": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SHA256": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SHA384": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SHA512": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "COALESCE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "IF": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRLANG": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRDT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SAMETERM": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISIRI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISURI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISBLANK": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISLITERAL": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISNUMERIC": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "TRUE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "FALSE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "COUNT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SUM": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MIN": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MAX": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "AVG": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SAMPLE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "GROUP_CONCAT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SUBSTR": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "REPLACE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "REGEX": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "EXISTS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "NOT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "IRI_REF": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRING_LITERAL1": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRING_LITERAL2": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRING_LITERAL_LONG1": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRING_LITERAL_LONG2": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER_POSITIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL_POSITIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE_POSITIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER_NEGATIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL_NEGATIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE_NEGATIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "PNAME_LN": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "PNAME_NS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"]}, 
	  "aggregate" : {
	     "COUNT": ["COUNT","(","?DISTINCT","or([*,expression])",")"], 
	     "SUM": ["SUM","(","?DISTINCT","expression",")"], 
	     "MIN": ["MIN","(","?DISTINCT","expression",")"], 
	     "MAX": ["MAX","(","?DISTINCT","expression",")"], 
	     "AVG": ["AVG","(","?DISTINCT","expression",")"], 
	     "SAMPLE": ["SAMPLE","(","?DISTINCT","expression",")"], 
	     "GROUP_CONCAT": ["GROUP_CONCAT","(","?DISTINCT","expression","?[;,SEPARATOR,=,string]",")"]}, 
	  "allowBnodes" : {
	     "}": []}, 
	  "allowVars" : {
	     "}": []}, 
	  "argList" : {
	     "NIL": ["NIL"], 
	     "(": ["(","?DISTINCT","expression","*[,,expression]",")"]}, 
	  "askQuery" : {
	     "ASK": ["ASK","*datasetClause","whereClause","solutionModifier"]}, 
	  "baseDecl" : {
	     "BASE": ["BASE","IRI_REF"]}, 
	  "bind" : {
	     "BIND": ["BIND","(","expression","AS","var",")"]}, 
	  "blankNode" : {
	     "BLANK_NODE_LABEL": ["BLANK_NODE_LABEL"], 
	     "ANON": ["ANON"]}, 
	  "blankNodePropertyList" : {
	     "[": ["[","propertyListNotEmpty","]"]}, 
	  "blankNodePropertyListPath" : {
	     "[": ["[","propertyListPathNotEmpty","]"]}, 
	  "booleanLiteral" : {
	     "TRUE": ["TRUE"], 
	     "FALSE": ["FALSE"]}, 
	  "brackettedExpression" : {
	     "(": ["(","expression",")"]}, 
	  "builtInCall" : {
	     "STR": ["STR","(","expression",")"], 
	     "LANG": ["LANG","(","expression",")"], 
	     "LANGMATCHES": ["LANGMATCHES","(","expression",",","expression",")"], 
	     "DATATYPE": ["DATATYPE","(","expression",")"], 
	     "BOUND": ["BOUND","(","var",")"], 
	     "IRI": ["IRI","(","expression",")"], 
	     "URI": ["URI","(","expression",")"], 
	     "BNODE": ["BNODE","or([[ (,expression,)],NIL])"], 
	     "RAND": ["RAND","NIL"], 
	     "ABS": ["ABS","(","expression",")"], 
	     "CEIL": ["CEIL","(","expression",")"], 
	     "FLOOR": ["FLOOR","(","expression",")"], 
	     "ROUND": ["ROUND","(","expression",")"], 
	     "CONCAT": ["CONCAT","expressionList"], 
	     "SUBSTR": ["substringExpression"], 
	     "STRLEN": ["STRLEN","(","expression",")"], 
	     "REPLACE": ["strReplaceExpression"], 
	     "UCASE": ["UCASE","(","expression",")"], 
	     "LCASE": ["LCASE","(","expression",")"], 
	     "ENCODE_FOR_URI": ["ENCODE_FOR_URI","(","expression",")"], 
	     "CONTAINS": ["CONTAINS","(","expression",",","expression",")"], 
	     "STRSTARTS": ["STRSTARTS","(","expression",",","expression",")"], 
	     "STRENDS": ["STRENDS","(","expression",",","expression",")"], 
	     "STRBEFORE": ["STRBEFORE","(","expression",",","expression",")"], 
	     "STRAFTER": ["STRAFTER","(","expression",",","expression",")"], 
	     "YEAR": ["YEAR","(","expression",")"], 
	     "MONTH": ["MONTH","(","expression",")"], 
	     "DAY": ["DAY","(","expression",")"], 
	     "HOURS": ["HOURS","(","expression",")"], 
	     "MINUTES": ["MINUTES","(","expression",")"], 
	     "SECONDS": ["SECONDS","(","expression",")"], 
	     "TIMEZONE": ["TIMEZONE","(","expression",")"], 
	     "TZ": ["TZ","(","expression",")"], 
	     "NOW": ["NOW","NIL"], 
	     "UUID": ["UUID","NIL"], 
	     "STRUUID": ["STRUUID","NIL"], 
	     "MD5": ["MD5","(","expression",")"], 
	     "SHA1": ["SHA1","(","expression",")"], 
	     "SHA256": ["SHA256","(","expression",")"], 
	     "SHA384": ["SHA384","(","expression",")"], 
	     "SHA512": ["SHA512","(","expression",")"], 
	     "COALESCE": ["COALESCE","expressionList"], 
	     "IF": ["IF","(","expression",",","expression",",","expression",")"], 
	     "STRLANG": ["STRLANG","(","expression",",","expression",")"], 
	     "STRDT": ["STRDT","(","expression",",","expression",")"], 
	     "SAMETERM": ["SAMETERM","(","expression",",","expression",")"], 
	     "ISIRI": ["ISIRI","(","expression",")"], 
	     "ISURI": ["ISURI","(","expression",")"], 
	     "ISBLANK": ["ISBLANK","(","expression",")"], 
	     "ISLITERAL": ["ISLITERAL","(","expression",")"], 
	     "ISNUMERIC": ["ISNUMERIC","(","expression",")"], 
	     "REGEX": ["regexExpression"], 
	     "EXISTS": ["existsFunc"], 
	     "NOT": ["notExistsFunc"]}, 
	  "clear" : {
	     "CLEAR": ["CLEAR","?SILENT_2","graphRefAll"]}, 
	  "collection" : {
	     "(": ["(","+graphNode",")"]}, 
	  "collectionPath" : {
	     "(": ["(","+graphNodePath",")"]}, 
	  "conditionalAndExpression" : {
	     "!": ["valueLogical","*[&&,valueLogical]"], 
	     "+": ["valueLogical","*[&&,valueLogical]"], 
	     "-": ["valueLogical","*[&&,valueLogical]"], 
	     "VAR1": ["valueLogical","*[&&,valueLogical]"], 
	     "VAR2": ["valueLogical","*[&&,valueLogical]"], 
	     "(": ["valueLogical","*[&&,valueLogical]"], 
	     "STR": ["valueLogical","*[&&,valueLogical]"], 
	     "LANG": ["valueLogical","*[&&,valueLogical]"], 
	     "LANGMATCHES": ["valueLogical","*[&&,valueLogical]"], 
	     "DATATYPE": ["valueLogical","*[&&,valueLogical]"], 
	     "BOUND": ["valueLogical","*[&&,valueLogical]"], 
	     "IRI": ["valueLogical","*[&&,valueLogical]"], 
	     "URI": ["valueLogical","*[&&,valueLogical]"], 
	     "BNODE": ["valueLogical","*[&&,valueLogical]"], 
	     "RAND": ["valueLogical","*[&&,valueLogical]"], 
	     "ABS": ["valueLogical","*[&&,valueLogical]"], 
	     "CEIL": ["valueLogical","*[&&,valueLogical]"], 
	     "FLOOR": ["valueLogical","*[&&,valueLogical]"], 
	     "ROUND": ["valueLogical","*[&&,valueLogical]"], 
	     "CONCAT": ["valueLogical","*[&&,valueLogical]"], 
	     "STRLEN": ["valueLogical","*[&&,valueLogical]"], 
	     "UCASE": ["valueLogical","*[&&,valueLogical]"], 
	     "LCASE": ["valueLogical","*[&&,valueLogical]"], 
	     "ENCODE_FOR_URI": ["valueLogical","*[&&,valueLogical]"], 
	     "CONTAINS": ["valueLogical","*[&&,valueLogical]"], 
	     "STRSTARTS": ["valueLogical","*[&&,valueLogical]"], 
	     "STRENDS": ["valueLogical","*[&&,valueLogical]"], 
	     "STRBEFORE": ["valueLogical","*[&&,valueLogical]"], 
	     "STRAFTER": ["valueLogical","*[&&,valueLogical]"], 
	     "YEAR": ["valueLogical","*[&&,valueLogical]"], 
	     "MONTH": ["valueLogical","*[&&,valueLogical]"], 
	     "DAY": ["valueLogical","*[&&,valueLogical]"], 
	     "HOURS": ["valueLogical","*[&&,valueLogical]"], 
	     "MINUTES": ["valueLogical","*[&&,valueLogical]"], 
	     "SECONDS": ["valueLogical","*[&&,valueLogical]"], 
	     "TIMEZONE": ["valueLogical","*[&&,valueLogical]"], 
	     "TZ": ["valueLogical","*[&&,valueLogical]"], 
	     "NOW": ["valueLogical","*[&&,valueLogical]"], 
	     "UUID": ["valueLogical","*[&&,valueLogical]"], 
	     "STRUUID": ["valueLogical","*[&&,valueLogical]"], 
	     "MD5": ["valueLogical","*[&&,valueLogical]"], 
	     "SHA1": ["valueLogical","*[&&,valueLogical]"], 
	     "SHA256": ["valueLogical","*[&&,valueLogical]"], 
	     "SHA384": ["valueLogical","*[&&,valueLogical]"], 
	     "SHA512": ["valueLogical","*[&&,valueLogical]"], 
	     "COALESCE": ["valueLogical","*[&&,valueLogical]"], 
	     "IF": ["valueLogical","*[&&,valueLogical]"], 
	     "STRLANG": ["valueLogical","*[&&,valueLogical]"], 
	     "STRDT": ["valueLogical","*[&&,valueLogical]"], 
	     "SAMETERM": ["valueLogical","*[&&,valueLogical]"], 
	     "ISIRI": ["valueLogical","*[&&,valueLogical]"], 
	     "ISURI": ["valueLogical","*[&&,valueLogical]"], 
	     "ISBLANK": ["valueLogical","*[&&,valueLogical]"], 
	     "ISLITERAL": ["valueLogical","*[&&,valueLogical]"], 
	     "ISNUMERIC": ["valueLogical","*[&&,valueLogical]"], 
	     "TRUE": ["valueLogical","*[&&,valueLogical]"], 
	     "FALSE": ["valueLogical","*[&&,valueLogical]"], 
	     "COUNT": ["valueLogical","*[&&,valueLogical]"], 
	     "SUM": ["valueLogical","*[&&,valueLogical]"], 
	     "MIN": ["valueLogical","*[&&,valueLogical]"], 
	     "MAX": ["valueLogical","*[&&,valueLogical]"], 
	     "AVG": ["valueLogical","*[&&,valueLogical]"], 
	     "SAMPLE": ["valueLogical","*[&&,valueLogical]"], 
	     "GROUP_CONCAT": ["valueLogical","*[&&,valueLogical]"], 
	     "SUBSTR": ["valueLogical","*[&&,valueLogical]"], 
	     "REPLACE": ["valueLogical","*[&&,valueLogical]"], 
	     "REGEX": ["valueLogical","*[&&,valueLogical]"], 
	     "EXISTS": ["valueLogical","*[&&,valueLogical]"], 
	     "NOT": ["valueLogical","*[&&,valueLogical]"], 
	     "IRI_REF": ["valueLogical","*[&&,valueLogical]"], 
	     "STRING_LITERAL1": ["valueLogical","*[&&,valueLogical]"], 
	     "STRING_LITERAL2": ["valueLogical","*[&&,valueLogical]"], 
	     "STRING_LITERAL_LONG1": ["valueLogical","*[&&,valueLogical]"], 
	     "STRING_LITERAL_LONG2": ["valueLogical","*[&&,valueLogical]"], 
	     "INTEGER": ["valueLogical","*[&&,valueLogical]"], 
	     "DECIMAL": ["valueLogical","*[&&,valueLogical]"], 
	     "DOUBLE": ["valueLogical","*[&&,valueLogical]"], 
	     "INTEGER_POSITIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "DECIMAL_POSITIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "DOUBLE_POSITIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "INTEGER_NEGATIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "DECIMAL_NEGATIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "DOUBLE_NEGATIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "PNAME_LN": ["valueLogical","*[&&,valueLogical]"], 
	     "PNAME_NS": ["valueLogical","*[&&,valueLogical]"]}, 
	  "conditionalOrExpression" : {
	     "!": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "+": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "-": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "VAR1": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "VAR2": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "(": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STR": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "LANG": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "LANGMATCHES": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DATATYPE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "BOUND": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "IRI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "URI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "BNODE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "RAND": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ABS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "CEIL": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "FLOOR": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ROUND": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "CONCAT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRLEN": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "UCASE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "LCASE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ENCODE_FOR_URI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "CONTAINS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRSTARTS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRENDS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRBEFORE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRAFTER": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "YEAR": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MONTH": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DAY": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "HOURS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MINUTES": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SECONDS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "TIMEZONE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "TZ": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "NOW": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "UUID": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRUUID": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MD5": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SHA1": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SHA256": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SHA384": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SHA512": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "COALESCE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "IF": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRLANG": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRDT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SAMETERM": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISIRI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISURI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISBLANK": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISLITERAL": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISNUMERIC": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "TRUE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "FALSE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "COUNT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SUM": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MIN": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MAX": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "AVG": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SAMPLE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "GROUP_CONCAT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SUBSTR": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "REPLACE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "REGEX": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "EXISTS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "NOT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "IRI_REF": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRING_LITERAL1": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRING_LITERAL2": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRING_LITERAL_LONG1": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRING_LITERAL_LONG2": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "INTEGER": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DECIMAL": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DOUBLE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "INTEGER_POSITIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DECIMAL_POSITIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DOUBLE_POSITIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "INTEGER_NEGATIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DECIMAL_NEGATIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DOUBLE_NEGATIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "PNAME_LN": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "PNAME_NS": ["conditionalAndExpression","*[||,conditionalAndExpression]"]}, 
	  "constraint" : {
	     "(": ["brackettedExpression"], 
	     "STR": ["builtInCall"], 
	     "LANG": ["builtInCall"], 
	     "LANGMATCHES": ["builtInCall"], 
	     "DATATYPE": ["builtInCall"], 
	     "BOUND": ["builtInCall"], 
	     "IRI": ["builtInCall"], 
	     "URI": ["builtInCall"], 
	     "BNODE": ["builtInCall"], 
	     "RAND": ["builtInCall"], 
	     "ABS": ["builtInCall"], 
	     "CEIL": ["builtInCall"], 
	     "FLOOR": ["builtInCall"], 
	     "ROUND": ["builtInCall"], 
	     "CONCAT": ["builtInCall"], 
	     "STRLEN": ["builtInCall"], 
	     "UCASE": ["builtInCall"], 
	     "LCASE": ["builtInCall"], 
	     "ENCODE_FOR_URI": ["builtInCall"], 
	     "CONTAINS": ["builtInCall"], 
	     "STRSTARTS": ["builtInCall"], 
	     "STRENDS": ["builtInCall"], 
	     "STRBEFORE": ["builtInCall"], 
	     "STRAFTER": ["builtInCall"], 
	     "YEAR": ["builtInCall"], 
	     "MONTH": ["builtInCall"], 
	     "DAY": ["builtInCall"], 
	     "HOURS": ["builtInCall"], 
	     "MINUTES": ["builtInCall"], 
	     "SECONDS": ["builtInCall"], 
	     "TIMEZONE": ["builtInCall"], 
	     "TZ": ["builtInCall"], 
	     "NOW": ["builtInCall"], 
	     "UUID": ["builtInCall"], 
	     "STRUUID": ["builtInCall"], 
	     "MD5": ["builtInCall"], 
	     "SHA1": ["builtInCall"], 
	     "SHA256": ["builtInCall"], 
	     "SHA384": ["builtInCall"], 
	     "SHA512": ["builtInCall"], 
	     "COALESCE": ["builtInCall"], 
	     "IF": ["builtInCall"], 
	     "STRLANG": ["builtInCall"], 
	     "STRDT": ["builtInCall"], 
	     "SAMETERM": ["builtInCall"], 
	     "ISIRI": ["builtInCall"], 
	     "ISURI": ["builtInCall"], 
	     "ISBLANK": ["builtInCall"], 
	     "ISLITERAL": ["builtInCall"], 
	     "ISNUMERIC": ["builtInCall"], 
	     "SUBSTR": ["builtInCall"], 
	     "REPLACE": ["builtInCall"], 
	     "REGEX": ["builtInCall"], 
	     "EXISTS": ["builtInCall"], 
	     "NOT": ["builtInCall"], 
	     "IRI_REF": ["functionCall"], 
	     "PNAME_LN": ["functionCall"], 
	     "PNAME_NS": ["functionCall"]}, 
	  "constructQuery" : {
	     "CONSTRUCT": ["CONSTRUCT","or([[constructTemplate,*datasetClause,whereClause,solutionModifier],[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]])"]}, 
	  "constructTemplate" : {
	     "{": ["{","?constructTriples","}"]}, 
	  "constructTriples" : {
	     "VAR1": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "VAR2": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "NIL": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "(": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "[": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "IRI_REF": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "TRUE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "FALSE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "BLANK_NODE_LABEL": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "ANON": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "PNAME_LN": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "PNAME_NS": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "STRING_LITERAL1": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "STRING_LITERAL2": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "STRING_LITERAL_LONG1": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "STRING_LITERAL_LONG2": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "INTEGER": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DECIMAL": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DOUBLE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "INTEGER_POSITIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DECIMAL_POSITIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DOUBLE_POSITIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "INTEGER_NEGATIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DECIMAL_NEGATIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DOUBLE_NEGATIVE": ["triplesSameSubject","?[.,?constructTriples]"]}, 
	  "copy" : {
	     "COPY": ["COPY","?SILENT_4","graphOrDefault","TO","graphOrDefault"]}, 
	  "create" : {
	     "CREATE": ["CREATE","?SILENT_3","graphRef"]}, 
	  "dataBlock" : {
	     "NIL": ["or([inlineDataOneVar,inlineDataFull])"], 
	     "(": ["or([inlineDataOneVar,inlineDataFull])"], 
	     "VAR1": ["or([inlineDataOneVar,inlineDataFull])"], 
	     "VAR2": ["or([inlineDataOneVar,inlineDataFull])"]}, 
	  "dataBlockValue" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "STRING_LITERAL1": ["rdfLiteral"], 
	     "STRING_LITERAL2": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG1": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG2": ["rdfLiteral"], 
	     "INTEGER": ["numericLiteral"], 
	     "DECIMAL": ["numericLiteral"], 
	     "DOUBLE": ["numericLiteral"], 
	     "INTEGER_POSITIVE": ["numericLiteral"], 
	     "DECIMAL_POSITIVE": ["numericLiteral"], 
	     "DOUBLE_POSITIVE": ["numericLiteral"], 
	     "INTEGER_NEGATIVE": ["numericLiteral"], 
	     "DECIMAL_NEGATIVE": ["numericLiteral"], 
	     "DOUBLE_NEGATIVE": ["numericLiteral"], 
	     "TRUE": ["booleanLiteral"], 
	     "FALSE": ["booleanLiteral"], 
	     "UNDEF": ["UNDEF"]}, 
	  "datasetClause" : {
	     "FROM": ["FROM","or([defaultGraphClause,namedGraphClause])"]}, 
	  "defaultGraphClause" : {
	     "IRI_REF": ["sourceSelector"], 
	     "PNAME_LN": ["sourceSelector"], 
	     "PNAME_NS": ["sourceSelector"]}, 
	  "delete1" : {
	     "DATA": ["DATA","quadDataNoBnodes"], 
	     "WHERE": ["WHERE","quadPatternNoBnodes"], 
	     "{": ["quadPatternNoBnodes","?insertClause","*usingClause","WHERE","groupGraphPattern"]}, 
	  "deleteClause" : {
	     "DELETE": ["DELETE","quadPattern"]}, 
	  "describeDatasetClause" : {
	     "FROM": ["FROM","or([defaultGraphClause,namedGraphClause])"]}, 
	  "describeQuery" : {
	     "DESCRIBE": ["DESCRIBE","or([+varOrIRIref,*])","*describeDatasetClause","?whereClause","solutionModifier"]}, 
	  "disallowBnodes" : {
	     "}": [], 
	     "GRAPH": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "(": [], 
	     "[": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "disallowVars" : {
	     "}": [], 
	     "GRAPH": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "(": [], 
	     "[": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "drop" : {
	     "DROP": ["DROP","?SILENT_2","graphRefAll"]}, 
	  "existsFunc" : {
	     "EXISTS": ["EXISTS","groupGraphPattern"]}, 
	  "expression" : {
	     "!": ["conditionalOrExpression"], 
	     "+": ["conditionalOrExpression"], 
	     "-": ["conditionalOrExpression"], 
	     "VAR1": ["conditionalOrExpression"], 
	     "VAR2": ["conditionalOrExpression"], 
	     "(": ["conditionalOrExpression"], 
	     "STR": ["conditionalOrExpression"], 
	     "LANG": ["conditionalOrExpression"], 
	     "LANGMATCHES": ["conditionalOrExpression"], 
	     "DATATYPE": ["conditionalOrExpression"], 
	     "BOUND": ["conditionalOrExpression"], 
	     "IRI": ["conditionalOrExpression"], 
	     "URI": ["conditionalOrExpression"], 
	     "BNODE": ["conditionalOrExpression"], 
	     "RAND": ["conditionalOrExpression"], 
	     "ABS": ["conditionalOrExpression"], 
	     "CEIL": ["conditionalOrExpression"], 
	     "FLOOR": ["conditionalOrExpression"], 
	     "ROUND": ["conditionalOrExpression"], 
	     "CONCAT": ["conditionalOrExpression"], 
	     "STRLEN": ["conditionalOrExpression"], 
	     "UCASE": ["conditionalOrExpression"], 
	     "LCASE": ["conditionalOrExpression"], 
	     "ENCODE_FOR_URI": ["conditionalOrExpression"], 
	     "CONTAINS": ["conditionalOrExpression"], 
	     "STRSTARTS": ["conditionalOrExpression"], 
	     "STRENDS": ["conditionalOrExpression"], 
	     "STRBEFORE": ["conditionalOrExpression"], 
	     "STRAFTER": ["conditionalOrExpression"], 
	     "YEAR": ["conditionalOrExpression"], 
	     "MONTH": ["conditionalOrExpression"], 
	     "DAY": ["conditionalOrExpression"], 
	     "HOURS": ["conditionalOrExpression"], 
	     "MINUTES": ["conditionalOrExpression"], 
	     "SECONDS": ["conditionalOrExpression"], 
	     "TIMEZONE": ["conditionalOrExpression"], 
	     "TZ": ["conditionalOrExpression"], 
	     "NOW": ["conditionalOrExpression"], 
	     "UUID": ["conditionalOrExpression"], 
	     "STRUUID": ["conditionalOrExpression"], 
	     "MD5": ["conditionalOrExpression"], 
	     "SHA1": ["conditionalOrExpression"], 
	     "SHA256": ["conditionalOrExpression"], 
	     "SHA384": ["conditionalOrExpression"], 
	     "SHA512": ["conditionalOrExpression"], 
	     "COALESCE": ["conditionalOrExpression"], 
	     "IF": ["conditionalOrExpression"], 
	     "STRLANG": ["conditionalOrExpression"], 
	     "STRDT": ["conditionalOrExpression"], 
	     "SAMETERM": ["conditionalOrExpression"], 
	     "ISIRI": ["conditionalOrExpression"], 
	     "ISURI": ["conditionalOrExpression"], 
	     "ISBLANK": ["conditionalOrExpression"], 
	     "ISLITERAL": ["conditionalOrExpression"], 
	     "ISNUMERIC": ["conditionalOrExpression"], 
	     "TRUE": ["conditionalOrExpression"], 
	     "FALSE": ["conditionalOrExpression"], 
	     "COUNT": ["conditionalOrExpression"], 
	     "SUM": ["conditionalOrExpression"], 
	     "MIN": ["conditionalOrExpression"], 
	     "MAX": ["conditionalOrExpression"], 
	     "AVG": ["conditionalOrExpression"], 
	     "SAMPLE": ["conditionalOrExpression"], 
	     "GROUP_CONCAT": ["conditionalOrExpression"], 
	     "SUBSTR": ["conditionalOrExpression"], 
	     "REPLACE": ["conditionalOrExpression"], 
	     "REGEX": ["conditionalOrExpression"], 
	     "EXISTS": ["conditionalOrExpression"], 
	     "NOT": ["conditionalOrExpression"], 
	     "IRI_REF": ["conditionalOrExpression"], 
	     "STRING_LITERAL1": ["conditionalOrExpression"], 
	     "STRING_LITERAL2": ["conditionalOrExpression"], 
	     "STRING_LITERAL_LONG1": ["conditionalOrExpression"], 
	     "STRING_LITERAL_LONG2": ["conditionalOrExpression"], 
	     "INTEGER": ["conditionalOrExpression"], 
	     "DECIMAL": ["conditionalOrExpression"], 
	     "DOUBLE": ["conditionalOrExpression"], 
	     "INTEGER_POSITIVE": ["conditionalOrExpression"], 
	     "DECIMAL_POSITIVE": ["conditionalOrExpression"], 
	     "DOUBLE_POSITIVE": ["conditionalOrExpression"], 
	     "INTEGER_NEGATIVE": ["conditionalOrExpression"], 
	     "DECIMAL_NEGATIVE": ["conditionalOrExpression"], 
	     "DOUBLE_NEGATIVE": ["conditionalOrExpression"], 
	     "PNAME_LN": ["conditionalOrExpression"], 
	     "PNAME_NS": ["conditionalOrExpression"]}, 
	  "expressionList" : {
	     "NIL": ["NIL"], 
	     "(": ["(","expression","*[,,expression]",")"]}, 
	  "filter" : {
	     "FILTER": ["FILTER","constraint"]}, 
	  "functionCall" : {
	     "IRI_REF": ["iriRef","argList"], 
	     "PNAME_LN": ["iriRef","argList"], 
	     "PNAME_NS": ["iriRef","argList"]}, 
	  "graphGraphPattern" : {
	     "GRAPH": ["GRAPH","varOrIRIref","groupGraphPattern"]}, 
	  "graphNode" : {
	     "VAR1": ["varOrTerm"], 
	     "VAR2": ["varOrTerm"], 
	     "NIL": ["varOrTerm"], 
	     "IRI_REF": ["varOrTerm"], 
	     "TRUE": ["varOrTerm"], 
	     "FALSE": ["varOrTerm"], 
	     "BLANK_NODE_LABEL": ["varOrTerm"], 
	     "ANON": ["varOrTerm"], 
	     "PNAME_LN": ["varOrTerm"], 
	     "PNAME_NS": ["varOrTerm"], 
	     "STRING_LITERAL1": ["varOrTerm"], 
	     "STRING_LITERAL2": ["varOrTerm"], 
	     "STRING_LITERAL_LONG1": ["varOrTerm"], 
	     "STRING_LITERAL_LONG2": ["varOrTerm"], 
	     "INTEGER": ["varOrTerm"], 
	     "DECIMAL": ["varOrTerm"], 
	     "DOUBLE": ["varOrTerm"], 
	     "INTEGER_POSITIVE": ["varOrTerm"], 
	     "DECIMAL_POSITIVE": ["varOrTerm"], 
	     "DOUBLE_POSITIVE": ["varOrTerm"], 
	     "INTEGER_NEGATIVE": ["varOrTerm"], 
	     "DECIMAL_NEGATIVE": ["varOrTerm"], 
	     "DOUBLE_NEGATIVE": ["varOrTerm"], 
	     "(": ["triplesNode"], 
	     "[": ["triplesNode"]}, 
	  "graphNodePath" : {
	     "VAR1": ["varOrTerm"], 
	     "VAR2": ["varOrTerm"], 
	     "NIL": ["varOrTerm"], 
	     "IRI_REF": ["varOrTerm"], 
	     "TRUE": ["varOrTerm"], 
	     "FALSE": ["varOrTerm"], 
	     "BLANK_NODE_LABEL": ["varOrTerm"], 
	     "ANON": ["varOrTerm"], 
	     "PNAME_LN": ["varOrTerm"], 
	     "PNAME_NS": ["varOrTerm"], 
	     "STRING_LITERAL1": ["varOrTerm"], 
	     "STRING_LITERAL2": ["varOrTerm"], 
	     "STRING_LITERAL_LONG1": ["varOrTerm"], 
	     "STRING_LITERAL_LONG2": ["varOrTerm"], 
	     "INTEGER": ["varOrTerm"], 
	     "DECIMAL": ["varOrTerm"], 
	     "DOUBLE": ["varOrTerm"], 
	     "INTEGER_POSITIVE": ["varOrTerm"], 
	     "DECIMAL_POSITIVE": ["varOrTerm"], 
	     "DOUBLE_POSITIVE": ["varOrTerm"], 
	     "INTEGER_NEGATIVE": ["varOrTerm"], 
	     "DECIMAL_NEGATIVE": ["varOrTerm"], 
	     "DOUBLE_NEGATIVE": ["varOrTerm"], 
	     "(": ["triplesNodePath"], 
	     "[": ["triplesNodePath"]}, 
	  "graphOrDefault" : {
	     "DEFAULT": ["DEFAULT"], 
	     "IRI_REF": ["?GRAPH","iriRef"], 
	     "PNAME_LN": ["?GRAPH","iriRef"], 
	     "PNAME_NS": ["?GRAPH","iriRef"], 
	     "GRAPH": ["?GRAPH","iriRef"]}, 
	  "graphPatternNotTriples" : {
	     "{": ["groupOrUnionGraphPattern"], 
	     "OPTIONAL": ["optionalGraphPattern"], 
	     "MINUS": ["minusGraphPattern"], 
	     "GRAPH": ["graphGraphPattern"], 
	     "SERVICE": ["serviceGraphPattern"], 
	     "FILTER": ["filter"], 
	     "BIND": ["bind"], 
	     "VALUES": ["inlineData"]}, 
	  "graphRef" : {
	     "GRAPH": ["GRAPH","iriRef"]}, 
	  "graphRefAll" : {
	     "GRAPH": ["graphRef"], 
	     "DEFAULT": ["DEFAULT"], 
	     "NAMED": ["NAMED"], 
	     "ALL": ["ALL"]}, 
	  "graphTerm" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "STRING_LITERAL1": ["rdfLiteral"], 
	     "STRING_LITERAL2": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG1": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG2": ["rdfLiteral"], 
	     "INTEGER": ["numericLiteral"], 
	     "DECIMAL": ["numericLiteral"], 
	     "DOUBLE": ["numericLiteral"], 
	     "INTEGER_POSITIVE": ["numericLiteral"], 
	     "DECIMAL_POSITIVE": ["numericLiteral"], 
	     "DOUBLE_POSITIVE": ["numericLiteral"], 
	     "INTEGER_NEGATIVE": ["numericLiteral"], 
	     "DECIMAL_NEGATIVE": ["numericLiteral"], 
	     "DOUBLE_NEGATIVE": ["numericLiteral"], 
	     "TRUE": ["booleanLiteral"], 
	     "FALSE": ["booleanLiteral"], 
	     "BLANK_NODE_LABEL": ["blankNode"], 
	     "ANON": ["blankNode"], 
	     "NIL": ["NIL"]}, 
	  "groupClause" : {
	     "GROUP": ["GROUP","BY","+groupCondition"]}, 
	  "groupCondition" : {
	     "STR": ["builtInCall"], 
	     "LANG": ["builtInCall"], 
	     "LANGMATCHES": ["builtInCall"], 
	     "DATATYPE": ["builtInCall"], 
	     "BOUND": ["builtInCall"], 
	     "IRI": ["builtInCall"], 
	     "URI": ["builtInCall"], 
	     "BNODE": ["builtInCall"], 
	     "RAND": ["builtInCall"], 
	     "ABS": ["builtInCall"], 
	     "CEIL": ["builtInCall"], 
	     "FLOOR": ["builtInCall"], 
	     "ROUND": ["builtInCall"], 
	     "CONCAT": ["builtInCall"], 
	     "STRLEN": ["builtInCall"], 
	     "UCASE": ["builtInCall"], 
	     "LCASE": ["builtInCall"], 
	     "ENCODE_FOR_URI": ["builtInCall"], 
	     "CONTAINS": ["builtInCall"], 
	     "STRSTARTS": ["builtInCall"], 
	     "STRENDS": ["builtInCall"], 
	     "STRBEFORE": ["builtInCall"], 
	     "STRAFTER": ["builtInCall"], 
	     "YEAR": ["builtInCall"], 
	     "MONTH": ["builtInCall"], 
	     "DAY": ["builtInCall"], 
	     "HOURS": ["builtInCall"], 
	     "MINUTES": ["builtInCall"], 
	     "SECONDS": ["builtInCall"], 
	     "TIMEZONE": ["builtInCall"], 
	     "TZ": ["builtInCall"], 
	     "NOW": ["builtInCall"], 
	     "UUID": ["builtInCall"], 
	     "STRUUID": ["builtInCall"], 
	     "MD5": ["builtInCall"], 
	     "SHA1": ["builtInCall"], 
	     "SHA256": ["builtInCall"], 
	     "SHA384": ["builtInCall"], 
	     "SHA512": ["builtInCall"], 
	     "COALESCE": ["builtInCall"], 
	     "IF": ["builtInCall"], 
	     "STRLANG": ["builtInCall"], 
	     "STRDT": ["builtInCall"], 
	     "SAMETERM": ["builtInCall"], 
	     "ISIRI": ["builtInCall"], 
	     "ISURI": ["builtInCall"], 
	     "ISBLANK": ["builtInCall"], 
	     "ISLITERAL": ["builtInCall"], 
	     "ISNUMERIC": ["builtInCall"], 
	     "SUBSTR": ["builtInCall"], 
	     "REPLACE": ["builtInCall"], 
	     "REGEX": ["builtInCall"], 
	     "EXISTS": ["builtInCall"], 
	     "NOT": ["builtInCall"], 
	     "IRI_REF": ["functionCall"], 
	     "PNAME_LN": ["functionCall"], 
	     "PNAME_NS": ["functionCall"], 
	     "(": ["(","expression","?[AS,var]",")"], 
	     "VAR1": ["var"], 
	     "VAR2": ["var"]}, 
	  "groupGraphPattern" : {
	     "{": ["{","or([subSelect,groupGraphPatternSub])","}"]}, 
	  "groupGraphPatternSub" : {
	     "{": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "OPTIONAL": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "MINUS": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "GRAPH": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "SERVICE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "FILTER": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "BIND": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "VALUES": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "VAR1": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "VAR2": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "NIL": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "(": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "[": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "IRI_REF": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "TRUE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "FALSE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "BLANK_NODE_LABEL": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "ANON": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "PNAME_LN": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "PNAME_NS": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "STRING_LITERAL1": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "STRING_LITERAL2": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "STRING_LITERAL_LONG1": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "STRING_LITERAL_LONG2": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "INTEGER": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DECIMAL": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DOUBLE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "INTEGER_POSITIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DECIMAL_POSITIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DOUBLE_POSITIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "INTEGER_NEGATIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DECIMAL_NEGATIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DOUBLE_NEGATIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "}": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"]}, 
	  "groupOrUnionGraphPattern" : {
	     "{": ["groupGraphPattern","*[UNION,groupGraphPattern]"]}, 
	  "havingClause" : {
	     "HAVING": ["HAVING","+havingCondition"]}, 
	  "havingCondition" : {
	     "(": ["constraint"], 
	     "STR": ["constraint"], 
	     "LANG": ["constraint"], 
	     "LANGMATCHES": ["constraint"], 
	     "DATATYPE": ["constraint"], 
	     "BOUND": ["constraint"], 
	     "IRI": ["constraint"], 
	     "URI": ["constraint"], 
	     "BNODE": ["constraint"], 
	     "RAND": ["constraint"], 
	     "ABS": ["constraint"], 
	     "CEIL": ["constraint"], 
	     "FLOOR": ["constraint"], 
	     "ROUND": ["constraint"], 
	     "CONCAT": ["constraint"], 
	     "STRLEN": ["constraint"], 
	     "UCASE": ["constraint"], 
	     "LCASE": ["constraint"], 
	     "ENCODE_FOR_URI": ["constraint"], 
	     "CONTAINS": ["constraint"], 
	     "STRSTARTS": ["constraint"], 
	     "STRENDS": ["constraint"], 
	     "STRBEFORE": ["constraint"], 
	     "STRAFTER": ["constraint"], 
	     "YEAR": ["constraint"], 
	     "MONTH": ["constraint"], 
	     "DAY": ["constraint"], 
	     "HOURS": ["constraint"], 
	     "MINUTES": ["constraint"], 
	     "SECONDS": ["constraint"], 
	     "TIMEZONE": ["constraint"], 
	     "TZ": ["constraint"], 
	     "NOW": ["constraint"], 
	     "UUID": ["constraint"], 
	     "STRUUID": ["constraint"], 
	     "MD5": ["constraint"], 
	     "SHA1": ["constraint"], 
	     "SHA256": ["constraint"], 
	     "SHA384": ["constraint"], 
	     "SHA512": ["constraint"], 
	     "COALESCE": ["constraint"], 
	     "IF": ["constraint"], 
	     "STRLANG": ["constraint"], 
	     "STRDT": ["constraint"], 
	     "SAMETERM": ["constraint"], 
	     "ISIRI": ["constraint"], 
	     "ISURI": ["constraint"], 
	     "ISBLANK": ["constraint"], 
	     "ISLITERAL": ["constraint"], 
	     "ISNUMERIC": ["constraint"], 
	     "SUBSTR": ["constraint"], 
	     "REPLACE": ["constraint"], 
	     "REGEX": ["constraint"], 
	     "EXISTS": ["constraint"], 
	     "NOT": ["constraint"], 
	     "IRI_REF": ["constraint"], 
	     "PNAME_LN": ["constraint"], 
	     "PNAME_NS": ["constraint"]}, 
	  "inlineData" : {
	     "VALUES": ["VALUES","dataBlock"]}, 
	  "inlineDataFull" : {
	     "NIL": ["or([NIL,[ (,*var,)]])","{","*or([[ (,*dataBlockValue,)],NIL])","}"], 
	     "(": ["or([NIL,[ (,*var,)]])","{","*or([[ (,*dataBlockValue,)],NIL])","}"]}, 
	  "inlineDataOneVar" : {
	     "VAR1": ["var","{","*dataBlockValue","}"], 
	     "VAR2": ["var","{","*dataBlockValue","}"]}, 
	  "insert1" : {
	     "DATA": ["DATA","quadData"], 
	     "{": ["quadPattern","*usingClause","WHERE","groupGraphPattern"]}, 
	  "insertClause" : {
	     "INSERT": ["INSERT","quadPattern"]}, 
	  "integer" : {
	     "INTEGER": ["INTEGER"]}, 
	  "iriRef" : {
	     "IRI_REF": ["IRI_REF"], 
	     "PNAME_LN": ["prefixedName"], 
	     "PNAME_NS": ["prefixedName"]}, 
	  "iriRefOrFunction" : {
	     "IRI_REF": ["iriRef","?argList"], 
	     "PNAME_LN": ["iriRef","?argList"], 
	     "PNAME_NS": ["iriRef","?argList"]}, 
	  "limitClause" : {
	     "LIMIT": ["LIMIT","INTEGER"]}, 
	  "limitOffsetClauses" : {
	     "LIMIT": ["limitClause","?offsetClause"], 
	     "OFFSET": ["offsetClause","?limitClause"]}, 
	  "load" : {
	     "LOAD": ["LOAD","?SILENT_1","iriRef","?[INTO,graphRef]"]}, 
	  "minusGraphPattern" : {
	     "MINUS": ["MINUS","groupGraphPattern"]}, 
	  "modify" : {
	     "WITH": ["WITH","iriRef","or([[deleteClause,?insertClause],insertClause])","*usingClause","WHERE","groupGraphPattern"]}, 
	  "move" : {
	     "MOVE": ["MOVE","?SILENT_4","graphOrDefault","TO","graphOrDefault"]}, 
	  "multiplicativeExpression" : {
	     "!": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "+": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "-": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "VAR1": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "VAR2": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "(": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STR": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "LANG": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "LANGMATCHES": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DATATYPE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "BOUND": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "IRI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "URI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "BNODE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "RAND": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ABS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "CEIL": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "FLOOR": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ROUND": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "CONCAT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRLEN": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "UCASE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "LCASE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ENCODE_FOR_URI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "CONTAINS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRSTARTS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRENDS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRBEFORE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRAFTER": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "YEAR": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MONTH": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DAY": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "HOURS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MINUTES": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SECONDS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "TIMEZONE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "TZ": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "NOW": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "UUID": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRUUID": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MD5": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SHA1": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SHA256": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SHA384": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SHA512": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "COALESCE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "IF": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRLANG": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRDT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SAMETERM": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISIRI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISURI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISBLANK": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISLITERAL": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISNUMERIC": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "TRUE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "FALSE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "COUNT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SUM": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MIN": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MAX": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "AVG": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SAMPLE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "GROUP_CONCAT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SUBSTR": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "REPLACE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "REGEX": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "EXISTS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "NOT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "IRI_REF": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRING_LITERAL1": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRING_LITERAL2": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRING_LITERAL_LONG1": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRING_LITERAL_LONG2": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "INTEGER": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "INTEGER_POSITIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL_POSITIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE_POSITIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "INTEGER_NEGATIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL_NEGATIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE_NEGATIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "PNAME_LN": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "PNAME_NS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"]}, 
	  "namedGraphClause" : {
	     "NAMED": ["NAMED","sourceSelector"]}, 
	  "notExistsFunc" : {
	     "NOT": ["NOT","EXISTS","groupGraphPattern"]}, 
	  "numericExpression" : {
	     "!": ["additiveExpression"], 
	     "+": ["additiveExpression"], 
	     "-": ["additiveExpression"], 
	     "VAR1": ["additiveExpression"], 
	     "VAR2": ["additiveExpression"], 
	     "(": ["additiveExpression"], 
	     "STR": ["additiveExpression"], 
	     "LANG": ["additiveExpression"], 
	     "LANGMATCHES": ["additiveExpression"], 
	     "DATATYPE": ["additiveExpression"], 
	     "BOUND": ["additiveExpression"], 
	     "IRI": ["additiveExpression"], 
	     "URI": ["additiveExpression"], 
	     "BNODE": ["additiveExpression"], 
	     "RAND": ["additiveExpression"], 
	     "ABS": ["additiveExpression"], 
	     "CEIL": ["additiveExpression"], 
	     "FLOOR": ["additiveExpression"], 
	     "ROUND": ["additiveExpression"], 
	     "CONCAT": ["additiveExpression"], 
	     "STRLEN": ["additiveExpression"], 
	     "UCASE": ["additiveExpression"], 
	     "LCASE": ["additiveExpression"], 
	     "ENCODE_FOR_URI": ["additiveExpression"], 
	     "CONTAINS": ["additiveExpression"], 
	     "STRSTARTS": ["additiveExpression"], 
	     "STRENDS": ["additiveExpression"], 
	     "STRBEFORE": ["additiveExpression"], 
	     "STRAFTER": ["additiveExpression"], 
	     "YEAR": ["additiveExpression"], 
	     "MONTH": ["additiveExpression"], 
	     "DAY": ["additiveExpression"], 
	     "HOURS": ["additiveExpression"], 
	     "MINUTES": ["additiveExpression"], 
	     "SECONDS": ["additiveExpression"], 
	     "TIMEZONE": ["additiveExpression"], 
	     "TZ": ["additiveExpression"], 
	     "NOW": ["additiveExpression"], 
	     "UUID": ["additiveExpression"], 
	     "STRUUID": ["additiveExpression"], 
	     "MD5": ["additiveExpression"], 
	     "SHA1": ["additiveExpression"], 
	     "SHA256": ["additiveExpression"], 
	     "SHA384": ["additiveExpression"], 
	     "SHA512": ["additiveExpression"], 
	     "COALESCE": ["additiveExpression"], 
	     "IF": ["additiveExpression"], 
	     "STRLANG": ["additiveExpression"], 
	     "STRDT": ["additiveExpression"], 
	     "SAMETERM": ["additiveExpression"], 
	     "ISIRI": ["additiveExpression"], 
	     "ISURI": ["additiveExpression"], 
	     "ISBLANK": ["additiveExpression"], 
	     "ISLITERAL": ["additiveExpression"], 
	     "ISNUMERIC": ["additiveExpression"], 
	     "TRUE": ["additiveExpression"], 
	     "FALSE": ["additiveExpression"], 
	     "COUNT": ["additiveExpression"], 
	     "SUM": ["additiveExpression"], 
	     "MIN": ["additiveExpression"], 
	     "MAX": ["additiveExpression"], 
	     "AVG": ["additiveExpression"], 
	     "SAMPLE": ["additiveExpression"], 
	     "GROUP_CONCAT": ["additiveExpression"], 
	     "SUBSTR": ["additiveExpression"], 
	     "REPLACE": ["additiveExpression"], 
	     "REGEX": ["additiveExpression"], 
	     "EXISTS": ["additiveExpression"], 
	     "NOT": ["additiveExpression"], 
	     "IRI_REF": ["additiveExpression"], 
	     "STRING_LITERAL1": ["additiveExpression"], 
	     "STRING_LITERAL2": ["additiveExpression"], 
	     "STRING_LITERAL_LONG1": ["additiveExpression"], 
	     "STRING_LITERAL_LONG2": ["additiveExpression"], 
	     "INTEGER": ["additiveExpression"], 
	     "DECIMAL": ["additiveExpression"], 
	     "DOUBLE": ["additiveExpression"], 
	     "INTEGER_POSITIVE": ["additiveExpression"], 
	     "DECIMAL_POSITIVE": ["additiveExpression"], 
	     "DOUBLE_POSITIVE": ["additiveExpression"], 
	     "INTEGER_NEGATIVE": ["additiveExpression"], 
	     "DECIMAL_NEGATIVE": ["additiveExpression"], 
	     "DOUBLE_NEGATIVE": ["additiveExpression"], 
	     "PNAME_LN": ["additiveExpression"], 
	     "PNAME_NS": ["additiveExpression"]}, 
	  "numericLiteral" : {
	     "INTEGER": ["numericLiteralUnsigned"], 
	     "DECIMAL": ["numericLiteralUnsigned"], 
	     "DOUBLE": ["numericLiteralUnsigned"], 
	     "INTEGER_POSITIVE": ["numericLiteralPositive"], 
	     "DECIMAL_POSITIVE": ["numericLiteralPositive"], 
	     "DOUBLE_POSITIVE": ["numericLiteralPositive"], 
	     "INTEGER_NEGATIVE": ["numericLiteralNegative"], 
	     "DECIMAL_NEGATIVE": ["numericLiteralNegative"], 
	     "DOUBLE_NEGATIVE": ["numericLiteralNegative"]}, 
	  "numericLiteralNegative" : {
	     "INTEGER_NEGATIVE": ["INTEGER_NEGATIVE"], 
	     "DECIMAL_NEGATIVE": ["DECIMAL_NEGATIVE"], 
	     "DOUBLE_NEGATIVE": ["DOUBLE_NEGATIVE"]}, 
	  "numericLiteralPositive" : {
	     "INTEGER_POSITIVE": ["INTEGER_POSITIVE"], 
	     "DECIMAL_POSITIVE": ["DECIMAL_POSITIVE"], 
	     "DOUBLE_POSITIVE": ["DOUBLE_POSITIVE"]}, 
	  "numericLiteralUnsigned" : {
	     "INTEGER": ["INTEGER"], 
	     "DECIMAL": ["DECIMAL"], 
	     "DOUBLE": ["DOUBLE"]}, 
	  "object" : {
	     "(": ["graphNode"], 
	     "[": ["graphNode"], 
	     "VAR1": ["graphNode"], 
	     "VAR2": ["graphNode"], 
	     "NIL": ["graphNode"], 
	     "IRI_REF": ["graphNode"], 
	     "TRUE": ["graphNode"], 
	     "FALSE": ["graphNode"], 
	     "BLANK_NODE_LABEL": ["graphNode"], 
	     "ANON": ["graphNode"], 
	     "PNAME_LN": ["graphNode"], 
	     "PNAME_NS": ["graphNode"], 
	     "STRING_LITERAL1": ["graphNode"], 
	     "STRING_LITERAL2": ["graphNode"], 
	     "STRING_LITERAL_LONG1": ["graphNode"], 
	     "STRING_LITERAL_LONG2": ["graphNode"], 
	     "INTEGER": ["graphNode"], 
	     "DECIMAL": ["graphNode"], 
	     "DOUBLE": ["graphNode"], 
	     "INTEGER_POSITIVE": ["graphNode"], 
	     "DECIMAL_POSITIVE": ["graphNode"], 
	     "DOUBLE_POSITIVE": ["graphNode"], 
	     "INTEGER_NEGATIVE": ["graphNode"], 
	     "DECIMAL_NEGATIVE": ["graphNode"], 
	     "DOUBLE_NEGATIVE": ["graphNode"]}, 
	  "objectList" : {
	     "(": ["object","*[,,object]"], 
	     "[": ["object","*[,,object]"], 
	     "VAR1": ["object","*[,,object]"], 
	     "VAR2": ["object","*[,,object]"], 
	     "NIL": ["object","*[,,object]"], 
	     "IRI_REF": ["object","*[,,object]"], 
	     "TRUE": ["object","*[,,object]"], 
	     "FALSE": ["object","*[,,object]"], 
	     "BLANK_NODE_LABEL": ["object","*[,,object]"], 
	     "ANON": ["object","*[,,object]"], 
	     "PNAME_LN": ["object","*[,,object]"], 
	     "PNAME_NS": ["object","*[,,object]"], 
	     "STRING_LITERAL1": ["object","*[,,object]"], 
	     "STRING_LITERAL2": ["object","*[,,object]"], 
	     "STRING_LITERAL_LONG1": ["object","*[,,object]"], 
	     "STRING_LITERAL_LONG2": ["object","*[,,object]"], 
	     "INTEGER": ["object","*[,,object]"], 
	     "DECIMAL": ["object","*[,,object]"], 
	     "DOUBLE": ["object","*[,,object]"], 
	     "INTEGER_POSITIVE": ["object","*[,,object]"], 
	     "DECIMAL_POSITIVE": ["object","*[,,object]"], 
	     "DOUBLE_POSITIVE": ["object","*[,,object]"], 
	     "INTEGER_NEGATIVE": ["object","*[,,object]"], 
	     "DECIMAL_NEGATIVE": ["object","*[,,object]"], 
	     "DOUBLE_NEGATIVE": ["object","*[,,object]"]}, 
	  "objectListPath" : {
	     "(": ["objectPath","*[,,objectPath]"], 
	     "[": ["objectPath","*[,,objectPath]"], 
	     "VAR1": ["objectPath","*[,,objectPath]"], 
	     "VAR2": ["objectPath","*[,,objectPath]"], 
	     "NIL": ["objectPath","*[,,objectPath]"], 
	     "IRI_REF": ["objectPath","*[,,objectPath]"], 
	     "TRUE": ["objectPath","*[,,objectPath]"], 
	     "FALSE": ["objectPath","*[,,objectPath]"], 
	     "BLANK_NODE_LABEL": ["objectPath","*[,,objectPath]"], 
	     "ANON": ["objectPath","*[,,objectPath]"], 
	     "PNAME_LN": ["objectPath","*[,,objectPath]"], 
	     "PNAME_NS": ["objectPath","*[,,objectPath]"], 
	     "STRING_LITERAL1": ["objectPath","*[,,objectPath]"], 
	     "STRING_LITERAL2": ["objectPath","*[,,objectPath]"], 
	     "STRING_LITERAL_LONG1": ["objectPath","*[,,objectPath]"], 
	     "STRING_LITERAL_LONG2": ["objectPath","*[,,objectPath]"], 
	     "INTEGER": ["objectPath","*[,,objectPath]"], 
	     "DECIMAL": ["objectPath","*[,,objectPath]"], 
	     "DOUBLE": ["objectPath","*[,,objectPath]"], 
	     "INTEGER_POSITIVE": ["objectPath","*[,,objectPath]"], 
	     "DECIMAL_POSITIVE": ["objectPath","*[,,objectPath]"], 
	     "DOUBLE_POSITIVE": ["objectPath","*[,,objectPath]"], 
	     "INTEGER_NEGATIVE": ["objectPath","*[,,objectPath]"], 
	     "DECIMAL_NEGATIVE": ["objectPath","*[,,objectPath]"], 
	     "DOUBLE_NEGATIVE": ["objectPath","*[,,objectPath]"]}, 
	  "objectPath" : {
	     "(": ["graphNodePath"], 
	     "[": ["graphNodePath"], 
	     "VAR1": ["graphNodePath"], 
	     "VAR2": ["graphNodePath"], 
	     "NIL": ["graphNodePath"], 
	     "IRI_REF": ["graphNodePath"], 
	     "TRUE": ["graphNodePath"], 
	     "FALSE": ["graphNodePath"], 
	     "BLANK_NODE_LABEL": ["graphNodePath"], 
	     "ANON": ["graphNodePath"], 
	     "PNAME_LN": ["graphNodePath"], 
	     "PNAME_NS": ["graphNodePath"], 
	     "STRING_LITERAL1": ["graphNodePath"], 
	     "STRING_LITERAL2": ["graphNodePath"], 
	     "STRING_LITERAL_LONG1": ["graphNodePath"], 
	     "STRING_LITERAL_LONG2": ["graphNodePath"], 
	     "INTEGER": ["graphNodePath"], 
	     "DECIMAL": ["graphNodePath"], 
	     "DOUBLE": ["graphNodePath"], 
	     "INTEGER_POSITIVE": ["graphNodePath"], 
	     "DECIMAL_POSITIVE": ["graphNodePath"], 
	     "DOUBLE_POSITIVE": ["graphNodePath"], 
	     "INTEGER_NEGATIVE": ["graphNodePath"], 
	     "DECIMAL_NEGATIVE": ["graphNodePath"], 
	     "DOUBLE_NEGATIVE": ["graphNodePath"]}, 
	  "offsetClause" : {
	     "OFFSET": ["OFFSET","INTEGER"]}, 
	  "optionalGraphPattern" : {
	     "OPTIONAL": ["OPTIONAL","groupGraphPattern"]}, 
	  "or([*,expression])" : {
	     "*": ["*"], 
	     "!": ["expression"], 
	     "+": ["expression"], 
	     "-": ["expression"], 
	     "VAR1": ["expression"], 
	     "VAR2": ["expression"], 
	     "(": ["expression"], 
	     "STR": ["expression"], 
	     "LANG": ["expression"], 
	     "LANGMATCHES": ["expression"], 
	     "DATATYPE": ["expression"], 
	     "BOUND": ["expression"], 
	     "IRI": ["expression"], 
	     "URI": ["expression"], 
	     "BNODE": ["expression"], 
	     "RAND": ["expression"], 
	     "ABS": ["expression"], 
	     "CEIL": ["expression"], 
	     "FLOOR": ["expression"], 
	     "ROUND": ["expression"], 
	     "CONCAT": ["expression"], 
	     "STRLEN": ["expression"], 
	     "UCASE": ["expression"], 
	     "LCASE": ["expression"], 
	     "ENCODE_FOR_URI": ["expression"], 
	     "CONTAINS": ["expression"], 
	     "STRSTARTS": ["expression"], 
	     "STRENDS": ["expression"], 
	     "STRBEFORE": ["expression"], 
	     "STRAFTER": ["expression"], 
	     "YEAR": ["expression"], 
	     "MONTH": ["expression"], 
	     "DAY": ["expression"], 
	     "HOURS": ["expression"], 
	     "MINUTES": ["expression"], 
	     "SECONDS": ["expression"], 
	     "TIMEZONE": ["expression"], 
	     "TZ": ["expression"], 
	     "NOW": ["expression"], 
	     "UUID": ["expression"], 
	     "STRUUID": ["expression"], 
	     "MD5": ["expression"], 
	     "SHA1": ["expression"], 
	     "SHA256": ["expression"], 
	     "SHA384": ["expression"], 
	     "SHA512": ["expression"], 
	     "COALESCE": ["expression"], 
	     "IF": ["expression"], 
	     "STRLANG": ["expression"], 
	     "STRDT": ["expression"], 
	     "SAMETERM": ["expression"], 
	     "ISIRI": ["expression"], 
	     "ISURI": ["expression"], 
	     "ISBLANK": ["expression"], 
	     "ISLITERAL": ["expression"], 
	     "ISNUMERIC": ["expression"], 
	     "TRUE": ["expression"], 
	     "FALSE": ["expression"], 
	     "COUNT": ["expression"], 
	     "SUM": ["expression"], 
	     "MIN": ["expression"], 
	     "MAX": ["expression"], 
	     "AVG": ["expression"], 
	     "SAMPLE": ["expression"], 
	     "GROUP_CONCAT": ["expression"], 
	     "SUBSTR": ["expression"], 
	     "REPLACE": ["expression"], 
	     "REGEX": ["expression"], 
	     "EXISTS": ["expression"], 
	     "NOT": ["expression"], 
	     "IRI_REF": ["expression"], 
	     "STRING_LITERAL1": ["expression"], 
	     "STRING_LITERAL2": ["expression"], 
	     "STRING_LITERAL_LONG1": ["expression"], 
	     "STRING_LITERAL_LONG2": ["expression"], 
	     "INTEGER": ["expression"], 
	     "DECIMAL": ["expression"], 
	     "DOUBLE": ["expression"], 
	     "INTEGER_POSITIVE": ["expression"], 
	     "DECIMAL_POSITIVE": ["expression"], 
	     "DOUBLE_POSITIVE": ["expression"], 
	     "INTEGER_NEGATIVE": ["expression"], 
	     "DECIMAL_NEGATIVE": ["expression"], 
	     "DOUBLE_NEGATIVE": ["expression"], 
	     "PNAME_LN": ["expression"], 
	     "PNAME_NS": ["expression"]}, 
	  "or([+or([var,[ (,expression,AS,var,)]]),*])" : {
	     "(": ["+or([var,[ (,expression,AS,var,)]])"], 
	     "VAR1": ["+or([var,[ (,expression,AS,var,)]])"], 
	     "VAR2": ["+or([var,[ (,expression,AS,var,)]])"], 
	     "*": ["*"]}, 
	  "or([+varOrIRIref,*])" : {
	     "VAR1": ["+varOrIRIref"], 
	     "VAR2": ["+varOrIRIref"], 
	     "IRI_REF": ["+varOrIRIref"], 
	     "PNAME_LN": ["+varOrIRIref"], 
	     "PNAME_NS": ["+varOrIRIref"], 
	     "*": ["*"]}, 
	  "or([ASC,DESC])" : {
	     "ASC": ["ASC"], 
	     "DESC": ["DESC"]}, 
	  "or([DISTINCT,REDUCED])" : {
	     "DISTINCT": ["DISTINCT"], 
	     "REDUCED": ["REDUCED"]}, 
	  "or([LANGTAG,[^^,iriRef]])" : {
	     "LANGTAG": ["LANGTAG"], 
	     "^^": ["[^^,iriRef]"]}, 
	  "or([NIL,[ (,*var,)]])" : {
	     "NIL": ["NIL"], 
	     "(": ["[ (,*var,)]"]}, 
	  "or([[ (,*dataBlockValue,)],NIL])" : {
	     "(": ["[ (,*dataBlockValue,)]"], 
	     "NIL": ["NIL"]}, 
	  "or([[ (,expression,)],NIL])" : {
	     "(": ["[ (,expression,)]"], 
	     "NIL": ["NIL"]}, 
	  "or([[*,unaryExpression],[/,unaryExpression]])" : {
	     "*": ["[*,unaryExpression]"], 
	     "/": ["[/,unaryExpression]"]}, 
	  "or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])" : {
	     "+": ["[+,multiplicativeExpression]"], 
	     "-": ["[-,multiplicativeExpression]"], 
	     "INTEGER_POSITIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "DECIMAL_POSITIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "DOUBLE_POSITIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "INTEGER_NEGATIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "DECIMAL_NEGATIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "DOUBLE_NEGATIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"]}, 
	  "or([[,,or([},[integer,}]])],}])" : {
	     ",": ["[,,or([},[integer,}]])]"], 
	     "}": ["}"]}, 
	  "or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])" : {
	     "=": ["[=,numericExpression]"], 
	     "!=": ["[!=,numericExpression]"], 
	     "<": ["[<,numericExpression]"], 
	     ">": ["[>,numericExpression]"], 
	     "<=": ["[<=,numericExpression]"], 
	     ">=": ["[>=,numericExpression]"], 
	     "IN": ["[IN,expressionList]"], 
	     "NOT": ["[NOT,IN,expressionList]"]}, 
	  "or([[constructTemplate,*datasetClause,whereClause,solutionModifier],[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]])" : {
	     "{": ["[constructTemplate,*datasetClause,whereClause,solutionModifier]"], 
	     "WHERE": ["[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]"], 
	     "FROM": ["[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]"]}, 
	  "or([[deleteClause,?insertClause],insertClause])" : {
	     "DELETE": ["[deleteClause,?insertClause]"], 
	     "INSERT": ["insertClause"]}, 
	  "or([[integer,or([[,,or([},[integer,}]])],}])],[,,integer,}]])" : {
	     "INTEGER": ["[integer,or([[,,or([},[integer,}]])],}])]"], 
	     ",": ["[,,integer,}]"]}, 
	  "or([defaultGraphClause,namedGraphClause])" : {
	     "IRI_REF": ["defaultGraphClause"], 
	     "PNAME_LN": ["defaultGraphClause"], 
	     "PNAME_NS": ["defaultGraphClause"], 
	     "NAMED": ["namedGraphClause"]}, 
	  "or([inlineDataOneVar,inlineDataFull])" : {
	     "VAR1": ["inlineDataOneVar"], 
	     "VAR2": ["inlineDataOneVar"], 
	     "NIL": ["inlineDataFull"], 
	     "(": ["inlineDataFull"]}, 
	  "or([iriRef,[NAMED,iriRef]])" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "NAMED": ["[NAMED,iriRef]"]}, 
	  "or([iriRef,a])" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "a": ["a"]}, 
	  "or([numericLiteralPositive,numericLiteralNegative])" : {
	     "INTEGER_POSITIVE": ["numericLiteralPositive"], 
	     "DECIMAL_POSITIVE": ["numericLiteralPositive"], 
	     "DOUBLE_POSITIVE": ["numericLiteralPositive"], 
	     "INTEGER_NEGATIVE": ["numericLiteralNegative"], 
	     "DECIMAL_NEGATIVE": ["numericLiteralNegative"], 
	     "DOUBLE_NEGATIVE": ["numericLiteralNegative"]}, 
	  "or([queryAll,updateAll])" : {
	     "CONSTRUCT": ["queryAll"], 
	     "DESCRIBE": ["queryAll"], 
	     "ASK": ["queryAll"], 
	     "SELECT": ["queryAll"], 
	     "INSERT": ["updateAll"], 
	     "DELETE": ["updateAll"], 
	     "LOAD": ["updateAll"], 
	     "CLEAR": ["updateAll"], 
	     "DROP": ["updateAll"], 
	     "ADD": ["updateAll"], 
	     "MOVE": ["updateAll"], 
	     "COPY": ["updateAll"], 
	     "CREATE": ["updateAll"], 
	     "WITH": ["updateAll"], 
	     "$": ["updateAll"]}, 
	  "or([selectQuery,constructQuery,describeQuery,askQuery])" : {
	     "SELECT": ["selectQuery"], 
	     "CONSTRUCT": ["constructQuery"], 
	     "DESCRIBE": ["describeQuery"], 
	     "ASK": ["askQuery"]}, 
	  "or([subSelect,groupGraphPatternSub])" : {
	     "SELECT": ["subSelect"], 
	     "{": ["groupGraphPatternSub"], 
	     "OPTIONAL": ["groupGraphPatternSub"], 
	     "MINUS": ["groupGraphPatternSub"], 
	     "GRAPH": ["groupGraphPatternSub"], 
	     "SERVICE": ["groupGraphPatternSub"], 
	     "FILTER": ["groupGraphPatternSub"], 
	     "BIND": ["groupGraphPatternSub"], 
	     "VALUES": ["groupGraphPatternSub"], 
	     "VAR1": ["groupGraphPatternSub"], 
	     "VAR2": ["groupGraphPatternSub"], 
	     "NIL": ["groupGraphPatternSub"], 
	     "(": ["groupGraphPatternSub"], 
	     "[": ["groupGraphPatternSub"], 
	     "IRI_REF": ["groupGraphPatternSub"], 
	     "TRUE": ["groupGraphPatternSub"], 
	     "FALSE": ["groupGraphPatternSub"], 
	     "BLANK_NODE_LABEL": ["groupGraphPatternSub"], 
	     "ANON": ["groupGraphPatternSub"], 
	     "PNAME_LN": ["groupGraphPatternSub"], 
	     "PNAME_NS": ["groupGraphPatternSub"], 
	     "STRING_LITERAL1": ["groupGraphPatternSub"], 
	     "STRING_LITERAL2": ["groupGraphPatternSub"], 
	     "STRING_LITERAL_LONG1": ["groupGraphPatternSub"], 
	     "STRING_LITERAL_LONG2": ["groupGraphPatternSub"], 
	     "INTEGER": ["groupGraphPatternSub"], 
	     "DECIMAL": ["groupGraphPatternSub"], 
	     "DOUBLE": ["groupGraphPatternSub"], 
	     "INTEGER_POSITIVE": ["groupGraphPatternSub"], 
	     "DECIMAL_POSITIVE": ["groupGraphPatternSub"], 
	     "DOUBLE_POSITIVE": ["groupGraphPatternSub"], 
	     "INTEGER_NEGATIVE": ["groupGraphPatternSub"], 
	     "DECIMAL_NEGATIVE": ["groupGraphPatternSub"], 
	     "DOUBLE_NEGATIVE": ["groupGraphPatternSub"], 
	     "}": ["groupGraphPatternSub"]}, 
	  "or([var,[ (,expression,AS,var,)]])" : {
	     "VAR1": ["var"], 
	     "VAR2": ["var"], 
	     "(": ["[ (,expression,AS,var,)]"]}, 
	  "or([verbPath,verbSimple])" : {
	     "^": ["verbPath"], 
	     "a": ["verbPath"], 
	     "!": ["verbPath"], 
	     "(": ["verbPath"], 
	     "IRI_REF": ["verbPath"], 
	     "PNAME_LN": ["verbPath"], 
	     "PNAME_NS": ["verbPath"], 
	     "VAR1": ["verbSimple"], 
	     "VAR2": ["verbSimple"]}, 
	  "or([},[integer,}]])" : {
	     "}": ["}"], 
	     "INTEGER": ["[integer,}]"]}, 
	  "orderClause" : {
	     "ORDER": ["ORDER","BY","+orderCondition"]}, 
	  "orderCondition" : {
	     "ASC": ["or([ASC,DESC])","brackettedExpression"], 
	     "DESC": ["or([ASC,DESC])","brackettedExpression"], 
	     "(": ["constraint"], 
	     "STR": ["constraint"], 
	     "LANG": ["constraint"], 
	     "LANGMATCHES": ["constraint"], 
	     "DATATYPE": ["constraint"], 
	     "BOUND": ["constraint"], 
	     "IRI": ["constraint"], 
	     "URI": ["constraint"], 
	     "BNODE": ["constraint"], 
	     "RAND": ["constraint"], 
	     "ABS": ["constraint"], 
	     "CEIL": ["constraint"], 
	     "FLOOR": ["constraint"], 
	     "ROUND": ["constraint"], 
	     "CONCAT": ["constraint"], 
	     "STRLEN": ["constraint"], 
	     "UCASE": ["constraint"], 
	     "LCASE": ["constraint"], 
	     "ENCODE_FOR_URI": ["constraint"], 
	     "CONTAINS": ["constraint"], 
	     "STRSTARTS": ["constraint"], 
	     "STRENDS": ["constraint"], 
	     "STRBEFORE": ["constraint"], 
	     "STRAFTER": ["constraint"], 
	     "YEAR": ["constraint"], 
	     "MONTH": ["constraint"], 
	     "DAY": ["constraint"], 
	     "HOURS": ["constraint"], 
	     "MINUTES": ["constraint"], 
	     "SECONDS": ["constraint"], 
	     "TIMEZONE": ["constraint"], 
	     "TZ": ["constraint"], 
	     "NOW": ["constraint"], 
	     "UUID": ["constraint"], 
	     "STRUUID": ["constraint"], 
	     "MD5": ["constraint"], 
	     "SHA1": ["constraint"], 
	     "SHA256": ["constraint"], 
	     "SHA384": ["constraint"], 
	     "SHA512": ["constraint"], 
	     "COALESCE": ["constraint"], 
	     "IF": ["constraint"], 
	     "STRLANG": ["constraint"], 
	     "STRDT": ["constraint"], 
	     "SAMETERM": ["constraint"], 
	     "ISIRI": ["constraint"], 
	     "ISURI": ["constraint"], 
	     "ISBLANK": ["constraint"], 
	     "ISLITERAL": ["constraint"], 
	     "ISNUMERIC": ["constraint"], 
	     "SUBSTR": ["constraint"], 
	     "REPLACE": ["constraint"], 
	     "REGEX": ["constraint"], 
	     "EXISTS": ["constraint"], 
	     "NOT": ["constraint"], 
	     "IRI_REF": ["constraint"], 
	     "PNAME_LN": ["constraint"], 
	     "PNAME_NS": ["constraint"], 
	     "VAR1": ["var"], 
	     "VAR2": ["var"]}, 
	  "path" : {
	     "^": ["pathAlternative"], 
	     "a": ["pathAlternative"], 
	     "!": ["pathAlternative"], 
	     "(": ["pathAlternative"], 
	     "IRI_REF": ["pathAlternative"], 
	     "PNAME_LN": ["pathAlternative"], 
	     "PNAME_NS": ["pathAlternative"]}, 
	  "pathAlternative" : {
	     "^": ["pathSequence","*[|,pathSequence]"], 
	     "a": ["pathSequence","*[|,pathSequence]"], 
	     "!": ["pathSequence","*[|,pathSequence]"], 
	     "(": ["pathSequence","*[|,pathSequence]"], 
	     "IRI_REF": ["pathSequence","*[|,pathSequence]"], 
	     "PNAME_LN": ["pathSequence","*[|,pathSequence]"], 
	     "PNAME_NS": ["pathSequence","*[|,pathSequence]"]}, 
	  "pathElt" : {
	     "a": ["pathPrimary","?pathMod"], 
	     "!": ["pathPrimary","?pathMod"], 
	     "(": ["pathPrimary","?pathMod"], 
	     "IRI_REF": ["pathPrimary","?pathMod"], 
	     "PNAME_LN": ["pathPrimary","?pathMod"], 
	     "PNAME_NS": ["pathPrimary","?pathMod"]}, 
	  "pathEltOrInverse" : {
	     "a": ["pathElt"], 
	     "!": ["pathElt"], 
	     "(": ["pathElt"], 
	     "IRI_REF": ["pathElt"], 
	     "PNAME_LN": ["pathElt"], 
	     "PNAME_NS": ["pathElt"], 
	     "^": ["^","pathElt"]}, 
	  "pathMod" : {
	     "*": ["*"], 
	     "?": ["?"], 
	     "+": ["+"], 
	     "{": ["{","or([[integer,or([[,,or([},[integer,}]])],}])],[,,integer,}]])"]}, 
	  "pathNegatedPropertySet" : {
	     "a": ["pathOneInPropertySet"], 
	     "^": ["pathOneInPropertySet"], 
	     "IRI_REF": ["pathOneInPropertySet"], 
	     "PNAME_LN": ["pathOneInPropertySet"], 
	     "PNAME_NS": ["pathOneInPropertySet"], 
	     "(": ["(","?[pathOneInPropertySet,*[|,pathOneInPropertySet]]",")"]}, 
	  "pathOneInPropertySet" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "a": ["a"], 
	     "^": ["^","or([iriRef,a])"]}, 
	  "pathPrimary" : {
	     "IRI_REF": ["storeProperty","iriRef"], 
	     "PNAME_LN": ["storeProperty","iriRef"], 
	     "PNAME_NS": ["storeProperty","iriRef"], 
	     "a": ["storeProperty","a"], 
	     "!": ["!","pathNegatedPropertySet"], 
	     "(": ["(","path",")"]}, 
	  "pathSequence" : {
	     "^": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "a": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "!": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "(": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "IRI_REF": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "PNAME_LN": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "PNAME_NS": ["pathEltOrInverse","*[/,pathEltOrInverse]"]}, 
	  "prefixDecl" : {
	     "PREFIX": ["PREFIX","PNAME_NS","IRI_REF"]}, 
	  "prefixedName" : {
	     "PNAME_LN": ["PNAME_LN"], 
	     "PNAME_NS": ["PNAME_NS"]}, 
	  "primaryExpression" : {
	     "(": ["brackettedExpression"], 
	     "STR": ["builtInCall"], 
	     "LANG": ["builtInCall"], 
	     "LANGMATCHES": ["builtInCall"], 
	     "DATATYPE": ["builtInCall"], 
	     "BOUND": ["builtInCall"], 
	     "IRI": ["builtInCall"], 
	     "URI": ["builtInCall"], 
	     "BNODE": ["builtInCall"], 
	     "RAND": ["builtInCall"], 
	     "ABS": ["builtInCall"], 
	     "CEIL": ["builtInCall"], 
	     "FLOOR": ["builtInCall"], 
	     "ROUND": ["builtInCall"], 
	     "CONCAT": ["builtInCall"], 
	     "STRLEN": ["builtInCall"], 
	     "UCASE": ["builtInCall"], 
	     "LCASE": ["builtInCall"], 
	     "ENCODE_FOR_URI": ["builtInCall"], 
	     "CONTAINS": ["builtInCall"], 
	     "STRSTARTS": ["builtInCall"], 
	     "STRENDS": ["builtInCall"], 
	     "STRBEFORE": ["builtInCall"], 
	     "STRAFTER": ["builtInCall"], 
	     "YEAR": ["builtInCall"], 
	     "MONTH": ["builtInCall"], 
	     "DAY": ["builtInCall"], 
	     "HOURS": ["builtInCall"], 
	     "MINUTES": ["builtInCall"], 
	     "SECONDS": ["builtInCall"], 
	     "TIMEZONE": ["builtInCall"], 
	     "TZ": ["builtInCall"], 
	     "NOW": ["builtInCall"], 
	     "UUID": ["builtInCall"], 
	     "STRUUID": ["builtInCall"], 
	     "MD5": ["builtInCall"], 
	     "SHA1": ["builtInCall"], 
	     "SHA256": ["builtInCall"], 
	     "SHA384": ["builtInCall"], 
	     "SHA512": ["builtInCall"], 
	     "COALESCE": ["builtInCall"], 
	     "IF": ["builtInCall"], 
	     "STRLANG": ["builtInCall"], 
	     "STRDT": ["builtInCall"], 
	     "SAMETERM": ["builtInCall"], 
	     "ISIRI": ["builtInCall"], 
	     "ISURI": ["builtInCall"], 
	     "ISBLANK": ["builtInCall"], 
	     "ISLITERAL": ["builtInCall"], 
	     "ISNUMERIC": ["builtInCall"], 
	     "SUBSTR": ["builtInCall"], 
	     "REPLACE": ["builtInCall"], 
	     "REGEX": ["builtInCall"], 
	     "EXISTS": ["builtInCall"], 
	     "NOT": ["builtInCall"], 
	     "IRI_REF": ["iriRefOrFunction"], 
	     "PNAME_LN": ["iriRefOrFunction"], 
	     "PNAME_NS": ["iriRefOrFunction"], 
	     "STRING_LITERAL1": ["rdfLiteral"], 
	     "STRING_LITERAL2": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG1": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG2": ["rdfLiteral"], 
	     "INTEGER": ["numericLiteral"], 
	     "DECIMAL": ["numericLiteral"], 
	     "DOUBLE": ["numericLiteral"], 
	     "INTEGER_POSITIVE": ["numericLiteral"], 
	     "DECIMAL_POSITIVE": ["numericLiteral"], 
	     "DOUBLE_POSITIVE": ["numericLiteral"], 
	     "INTEGER_NEGATIVE": ["numericLiteral"], 
	     "DECIMAL_NEGATIVE": ["numericLiteral"], 
	     "DOUBLE_NEGATIVE": ["numericLiteral"], 
	     "TRUE": ["booleanLiteral"], 
	     "FALSE": ["booleanLiteral"], 
	     "VAR1": ["var"], 
	     "VAR2": ["var"], 
	     "COUNT": ["aggregate"], 
	     "SUM": ["aggregate"], 
	     "MIN": ["aggregate"], 
	     "MAX": ["aggregate"], 
	     "AVG": ["aggregate"], 
	     "SAMPLE": ["aggregate"], 
	     "GROUP_CONCAT": ["aggregate"]}, 
	  "prologue" : {
	     "PREFIX": ["?baseDecl","*prefixDecl"], 
	     "BASE": ["?baseDecl","*prefixDecl"], 
	     "$": ["?baseDecl","*prefixDecl"], 
	     "CONSTRUCT": ["?baseDecl","*prefixDecl"], 
	     "DESCRIBE": ["?baseDecl","*prefixDecl"], 
	     "ASK": ["?baseDecl","*prefixDecl"], 
	     "INSERT": ["?baseDecl","*prefixDecl"], 
	     "DELETE": ["?baseDecl","*prefixDecl"], 
	     "SELECT": ["?baseDecl","*prefixDecl"], 
	     "LOAD": ["?baseDecl","*prefixDecl"], 
	     "CLEAR": ["?baseDecl","*prefixDecl"], 
	     "DROP": ["?baseDecl","*prefixDecl"], 
	     "ADD": ["?baseDecl","*prefixDecl"], 
	     "MOVE": ["?baseDecl","*prefixDecl"], 
	     "COPY": ["?baseDecl","*prefixDecl"], 
	     "CREATE": ["?baseDecl","*prefixDecl"], 
	     "WITH": ["?baseDecl","*prefixDecl"]}, 
	  "propertyList" : {
	     "a": ["propertyListNotEmpty"], 
	     "VAR1": ["propertyListNotEmpty"], 
	     "VAR2": ["propertyListNotEmpty"], 
	     "IRI_REF": ["propertyListNotEmpty"], 
	     "PNAME_LN": ["propertyListNotEmpty"], 
	     "PNAME_NS": ["propertyListNotEmpty"], 
	     ".": [], 
	     "}": [], 
	     "GRAPH": []}, 
	  "propertyListNotEmpty" : {
	     "a": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "VAR1": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "VAR2": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "IRI_REF": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "PNAME_LN": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "PNAME_NS": ["verb","objectList","*[;,?[verb,objectList]]"]}, 
	  "propertyListPath" : {
	     "a": ["propertyListNotEmpty"], 
	     "VAR1": ["propertyListNotEmpty"], 
	     "VAR2": ["propertyListNotEmpty"], 
	     "IRI_REF": ["propertyListNotEmpty"], 
	     "PNAME_LN": ["propertyListNotEmpty"], 
	     "PNAME_NS": ["propertyListNotEmpty"], 
	     ".": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "propertyListPathNotEmpty" : {
	     "VAR1": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "VAR2": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "^": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "a": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "!": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "(": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "IRI_REF": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "PNAME_LN": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "PNAME_NS": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"]}, 
	  "quadData" : {
	     "{": ["{","disallowVars","quads","allowVars","}"]}, 
	  "quadDataNoBnodes" : {
	     "{": ["{","disallowBnodes","disallowVars","quads","allowVars","allowBnodes","}"]}, 
	  "quadPattern" : {
	     "{": ["{","quads","}"]}, 
	  "quadPatternNoBnodes" : {
	     "{": ["{","disallowBnodes","quads","allowBnodes","}"]}, 
	  "quads" : {
	     "GRAPH": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "VAR1": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "VAR2": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "NIL": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "(": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "[": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "IRI_REF": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "TRUE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "FALSE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "BLANK_NODE_LABEL": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "ANON": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "PNAME_LN": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "PNAME_NS": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "STRING_LITERAL1": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "STRING_LITERAL2": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "STRING_LITERAL_LONG1": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "STRING_LITERAL_LONG2": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "INTEGER": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DECIMAL": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DOUBLE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "INTEGER_POSITIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DECIMAL_POSITIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DOUBLE_POSITIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "INTEGER_NEGATIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DECIMAL_NEGATIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DOUBLE_NEGATIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "}": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"]}, 
	  "quadsNotTriples" : {
	     "GRAPH": ["GRAPH","varOrIRIref","{","?triplesTemplate","}"]}, 
	  "queryAll" : {
	     "CONSTRUCT": ["or([selectQuery,constructQuery,describeQuery,askQuery])","valuesClause"], 
	     "DESCRIBE": ["or([selectQuery,constructQuery,describeQuery,askQuery])","valuesClause"], 
	     "ASK": ["or([selectQuery,constructQuery,describeQuery,askQuery])","valuesClause"], 
	     "SELECT": ["or([selectQuery,constructQuery,describeQuery,askQuery])","valuesClause"]}, 
	  "rdfLiteral" : {
	     "STRING_LITERAL1": ["string","?or([LANGTAG,[^^,iriRef]])"], 
	     "STRING_LITERAL2": ["string","?or([LANGTAG,[^^,iriRef]])"], 
	     "STRING_LITERAL_LONG1": ["string","?or([LANGTAG,[^^,iriRef]])"], 
	     "STRING_LITERAL_LONG2": ["string","?or([LANGTAG,[^^,iriRef]])"]}, 
	  "regexExpression" : {
	     "REGEX": ["REGEX","(","expression",",","expression","?[,,expression]",")"]}, 
	  "relationalExpression" : {
	     "!": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "+": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "-": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "VAR1": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "VAR2": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "(": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STR": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "LANG": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "LANGMATCHES": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DATATYPE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "BOUND": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "IRI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "URI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "BNODE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "RAND": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ABS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "CEIL": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "FLOOR": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ROUND": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "CONCAT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRLEN": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "UCASE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "LCASE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ENCODE_FOR_URI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "CONTAINS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRSTARTS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRENDS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRBEFORE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRAFTER": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "YEAR": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MONTH": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DAY": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "HOURS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MINUTES": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SECONDS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "TIMEZONE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "TZ": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "NOW": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "UUID": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRUUID": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MD5": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SHA1": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SHA256": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SHA384": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SHA512": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "COALESCE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "IF": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRLANG": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRDT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SAMETERM": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISIRI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISURI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISBLANK": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISLITERAL": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISNUMERIC": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "TRUE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "FALSE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "COUNT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SUM": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MIN": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MAX": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "AVG": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SAMPLE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "GROUP_CONCAT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SUBSTR": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "REPLACE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "REGEX": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "EXISTS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "NOT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "IRI_REF": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRING_LITERAL1": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRING_LITERAL2": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRING_LITERAL_LONG1": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRING_LITERAL_LONG2": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "INTEGER": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DECIMAL": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DOUBLE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "INTEGER_POSITIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DECIMAL_POSITIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DOUBLE_POSITIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "INTEGER_NEGATIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DECIMAL_NEGATIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DOUBLE_NEGATIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "PNAME_LN": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "PNAME_NS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"]}, 
	  "selectClause" : {
	     "SELECT": ["SELECT","?or([DISTINCT,REDUCED])","or([+or([var,[ (,expression,AS,var,)]]),*])"]}, 
	  "selectQuery" : {
	     "SELECT": ["selectClause","*datasetClause","whereClause","solutionModifier"]}, 
	  "serviceGraphPattern" : {
	     "SERVICE": ["SERVICE","?SILENT","varOrIRIref","groupGraphPattern"]}, 
	  "solutionModifier" : {
	     "LIMIT": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "OFFSET": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "ORDER": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "HAVING": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "GROUP": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "VALUES": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "$": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "}": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"]}, 
	  "sourceSelector" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"]}, 
	  "sparql11" : {
	     "$": ["prologue","or([queryAll,updateAll])","$"], 
	     "CONSTRUCT": ["prologue","or([queryAll,updateAll])","$"], 
	     "DESCRIBE": ["prologue","or([queryAll,updateAll])","$"], 
	     "ASK": ["prologue","or([queryAll,updateAll])","$"], 
	     "INSERT": ["prologue","or([queryAll,updateAll])","$"], 
	     "DELETE": ["prologue","or([queryAll,updateAll])","$"], 
	     "SELECT": ["prologue","or([queryAll,updateAll])","$"], 
	     "LOAD": ["prologue","or([queryAll,updateAll])","$"], 
	     "CLEAR": ["prologue","or([queryAll,updateAll])","$"], 
	     "DROP": ["prologue","or([queryAll,updateAll])","$"], 
	     "ADD": ["prologue","or([queryAll,updateAll])","$"], 
	     "MOVE": ["prologue","or([queryAll,updateAll])","$"], 
	     "COPY": ["prologue","or([queryAll,updateAll])","$"], 
	     "CREATE": ["prologue","or([queryAll,updateAll])","$"], 
	     "WITH": ["prologue","or([queryAll,updateAll])","$"], 
	     "PREFIX": ["prologue","or([queryAll,updateAll])","$"], 
	     "BASE": ["prologue","or([queryAll,updateAll])","$"]}, 
	  "storeProperty" : {
	     "VAR1": [], 
	     "VAR2": [], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "a": []}, 
	  "strReplaceExpression" : {
	     "REPLACE": ["REPLACE","(","expression",",","expression",",","expression","?[,,expression]",")"]}, 
	  "string" : {
	     "STRING_LITERAL1": ["STRING_LITERAL1"], 
	     "STRING_LITERAL2": ["STRING_LITERAL2"], 
	     "STRING_LITERAL_LONG1": ["STRING_LITERAL_LONG1"], 
	     "STRING_LITERAL_LONG2": ["STRING_LITERAL_LONG2"]}, 
	  "subSelect" : {
	     "SELECT": ["selectClause","whereClause","solutionModifier","valuesClause"]}, 
	  "substringExpression" : {
	     "SUBSTR": ["SUBSTR","(","expression",",","expression","?[,,expression]",")"]}, 
	  "triplesBlock" : {
	     "VAR1": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "VAR2": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "NIL": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "(": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "[": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "IRI_REF": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "TRUE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "FALSE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "BLANK_NODE_LABEL": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "ANON": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "PNAME_LN": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "PNAME_NS": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "STRING_LITERAL1": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "STRING_LITERAL2": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "STRING_LITERAL_LONG1": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "STRING_LITERAL_LONG2": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "INTEGER": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DECIMAL": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DOUBLE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "INTEGER_POSITIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DECIMAL_POSITIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DOUBLE_POSITIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "INTEGER_NEGATIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DECIMAL_NEGATIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DOUBLE_NEGATIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"]}, 
	  "triplesNode" : {
	     "(": ["collection"], 
	     "[": ["blankNodePropertyList"]}, 
	  "triplesNodePath" : {
	     "(": ["collectionPath"], 
	     "[": ["blankNodePropertyListPath"]}, 
	  "triplesSameSubject" : {
	     "VAR1": ["varOrTerm","propertyListNotEmpty"], 
	     "VAR2": ["varOrTerm","propertyListNotEmpty"], 
	     "NIL": ["varOrTerm","propertyListNotEmpty"], 
	     "IRI_REF": ["varOrTerm","propertyListNotEmpty"], 
	     "TRUE": ["varOrTerm","propertyListNotEmpty"], 
	     "FALSE": ["varOrTerm","propertyListNotEmpty"], 
	     "BLANK_NODE_LABEL": ["varOrTerm","propertyListNotEmpty"], 
	     "ANON": ["varOrTerm","propertyListNotEmpty"], 
	     "PNAME_LN": ["varOrTerm","propertyListNotEmpty"], 
	     "PNAME_NS": ["varOrTerm","propertyListNotEmpty"], 
	     "STRING_LITERAL1": ["varOrTerm","propertyListNotEmpty"], 
	     "STRING_LITERAL2": ["varOrTerm","propertyListNotEmpty"], 
	     "STRING_LITERAL_LONG1": ["varOrTerm","propertyListNotEmpty"], 
	     "STRING_LITERAL_LONG2": ["varOrTerm","propertyListNotEmpty"], 
	     "INTEGER": ["varOrTerm","propertyListNotEmpty"], 
	     "DECIMAL": ["varOrTerm","propertyListNotEmpty"], 
	     "DOUBLE": ["varOrTerm","propertyListNotEmpty"], 
	     "INTEGER_POSITIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "DECIMAL_POSITIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "DOUBLE_POSITIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "INTEGER_NEGATIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "DECIMAL_NEGATIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "DOUBLE_NEGATIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "(": ["triplesNode","propertyList"], 
	     "[": ["triplesNode","propertyList"]}, 
	  "triplesSameSubjectPath" : {
	     "VAR1": ["varOrTerm","propertyListPathNotEmpty"], 
	     "VAR2": ["varOrTerm","propertyListPathNotEmpty"], 
	     "NIL": ["varOrTerm","propertyListPathNotEmpty"], 
	     "IRI_REF": ["varOrTerm","propertyListPathNotEmpty"], 
	     "TRUE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "FALSE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "BLANK_NODE_LABEL": ["varOrTerm","propertyListPathNotEmpty"], 
	     "ANON": ["varOrTerm","propertyListPathNotEmpty"], 
	     "PNAME_LN": ["varOrTerm","propertyListPathNotEmpty"], 
	     "PNAME_NS": ["varOrTerm","propertyListPathNotEmpty"], 
	     "STRING_LITERAL1": ["varOrTerm","propertyListPathNotEmpty"], 
	     "STRING_LITERAL2": ["varOrTerm","propertyListPathNotEmpty"], 
	     "STRING_LITERAL_LONG1": ["varOrTerm","propertyListPathNotEmpty"], 
	     "STRING_LITERAL_LONG2": ["varOrTerm","propertyListPathNotEmpty"], 
	     "INTEGER": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DECIMAL": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DOUBLE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "INTEGER_POSITIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DECIMAL_POSITIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DOUBLE_POSITIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "INTEGER_NEGATIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DECIMAL_NEGATIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DOUBLE_NEGATIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "(": ["triplesNodePath","propertyListPath"], 
	     "[": ["triplesNodePath","propertyListPath"]}, 
	  "triplesTemplate" : {
	     "VAR1": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "VAR2": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "NIL": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "(": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "[": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "IRI_REF": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "TRUE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "FALSE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "BLANK_NODE_LABEL": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "ANON": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "PNAME_LN": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "PNAME_NS": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "STRING_LITERAL1": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "STRING_LITERAL2": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "STRING_LITERAL_LONG1": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "STRING_LITERAL_LONG2": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "INTEGER": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DECIMAL": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DOUBLE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "INTEGER_POSITIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DECIMAL_POSITIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DOUBLE_POSITIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "INTEGER_NEGATIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DECIMAL_NEGATIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DOUBLE_NEGATIVE": ["triplesSameSubject","?[.,?triplesTemplate]"]}, 
	  "unaryExpression" : {
	     "!": ["!","primaryExpression"], 
	     "+": ["+","primaryExpression"], 
	     "-": ["-","primaryExpression"], 
	     "VAR1": ["primaryExpression"], 
	     "VAR2": ["primaryExpression"], 
	     "(": ["primaryExpression"], 
	     "STR": ["primaryExpression"], 
	     "LANG": ["primaryExpression"], 
	     "LANGMATCHES": ["primaryExpression"], 
	     "DATATYPE": ["primaryExpression"], 
	     "BOUND": ["primaryExpression"], 
	     "IRI": ["primaryExpression"], 
	     "URI": ["primaryExpression"], 
	     "BNODE": ["primaryExpression"], 
	     "RAND": ["primaryExpression"], 
	     "ABS": ["primaryExpression"], 
	     "CEIL": ["primaryExpression"], 
	     "FLOOR": ["primaryExpression"], 
	     "ROUND": ["primaryExpression"], 
	     "CONCAT": ["primaryExpression"], 
	     "STRLEN": ["primaryExpression"], 
	     "UCASE": ["primaryExpression"], 
	     "LCASE": ["primaryExpression"], 
	     "ENCODE_FOR_URI": ["primaryExpression"], 
	     "CONTAINS": ["primaryExpression"], 
	     "STRSTARTS": ["primaryExpression"], 
	     "STRENDS": ["primaryExpression"], 
	     "STRBEFORE": ["primaryExpression"], 
	     "STRAFTER": ["primaryExpression"], 
	     "YEAR": ["primaryExpression"], 
	     "MONTH": ["primaryExpression"], 
	     "DAY": ["primaryExpression"], 
	     "HOURS": ["primaryExpression"], 
	     "MINUTES": ["primaryExpression"], 
	     "SECONDS": ["primaryExpression"], 
	     "TIMEZONE": ["primaryExpression"], 
	     "TZ": ["primaryExpression"], 
	     "NOW": ["primaryExpression"], 
	     "UUID": ["primaryExpression"], 
	     "STRUUID": ["primaryExpression"], 
	     "MD5": ["primaryExpression"], 
	     "SHA1": ["primaryExpression"], 
	     "SHA256": ["primaryExpression"], 
	     "SHA384": ["primaryExpression"], 
	     "SHA512": ["primaryExpression"], 
	     "COALESCE": ["primaryExpression"], 
	     "IF": ["primaryExpression"], 
	     "STRLANG": ["primaryExpression"], 
	     "STRDT": ["primaryExpression"], 
	     "SAMETERM": ["primaryExpression"], 
	     "ISIRI": ["primaryExpression"], 
	     "ISURI": ["primaryExpression"], 
	     "ISBLANK": ["primaryExpression"], 
	     "ISLITERAL": ["primaryExpression"], 
	     "ISNUMERIC": ["primaryExpression"], 
	     "TRUE": ["primaryExpression"], 
	     "FALSE": ["primaryExpression"], 
	     "COUNT": ["primaryExpression"], 
	     "SUM": ["primaryExpression"], 
	     "MIN": ["primaryExpression"], 
	     "MAX": ["primaryExpression"], 
	     "AVG": ["primaryExpression"], 
	     "SAMPLE": ["primaryExpression"], 
	     "GROUP_CONCAT": ["primaryExpression"], 
	     "SUBSTR": ["primaryExpression"], 
	     "REPLACE": ["primaryExpression"], 
	     "REGEX": ["primaryExpression"], 
	     "EXISTS": ["primaryExpression"], 
	     "NOT": ["primaryExpression"], 
	     "IRI_REF": ["primaryExpression"], 
	     "STRING_LITERAL1": ["primaryExpression"], 
	     "STRING_LITERAL2": ["primaryExpression"], 
	     "STRING_LITERAL_LONG1": ["primaryExpression"], 
	     "STRING_LITERAL_LONG2": ["primaryExpression"], 
	     "INTEGER": ["primaryExpression"], 
	     "DECIMAL": ["primaryExpression"], 
	     "DOUBLE": ["primaryExpression"], 
	     "INTEGER_POSITIVE": ["primaryExpression"], 
	     "DECIMAL_POSITIVE": ["primaryExpression"], 
	     "DOUBLE_POSITIVE": ["primaryExpression"], 
	     "INTEGER_NEGATIVE": ["primaryExpression"], 
	     "DECIMAL_NEGATIVE": ["primaryExpression"], 
	     "DOUBLE_NEGATIVE": ["primaryExpression"], 
	     "PNAME_LN": ["primaryExpression"], 
	     "PNAME_NS": ["primaryExpression"]}, 
	  "update" : {
	     "INSERT": ["prologue","?[update1,?[;,update]]"], 
	     "DELETE": ["prologue","?[update1,?[;,update]]"], 
	     "LOAD": ["prologue","?[update1,?[;,update]]"], 
	     "CLEAR": ["prologue","?[update1,?[;,update]]"], 
	     "DROP": ["prologue","?[update1,?[;,update]]"], 
	     "ADD": ["prologue","?[update1,?[;,update]]"], 
	     "MOVE": ["prologue","?[update1,?[;,update]]"], 
	     "COPY": ["prologue","?[update1,?[;,update]]"], 
	     "CREATE": ["prologue","?[update1,?[;,update]]"], 
	     "WITH": ["prologue","?[update1,?[;,update]]"], 
	     "PREFIX": ["prologue","?[update1,?[;,update]]"], 
	     "BASE": ["prologue","?[update1,?[;,update]]"], 
	     "$": ["prologue","?[update1,?[;,update]]"]}, 
	  "update1" : {
	     "LOAD": ["load"], 
	     "CLEAR": ["clear"], 
	     "DROP": ["drop"], 
	     "ADD": ["add"], 
	     "MOVE": ["move"], 
	     "COPY": ["copy"], 
	     "CREATE": ["create"], 
	     "INSERT": ["INSERT","insert1"], 
	     "DELETE": ["DELETE","delete1"], 
	     "WITH": ["modify"]}, 
	  "updateAll" : {
	     "INSERT": ["?[update1,?[;,update]]"], 
	     "DELETE": ["?[update1,?[;,update]]"], 
	     "LOAD": ["?[update1,?[;,update]]"], 
	     "CLEAR": ["?[update1,?[;,update]]"], 
	     "DROP": ["?[update1,?[;,update]]"], 
	     "ADD": ["?[update1,?[;,update]]"], 
	     "MOVE": ["?[update1,?[;,update]]"], 
	     "COPY": ["?[update1,?[;,update]]"], 
	     "CREATE": ["?[update1,?[;,update]]"], 
	     "WITH": ["?[update1,?[;,update]]"], 
	     "$": ["?[update1,?[;,update]]"]}, 
	  "usingClause" : {
	     "USING": ["USING","or([iriRef,[NAMED,iriRef]])"]}, 
	  "valueLogical" : {
	     "!": ["relationalExpression"], 
	     "+": ["relationalExpression"], 
	     "-": ["relationalExpression"], 
	     "VAR1": ["relationalExpression"], 
	     "VAR2": ["relationalExpression"], 
	     "(": ["relationalExpression"], 
	     "STR": ["relationalExpression"], 
	     "LANG": ["relationalExpression"], 
	     "LANGMATCHES": ["relationalExpression"], 
	     "DATATYPE": ["relationalExpression"], 
	     "BOUND": ["relationalExpression"], 
	     "IRI": ["relationalExpression"], 
	     "URI": ["relationalExpression"], 
	     "BNODE": ["relationalExpression"], 
	     "RAND": ["relationalExpression"], 
	     "ABS": ["relationalExpression"], 
	     "CEIL": ["relationalExpression"], 
	     "FLOOR": ["relationalExpression"], 
	     "ROUND": ["relationalExpression"], 
	     "CONCAT": ["relationalExpression"], 
	     "STRLEN": ["relationalExpression"], 
	     "UCASE": ["relationalExpression"], 
	     "LCASE": ["relationalExpression"], 
	     "ENCODE_FOR_URI": ["relationalExpression"], 
	     "CONTAINS": ["relationalExpression"], 
	     "STRSTARTS": ["relationalExpression"], 
	     "STRENDS": ["relationalExpression"], 
	     "STRBEFORE": ["relationalExpression"], 
	     "STRAFTER": ["relationalExpression"], 
	     "YEAR": ["relationalExpression"], 
	     "MONTH": ["relationalExpression"], 
	     "DAY": ["relationalExpression"], 
	     "HOURS": ["relationalExpression"], 
	     "MINUTES": ["relationalExpression"], 
	     "SECONDS": ["relationalExpression"], 
	     "TIMEZONE": ["relationalExpression"], 
	     "TZ": ["relationalExpression"], 
	     "NOW": ["relationalExpression"], 
	     "UUID": ["relationalExpression"], 
	     "STRUUID": ["relationalExpression"], 
	     "MD5": ["relationalExpression"], 
	     "SHA1": ["relationalExpression"], 
	     "SHA256": ["relationalExpression"], 
	     "SHA384": ["relationalExpression"], 
	     "SHA512": ["relationalExpression"], 
	     "COALESCE": ["relationalExpression"], 
	     "IF": ["relationalExpression"], 
	     "STRLANG": ["relationalExpression"], 
	     "STRDT": ["relationalExpression"], 
	     "SAMETERM": ["relationalExpression"], 
	     "ISIRI": ["relationalExpression"], 
	     "ISURI": ["relationalExpression"], 
	     "ISBLANK": ["relationalExpression"], 
	     "ISLITERAL": ["relationalExpression"], 
	     "ISNUMERIC": ["relationalExpression"], 
	     "TRUE": ["relationalExpression"], 
	     "FALSE": ["relationalExpression"], 
	     "COUNT": ["relationalExpression"], 
	     "SUM": ["relationalExpression"], 
	     "MIN": ["relationalExpression"], 
	     "MAX": ["relationalExpression"], 
	     "AVG": ["relationalExpression"], 
	     "SAMPLE": ["relationalExpression"], 
	     "GROUP_CONCAT": ["relationalExpression"], 
	     "SUBSTR": ["relationalExpression"], 
	     "REPLACE": ["relationalExpression"], 
	     "REGEX": ["relationalExpression"], 
	     "EXISTS": ["relationalExpression"], 
	     "NOT": ["relationalExpression"], 
	     "IRI_REF": ["relationalExpression"], 
	     "STRING_LITERAL1": ["relationalExpression"], 
	     "STRING_LITERAL2": ["relationalExpression"], 
	     "STRING_LITERAL_LONG1": ["relationalExpression"], 
	     "STRING_LITERAL_LONG2": ["relationalExpression"], 
	     "INTEGER": ["relationalExpression"], 
	     "DECIMAL": ["relationalExpression"], 
	     "DOUBLE": ["relationalExpression"], 
	     "INTEGER_POSITIVE": ["relationalExpression"], 
	     "DECIMAL_POSITIVE": ["relationalExpression"], 
	     "DOUBLE_POSITIVE": ["relationalExpression"], 
	     "INTEGER_NEGATIVE": ["relationalExpression"], 
	     "DECIMAL_NEGATIVE": ["relationalExpression"], 
	     "DOUBLE_NEGATIVE": ["relationalExpression"], 
	     "PNAME_LN": ["relationalExpression"], 
	     "PNAME_NS": ["relationalExpression"]}, 
	  "valuesClause" : {
	     "VALUES": ["VALUES","dataBlock"], 
	     "$": [], 
	     "}": []}, 
	  "var" : {
	     "VAR1": ["VAR1"], 
	     "VAR2": ["VAR2"]}, 
	  "varOrIRIref" : {
	     "VAR1": ["var"], 
	     "VAR2": ["var"], 
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"]}, 
	  "varOrTerm" : {
	     "VAR1": ["var"], 
	     "VAR2": ["var"], 
	     "NIL": ["graphTerm"], 
	     "IRI_REF": ["graphTerm"], 
	     "TRUE": ["graphTerm"], 
	     "FALSE": ["graphTerm"], 
	     "BLANK_NODE_LABEL": ["graphTerm"], 
	     "ANON": ["graphTerm"], 
	     "PNAME_LN": ["graphTerm"], 
	     "PNAME_NS": ["graphTerm"], 
	     "STRING_LITERAL1": ["graphTerm"], 
	     "STRING_LITERAL2": ["graphTerm"], 
	     "STRING_LITERAL_LONG1": ["graphTerm"], 
	     "STRING_LITERAL_LONG2": ["graphTerm"], 
	     "INTEGER": ["graphTerm"], 
	     "DECIMAL": ["graphTerm"], 
	     "DOUBLE": ["graphTerm"], 
	     "INTEGER_POSITIVE": ["graphTerm"], 
	     "DECIMAL_POSITIVE": ["graphTerm"], 
	     "DOUBLE_POSITIVE": ["graphTerm"], 
	     "INTEGER_NEGATIVE": ["graphTerm"], 
	     "DECIMAL_NEGATIVE": ["graphTerm"], 
	     "DOUBLE_NEGATIVE": ["graphTerm"]}, 
	  "verb" : {
	     "VAR1": ["storeProperty","varOrIRIref"], 
	     "VAR2": ["storeProperty","varOrIRIref"], 
	     "IRI_REF": ["storeProperty","varOrIRIref"], 
	     "PNAME_LN": ["storeProperty","varOrIRIref"], 
	     "PNAME_NS": ["storeProperty","varOrIRIref"], 
	     "a": ["storeProperty","a"]}, 
	  "verbPath" : {
	     "^": ["path"], 
	     "a": ["path"], 
	     "!": ["path"], 
	     "(": ["path"], 
	     "IRI_REF": ["path"], 
	     "PNAME_LN": ["path"], 
	     "PNAME_NS": ["path"]}, 
	  "verbSimple" : {
	     "VAR1": ["var"], 
	     "VAR2": ["var"]}, 
	  "whereClause" : {
	     "{": ["?WHERE","groupGraphPattern"], 
	     "WHERE": ["?WHERE","groupGraphPattern"]}
	};
	
	var keywords=/^(GROUP_CONCAT|DATATYPE|BASE|PREFIX|SELECT|CONSTRUCT|DESCRIBE|ASK|FROM|NAMED|ORDER|BY|LIMIT|ASC|DESC|OFFSET|DISTINCT|REDUCED|WHERE|GRAPH|OPTIONAL|UNION|FILTER|GROUP|HAVING|AS|VALUES|LOAD|CLEAR|DROP|CREATE|MOVE|COPY|SILENT|INSERT|DELETE|DATA|WITH|TO|USING|NAMED|MINUS|BIND|LANGMATCHES|LANG|BOUND|SAMETERM|ISIRI|ISURI|ISBLANK|ISLITERAL|REGEX|TRUE|FALSE|UNDEF|ADD|DEFAULT|ALL|SERVICE|INTO|IN|NOT|IRI|URI|BNODE|RAND|ABS|CEIL|FLOOR|ROUND|CONCAT|STRLEN|UCASE|LCASE|ENCODE_FOR_URI|CONTAINS|STRSTARTS|STRENDS|STRBEFORE|STRAFTER|YEAR|MONTH|DAY|HOURS|MINUTES|SECONDS|TIMEZONE|TZ|NOW|UUID|STRUUID|MD5|SHA1|SHA256|SHA384|SHA512|COALESCE|IF|STRLANG|STRDT|ISNUMERIC|SUBSTR|REPLACE|EXISTS|COUNT|SUM|MIN|MAX|AVG|SAMPLE|SEPARATOR|STR)/i ;
	
	var punct=/^(\*|a|\.|\{|\}|,|\(|\)|;|\[|\]|\|\||&&|=|!=|!|<=|>=|<|>|\+|-|\/|\^\^|\?|\||\^)/ ;
	
	var defaultQueryType=null;
	var lexVersion="sparql11";
	var startSymbol="sparql11";
	var acceptEmpty=true;
	
		function getTerminals()
		{
			var IRI_REF = '<[^<>\"\'\|\{\}\^\\\x00-\x20]*>';
			/*
			 * PN_CHARS_BASE =
			 * '[A-Z]|[a-z]|[\\u00C0-\\u00D6]|[\\u00D8-\\u00F6]|[\\u00F8-\\u02FF]|[\\u0370-\\u037D]|[\\u037F-\\u1FFF]|[\\u200C-\\u200D]|[\\u2070-\\u218F]|[\\u2C00-\\u2FEF]|[\\u3001-\\uD7FF]|[\\uF900-\\uFDCF]|[\\uFDF0-\\uFFFD]|[\\u10000-\\uEFFFF]';
			 */
	
			var PN_CHARS_BASE =
				'[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]';
			var PN_CHARS_U = PN_CHARS_BASE+'|_';
	
			var PN_CHARS= '('+PN_CHARS_U+'|-|[0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040])';
			var VARNAME = '('+PN_CHARS_U+'|[0-9])'+
				'('+PN_CHARS_U+'|[0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040])*';
			var VAR1 = '\\?'+VARNAME;
			var VAR2 = '\\$'+VARNAME;
	
			var PN_PREFIX= '('+PN_CHARS_BASE+')((('+PN_CHARS+')|\\.)*('+PN_CHARS+'))?';
	
			var HEX= '[0-9A-Fa-f]';
			var PERCENT='(%'+HEX+HEX+')';
			var PN_LOCAL_ESC='(\\\\[_~\\.\\-!\\$&\'\\(\\)\\*\\+,;=/\\?#@%])';
			var PLX= '('+PERCENT+'|'+PN_LOCAL_ESC+')';
			var PN_LOCAL;
			var BLANK_NODE_LABEL;
			if (lexVersion=="sparql11") {
				PN_LOCAL= '('+PN_CHARS_U+'|:|[0-9]|'+PLX+')(('+PN_CHARS+'|\\.|:|'+PLX+')*('+PN_CHARS+'|:|'+PLX+'))?';
				BLANK_NODE_LABEL = '_:('+PN_CHARS_U+'|[0-9])(('+PN_CHARS+'|\\.)*'+PN_CHARS+')?';
			} else {
				PN_LOCAL= '('+PN_CHARS_U+'|[0-9])((('+PN_CHARS+')|\\.)*('+PN_CHARS+'))?';
				BLANK_NODE_LABEL = '_:'+PN_LOCAL;
			}
			var PNAME_NS = '('+PN_PREFIX+')?:';
			var PNAME_LN = PNAME_NS+PN_LOCAL;
			var LANGTAG = '@[a-zA-Z]+(-[a-zA-Z0-9]+)*';
	
			var EXPONENT = '[eE][\\+-]?[0-9]+';
			var INTEGER = '[0-9]+';
			var DECIMAL = '(([0-9]+\\.[0-9]*)|(\\.[0-9]+))';
			var DOUBLE =
				'(([0-9]+\\.[0-9]*'+EXPONENT+')|'+
				'(\\.[0-9]+'+EXPONENT+')|'+
				'([0-9]+'+EXPONENT+'))';
	
			var INTEGER_POSITIVE = '\\+' + INTEGER;
			var DECIMAL_POSITIVE = '\\+' + DECIMAL;
			var DOUBLE_POSITIVE  = '\\+' + DOUBLE;
			var INTEGER_NEGATIVE = '-' + INTEGER;
			var DECIMAL_NEGATIVE = '-' + DECIMAL;
			var DOUBLE_NEGATIVE  = '-' + DOUBLE;
	
			// var ECHAR = '\\\\[tbnrf\\"\\\']';
			var ECHAR = '\\\\[tbnrf\\\\"\']';
	
			var STRING_LITERAL1 = "'(([^\\x27\\x5C\\x0A\\x0D])|"+ECHAR+")*'";
			var STRING_LITERAL2 = '"(([^\\x22\\x5C\\x0A\\x0D])|'+ECHAR+')*"';
	
			var STRING_LITERAL_LONG1 = "'''(('|'')?([^'\\\\]|"+ECHAR+"))*'''";
			var STRING_LITERAL_LONG2 = '"""(("|"")?([^"\\\\]|'+ECHAR+'))*"""';
	
			var WS    =        '[\\x20\\x09\\x0D\\x0A]';
			// Careful! Code mirror feeds one line at a time with no \n
			// ... but otherwise comment is terminated by \n
			var COMMENT = '#([^\\n\\r]*[\\n\\r]|[^\\n\\r]*$)';
			var WS_OR_COMMENT_STAR = '('+WS+'|('+COMMENT+'))*';
			var NIL   = '\\('+WS_OR_COMMENT_STAR+'\\)';
			var ANON  = '\\['+WS_OR_COMMENT_STAR+'\\]';
	
			var terminals=
				{
					terminal: [
	
						{ name: "WS",
							regex:new RegExp("^"+WS+"+"),
							style:"ws" },
	
						{ name: "COMMENT",
							regex:new RegExp("^"+COMMENT),
							style:"comment" },
	
						{ name: "IRI_REF",
							regex:new RegExp("^"+IRI_REF),
							style:"variable-3" },
	
						{ name: "VAR1",
							regex:new RegExp("^"+VAR1),
							style:"atom"},
	
						{ name: "VAR2",
							regex:new RegExp("^"+VAR2),
							style:"atom"},
	
						{ name: "LANGTAG",
							regex:new RegExp("^"+LANGTAG),
							style:"meta"},
	
						{ name: "DOUBLE",
							regex:new RegExp("^"+DOUBLE),
							style:"number" },
	
						{ name: "DECIMAL",
							regex:new RegExp("^"+DECIMAL),
							style:"number" },
	
						{ name: "INTEGER",
							regex:new RegExp("^"+INTEGER),
							style:"number" },
	
						{ name: "DOUBLE_POSITIVE",
							regex:new RegExp("^"+DOUBLE_POSITIVE),
							style:"number" },
	
						{ name: "DECIMAL_POSITIVE",
							regex:new RegExp("^"+DECIMAL_POSITIVE),
							style:"number" },
	
						{ name: "INTEGER_POSITIVE",
							regex:new RegExp("^"+INTEGER_POSITIVE),
							style:"number" },
	
						{ name: "DOUBLE_NEGATIVE",
							regex:new RegExp("^"+DOUBLE_NEGATIVE),
							style:"number" },
	
						{ name: "DECIMAL_NEGATIVE",
							regex:new RegExp("^"+DECIMAL_NEGATIVE),
							style:"number" },
	
						{ name: "INTEGER_NEGATIVE",
							regex:new RegExp("^"+INTEGER_NEGATIVE),
							style:"number" },
	
						{ name: "STRING_LITERAL_LONG1",
							regex:new RegExp("^"+STRING_LITERAL_LONG1),
							style:"string" },
	
						{ name: "STRING_LITERAL_LONG2",
							regex:new RegExp("^"+STRING_LITERAL_LONG2),
							style:"string" },
	
						{ name: "STRING_LITERAL1",
							regex:new RegExp("^"+STRING_LITERAL1),
							style:"string" },
	
						{ name: "STRING_LITERAL2",
							regex:new RegExp("^"+STRING_LITERAL2),
							style:"string" },
	
						// Enclosed comments won't be highlighted
						{ name: "NIL",
							regex:new RegExp("^"+NIL),
							style:"punc" },
	
						// Enclosed comments won't be highlighted
						{ name: "ANON",
							regex:new RegExp("^"+ANON),
							style:"punc" },
	
						{ name: "PNAME_LN",
							regex:new RegExp("^"+PNAME_LN),
							style:"string-2" },
	
						{ name: "PNAME_NS",
							regex:new RegExp("^"+PNAME_NS),
							style:"string-2" },
	
						{ name: "BLANK_NODE_LABEL",
							regex:new RegExp("^"+BLANK_NODE_LABEL),
							style:"string-2" }
					],
	
				};
			return terminals;
		}
	
		function getPossibles(symbol)
		{
			var possibles=[], possiblesOb=ll1_table[symbol];
			if (possiblesOb!=undefined)
				for (var property in possiblesOb)
					possibles.push(property.toString());
			else
				possibles.push(symbol);
			return possibles;
		}
	
		var tms= getTerminals();
		var terminal=tms.terminal;
	
		function tokenBase(stream, state) {
	
			function nextToken() {
	
				var consumed=null;
				// Tokens defined by individual regular expressions
				for (var i=0; i<terminal.length; ++i) {
					consumed= stream.match(terminal[i].regex,true,false);
					if (consumed)
						return { cat: terminal[i].name,
										 style: terminal[i].style,
										 text: consumed[0]
									 };
				}
	
				// Keywords
				consumed= stream.match(keywords,true,false);
				if (consumed)
					return { cat: stream.current().toUpperCase(),
									 style: "keyword",
									 text: consumed[0]
								 };
	
				// Punctuation
				consumed= stream.match(punct,true,false);
				if (consumed)
					return { cat: stream.current(),
									 style: "punc",
									 text: consumed[0]
								 };
	
				// Token is invalid
				// better consume something anyway, or else we're stuck
				consumed= stream.match(/^.[A-Za-z0-9]*/,true,false);
				return { cat:"<invalid_token>",
								 style: "error",
								 text: consumed[0]
							 };
			}
	
			function recordFailurePos() {
				// tokenOb.style= "sp-invalid";
				var col= stream.column();
				state.errorStartPos= col;
				state.errorEndPos= col+tokenOb.text.length;
			};
	
			function setQueryType(s) {
				if (state.queryType==null) {
					if (s =="SELECT" || s=="CONSTRUCT" || s=="ASK" || s=="DESCRIBE" || s=="INSERT" || s=="DELETE" || s=="LOAD" || s=="CLEAR" || s=="CREATE" || s=="DROP" || s=="COPY" || s=="MOVE" || s=="ADD")
						state.queryType=s;
				}
			}
	
			// Some fake non-terminals are just there to have side-effect on state
			// - i.e. allow or disallow variables and bnodes in certain non-nesting
			// contexts
			function setSideConditions(topSymbol) {
				if (topSymbol=="disallowVars") state.allowVars=false;
				else if (topSymbol=="allowVars") state.allowVars=true;
				else if (topSymbol=="disallowBnodes") state.allowBnodes=false;
				else if (topSymbol=="allowBnodes") state.allowBnodes=true;
				else if (topSymbol=="storeProperty") state.storeProperty=true;
			}
	
			function checkSideConditions(topSymbol) {
				return(
					(state.allowVars || topSymbol!="var") &&
						(state.allowBnodes ||
						 (topSymbol!="blankNode" &&
							topSymbol!="blankNodePropertyList" &&
							topSymbol!="blankNodePropertyListPath")));
			}
	
			// CodeMirror works with one line at a time,
			// but newline should behave like whitespace
			// - i.e. a definite break between tokens (for autocompleter)
			if (stream.pos==0)
				state.possibleCurrent= state.possibleNext;
	
			var tokenOb= nextToken();
	
	
			if (tokenOb.cat=="<invalid_token>") {
				// set error state, and
				if (state.OK==true) {
					state.OK=false;
					recordFailurePos();
				}
				state.complete=false;
				// alert("Invalid:"+tokenOb.text);
				return tokenOb.style;
			}
	
			if (tokenOb.cat == "WS" ||
					tokenOb.cat == "COMMENT") {
				state.possibleCurrent= state.possibleNext;
				return(tokenOb.style);
			}
			// Otherwise, run the parser until the token is digested
			// or failure
			var finished= false;
			var topSymbol;
			var token= tokenOb.cat;
	
			// Incremental LL1 parse
			while(state.stack.length>0 && token && state.OK && !finished ) {
				topSymbol= state.stack.pop();
	
				if (!ll1_table[topSymbol]) {
					// Top symbol is a terminal
					if (topSymbol==token) {
						// Matching terminals
						// - consume token from input stream
						finished=true;
						setQueryType(topSymbol);
						// Check whether $ (end of input token) is poss next
						// for everything on stack
						var allNillable=true;
						for(var sp=state.stack.length;sp>0;--sp) {
							var item=ll1_table[state.stack[sp-1]];
							if (!item || !item["$"])
								allNillable=false;
						}
						state.complete= allNillable;
						if (state.storeProperty && token.cat!="punc") {
								state.lastProperty= tokenOb.text;
								state.storeProperty= false;
							}
					} else {
						state.OK=false;
						state.complete=false;
						recordFailurePos();
					}
				} else {
					// topSymbol is nonterminal
					// - see if there is an entry for topSymbol
					// and nextToken in table
					var nextSymbols= ll1_table[topSymbol][token];
					if (nextSymbols!=undefined
							&& checkSideConditions(topSymbol)
						 )
					{
						// Match - copy RHS of rule to stack
						for (var i=nextSymbols.length-1; i>=0; --i)
							state.stack.push(nextSymbols[i]);
						// Peform any non-grammatical side-effects
						setSideConditions(topSymbol);
					} else {
						// No match in table - fail
						state.OK=false;
						state.complete=false;
						recordFailurePos();
						state.stack.push(topSymbol);  // Shove topSymbol back on stack
					}
				}
			}
			if (!finished && state.OK) { 
				state.OK=false; state.complete=false; recordFailurePos(); 
	    }
	
			state.possibleCurrent= state.possibleNext;
			state.possibleNext= getPossibles(state.stack[state.stack.length-1]);
	
			// alert(token+"="+tokenOb.style+'\n'+state.stack);
			return tokenOb.style;
		}
	
		var indentTop={
			"*[,, object]": 3,
			"*[(,),object]": 3,
			"*[(,),objectPath]": 3,
			"*[/,pathEltOrInverse]": 2,
			"object": 2,
			"objectPath": 2,
			"objectList": 2,
			"objectListPath": 2,
			"storeProperty": 2,
			"pathMod": 2,
			"?pathMod": 2,
			"propertyListNotEmpty": 1,
			"propertyList": 1,
			"propertyListPath": 1,
			"propertyListPathNotEmpty": 1,
			"?[verb,objectList]": 1,
			"?[or([verbPath, verbSimple]),objectList]": 1,
		};
	
		var indentTable={
			"}":1,
			"]":0,
			")":1,
			"{":-1,
			"(":-1,
			"*[;,?[or([verbPath,verbSimple]),objectList]]": 1,
		};
		
	
		function indent(state, textAfter) {
			var n = 0; // indent level
			var i=state.stack.length-1;
	
			if (/^[\}\]\)]/.test(textAfter)) {
				// Skip stack items until after matching bracket
				var closeBracket=textAfter.substr(0,1);
				for( ;i>=0;--i)
				{
					if (state.stack[i]==closeBracket)
					{--i; break;};
				}
			} else {
				// Consider nullable non-terminals if at top of stack
				var dn=indentTop[state.stack[i]];
				if (dn) { 
					n+=dn; --i;
				}
			}
			for( ;i>=0;--i)
			{
				var dn=indentTable[state.stack[i]];
				if (dn) {
					n+=dn;
				}
			}
			return n * config.indentUnit;
		};
	
		return {
			token: tokenBase,
			startState: function(base) {
				return {
					tokenize: tokenBase,
					OK: true,
					complete: acceptEmpty,
					errorStartPos: null,
					errorEndPos: null,
					queryType: defaultQueryType,
					possibleCurrent: getPossibles(startSymbol),
					possibleNext: getPossibles(startSymbol),
					allowVars : true,
					allowBnodes : true,
					storeProperty : false,
					lastProperty : "",
					stack: [startSymbol]
				}; 
			},
			indent: indent,
			electricChars: "}])"
		};
	}
	);
	CodeMirror.defineMIME("application/x-sparql-query", "sparql11");
});

},{"codemirror":undefined}],9:[function(require,module,exports){
/*
* TRIE implementation in Javascript
* Copyright (c) 2010 Saurabh Odhyan | http://odhyan.com
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*
* Date: Nov 7, 2010
*/

/*
* A trie, or prefix tree, is a multi-way tree structure useful for storing strings over an alphabet. 
* It has been used to store large dictionaries of English (say) words in spell-checking programs 
* and in natural-language "understanding" programs.    
* @see http://en.wikipedia.org/wiki/Trie
* @see http://www.csse.monash.edu.au/~lloyd/tildeAlgDS/Tree/Trie/
/*

* @class Trie
* @constructor
*/  
var Trie = module.exports = function() {
    this.words = 0;
    this.prefixes = 0;
    this.children = [];
};

Trie.prototype = {
    
    /*
    * Insert a word into the dictionary. 
    * Recursively traverse through the trie nodes, and create new node if does not already exist.
    *
    * @method insert
    * @param {String} str Word to insert in the dictionary
    * @param {Integer} pos Current index of the string to be inserted
    * @return {Void}
    */
    insert: function(str, pos) {
        if(str.length == 0) { //blank string cannot be inserted
            return;
        }
        
        var T = this,
            k,
            child;
            
        if(pos === undefined) {
            pos = 0;
        }
        if(pos === str.length) {
            T.words ++;
            return;
        }
        T.prefixes ++;
        k = str[pos];
        if(T.children[k] === undefined) { //if node for this char doesn't exist, create one
            T.children[k] = new Trie();
        }
        child = T.children[k];
        child.insert(str, pos + 1);
    },
    
    /*
    * Remove a word from the dictionary.
    *
    * @method remove
    * @param {String} str Word to be removed
    * @param {Integer} pos Current index of the string to be removed
    * @return {Void}
    */
    remove: function(str, pos) {
        if(str.length == 0) {
            return;
        }
        
        var T = this,
            k,
            child;
        
        if(pos === undefined) {
            pos = 0;
        }   
        if(T === undefined) {
            return;
        }
        if(pos === str.length) {
            T.words --;
            return;
        }
        T.prefixes --;
        k = str[pos];
        child = T.children[k];
        child.remove(str, pos + 1);
    },
    
    /*
    * Update an existing word in the dictionary. 
    * This method removes the old word from the dictionary and inserts the new word.
    *
    * @method update
    * @param {String} strOld The old word to be replaced
    * @param {String} strNew The new word to be inserted
    * @return {Void}
    */
    update: function(strOld, strNew) {
        if(strOld.length == 0 || strNew.length == 0) {
            return;
        }
        this.remove(strOld);
        this.insert(strNew);
    },
    
    /*
    * Count the number of times a given word has been inserted into the dictionary
    *
    * @method countWord
    * @param {String} str Word to get count of
    * @param {Integer} pos Current index of the given word
    * @return {Integer} The number of times a given word exists in the dictionary
    */
    countWord: function(str, pos) {
        if(str.length == 0) {
            return 0;
        }
        
        var T = this,
            k,
            child,
            ret = 0;
        
        if(pos === undefined) {
            pos = 0;
        }   
        if(pos === str.length) {
            return T.words;
        }
        k = str[pos];
        child = T.children[k];
        if(child !== undefined) { //node exists
            ret = child.countWord(str, pos + 1);
        }
        return ret;
    },
    
    /*
    * Count the number of times a given prefix exists in the dictionary
    *
    * @method countPrefix
    * @param {String} str Prefix to get count of
    * @param {Integer} pos Current index of the given prefix
    * @return {Integer} The number of times a given prefix exists in the dictionary
    */
    countPrefix: function(str, pos) {
        if(str.length == 0) {
            return 0;
        }
        
        var T = this,
            k,
            child,
            ret = 0;

        if(pos === undefined) {
            pos = 0;
        }
        if(pos === str.length) {
            return T.prefixes;
        }
        var k = str[pos];
        child = T.children[k];
        if(child !== undefined) { //node exists
            ret = child.countPrefix(str, pos + 1); 
        }
        return ret; 
    },
    
    /*
    * Find a word in the dictionary
    *
    * @method find
    * @param {String} str The word to find in the dictionary
    * @return {Boolean} True if the word exists in the dictionary, else false
    */
    find: function(str) {
        if(str.length == 0) {
            return false;
        }
        
        if(this.countWord(str) > 0) {
            return true;
        } else {
            return false;
        }
    },
    
    /*
    * Get all words in the dictionary
    *
    * @method getAllWords
    * @param {String} str Prefix of current word
    * @return {Array} Array of words in the dictionary
    */
    getAllWords: function(str) {
        var T = this,
            k,
            child,
            ret = [];
        if(str === undefined) {
            str = "";
        }
        if(T === undefined) {
            return [];
        }
        if(T.words > 0) {
            ret.push(str);
        }
        for(k in T.children) {
            child = T.children[k];
            ret = ret.concat(child.getAllWords(str + k));
        }
        return ret;
    },
    
    /*
    * Autocomplete a given prefix
    *
    * @method autoComplete
    * @param {String} str Prefix to be completed based on dictionary entries
    * @param {Integer} pos Current index of the prefix
    * @return {Array} Array of possible suggestions
    */
    autoComplete: function(str, pos) {
        
        
        var T = this,
            k,
            child;
        if(str.length == 0) {
			if (pos === undefined) {
				return T.getAllWords(str);
			} else {
				return [];
			}
        }
        if(pos === undefined) {
            pos = 0;
        }   
        k = str[pos];
        child = T.children[k];
        if(child === undefined) { //node doesn't exist
            return [];
        }
        if(pos === str.length - 1) {
            return child.getAllWords(str);
        }
        return child.autoComplete(str, pos + 1);
    }
};

},{}],10:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineOption("fullScreen", false, function(cm, val, old) {
    if (old == CodeMirror.Init) old = false;
    if (!old == !val) return;
    if (val) setFullscreen(cm);
    else setNormal(cm);
  });

  function setFullscreen(cm) {
    var wrap = cm.getWrapperElement();
    cm.state.fullScreenRestore = {scrollTop: window.pageYOffset, scrollLeft: window.pageXOffset,
                                  width: wrap.style.width, height: wrap.style.height};
    wrap.style.width = "";
    wrap.style.height = "auto";
    wrap.className += " CodeMirror-fullscreen";
    document.documentElement.style.overflow = "hidden";
    cm.refresh();
  }

  function setNormal(cm) {
    var wrap = cm.getWrapperElement();
    wrap.className = wrap.className.replace(/\s*CodeMirror-fullscreen\b/, "");
    document.documentElement.style.overflow = "";
    var info = cm.state.fullScreenRestore;
    wrap.style.width = info.width; wrap.style.height = info.height;
    window.scrollTo(info.scrollLeft, info.scrollTop);
    cm.refresh();
  }
});

},{"codemirror":undefined}],11:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};

  function findMatchingBracket(cm, where, strict, config) {
    var line = cm.getLineHandle(where.line), pos = where.ch - 1;
    var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
    if (!match) return null;
    var dir = match.charAt(1) == ">" ? 1 : -1;
    if (strict && (dir > 0) != (pos == where.ch)) return null;
    var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));

    var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style || null, config);
    if (found == null) return null;
    return {from: Pos(where.line, pos), to: found && found.pos,
            match: found && found.ch == match.charAt(0), forward: dir > 0};
  }

  // bracketRegex is used to specify which type of bracket to scan
  // should be a regexp, e.g. /[[\]]/
  //
  // Note: If "where" is on an open bracket, then this bracket is ignored.
  //
  // Returns false when no bracket was found, null when it reached
  // maxScanLines and gave up
  function scanForBracket(cm, where, dir, style, config) {
    var maxScanLen = (config && config.maxScanLineLength) || 10000;
    var maxScanLines = (config && config.maxScanLines) || 1000;

    var stack = [];
    var re = config && config.bracketRegex ? config.bracketRegex : /[(){}[\]]/;
    var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lastLine() + 1)
                          : Math.max(cm.firstLine() - 1, where.line - maxScanLines);
    for (var lineNo = where.line; lineNo != lineEnd; lineNo += dir) {
      var line = cm.getLine(lineNo);
      if (!line) continue;
      var pos = dir > 0 ? 0 : line.length - 1, end = dir > 0 ? line.length : -1;
      if (line.length > maxScanLen) continue;
      if (lineNo == where.line) pos = where.ch - (dir < 0 ? 1 : 0);
      for (; pos != end; pos += dir) {
        var ch = line.charAt(pos);
        if (re.test(ch) && (style === undefined || cm.getTokenTypeAt(Pos(lineNo, pos + 1)) == style)) {
          var match = matching[ch];
          if ((match.charAt(1) == ">") == (dir > 0)) stack.push(ch);
          else if (!stack.length) return {pos: Pos(lineNo, pos), ch: ch};
          else stack.pop();
        }
      }
    }
    return lineNo - dir == (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
  }

  function matchBrackets(cm, autoclear, config) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1000;
    var marks = [], ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, false, config);
      if (match && cm.getLine(match.from.line).length <= maxHighlightLen) {
        var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
        marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {className: style}));
        if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen)
          marks.push(cm.markText(match.to, Pos(match.to.line, match.to.ch + 1), {className: style}));
      }
    }

    if (marks.length) {
      // Kludge to work around the IE bug from issue #1193, where text
      // input stops going to the textare whever this fires.
      if (ie_lt8 && cm.state.focused) cm.display.input.focus();

      var clear = function() {
        cm.operation(function() {
          for (var i = 0; i < marks.length; i++) marks[i].clear();
        });
      };
      if (autoclear) setTimeout(clear, 800);
      else return clear;
    }
  }

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      currentlyHighlighted = matchBrackets(cm, false, cm.state.matchBrackets);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init)
      cm.off("cursorActivity", doMatchBrackets);
    if (val) {
      cm.state.matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(pos, strict, config){
    return findMatchingBracket(this, pos, strict, config);
  });
  CodeMirror.defineExtension("scanForBracket", function(pos, dir, style, config){
    return scanForBracket(this, pos, dir, style, config);
  });
});

},{"codemirror":undefined}],12:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.registerHelper("fold", "brace", function(cm, start) {
  var line = start.line, lineText = cm.getLine(line);
  var startCh, tokenType;

  function findOpening(openCh) {
    for (var at = start.ch, pass = 0;;) {
      var found = at <= 0 ? -1 : lineText.lastIndexOf(openCh, at - 1);
      if (found == -1) {
        if (pass == 1) break;
        pass = 1;
        at = lineText.length;
        continue;
      }
      if (pass == 1 && found < start.ch) break;
      tokenType = cm.getTokenTypeAt(CodeMirror.Pos(line, found + 1));
      if (!/^(comment|string)/.test(tokenType)) return found + 1;
      at = found - 1;
    }
  }

  var startToken = "{", endToken = "}", startCh = findOpening("{");
  if (startCh == null) {
    startToken = "[", endToken = "]";
    startCh = findOpening("[");
  }

  if (startCh == null) return;
  var count = 1, lastLine = cm.lastLine(), end, endCh;
  outer: for (var i = line; i <= lastLine; ++i) {
    var text = cm.getLine(i), pos = i == line ? startCh : 0;
    for (;;) {
      var nextOpen = text.indexOf(startToken, pos), nextClose = text.indexOf(endToken, pos);
      if (nextOpen < 0) nextOpen = text.length;
      if (nextClose < 0) nextClose = text.length;
      pos = Math.min(nextOpen, nextClose);
      if (pos == text.length) break;
      if (cm.getTokenTypeAt(CodeMirror.Pos(i, pos + 1)) == tokenType) {
        if (pos == nextOpen) ++count;
        else if (!--count) { end = i; endCh = pos; break outer; }
      }
      ++pos;
    }
  }
  if (end == null || line == end && endCh == startCh) return;
  return {from: CodeMirror.Pos(line, startCh),
          to: CodeMirror.Pos(end, endCh)};
});

CodeMirror.registerHelper("fold", "import", function(cm, start) {
  function hasImport(line) {
    if (line < cm.firstLine() || line > cm.lastLine()) return null;
    var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
    if (!/\S/.test(start.string)) start = cm.getTokenAt(CodeMirror.Pos(line, start.end + 1));
    if (start.type != "keyword" || start.string != "import") return null;
    // Now find closing semicolon, return its position
    for (var i = line, e = Math.min(cm.lastLine(), line + 10); i <= e; ++i) {
      var text = cm.getLine(i), semi = text.indexOf(";");
      if (semi != -1) return {startCh: start.end, end: CodeMirror.Pos(i, semi)};
    }
  }

  var start = start.line, has = hasImport(start), prev;
  if (!has || hasImport(start - 1) || ((prev = hasImport(start - 2)) && prev.end.line == start - 1))
    return null;
  for (var end = has.end;;) {
    var next = hasImport(end.line + 1);
    if (next == null) break;
    end = next.end;
  }
  return {from: cm.clipPos(CodeMirror.Pos(start, has.startCh + 1)), to: end};
});

CodeMirror.registerHelper("fold", "include", function(cm, start) {
  function hasInclude(line) {
    if (line < cm.firstLine() || line > cm.lastLine()) return null;
    var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
    if (!/\S/.test(start.string)) start = cm.getTokenAt(CodeMirror.Pos(line, start.end + 1));
    if (start.type == "meta" && start.string.slice(0, 8) == "#include") return start.start + 8;
  }

  var start = start.line, has = hasInclude(start);
  if (has == null || hasInclude(start - 1) != null) return null;
  for (var end = start;;) {
    var next = hasInclude(end + 1);
    if (next == null) break;
    ++end;
  }
  return {from: CodeMirror.Pos(start, has + 1),
          to: cm.clipPos(CodeMirror.Pos(end))};
});

});

},{"codemirror":undefined}],13:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  function doFold(cm, pos, options, force) {
    if (options && options.call) {
      var finder = options;
      options = null;
    } else {
      var finder = getOption(cm, options, "rangeFinder");
    }
    if (typeof pos == "number") pos = CodeMirror.Pos(pos, 0);
    var minSize = getOption(cm, options, "minFoldSize");

    function getRange(allowFolded) {
      var range = finder(cm, pos);
      if (!range || range.to.line - range.from.line < minSize) return null;
      var marks = cm.findMarksAt(range.from);
      for (var i = 0; i < marks.length; ++i) {
        if (marks[i].__isFold && force !== "fold") {
          if (!allowFolded) return null;
          range.cleared = true;
          marks[i].clear();
        }
      }
      return range;
    }

    var range = getRange(true);
    if (getOption(cm, options, "scanUp")) while (!range && pos.line > cm.firstLine()) {
      pos = CodeMirror.Pos(pos.line - 1, 0);
      range = getRange(false);
    }
    if (!range || range.cleared || force === "unfold") return;

    var myWidget = makeWidget(cm, options);
    CodeMirror.on(myWidget, "mousedown", function(e) {
      myRange.clear();
      CodeMirror.e_preventDefault(e);
    });
    var myRange = cm.markText(range.from, range.to, {
      replacedWith: myWidget,
      clearOnEnter: true,
      __isFold: true
    });
    myRange.on("clear", function(from, to) {
      CodeMirror.signal(cm, "unfold", cm, from, to);
    });
    CodeMirror.signal(cm, "fold", cm, range.from, range.to);
  }

  function makeWidget(cm, options) {
    var widget = getOption(cm, options, "widget");
    if (typeof widget == "string") {
      var text = document.createTextNode(widget);
      widget = document.createElement("span");
      widget.appendChild(text);
      widget.className = "CodeMirror-foldmarker";
    }
    return widget;
  }

  // Clumsy backwards-compatible interface
  CodeMirror.newFoldFunction = function(rangeFinder, widget) {
    return function(cm, pos) { doFold(cm, pos, {rangeFinder: rangeFinder, widget: widget}); };
  };

  // New-style interface
  CodeMirror.defineExtension("foldCode", function(pos, options, force) {
    doFold(this, pos, options, force);
  });

  CodeMirror.defineExtension("isFolded", function(pos) {
    var marks = this.findMarksAt(pos);
    for (var i = 0; i < marks.length; ++i)
      if (marks[i].__isFold) return true;
  });

  CodeMirror.commands.toggleFold = function(cm) {
    cm.foldCode(cm.getCursor());
  };
  CodeMirror.commands.fold = function(cm) {
    cm.foldCode(cm.getCursor(), null, "fold");
  };
  CodeMirror.commands.unfold = function(cm) {
    cm.foldCode(cm.getCursor(), null, "unfold");
  };
  CodeMirror.commands.foldAll = function(cm) {
    cm.operation(function() {
      for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
        cm.foldCode(CodeMirror.Pos(i, 0), null, "fold");
    });
  };
  CodeMirror.commands.unfoldAll = function(cm) {
    cm.operation(function() {
      for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
        cm.foldCode(CodeMirror.Pos(i, 0), null, "unfold");
    });
  };

  CodeMirror.registerHelper("fold", "combine", function() {
    var funcs = Array.prototype.slice.call(arguments, 0);
    return function(cm, start) {
      for (var i = 0; i < funcs.length; ++i) {
        var found = funcs[i](cm, start);
        if (found) return found;
      }
    };
  });

  CodeMirror.registerHelper("fold", "auto", function(cm, start) {
    var helpers = cm.getHelpers(start, "fold");
    for (var i = 0; i < helpers.length; i++) {
      var cur = helpers[i](cm, start);
      if (cur) return cur;
    }
  });

  var defaultOptions = {
    rangeFinder: CodeMirror.fold.auto,
    widget: "\u2194",
    minFoldSize: 0,
    scanUp: false
  };

  CodeMirror.defineOption("foldOptions", null);

  function getOption(cm, options, name) {
    if (options && options[name] !== undefined)
      return options[name];
    var editorOptions = cm.options.foldOptions;
    if (editorOptions && editorOptions[name] !== undefined)
      return editorOptions[name];
    return defaultOptions[name];
  }
});

},{"codemirror":undefined}],14:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})(), require("./foldcode"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "./foldcode"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineOption("foldGutter", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.clearGutter(cm.state.foldGutter.options.gutter);
      cm.state.foldGutter = null;
      cm.off("gutterClick", onGutterClick);
      cm.off("change", onChange);
      cm.off("viewportChange", onViewportChange);
      cm.off("fold", onFold);
      cm.off("unfold", onFold);
      cm.off("swapDoc", updateInViewport);
    }
    if (val) {
      cm.state.foldGutter = new State(parseOptions(val));
      updateInViewport(cm);
      cm.on("gutterClick", onGutterClick);
      cm.on("change", onChange);
      cm.on("viewportChange", onViewportChange);
      cm.on("fold", onFold);
      cm.on("unfold", onFold);
      cm.on("swapDoc", updateInViewport);
    }
  });

  var Pos = CodeMirror.Pos;

  function State(options) {
    this.options = options;
    this.from = this.to = 0;
  }

  function parseOptions(opts) {
    if (opts === true) opts = {};
    if (opts.gutter == null) opts.gutter = "CodeMirror-foldgutter";
    if (opts.indicatorOpen == null) opts.indicatorOpen = "CodeMirror-foldgutter-open";
    if (opts.indicatorFolded == null) opts.indicatorFolded = "CodeMirror-foldgutter-folded";
    return opts;
  }

  function isFolded(cm, line) {
    var marks = cm.findMarksAt(Pos(line));
    for (var i = 0; i < marks.length; ++i)
      if (marks[i].__isFold && marks[i].find().from.line == line) return true;
  }

  function marker(spec) {
    if (typeof spec == "string") {
      var elt = document.createElement("div");
      elt.className = spec + " CodeMirror-guttermarker-subtle";
      return elt;
    } else {
      return spec.cloneNode(true);
    }
  }

  function updateFoldInfo(cm, from, to) {
    var opts = cm.state.foldGutter.options, cur = from;
    cm.eachLine(from, to, function(line) {
      var mark = null;
      if (isFolded(cm, cur)) {
        mark = marker(opts.indicatorFolded);
      } else {
        var pos = Pos(cur, 0), func = opts.rangeFinder || CodeMirror.fold.auto;
        var range = func && func(cm, pos);
        if (range && range.from.line + 1 < range.to.line)
          mark = marker(opts.indicatorOpen);
      }
      cm.setGutterMarker(line, opts.gutter, mark);
      ++cur;
    });
  }

  function updateInViewport(cm) {
    var vp = cm.getViewport(), state = cm.state.foldGutter;
    if (!state) return;
    cm.operation(function() {
      updateFoldInfo(cm, vp.from, vp.to);
    });
    state.from = vp.from; state.to = vp.to;
  }

  function onGutterClick(cm, line, gutter) {
    var opts = cm.state.foldGutter.options;
    if (gutter != opts.gutter) return;
    cm.foldCode(Pos(line, 0), opts.rangeFinder);
  }

  function onChange(cm) {
    var state = cm.state.foldGutter, opts = cm.state.foldGutter.options;
    state.from = state.to = 0;
    clearTimeout(state.changeUpdate);
    state.changeUpdate = setTimeout(function() { updateInViewport(cm); }, opts.foldOnChangeTimeSpan || 600);
  }

  function onViewportChange(cm) {
    var state = cm.state.foldGutter, opts = cm.state.foldGutter.options;
    clearTimeout(state.changeUpdate);
    state.changeUpdate = setTimeout(function() {
      var vp = cm.getViewport();
      if (state.from == state.to || vp.from - state.to > 20 || state.from - vp.to > 20) {
        updateInViewport(cm);
      } else {
        cm.operation(function() {
          if (vp.from < state.from) {
            updateFoldInfo(cm, vp.from, state.from);
            state.from = vp.from;
          }
          if (vp.to > state.to) {
            updateFoldInfo(cm, state.to, vp.to);
            state.to = vp.to;
          }
        });
      }
    }, opts.updateViewportTimeSpan || 400);
  }

  function onFold(cm, from) {
    var state = cm.state.foldGutter, line = from.line;
    if (line >= state.from && line < state.to)
      updateFoldInfo(cm, line, line + 1);
  }
});

},{"./foldcode":13,"codemirror":undefined}],15:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var Pos = CodeMirror.Pos;
  function cmp(a, b) { return a.line - b.line || a.ch - b.ch; }

  var nameStartChar = "A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
  var nameChar = nameStartChar + "\-\:\.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
  var xmlTagStart = new RegExp("<(/?)([" + nameStartChar + "][" + nameChar + "]*)", "g");

  function Iter(cm, line, ch, range) {
    this.line = line; this.ch = ch;
    this.cm = cm; this.text = cm.getLine(line);
    this.min = range ? range.from : cm.firstLine();
    this.max = range ? range.to - 1 : cm.lastLine();
  }

  function tagAt(iter, ch) {
    var type = iter.cm.getTokenTypeAt(Pos(iter.line, ch));
    return type && /\btag\b/.test(type);
  }

  function nextLine(iter) {
    if (iter.line >= iter.max) return;
    iter.ch = 0;
    iter.text = iter.cm.getLine(++iter.line);
    return true;
  }
  function prevLine(iter) {
    if (iter.line <= iter.min) return;
    iter.text = iter.cm.getLine(--iter.line);
    iter.ch = iter.text.length;
    return true;
  }

  function toTagEnd(iter) {
    for (;;) {
      var gt = iter.text.indexOf(">", iter.ch);
      if (gt == -1) { if (nextLine(iter)) continue; else return; }
      if (!tagAt(iter, gt + 1)) { iter.ch = gt + 1; continue; }
      var lastSlash = iter.text.lastIndexOf("/", gt);
      var selfClose = lastSlash > -1 && !/\S/.test(iter.text.slice(lastSlash + 1, gt));
      iter.ch = gt + 1;
      return selfClose ? "selfClose" : "regular";
    }
  }
  function toTagStart(iter) {
    for (;;) {
      var lt = iter.ch ? iter.text.lastIndexOf("<", iter.ch - 1) : -1;
      if (lt == -1) { if (prevLine(iter)) continue; else return; }
      if (!tagAt(iter, lt + 1)) { iter.ch = lt; continue; }
      xmlTagStart.lastIndex = lt;
      iter.ch = lt;
      var match = xmlTagStart.exec(iter.text);
      if (match && match.index == lt) return match;
    }
  }

  function toNextTag(iter) {
    for (;;) {
      xmlTagStart.lastIndex = iter.ch;
      var found = xmlTagStart.exec(iter.text);
      if (!found) { if (nextLine(iter)) continue; else return; }
      if (!tagAt(iter, found.index + 1)) { iter.ch = found.index + 1; continue; }
      iter.ch = found.index + found[0].length;
      return found;
    }
  }
  function toPrevTag(iter) {
    for (;;) {
      var gt = iter.ch ? iter.text.lastIndexOf(">", iter.ch - 1) : -1;
      if (gt == -1) { if (prevLine(iter)) continue; else return; }
      if (!tagAt(iter, gt + 1)) { iter.ch = gt; continue; }
      var lastSlash = iter.text.lastIndexOf("/", gt);
      var selfClose = lastSlash > -1 && !/\S/.test(iter.text.slice(lastSlash + 1, gt));
      iter.ch = gt + 1;
      return selfClose ? "selfClose" : "regular";
    }
  }

  function findMatchingClose(iter, tag) {
    var stack = [];
    for (;;) {
      var next = toNextTag(iter), end, startLine = iter.line, startCh = iter.ch - (next ? next[0].length : 0);
      if (!next || !(end = toTagEnd(iter))) return;
      if (end == "selfClose") continue;
      if (next[1]) { // closing tag
        for (var i = stack.length - 1; i >= 0; --i) if (stack[i] == next[2]) {
          stack.length = i;
          break;
        }
        if (i < 0 && (!tag || tag == next[2])) return {
          tag: next[2],
          from: Pos(startLine, startCh),
          to: Pos(iter.line, iter.ch)
        };
      } else { // opening tag
        stack.push(next[2]);
      }
    }
  }
  function findMatchingOpen(iter, tag) {
    var stack = [];
    for (;;) {
      var prev = toPrevTag(iter);
      if (!prev) return;
      if (prev == "selfClose") { toTagStart(iter); continue; }
      var endLine = iter.line, endCh = iter.ch;
      var start = toTagStart(iter);
      if (!start) return;
      if (start[1]) { // closing tag
        stack.push(start[2]);
      } else { // opening tag
        for (var i = stack.length - 1; i >= 0; --i) if (stack[i] == start[2]) {
          stack.length = i;
          break;
        }
        if (i < 0 && (!tag || tag == start[2])) return {
          tag: start[2],
          from: Pos(iter.line, iter.ch),
          to: Pos(endLine, endCh)
        };
      }
    }
  }

  CodeMirror.registerHelper("fold", "xml", function(cm, start) {
    var iter = new Iter(cm, start.line, 0);
    for (;;) {
      var openTag = toNextTag(iter), end;
      if (!openTag || iter.line != start.line || !(end = toTagEnd(iter))) return;
      if (!openTag[1] && end != "selfClose") {
        var start = Pos(iter.line, iter.ch);
        var close = findMatchingClose(iter, openTag[2]);
        return close && {from: start, to: close.from};
      }
    }
  });
  CodeMirror.findMatchingTag = function(cm, pos, range) {
    var iter = new Iter(cm, pos.line, pos.ch, range);
    if (iter.text.indexOf(">") == -1 && iter.text.indexOf("<") == -1) return;
    var end = toTagEnd(iter), to = end && Pos(iter.line, iter.ch);
    var start = end && toTagStart(iter);
    if (!end || !start || cmp(iter, pos) > 0) return;
    var here = {from: Pos(iter.line, iter.ch), to: to, tag: start[2]};
    if (end == "selfClose") return {open: here, close: null, at: "open"};

    if (start[1]) { // closing tag
      return {open: findMatchingOpen(iter, start[2]), close: here, at: "close"};
    } else { // opening tag
      iter = new Iter(cm, to.line, to.ch, range);
      return {open: here, close: findMatchingClose(iter, start[2]), at: "open"};
    }
  };

  CodeMirror.findEnclosingTag = function(cm, pos, range) {
    var iter = new Iter(cm, pos.line, pos.ch, range);
    for (;;) {
      var open = findMatchingOpen(iter);
      if (!open) break;
      var forward = new Iter(cm, pos.line, pos.ch, range);
      var close = findMatchingClose(forward, open.tag);
      if (close) return {open: open, close: close};
    }
  };

  // Used by addon/edit/closetag.js
  CodeMirror.scanForClosingTag = function(cm, pos, name, end) {
    var iter = new Iter(cm, pos.line, pos.ch, end ? {from: 0, to: end} : null);
    return findMatchingClose(iter, name);
  };
});

},{"codemirror":undefined}],16:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var HINT_ELEMENT_CLASS        = "CodeMirror-hint";
  var ACTIVE_HINT_ELEMENT_CLASS = "CodeMirror-hint-active";

  // This is the old interface, kept around for now to stay
  // backwards-compatible.
  CodeMirror.showHint = function(cm, getHints, options) {
    if (!getHints) return cm.showHint(options);
    if (options && options.async) getHints.async = true;
    var newOpts = {hint: getHints};
    if (options) for (var prop in options) newOpts[prop] = options[prop];
    return cm.showHint(newOpts);
  };

  CodeMirror.defineExtension("showHint", function(options) {
    // We want a single cursor position.
    if (this.listSelections().length > 1 || this.somethingSelected()) return;

    if (this.state.completionActive) this.state.completionActive.close();
    var completion = this.state.completionActive = new Completion(this, options);
    var getHints = completion.options.hint;
    if (!getHints) return;

    CodeMirror.signal(this, "startCompletion", this);
    if (getHints.async)
      getHints(this, function(hints) { completion.showHints(hints); }, completion.options);
    else
      return completion.showHints(getHints(this, completion.options));
  });

  function Completion(cm, options) {
    this.cm = cm;
    this.options = this.buildOptions(options);
    this.widget = this.onClose = null;
  }

  Completion.prototype = {
    close: function() {
      if (!this.active()) return;
      this.cm.state.completionActive = null;

      if (this.widget) this.widget.close();
      if (this.onClose) this.onClose();
      CodeMirror.signal(this.cm, "endCompletion", this.cm);
    },

    active: function() {
      return this.cm.state.completionActive == this;
    },

    pick: function(data, i) {
      var completion = data.list[i];
      if (completion.hint) completion.hint(this.cm, data, completion);
      else this.cm.replaceRange(getText(completion), completion.from || data.from,
                                completion.to || data.to, "complete");
      CodeMirror.signal(data, "pick", completion);
      this.close();
    },

    showHints: function(data) {
      if (!data || !data.list.length || !this.active()) return this.close();

      if (this.options.completeSingle && data.list.length == 1)
        this.pick(data, 0);
      else
        this.showWidget(data);
    },

    showWidget: function(data) {
      this.widget = new Widget(this, data);
      CodeMirror.signal(data, "shown");

      var debounce = 0, completion = this, finished;
      var closeOn = this.options.closeCharacters;
      var startPos = this.cm.getCursor(), startLen = this.cm.getLine(startPos.line).length;

      var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
        return setTimeout(fn, 1000/60);
      };
      var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

      function done() {
        if (finished) return;
        finished = true;
        completion.close();
        completion.cm.off("cursorActivity", activity);
        if (data) CodeMirror.signal(data, "close");
      }

      function update() {
        if (finished) return;
        CodeMirror.signal(data, "update");
        var getHints = completion.options.hint;
        if (getHints.async)
          getHints(completion.cm, finishUpdate, completion.options);
        else
          finishUpdate(getHints(completion.cm, completion.options));
      }
      function finishUpdate(data_) {
        data = data_;
        if (finished) return;
        if (!data || !data.list.length) return done();
        if (completion.widget) completion.widget.close();
        completion.widget = new Widget(completion, data);
      }

      function clearDebounce() {
        if (debounce) {
          cancelAnimationFrame(debounce);
          debounce = 0;
        }
      }

      function activity() {
        clearDebounce();
        var pos = completion.cm.getCursor(), line = completion.cm.getLine(pos.line);
        if (pos.line != startPos.line || line.length - pos.ch != startLen - startPos.ch ||
            pos.ch < startPos.ch || completion.cm.somethingSelected() ||
            (pos.ch && closeOn.test(line.charAt(pos.ch - 1)))) {
          completion.close();
        } else {
          debounce = requestAnimationFrame(update);
          if (completion.widget) completion.widget.close();
        }
      }
      this.cm.on("cursorActivity", activity);
      this.onClose = done;
    },

    buildOptions: function(options) {
      var editor = this.cm.options.hintOptions;
      var out = {};
      for (var prop in defaultOptions) out[prop] = defaultOptions[prop];
      if (editor) for (var prop in editor)
        if (editor[prop] !== undefined) out[prop] = editor[prop];
      if (options) for (var prop in options)
        if (options[prop] !== undefined) out[prop] = options[prop];
      return out;
    }
  };

  function getText(completion) {
    if (typeof completion == "string") return completion;
    else return completion.text;
  }

  function buildKeyMap(completion, handle) {
    var baseMap = {
      Up: function() {handle.moveFocus(-1);},
      Down: function() {handle.moveFocus(1);},
      PageUp: function() {handle.moveFocus(-handle.menuSize() + 1, true);},
      PageDown: function() {handle.moveFocus(handle.menuSize() - 1, true);},
      Home: function() {handle.setFocus(0);},
      End: function() {handle.setFocus(handle.length - 1);},
      Enter: handle.pick,
      Tab: handle.pick,
      Esc: handle.close
    };
    var custom = completion.options.customKeys;
    var ourMap = custom ? {} : baseMap;
    function addBinding(key, val) {
      var bound;
      if (typeof val != "string")
        bound = function(cm) { return val(cm, handle); };
      // This mechanism is deprecated
      else if (baseMap.hasOwnProperty(val))
        bound = baseMap[val];
      else
        bound = val;
      ourMap[key] = bound;
    }
    if (custom)
      for (var key in custom) if (custom.hasOwnProperty(key))
        addBinding(key, custom[key]);
    var extra = completion.options.extraKeys;
    if (extra)
      for (var key in extra) if (extra.hasOwnProperty(key))
        addBinding(key, extra[key]);
    return ourMap;
  }

  function getHintElement(hintsElement, el) {
    while (el && el != hintsElement) {
      if (el.nodeName.toUpperCase() === "LI" && el.parentNode == hintsElement) return el;
      el = el.parentNode;
    }
  }

  function Widget(completion, data) {
    this.completion = completion;
    this.data = data;
    var widget = this, cm = completion.cm;

    var hints = this.hints = document.createElement("ul");
    hints.className = "CodeMirror-hints";
    this.selectedHint = data.selectedHint || 0;

    var completions = data.list;
    for (var i = 0; i < completions.length; ++i) {
      var elt = hints.appendChild(document.createElement("li")), cur = completions[i];
      var className = HINT_ELEMENT_CLASS + (i != this.selectedHint ? "" : " " + ACTIVE_HINT_ELEMENT_CLASS);
      if (cur.className != null) className = cur.className + " " + className;
      elt.className = className;
      if (cur.render) cur.render(elt, data, cur);
      else elt.appendChild(document.createTextNode(cur.displayText || getText(cur)));
      elt.hintId = i;
    }

    var pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
    var left = pos.left, top = pos.bottom, below = true;
    hints.style.left = left + "px";
    hints.style.top = top + "px";
    // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
    var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
    var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
    (completion.options.container || document.body).appendChild(hints);
    var box = hints.getBoundingClientRect(), overlapY = box.bottom - winH;
    if (overlapY > 0) {
      var height = box.bottom - box.top, curTop = pos.top - (pos.bottom - box.top);
      if (curTop - height > 0) { // Fits above cursor
        hints.style.top = (top = pos.top - height) + "px";
        below = false;
      } else if (height > winH) {
        hints.style.height = (winH - 5) + "px";
        hints.style.top = (top = pos.bottom - box.top) + "px";
        var cursor = cm.getCursor();
        if (data.from.ch != cursor.ch) {
          pos = cm.cursorCoords(cursor);
          hints.style.left = (left = pos.left) + "px";
          box = hints.getBoundingClientRect();
        }
      }
    }
    var overlapX = box.left - winW;
    if (overlapX > 0) {
      if (box.right - box.left > winW) {
        hints.style.width = (winW - 5) + "px";
        overlapX -= (box.right - box.left) - winW;
      }
      hints.style.left = (left = pos.left - overlapX) + "px";
    }

    cm.addKeyMap(this.keyMap = buildKeyMap(completion, {
      moveFocus: function(n, avoidWrap) { widget.changeActive(widget.selectedHint + n, avoidWrap); },
      setFocus: function(n) { widget.changeActive(n); },
      menuSize: function() { return widget.screenAmount(); },
      length: completions.length,
      close: function() { completion.close(); },
      pick: function() { widget.pick(); },
      data: data
    }));

    if (completion.options.closeOnUnfocus) {
      var closingOnBlur;
      cm.on("blur", this.onBlur = function() { closingOnBlur = setTimeout(function() { completion.close(); }, 100); });
      cm.on("focus", this.onFocus = function() { clearTimeout(closingOnBlur); });
    }

    var startScroll = cm.getScrollInfo();
    cm.on("scroll", this.onScroll = function() {
      var curScroll = cm.getScrollInfo(), editor = cm.getWrapperElement().getBoundingClientRect();
      var newTop = top + startScroll.top - curScroll.top;
      var point = newTop - (window.pageYOffset || (document.documentElement || document.body).scrollTop);
      if (!below) point += hints.offsetHeight;
      if (point <= editor.top || point >= editor.bottom) return completion.close();
      hints.style.top = newTop + "px";
      hints.style.left = (left + startScroll.left - curScroll.left) + "px";
    });

    CodeMirror.on(hints, "dblclick", function(e) {
      var t = getHintElement(hints, e.target || e.srcElement);
      if (t && t.hintId != null) {widget.changeActive(t.hintId); widget.pick();}
    });

    CodeMirror.on(hints, "click", function(e) {
      var t = getHintElement(hints, e.target || e.srcElement);
      if (t && t.hintId != null) {
        widget.changeActive(t.hintId);
        if (completion.options.completeOnSingleClick) widget.pick();
      }
    });

    CodeMirror.on(hints, "mousedown", function() {
      setTimeout(function(){cm.focus();}, 20);
    });

    CodeMirror.signal(data, "select", completions[0], hints.firstChild);
    return true;
  }

  Widget.prototype = {
    close: function() {
      if (this.completion.widget != this) return;
      this.completion.widget = null;
      this.hints.parentNode.removeChild(this.hints);
      this.completion.cm.removeKeyMap(this.keyMap);

      var cm = this.completion.cm;
      if (this.completion.options.closeOnUnfocus) {
        cm.off("blur", this.onBlur);
        cm.off("focus", this.onFocus);
      }
      cm.off("scroll", this.onScroll);
    },

    pick: function() {
      this.completion.pick(this.data, this.selectedHint);
    },

    changeActive: function(i, avoidWrap) {
      if (i >= this.data.list.length)
        i = avoidWrap ? this.data.list.length - 1 : 0;
      else if (i < 0)
        i = avoidWrap ? 0  : this.data.list.length - 1;
      if (this.selectedHint == i) return;
      var node = this.hints.childNodes[this.selectedHint];
      node.className = node.className.replace(" " + ACTIVE_HINT_ELEMENT_CLASS, "");
      node = this.hints.childNodes[this.selectedHint = i];
      node.className += " " + ACTIVE_HINT_ELEMENT_CLASS;
      if (node.offsetTop < this.hints.scrollTop)
        this.hints.scrollTop = node.offsetTop - 3;
      else if (node.offsetTop + node.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
        this.hints.scrollTop = node.offsetTop + node.offsetHeight - this.hints.clientHeight + 3;
      CodeMirror.signal(this.data, "select", this.data.list[this.selectedHint], node);
    },

    screenAmount: function() {
      return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
    }
  };

  CodeMirror.registerHelper("hint", "auto", function(cm, options) {
    var helpers = cm.getHelpers(cm.getCursor(), "hint"), words;
    if (helpers.length) {
      for (var i = 0; i < helpers.length; i++) {
        var cur = helpers[i](cm, options);
        if (cur && cur.list.length) return cur;
      }
    } else if (words = cm.getHelper(cm.getCursor(), "hintWords")) {
      if (words) return CodeMirror.hint.fromList(cm, {words: words});
    } else if (CodeMirror.hint.anyword) {
      return CodeMirror.hint.anyword(cm, options);
    }
  });

  CodeMirror.registerHelper("hint", "fromList", function(cm, options) {
    var cur = cm.getCursor(), token = cm.getTokenAt(cur);
    var found = [];
    for (var i = 0; i < options.words.length; i++) {
      var word = options.words[i];
      if (word.slice(0, token.string.length) == token.string)
        found.push(word);
    }

    if (found.length) return {
      list: found,
      from: CodeMirror.Pos(cur.line, token.start),
            to: CodeMirror.Pos(cur.line, token.end)
    };
  });

  CodeMirror.commands.autocomplete = CodeMirror.showHint;

  var defaultOptions = {
    hint: CodeMirror.hint.auto,
    completeSingle: true,
    alignWithWord: true,
    closeCharacters: /[\s()\[\]{};:>,]/,
    closeOnUnfocus: true,
    completeOnSingleClick: false,
    container: null,
    customKeys: null,
    extraKeys: null
  };

  CodeMirror.defineOption("hintOptions", null);
});

},{"codemirror":undefined}],17:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.runMode = function(string, modespec, callback, options) {
  var mode = CodeMirror.getMode(CodeMirror.defaults, modespec);
  var ie = /MSIE \d/.test(navigator.userAgent);
  var ie_lt9 = ie && (document.documentMode == null || document.documentMode < 9);

  if (callback.nodeType == 1) {
    var tabSize = (options && options.tabSize) || CodeMirror.defaults.tabSize;
    var node = callback, col = 0;
    node.innerHTML = "";
    callback = function(text, style) {
      if (text == "\n") {
        // Emitting LF or CRLF on IE8 or earlier results in an incorrect display.
        // Emitting a carriage return makes everything ok.
        node.appendChild(document.createTextNode(ie_lt9 ? '\r' : text));
        col = 0;
        return;
      }
      var content = "";
      // replace tabs
      for (var pos = 0;;) {
        var idx = text.indexOf("\t", pos);
        if (idx == -1) {
          content += text.slice(pos);
          col += text.length - pos;
          break;
        } else {
          col += idx - pos;
          content += text.slice(pos, idx);
          var size = tabSize - col % tabSize;
          col += size;
          for (var i = 0; i < size; ++i) content += " ";
          pos = idx + 1;
        }
      }

      if (style) {
        var sp = node.appendChild(document.createElement("span"));
        sp.className = "cm-" + style.replace(/ +/g, " cm-");
        sp.appendChild(document.createTextNode(content));
      } else {
        node.appendChild(document.createTextNode(content));
      }
    };
  }

  var lines = CodeMirror.splitLines(string), state = (options && options.state) || CodeMirror.startState(mode);
  for (var i = 0, e = lines.length; i < e; ++i) {
    if (i) callback("\n");
    var stream = new CodeMirror.StringStream(lines[i]);
    if (!stream.string && mode.blankLine) mode.blankLine(state);
    while (!stream.eol()) {
      var style = mode.token(stream, state);
      callback(stream.current(), style, i, stream.start, state);
      stream.start = stream.pos;
    }
  }
};

});

},{"codemirror":undefined}],18:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var Pos = CodeMirror.Pos;

  function SearchCursor(doc, query, pos, caseFold) {
    this.atOccurrence = false; this.doc = doc;
    if (caseFold == null && typeof query == "string") caseFold = false;

    pos = pos ? doc.clipPos(pos) : Pos(0, 0);
    this.pos = {from: pos, to: pos};

    // The matches method is filled in based on the type of query.
    // It takes a position and a direction, and returns an object
    // describing the next occurrence of the query, or null if no
    // more matches were found.
    if (typeof query != "string") { // Regexp match
      if (!query.global) query = new RegExp(query.source, query.ignoreCase ? "ig" : "g");
      this.matches = function(reverse, pos) {
        if (reverse) {
          query.lastIndex = 0;
          var line = doc.getLine(pos.line).slice(0, pos.ch), cutOff = 0, match, start;
          for (;;) {
            query.lastIndex = cutOff;
            var newMatch = query.exec(line);
            if (!newMatch) break;
            match = newMatch;
            start = match.index;
            cutOff = match.index + (match[0].length || 1);
            if (cutOff == line.length) break;
          }
          var matchLen = (match && match[0].length) || 0;
          if (!matchLen) {
            if (start == 0 && line.length == 0) {match = undefined;}
            else if (start != doc.getLine(pos.line).length) {
              matchLen++;
            }
          }
        } else {
          query.lastIndex = pos.ch;
          var line = doc.getLine(pos.line), match = query.exec(line);
          var matchLen = (match && match[0].length) || 0;
          var start = match && match.index;
          if (start + matchLen != line.length && !matchLen) matchLen = 1;
        }
        if (match && matchLen)
          return {from: Pos(pos.line, start),
                  to: Pos(pos.line, start + matchLen),
                  match: match};
      };
    } else { // String query
      var origQuery = query;
      if (caseFold) query = query.toLowerCase();
      var fold = caseFold ? function(str){return str.toLowerCase();} : function(str){return str;};
      var target = query.split("\n");
      // Different methods for single-line and multi-line queries
      if (target.length == 1) {
        if (!query.length) {
          // Empty string would match anything and never progress, so
          // we define it to match nothing instead.
          this.matches = function() {};
        } else {
          this.matches = function(reverse, pos) {
            if (reverse) {
              var orig = doc.getLine(pos.line).slice(0, pos.ch), line = fold(orig);
              var match = line.lastIndexOf(query);
              if (match > -1) {
                match = adjustPos(orig, line, match);
                return {from: Pos(pos.line, match), to: Pos(pos.line, match + origQuery.length)};
              }
             } else {
               var orig = doc.getLine(pos.line).slice(pos.ch), line = fold(orig);
               var match = line.indexOf(query);
               if (match > -1) {
                 match = adjustPos(orig, line, match) + pos.ch;
                 return {from: Pos(pos.line, match), to: Pos(pos.line, match + origQuery.length)};
               }
            }
          };
        }
      } else {
        var origTarget = origQuery.split("\n");
        this.matches = function(reverse, pos) {
          var last = target.length - 1;
          if (reverse) {
            if (pos.line - (target.length - 1) < doc.firstLine()) return;
            if (fold(doc.getLine(pos.line).slice(0, origTarget[last].length)) != target[target.length - 1]) return;
            var to = Pos(pos.line, origTarget[last].length);
            for (var ln = pos.line - 1, i = last - 1; i >= 1; --i, --ln)
              if (target[i] != fold(doc.getLine(ln))) return;
            var line = doc.getLine(ln), cut = line.length - origTarget[0].length;
            if (fold(line.slice(cut)) != target[0]) return;
            return {from: Pos(ln, cut), to: to};
          } else {
            if (pos.line + (target.length - 1) > doc.lastLine()) return;
            var line = doc.getLine(pos.line), cut = line.length - origTarget[0].length;
            if (fold(line.slice(cut)) != target[0]) return;
            var from = Pos(pos.line, cut);
            for (var ln = pos.line + 1, i = 1; i < last; ++i, ++ln)
              if (target[i] != fold(doc.getLine(ln))) return;
            if (fold(doc.getLine(ln).slice(0, origTarget[last].length)) != target[last]) return;
            return {from: from, to: Pos(ln, origTarget[last].length)};
          }
        };
      }
    }
  }

  SearchCursor.prototype = {
    findNext: function() {return this.find(false);},
    findPrevious: function() {return this.find(true);},

    find: function(reverse) {
      var self = this, pos = this.doc.clipPos(reverse ? this.pos.from : this.pos.to);
      function savePosAndFail(line) {
        var pos = Pos(line, 0);
        self.pos = {from: pos, to: pos};
        self.atOccurrence = false;
        return false;
      }

      for (;;) {
        if (this.pos = this.matches(reverse, pos)) {
          this.atOccurrence = true;
          return this.pos.match || true;
        }
        if (reverse) {
          if (!pos.line) return savePosAndFail(0);
          pos = Pos(pos.line-1, this.doc.getLine(pos.line-1).length);
        }
        else {
          var maxLine = this.doc.lineCount();
          if (pos.line == maxLine - 1) return savePosAndFail(maxLine);
          pos = Pos(pos.line + 1, 0);
        }
      }
    },

    from: function() {if (this.atOccurrence) return this.pos.from;},
    to: function() {if (this.atOccurrence) return this.pos.to;},

    replace: function(newText) {
      if (!this.atOccurrence) return;
      var lines = CodeMirror.splitLines(newText);
      this.doc.replaceRange(lines, this.pos.from, this.pos.to);
      this.pos.to = Pos(this.pos.from.line + lines.length - 1,
                        lines[lines.length - 1].length + (lines.length == 1 ? this.pos.from.ch : 0));
    }
  };

  // Maps a position in a case-folded line back to a position in the original line
  // (compensating for codepoints increasing in number during folding)
  function adjustPos(orig, folded, pos) {
    if (orig.length == folded.length) return pos;
    for (var pos1 = Math.min(pos, orig.length);;) {
      var len1 = orig.slice(0, pos1).toLowerCase().length;
      if (len1 < pos) ++pos1;
      else if (len1 > pos) --pos1;
      else return pos1;
    }
  }

  CodeMirror.defineExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this.doc, query, pos, caseFold);
  });
  CodeMirror.defineDocExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this, query, pos, caseFold);
  });

  CodeMirror.defineExtension("selectMatches", function(query, caseFold) {
    var ranges = [], next;
    var cur = this.getSearchCursor(query, this.getCursor("from"), caseFold);
    while (next = cur.findNext()) {
      if (CodeMirror.cmpPos(cur.to(), this.getCursor("to")) > 0) break;
      ranges.push({anchor: cur.from(), head: cur.to()});
    }
    if (ranges.length)
      this.setSelections(ranges, 0);
  });
});

},{"codemirror":undefined}],19:[function(require,module,exports){
module.exports=require(2)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-utils/node_modules/store/store.js":2}],20:[function(require,module,exports){
module.exports={
  "name": "yasgui-utils",
  "version": "1.4.1",
  "description": "Utils for YASGUI libs",
  "main": "src/main.js",
  "repository": {
    "type": "git",
    "url": "git://github.com/YASGUI/Utils.git"
  },
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasgui.github.io/license.txt"
    }
  ],
  "author": "Laurens Rietveld",
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "web": "http://laurensrietveld.nl"
    }
  ],
  "bugs": {
    "url": "https://github.com/YASGUI/Utils/issues"
  },
  "homepage": "https://github.com/YASGUI/Utils",
  "dependencies": {
    "store": "^1.3.14"
  }
}

},{}],21:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"../package.json":20,"./storage.js":22,"./svg.js":23,"/home/lrd900/yasgui/yasgui/node_modules/yasgui-utils/src/main.js":4}],22:[function(require,module,exports){
module.exports=require(5)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-utils/src/storage.js":5,"store":19}],23:[function(require,module,exports){
module.exports=require(6)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-utils/src/svg.js":6}],24:[function(require,module,exports){
module.exports={
  "name": "yasgui-yasqe",
  "description": "Yet Another SPARQL Query Editor",
  "version": "2.2.5",
  "main": "src/main.js",
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasqe.yasgui.org/license.txt"
    }
  ],
  "author": "Laurens Rietveld",
  "homepage": "http://yasqe.yasgui.org",
  "devDependencies": {
    "browserify": "^6.1.0",
    "gulp": "~3.6.0",
    "gulp-bump": "^0.1.11",
    "gulp-concat": "^2.4.1",
    "gulp-connect": "^2.0.5",
    "gulp-embedlr": "^0.5.2",
    "gulp-filter": "^1.0.2",
    "gulp-git": "^0.5.2",
    "gulp-jsvalidate": "^0.2.0",
    "gulp-livereload": "^1.3.1",
    "gulp-minify-css": "^0.3.11",
    "gulp-notify": "^1.2.5",
    "gulp-rename": "^1.2.0",
    "gulp-streamify": "0.0.5",
    "gulp-tag-version": "^1.1.0",
    "gulp-uglify": "^1.0.1",
    "require-dir": "^0.1.0",
    "run-sequence": "^1.0.1",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "~0.1.1",
    "watchify": "^0.6.4",
    "gulp-sourcemaps": "^1.2.8",
    "exorcist": "^0.1.6",
    "vinyl-transform": "0.0.1",
    "gulp-sass": "^1.2.2",
    "twitter-bootstrap-3.0.0": "^3.0.0",
    "browserify-transform-tools": "^1.2.1",
    "gulp-cssimport": "^1.3.1"
  },
  "bugs": "https://github.com/YASGUI/YASQE/issues/",
  "keywords": [
    "JavaScript",
    "SPARQL",
    "Editor",
    "Semantic Web",
    "Linked Data"
  ],
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "web": "http://laurensrietveld.nl"
    }
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/YASGUI/YASQE.git"
  },
  "dependencies": {
    "jquery": "~ 1.11.0",
    "codemirror": "^4.7.0",
    "yasgui-utils": "^1.4.1"
  },
  "optionalShim": {
    "codemirror": {
      "require": "codemirror",
      "global": "CodeMirror"
    },
    "jquery": {
      "require": "jquery",
      "global": "jQuery"
    },
    "../../lib/codemirror": {
      "require": "codemirror",
      "global": "CodeMirror"
    }
  }
}

},{}],25:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})(),
	utils = require('../utils.js'),
	yutils = require('yasgui-utils'),
	Trie = require('../../lib/trie.js');

module.exports = function(YASQE, yasqe) {
	var completionNotifications = {};
	var completers = {};
	var tries = {};
	
	yasqe.on('cursorActivity', function(yasqe, eventInfo) {
		autoComplete(true);
	});
	yasqe.on('change', function() {
		var needPossibleAdjustment = [];
		for (var notificationName in completionNotifications) {
			if (completionNotifications[notificationName].is(':visible')) {
				needPossibleAdjustment.push(completionNotifications[notificationName]);
			}
		}
		if (needPossibleAdjustment.length > 0) {
			//position completion notifications
			var scrollBar = $(yasqe.getWrapperElement()).find(".CodeMirror-vscrollbar");
			var offset = 0;
			if (scrollBar.is(":visible")) {
				offset = scrollBar.outerWidth();
			}
			needPossibleAdjustment.forEach(function(notification){notification.css("right", offset)});
		}
	});

	

	/**
	 * Store bulk completions in memory as trie, and store these in localstorage as well (if enabled)
	 * 
	 * @method doc.storeBulkCompletions
	 * @param completions {array}
	 */
	var storeBulkCompletions = function(completer, completions) {
		// store array as trie
		tries[completer.name] = new Trie();
		for (var i = 0; i < completions.length; i++) {
			tries[completer.name].insert(completions[i]);
		}
		// store in localstorage as well
		var storageId = utils.getPersistencyId(yasqe, completer.persistent);
		if (storageId) yutils.storage.set(storageId, completions, "month");
	};
	
	var initCompleter = function(name, completionInit) {
		var completer = completers[name] = new completionInit(yasqe, name);
		completer.name = name;
		if (completer.bulk) {
			var storeArrayAsBulk = function(suggestions) {
				if (suggestions && suggestions instanceof Array && suggestions.length > 0) {
					storeBulkCompletions(completer, suggestions);
				}
			}
			if (completer.get instanceof Array) {
				// we don't care whether the completions are already stored in
				// localstorage. just use this one
				storeArrayAsBulk(completer.get);
			} else {
				// if completions are defined in localstorage, use those! (calling the
				// function may come with overhead (e.g. async calls))
				var completionsFromStorage = null;
				var persistencyIdentifier = utils.getPersistencyId(yasqe, completer.persistent);
				if (persistencyIdentifier)
					completionsFromStorage = yutils.storage.get(persistencyIdentifier);
				if (completionsFromStorage && completionsFromStorage.length > 0) {
					storeArrayAsBulk(completionsFromStorage);
				} else {
					// nothing in storage. check whether we have a function via which we
					// can get our prefixes
					if (completer.get instanceof Function) {
						if (completer.async) {
							completer.get(null, storeArrayAsBulk);
						} else {
							storeArrayAsBulk(completer.get());
						}
					}
				}
			}
		}
	};

	var autoComplete = function(fromAutoShow) {
		if (yasqe.somethingSelected())
			return;
		var tryHintType = function(completer) {
			if (fromAutoShow // from autoShow, i.e. this gets called each time the editor content changes
					&& (!completer.autoShow // autoshow for  this particular type of autocompletion is -not- enabled
					|| (!completer.bulk && completer.async)) // async is enabled (don't want to re-do ajax-like request for every editor change)
			) {
				return false;
			}

			var hintConfig = {
				closeCharacters : /(?=a)b/,
				completeSingle: false
			};
			if (!completer.bulk && completer.async) {
				hintConfig.async = true;
			}
			var wrappedHintCallback = function(yasqe, callback) {
				return getCompletionHintsObject(completer, callback);
			};
			var result = YASQE.showHint(yasqe, wrappedHintCallback, hintConfig);
			return true;
		};
		for ( var completerName in completers) {
			if ($.inArray(completerName, yasqe.options.autocompleters) == -1) continue;//this completer is disabled
			var completer = completers[completerName];
			if (!completer.isValidCompletionPosition) continue; //no way to check whether we are in a valid position
			
			if (!completer.isValidCompletionPosition()) {
				//if needed, fire callbacks for when we are -not- in valid completion position
				if (completer.callbacks && completer.callbacks.invalidPosition) {
					completer.callbacks.invalidPosition(yasqe, completer);
				}
				//not in a valid position, so continue to next completion candidate type
				continue;
			}
			// run valid position handler, if there is one (if it returns false, stop the autocompletion!)
			if (completer.callbacks && completer.callbacks.validPosition) {
				if (completer.callbacks.validPosition(yasqe, completer) === false)
					continue;
			}
			var success = tryHintType(completer);
			if (success)
				break;
		}
	};
	
	

	var getCompletionHintsObject = function(completer, callback) {
		var getSuggestionsFromToken = function(partialToken) {
			var stringToAutocomplete = partialToken.autocompletionString || partialToken.string;
			var suggestions = [];
			if (tries[completer.name]) {
				suggestions = tries[completer.name].autoComplete(stringToAutocomplete);
			} else if (typeof completer.get == "function" && completer.async == false) {
				suggestions = completer.get(stringToAutocomplete);
			} else if (typeof completer.get == "object") {
				var partialTokenLength = stringToAutocomplete.length;
				for (var i = 0; i < completer.get.length; i++) {
					var completion = completer.get[i];
					if (completion.slice(0, partialTokenLength) == stringToAutocomplete) {
						suggestions.push(completion);
					}
				}
			}
			return getSuggestionsAsHintObject(suggestions, completer, partialToken);
			
		};
		
		
		var token = yasqe.getCompleteToken();
		if (completer.preProcessToken) {
			token = completer.preProcessToken(token);
		}
		
		if (token) {
			// use custom completionhint function, to avoid reaching a loop when the
			// completionhint is the same as the current token
			// regular behaviour would keep changing the codemirror dom, hence
			// constantly calling this callback
			if (!completer.bulk && completer.async) {
				var wrappedCallback = function(suggestions) {
					callback(getSuggestionsAsHintObject(suggestions, completer, token));
				};
				completer.get(token, wrappedCallback);
			} else {
				return getSuggestionsFromToken(token);

			}
		}
	};
	

	/**
	 *  get our array of suggestions (strings) in the codemirror hint format
	 */
	var getSuggestionsAsHintObject = function(suggestions, completer, token) {
		var hintList = [];
		for (var i = 0; i < suggestions.length; i++) {
			var suggestedString = suggestions[i];
			if (completer.postProcessToken) {
				suggestedString = completer.postProcessToken(token, suggestedString);
			}
			hintList.push({
				text : suggestedString,
				displayText : suggestedString,
				hint : selectHint,
			});
		}
		
		var cur = yasqe.getCursor();
		var returnObj = {
			completionToken : token.string,
			list : hintList,
			from : {
				line : cur.line,
				ch : token.start
			},
			to : {
				line : cur.line,
				ch : token.end
			}
		};
		//if we have some autocompletion handlers specified, add these these to the object. Codemirror will take care of firing these
		if (completer.callbacks) {
			for ( var callbackName in completer.callbacks) {
				if (completer.callbacks[callbackName]) 
					yasqe.on(returnObj, callbackName, completer.callbacks[callbackName]);
			}
		}
		return returnObj;
	};
	
	return {
		init: initCompleter,
		completers: completers,
		notifications: {
			getEl: function(completer) {
				return $(completionNotifications[completer.name]);
			},
			show: function(yasqe, completer) {
				//only draw when the user needs to use a keypress to summon autocompletions
				if (!completer.autoshow) {
					if (!completionNotifications[completer.name]) completionNotifications[completer.name] = $("<div class='completionNotification'></div>");
					completionNotifications[completer.name]
						.show()
						.text("Press " + (navigator.userAgent.indexOf('Mac OS X') != -1? "CMD": "CTRL") + " - <spacebar> to autocomplete")
						.appendTo($(yasqe.getWrapperElement()));
				}
			},
			hide: function(yasqe, completer) {
				if (completionNotifications[completer.name]) {
					completionNotifications[completer.name].hide();
				}
			}
			
		},
		autoComplete: autoComplete,
		getTrie: function(completer) {return (typeof completer == "string"? tries[completer]: tries[completer.name]);}
	}
};













/**
 * function which fires after the user selects a completion. this function checks whether we actually need to store this one (if completion is same as current token, don't do anything)
 */
var selectHint = function(yasqe, data, completion) {
	if (completion.text != yasqe.getTokenAt(yasqe.getCursor()).string) {
		yasqe.replaceRange(completion.text, data.from, data.to);
	}
};





//
//module.exports = {
//	preprocessPrefixTokenForCompletion: preprocessPrefixTokenForCompletion,
//	postprocessResourceTokenForCompletion: postprocessResourceTokenForCompletion,
//	preprocessResourceTokenForCompletion: preprocessResourceTokenForCompletion,
//	showCompletionNotification: showCompletionNotification,
//	hideCompletionNotification: hideCompletionNotification,
//	autoComplete: autoComplete,
//	autocompleteVariables: autocompleteVariables,
//	fetchFromPrefixCc: fetchFromPrefixCc,
//	fetchFromLov: fetchFromLov,
////	storeBulkCompletions: storeBulkCompletions,
//	loadBulkCompletions: loadBulkCompletions,
//};

},{"../../lib/trie.js":9,"../utils.js":38,"jquery":undefined,"yasgui-utils":21}],26:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
module.exports = function(yasqe, name) {
	return {
		isValidCompletionPosition : function(){return module.exports.isValidCompletionPosition(yasqe);},
		get : function(token, callback) {
			return require('./utils').fetchFromLov(yasqe, this, token, callback);
		},
		preProcessToken: function(token) {return module.exports.preProcessToken(yasqe, token)},
		postProcessToken: function(token, suggestedString) {return module.exports.postProcessToken(yasqe, token, suggestedString);},
		async : true,
		bulk : false,
		autoShow : false,
		persistent : name,
		callbacks : {
			validPosition : yasqe.autocompleters.notifications.show,
			invalidPosition : yasqe.autocompleters.notifications.hide,
		}
	}
};

module.exports.isValidCompletionPosition = function(yasqe) {
	var token = yasqe.getCompleteToken();
	if (token.string.indexOf("?") == 0)
		return false;
	var cur = yasqe.getCursor();
	var previousToken = yasqe.getPreviousNonWsToken(cur.line, token);
	if (previousToken.string == "a")
		return true;
	if (previousToken.string == "rdf:type")
		return true;
	if (previousToken.string == "rdfs:domain")
		return true;
	if (previousToken.string == "rdfs:range")
		return true;
	return false;
};
module.exports.preProcessToken = function(yasqe, token) {
	return require('./utils.js').preprocessResourceTokenForCompletion(yasqe, token);
};
module.exports.postProcessToken = function(yasqe, token, suggestedString) {
	return require('./utils.js').postprocessResourceTokenForCompletion(yasqe, token, suggestedString)
};
},{"./utils":29,"./utils.js":29,"jquery":undefined}],27:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
//this is a mapping from the class names (generic ones, for compatability with codemirror themes), to what they -actually- represent
var tokenTypes = {
	"string-2" : "prefixed",
	"atom": "var"
};

module.exports = function(yasqe, completerName) {
	//this autocompleter also fires on-change!
	yasqe.on("change", function() {
		module.exports.appendPrefixIfNeeded(yasqe, completerName);
	});
	
	
	return {
		isValidCompletionPosition : function(){return module.exports.isValidCompletionPosition(yasqe);},
		get : function(token, callback) {
			$.get("http://prefix.cc/popular/all.file.json", function(data) {
				var prefixArray = [];
				for ( var prefix in data) {
					if (prefix == "bif")
						continue;// skip this one! see #231
					var completeString = prefix + ": <" + data[prefix] + ">";
					prefixArray.push(completeString);// the array we want to store in localstorage
				}
				
				prefixArray.sort();
				callback(prefixArray);
			});
		},
		preProcessToken: function(token) {return module.exports.preprocessPrefixTokenForCompletion(yasqe, token)},
		async : true,
		bulk : true,
		autoShow: true,
		persistent : completerName,
	};
};
module.exports.isValidCompletionPosition = function(yasqe) {
	var cur = yasqe.getCursor(), token = yasqe.getTokenAt(cur);

	// not at end of line
	if (yasqe.getLine(cur.line).length > cur.ch)
		return false;

	if (token.type != "ws") {
		// we want to complete token, e.g. when the prefix starts with an a
		// (treated as a token in itself..)
		// but we to avoid including the PREFIX tag. So when we have just
		// typed a space after the prefix tag, don't get the complete token
		token = yasqe.getCompleteToken();
	}

	// we shouldnt be at the uri part the prefix declaration
	// also check whether current token isnt 'a' (that makes codemirror
	// thing a namespace is a possiblecurrent
	if (!token.string.indexOf("a") == 0
			&& $.inArray("PNAME_NS", token.state.possibleCurrent) == -1)
		return false;

	// First token of line needs to be PREFIX,
	// there should be no trailing text (otherwise, text is wrongly inserted
	// in between)
	var previousToken = yasqe.getPreviousNonWsToken(cur.line, token);
	if (!previousToken || previousToken.string.toUpperCase() != "PREFIX") return false;
	return true;
};
module.exports.preprocessPrefixTokenForCompletion = function(yasqe, token) {
	var previousToken = yasqe.getPreviousNonWsToken(yasqe.getCursor().line, token);
	if (previousToken && previousToken.string && previousToken.string.slice(-1) == ":") {
		//combine both tokens! In this case we have the cursor at the end of line "PREFIX bla: <".
		//we want the token to be "bla: <", en not "<"
		token = {
			start: previousToken.start,
			end: token.end,
			string: previousToken.string + " " + token.string,
			state: token.state
		};
	}
	return token;
};
/**
 * Check whether typed prefix is declared. If not, automatically add declaration
 * using list from prefix.cc
 * 
 * @param yasqe
 */
module.exports.appendPrefixIfNeeded = function(yasqe, completerName) {
	if (!yasqe.autocompleters.getTrie(completerName))
		return;// no prefixed defined. just stop
	if (!yasqe.options.autocompleters || yasqe.options.autocompleters.indexOf(completerName) == -1) return;//this autocompleter is disabled
	var cur = yasqe.getCursor();

	var token = yasqe.getTokenAt(cur);
	if (tokenTypes[token.type] == "prefixed") {
		var colonIndex = token.string.indexOf(":");
		if (colonIndex !== -1) {
			// check previous token isnt PREFIX, or a '<'(which would mean we are in a uri)
//			var firstTokenString = yasqe.getNextNonWsToken(cur.line).string.toUpperCase();
			var lastNonWsTokenString = yasqe.getPreviousNonWsToken(cur.line, token).string.toUpperCase();
			var previousToken = yasqe.getTokenAt({
				line : cur.line,
				ch : token.start
			});// needs to be null (beginning of line), or whitespace
			if (lastNonWsTokenString != "PREFIX"
					&& (previousToken.type == "ws" || previousToken.type == null)) {
				// check whether it isnt defined already (saves us from looping
				// through the array)
				var currentPrefix = token.string.substring(0, colonIndex + 1);
				var queryPrefixes = yasqe.getPrefixesFromQuery();
				if (queryPrefixes[currentPrefix.slice(0,-1)] == null) {
					// ok, so it isnt added yet!
					var completions = yasqe.autocompleters.getTrie(completerName).autoComplete(currentPrefix);
					if (completions.length > 0) {
						yasqe.addPrefixes(completions[0]);
					}
				}
			}
		}
	}
};


},{"jquery":undefined}],28:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
module.exports = function(yasqe, name) {
	return {
		isValidCompletionPosition : function(){return module.exports.isValidCompletionPosition(yasqe);},
		get : function(token, callback) {
			return require('./utils').fetchFromLov(yasqe, this, token, callback);
		},
		preProcessToken: function(token) {return module.exports.preProcessToken(yasqe, token)},
		postProcessToken: function(token, suggestedString) {return module.exports.postProcessToken(yasqe, token, suggestedString);},
		async : true,
		bulk : false,
		autoShow : false,
		persistent : name,
		callbacks : {
			validPosition : yasqe.autocompleters.notifications.show,
			invalidPosition : yasqe.autocompleters.notifications.hide,
		}
	}
};

module.exports.isValidCompletionPosition = function(yasqe) {
	var token = yasqe.getCompleteToken();
	if (token.string.length == 0) 
		return false; //we want -something- to autocomplete
	if (token.string.indexOf("?") == 0)
		return false; // we are typing a var
	if ($.inArray("a", token.state.possibleCurrent) >= 0)
		return true;// predicate pos
	var cur = yasqe.getCursor();
	var previousToken = yasqe.getPreviousNonWsToken(cur.line, token);
	if (previousToken.string == "rdfs:subPropertyOf")
		return true;

	// hmm, we would like -better- checks here, e.g. checking whether we are
	// in a subject, and whether next item is a rdfs:subpropertyof.
	// difficult though... the grammar we use is unreliable when the query
	// is invalid (i.e. during typing), and often the predicate is not typed
	// yet, when we are busy writing the subject...
	return false;
};
module.exports.preProcessToken = function(yasqe, token) {
	return require('./utils.js').preprocessResourceTokenForCompletion(yasqe, token);
};
module.exports.postProcessToken = function(yasqe, token, suggestedString) {
	return require('./utils.js').postprocessResourceTokenForCompletion(yasqe, token, suggestedString)
};
},{"./utils":29,"./utils.js":29,"jquery":undefined}],29:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})(),
	utils = require('./utils.js'),
	yutils = require('yasgui-utils');
/**
 * Where the base class only contains functionality related to -all- completions, this class contains some utils used here and there in our autocompletions
 */



/**
 * Converts rdf:type to http://.../type and converts <http://...> to http://...
 * Stores additional info such as the used namespace and prefix in the token object
 */
var preprocessResourceTokenForCompletion = function(yasqe, token) {
	var queryPrefixes = yasqe.getPrefixesFromQuery();
	if (!token.string.indexOf("<") == 0) {
		token.tokenPrefix = token.string.substring(0,	token.string.indexOf(":") + 1);

		if (queryPrefixes[token.tokenPrefix.slice(0,-1)] != null) {
			token.tokenPrefixUri = queryPrefixes[token.tokenPrefix.slice(0,-1)];
		}
	}

	token.autocompletionString = token.string.trim();
	if (!token.string.indexOf("<") == 0 && token.string.indexOf(":") > -1) {
		// hmm, the token is prefixed. We still need the complete uri for autocompletions. generate this!
		for (var prefix in queryPrefixes) {
			if (token.string.indexOf(prefix) == 0) {
				token.autocompletionString = queryPrefixes[prefix];
				token.autocompletionString += token.string.substring(prefix.length + 1);
				break;
			}
		}
	}

	if (token.autocompletionString.indexOf("<") == 0)	token.autocompletionString = token.autocompletionString.substring(1);
	if (token.autocompletionString.indexOf(">", token.length - 1) !== -1) token.autocompletionString = token.autocompletionString.substring(0,	token.autocompletionString.length - 1);
	return token;
};

var postprocessResourceTokenForCompletion = function(yasqe, token, suggestedString) {
	if (token.tokenPrefix && token.autocompletionString && token.tokenPrefixUri) {
		// we need to get the suggested string back to prefixed form
		suggestedString = token.tokenPrefix + suggestedString.substring(token.tokenPrefixUri.length);
	} else {
		// it is a regular uri. add '<' and '>' to string
		suggestedString = "<" + suggestedString + ">";
	}
	return suggestedString;
};

var fetchFromLov = function(yasqe, completer, token, callback) {
	if (!token || !token.string || token.string.trim().length == 0) {
		yasqe.autocompleters.notifications.getEl(completer)
			.empty()
			.append("Nothing to autocomplete yet!");
		return false;
	}
	var maxResults = 50;

	var args = {
		q : token.autocompletionString,
		page : 1
	};
	if (completer.name == "classes") {
		args.type = "class";
	} else {
		args.type = "property";
	}
	var results = [];
	var url = "";
	var updateUrl = function() {
		url = "http://lov.okfn.org/dataset/lov/api/v2/autocomplete/terms?"
				+ $.param(args);
	};
	updateUrl();
	var increasePage = function() {
		args.page++;
		updateUrl();
	};
	var doRequests = function() {
		$.get(
				url,
				function(data) {
					for (var i = 0; i < data.results.length; i++) {
						if ($.isArray(data.results[i].uri) && data.results[i].uri.length > 0) {
							results.push(data.results[i].uri[0]);
						} else {
							results.push(data.results[i].uri);
						}
						
					}
					if (results.length < data.total_results
							&& results.length < maxResults) {
						increasePage();
						doRequests();
					} else {
						//if notification bar is there, show feedback, or close
						if (results.length > 0) {
							yasqe.autocompleters.notifications.hide(yasqe, completer)
						} else {
							yasqe.autocompleters.notifications.getEl(completer).text("0 matches found...");
						}
						callback(results);
						// requests done! Don't call this function again
					}
				}).fail(function(jqXHR, textStatus, errorThrown) {
					yasqe.autocompleters.notifications.getEl(completer)
						.empty()
						.append("Failed fetching suggestions..");
					
		});
	};
	//if notification bar is there, show a loader
	yasqe.autocompleters.notifications.getEl(completer)
		.empty()
		.append($("<span>Fetchting autocompletions &nbsp;</span>"))
		.append($(yutils.svg.getElement(require('../imgs.js').loader, {width: "18px", height: "18px"})).css("vertical-align", "middle"));
	doRequests();
};



module.exports = {
	fetchFromLov: fetchFromLov,
	preprocessResourceTokenForCompletion: preprocessResourceTokenForCompletion,
	postprocessResourceTokenForCompletion: postprocessResourceTokenForCompletion,
};
},{"../imgs.js":32,"./utils.js":29,"jquery":undefined,"yasgui-utils":21}],30:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
module.exports = function(yasqe) {
	return {
		isValidCompletionPosition : function() {
			var token = yasqe.getTokenAt(yasqe.getCursor());
			if (token.type != "ws") {
				token = yasqe.getCompleteToken(token);
				if (token && token.string.indexOf("?") == 0) {
					return true;
				}
			}
			return false;
		},
		get : function(token) {
			if (token.trim().length == 0) return [];//nothing to autocomplete
			var distinctVars = {};
			//do this outside of codemirror. I expect jquery to be faster here (just finding dom elements with classnames)
			$(yasqe.getWrapperElement()).find(".cm-atom").each(function() {
				var variable = this.innerHTML;
				if (variable.indexOf("?") == 0) {
					//ok, lets check if the next element in the div is an atom as well. In that case, they belong together (may happen sometimes when query is not syntactically valid)
					var nextEl = $(this).next();
					var nextElClass = nextEl.attr('class');
					if (nextElClass && nextEl.attr('class').indexOf("cm-atom") >= 0) {
						variable += nextEl.text();			
					}
					
					//skip single questionmarks
					if (variable.length <= 1) return;
					
					//it should match our token ofcourse
					if (variable.indexOf(token) !== 0) return;
					
					//skip exact matches
					if (variable == token) return;
					
					//store in map so we have a unique list 
					distinctVars[variable] = true;
					
					
				}
			});
			var variables = [];
			for (var variable in distinctVars) {
				variables.push(variable);
			}
			variables.sort();
			return variables;
		},
		async : false,
		bulk : false,
		autoShow : true,
	}
};

},{"jquery":undefined}],31:[function(require,module,exports){
/**
 * The default options of YASQE (check the CodeMirror documentation for even
 * more options, such as disabling line numbers, or changing keyboard shortcut
 * keys). Either change the default options by setting YASQE.defaults, or by
 * passing your own options as second argument to the YASQE constructor
 */
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
module.exports = {
	use: function(YASQE) {
		YASQE.defaults = $.extend(true, {}, YASQE.defaults, {
				mode : "sparql11",
				/**
				 * Query string
				 */
				value : "SELECT * WHERE {\n  ?sub ?pred ?obj .\n} \nLIMIT 10",
				highlightSelectionMatches : {
					showToken : /\w/
				},
				tabMode : "indent",
				lineNumbers : true,
			    lineWrapping: true,
			    
			    foldGutter: {rangeFinder:YASQE.fold.brace },
			    gutters: [ "gutterErrorBar", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
//			    cell.code_mirror.setOption('foldGutter',{rangeFinder: new CodeMirror.fold.combine(CodeMirror.fold.firstline, CodeMirror.fold.brace) }); 
				matchBrackets : true,
				fixedGutter : true,
				syntaxErrorCheck: true,
				/**
				 * Extra shortcut keys. Check the CodeMirror manual on how to add your own
				 * 
				 * @property extraKeys
				 * @type object
				 */
				extraKeys : {
//					"Ctrl-Space" : function(yasqe) {
//						YASQE.autoComplete(yasqe);
//					},
					"Ctrl-Space" : YASQE.autoComplete,
					
					"Cmd-Space" : YASQE.autoComplete,
					"Ctrl-D" : YASQE.deleteLine,
					"Ctrl-K" : YASQE.deleteLine,
					"Cmd-D" : YASQE.deleteLine,
					"Cmd-K" : YASQE.deleteLine,
					"Ctrl-/" : YASQE.commentLines,
					"Cmd-/" : YASQE.commentLines,
					"Ctrl-Alt-Down" : YASQE.copyLineDown,
					"Ctrl-Alt-Up" : YASQE.copyLineUp,
					"Cmd-Alt-Down" : YASQE.copyLineDown,
					"Cmd-Alt-Up" : YASQE.copyLineUp,
					"Shift-Ctrl-F" : YASQE.doAutoFormat,
					"Shift-Cmd-F" : YASQE.doAutoFormat,
					"Ctrl-]" : YASQE.indentMore,
					"Cmd-]" : YASQE.indentMore,
					"Ctrl-[" : YASQE.indentLess,
					"Cmd-[" : YASQE.indentLess,
					"Ctrl-S" : YASQE.storeQuery,
					"Cmd-S" : YASQE.storeQuery,
					"Ctrl-Enter" : YASQE.executeQuery,
					"Cmd-Enter" : YASQE.executeQuery,
					"F11": function(yasqe) {
				          yasqe.setOption("fullScreen", !yasqe.getOption("fullScreen"));
			        },
			        "Esc": function(yasqe) {
			          if (yasqe.getOption("fullScreen")) yasqe.setOption("fullScreen", false);
			        }
				},
				cursorHeight : 0.9,

				
				/**
				 * Show a button with which users can create a link to this query. Set this value to null to disable this functionality.
				 * By default, this feature is enabled, and the only the query value is appended to the link.
				 * ps. This function should return an object which is parseable by jQuery.param (http://api.jquery.com/jQuery.param/)
				 */
				createShareLink: YASQE.createShareLink,
				
				/**
				 * Consume links shared by others, by checking the url for arguments coming from a query link. Defaults by only checking the 'query=' argument in the url
				 */
				consumeShareLink: YASQE.consumeShareLink,
				
				
				
				
				/**
				 * Change persistency settings for the YASQE query value. Setting the values
				 * to null, will disable persistancy: nothing is stored between browser
				 * sessions Setting the values to a string (or a function which returns a
				 * string), will store the query in localstorage using the specified string.
				 * By default, the ID is dynamically generated using the closest dom ID, to avoid collissions when using multiple YASQE items on one
				 * page
				 * 
				 * @type function|string
				 */
				persistent : function(yasqe) {
					return "queryVal_" + $(yasqe.getWrapperElement()).closest('[id]').attr('id');
				},

				
				/**
				 * Settings for querying sparql endpoints
				 */
				sparql : {
					showQueryButton: false,
					
					/**f
					 * Endpoint to query
					 * 
					 * @property sparql.endpoint
					 * @type String|function
					 */
					endpoint : "http://dbpedia.org/sparql",
					/**
					 * Request method via which to access SPARQL endpoint
					 * 
					 * @property sparql.requestMethod
					 * @type String|function
					 */
					requestMethod : "POST",
					
					/**
					 * @type String|function
					 */
					acceptHeaderGraph: "text/turtle,*/*;q=0.9",
					/**
					 * @type String|function
					 */
					acceptHeaderSelect: "application/sparql-results+json,*/*;q=0.9",
					/**
					 * @type String|function
					 */
					acceptHeaderUpdate: "text/plain,*/*;q=0.9",
					
					/**
					 * Named graphs to query.
					 */
					namedGraphs : [],
					/**
					 * Default graphs to query.
					 */
					defaultGraphs : [],

					/**
					 * Additional request arguments. Add them in the form: {name: "name", value: "value"}
					 */
					args : [],

					/**
					 * Additional request headers
					 */
					headers : {},
					
					/**
					 * Set of ajax callbacks
					 */
					callbacks : {
						beforeSend : null,
						complete : null,
						error : null,
						success : null
					},
					handlers: {}//keep here for backwards compatability
				},
			});
	}
};

},{"jquery":undefined}],32:[function(require,module,exports){
'use strict';
module.exports = {
	loader: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%" fill="black">  <circle cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(45 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.125s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(90 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.25s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(135 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.375s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(180 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(225 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.625s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(270 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.75s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(315 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.875s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(180 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle></svg>',
	query: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 80 80" enable-background="new 0 0 80 80" xml:space="preserve"><g ></g><g >	<path d="M64.622,2.411H14.995c-6.627,0-12,5.373-12,12v49.897c0,6.627,5.373,12,12,12h49.627c6.627,0,12-5.373,12-12V14.411   C76.622,7.783,71.249,2.411,64.622,2.411z M24.125,63.906V15.093L61,39.168L24.125,63.906z"/></g></svg>',
	queryInvalid: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 73.627 73.897"   enable-background="new 0 0 80 80"   xml:space="preserve"   ><g transform="translate(-2.995,-2.411)" /><g       transform="translate(-2.995,-2.411)"><path       d="M 64.622,2.411 H 14.995 c -6.627,0 -12,5.373 -12,12 v 49.897 c 0,6.627 5.373,12 12,12 h 49.627 c 6.627,0 12,-5.373 12,-12 V 14.411 c 0,-6.628 -5.373,-12 -12,-12 z M 24.125,63.906 V 15.093 L 61,39.168 24.125,63.906 z"         inkscape:connector-curvature="0" /></g><g     transform="matrix(0.76805408,0,0,0.76805408,-0.90231954,-2.0060895)"  ><path       style="fill:#c02608;fill-opacity:1"       inkscape:connector-curvature="0"       d="m 88.184,81.468 c 1.167,1.167 1.167,3.075 0,4.242 l -2.475,2.475 c -1.167,1.167 -3.076,1.167 -4.242,0 l -69.65,-69.65 c -1.167,-1.167 -1.167,-3.076 0,-4.242 l 2.476,-2.476 c 1.167,-1.167 3.076,-1.167 4.242,0 l 69.649,69.651 z"       /></g><g     transform="matrix(0.76805408,0,0,0.76805408,-0.90231954,-2.0060895)"  ><path       style="fill:#c02608;fill-opacity:1"       inkscape:connector-curvature="0"       d="m 18.532,88.184 c -1.167,1.166 -3.076,1.166 -4.242,0 l -2.475,-2.475 c -1.167,-1.166 -1.167,-3.076 0,-4.242 l 69.65,-69.651 c 1.167,-1.167 3.075,-1.167 4.242,0 l 2.476,2.476 c 1.166,1.167 1.166,3.076 0,4.242 l -69.651,69.65 z"    /></g></svg>',
	download: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="tiny" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" xml:space="preserve"><g ></g><g >	<path fill-rule="evenodd" fill="#000000" d="M88,84v-2c0-2.961-0.859-4-4-4H16c-2.961,0-4,0.98-4,4v2c0,3.102,1.039,4,4,4h68   C87.02,88,88,87.039,88,84z M58,12H42c-5,0-6,0.941-6,6v22H16l34,34l34-34H64V18C64,12.941,62.939,12,58,12z"/></g></svg>',
	share: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"  x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" style="enable-background:new 0 0 100 100;" xml:space="preserve"><path d="M36.764,50c0,0.308-0.07,0.598-0.088,0.905l32.247,16.119c2.76-2.338,6.293-3.797,10.195-3.797  C87.89,63.228,95,70.338,95,79.109C95,87.89,87.89,95,79.118,95c-8.78,0-15.882-7.11-15.882-15.891c0-0.316,0.07-0.598,0.088-0.905  L31.077,62.085c-2.769,2.329-6.293,3.788-10.195,3.788C12.11,65.873,5,58.771,5,50c0-8.78,7.11-15.891,15.882-15.891  c3.902,0,7.427,1.468,10.195,3.797l32.247-16.119c-0.018-0.308-0.088-0.598-0.088-0.914C63.236,12.11,70.338,5,79.118,5  C87.89,5,95,12.11,95,20.873c0,8.78-7.11,15.891-15.882,15.891c-3.911,0-7.436-1.468-10.195-3.806L36.676,49.086  C36.693,49.394,36.764,49.684,36.764,50z"/></svg>',
	warning: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   x="0px"   y="0px"   viewBox="0 0 66.399998 66.399998"   enable-background="new 0 0 69.3 69.3"   xml:space="preserve"   height="100%"   width="100%"   inkscape:version="0.48.4 r9939"   ><g      transform="translate(-1.5,-1.5)"     style="fill:#ff0000"><path       d="M 34.7,1.5 C 16.4,1.5 1.5,16.4 1.5,34.7 1.5,53 16.4,67.9 34.7,67.9 53,67.9 67.9,53 67.9,34.7 67.9,16.4 53,1.5 34.7,1.5 z m 0,59.4 C 20.2,60.9 8.5,49.1 8.5,34.7 8.5,20.2 20.3,8.5 34.7,8.5 c 14.4,0 26.2,11.8 26.2,26.2 0,14.4 -11.8,26.2 -26.2,26.2 z"      inkscape:connector-curvature="0"       style="fill:#ff0000" /><path       d="m 34.6,47.1 c -1.4,0 -2.5,0.5 -3.5,1.5 -0.9,1 -1.4,2.2 -1.4,3.6 0,1.6 0.5,2.8 1.5,3.8 1,0.9 2.1,1.3 3.4,1.3 1.3,0 2.4,-0.5 3.4,-1.4 1,-0.9 1.5,-2.2 1.5,-3.7 0,-1.4 -0.5,-2.6 -1.4,-3.6 -0.9,-1 -2.1,-1.5 -3.5,-1.5 z"       inkscape:connector-curvature="0"       style="fill:#ff0000" /><path       d="m 34.8,13.9 c -1.5,0 -2.8,0.5 -3.7,1.6 -0.9,1 -1.4,2.4 -1.4,4.2 0,1.1 0.1,2.9 0.2,5.6 l 0.8,13.1 c 0.2,1.8 0.4,3.2 0.9,4.1 0.5,1.2 1.5,1.8 2.9,1.8 1.3,0 2.3,-0.7 2.9,-1.9 0.5,-1 0.7,-2.3 0.9,-4 L 39.4,25 c 0.1,-1.3 0.2,-2.5 0.2,-3.8 0,-2.2 -0.3,-3.9 -0.8,-5.1 -0.5,-1 -1.6,-2.2 -4,-2.2 z"       inkscape:connector-curvature="0"       style="fill:#ff0000" /></g></svg>',
};

},{}],33:[function(require,module,exports){
'use strict';
//make sure any console statements
window.console = window.console || {"log":function(){}};

/**
 * Load libraries
 */
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})(),
	CodeMirror = (function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})(),
	sparql = require('./sparql.js'),
	utils = require('./utils.js'),
	yutils = require('yasgui-utils'),
	imgs = require('./imgs.js');

require("../lib/deparam.js");
require('codemirror/addon/fold/foldcode.js');
require('codemirror/addon/fold/foldgutter.js');
require('codemirror/addon/fold/xml-fold.js');
require('codemirror/addon/fold/brace-fold.js');
require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/search/searchcursor.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/runmode/runmode.js');
require('codemirror/addon/display/fullscreen.js');
require('../lib/flint.js');



/**
 * Main YASQE constructor. Pass a DOM element as argument to append the editor to, and (optionally) pass along config settings (see the YASQE.defaults object below, as well as the regular CodeMirror documentation, for more information on configurability)
 * 
 * @constructor
 * @param {DOM-Element} parent element to append editor to.
 * @param {object} settings
 * @class YASQE
 * @return {doc} YASQE document
 */
var root = module.exports = function(parent, config) {
	var rootEl = $("<div>", {class:'yasqe'}).appendTo($(parent));
	config = extendConfig(config);
	var yasqe = extendCmInstance(CodeMirror(rootEl[0], config));
	postProcessCmElement(yasqe);
	return yasqe;
};

/**
 * Extend config object, which we will pass on to the CM constructor later on.
 * Need this, to make sure our own 'onBlur' etc events do not get overwritten by
 * people who add their own onblur events to the config Additionally, need this
 * to include the CM defaults ourselves. CodeMirror has a method for including
 * defaults, but we can't rely on that one: it assumes flat config object, where
 * we have nested objects (e.g. the persistency option)
 * 
 * @private
 */
var extendConfig = function(config) {
	var extendedConfig = $.extend(true, {}, root.defaults, config);
	// I know, codemirror deals with  default options as well. 
	//However, it does not do this recursively (i.e. the persistency option)
	
	return extendedConfig;
};
/**
 * Add extra functions to the CM document (i.e. the codemirror instantiated
 * object)
 * 
 * @private
 */
var extendCmInstance = function(yasqe) {
	//instantiate autocompleters
	yasqe.autocompleters = require('./autocompleters/autocompleterBase.js')(root, yasqe);
	if (yasqe.options.autocompleters) {
		yasqe.options.autocompleters.forEach(function(name) {
			if (root.Autocompleters[name]) yasqe.autocompleters.init(name,root.Autocompleters[name]);
		})
	}
	
	yasqe.getCompleteToken = function(token, cur) {
		return require('./tokenUtils.js').getCompleteToken(yasqe, token, cur);
	};
	yasqe.getPreviousNonWsToken = function(line, token) {
		return require('./tokenUtils.js').getPreviousNonWsToken(yasqe, line, token);
	};
	yasqe.getNextNonWsToken = function(lineNumber, charNumber) {
		return require('./tokenUtils.js').getNextNonWsToken(yasqe, lineNumber, charNumber);
	};

	/**
	 * Execute query. Pass a callback function, or a configuration object (see
	 * default settings below for possible values) I.e., you can change the
	 * query configuration by either changing the default settings, changing the
	 * settings of this document, or by passing query settings to this function
	 * 
	 * @method doc.query
	 * @param function|object
	 */
	yasqe.query = function(callbackOrConfig) {
		root.executeQuery(yasqe, callbackOrConfig);
	};
	
	/**
	 * Fetch defined prefixes from query string
	 * 
	 * @method doc.getPrefixesFromQuery
	 * @return object
	 */
	yasqe.getPrefixesFromQuery = function() {
		return require('./prefixUtils.js').getPrefixesFromQuery(yasqe);
	};
	
	yasqe.addPrefixes = function(prefixes) {
		return require('./prefixUtils.js').addPrefixes(yasqe, prefixes);
	};
	yasqe.removePrefixes = function(prefixes) {
		return require('./prefixUtils.js').removePrefixes(yasqe, prefixes);
	};
	/**
	 * Fetch the query type (e.g., SELECT||DESCRIBE||INSERT||DELETE||ASK||CONSTRUCT)
	 * 
	 * @method doc.getQueryType
	 * @return string
	 * 
	 */
	 yasqe.getQueryType = function() {
		 return yasqe.queryType;
	 };
	/**
	 * Fetch the query mode: 'query' or 'update'
	 * 
	 * @method doc.getQueryMode
	 * @return string
	 * 
	 */
	 yasqe.getQueryMode = function() {
		 var type = yasqe.getQueryType();
		 if (type=="INSERT" || type=="DELETE" || type=="LOAD" || type=="CLEAR" || type=="CREATE" || type=="DROP" || type=="COPY" || type=="MOVE" || type=="ADD") {
			 return "update";
		 } else {
			 return "query";
		 }
				
	 };
	
	yasqe.setCheckSyntaxErrors = function(isEnabled) {
		yasqe.options.syntaxErrorCheck = isEnabled;
		checkSyntax(yasqe);
	};
	
	yasqe.enableCompleter = function(name) {
		addCompleterToSettings(yasqe.options, name);
		if (root.Autocompleters[name]) yasqe.autocompleters.init(name,root.Autocompleters[name]);
	};
	yasqe.disableCompleter = function(name) {
		removeCompleterFromSettings(yasqe.options, name);
	};
	return yasqe;
};

var addCompleterToSettings = function(settings, name) {
	if (!settings.autocompleters) settings.autocompleters = [];
	settings.autocompleters.push(name);
};
var removeCompleterFromSettings = function(settings, name) {
	if (typeof settings.autocompleters == "object") {
		var index = $.inArray(name, settings.autocompleters);
		if (index>=0) {
			settings.autocompleters.splice(index, 1);
			removeCompleterFromSettings(settings, name);//just in case. suppose 1 completer is listed twice
		}
	}
};
var postProcessCmElement = function(yasqe) {
	/**
	 * Set doc value
	 */
	var storageId = utils.getPersistencyId(yasqe, yasqe.options.persistent);
	if (storageId) {
		var valueFromStorage = yutils.storage.get(storageId);
		if (valueFromStorage)
			yasqe.setValue(valueFromStorage);
	}
	
	root.drawButtons(yasqe);

	/**
	 * Add event handlers
	 */
	yasqe.on('blur', function(yasqe, eventInfo) {
		root.storeQuery(yasqe);
	});
	yasqe.on('change', function(yasqe, eventInfo) {
		checkSyntax(yasqe);
		root.updateQueryButton(yasqe);
		root.positionButtons(yasqe);
	});
	
	yasqe.on('cursorActivity', function(yasqe, eventInfo) {
		updateButtonsTransparency(yasqe);
	});
	yasqe.prevQueryValid = false;
	checkSyntax(yasqe);// on first load, check as well (our stored or default query might be incorrect)
	root.positionButtons(yasqe);
	
	/**
	 * check url args and modify yasqe settings if needed
	 */
	if (yasqe.options.consumeShareLink) {
		var urlParams = $.deparam(window.location.search.substring(1));
		yasqe.options.consumeShareLink(yasqe, urlParams);
	}
};




/**
 * Update transparency of buttons. Increase transparency when cursor is below buttons
 */

var updateButtonsTransparency = function(yasqe) {
	yasqe.cursor = $(".CodeMirror-cursor");
	if (yasqe.buttons && yasqe.buttons.is(":visible") && yasqe.cursor.length > 0) {
		if (utils.elementsOverlap(yasqe.cursor, yasqe.buttons)) {
			yasqe.buttons.find("svg").attr("opacity", "0.2");
		} else {
			yasqe.buttons.find("svg").attr("opacity", "1.0");
		}
	}
};









var clearError = null;
var checkSyntax = function(yasqe, deepcheck) {
	
	yasqe.queryValid = true;
	if (clearError) {
		clearError();
		clearError = null;
	}
	yasqe.clearGutter("gutterErrorBar");
	
	var state = null;
	for (var l = 0; l < yasqe.lineCount(); ++l) {
		var precise = false;
		if (!yasqe.prevQueryValid) {
			// we don't want cached information in this case, otherwise the
			// previous error sign might still show up,
			// even though the syntax error might be gone already
			precise = true;
		}
		
		var token = yasqe.getTokenAt({
			line : l,
			ch : yasqe.getLine(l).length
		}, precise);
		var state = token.state;
		yasqe.queryType = state.queryType;
		if (state.OK == false) {
			if (!yasqe.options.syntaxErrorCheck) {
				//the library we use already marks everything as being an error. Overwrite this class attribute.
				$(yasqe.getWrapperElement).find(".sp-error").css("color", "black");
				//we don't want to gutter error, so return
				return;
			}
			
			var warningEl = yutils.svg.getElement(imgs.warning, {width: "15px", height: "15px"});
			if (state.possibleCurrent && state.possibleCurrent.length > 0) {
				warningEl.style.zIndex = "99999999";
				require('./tooltip')(yasqe, warningEl, function() {
					var expectedEncoded = [];
					state.possibleCurrent.forEach(function(expected){
						expectedEncoded.push("<strong style='text-decoration:underline'>" + $("<div/>").text(expected).html() + "</strong>");
					});
					return "This line is invalid. Expected: " + expectedEncoded.join(", ");
				});
			}
			warningEl.style.marginTop = "2px";
			warningEl.style.marginLeft = "2px";
			yasqe.setGutterMarker(l, "gutterErrorBar", warningEl);
			clearError = function() {
				yasqe.markText({
					line : l,
					ch : state.errorStartPos
				}, {
					line : l,
					ch : state.errorEndPos
				}, "sp-error");
			};
			yasqe.queryValid = false;
			break;
		}
	}
	yasqe.prevQueryValid = yasqe.queryValid;
	if (deepcheck) {
		if (state != null && state.stack != undefined) {
			var stack = state.stack, len = state.stack.length;
			// Because incremental parser doesn't receive end-of-input
			// it can't clear stack, so we have to check that whatever
			// is left on the stack is nillable
			if (len > 1)
				yasqe.queryValid = false;
			else if (len == 1) {
				if (stack[0] != "solutionModifier"
						&& stack[0] != "?limitOffsetClauses"
						&& stack[0] != "?offsetClause")
					yasqe.queryValid = false;
			}
		}
	}
};
/**
 * Static Utils
 */
// first take all CodeMirror references and store them in the YASQE object
$.extend(root, CodeMirror);


//add registrar for autocompleters
root.Autocompleters = {};
root.registerAutocompleter = function(name, constructor) {
	root.Autocompleters[name] = constructor;
	addCompleterToSettings(root.defaults, name);
}

root.autoComplete = function(yasqe) {
	//this function gets called when pressing the keyboard shortcut. I.e., autoShow = false
	yasqe.autocompleters.autoComplete(false);
};
//include the autocompleters we provide out-of-the-box
root.registerAutocompleter("prefixes", require("./autocompleters/prefixes.js"));
root.registerAutocompleter("properties", require("./autocompleters/properties.js"));
root.registerAutocompleter("classes", require("./autocompleters/classes.js"));
root.registerAutocompleter("variables", require("./autocompleters/variables.js"));


root.positionButtons = function(yasqe) {
	var scrollBar = $(yasqe.getWrapperElement()).find(".CodeMirror-vscrollbar");
	var offset = 0;
	if (scrollBar.is(":visible")) {
		offset = scrollBar.outerWidth();
	}
	if (yasqe.buttons.is(":visible")) yasqe.buttons.css("right", offset);
};

/**
 * Create a share link
 * 
 * @method YASQE.createShareLink
 * @param {doc} YASQE document
 * @default {query: doc.getValue()}
 * @return object
 */
root.createShareLink = function(yasqe) {
	//extend existing link, so first fetch current arguments
	var urlParams = $.deparam(window.location.search.substring(1));
	urlParams['query'] = yasqe.getValue();
	return urlParams;
};

/**
 * Consume the share link, by parsing the document URL for possible yasqe arguments, and setting the appropriate values in the YASQE doc
 * 
 * @method YASQE.consumeShareLink
 * @param {doc} YASQE document
 */
root.consumeShareLink = function(yasqe, urlParams) {
	if (urlParams.query) {
		yasqe.setValue(urlParams.query);
	}
};
root.drawButtons = function(yasqe) {
	yasqe.buttons = $("<div class='yasqe_buttons'></div>").appendTo($(yasqe.getWrapperElement()));
	
	if (yasqe.options.createShareLink) {
		
		var svgShare = $(yutils.svg.getElement(imgs.share, {width: "30px", height: "30px"}));
		svgShare.click(function(event){
			event.stopPropagation();
			var popup = $("<div class='yasqe_sharePopup'></div>").appendTo(yasqe.buttons);
			$('html').click(function() {
				if (popup) popup.remove();
			});

			popup.click(function(event) {
				event.stopPropagation();
			});
			var textAreaLink = $("<textarea></textarea>").val(location.protocol + '//' + location.host + location.pathname + "?" + $.param(yasqe.options.createShareLink(yasqe)));
			
			textAreaLink.focus(function() {
			    var $this = $(this);
			    $this.select();

			    // Work around Chrome's little problem
			    $this.mouseup(function() {
			        // Prevent further mouseup intervention
			        $this.unbind("mouseup");
			        return false;
			    });
			});
			
			popup.empty().append(textAreaLink);
			var positions = svgShare.position();
			popup.css("top", (positions.top + svgShare.outerHeight()) + "px").css("left", ((positions.left + svgShare.outerWidth()) - popup.outerWidth()) + "px");
		})
		.addClass("yasqe_share")
		.attr("title", "Share your query")
		.appendTo(yasqe.buttons);
		
	}

	if (yasqe.options.sparql.showQueryButton) {
		var height = 40;
		var width = 40;
		$("<div class='yasqe_queryButton'></div>")
		 	.click(function(){
		 		if ($(this).hasClass("query_busy")) {
		 			if (yasqe.xhr) yasqe.xhr.abort();
		 			root.updateQueryButton(yasqe);
		 		} else {
		 			yasqe.query();
		 		}
		 	})
		 	.height(height)
		 	.width(width)
		 	.appendTo(yasqe.buttons);
		root.updateQueryButton(yasqe);
	}
	
};


var queryButtonIds = {
	"busy": "loader",
	"valid": "query",
	"error": "queryInvalid"
};

/**
 * Update the query button depending on current query status. If no query status is passed via the parameter, it auto-detects the current query status
 * 
 * @param {doc} YASQE document
 * @param status {string|null, "busy"|"valid"|"error"}
 */
root.updateQueryButton = function(yasqe, status) {
	var queryButton = $(yasqe.getWrapperElement()).find(".yasqe_queryButton");
	if (queryButton.length == 0) return;//no query button drawn
	
	//detect status
	if (!status) {
		status = "valid";
		if (yasqe.queryValid === false) status = "error";
	}
	if (status != yasqe.queryStatus && (status == "busy" || status=="valid" || status == "error")) {
		queryButton
			.empty()
			.removeClass (function (index, classNames) {
				return classNames.split(" ").filter(function(c) {
					//remove classname from previous status
				    return c.indexOf("query_") == 0;
				}).join(" ");
			})
			.addClass("query_" + status)
			.append(yutils.svg.getElement(imgs[queryButtonIds[status]], {width: "100%", height: "100%"}));
		yasqe.queryStatus = status;
	}
};
/**
 * Initialize YASQE from an existing text area (see http://codemirror.net/doc/manual.html#fromTextArea for more info)
 * 
 * @method YASQE.fromTextArea
 * @param textArea {DOM element}
 * @param config {object}
 * @returns {doc} YASQE document
 */
root.fromTextArea = function(textAreaEl, config) {
	config = extendConfig(config);
	//add yasqe div as parent (needed for styles to be manageable and scoped). 
	//In this case, I -also- put it as parent el of the text area. This is wrapped in a div now
	var rootEl = $("<div>", {class:'yasqe'}).insertBefore($(textAreaEl)).append($(textAreaEl));
	var yasqe = extendCmInstance(CodeMirror.fromTextArea(textAreaEl, config));
	postProcessCmElement(yasqe);
	return yasqe;
};


root.storeQuery = function(yasqe) {
	var storageId = utils.getPersistencyId(yasqe, yasqe.options.persistent);
	if (storageId) {
		yutils.storage.set(storageId, yasqe.getValue(), "month");
	}
};
root.commentLines = function(yasqe) {
	var startLine = yasqe.getCursor(true).line;
	var endLine = yasqe.getCursor(false).line;
	var min = Math.min(startLine, endLine);
	var max = Math.max(startLine, endLine);
	
	// if all lines start with #, remove this char. Otherwise add this char
	var linesAreCommented = true;
	for (var i = min; i <= max; i++) {
		var line = yasqe.getLine(i);
		if (line.length == 0 || line.substring(0, 1) != "#") {
			linesAreCommented = false;
			break;
		}
	}
	for (var i = min; i <= max; i++) {
		if (linesAreCommented) {
			// lines are commented, so remove comments
			yasqe.replaceRange("", {
				line : i,
				ch : 0
			}, {
				line : i,
				ch : 1
			});
		} else {
			// Not all lines are commented, so add comments
			yasqe.replaceRange("#", {
				line : i,
				ch : 0
			});
		}

	}
};

root.copyLineUp = function(yasqe) {
	var cursor = yasqe.getCursor();
	var lineCount = yasqe.lineCount();
	// First create new empty line at end of text
	yasqe.replaceRange("\n", {
		line : lineCount - 1,
		ch : yasqe.getLine(lineCount - 1).length
	});
	// Copy all lines to their next line
	for (var i = lineCount; i > cursor.line; i--) {
		var line = yasqe.getLine(i - 1);
		yasqe.replaceRange(line, {
			line : i,
			ch : 0
		}, {
			line : i,
			ch : yasqe.getLine(i).length
		});
	}
};
root.copyLineDown = function(yasqe) {
	root.copyLineUp(yasqe);
	// Make sure cursor goes one down (we are copying downwards)
	var cursor = yasqe.getCursor();
	cursor.line++;
	yasqe.setCursor(cursor);
};
root.doAutoFormat = function(yasqe) {
	if (yasqe.somethingSelected()) {
		var to = {
			line : yasqe.getCursor(false).line,
			ch : yasqe.getSelection().length
		};
		autoFormatRange(yasqe, yasqe.getCursor(true), to);
	} else {
		var totalLines = yasqe.lineCount();
		var totalChars = yasqe.getTextArea().value.length;
		autoFormatRange(yasqe, {
			line : 0,
			ch : 0
		}, {
			line : totalLines,
			ch : totalChars
		});
	}

};


var autoFormatRange = function(yasqe, from, to) {
	var absStart = yasqe.indexFromPos(from);
	var absEnd = yasqe.indexFromPos(to);
	// Insert additional line breaks where necessary according to the
	// mode's syntax
	var res = autoFormatLineBreaks(yasqe.getValue(), absStart, absEnd);

	// Replace and auto-indent the range
	yasqe.operation(function() {
		yasqe.replaceRange(res, from, to);
		var startLine = yasqe.posFromIndex(absStart).line;
		var endLine = yasqe.posFromIndex(absStart + res.length).line;
		for (var i = startLine; i <= endLine; i++) {
			yasqe.indentLine(i, "smart");
		}
	});
};

var autoFormatLineBreaks = function(text, start, end) {
	text = text.substring(start, end);
	var breakAfterArray = [ [ "keyword", "ws", "prefixed", "ws", "uri" ], // i.e. prefix declaration
	[ "keyword", "ws", "uri" ] // i.e. base
	];
	var breakAfterCharacters = [ "{", ".", ";" ];
	var breakBeforeCharacters = [ "}" ];
	var getBreakType = function(stringVal, type) {
		for (var i = 0; i < breakAfterArray.length; i++) {
			if (stackTrace.valueOf().toString() == breakAfterArray[i].valueOf()
					.toString()) {
				return 1;
			}
		}
		for (var i = 0; i < breakAfterCharacters.length; i++) {
			if (stringVal == breakAfterCharacters[i]) {
				return 1;
			}
		}
		for (var i = 0; i < breakBeforeCharacters.length; i++) {
			// don't want to issue 'breakbefore' AND 'breakafter', so check
			// current line
			if ($.trim(currentLine) != ''
					&& stringVal == breakBeforeCharacters[i]) {
				return -1;
			}
		}
		return 0;
	};
	var formattedQuery = "";
	var currentLine = "";
	var stackTrace = [];
	CodeMirror.runMode(text, "sparql11", function(stringVal, type) {
		stackTrace.push(type);
		var breakType = getBreakType(stringVal, type);
		if (breakType != 0) {
			if (breakType == 1) {
				formattedQuery += stringVal + "\n";
				currentLine = "";
			} else {// (-1)
				formattedQuery += "\n" + stringVal;
				currentLine = stringVal;
			}
			stackTrace = [];
		} else {
			currentLine += stringVal;
			formattedQuery += stringVal;
		}
		if (stackTrace.length == 1 && stackTrace[0] == "sp-ws")
			stackTrace = [];
	});
	return $.trim(formattedQuery.replace(/\n\s*\n/g, '\n'));
};
require('./sparql.js').use(root);
require('./defaults.js').use(root);

root.version = {
	"CodeMirror" : CodeMirror.version,
	"YASQE" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"yasgui-utils": yutils.version
};

},{"../lib/deparam.js":7,"../lib/flint.js":8,"../package.json":24,"./autocompleters/autocompleterBase.js":25,"./autocompleters/classes.js":26,"./autocompleters/prefixes.js":27,"./autocompleters/properties.js":28,"./autocompleters/variables.js":30,"./defaults.js":31,"./imgs.js":32,"./prefixUtils.js":34,"./sparql.js":35,"./tokenUtils.js":36,"./tooltip":37,"./utils.js":38,"codemirror":undefined,"codemirror/addon/display/fullscreen.js":10,"codemirror/addon/edit/matchbrackets.js":11,"codemirror/addon/fold/brace-fold.js":12,"codemirror/addon/fold/foldcode.js":13,"codemirror/addon/fold/foldgutter.js":14,"codemirror/addon/fold/xml-fold.js":15,"codemirror/addon/hint/show-hint.js":16,"codemirror/addon/runmode/runmode.js":17,"codemirror/addon/search/searchcursor.js":18,"jquery":undefined,"yasgui-utils":21}],34:[function(require,module,exports){
'use strict';
/**
 * Append prefix declaration to list of prefixes in query window.
 * 
 * @param yasqe
 * @param prefix
 */
var addPrefixes = function(yasqe, prefixes) {
	var existingPrefixes = yasqe.getPrefixesFromQuery();
	//for backwards compatability, we stil support prefixes value as string (e.g. 'rdf: <http://fbfgfgf>'
	if (typeof prefixes == "string") {
		addPrefixAsString(yasqe, prefixes);
	} else {
		for (var pref in prefixes) {
			if (!(pref in existingPrefixes))
			addPrefixAsString(yasqe, pref + ": <" + prefixes[pref] + ">");
		}
	}
};

var addPrefixAsString = function(yasqe, prefixString) {
	var lastPrefix = null;
	var lastPrefixLine = 0;
	var numLines = yasqe.lineCount();
	for (var i = 0; i < numLines; i++) {
		var firstToken = yasqe.getNextNonWsToken(i);
		if (firstToken != null
				&& (firstToken.string == "PREFIX" || firstToken.string == "BASE")) {
			lastPrefix = firstToken;
			lastPrefixLine = i;
		}
	}

	if (lastPrefix == null) {
		yasqe.replaceRange("PREFIX " + prefixString + "\n", {
			line : 0,
			ch : 0
		});
	} else {
		var previousIndent = getIndentFromLine(yasqe, lastPrefixLine);
		yasqe.replaceRange("\n" + previousIndent + "PREFIX " + prefixString, {
			line : lastPrefixLine
		});
	}
};
var removePrefixes = function(yasqe, prefixes) {
	var escapeRegex = function(string) {
		//taken from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
		return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}
	for (var pref in prefixes) {
		yasqe.setValue(yasqe.getValue().replace(new RegExp("PREFIX\\s*" + pref + ":\\s*" + escapeRegex("<" + prefixes[pref] + ">") + "\\s*", "ig"), ''));
	}
	
};

/**
 * Get defined prefixes from query as array, in format {"prefix:" "uri"}
 * 
 * @param cm
 * @returns {Array}
 */
var getPrefixesFromQuery = function(yasqe) {
	var queryPrefixes = {};
	var shouldContinue = true;
	var getPrefixesFromLine = function(lineOffset, colOffset) {
		if (!shouldContinue) return;
		if (!colOffset) colOffset = 1;
		var token = yasqe.getNextNonWsToken(i, colOffset);
		if (token) {
			if (token.state.possibleCurrent.indexOf("PREFIX") == -1 && token.state.possibleNext.indexOf("PREFIX") == -1) shouldContinue = false;//we are beyond the place in the query where we can enter prefixes
			if (token.string.toUpperCase() == "PREFIX") {
				var prefix = yasqe.getNextNonWsToken(i, token.end + 1);
				if (prefix) {
					var uri = yasqe.getNextNonWsToken(i, prefix.end + 1);
					if (uri) {
						var uriString = uri.string;
						if (uriString.indexOf("<") == 0)
							uriString = uriString.substring(1);
						if (uriString.slice(-1) == ">")
							uriString = uriString
									.substring(0, uriString.length - 1);
						queryPrefixes[prefix.string.slice(0,-1)] = uriString;
						
						getPrefixesFromLine(lineOffset, uri.end+1);
					} else {
						getPrefixesFromLine(lineOffset, prefix.end+1);
					}
					
				} else {
					getPrefixesFromLine(lineOffset, token.end+1);
				}
			} else {
				getPrefixesFromLine(lineOffset, token.end+1);
			}
		}
	};
	
	
	var numLines = yasqe.lineCount();
	for (var i = 0; i < numLines; i++) {
		if (!shouldContinue) break;
		getPrefixesFromLine(i);
		
	}
	return queryPrefixes;
};

/**
 * Get the used indentation for a certain line
 * 
 * @param yasqe
 * @param line
 * @param charNumber
 * @returns
 */
var getIndentFromLine = function(yasqe, line, charNumber) {
	if (charNumber == undefined)
		charNumber = 1;
	var token = yasqe.getTokenAt({
		line : line,
		ch : charNumber
	});
	if (token == null || token == undefined || token.type != "ws") {
		return "";
	} else {
		return token.string + getIndentFromLine(yasqe, line, token.end + 1);
	}
	;
};

module.exports = {
	addPrefixes: addPrefixes,
	getPrefixesFromQuery: getPrefixesFromQuery,
	removePrefixes: removePrefixes
};

},{}],35:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
module.exports = {
	use: function(YASQE) {
		YASQE.executeQuery = function(yasqe, callbackOrConfig) {
			var callback = (typeof callbackOrConfig == "function" ? callbackOrConfig: null);
			var config = (typeof callbackOrConfig == "object" ? callbackOrConfig : {});
			var queryMode = yasqe.getQueryMode();
			if (yasqe.options.sparql)
				config = $.extend({}, yasqe.options.sparql, config);
			
			//for backwards compatability, make sure we copy sparql handlers to sparql callbacks
			if (config.handlers) 
				$.extend(true, config.callbacks, config.handlers);
			
			
			if (!config.endpoint || config.endpoint.length == 0)
				return;// nothing to query!

			/**
			 * initialize ajax config
			 */
			var ajaxConfig = {
				url : (typeof config.endpoint == "function"? config.endpoint(yasqe): config.endpoint),
				type : (typeof config.requestMethod == "function"? config.requestMethod(yasqe): config.requestMethod),
				data : [{
					name : queryMode,
					value : yasqe.getValue()
				}],
				headers : {
					Accept : getAcceptHeader(yasqe, config),
				}
			};

			/**
			 * add complete, beforesend, etc callbacks (if specified)
			 */
			var handlerDefined = false;
			if (config.callbacks) {
				for ( var handler in config.callbacks) {
					if (config.callbacks[handler]) {
						handlerDefined = true;
						ajaxConfig[handler] = config.callbacks[handler];
					}
				}
			}
			if (!handlerDefined && !callback)
				return; // ok, we can query, but have no callbacks. just stop now
			
			// if only callback is passed as arg, add that on as 'onComplete' callback
			if (callback)
				ajaxConfig.complete = callback;

			/**
			 * add named graphs to ajax config
			 */
			if (config.namedGraphs && config.namedGraphs.length > 0) {
				var argName = (queryMode == "query" ? "named-graph-uri": "using-named-graph-uri ");
				for (var i = 0; i < config.namedGraphs.length; i++)
					ajaxConfig.data.push({
						name : argName,
						value : config.namedGraphs[i]
					});
			}
			/**
			 * add default graphs to ajax config
			 */
			if (config.defaultGraphs && config.defaultGraphs.length > 0) {
				var argName = (queryMode == "query" ? "default-graph-uri": "using-graph-uri ");
				for (var i = 0; i < config.defaultGraphs.length; i++)
					ajaxConfig.data.push({
						name : argName,
						value : config.defaultGraphs[i]
					});
			}

			/**
			 * merge additional request headers
			 */
			if (config.headers && !$.isEmptyObject(config.headers))
				$.extend(ajaxConfig.headers, config.headers);
			/**
			 * add additional request args
			 */
			if (config.args && config.args.length > 0) $.merge(ajaxConfig.data, config.args);
			YASQE.updateQueryButton(yasqe, "busy");
			
			var updateQueryButton = function() {
				YASQE.updateQueryButton(yasqe);
			};
			//Make sure the query button is updated again on complete
			if (ajaxConfig.complete) {
				var customComplete = ajaxConfig.complete;
				ajaxConfig.complete = function(arg1, arg2) {
					customComplete(arg1, arg2);
					updateQueryButton();
				};
			} else {
				ajaxConfig.complete = updateQueryButton;
			}
			yasqe.xhr = $.ajax(ajaxConfig);
		};
	}
};

var getAcceptHeader = function(yasqe, config) {
	var acceptHeader = null;
	if (config.acceptHeader && !config.acceptHeaderGraph && !config.acceptHeaderSelect && !config.acceptHeaderUpdate) {
		//this is the old config. For backwards compatability, keep supporting it
		if (typeof config.acceptHeader == "function") {
			acceptHeader = config.acceptHeader(yasqe);
		} else {
			acceptHeader = config.acceptHeader;
		}
	} else {
		if (yasqe.getQueryMode() == "update") {
			acceptHeader = (typeof config.acceptHeader == "function"? config.acceptHeaderUpdate(yasqe): config.acceptHeaderUpdate);
		} else {
			var qType = yasqe.getQueryType();
			if (qType == "DESCRIBE" || qType == "CONSTRUCT") {
				acceptHeader = (typeof config.acceptHeaderGraph == "function"? config.acceptHeaderGraph(yasqe): config.acceptHeaderGraph);
			} else {
				acceptHeader = (typeof config.acceptHeaderSelect == "function" ? config.acceptHeaderSelect(yasqe): config.acceptHeaderSelect);
			}
		}
	}
	return acceptHeader;
};

},{"jquery":undefined}],36:[function(require,module,exports){
'use strict';
/**
 * When typing a query, this query is sometimes syntactically invalid, causing
 * the current tokens to be incorrect This causes problem for autocompletion.
 * http://bla might result in two tokens: http:// and bla. We'll want to combine
 * these
 * 
 * @param yasqe {doc}
 * @param token {object}
 * @param cursor {object}
 * @return token {object}
 * @method YASQE.getCompleteToken
 */
var getCompleteToken = function(yasqe, token, cur) {
	if (!cur) {
		cur = yasqe.getCursor();
	}
	if (!token) {
		token = yasqe.getTokenAt(cur);
	}
	var prevToken = yasqe.getTokenAt({
		line : cur.line,
		ch : token.start
	});
	// not start of line, and not whitespace
	if (
			prevToken.type != null && prevToken.type != "ws"
			&& token.type != null && token.type != "ws"
		) {
		token.start = prevToken.start;
		token.string = prevToken.string + token.string;
		return getCompleteToken(yasqe, token, {
			line : cur.line,
			ch : prevToken.start
		});// recursively, might have multiple tokens which it should include
	} else if (token.type != null && token.type == "ws") {
		//always keep 1 char of whitespace between tokens. Otherwise, autocompletions might end up next to the previous node, without whitespace between them
		token.start = token.start + 1;
		token.string = token.string.substring(1);
		return token;
	} else {
		return token;
	}
};
var getPreviousNonWsToken = function(yasqe, line, token) {
	var previousToken = yasqe.getTokenAt({
		line : line,
		ch : token.start
	});
	if (previousToken != null && previousToken.type == "ws") {
		previousToken = getPreviousNonWsToken(yasqe, line, previousToken);
	}
	return previousToken;
}
var getNextNonWsToken = function(yasqe, lineNumber, charNumber) {
	if (charNumber == undefined)
		charNumber = 1;
	var token = yasqe.getTokenAt({
		line : lineNumber,
		ch : charNumber
	});
	if (token == null || token == undefined || token.end < charNumber) {
		return null;
	}
	if (token.type == "ws") {
		return getNextNonWsToken(yasqe, lineNumber, token.end + 1);
	}
	return token;
};

module.exports = {
	getPreviousNonWsToken: getPreviousNonWsToken,
	getCompleteToken: getCompleteToken,
	getNextNonWsToken: getNextNonWsToken,
};


},{}],37:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})(),
	utils = require('./utils.js');

/**
 * Write our own tooltip, to avoid loading another library for just this functionality. For now, we only use tooltip for showing parse errors, so this is quite a tailored solution
 * Requirements: 
 * 		position tooltip within codemirror frame as much as possible, to avoid z-index issues with external things on page
 * 		use html as content
 */
module.exports = function(yasqe, parent, html) {
	var parent = $(parent);
	var tooltip;
	parent.hover(function() {
		if (typeof html == "function") html = html();
		tooltip = $("<div>").addClass('yasqe_tooltip').html(html).appendTo(parent);
		repositionTooltip();
	},
	function() {
		$(".yasqe_tooltip").remove();
	});
	
	
	
	/**
	 * only need to take into account top and bottom offset for this usecase
	 */
	var repositionTooltip = function() {
		if ($(yasqe.getWrapperElement()).offset().top >= tooltip.offset().top) {
			//shit, move the tooltip down. The tooltip now hovers over the top edge of the yasqe instance
			tooltip.css('bottom', 'auto');
			tooltip.css('top', '26px');
		}
	};
};


},{"./utils.js":38,"jquery":undefined}],38:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();

var keyExists = function(objectToTest, key) {
	var exists = false;
	try {
		if (objectToTest[key] !== undefined)
			exists = true;
	} catch (e) {
	}
	return exists;
};

var getPersistencyId = function(yasqe, persistentIdCreator) {
	var persistencyId = null;

	if (persistentIdCreator) {
		if (typeof persistentIdCreator == "string") {
			persistencyId = persistentIdCreator;
		} else {
			persistencyId = persistentIdCreator(yasqe);
		}
	}
	return persistencyId;
};

var elementsOverlap = (function () {
    function getPositions( elem ) {
        var pos, width, height;
        pos = $( elem ).offset();
        width = $( elem ).width();
        height = $( elem ).height();
        return [ [ pos.left, pos.left + width ], [ pos.top, pos.top + height ] ];
    }

    function comparePositions( p1, p2 ) {
        var r1, r2;
        r1 = p1[0] < p2[0] ? p1 : p2;
        r2 = p1[0] < p2[0] ? p2 : p1;
        return r1[1] > r2[0] || r1[0] === r2[0];
    }

    return function ( a, b ) {
        var pos1 = getPositions( a ),
            pos2 = getPositions( b );
        return comparePositions( pos1[0], pos2[0] ) && comparePositions( pos1[1], pos2[1] );
    };
})();

module.exports = {
	keyExists: keyExists,
	getPersistencyId: getPersistencyId,
	elementsOverlap:elementsOverlap,
};
},{"jquery":undefined}],39:[function(require,module,exports){
/**
 * jQuery-csv (jQuery Plugin)
 * version: 0.71 (2012-11-19)
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Acknowledgements:
 * The original design and influence to implement this library as a jquery
 * plugin is influenced by jquery-json (http://code.google.com/p/jquery-json/).
 * If you're looking to use native JSON.Stringify but want additional backwards
 * compatibility for browsers that don't support it, I highly recommend you
 * check it out.
 *
 * A special thanks goes out to rwk@acm.org for providing a lot of valuable
 * feedback to the project including the core for the new FSM
 * (Finite State Machine) parsers. If you're looking for a stable TSV parser
 * be sure to take a look at jquery-tsv (http://code.google.com/p/jquery-tsv/).

 * For legal purposes I'll include the "NO WARRANTY EXPRESSED OR IMPLIED.
 * USE AT YOUR OWN RISK.". Which, in 'layman's terms' means, by using this
 * library you are accepting responsibility if it breaks your code.
 *
 * Legal jargon aside, I will do my best to provide a useful and stable core
 * that can effectively be built on.
 *
 * Copyrighted 2012 by Evan Plaice.
 */

RegExp.escape= function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

(function( $ ) {
  'use strict'
  /**
   * jQuery.csv.defaults
   * Encapsulates the method paramater defaults for the CSV plugin module.
   */

  $.csv = {
    defaults: {
      separator:',',
      delimiter:'"',
      headers:true
    },

    hooks: {
      castToScalar: function(value, state) {
        var hasDot = /\./;
        if (isNaN(value)) {
          return value;
        } else {
          if (hasDot.test(value)) {
            return parseFloat(value);
          } else {
            var integer = parseInt(value);
            if(isNaN(integer)) {
              return null;
            } else {
              return integer;
            }
          }
        }
      }
    },

    parsers: {
      parse: function(csv, options) {
        // cache settings
        var separator = options.separator;
        var delimiter = options.delimiter;

        // set initial state if it's missing
        if(!options.state.rowNum) {
          options.state.rowNum = 1;
        }
        if(!options.state.colNum) {
          options.state.colNum = 1;
        }

        // clear initial state
        var data = [];
        var entry = [];
        var state = 0;
        var value = ''
        var exit = false;

        function endOfEntry() {
          // reset the state
          state = 0;
          value = '';

          // if 'start' hasn't been met, don't output
          if(options.start && options.state.rowNum < options.start) {
            // update global state
            entry = [];
            options.state.rowNum++;
            options.state.colNum = 1;
            return;
          }
          
          if(options.onParseEntry === undefined) {
            // onParseEntry hook not set
            data.push(entry);
          } else {
            var hookVal = options.onParseEntry(entry, options.state); // onParseEntry Hook
            // false skips the row, configurable through a hook
            if(hookVal !== false) {
              data.push(hookVal);
            }
          }
          //console.log('entry:' + entry);
          
          // cleanup
          entry = [];

          // if 'end' is met, stop parsing
          if(options.end && options.state.rowNum >= options.end) {
            exit = true;
          }
          
          // update global state
          options.state.rowNum++;
          options.state.colNum = 1;
        }

        function endOfValue() {
          if(options.onParseValue === undefined) {
            // onParseValue hook not set
            entry.push(value);
          } else {
            var hook = options.onParseValue(value, options.state); // onParseValue Hook
            // false skips the row, configurable through a hook
            if(hook !== false) {
              entry.push(hook);
            }
          }
          //console.log('value:' + value);
          // reset the state
          value = '';
          state = 0;
          // update global state
          options.state.colNum++;
        }

        // escape regex-specific control chars
        var escSeparator = RegExp.escape(separator);
        var escDelimiter = RegExp.escape(delimiter);

        // compile the regEx str using the custom delimiter/separator
        var match = /(D|S|\n|\r|[^DS\r\n]+)/;
        var matchSrc = match.source;
        matchSrc = matchSrc.replace(/S/g, escSeparator);
        matchSrc = matchSrc.replace(/D/g, escDelimiter);
        match = RegExp(matchSrc, 'gm');

        // put on your fancy pants...
        // process control chars individually, use look-ahead on non-control chars
        csv.replace(match, function (m0) {
          if(exit) {
            return;
          }
          switch (state) {
            // the start of a value
            case 0:
              // null last value
              if (m0 === separator) {
                value += '';
                endOfValue();
                break;
              }
              // opening delimiter
              if (m0 === delimiter) {
                state = 1;
                break;
              }
              // null last value
              if (m0 === '\n') {
                endOfValue();
                endOfEntry();
                break;
              }
              // phantom carriage return
              if (/^\r$/.test(m0)) {
                break;
              }
              // un-delimited value
              value += m0;
              state = 3;
              break;

            // delimited input
            case 1:
              // second delimiter? check further
              if (m0 === delimiter) {
                state = 2;
                break;
              }
              // delimited data
              value += m0;
              state = 1;
              break;

            // delimiter found in delimited input
            case 2:
              // escaped delimiter?
              if (m0 === delimiter) {
                value += m0;
                state = 1;
                break;
              }
              // null value
              if (m0 === separator) {
                endOfValue();
                break;
              }
              // end of entry
              if (m0 === '\n') {
                endOfValue();
                endOfEntry();
                break;
              }
              // phantom carriage return
              if (/^\r$/.test(m0)) {
                break;
              }
              // broken paser?
              throw new Error('CSVDataError: Illegal State [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');

            // un-delimited input
            case 3:
              // null last value
              if (m0 === separator) {
                endOfValue();
                break;
              }
              // end of entry
              if (m0 === '\n') {
                endOfValue();
                endOfEntry();
                break;
              }
              // phantom carriage return
              if (/^\r$/.test(m0)) {
                break;
              }
              if (m0 === delimiter) {
              // non-compliant data
                throw new Error('CSVDataError: Illegal Quote [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
              }
              // broken parser?
              throw new Error('CSVDataError: Illegal Data [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
            default:
              // shenanigans
              throw new Error('CSVDataError: Unknown State [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
          }
          //console.log('val:' + m0 + ' state:' + state);
        });

        // submit the last entry
        // ignore null last line
        if(entry.length !== 0) {
          endOfValue();
          endOfEntry();
        }

        return data;
      },

      // a csv-specific line splitter
      splitLines: function(csv, options) {
        // cache settings
        var separator = options.separator;
        var delimiter = options.delimiter;

        // set initial state if it's missing
        if(!options.state.rowNum) {
          options.state.rowNum = 1;
        }

        // clear initial state
        var entries = [];
        var state = 0;
        var entry = '';
        var exit = false;

        function endOfLine() {          
          // reset the state
          state = 0;
          
          // if 'start' hasn't been met, don't output
          if(options.start && options.state.rowNum < options.start) {
            // update global state
            entry = '';
            options.state.rowNum++;
            return;
          }
          
          if(options.onParseEntry === undefined) {
            // onParseEntry hook not set
            entries.push(entry);
          } else {
            var hookVal = options.onParseEntry(entry, options.state); // onParseEntry Hook
            // false skips the row, configurable through a hook
            if(hookVal !== false) {
              entries.push(hookVal);
            }
          }

          // cleanup
          entry = '';

          // if 'end' is met, stop parsing
          if(options.end && options.state.rowNum >= options.end) {
            exit = true;
          }
          
          // update global state
          options.state.rowNum++;
        }

        // escape regex-specific control chars
        var escSeparator = RegExp.escape(separator);
        var escDelimiter = RegExp.escape(delimiter);

        // compile the regEx str using the custom delimiter/separator
        var match = /(D|S|\n|\r|[^DS\r\n]+)/;
        var matchSrc = match.source;
        matchSrc = matchSrc.replace(/S/g, escSeparator);
        matchSrc = matchSrc.replace(/D/g, escDelimiter);
        match = RegExp(matchSrc, 'gm');
        
        // put on your fancy pants...
        // process control chars individually, use look-ahead on non-control chars
        csv.replace(match, function (m0) {
          if(exit) {
            return;
          }
          switch (state) {
            // the start of a value/entry
            case 0:
              // null value
              if (m0 === separator) {
                entry += m0;
                state = 0;
                break;
              }
              // opening delimiter
              if (m0 === delimiter) {
                entry += m0;
                state = 1;
                break;
              }
              // end of line
              if (m0 === '\n') {
                endOfLine();
                break;
              }
              // phantom carriage return
              if (/^\r$/.test(m0)) {
                break;
              }
              // un-delimit value
              entry += m0;
              state = 3;
              break;

            // delimited input
            case 1:
              // second delimiter? check further
              if (m0 === delimiter) {
                entry += m0;
                state = 2;
                break;
              }
              // delimited data
              entry += m0;
              state = 1;
              break;

            // delimiter found in delimited input
            case 2:
              // escaped delimiter?
              var prevChar = entry.substr(entry.length - 1);
              if (m0 === delimiter && prevChar === delimiter) {
                entry += m0;
                state = 1;
                break;
              }
              // end of value
              if (m0 === separator) {
                entry += m0;
                state = 0;
                break;
              }
              // end of line
              if (m0 === '\n') {
                endOfLine();
                break;
              }
              // phantom carriage return
              if (m0 === '\r') {
                break;
              }
              // broken paser?
              throw new Error('CSVDataError: Illegal state [Row:' + options.state.rowNum + ']');

            // un-delimited input
            case 3:
              // null value
              if (m0 === separator) {
                entry += m0;
                state = 0;
                break;
              }
              // end of line
              if (m0 === '\n') {
                endOfLine();
                break;
              }
              // phantom carriage return
              if (m0 === '\r') {
                break;
              }
              // non-compliant data
              if (m0 === delimiter) {
                throw new Error('CSVDataError: Illegal quote [Row:' + options.state.rowNum + ']');
              }
              // broken parser?
              throw new Error('CSVDataError: Illegal state [Row:' + options.state.rowNum + ']');
            default:
              // shenanigans
              throw new Error('CSVDataError: Unknown state [Row:' + options.state.rowNum + ']');
          }
          //console.log('val:' + m0 + ' state:' + state);
        });

        // submit the last entry
        // ignore null last line
        if(entry !== '') {
          endOfLine();
        }

        return entries;
      },

      // a csv entry parser
      parseEntry: function(csv, options) {
        // cache settings
        var separator = options.separator;
        var delimiter = options.delimiter;
        
        // set initial state if it's missing
        if(!options.state.rowNum) {
          options.state.rowNum = 1;
        }
        if(!options.state.colNum) {
          options.state.colNum = 1;
        }

        // clear initial state
        var entry = [];
        var state = 0;
        var value = '';

        function endOfValue() {
          if(options.onParseValue === undefined) {
            // onParseValue hook not set
            entry.push(value);
          } else {
            var hook = options.onParseValue(value, options.state); // onParseValue Hook
            // false skips the value, configurable through a hook
            if(hook !== false) {
              entry.push(hook);
            }
          }
          // reset the state
          value = '';
          state = 0;
          // update global state
          options.state.colNum++;
        }

        // checked for a cached regEx first
        if(!options.match) {
          // escape regex-specific control chars
          var escSeparator = RegExp.escape(separator);
          var escDelimiter = RegExp.escape(delimiter);
          
          // compile the regEx str using the custom delimiter/separator
          var match = /(D|S|\n|\r|[^DS\r\n]+)/;
          var matchSrc = match.source;
          matchSrc = matchSrc.replace(/S/g, escSeparator);
          matchSrc = matchSrc.replace(/D/g, escDelimiter);
          options.match = RegExp(matchSrc, 'gm');
        }

        // put on your fancy pants...
        // process control chars individually, use look-ahead on non-control chars
        csv.replace(options.match, function (m0) {
          switch (state) {
            // the start of a value
            case 0:
              // null last value
              if (m0 === separator) {
                value += '';
                endOfValue();
                break;
              }
              // opening delimiter
              if (m0 === delimiter) {
                state = 1;
                break;
              }
              // skip un-delimited new-lines
              if (m0 === '\n' || m0 === '\r') {
                break;
              }
              // un-delimited value
              value += m0;
              state = 3;
              break;

            // delimited input
            case 1:
              // second delimiter? check further
              if (m0 === delimiter) {
                state = 2;
                break;
              }
              // delimited data
              value += m0;
              state = 1;
              break;

            // delimiter found in delimited input
            case 2:
              // escaped delimiter?
              if (m0 === delimiter) {
                value += m0;
                state = 1;
                break;
              }
              // null value
              if (m0 === separator) {
                endOfValue();
                break;
              }
              // skip un-delimited new-lines
              if (m0 === '\n' || m0 === '\r') {
                break;
              }
              // broken paser?
              throw new Error('CSVDataError: Illegal State [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');

            // un-delimited input
            case 3:
              // null last value
              if (m0 === separator) {
                endOfValue();
                break;
              }
              // skip un-delimited new-lines
              if (m0 === '\n' || m0 === '\r') {
                break;
              }
              // non-compliant data
              if (m0 === delimiter) {
                throw new Error('CSVDataError: Illegal Quote [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
              }
              // broken parser?
              throw new Error('CSVDataError: Illegal Data [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
            default:
              // shenanigans
              throw new Error('CSVDataError: Unknown State [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
          }
          //console.log('val:' + m0 + ' state:' + state);
        });

        // submit the last value
        endOfValue();

        return entry;
      }
    },

    /**
     * $.csv.toArray(csv)
     * Converts a CSV entry string to a javascript array.
     *
     * @param {Array} csv The string containing the CSV data.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     *
     * This method deals with simple CSV strings only. It's useful if you only
     * need to parse a single entry. If you need to parse more than one line,
     * use $.csv2Array instead.
     */
    toArray: function(csv, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      var state = (options.state !== undefined ? options.state : {});

      // setup
      var options = {
        delimiter: config.delimiter,
        separator: config.separator,
        onParseEntry: options.onParseEntry,
        onParseValue: options.onParseValue,
        state: state
      }

      var entry = $.csv.parsers.parseEntry(csv, options);

      // push the value to a callback if one is defined
      if(!config.callback) {
        return entry;
      } else {
        config.callback('', entry);
      }
    },

    /**
     * $.csv.toArrays(csv)
     * Converts a CSV string to a javascript array.
     *
     * @param {String} csv The string containing the raw CSV data.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     *
     * This method deals with multi-line CSV. The breakdown is simple. The first
     * dimension of the array represents the line (or entry/row) while the second
     * dimension contains the values (or values/columns).
     */
    toArrays: function(csv, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      
      // setup
      var data = [];
      var options = {
        delimiter: config.delimiter,
        separator: config.separator,
        onParseEntry: options.onParseEntry,
        onParseValue: options.onParseValue,
        start: options.start,
        end: options.end,
        state: {
          rowNum: 1,
          colNum: 1
        }
      };

      // break the data down to lines
      data = $.csv.parsers.parse(csv, options);

      // push the value to a callback if one is defined
      if(!config.callback) {
        return data;
      } else {
        config.callback('', data);
      }
    },

    /**
     * $.csv.toObjects(csv)
     * Converts a CSV string to a javascript object.
     * @param {String} csv The string containing the raw CSV data.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     * @param {Boolean} [headers] Indicates whether the data contains a header line. Defaults to true.
     *
     * This method deals with multi-line CSV strings. Where the headers line is
     * used as the key for each value per entry.
     */
    toObjects: function(csv, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      config.headers = 'headers' in options ? options.headers : $.csv.defaults.headers;
      options.start = 'start' in options ? options.start : 1;
      
      // account for headers
      if(config.headers) {
        options.start++;
      }
      if(options.end && config.headers) {
        options.end++;
      }
      
      // setup
      var lines = [];
      var data = [];
      
      var options = {
        delimiter: config.delimiter,
        separator: config.separator,
        onParseEntry: options.onParseEntry,
        onParseValue: options.onParseValue,
        start: options.start,
        end: options.end,
        state: {
          rowNum: 1,
          colNum: 1
        },
        match: false
      };

      // fetch the headers
      var headerOptions = {
        delimiter: config.delimiter,
        separator: config.separator,
        start: 1,
        end: 1,
        state: {
          rowNum:1,
          colNum:1
        }
      }
      var headerLine = $.csv.parsers.splitLines(csv, headerOptions);
      var headers = $.csv.toArray(headerLine[0], options);

      // fetch the data
      var lines = $.csv.parsers.splitLines(csv, options);
      
      // reset the state for re-use
      options.state.colNum = 1;
      if(headers){
        options.state.rowNum = 2;
      } else {
        options.state.rowNum = 1;
      }
      
      // convert data to objects
      for(var i=0, len=lines.length; i<len; i++) {
        var entry = $.csv.toArray(lines[i], options);
        var object = {};
        for(var j in headers) {
          object[headers[j]] = entry[j];
        }
        data.push(object);
        
        // update row state
        options.state.rowNum++;
      }

      // push the value to a callback if one is defined
      if(!config.callback) {
        return data;
      } else {
        config.callback('', data);
      }
    },

     /**
     * $.csv.fromArrays(arrays)
     * Converts a javascript array to a CSV String.
     *
     * @param {Array} array An array containing an array of CSV entries.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     *
     * This method generates a CSV file from an array of arrays (representing entries).
     */
    fromArrays: function(arrays, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      config.escaper = 'escaper' in options ? options.escaper : $.csv.defaults.escaper;
      config.experimental = 'experimental' in options ? options.experimental : false;

      if(!config.experimental) {
        throw new Error('not implemented');
      }

      var output = [];
      for(i in arrays) {
        output.push(arrays[i]);
      }

      // push the value to a callback if one is defined
      if(!config.callback) {
        return output;
      } else {
        config.callback('', output);
      }
    },

    /**
     * $.csv.fromObjects(objects)
     * Converts a javascript dictionary to a CSV string.
     * @param {Object} objects An array of objects containing the data.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     *
     * This method generates a CSV file from an array of objects (name:value pairs).
     * It starts by detecting the headers and adding them as the first line of
     * the CSV file, followed by a structured dump of the data.
     */
    fromObjects2CSV: function(objects, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      config.experimental = 'experimental' in options ? options.experimental : false;

      if(!config.experimental) {
        throw new Error('not implemented');
      }

      var output = [];
      for(i in objects) {
        output.push(arrays[i]);
      }

      // push the value to a callback if one is defined
      if(!config.callback) {
        return output;
      } else {
        config.callback('', output);
      }
    }
  };

  // Maintenance code to maintain backward-compatibility
  // Will be removed in release 1.0
  $.csvEntry2Array = $.csv.toArray;
  $.csv2Array = $.csv.toArrays;
  $.csv2Dictionary = $.csv.toObjects;

})( jQuery );

},{}],40:[function(require,module,exports){
module.exports=require(11)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-yasqe/node_modules/codemirror/addon/edit/matchbrackets.js":11,"codemirror":undefined}],41:[function(require,module,exports){
module.exports=require(12)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-yasqe/node_modules/codemirror/addon/fold/brace-fold.js":12,"codemirror":undefined}],42:[function(require,module,exports){
module.exports=require(13)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-yasqe/node_modules/codemirror/addon/fold/foldcode.js":13,"codemirror":undefined}],43:[function(require,module,exports){
module.exports=require(14)
},{"./foldcode":42,"/home/lrd900/yasgui/yasgui/node_modules/yasgui-yasqe/node_modules/codemirror/addon/fold/foldgutter.js":14,"codemirror":undefined}],44:[function(require,module,exports){
module.exports=require(15)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-yasqe/node_modules/codemirror/addon/fold/xml-fold.js":15,"codemirror":undefined}],45:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// TODO actually recognize syntax of TypeScript constructs

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var statementIndent = parserConfig.statementIndent;
  var jsonldMode = parserConfig.jsonld;
  var jsonMode = parserConfig.json || jsonldMode;
  var isTS = parserConfig.typescript;
  var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

    var jsKeywords = {
      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": C, "break": C, "continue": C, "new": C, "delete": C, "throw": C, "debugger": C,
      "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
      "this": kw("this"), "module": kw("module"), "class": kw("class"), "super": kw("atom"),
      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C
    };

    // Extend the 'normal' keywords with the TypeScript language extensions
    if (isTS) {
      var type = {type: "variable", style: "variable-3"};
      var tsKeywords = {
        // object-like things
        "interface": kw("interface"),
        "extends": kw("extends"),
        "constructor": kw("constructor"),

        // scope modifiers
        "public": kw("public"),
        "private": kw("private"),
        "protected": kw("protected"),
        "static": kw("static"),

        // types
        "string": type, "number": type, "bool": type, "any": type
      };

      for (var attr in tsKeywords) {
        jsKeywords[attr] = tsKeywords[attr];
      }
    }

    return jsKeywords;
  }();

  var isOperatorChar = /[+\-*&%=<>!?|~^]/;
  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

  function readRegexp(stream) {
    var escaped = false, next, inSet = false;
    while ((next = stream.next()) != null) {
      if (!escaped) {
        if (next == "/" && !inSet) return;
        if (next == "[") inSet = true;
        else if (inSet && next == "]") inSet = false;
      }
      escaped = !escaped && next == "\\";
    }
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }
  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
      return ret("number", "number");
    } else if (ch == "." && stream.match("..")) {
      return ret("spread", "meta");
    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      return ret(ch);
    } else if (ch == "=" && stream.eat(">")) {
      return ret("=>", "operator");
    } else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    } else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    } else if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      } else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      } else if (state.lastType == "operator" || state.lastType == "keyword c" ||
               state.lastType == "sof" || /^[\[{}\(,;:]$/.test(state.lastType)) {
        readRegexp(stream);
        stream.eatWhile(/[gimy]/); // 'y' is "sticky" option in Mozilla
        return ret("regexp", "string-2");
      } else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", "operator", stream.current());
      }
    } else if (ch == "`") {
      state.tokenize = tokenQuasi;
      return tokenQuasi(stream, state);
    } else if (ch == "#") {
      stream.skipToEnd();
      return ret("error", "error");
    } else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", "operator", stream.current());
    } else if (wordRE.test(ch)) {
      stream.eatWhile(wordRE);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next;
      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
        state.tokenize = tokenBase;
        return ret("jsonld-keyword", "meta");
      }
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) break;
        escaped = !escaped && next == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenQuasi(stream, state) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
        state.tokenize = tokenBase;
        break;
      }
      escaped = !escaped && next == "\\";
    }
    return ret("quasi", "string-2", stream.current());
  }

  var brackets = "([{}])";
  // This is a crude lookahead trick to try and notice that we're
  // parsing the argument patterns for a fat-arrow function before we
  // actually hit the arrow token. It only works if the arrow is on
  // the same line as the arguments and there's no strange noise
  // (comments) in between. Fallback is to only notice when we hit the
  // arrow, and not declare the arguments as locals for the arrow
  // body.
  function findFatArrow(stream, state) {
    if (state.fatArrowAt) state.fatArrowAt = null;
    var arrow = stream.string.indexOf("=>", stream.start);
    if (arrow < 0) return;

    var depth = 0, sawSomething = false;
    for (var pos = arrow - 1; pos >= 0; --pos) {
      var ch = stream.string.charAt(pos);
      var bracket = brackets.indexOf(ch);
      if (bracket >= 0 && bracket < 3) {
        if (!depth) { ++pos; break; }
        if (--depth == 0) break;
      } else if (bracket >= 3 && bracket < 6) {
        ++depth;
      } else if (wordRE.test(ch)) {
        sawSomething = true;
      } else if (sawSomething && !depth) {
        ++pos;
        break;
      }
    }
    if (sawSomething && !depth) state.fatArrowAt = pos;
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
    for (var cx = state.context; cx; cx = cx.prev) {
      for (var v = cx.vars; v; v = v.next)
        if (v.name == varname) return true;
    }
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    function inList(list) {
      for (var v = list; v; v = v.next)
        if (v.name == varname) return true;
      return false;
    }
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      if (inList(state.localVars)) return;
      state.localVars = {name: varname, next: state.localVars};
    } else {
      if (inList(state.globalVars)) return;
      if (parserConfig.globalVars)
        state.globalVars = {name: varname, next: state.globalVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
    cx.state.localVars = defaultVars;
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state, indent = state.indented;
      if (state.lexical.type == "stat") indent = state.lexical.indented;
      else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
        indent = outer.indented;
      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    function exp(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(exp);
    };
    return exp;
  }

  function statement(type, value) {
    if (type == "var") return cont(pushlex("vardef", value.length), vardef, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), expression, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "if") {
      if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
        cx.state.cc.pop()();
      return cont(pushlex("form"), expression, statement, poplex, maybeelse);
    }
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
    if (type == "variable") return cont(pushlex("stat"), maybelabel);
    if (type == "switch") return cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"),
                                      block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                     statement, poplex, popcontext);
    if (type == "module") return cont(pushlex("form"), pushcontext, afterModule, popcontext, poplex);
    if (type == "class") return cont(pushlex("form"), className, poplex);
    if (type == "export") return cont(pushlex("form"), afterExport, poplex);
    if (type == "import") return cont(pushlex("form"), afterImport, poplex);
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type) {
    return expressionInner(type, false);
  }
  function expressionNoComma(type) {
    return expressionInner(type, true);
  }
  function expressionInner(type, noComma) {
    if (cx.state.fatArrowAt == cx.stream.start) {
      var body = noComma ? arrowBodyNoComma : arrowBody;
      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(pattern, ")"), poplex, expect("=>"), body, popcontext);
      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
    }

    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
    if (type == "function") return cont(functiondef, maybeop);
    if (type == "keyword c") return cont(noComma ? maybeexpressionNoComma : maybeexpression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, comprehension, expect(")"), poplex, maybeop);
    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
    if (type == "quasi") { return pass(quasi, maybeop); }
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }
  function maybeexpressionNoComma(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expressionNoComma);
  }

  function maybeoperatorComma(type, value) {
    if (type == ",") return cont(expression);
    return maybeoperatorNoComma(type, value, false);
  }
  function maybeoperatorNoComma(type, value, noComma) {
    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
    var expr = noComma == false ? expression : expressionNoComma;
    if (type == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
    if (type == "operator") {
      if (/\+\+|--/.test(value)) return cont(me);
      if (value == "?") return cont(expression, expect(":"), expr);
      return cont(expr);
    }
    if (type == "quasi") { return pass(quasi, me); }
    if (type == ";") return;
    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
    if (type == ".") return cont(property, me);
    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
  }
  function quasi(type, value) {
    if (type != "quasi") return pass();
    if (value.slice(value.length - 2) != "${") return cont(quasi);
    return cont(expression, continueQuasi);
  }
  function continueQuasi(type) {
    if (type == "}") {
      cx.marked = "string-2";
      cx.state.tokenize = tokenQuasi;
      return cont(quasi);
    }
  }
  function arrowBody(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expression);
  }
  function arrowBodyNoComma(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expressionNoComma);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(getterSetter);
      return cont(afterprop);
    } else if (type == "number" || type == "string") {
      cx.marked = jsonldMode ? "property" : (cx.style + " property");
      return cont(afterprop);
    } else if (type == "jsonld-keyword") {
      return cont(afterprop);
    } else if (type == "[") {
      return cont(expression, expect("]"), afterprop);
    }
  }
  function getterSetter(type) {
    if (type != "variable") return pass(afterprop);
    cx.marked = "property";
    return cont(functiondef);
  }
  function afterprop(type) {
    if (type == ":") return cont(expressionNoComma);
    if (type == "(") return pass(functiondef);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") {
        var lex = cx.state.lexical;
        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
        return cont(what, proceed);
      }
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function(type) {
      if (type == end) return cont();
      return pass(what, proceed);
    };
  }
  function contCommasep(what, end, info) {
    for (var i = 3; i < arguments.length; i++)
      cx.cc.push(arguments[i]);
    return cont(pushlex(end, info), commasep(what, end), poplex);
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function maybetype(type) {
    if (isTS && type == ":") return cont(typedef);
  }
  function typedef(type) {
    if (type == "variable"){cx.marked = "variable-3"; return cont();}
  }
  function vardef() {
    return pass(pattern, maybetype, maybeAssign, vardefCont);
  }
  function pattern(type, value) {
    if (type == "variable") { register(value); return cont(); }
    if (type == "[") return contCommasep(pattern, "]");
    if (type == "{") return contCommasep(proppattern, "}");
  }
  function proppattern(type, value) {
    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
      register(value);
      return cont(maybeAssign);
    }
    if (type == "variable") cx.marked = "property";
    return cont(expect(":"), pattern, maybeAssign);
  }
  function maybeAssign(_type, value) {
    if (value == "=") return cont(expressionNoComma);
  }
  function vardefCont(type) {
    if (type == ",") return cont(vardef);
  }
  function maybeelse(type, value) {
    if (type == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
  }
  function forspec(type) {
    if (type == "(") return cont(pushlex(")"), forspec1, expect(")"), poplex);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef, expect(";"), forspec2);
    if (type == ";") return cont(forspec2);
    if (type == "variable") return cont(formaybeinof);
    return pass(expression, expect(";"), forspec2);
  }
  function formaybeinof(_type, value) {
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return cont(maybeoperatorComma, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return pass(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type) {
    if (type == "spread") return cont(funarg);
    return pass(pattern, maybetype);
  }
  function className(type, value) {
    if (type == "variable") {register(value); return cont(classNameAfter);}
  }
  function classNameAfter(type, value) {
    if (value == "extends") return cont(expression, classNameAfter);
    if (type == "{") return cont(pushlex("}"), classBody, poplex);
  }
  function classBody(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(classGetterSetter, functiondef, classBody);
      return cont(functiondef, classBody);
    }
    if (value == "*") {
      cx.marked = "keyword";
      return cont(classBody);
    }
    if (type == ";") return cont(classBody);
    if (type == "}") return cont();
  }
  function classGetterSetter(type) {
    if (type != "variable") return pass();
    cx.marked = "property";
    return cont();
  }
  function afterModule(type, value) {
    if (type == "string") return cont(statement);
    if (type == "variable") { register(value); return cont(maybeFrom); }
  }
  function afterExport(_type, value) {
    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
    return pass(statement);
  }
  function afterImport(type) {
    if (type == "string") return cont();
    return pass(importSpec, maybeFrom);
  }
  function importSpec(type, value) {
    if (type == "{") return contCommasep(importSpec, "}");
    if (type == "variable") register(value);
    return cont();
  }
  function maybeFrom(_type, value) {
    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
  }
  function arrayLiteral(type) {
    if (type == "]") return cont();
    return pass(expressionNoComma, maybeArrayComprehension);
  }
  function maybeArrayComprehension(type) {
    if (type == "for") return pass(comprehension, expect("]"));
    if (type == ",") return cont(commasep(maybeexpressionNoComma, "]"));
    return pass(commasep(expressionNoComma, "]"));
  }
  function comprehension(type) {
    if (type == "for") return cont(forspec, comprehension);
    if (type == "if") return cont(expression, comprehension);
  }

  // Interface

  return {
    startState: function(basecolumn) {
      var state = {
        tokenize: tokenBase,
        lastType: "sof",
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        context: parserConfig.localVars && {vars: parserConfig.localVars},
        indented: 0
      };
      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
        state.globalVars = parserConfig.globalVars;
      return state;
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
        findFatArrow(stream, state);
      }
      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize == tokenComment) return CodeMirror.Pass;
      if (state.tokenize != tokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical;
      // Kludge to prevent 'maybelse' from blocking lexical scope pops
      if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
        var c = state.cc[i];
        if (c == poplex) lexical = lexical.prev;
        else if (c != maybeelse) break;
      }
      if (lexical.type == "stat" && firstChar == "}") lexical = lexical.prev;
      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
        lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;

      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info + 1 : 0);
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "form") return lexical.indented + indentUnit;
      else if (type == "stat")
        return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? statementIndent || indentUnit : 0);
      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
    blockCommentStart: jsonMode ? null : "/*",
    blockCommentEnd: jsonMode ? null : "*/",
    lineComment: jsonMode ? null : "//",
    fold: "brace",

    helperType: jsonMode ? "json" : "javascript",
    jsonldMode: jsonldMode,
    jsonMode: jsonMode
  };
});

CodeMirror.registerHelper("wordChars", "javascript", /[\w$]/);

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("text/ecmascript", "javascript");
CodeMirror.defineMIME("application/javascript", "javascript");
CodeMirror.defineMIME("application/x-javascript", "javascript");
CodeMirror.defineMIME("application/ecmascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });

});

},{"codemirror":undefined}],46:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})());
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("xml", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var multilineTagIndentFactor = parserConfig.multilineTagIndentFactor || 1;
  var multilineTagIndentPastTag = parserConfig.multilineTagIndentPastTag;
  if (multilineTagIndentPastTag == null) multilineTagIndentPastTag = true;

  var Kludges = parserConfig.htmlMode ? {
    autoSelfClosers: {'area': true, 'base': true, 'br': true, 'col': true, 'command': true,
                      'embed': true, 'frame': true, 'hr': true, 'img': true, 'input': true,
                      'keygen': true, 'link': true, 'meta': true, 'param': true, 'source': true,
                      'track': true, 'wbr': true, 'menuitem': true},
    implicitlyClosed: {'dd': true, 'li': true, 'optgroup': true, 'option': true, 'p': true,
                       'rp': true, 'rt': true, 'tbody': true, 'td': true, 'tfoot': true,
                       'th': true, 'tr': true},
    contextGrabbers: {
      'dd': {'dd': true, 'dt': true},
      'dt': {'dd': true, 'dt': true},
      'li': {'li': true},
      'option': {'option': true, 'optgroup': true},
      'optgroup': {'optgroup': true},
      'p': {'address': true, 'article': true, 'aside': true, 'blockquote': true, 'dir': true,
            'div': true, 'dl': true, 'fieldset': true, 'footer': true, 'form': true,
            'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
            'header': true, 'hgroup': true, 'hr': true, 'menu': true, 'nav': true, 'ol': true,
            'p': true, 'pre': true, 'section': true, 'table': true, 'ul': true},
      'rp': {'rp': true, 'rt': true},
      'rt': {'rp': true, 'rt': true},
      'tbody': {'tbody': true, 'tfoot': true},
      'td': {'td': true, 'th': true},
      'tfoot': {'tbody': true},
      'th': {'td': true, 'th': true},
      'thead': {'tbody': true, 'tfoot': true},
      'tr': {'tr': true}
    },
    doNotIndent: {"pre": true},
    allowUnquoted: true,
    allowMissing: true,
    caseFold: true
  } : {
    autoSelfClosers: {},
    implicitlyClosed: {},
    contextGrabbers: {},
    doNotIndent: {},
    allowUnquoted: false,
    allowMissing: false,
    caseFold: false
  };
  var alignCDATA = parserConfig.alignCDATA;

  // Return variables for tokenizers
  var type, setStyle;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "<") {
      if (stream.eat("!")) {
        if (stream.eat("[")) {
          if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
          else return null;
        } else if (stream.match("--")) {
          return chain(inBlock("comment", "-->"));
        } else if (stream.match("DOCTYPE", true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        } else {
          return null;
        }
      } else if (stream.eat("?")) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock("meta", "?>");
        return "meta";
      } else {
        type = stream.eat("/") ? "closeTag" : "openTag";
        state.tokenize = inTag;
        return "tag bracket";
      }
    } else if (ch == "&") {
      var ok;
      if (stream.eat("#")) {
        if (stream.eat("x")) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(";");
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
      }
      return ok ? "atom" : "error";
    } else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == ">" || (ch == "/" && stream.eat(">"))) {
      state.tokenize = inText;
      type = ch == ">" ? "endTag" : "selfcloseTag";
      return "tag bracket";
    } else if (ch == "=") {
      type = "equals";
      return null;
    } else if (ch == "<") {
      state.tokenize = inText;
      state.state = baseState;
      state.tagName = state.tagStart = null;
      var next = state.tokenize(stream, state);
      return next ? next + " tag error" : "tag error";
    } else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      state.stringStartCol = stream.column();
      return state.tokenize(stream, state);
    } else {
      stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);
      return "word";
    }
  }

  function inAttribute(quote) {
    var closure = function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
    closure.isInAttribute = true;
    return closure;
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    };
  }
  function doctype(depth) {
    return function(stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "<") {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == ">") {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return "meta";
    };
  }

  function Context(state, tagName, startOfLine) {
    this.prev = state.context;
    this.tagName = tagName;
    this.indent = state.indented;
    this.startOfLine = startOfLine;
    if (Kludges.doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.noIndent))
      this.noIndent = true;
  }
  function popContext(state) {
    if (state.context) state.context = state.context.prev;
  }
  function maybePopContext(state, nextTagName) {
    var parentTagName;
    while (true) {
      if (!state.context) {
        return;
      }
      parentTagName = state.context.tagName;
      if (!Kludges.contextGrabbers.hasOwnProperty(parentTagName) ||
          !Kludges.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext(state);
    }
  }

  function baseState(type, stream, state) {
    if (type == "openTag") {
      state.tagStart = stream.column();
      return tagNameState;
    } else if (type == "closeTag") {
      return closeTagNameState;
    } else {
      return baseState;
    }
  }
  function tagNameState(type, stream, state) {
    if (type == "word") {
      state.tagName = stream.current();
      setStyle = "tag";
      return attrState;
    } else {
      setStyle = "error";
      return tagNameState;
    }
  }
  function closeTagNameState(type, stream, state) {
    if (type == "word") {
      var tagName = stream.current();
      if (state.context && state.context.tagName != tagName &&
          Kludges.implicitlyClosed.hasOwnProperty(state.context.tagName))
        popContext(state);
      if (state.context && state.context.tagName == tagName) {
        setStyle = "tag";
        return closeState;
      } else {
        setStyle = "tag error";
        return closeStateErr;
      }
    } else {
      setStyle = "error";
      return closeStateErr;
    }
  }

  function closeState(type, _stream, state) {
    if (type != "endTag") {
      setStyle = "error";
      return closeState;
    }
    popContext(state);
    return baseState;
  }
  function closeStateErr(type, stream, state) {
    setStyle = "error";
    return closeState(type, stream, state);
  }

  function attrState(type, _stream, state) {
    if (type == "word") {
      setStyle = "attribute";
      return attrEqState;
    } else if (type == "endTag" || type == "selfcloseTag") {
      var tagName = state.tagName, tagStart = state.tagStart;
      state.tagName = state.tagStart = null;
      if (type == "selfcloseTag" ||
          Kludges.autoSelfClosers.hasOwnProperty(tagName)) {
        maybePopContext(state, tagName);
      } else {
        maybePopContext(state, tagName);
        state.context = new Context(state, tagName, tagStart == state.indented);
      }
      return baseState;
    }
    setStyle = "error";
    return attrState;
  }
  function attrEqState(type, stream, state) {
    if (type == "equals") return attrValueState;
    if (!Kludges.allowMissing) setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrValueState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    if (type == "word" && Kludges.allowUnquoted) {setStyle = "string"; return attrState;}
    setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrContinuedState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    return attrState(type, stream, state);
  }

  return {
    startState: function() {
      return {tokenize: inText,
              state: baseState,
              indented: 0,
              tagName: null, tagStart: null,
              context: null};
    },

    token: function(stream, state) {
      if (!state.tagName && stream.sol())
        state.indented = stream.indentation();

      if (stream.eatSpace()) return null;
      type = null;
      var style = state.tokenize(stream, state);
      if ((style || type) && style != "comment") {
        setStyle = null;
        state.state = state.state(type || style, stream, state);
        if (setStyle)
          style = setStyle == "error" ? style + " error" : setStyle;
      }
      return style;
    },

    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      // Indent multi-line strings (e.g. css).
      if (state.tokenize.isInAttribute) {
        if (state.tagStart == state.indented)
          return state.stringStartCol + 1;
        else
          return state.indented + indentUnit;
      }
      if (context && context.noIndent) return CodeMirror.Pass;
      if (state.tokenize != inTag && state.tokenize != inText)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      // Indent the starts of attribute names.
      if (state.tagName) {
        if (multilineTagIndentPastTag)
          return state.tagStart + state.tagName.length + 2;
        else
          return state.tagStart + indentUnit * multilineTagIndentFactor;
      }
      if (alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
      var tagAfter = textAfter && /^<(\/)?([\w_:\.-]*)/.exec(textAfter);
      if (tagAfter && tagAfter[1]) { // Closing tag spotted
        while (context) {
          if (context.tagName == tagAfter[2]) {
            context = context.prev;
            break;
          } else if (Kludges.implicitlyClosed.hasOwnProperty(context.tagName)) {
            context = context.prev;
          } else {
            break;
          }
        }
      } else if (tagAfter) { // Opening tag spotted
        while (context) {
          var grabbers = Kludges.contextGrabbers[context.tagName];
          if (grabbers && grabbers.hasOwnProperty(tagAfter[2]))
            context = context.prev;
          else
            break;
        }
      }
      while (context && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return 0;
    },

    electricInput: /<\/[\s\w:]+>$/,
    blockCommentStart: "<!--",
    blockCommentEnd: "-->",

    configuration: parserConfig.htmlMode ? "html" : "xml",
    helperType: parserConfig.htmlMode ? "html" : "xml"
  };
});

CodeMirror.defineMIME("text/xml", "xml");
CodeMirror.defineMIME("application/xml", "xml");
if (!CodeMirror.mimeModes.hasOwnProperty("text/html"))
  CodeMirror.defineMIME("text/html", {name: "xml", htmlMode: true});

});

},{"codemirror":undefined}],47:[function(require,module,exports){
module.exports=require(2)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-utils/node_modules/store/store.js":2}],48:[function(require,module,exports){
module.exports={
  "name": "yasgui-utils",
  "version": "1.4.1",
  "description": "Utils for YASGUI libs",
  "main": "src/main.js",
  "repository": {
    "type": "git",
    "url": "git://github.com/YASGUI/Utils.git"
  },
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasgui.github.io/license.txt"
    }
  ],
  "author": {
    "name": "Laurens Rietveld"
  },
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "url": "http://laurensrietveld.nl"
    }
  ],
  "bugs": {
    "url": "https://github.com/YASGUI/Utils/issues"
  },
  "homepage": "https://github.com/YASGUI/Utils",
  "dependencies": {
    "store": "^1.3.14"
  },
  "readme": "A simple utils repo for the YASGUI tools\n",
  "readmeFilename": "README.md",
  "_id": "yasgui-utils@1.4.1",
  "_from": "yasgui-utils@^1.4.1"
}

},{}],49:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"../package.json":48,"./storage.js":50,"./svg.js":51,"/home/lrd900/yasgui/yasgui/node_modules/yasgui-utils/src/main.js":4}],50:[function(require,module,exports){
module.exports=require(5)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-utils/src/storage.js":5,"store":47}],51:[function(require,module,exports){
module.exports=require(6)
},{"/home/lrd900/yasgui/yasgui/node_modules/yasgui-utils/src/svg.js":6}],52:[function(require,module,exports){
module.exports={
  "name": "yasgui-yasr",
  "description": "Yet Another SPARQL Resultset GUI",
  "version": "2.2.4",
  "main": "src/main.js",
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasr.yasgui.org/license.txt"
    }
  ],
  "author": "Laurens Rietveld",
  "homepage": "http://yasr.yasgui.org",
  "devDependencies": {
    "browserify": "^6.1.0",
    "gulp": "~3.6.0",
    "gulp-bump": "^0.1.11",
    "gulp-concat": "^2.4.1",
    "gulp-connect": "^2.0.5",
    "gulp-embedlr": "^0.5.2",
    "gulp-filter": "^1.0.2",
    "gulp-git": "^0.5.2",
    "gulp-jsvalidate": "^0.2.0",
    "gulp-livereload": "^1.3.1",
    "gulp-minify-css": "^0.3.11",
    "gulp-notify": "^1.2.5",
    "gulp-rename": "^1.2.0",
    "gulp-streamify": "0.0.5",
    "gulp-tag-version": "^1.1.0",
    "gulp-uglify": "^1.0.1",
    "require-dir": "^0.1.0",
    "run-sequence": "^1.0.1",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "~0.1.1",
    "watchify": "^0.6.4",
    "gulp-sourcemaps": "^1.2.8",
    "exorcist": "^0.1.6",
    "vinyl-transform": "0.0.1",
    "gulp-sass": "^1.2.2",
    "twitter-bootstrap-3.0.0": "^3.0.0",
    "browserify-transform-tools": "^1.2.1",
    "gulp-cssimport": "^1.3.1"
  },
  "bugs": "https://github.com/YASGUI/YASR/issues/",
  "keywords": [
    "JavaScript",
    "SPARQL",
    "Editor",
    "Semantic Web",
    "Linked Data"
  ],
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "web": "http://laurensrietveld.nl"
    }
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/YASGUI/YASR.git"
  },
  "dependencies": {
    "jquery": "~ 1.11.0",
    "codemirror": "^4.7.0",
    "yasgui-utils": "^1.4.1"
  },
  "optionalShim": {
    "codemirror": {
      "require": "codemirror",
      "global": "CodeMirror"
    },
    "jquery": {
      "require": "jquery",
      "global": "jQuery"
    },
    "../../lib/codemirror": {
      "require": "codemirror",
      "global": "CodeMirror"
    },
    "../lib/DataTables/media/js/jquery.dataTables.js": {
      "require": "datatables",
      "global": "jQuery"
    }
  }
}

},{}],53:[function(require,module,exports){
'use strict';
module.exports = function(result) {
	var quote = "\"";
	var delimiter = ",";
	var lineBreak= "\n";
	
	var variables = result.head.vars;
	
	var querySolutions= result.results.bindings;
	
	
	
	var createHeader = function() {
		for (var i = 0; i < variables.length; i++) {
			addValueToString(variables[i]);
		}
		csvString += lineBreak;
	};
	
	var createBody = function() {
		for (var i = 0; i < querySolutions.length; i++) {
			addQuerySolutionToString(querySolutions[i]);
			csvString += lineBreak;
		}
	};
	
	var addQuerySolutionToString = function(querySolution) {
		for (var i = 0; i < variables.length; i++) {
			var variable = variables[i];
			if(querySolution.hasOwnProperty(variable)){
				addValueToString(querySolution[variable]["value"]);
			} else {
				addValueToString("");
			}
		}
	};
	var addValueToString = function(value) {
		//Quotes in the string need to be escaped
		value.replace(quote, quote + quote);
		if (needToQuoteString(value)) {
			value = quote + value + quote;
		}
		csvString += " " + value + " " + delimiter;
	};
	
	var needToQuoteString = function(value) {
		//quote when it contains whitespace or the delimiter
		var needQuoting = false;
		if (value.match("[\\w|"+ delimiter + "|" + quote + "]")) {
			needQuoting = true;
		}
		return needQuoting;
	};
	
	csvString = "";
	createHeader();
	createBody();
	return csvString;
};
},{}],54:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();

/**
 * Constructor of plugin which displays boolean info
 * 
 * @param yasr {object}
 * @param parent {DOM element}
 * @param options {object}
 * @class YASR.plugins.boolean
 * @return yasr-boolean (doc)
 * 
 */
var root = module.exports = function(yasr) {
	var container = $("<div class='booleanResult'></div>");
	var draw = function() {
		container.empty().appendTo(yasr.resultsContainer);
		var booleanVal = yasr.results.getBoolean();
		
		var imgId = null;
		var textVal = null;
		if (booleanVal === true) {
			imgId = "check";
			textVal = "True";
		} else if (booleanVal === false) {
			imgId = "cross";
			textVal = "False";
		} else {
			container.width("140");
			textVal = "Could not find boolean value in response";
		}
		
		//add icon
		if (imgId) require("yasgui-utils").svg.draw(container, require('./imgs.js')[imgId], {
			width: 25,
			height: 25,
		});
		
		$("<span></span>").text(textVal).appendTo(container);
	};
	

	var canHandleResults = function(){return yasr.results.getBoolean() === true || yasr.results.getBoolean() == false;};

	
	
	return {
		name: null,//don't need to set this: we don't show it in the selection widget anyway, so don't need a human-friendly name
		draw: draw,
		hideFromSelection: true,
		getPriority: 10,
		canHandleResults: canHandleResults
	}
};


root.version = {
	"YASR-boolean" : require("../package.json").version,
	"jquery": $.fn.jquery,
};


},{"../package.json":52,"./imgs.js":57,"jquery":undefined,"yasgui-utils":49}],55:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
module.exports = {
	/**
	 * key of default plugin to use
	 * @property output
	 * @type string
	 * @default "table"
	 */
	output: "table",
	
	outputPlugins: ["table", "error", "boolean", "rawResponse"],
	
	/**
	 * Draw the output selector widget
	 * 
	 * @property drawOutputSelector
	 * @type boolean
	 * @default true
	 */
	drawOutputSelector: true,
	
	/**
	 * Draw download icon. This issues html5 download functionality to 'download' files created on the client-side.
	 *  This allows the user to download results already queried for, such as a CSV when a table is shown, or the original response when the raw response output is selected
	 * 
	 * @property drawDownloadIcon
	 * @type boolean
	 * @default true
	 */
	drawDownloadIcon: true,
	
	
	getUsedPrefixes: null,
	/**
	 * Make certain settings and values of YASR persistent. Setting a key
	 * to null, will disable persistancy: nothing is stored between browser
	 * sessions Setting the values to a string (or a function which returns a
	 * string), will store the query in localstorage using the specified string.
	 * By default, the ID is dynamically generated by finding the nearest DOM element with an "id" set,
	 * to avoid collissions when using multiple YASR items on one page
	 * 
	 * @property persistency
	 * @type object
	 */
	persistency: {
		/**
		 * Persistency setting for the selected output
		 * 
		 * @property persistency.outputSelector
		 * @type string|function
		 * @default function (determine unique id)
		 */
		outputSelector: function(yasr) {
			return "selector_" + $(yasr.container).closest('[id]').attr('id');
		},
		/**
		 * Persistency setting for query results.
		 * 
		 * @property persistency.results
		 * @type object
		 */
		results: {
			/**
			 * Get the key to store results in
			 * 
			 * @property persistency.results.id
			 * @type string|function
			 * @default function (determine unique id)
			 */
			id: function(yasr){
				return "results_" +  $(yasr.container).closest('[id]').attr('id');
			},
			/**
			 * The result set might too large to fit in local storage. 
			 * It is impossible to detect how large the local storage is.
			 * Therefore, we do not store all results in local storage, depending on a max number of characters in the SPARQL result serialization.
			 * Set this function conservitavely. (especially when using multiple YASR instances on one page)
			 * 
			 * @property persistency.results.maxSize
			 * @type int
			 * @default 100000
			 */
			maxSize: 100000 //char count
		}
		
	},
	
	
};
},{"jquery":undefined}],56:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();

/**
 * Constructor of plugin which displays SPARQL errors
 * 
 * @param yasr {object}
 * @param parent {DOM element}
 * @param options {object}
 * @class YASR.plugins.boolean
 * @return yasr-erro (doc)
 * 
 */
var root = module.exports = function(yasr) {
	var container = $("<div class='errorResult'></div>");
	var options = $.extend(true, {}, root.defaults);
	
	var draw = function() {
		container.empty().appendTo(yasr.resultsContainer);
		$("<span class='exception'>ERROR</span>").appendTo(container);
		$("<p></p>").html(yasr.results.getException()).appendTo(container);
	};
	
	
	var  canHandleResults = function(yasr){return yasr.results.getException() || false;};
	
	return {
		name: null,//don't need to set this: we don't show it in the selection widget anyway, so don't need a human-friendly name
		draw: draw,
		getPriority: 20,
		hideFromSelection: true,
		canHandleResults: canHandleResults,
	}
};

/**
 * Defaults for error plugin
 * 
 * @type object
 * @attribute YASR.plugins.error.defaults
 */
root.defaults = {
	
};
},{"jquery":undefined}],57:[function(require,module,exports){
'use strict';
module.exports = {
	cross: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><g>	<path d="M83.288,88.13c-2.114,2.112-5.575,2.112-7.689,0L53.659,66.188c-2.114-2.112-5.573-2.112-7.687,0L24.251,87.907   c-2.113,2.114-5.571,2.114-7.686,0l-4.693-4.691c-2.114-2.114-2.114-5.573,0-7.688l21.719-21.721c2.113-2.114,2.113-5.573,0-7.686   L11.872,24.4c-2.114-2.113-2.114-5.571,0-7.686l4.842-4.842c2.113-2.114,5.571-2.114,7.686,0L46.12,33.591   c2.114,2.114,5.572,2.114,7.688,0l21.721-21.719c2.114-2.114,5.573-2.114,7.687,0l4.695,4.695c2.111,2.113,2.111,5.571-0.003,7.686   L66.188,45.973c-2.112,2.114-2.112,5.573,0,7.686L88.13,75.602c2.112,2.111,2.112,5.572,0,7.687L83.288,88.13z"/></g></svg>',
	check: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><path fill="#000000" d="M14.301,49.982l22.606,17.047L84.361,4.903c2.614-3.733,7.76-4.64,11.493-2.026l0.627,0.462  c3.732,2.614,4.64,7.758,2.025,11.492l-51.783,79.77c-1.955,2.791-3.896,3.762-7.301,3.988c-3.405,0.225-5.464-1.039-7.508-3.084  L2.447,61.814c-3.263-3.262-3.263-8.553,0-11.814l0.041-0.019C5.75,46.718,11.039,46.718,14.301,49.982z"/></svg>',
	unsorted: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,-0.70898699,-0.70898699,0.70522156,97.988199,55.081205)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path7-9"     d="m 8.8748339,52.571766 16.9382111,-0.222584 4.050851,-0.06665 15.719154,-0.222166 0.27778,-0.04246 0.43276,0.0017 0.41632,-0.06121 0.37532,-0.0611 0.47132,-0.119342 0.27767,-0.08206 0.55244,-0.198047 0.19707,-0.08043 0.61095,-0.259721 0.0988,-0.05825 0.019,-0.01914 0.59303,-0.356548 0.11787,-0.0788 0.49125,-0.337892 0.17994,-0.139779 0.37317,-0.336871 0.21862,-0.219786 0.31311,-0.31479 0.21993,-0.259387 c 0.92402,-1.126057 1.55249,-2.512251 1.78961,-4.016904 l 0.0573,-0.25754 0.0195,-0.374113 0.0179,-0.454719 0.0175,-0.05874 -0.0169,-0.258049 -0.0225,-0.493503 -0.0398,-0.355569 -0.0619,-0.414201 -0.098,-0.414812 -0.083,-0.353334 L 53.23955,41.1484 53.14185,40.850967 52.93977,40.377742 52.84157,40.161628 34.38021,4.2507375 C 33.211567,1.9401875 31.035446,0.48226552 28.639484,0.11316952 l -0.01843,-0.01834 -0.671963,-0.07882 -0.236871,0.0042 L 27.335984,-4.7826577e-7 27.220736,0.00379952 l -0.398804,0.0025 -0.313848,0.04043 -0.594474,0.07724 -0.09611,0.02147 C 23.424549,0.60716252 21.216017,2.1142355 20.013025,4.4296865 L 0.93967491,40.894479 c -2.08310801,3.997178 -0.588125,8.835482 3.35080799,10.819749 1.165535,0.613495 2.43199,0.88731 3.675026,0.864202 l 0.49845,-0.02325 0.410875,0.01658 z M 9.1502369,43.934401 9.0136999,43.910011 27.164145,9.2564625 44.70942,43.42818 l -14.765289,0.214677 -4.031106,0.0468 -16.7627881,0.244744 z" /></svg>',
	sortDesc: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,-0.70898699,-0.70898699,0.70522156,97.988199,55.081205)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path9"     d="m 27.813273,0.12823506 0.09753,0.02006 c 2.39093,0.458209 4.599455,1.96811104 5.80244,4.28639004 L 52.785897,40.894525 c 2.088044,4.002139 0.590949,8.836902 -3.348692,10.821875 -1.329078,0.688721 -2.766603,0.943695 -4.133174,0.841768 l -0.454018,0.02 L 27.910392,52.354171 23.855313,52.281851 8.14393,52.061827 7.862608,52.021477 7.429856,52.021738 7.014241,51.959818 6.638216,51.900838 6.164776,51.779369 5.889216,51.699439 5.338907,51.500691 5.139719,51.419551 4.545064,51.145023 4.430618,51.105123 4.410168,51.084563 3.817138,50.730843 3.693615,50.647783 3.207314,50.310611 3.028071,50.174369 2.652795,49.833957 2.433471,49.613462 2.140099,49.318523 1.901127,49.041407 C 0.97781,47.916059 0.347935,46.528448 0.11153,45.021676 L 0.05352,44.766255 0.05172,44.371683 0.01894,43.936017 0,43.877277 0.01836,43.62206 0.03666,43.122889 0.0765,42.765905 0.13912,42.352413 0.23568,41.940425 0.32288,41.588517 0.481021,41.151945 0.579391,40.853806 0.77369,40.381268 0.876097,40.162336 19.338869,4.2542801 c 1.172169,-2.308419 3.34759,-3.76846504 5.740829,-4.17716604 l 0.01975,0.01985 0.69605,-0.09573 0.218437,0.0225 0.490791,-0.02132 0.39809,0.0046 0.315972,0.03973 0.594462,0.08149 z" /></svg>',
	sortAsc: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,0.70898699,-0.70898699,-0.70522156,97.988199,58.704807)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path9"     d="m 27.813273,113.65778 0.09753,-0.0201 c 2.39093,-0.45821 4.599455,-1.96811 5.80244,-4.28639 L 52.785897,72.891487 c 2.088044,-4.002139 0.590949,-8.836902 -3.348692,-10.821875 -1.329078,-0.688721 -2.766603,-0.943695 -4.133174,-0.841768 l -0.454018,-0.02 -16.939621,0.223997 -4.055079,0.07232 -15.711383,0.220024 -0.281322,0.04035 -0.432752,-2.61e-4 -0.415615,0.06192 -0.376025,0.05898 -0.47344,0.121469 -0.27556,0.07993 -0.550309,0.198748 -0.199188,0.08114 -0.594655,0.274528 -0.114446,0.0399 -0.02045,0.02056 -0.59303,0.35372 -0.123523,0.08306 -0.486301,0.337172 -0.179243,0.136242 -0.375276,0.340412 -0.219324,0.220495 -0.293372,0.294939 -0.238972,0.277116 C 0.97781,65.869953 0.347935,67.257564 0.11153,68.764336 L 0.05352,69.019757 0.05172,69.414329 0.01894,69.849995 0,69.908735 l 0.01836,0.255217 0.0183,0.499171 0.03984,0.356984 0.06262,0.413492 0.09656,0.411988 0.0872,0.351908 0.158141,0.436572 0.09837,0.298139 0.194299,0.472538 0.102407,0.218932 18.462772,35.908054 c 1.172169,2.30842 3.34759,3.76847 5.740829,4.17717 l 0.01975,-0.0199 0.69605,0.0957 0.218437,-0.0225 0.490791,0.0213 0.39809,-0.005 0.315972,-0.0397 0.594462,-0.0815 z" /></svg>',
	download: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="tiny" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" xml:space="preserve"><g id="Captions"></g><g id="Your_Icon">	<path fill-rule="evenodd" fill="#000000" d="M88,84v-2c0-2.961-0.859-4-4-4H16c-2.961,0-4,0.98-4,4v2c0,3.102,1.039,4,4,4h68   C87.02,88,88,87.039,88,84z M58,12H42c-5,0-6,0.941-6,6v22H16l34,34l34-34H64V18C64,12.941,62.939,12,58,12z"/></g></svg>',
};
},{}],58:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
var utils = require("yasgui-utils");
console = console || {"log":function(){}};//make sure any console statements don't break in IE




/**
 * Main YASR constructor
 * 
 * @constructor
 * @param {DOM-Element} parent element to append editor to.
 * @param {object} settings
 * @class YASR
 * @return {doc} YASR document
 */
var root = module.exports = function(parent, options, queryResults) {
	var yasr = {};
	yasr.options = $.extend(true, {}, root.defaults, options);
	yasr.container = $("<div class='yasr'></div>").appendTo(parent);
	yasr.header = $("<div class='yasr_header'></div>").appendTo(yasr.container);
	yasr.resultsContainer = $("<div class='yasr_results'></div>").appendTo(yasr.container);
	
	
	//first initialize plugins
	yasr.plugins = {};
	for (var pluginName in root.plugins) {
		yasr.plugins[pluginName] = new root.plugins[pluginName](yasr);
	}
	
	
	
	
	
	
	yasr.draw = function(output) {
		if (!yasr.results) return false;
		if (!output) output = yasr.options.output;
		
		if (output in yasr.plugins && yasr.plugins[output].canHandleResults(yasr)) {
			$(yasr.resultsContainer).empty();
			yasr.plugins[output].draw();
			return true;
		}
		//ah, our default output does not take our current results. Try to autodetect
		var selectedOutput = null;
		var selectedOutputPriority = -1;
		for (var tryOutput in yasr.plugins) {
			if (yasr.plugins[tryOutput].canHandleResults(yasr)) {
				var priority = yasr.plugins[tryOutput].getPriority;
				if (typeof priority == "function") priority = priority(yasr);
				if (priority != null && priority != undefined && priority > selectedOutputPriority) {
					selectedOutputPriority = priority;
					selectedOutput = tryOutput;
				}
			}
		}
		if (selectedOutput) {
			$(yasr.resultsContainer).empty();
			yasr.plugins[selectedOutput].draw();
			return true;
		}
		return false;
	};
	yasr.somethingDrawn = function() {
		return !yasr.resultsContainer.is(":empty");
	};
	yasr.setResponse = function(queryResults) {
		try {
			yasr.results = require("./parsers/wrapper.js")(queryResults);
		} catch(exception) {
			yasr.results = exception;
		}
		yasr.draw();
		
		//store if needed
		if (yasr.options.persistency && yasr.options.persistency.results) {
			if (yasr.results.getOriginalResponseAsString && yasr.results.getOriginalResponseAsString().length < yasr.options.persistency.results.maxSize) {
				var id = (typeof yasr.options.persistency.results.id == "string" ? yasr.options.persistency.results.id: yasr.options.persistency.results.id(yasr));
				utils.storage.set(id, yasr.results.getOriginalResponse(), "month");
			}
		}
	};
	
//	yasr.plugins = {};
//	for (var plugin in root.plugins) {
//		yasr.plugins[plugin] = root.plugins[plugin](yasr, yasr.resultsContainer);
//	}
	/**
	 * postprocess
	 */
	if (yasr.options.persistency && yasr.options.persistency.outputSelector) {
		var id = (typeof yasr.options.persistency.outputSelector == "string"? yasr.options.persistency.outputSelector: yasr.options.persistency.outputSelector(yasr));
		if (id) {
			var selection = utils.storage.get(id);
			if (selection) yasr.options.output = selection;
		}
	}
	if (!queryResults && yasr.options.persistency && yasr.options.persistency.results) {
		var id = (typeof yasr.options.persistency.results.id == "string" ? yasr.options.persistency.results.id: yasr.options.persistency.results.id(yasr));
		queryResults = utils.storage.get(id);
	}
	
	drawHeader(yasr);
	
	if (queryResults) {
		yasr.setResponse(queryResults);
	} 
	updateHeader(yasr);
	return yasr;
};
var updateHeader = function(yasr) {
	var downloadIcon = yasr.header.find(".yasr_downloadIcon");
		downloadIcon
			.removeAttr("title");//and remove previous titles
	
	var outputPlugin = yasr.plugins[yasr.options.output];
	if (outputPlugin) {
		var info = (outputPlugin.getDownloadInfo? outputPlugin.getDownloadInfo(): null);
		if (info) {
			if (info.buttonTitle) downloadIcon.attr(info.buttonTitle);
			downloadIcon.prop("disabled", false);
			downloadIcon.find("path").each(function(){
				this.style.fill = "black";
			});
		} else {
			downloadIcon.prop("disabled", true).prop("title", "Download not supported for this result representation");
			downloadIcon.find("path").each(function(){
				this.style.fill = "gray";
			});
		}
	}
};

var drawHeader = function(yasr) {
	var drawOutputSelector = function() {
		var btnGroup = $('<div class="yasr_btnGroup"></div>');
		$.each(yasr.plugins, function(pluginName, plugin) {
			if (plugin.hideFromSelection) return;
			var name = plugin.name || pluginName;
			var button = $("<button class='yasr_btn'></button>")
			.text(name)
			.addClass("select_" + pluginName)
			.click(function() {
				//update buttons
				btnGroup.find("button.selected").removeClass("selected");
				$(this).addClass("selected");
				//set and draw output
				yasr.options.output = pluginName;
				
				//store if needed
				if (yasr.options.persistency && yasr.options.persistency.outputSelector) {
					var id = (typeof yasr.options.persistency.outputSelector == "string"? yasr.options.persistency.outputSelector: yasr.options.persistency.outputSelector(yasr));
					utils.storage.set(id, yasr.options.output, "month");
				}
				
				
				yasr.draw();
				updateHeader(yasr);
			})
			.appendTo(btnGroup);
			if (yasr.options.output == pluginName) button.addClass("selected");
		});
		
		if (btnGroup.children().length > 1) yasr.header.append(btnGroup);
	};
	var drawDownloadIcon = function() {
		var stringToUrl = function(string, contentType) {
			var url = null;
			var windowUrl = window.URL || window.webkitURL || window.mozURL || window.msURL;
			if (windowUrl && Blob) {
				var blob = new Blob([string], {type: contentType});
				url = windowUrl.createObjectURL(blob);
			}
			return url;
		};
		var button = $("<button class='yasr_btn yasr_downloadIcon'></button>")
			.append(require("yasgui-utils").svg.getElement(require('./imgs.js').download, {width: "15px", height: "15px"}))
			.click(function() {
				var currentPlugin = yasr.plugins[yasr.options.output];
				if (currentPlugin && currentPlugin.getDownloadInfo) {
					var downloadInfo = currentPlugin.getDownloadInfo();
					var downloadUrl = stringToUrl(downloadInfo.getContent(), (downloadInfo.contentType? downloadInfo.contentType: "text/plain"));
					var downloadMockLink = $("<a></a>");
					downloadMockLink.attr("href", downloadUrl);
					downloadMockLink.attr("download", downloadInfo.filename);
					downloadMockLink.get(0).click();
				}
			});
		yasr.header.append(button);
	};
	if (yasr.options.drawOutputSelector) drawOutputSelector();
	if (yasr.options.drawDownloadIcon) drawDownloadIcon();
};

root.plugins = {};
root.registerOutput = function(name, constructor) {
	root.plugins[name] = constructor;
};
//initialize the outputs we provide as default
root.registerOutput('boolean', require("./boolean.js"));
root.registerOutput('table', require("./table.js"));
root.registerOutput('rawResponse', require("./rawResponse.js"));
root.registerOutput('error', require("./error.js"));

/**
 * The default options of YASR. Either change the default options by setting YASR.defaults, or by
 * passing your own options as second argument to the YASR constructor
 * 
 * @attribute YASR.defaults
 */
root.defaults = require('./defaults.js');
root.version = {
	"YASR" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"yasgui-utils": require("yasgui-utils").version
};

},{"../package.json":52,"./boolean.js":54,"./defaults.js":55,"./error.js":56,"./imgs.js":57,"./parsers/wrapper.js":63,"./rawResponse.js":65,"./table.js":66,"jquery":undefined,"yasgui-utils":49}],59:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
var root = module.exports = function(queryResponse) {
	return require("./dlv.js")(queryResponse, ",");
};
},{"./dlv.js":60,"jquery":undefined}],60:[function(require,module,exports){
'use strict';
var $ = jQuery = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
require("../../lib/jquery.csv-0.71.js");
var root = module.exports = function(queryResponse, separator) {
	var json = {};
	var arrays =  $.csv.toArrays(queryResponse, {separator: separator});
	var detectType = function(value) {
		if (value.indexOf("http") == 0) {
			return "uri";
		} else {
			return null;
		}
	};
	
	var getBoolean = function() {
		if (arrays.length == 2 && arrays[0].length == 1 && arrays[1].length == 1
				&& arrays[0][0] == "boolean" && (arrays[1][0] == "1" || arrays[1][0] == "0")) {
			json.boolean = (arrays[1][0] == "1"? true: false);
			return true;
		}
		return false;
	};
	
	var getVariables = function() {
		if (arrays.length > 0 && arrays[0].length > 0) {
			json.head = {vars: arrays[0]};
			return true;
		}
		return false;
	};
	
	var getBindings = function() {
		if (arrays.length > 1) {
			json.results = {bindings: []};
			for (var rowIt = 1; rowIt < arrays.length; rowIt++) {
				var binding = {};
				for (var colIt = 0; colIt < arrays[rowIt].length; colIt++) {
					var varName = json.head.vars[colIt];
					if (varName) {
						var value = arrays[rowIt][colIt];
						var detectedType = detectType(value);
						binding[varName] = {value: value};
						if (detectedType) binding[varName].type = detectedType;
					}
				}
				
				json.results.bindings.push(binding);
			}
			json.head = {vars: arrays[0]};
			return true;
		}
		return false;
	};
	var isBoolean = getBoolean();
	if (!isBoolean) {
		var varsFetched = getVariables();
		if (varsFetched) getBindings();
	}
	
	return json;
};
},{"../../lib/jquery.csv-0.71.js":39,"jquery":undefined}],61:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
var root = module.exports = function(queryResponse) {
	
	if (typeof queryResponse == "string") {
		try {
			return JSON.parse(queryResponse);
	    } catch (e) {
	        return false;
	    }
	}
	if (typeof queryResponse == "object" && queryResponse.constructor === {}.constructor) {
		return queryResponse;
	}
	return false;
	
};
},{"jquery":undefined}],62:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
var root = module.exports = function(queryResponse) {
	return require("./dlv.js")(queryResponse, "\t");
};
},{"./dlv.js":60,"jquery":undefined}],63:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();

var root = module.exports = function(queryResponse) {
	var parsers = {
		xml: require("./xml.js"),
		json: require("./json.js"),
		tsv: require("./tsv.js"),
		csv: require("./csv.js")
	};
	var contentType;
	var origResponse;
	var json = null;
	var type = null;//json, xml, csv, or tsv
	var exception = (typeof queryResponse == "object" && queryResponse.exception? queryResponse.exception: null);
		
	contentType = (typeof queryResponse == "object" && queryResponse.contentType? queryResponse.contentType.toLowerCase(): null);
	origResponse = (typeof queryResponse == "object" && queryResponse.response? queryResponse.response: queryResponse);
	
	

	var getAsJson = function() {
		if (json) return json;
		if (json === false || exception) return false;//already tried parsing this, and failed. do not try again... 
		var getParserFromContentType = function() {
			if (contentType) {
				if (contentType.indexOf("json") > -1) {
					try {
						json = parsers.json(origResponse);
					} catch (e) {
						exception = e;
					}
					type = "json";
				} else if (contentType.indexOf("xml") > -1) {
					try {
						json = parsers.xml(origResponse);
					} catch (e) {
						exception = e;
					}
					type = "xml";
				} else if (contentType.indexOf("csv") > -1) {
					try {
						json = parsers.csv(origResponse);
					} catch (e) {
						exception = e;
					}
					type = "csv";
				} else if (contentType.indexOf("tab-separated") > -1) {
					try {
						json = parsers.tsv(origResponse);
					} catch (e) {
						exception = e;
					}
					type = "tsv";
				}
			}
		};
		

		var doLuckyGuess = function() {
			json = parsers.json(origResponse);
			if (json)  {
				type = "json";
			} else {
				try {
					json = parsers.xml(origResponse);
					if (json) type="xml";
				} catch(err){};
			}
		};

		
		getParserFromContentType();
		if (!json) {
			doLuckyGuess();
		}
		if (!json) json = false;//explicitly set to false, so we don't try to parse this thing again..
		return json;
	};


	var getVariables = function() {
		var json = getAsJson();
		if (json && "head" in json) {
			return json.head.vars;
		} else {
			return null;
		}
	};

	var getBindings = function() {
		var json = getAsJson();
		if (json && "results" in json) {
			return json.results.bindings;
		} else {
			return null;
		}
	};

	var getBoolean = function() {
		var json = getAsJson();
		if (json && "boolean" in json) {
			return json.boolean;
		} else {
			return null;
		}
	};
	var getOriginalResponse = function() {
		return origResponse;
	};
	var getOriginalResponseAsString = function() {
		var responseString = "";
		if (typeof origResponse == "string") {
			responseString = origResponse;
		} else if (type == "json") {
			responseString = JSON.stringify(origResponse, undefined, 2);//prettifies as well
		} else if (type == "xml") {
			responseString = new XMLSerializer().serializeToString(origResponse);
		}
		return responseString;
	};
	var getException = function() {
		return exception;
	};
	var getType = function() {
		if (type == null) getAsJson();//detects type as well
		return type;
	};
	json = getAsJson();
	
	return {
		getAsJson: getAsJson,
		getOriginalResponse: getOriginalResponse,
		getOriginalResponseAsString: getOriginalResponseAsString,
		getOriginalContentType: function(){return contentType;},
		getVariables: getVariables,
		getBindings: getBindings,
		getBoolean: getBoolean,
		getType: getType,
		getException: getException
	};
};




},{"./csv.js":59,"./json.js":61,"./tsv.js":62,"./xml.js":64,"jquery":undefined}],64:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
var root = module.exports = function(xml) {

	
	
	/**
	 * head
	 */
	var parseHead = function(node) {
		json.head = {};
		for (var headNodeIt = 0; headNodeIt < node.childNodes.length; headNodeIt++) {
			var headNode = node.childNodes[headNodeIt];
			if (headNode.nodeName == "variable") {
				if (!json.head.vars) json.head.vars = [];
				var name = headNode.getAttribute("name");
				if (name) json.head.vars.push(name);
			}
		}
	};
	
	var parseResults = function(node) {
		json.results = {};
		json.results.bindings = [];
		for (var resultIt = 0; resultIt < node.childNodes.length; resultIt++) {
			var resultNode = node.childNodes[resultIt];
			var jsonResult = null;
			
			for (var bindingIt = 0; bindingIt < resultNode.childNodes.length; bindingIt++) {
				var bindingNode = resultNode.childNodes[bindingIt];
				if (bindingNode.nodeName == "binding") {
					var varName = bindingNode.getAttribute("name");
					if (varName) {
						jsonResult = jsonResult || {};
						jsonResult[varName] = {};
						for (var bindingInfIt = 0; bindingInfIt < bindingNode.childNodes.length; bindingInfIt++) {
							var bindingInf = bindingNode.childNodes[bindingInfIt];
 							var type = bindingInf.nodeName;
							if (type == "#text") continue;
							jsonResult[varName].type = type;
							jsonResult[varName].value = bindingInf.innerHTML;
							var dataType = bindingInf.getAttribute("datatype");
							if (dataType) jsonResult[varName].datatype = dataType;
							
						}
					}
				}
			}
			if (jsonResult) json.results.bindings.push(jsonResult);
		}
	};
	
	var parseBoolean = function(node) {
		if (node.innerHTML == "true") {
			json.boolean = true;
		} else {
			json.boolean = false;
		}
	};
	var mainXml = null;
	if (typeof xml == "string") {
		mainXml = $.parseXML(xml);
	} else if ($.isXMLDoc(xml)) {
		mainXml = xml;
	}
	var xml = null;
	if (mainXml.childNodes.length > 0) {
		//enter the main 'sparql' node
		xml = mainXml.childNodes[0];
	} else {
		return null;
	}
	var json = {};
	
	
    for(var i = 0; i < xml.childNodes.length; i++) {
    	var node = xml.childNodes[i];
    	if (node.nodeName == "head") parseHead(node);
    	if (node.nodeName == "results") parseResults(node);
    	if (node.nodeName == "boolean") parseBoolean(node);
    }
    
	return json;
};

},{"jquery":undefined}],65:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})(),
	CodeMirror = (function(){try{return require('codemirror')}catch(e){return window.CodeMirror}})();

require('codemirror/addon/fold/foldcode.js');
require('codemirror/addon/fold/foldgutter.js');
require('codemirror/addon/fold/xml-fold.js');
require('codemirror/addon/fold/brace-fold.js');

require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');

var root = module.exports = function(yasr) {
	var plugin = {};
	var options = $.extend(true, {}, root.defaults);
	var cm = null;
	var draw = function() {
		var cmOptions = options.CodeMirror;
		cmOptions.value = yasr.results.getOriginalResponseAsString();
		
		var mode = yasr.results.getType();
		if (mode) {
			if (mode == "json") {
				mode = {name: "javascript", json: true};
			}
			cmOptions.mode = mode;
		}
		
		cm = CodeMirror(yasr.resultsContainer.get()[0], cmOptions);
		
		//CM has some issues with folding and unfolding (blank parts in the codemirror area, which are only filled after clicking it)
		//so, refresh cm after folding/unfolding
		cm.on('fold', function() {
			cm.refresh();
		});
		cm.on('unfold', function() {
			cm.refresh();
		});
		
	};
	var canHandleResults = function(){
		if (!yasr.results) return false;
		var response = yasr.results.getOriginalResponseAsString();
		if ((!response || response.length == 0) && yasr.results.getException()) return false;//in this case, show exception instead, as we have nothing to show anyway
		return true;
	};
	
	var getDownloadInfo = function() {
		if (!yasr.results) return null;
		var contentType = yasr.results.getOriginalContentType();
		var type = yasr.results.getType();
		return {
			getContent: function() {return yasr.results.getOriginalResponse();},
			filename: "queryResults" + (type? "." + type: ""),
			contentType: (contentType? contentType: "text/plain"),
			buttonTitle: "Download raw response"
		};
	};
	
	return {
		draw: draw,
		name: "Raw Response",
		canHandleResults: canHandleResults,
		getPriority: 2,
		getDownloadInfo: getDownloadInfo,
		
	}
};



root.defaults = {
	CodeMirror: {
		readOnly: true,
		lineNumbers: true,
	    lineWrapping: true,
	    foldGutter: true,
	    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
	}
};

root.version = {
	"YASR-rawResponse" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"CodeMirror" : CodeMirror.version
};
},{"../package.json":52,"codemirror":undefined,"codemirror/addon/edit/matchbrackets.js":40,"codemirror/addon/fold/brace-fold.js":41,"codemirror/addon/fold/foldcode.js":42,"codemirror/addon/fold/foldgutter.js":43,"codemirror/addon/fold/xml-fold.js":44,"codemirror/mode/javascript/javascript.js":45,"codemirror/mode/xml/xml.js":46,"jquery":undefined}],66:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})(),
	yutils = require("yasgui-utils"),
	imgs = require('./imgs.js');
(function(){try{return require('datatables')}catch(e){return window.jQuery}})();



/**
 * Constructor of plugin which displays results as a table
 * 
 * @param yasr {object}
 * @param parent {DOM element}
 * @param options {object}
 * @class YASR.plugins.table
 * @return yasr-table (doc)
 * 
 */
var root = module.exports = function(yasr) {
	var table = null;
	var plugin = {
		name: "Table",
		getPriority: 10,
	};
	var options = plugin.options = $.extend(true, {}, root.defaults);
	

	var getRows = function() {
		var rows = [];
		var bindings = yasr.results.getBindings();
		var vars = yasr.results.getVariables();
		var usedPrefixes = null;
		if (yasr.options.getUsedPrefixes) {
			usedPrefixes = (typeof yasr.options.getUsedPrefixes == "function"? yasr.options.getUsedPrefixes(yasr):  yasr.options.getUsedPrefixes);
		}
		for (var rowId = 0; rowId < bindings.length; rowId++) {
			var row = [];
			row.push("");//row numbers
			var binding = bindings[rowId];
			for (var colId = 0; colId < vars.length; colId++) {
				var sparqlVar = vars[colId];
				if (sparqlVar in binding) {
					if (options.getCellContent) {
						row.push(options.getCellContent(yasr, plugin, binding, sparqlVar, {'rowId': rowId, 'colId': colId, 'usedPrefixes': usedPrefixes}));
					} else {
						row.push("");
					}
				} else {
					row.push("");
				}
			}
			rows.push(row);
		}
		return rows;
	};
	

	var addEvents = function() {
		table.on( 'order.dt', function () {
		    drawSvgIcons();
		});
		if (options.persistency && options.persistency.tableLength) {
			table.on('length.dt', function(e, settings, len) {
				var persistencyId = (typeof options.persistency.tableLength == "string" ? options.persistency.tableLength: options.persistency.tableLength(yasr));
				yutils.storage.set(persistencyId, len, "month");
			});
		}
		$.extend(true, options.callbacks, options.handlers);
		table.delegate("td", "click", function(event) {
			if (options.callbacks && options.callbacks.onCellClick) {
				var result = options.callbacks.onCellClick(this, event);
				if (result === false) return false;
			}
		}).delegate("td",'mouseenter', function(event) {
			if (options.callbacks && options.callbacks.onCellMouseEnter) {
				options.callbacks.onCellMouseEnter(this, event);
			}
			var tdEl = $(this);
			if (options.fetchTitlesFromPreflabel 
					&& tdEl.attr("title") === undefined
					&& tdEl.text().trim().indexOf("http") == 0) {
				addPrefLabel(tdEl);
			}
		}).delegate("td",'mouseleave', function(event) {
			if (options.callbacks && options.callbacks.onCellMouseLeave) {
				options.callbacks.onCellMouseLeave(this, event);
				
			}
		});
		
	};
	
	plugin.draw = function() {
		table = $('<table cellpadding="0" cellspacing="0" border="0" class="resultsTable"></table>');
		$(yasr.resultsContainer).html(table);

		var dataTableConfig = options.datatable;
		dataTableConfig.data = getRows();
		dataTableConfig.columns = options.getColumns(yasr, plugin);
		
		//fetch stored datatables length value
		if (options.persistency && options.persistency.tableLength) {
			var persistencyId = (typeof options.persistency.tableLength == "string" ? options.persistency.tableLength: options.persistency.tableLength(yasr));
			var pLength = yutils.storage.get(persistencyId);
			if (pLength) dataTableConfig.pageLength = pLength;
		}
		
		
		
		table.DataTable($.extend(true, {}, dataTableConfig));//make copy. datatables adds properties for backwards compatability reasons, and don't want this cluttering our own 
		
		
		drawSvgIcons();
		
		addEvents();
		
		//move the table upward, so the table options nicely aligns with the yasr header
		var headerHeight = yasr.header.outerHeight() - 5; //add some space of 5 px between table and yasr header
		if (headerHeight > 0) {
			yasr.resultsContainer.find(".dataTables_wrapper")
			.css("position", "relative")
			.css("top", "-" + headerHeight + "px")
			.css("margin-bottom", "-" + headerHeight + "px");
		}
		
		
	};
	
	var drawSvgIcons = function() {
		var sortings = {
			"sorting": "unsorted",
			"sorting_asc": "sortAsc",
			"sorting_desc": "sortDesc"
		};
		table.find(".sortIcons").remove();
		var width = 8;
		var height = 13;
		for (var sorting in sortings) {
			var svgDiv = $("<div class='sortIcons'></div>").css("float", "right").css("margin-right", "-12px").width(width).height(height);
			yutils.svg.draw(svgDiv, imgs[sortings[sorting]], {width: width+2, height: height+1});
			table.find("th." + sorting).append(svgDiv);
		}
	};
	/**
	 * Check whether this plugin can handler the current results
	 * 
	 * @property canHandleResults
	 * @type function
	 * @default If resultset contains variables in the resultset, return true
	 */
	plugin.canHandleResults = function(){
		return yasr.results && yasr.results.getVariables() && yasr.results.getVariables().length > 0;
	};

	
	plugin.getDownloadInfo = function() {
		if (!yasr.results) return null;
		return {
			getContent: function(){return require("./bindingsToCsv.js")(yasr.results.getAsJson());},
			filename: "queryResults.csv",
			contentType: "text/csv",
			buttonTitle: "Download as CSV"
		};
	};
	
	return plugin;
};


var formatLiteral = function(yasr, plugin, literalBinding) {
	var stringRepresentation = literalBinding.value;
	if (literalBinding["xml:lang"]) {
		stringRepresentation = '"' + literalBinding.value + '"@' + literalBinding["xml:lang"];
	} else if (literalBinding.datatype) {
		var xmlSchemaNs = "http://www.w3.org/2001/XMLSchema#";
		var dataType = literalBinding.datatype;
		if (dataType.indexOf(xmlSchemaNs) == 0) {
			dataType = "xsd:" + dataType.substring(xmlSchemaNs.length);
		} else {
			dataType = "<" + dataType + ">";
		}
		
		stringRepresentation = '"' + stringRepresentation + '"^^' + dataType;
	}
	return stringRepresentation;
};
var getCellContent = function(yasr, plugin, bindings, sparqlVar, context) {
	var binding = bindings[sparqlVar];
	var value = null;
	if (binding.type == "uri") {
		var title = null;
		var href = binding.value;
		var visibleString = href;  
		if (context.usedPrefixes) {
			for (var prefix in context.usedPrefixes) {
				if (visibleString.indexOf(context.usedPrefixes[prefix]) == 0) {
					visibleString = prefix + ':' + href.substring(context.usedPrefixes[prefix].length);
					break;
				}
			}
		}
		if (plugin.options.mergeLabelsWithUris) {
			var postFix = (typeof plugin.options.mergeLabelsWithUris == "string"? plugin.options.mergeLabelsWithUris: "Label");
			if (bindings[sparqlVar + postFix]) {
				visibleString = formatLiteral(yasr, plugin, bindings[sparqlVar + postFix]);
				title = href;
			}
		}
		value = "<a " + (title? "title='" + href + "' ": "") + "class='uri' target='_blank' href='" + href + "'>" + visibleString + "</a>";
	} else {
		value = "<span class='nonUri'>" + formatLiteral(yasr, plugin, binding) + "</span>";
	}
	return value;
};






var addPrefLabel = function(td) {
	var addEmptyTitle = function() {
		td.attr("title","");//this avoids trying to fetch the label again on next hover
	};
	$.get("http://preflabel.org/api/v1/label/" + encodeURIComponent(td.text()) + "?silent=true")
		.success(function(data) {
			if (typeof data == "object" && data.label) {
				td.attr("title", data.label);
			} else if (typeof data == "string" && data.length > 0 ) {
				td.attr("title", data);
			} else {
				addEmptyTitle();
			}
			
		})
		.fail(addEmptyTitle);
};

var openCellUriInNewWindow = function(cell) {
	if (cell.className.indexOf("uri") >= 0) {
		window.open(this.innerHTML);
	}
};

/**
 * Defaults for table plugin
 * 
 * @type object
 * @attribute YASR.plugins.table.defaults
 */
root.defaults = {
	
	/**
	 * Draw the cell content, from a given binding
	 * 
	 * @property drawCellContent
	 * @param binding {object}
	 * @type function
	 * @return string
	 * @default YASR.plugins.table.getFormattedValueFromBinding
	 */
	getCellContent: getCellContent,
	
	persistency: {
		tableLength: function (yasr){
			return "tableLength_" + $(yasr.container).closest('[id]').attr('id');
		},
	},
	
	getColumns: function(yasr, plugin) {
		var includeVariable = function(variableToCheck) {
			if (!plugin.options.mergeLabelsWithUris) return true;
			var postFix = (typeof plugin.options.mergeLabelsWithUris == "string"? plugin.options.mergeLabelsWithUris: "Label");
			if (variableToCheck.indexOf(postFix, variableToCheck.length - postFix.length) !== -1) {
				//this one ends with a postfix
				if (yasr.results.getVariables().indexOf(variableToCheck.substring(0, variableToCheck.length - postFix.length)) >= 0) {
					//we have a shorter version of this variable. So, do not include the ..<postfix> variable in the table
					return false;
				}
			}
			return true;
		};
		
		var cols = [];
		cols.push({"title": ""});//row numbers column
		yasr.results.getVariables().forEach(function(variable) {
			cols.push({"title": variable, "visible": includeVariable(variable)});
		});
		return cols;
	},
	/**
	 * Try to fetch the label representation for each URI, using the preflabel.org services. (fetching occurs when hovering over the cell)
	 * 
	 * @property fetchTitlesFromPreflabel
	 * @type boolean
	 * @default true
	 */
	fetchTitlesFromPreflabel: true,
	
	mergeLabelsWithUris: false,
	/**
	 * Set a number of handlers for the table
	 * 
	 * @property handlers
	 * @type object
	 */
	callbacks: {
		/**
		 * Mouse-enter-cell event
		 * 
		 * @property handlers.onCellMouseEnter
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellMouseEnter: null,
		/**
		 * Mouse-leave-cell event
		 * 
		 * @property handlers.onCellMouseLeave
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellMouseLeave: null,
		/**
		 * Cell clicked event
		 * 
		 * @property handlers.onCellClick
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellClick: null
	},
	/**
	 * This plugin uses the datatables jquery plugin (See datatables.net). For any datatables specific defaults, change this object. 
	 * See the datatables reference for more information
	 * 
	 * @property datatable
	 * @type object
	 */
	datatable: {
		"order": [],//disable initial sorting
		"pageLength": 50,//default page length
    	"lengthMenu": [[10, 50, 100, 1000, -1], [10, 50, 100, 1000, "All"]],//possible page lengths
    	"lengthChange": true,//allow changing page length
    	"pagingType": "full_numbers",//how to show the pagination options
        "drawCallback": function ( oSettings ) {
        	//trick to show row numbers
        	for ( var i = 0; i < oSettings.aiDisplay.length; i++) {
				$('td:eq(0)',oSettings.aoData[oSettings.aiDisplay[i]].nTr).html(i + 1);
			}
        	
        	//Hide pagination when we have a single page
        	var activePaginateButton = false;
        	$(oSettings.nTableWrapper).find(".paginate_button").each(function() {
        		if ($(this).attr("class").indexOf("current") == -1 && $(this).attr("class").indexOf("disabled") == -1) {
        			activePaginateButton = true;
        		}
        	});
        	if (activePaginateButton) {
        		$(oSettings.nTableWrapper).find(".dataTables_paginate").show();
        	} else {
        		$(oSettings.nTableWrapper).find(".dataTables_paginate").hide();
        	}
		},
		"columnDefs": [
			{ "width": "12px", "orderable": false, "targets": 0  }//disable row sorting for first col
		],
	},
};

root.version = {
	"YASR-table" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"jquery-datatables": $.fn.DataTable.version
};

},{"../package.json":52,"./bindingsToCsv.js":53,"./imgs.js":57,"datatables":undefined,"jquery":undefined,"yasgui-utils":49}],67:[function(require,module,exports){
//Based on Bootstrap: tab.js v3.3.1
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
  'use strict';

  // TAB CLASS DEFINITION
  // ====================

  var Tab = function (element) {
    this.element = $(element)
  }

  Tab.VERSION = '3.3.1'

  Tab.TRANSITION_DURATION = 150

  Tab.prototype.show = function () {
    var $this    = this.element
    var $ul      = $this.closest('ul:not(.dropdown-menu)')
    var selector = $this.data('target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    if ($this.parent('li').hasClass('active')) return

    var $previous = $ul.find('.active:last a')
    var hideEvent = $.Event('hide.bs.tab', {
      relatedTarget: $this[0]
    })
    var showEvent = $.Event('show.bs.tab', {
      relatedTarget: $previous[0]
    })

    $previous.trigger(hideEvent)
    $this.trigger(showEvent)

    if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) return

    var $target = $(selector)

    this.activate($this.closest('li'), $ul)
    this.activate($target, $target.parent(), function () {
      $previous.trigger({
        type: 'hidden.bs.tab',
        relatedTarget: $this[0]
      })
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: $previous[0]
      })
    })
  }

  Tab.prototype.activate = function (element, container, callback) {
    var $active    = container.find('> .active')
    var transition = callback
      && $.support.transition
      && (($active.length && $active.hasClass('fade')) || !!container.find('> .fade').length)

    function next() {
      $active
        .removeClass('active')
        .find('> .dropdown-menu > .active')
          .removeClass('active')
        .end()
        .find('[data-toggle="tab"]')
          .attr('aria-expanded', false)

      element
        .addClass('active')
        .find('[data-toggle="tab"]')
          .attr('aria-expanded', true)

      if (transition) {
        element[0].offsetWidth // reflow for transition
        element.addClass('in')
      } else {
        element.removeClass('fade')
      }

      if (element.parent('.dropdown-menu')) {
        element
          .closest('li.dropdown')
            .addClass('active')
          .end()
          .find('[data-toggle="tab"]')
            .attr('aria-expanded', true)
      }

      callback && callback()
    }

    $active.length && transition ?
      $active
        .one('bsTransitionEnd', next)
        .emulateTransitionEnd(Tab.TRANSITION_DURATION) :
      next()

    $active.removeClass('in')
  }


  // TAB PLUGIN DEFINITION
  // =====================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.tab')

      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tab

  $.fn.tab             = Plugin
  $.fn.tab.Constructor = Tab


  // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


  // TAB DATA-API
  // ============

  var clickHandler = function (e) {
    e.preventDefault()
    Plugin.call($(this), 'show')
  }

  $(document)
    .on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler)
    .on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler)


},{"jquery":undefined}],68:[function(require,module,exports){
'use strict';
module.exports = {};
},{}],69:[function(require,module,exports){
'use strict';

module.exports = {
	sparql: {
		showQueryButton: true,
		acceptHeaderGraph: "text/turtle",
		acceptHeaderSelect: "application/sparql-results+json"
	}
};
},{}],70:[function(require,module,exports){
'use strict';
module.exports = {
	yasgui: '<svg   xmlns:osb="http://www.openswatchbook.org/uri/2009/osb"   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 603.99 522.51"  width="100%"   height="100%"   id="svg2"   version="1.1"   inkscape:version="0.48.4 r9939"   sodipodi:docname="yasgui (copy).svg">  <defs     id="defs4">    <linearGradient       id="linearGradient5249"       osb:paint="solid">      <stop         style="stop-color:#3b3b3b;stop-opacity:1;"         offset="0"         id="stop5251" />    </linearGradient>    <inkscape:path-effect       effect="skeletal"       id="path-effect2997"       is_visible="true"       pattern="M 0,5 C 0,2.24 2.24,0 5,0 7.76,0 10,2.24 10,5 10,7.76 7.76,10 5,10 2.24,10 0,7.76 0,5 z"       copytype="single_stretched"       prop_scale="1"       scale_y_rel="false"       spacing="0"       normal_offset="0"       tang_offset="0"       prop_units="false"       vertical_pattern="false"       fuse_tolerance="0" />    <inkscape:path-effect       effect="spiro"       id="path-effect2995"       is_visible="true" />    <inkscape:path-effect       effect="skeletal"       id="path-effect2991"       is_visible="true"       pattern="M 0,5 C 0,2.24 2.24,0 5,0 7.76,0 10,2.24 10,5 10,7.76 7.76,10 5,10 2.24,10 0,7.76 0,5 z"       copytype="single_stretched"       prop_scale="1"       scale_y_rel="false"       spacing="0"       normal_offset="0"       tang_offset="0"       prop_units="false"       vertical_pattern="false"       fuse_tolerance="0" />    <inkscape:path-effect       effect="spiro"       id="path-effect2989"       is_visible="true" />  </defs>  <sodipodi:namedview     id="base"     pagecolor="#ffffff"     bordercolor="#666666"     borderopacity="1.0"     inkscape:pageopacity="0.0"     inkscape:pageshadow="2"     inkscape:zoom="0.35"     inkscape:cx="-469.55507"     inkscape:cy="840.5292"     inkscape:document-units="px"     inkscape:current-layer="layer1"     showgrid="false"     inkscape:window-width="1855"     inkscape:window-height="1056"     inkscape:window-x="65"     inkscape:window-y="24"     inkscape:window-maximized="1"     fit-margin-top="0"     fit-margin-left="0"     fit-margin-right="0"     fit-margin-bottom="0" />  <metadata     id="metadata7">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title />      </cc:Work>    </rdf:RDF>  </metadata>  <g     inkscape:label="Layer 1"     inkscape:groupmode="layer"     id="layer1"     transform="translate(-50.966817,-280.33262)">    <rect       style="fill:#3b3b3b;fill-opacity:1;stroke:none"       id="rect5293-6-8"       width="40.000004"       height="478.57324"       x="-374.48849"       y="103.99496"       transform="matrix(-2.679181e-4,-0.99999996,0.99999993,-3.6684387e-4,0,0)" />    <rect       style="fill:#3b3b3b;fill-opacity:1;stroke:none"       id="rect5293-5-7"       width="40.000004"       height="560"       x="651.37634"       y="-132.06581"       transform="matrix(0.74639582,0.66550228,-0.66550228,0.74639582,0,0)" />    <path       sodipodi:type="arc"       style="fill:#ffffff;fill-opacity:1;stroke:#3b3b3b;stroke-width:61.04665375;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none"       id="path3781-9-0-7-1-9-7"       sodipodi:cx="455.71429"       sodipodi:cy="513.79077"       sodipodi:rx="144.28572"       sodipodi:ry="161.42857"       d="m 600.00002,513.79077 c 0,89.15454 -64.59892,161.42858 -144.28573,161.42858 -79.6868,0 -144.28572,-72.27404 -144.28572,-161.42858 0,-89.15454 64.59892,-161.42857 144.28572,-161.42857 79.68681,0 144.28573,72.27403 144.28573,161.42857 z"       transform="matrix(0.28877887,0,0,0.25811209,92.132758,620.67568)" />    <path       sodipodi:type="arc"       style="fill:#ffffff;fill-opacity:1;stroke:#3b3b3b;stroke-width:61.04665375;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none"       id="path3781-9-0-7-1-3-0"       sodipodi:cx="455.71429"       sodipodi:cy="513.79077"       sodipodi:rx="144.28572"       sodipodi:ry="161.42857"       d="m 600.00002,513.79077 c 0,89.15454 -64.59892,161.42858 -144.28573,161.42858 -79.6868,0 -144.28572,-72.27404 -144.28572,-161.42858 0,-89.15454 64.59892,-161.42857 144.28572,-161.42857 79.68681,0 144.28573,72.27403 144.28573,161.42857 z"       transform="matrix(0.28877887,0,0,0.25811209,457.84706,214.96137)" />    <path       sodipodi:type="arc"       style="fill:#ffffff;fill-opacity:1;stroke:#3b3b3b;stroke-width:61.04665375;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none"       id="path3781-9-0-7-1-1-2"       sodipodi:cx="455.71429"       sodipodi:cy="513.79077"       sodipodi:rx="144.28572"       sodipodi:ry="161.42857"       d="m 600.00002,513.79077 c 0,89.15454 -64.59892,161.42858 -144.28573,161.42858 -79.6868,0 -144.28572,-72.27404 -144.28572,-161.42858 0,-89.15454 64.59892,-161.42857 144.28572,-161.42857 79.68681,0 144.28573,72.27403 144.28573,161.42857 z"       transform="matrix(0.28877887,0,0,0.25811209,-30.152972,219.81853)" />    <text       xml:space="preserve"       style="font-size:40px;font-style:normal;font-weight:normal;line-height:125%;letter-spacing:0px;word-spacing:0px;fill:#3b3b3b;fill-opacity:1;stroke:none;font-family:Sans"       x="-387.96655"       y="630.61871"       id="text5479-9-0-6-4"       sodipodi:linespacing="125%"       transform="matrix(0.68747304,-0.7262099,0.7262099,0.68747304,0,0)"       inkscape:transform-center-x="239.86342"       inkscape:transform-center-y="-26.958107"><tspan         sodipodi:role="line"         id="tspan5481-8-8-9-7"         x="-387.96655"         y="630.61871"         style="font-size:200px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;letter-spacing:20px;fill:#3b3b3b;fill-opacity:1;font-family:RR Beaver;-inkscape-font-specification:RR Beaver">YAS</tspan></text>    <text       xml:space="preserve"       style="font-size:40px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;line-height:125%;letter-spacing:0px;word-spacing:0px;fill:#000000;fill-opacity:1;stroke:none;font-family:Theorem NBP;-inkscape-font-specification:Theorem NBP"       x="349.24683"       y="750.29126"       id="text5483-4-3-2"       sodipodi:linespacing="125%"><tspan         sodipodi:role="line"         id="tspan5485-6-5-7"         x="349.24683"         y="750.29126"         style="font-size:170px;font-style:italic;font-variant:normal;font-weight:bold;font-stretch:normal;letter-spacing:20px;fill:#c80000;fill-opacity:1;font-family:RR Beaver;-inkscape-font-specification:RR Beaver Bold Italic">GUI</tspan></text>    <path       sodipodi:type="arc"       style="fill:#ffffff;fill-opacity:1;stroke:#3b3b3b;stroke-width:61.04665375;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none"       id="path3781-9-7-4-1-4"       sodipodi:cx="455.71429"       sodipodi:cy="513.79077"       sodipodi:rx="144.28572"       sodipodi:ry="161.42857"       d="m 600.00002,513.79077 c 0,89.15454 -64.59892,161.42858 -144.28573,161.42858 -79.6868,0 -144.28572,-72.27404 -144.28572,-161.42858 0,-89.15454 64.59892,-161.42857 144.28572,-161.42857 79.68681,0 144.28573,72.27403 144.28573,161.42857 z"       transform="matrix(0.4331683,0,0,0.38716814,381.83246,155.72497)" />  </g></svg>',
	cross: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><g>	<path d="M83.288,88.13c-2.114,2.112-5.575,2.112-7.689,0L53.659,66.188c-2.114-2.112-5.573-2.112-7.687,0L24.251,87.907   c-2.113,2.114-5.571,2.114-7.686,0l-4.693-4.691c-2.114-2.114-2.114-5.573,0-7.688l21.719-21.721c2.113-2.114,2.113-5.573,0-7.686   L11.872,24.4c-2.114-2.113-2.114-5.571,0-7.686l4.842-4.842c2.113-2.114,5.571-2.114,7.686,0L46.12,33.591   c2.114,2.114,5.572,2.114,7.688,0l21.721-21.719c2.114-2.114,5.573-2.114,7.687,0l4.695,4.695c2.111,2.113,2.111,5.571-0.003,7.686   L66.188,45.973c-2.112,2.114-2.112,5.573,0,7.686L88.13,75.602c2.112,2.111,2.112,5.572,0,7.687L83.288,88.13z"/></g></svg>',
//	yasgui: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   x="0px"   y="0px"   viewBox="0 0 66.399998 66.399998"   enable-background="new 0 0 69.3 69.3"   xml:space="preserve"   height="100%"   width="100%"   inkscape:version="0.48.4 r9939"   ><g     id="g3"     transform="translate(-1.5,-1.5)"     style="fill:#ff0000"><path       d="M 34.7,1.5 C 16.4,1.5 1.5,16.4 1.5,34.7 1.5,53 16.4,67.9 34.7,67.9 53,67.9 67.9,53 67.9,34.7 67.9,16.4 53,1.5 34.7,1.5 z m 0,59.4 C 20.2,60.9 8.5,49.1 8.5,34.7 8.5,20.2 20.3,8.5 34.7,8.5 c 14.4,0 26.2,11.8 26.2,26.2 0,14.4 -11.8,26.2 -26.2,26.2 z"       id="path5"       inkscape:connector-curvature="0"       style="fill:#ff0000" /><path       d="m 34.6,47.1 c -1.4,0 -2.5,0.5 -3.5,1.5 -0.9,1 -1.4,2.2 -1.4,3.6 0,1.6 0.5,2.8 1.5,3.8 1,0.9 2.1,1.3 3.4,1.3 1.3,0 2.4,-0.5 3.4,-1.4 1,-0.9 1.5,-2.2 1.5,-3.7 0,-1.4 -0.5,-2.6 -1.4,-3.6 -0.9,-1 -2.1,-1.5 -3.5,-1.5 z"       id="path7"       inkscape:connector-curvature="0"       style="fill:#ff0000" /><path       d="m 34.8,13.9 c -1.5,0 -2.8,0.5 -3.7,1.6 -0.9,1 -1.4,2.4 -1.4,4.2 0,1.1 0.1,2.9 0.2,5.6 l 0.8,13.1 c 0.2,1.8 0.4,3.2 0.9,4.1 0.5,1.2 1.5,1.8 2.9,1.8 1.3,0 2.3,-0.7 2.9,-1.9 0.5,-1 0.7,-2.3 0.9,-4 L 39.4,25 c 0.1,-1.3 0.2,-2.5 0.2,-3.8 0,-2.2 -0.3,-3.9 -0.8,-5.1 -0.5,-1 -1.6,-2.2 -4,-2.2 z"       id="path9"       inkscape:connector-curvature="0"       style="fill:#ff0000" /></g></svg>',
};
},{}],71:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})(),
	utils = require('./utils.js'),
	YASGUI = require('./main.js');

module.exports = function(yasgui, id) {
	
	var tab = {id: id};
	var menu = require('./tabPaneMenu.js')(yasgui, tab);
	var $pane = $('<div>', {id:id, style: 'position:relative', class: 'tabPane'}).appendTo(yasgui.tabManager.$tabPanesParent);
	
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
					utils.onOutsideClick($(".menu-slide,.menuButton"), function() {$pane.removeClass('menu-open'); menu.store();});
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
		yasr.setResponse({response: data, contentType: xhr.getResponseHeader("Content-Type")});
	};
	tab.yasqe.options.sparql.callbacks.error = function(xhr, textStatus, errorThrown) {
		var exceptionMsg = textStatus + " (#" + xhr.status + ")";
		if (errorThrown && errorThrown.length) exceptionMsg += ": " + errorThrown;
		tab.yasr.setResponse({exception: exceptionMsg});
	};
	
	
	return tab;
}
},{"./main.js":undefined,"./tabPaneMenu.js":73,"./utils.js":74,"jquery":undefined}],72:[function(require,module,exports){
'use strict';
//adding tabs: http://jsfiddle.net/dogoku/KdPdZ/2/
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
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
},{"./tab.js":71,"jquery":undefined}],73:[function(require,module,exports){
'use strict';
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})(),
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
		$menu.append(
//			$('<div>', {class:'yasguiLogoContainer'})
//				.append(
						$(utils.svg.getElement(imgs.yasgui, {width: '70px', height: '58px'})).addClass('yasguiLogo')
//				)
		);
		
		//tab panel contains tabs and panes
		$tabPanel = $('<div>', {role: 'tabpanel'}).appendTo($menu);
		
		//init tabs
		$tabsParent = $('<ul>', {class:'nav nav-pills tabPaneMenuTabs', role: 'tablist'})
			.appendTo($tabPanel);
		
		//init panes
		$tabPanesParent = $('<div>', {class: 'tab-content'}).appendTo($tabPanel);
		
		
		/**
		 * Init request tab
		 */
		var li = $("<li>", {role: "presentation", class: "active"}).appendTo($tabsParent);
		var reqPaneId = 'yasgui_reqConfig_' +tab.id;
		li.append(
			$('<a>', {href: '#' + reqPaneId, 'aria-controls': reqPaneId,  role: 'tab', 'data-toggle': 'tab'})
			.text("Configure Request")
			.click(function(e) {
				e.preventDefault()
				$(this).tab('show')
			})
		);
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
			.append($("<option>", {value: 'application/sparql-results+json'}).text('JSON'))
			.append($("<option>", {value: 'application/sparql-results+xml'}).text('XML'))
			.append($("<option>", {value: 'text/csv'}).text('CSV'))
			.append($("<option>", {value: 'text/tab-separated-values'}).text('TSV'));
		$acceptGraph = $('<select>', {class: 'form-control'})
			.append($("<option>", {value: 'text/turtle'}).text('Turtle'))
			.append($("<option>", {value: 'application/rdf+xml'}).text('RDF-XML'))
			.append($("<option>", {value: 'text/csv'}).text('CSV'))
			.append($("<option>", {value: 'text/tab-separated-values'}).text('TSV'));
		$('<div>', {class:'col-md-4', role: 'group'}).append($('<label>').text('SELECT').append($acceptSelect)).appendTo($acceptRow);
		$('<div>', {class:'col-md-4', role: 'group'}).append($('<label>').text('Graph').append($acceptGraph)).appendTo($acceptRow);
		
		
		//URL args headers
		var $urlArgsRow = $('<div>', {class: 'row'}).appendTo($reqPanel);
		$('<div>', {class:'col-md-4 rowLabel'}).appendTo($urlArgsRow).text('URL Arguments');
		$urlArgsDiv = $('<div>', {class:'col-md-8', role: 'group'}).appendTo($urlArgsRow);
		
		
		//Default graphs
		var $defaultGraphsRow = $('<div>', {class: 'row'}).appendTo($reqPanel);
		$('<div>', {class:'col-md-4 rowLabel'}).appendTo($defaultGraphsRow).text('Default graphs');
		$defaultGraphsDiv = $('<div>', {class:'col-md-8', role: 'group'}).appendTo($defaultGraphsRow);
		
		
		//Named graphs
		var $namedGraphsRow = $('<div>', {class: 'row'}).appendTo($reqPanel);
		$('<div>', {class:'col-md-4 rowLabel'}).appendTo($namedGraphsRow).text('Named graphs');
		$namedGraphsDiv = $('<div>', {class:'col-md-8', role: 'group'}).appendTo($namedGraphsRow);

		
		
		/**
		 * Init history tab
		 */
		var li = $("<li>", {role: "presentation"}).appendTo($tabsParent);
		var historyPaneId = 'yasgui_history_' +tab.id;
		li.append(
			$('<a>', {href: '#' + historyPaneId, 'aria-controls': historyPaneId,  role: 'tab', 'data-toggle': 'tab'})
			.text("History")
			.click(function(e) {
				e.preventDefault();
				$(this).tab('show')
			})
		);
		var $reqPanel = $('<div>', {id: historyPaneId, class: 'tabPane history container-fluid'}).appendTo($tabPanesParent);
		
		
		
		/**
		 * Init collections tab
		 */
		var li = $("<li>", {role: "presentation"}).appendTo($tabsParent);
		var collectionsPaneId = 'yasgui_collections_' +tab.id;
		li.append(
			$('<a>', {href: '#' + collectionsPaneId, 'aria-controls': collectionsPaneId,  role: 'tab', 'data-toggle': 'tab'})
			.text("Collections")
			.click(function(e) {
				e.preventDefault()
				$(this).tab('show')
			})
		);
		var $reqPanel = $('<div>', {id: collectionsPaneId, class: 'tabPane collections container-fluid'}).appendTo($tabPanesParent);
		
		
		return $menu;
	};
	
	var addTextInputsTo = function($el, num, animate, vals) {
		var $inputsAndTogglesContainer = $('<div>', {class:'textInputsRow'});
//		var $inputsContainer = $('<div>', {class:'textInputs'}).appendTo($inputsAndTogglesContainer);
		for (var i = 0; i < num; i++) {
			var val = (vals && vals[i]? vals[i]: "");
			$('<input>', {type: 'text'})
				.val(val)
				.keyup(function() {
					var lastHasContent = false;
					$el.find('.textInputsRow:last input').each(function(i, input) {
						if ($(input).val().trim().length > 0) lastHasContent = true;
					});
					if (lastHasContent) addTextInputsTo($el, num, true);
				})
				.css('width', (90/num) + '%')
				.appendTo($inputsAndTogglesContainer);
		}
		$inputsAndTogglesContainer.append(
				$(utils.svg.getElement(imgs.cross, {width: '14px', height: '14px'}))
				.addClass('closeBtn')
				.css('display', '')//let our style sheets do the work here
				.click(function(){
					$(this).closest('.textInputsRow').remove();
				})
		);
		if (animate) {
			$inputsAndTogglesContainer.hide().appendTo($el).show('fast');
		} else {
			$inputsAndTogglesContainer.appendTo($el);
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


},{"./imgs.js":70,"jquery":undefined,"yasgui-utils":4}],74:[function(require,module,exports){
var $ = (function(){try{return require('jquery')}catch(e){return window.jQuery}})();
module.exports = {
	escapeHtmlEntities : function(unescapedString) {
		var tagsToReplace = {
			'&' : '&amp;',
			'<' : '&lt;',
			'>' : '&gt;'
		};

		var replaceTag = function(tag) {
			return tagsToReplace[tag] || tag;
		}

		return unescapedString.replace(/[&<>]/g, replaceTag);
	},
	onOutsideClick : function(container, onOutsideClick) {
		$(document).mouseup(function(e) {
			if (!container.is(e.target) // if the target of the click isn't the container...
					&& container.has(e.target).length === 0) // ... nor a descendant of the container
			{
				onOutsideClick();
			}
		});
	}
}
},{"jquery":undefined}]},{},[1])(1)
});


//# sourceMappingURL=yasgui.js.map