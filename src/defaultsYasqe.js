'use strict';

module.exports = {
	persistent: null,//handled in YASGUI directly
	consumeShareLink: null,
	createShareLink: null,
	sparql: {
		showQueryButton: true,
		acceptHeaderGraph: "text/turtle",
		acceptHeaderSelect: "application/sparql-results+json"
	}
};