'use strict';
var $ = require('jquery'),
	selectize = require('selectize'),
	utils = require('yasgui-utils');
	


selectize.define('allowRegularTextInput', function(options) {
	var self = this;

	this.onMouseDown = (function() {

		var original = self.onMouseDown;
		return function(e) {
			
			
			if (!self.$dropdown.is(":visible")) {
				//receiving focus via mouse click
				original.apply(this, arguments);
				
				//this is a trick to make each value editable
				//a bit strange, but the only trick to avoid static values
				//and, this allows copy-ing (ctrl-c) of endpoints as well now
				var val = this.getValue();
				this.clear(true);
				this.setTextboxValue(val);
				this.refreshOptions(true);
			} else {
				//avoid closing the dropdown on second click. now, we can move the cursor using the mouse
				e.stopPropagation();
				e.preventDefault();
			}
		}
	})();
});


$.fn.endpointCombi = function(yasgui, options) {
	var checkCorsEnabled = function(endpoint) {
		if (!yasgui.corsEnabled) yasgui.corsEnabled = {};
		if (!(endpoint in yasgui.corsEnabled)) {
			$.ajax({
				url: endpoint, 
				data: {query: 'ASK {?x ?y ?z}'}, 
				complete: function(jqXHR){
					yasgui.corsEnabled[endpoint] = jqXHR.status > 0;
				}
			});
		}
	};
	var storeEndpoints = function(optGroup) {
		var persistencyId =  null;
		if (yasgui.persistencyPrefix) {
			persistencyId = yasgui.persistencyPrefix + 'endpoint_' + optGroup;
		}
		var endpoints = [];
		for (var val in $select[0].selectize.options) {
			var option = $select[0].selectize.options[val];
			if (option.optgroup == optGroup) {
				var endpoint = {
					endpoint: option.endpoint
				}
				if (option.text) endpoint.label = option.text;
				endpoints.push(endpoint);
			}
		};
		
		
		utils.storage.set(persistencyId, endpoints);
		
		
		
	}
	
	//support callback
	var getEndpoints = function(callback, optGroup) {
		var persistencyId =  null;
		if (yasgui.persistencyPrefix) {
			persistencyId = yasgui.persistencyPrefix + 'endpoint_' + optGroup;
		}
		var endpoints = utils.storage.get(persistencyId);
		
		if (!endpoints && optGroup == 'catalogue') {
			endpoints = getCkanEndpoints();
			
			//and store them in localstorage as well!
			utils.storage.set(persistencyId, endpoints);
		}
		callback(endpoints, optGroup);
	};
	
	
	
	var $select = this;
	var defaults = {
		selectize: {
			plugins: ['allowRegularTextInput'],
			create: function(input, callback) {
				callback({'endpoint': input, optgroup:'own'});
			},
			
			createOnBlur: true,
			onItemAdd: function(value, $item) {
				if (options.onChange) options.onChange(value);
				if (yasgui.options.api.corsProxy) checkCorsEnabled(value);
			},
			onOptionRemove: function(value) {
				storeEndpoints('own');
				storeEndpoints('catalogue');
			},
			optgroups: [
				{value: 'own', label: 'History'},
				{value: 'catalogue', label: 'Catalogue'},
			],
			optgroupOrder: ['own', 'catalogue'],
			sortField: 'endpoint',
			valueField: 'endpoint',
			labelField: 'endpoint',
			searchField: ['endpoint', 'text'],
			render: {
				option: function(data, escape){
					var remove = '<a href="javascript:void(0)"  class="close pull-right" tabindex="-1" '+
						'title="Remove from ' + (data.optgroup == 'own'? 'history' : 'catalogue') + '">&times;</a>';
					var url = '<div class="endpointUrl">' + escape(data.endpoint) + '</div>';
					var label = '';
					if (data.text) label = '<div class="endpointTitle">' + escape(data.text) + '</div>';
					return '<div class="endpointOptionRow">' + remove + url + label + '</div>';
				}
			}
		},
	};
	
	
	if (options) {
		options = $.extend(true, {}, defaults, options);
	} else {
		options = defaults;
	}
	
	
	this.addClass('endpointText form-control');
	this.selectize(options.selectize);
	
	/**
	 * THIS IS UGLY!!!!
	 * Problem: the original option handler from selectize executes the preventDefault and stopPropagation functions
	 * I.e., I cannot add my own handler to a sub-element of the option (such as a 'deleteOption' button)
	 * Only way to do this would be to haven an inline handler ('onMousDown') definition, which is even uglier
	 * So, for now, remove all mousedown handlers for options, and add the same functionality of selectize myself.
	 * I'll keep the stopPropagation in there to keep it as consistent as possible with the original code
	 * But I'll add some logic which executed whenever the delete button is pressed...
	 */
	$select[0].selectize.$dropdown.off('mousedown', '[data-selectable]');//disable handler set by selectize
	//add same handler (but slightly extended) myself:
	$select[0].selectize.$dropdown.on('mousedown', '[data-selectable]', function(e) {
		var value, $target, $option, self = $select[0].selectize;
		
		if (e.preventDefault) {
			e.preventDefault();
			e.stopPropagation();
		}

		$target = $(e.currentTarget);
		if ($(e.target).hasClass('close')) {
			$select[0].selectize.removeOption($target.attr('data-value'));
			$select[0].selectize.refreshOptions();
		} else if ($target.hasClass('create')) {
			self.createItem();
		} else {
			value = $target.attr('data-value');
			if (typeof value !== 'undefined') {
				self.lastQuery = null;
				self.setTextboxValue('');
				self.addItem(value);
				if (!self.settings.hideSelected && e.type && /mouse/.test(e.type)) {
					self.setActiveOption(self.getOption(value));
				}
			}
		}
	});
	
	
	var optionAddCallback = function(val, option) {
		if (option.optgroup) {
			storeEndpoints(option.optgroup);
		}
	};
	
	var storeEndpointsInSelectize = function(endpointArray, optgroup) {
		if (endpointArray) {
			//first disable callback. don't want to run this for endpoints fetched from local storage and ckan
			$select[0].selectize.off('option_add', optionAddCallback);
			
			endpointArray.forEach(function(val) {
				$select[0].selectize.addOption({endpoint: val.endpoint, text:val.title, optgroup:optgroup});
			});
			
			//re-enable it again
			$select[0].selectize.on('option_add', optionAddCallback);
		}
	}
	
	getEndpoints(storeEndpointsInSelectize, 'catalogue');
	getEndpoints(storeEndpointsInSelectize, 'own');
	
	
	if (options.value) {
		if (!(options.value in $select[0].selectize.options)) {
			$select[0].selectize.addOption({endpoint: options.value, optgroup:'own'});
		}
		$select[0].selectize.addItem(options.value);
	}
	
	
	
	
	return this;

};





/**
 * Yes, UGLY as well... Problem is: there is NO public catalogue API or SPARQL endpoint (which is cors enabled and works without api key)
 * I'm waiting for SPARQLES to make a public SPARQL endpoint of TPF API....
 * For now, just store this list (scraped from the SPARQLES website) statically..
 */
var getCkanEndpoints = function() {
	var endpoints = [
        {endpoint: 'http%3A%2F%2Fvisualdataweb.infor.uva.es%2Fsparql'},
		{endpoint: 'http%3A%2F%2Fbiolit.rkbexplorer.com%2Fsparql', title: 'A Short Biographical Dictionary of English Literature (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Faemet.linkeddata.es%2Fsparql', title: 'AEMET metereological dataset'},
		{endpoint: 'http%3A%2F%2Fsparql.jesandco.org%3A8890%2Fsparql', title: 'ASN:US'},
		{endpoint: 'http%3A%2F%2Fdata.allie.dbcls.jp%2Fsparql', title: 'Allie Abbreviation And Long Form Database in Life Science'},
		{endpoint: 'http%3A%2F%2Fvocabulary.semantic-web.at%2FPoolParty%2Fsparql%2FAustrianSkiTeam', title: 'Alpine Ski Racers of Austria'},
		{endpoint: 'http%3A%2F%2Fsemanticweb.cs.vu.nl%2Feuropeana%2Fsparql%2F', title: 'Amsterdam Museum as Linked Open Data in the Europeana Data Model'},
		{endpoint: 'http%3A%2F%2Fopendata.aragon.es%2Fsparql', title: 'AragoDBPedia'},
		{endpoint: 'http%3A%2F%2Fdata.archiveshub.ac.uk%2Fsparql', title: 'Archives Hub Linked Data'},
		{endpoint: 'http%3A%2F%2Fwww.auth.gr%2Fsparql', title: 'Aristotle University'},
		{endpoint: 'http%3A%2F%2Facm.rkbexplorer.com%2Fsparql%2F', title: 'Association for Computing Machinery (ACM) (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fabs.270a.info%2Fsparql', title: 'Australian Bureau of Statistics (ABS) Linked Data'},
		{endpoint: 'http%3A%2F%2Flab.environment.data.gov.au%2Fsparql', title: 'Australian Climate Observations Reference Network - Surface Air Temperature Dataset'},
		{endpoint: 'http%3A%2F%2Flod.b3kat.de%2Fsparql', title: 'B3Kat - Library Union Catalogues of Bavaria, Berlin and Brandenburg'},
		{endpoint: 'http%3A%2F%2Fdati.camera.it%2Fsparql', },
		{endpoint: 'http%3A%2F%2Fbis.270a.info%2Fsparql', title: 'Bank for International Settlements (BIS) Linked Data'},
		{endpoint: 'http%3A%2F%2Fwww.open-biomed.org.uk%2Fsparql%2Fendpoint%2Fbdgp_20081030', title: 'Bdgp'},
		{endpoint: 'http%3A%2F%2Faffymetrix.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Affymetrix'},
		{endpoint: 'http%3A%2F%2Fbiomodels.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Biomodels'},
		{endpoint: 'http%3A%2F%2Fbioportal.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Bioportal'},
		{endpoint: 'http%3A%2F%2Fclinicaltrials.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Clinicaltrials'},
		{endpoint: 'http%3A%2F%2Fctd.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Ctd'},
		{endpoint: 'http%3A%2F%2Fdbsnp.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Dbsnp'},
		{endpoint: 'http%3A%2F%2Fdrugbank.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Drugbank'},
		{endpoint: 'http%3A%2F%2Fgenage.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Genage'},
		{endpoint: 'http%3A%2F%2Fgendr.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Gendr'},
		{endpoint: 'http%3A%2F%2Fgoa.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Goa'},
		{endpoint: 'http%3A%2F%2Fhgnc.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Hgnc'},
		{endpoint: 'http%3A%2F%2Fhomologene.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Homologene'},
		{endpoint: 'http%3A%2F%2Finoh.bio2rdf.org%2Fsparql', title: 'Bio2RDF::INOH'},
		{endpoint: 'http%3A%2F%2Finterpro.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Interpro'},
		{endpoint: 'http%3A%2F%2Fiproclass.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Iproclass'},
		{endpoint: 'http%3A%2F%2Firefindex.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Irefindex'},
		{endpoint: 'http%3A%2F%2Fbiopax.kegg.bio2rdf.org%2Fsparql', title: 'Bio2RDF::KEGG::BioPAX'},
		{endpoint: 'http%3A%2F%2Flinkedspl.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Linkedspl'},
		{endpoint: 'http%3A%2F%2Flsr.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Lsr'},
		{endpoint: 'http%3A%2F%2Fmesh.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Mesh'},
		{endpoint: 'http%3A%2F%2Fmgi.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Mgi'},
		{endpoint: 'http%3A%2F%2Fncbigene.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Ncbigene'},
		{endpoint: 'http%3A%2F%2Fndc.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Ndc'},
		{endpoint: 'http%3A%2F%2Fnetpath.bio2rdf.org%2Fsparql', title: 'Bio2RDF::NetPath'},
		{endpoint: 'http%3A%2F%2Fomim.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Omim'},
		{endpoint: 'http%3A%2F%2Forphanet.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Orphanet'},
		{endpoint: 'http%3A%2F%2Fpid.bio2rdf.org%2Fsparql', title: 'Bio2RDF::PID'},
		{endpoint: 'http%3A%2F%2Fbiopax.pharmgkb.bio2rdf.org%2Fsparql', title: 'Bio2RDF::PharmGKB::BioPAX'},
		{endpoint: 'http%3A%2F%2Fpharmgkb.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Pharmgkb'},
		{endpoint: 'http%3A%2F%2Fpubchem.bio2rdf.org%2Fsparql', title: 'Bio2RDF::PubChem'},
		{endpoint: 'http%3A%2F%2Frhea.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Rhea'},
		{endpoint: 'http%3A%2F%2Fspike.bio2rdf.org%2Fsparql', title: 'Bio2RDF::SPIKE'},
		{endpoint: 'http%3A%2F%2Fsabiork.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Sabiork'},
		{endpoint: 'http%3A%2F%2Fsgd.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Sgd'},
		{endpoint: 'http%3A%2F%2Fsider.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Sider'},
		{endpoint: 'http%3A%2F%2Ftaxonomy.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Taxonomy'},
		{endpoint: 'http%3A%2F%2Fwikipathways.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Wikipathways'},
		{endpoint: 'http%3A%2F%2Fwormbase.bio2rdf.org%2Fsparql', title: 'Bio2RDF::Wormbase'},
		{endpoint: 'https%3A%2F%2Fwww.ebi.ac.uk%2Frdf%2Fservices%2Fbiomodels%2Fsparql', title: 'BioModels RDF'},
		{endpoint: 'https%3A%2F%2Fwww.ebi.ac.uk%2Frdf%2Fservices%2Fbiosamples%2Fsparql', title: 'BioSamples RDF'},
		{endpoint: 'http%3A%2F%2Fhelheim.deusto.es%2Fbizkaisense%2Fsparql', title: 'BizkaiSense'},
		{endpoint: 'http%3A%2F%2Fbnb.data.bl.uk%2Fsparql', },
		{endpoint: 'http%3A%2F%2Fbudapest.rkbexplorer.com%2Fsparql%2F', title: 'Budapest University of Technology and Economics (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fbfs.270a.info%2Fsparql', title: 'Bundesamt für Statistik (BFS) - Swiss Federal Statistical Office (FSO) Linked Data'},
		{endpoint: 'http%3A%2F%2Fopendata-bundestag.de%2Fsparql', title: 'BundestagNebeneinkuenfte'},
		{endpoint: 'http%3A%2F%2Fdata.colinda.org%2Fendpoint.php', title: 'COLINDA - Conference Linked Data'},
		{endpoint: 'http%3A%2F%2Fcrtm.linkeddata.es%2Fsparql', title: 'CRTM'},
		{endpoint: 'http%3A%2F%2Fdata.fundacionctic.org%2Fsparql', title: 'CTIC Public Dataset Catalogs'},
		{endpoint: 'https%3A%2F%2Fwww.ebi.ac.uk%2Frdf%2Fservices%2Fchembl%2Fsparql', title: 'ChEMBL RDF'},
		{endpoint: 'http%3A%2F%2Fchebi.bio2rdf.org%2Fsparql', title: 'Chemical Entities of Biological Interest (ChEBI)'},
		{endpoint: 'http%3A%2F%2Fciteseer.rkbexplorer.com%2Fsparql%2F', title: 'CiteSeer (Research Index) (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fcordis.rkbexplorer.com%2Fsparql%2F', title: 'Community R&amp;D Information Service (CORDIS) (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fsemantic.ckan.net%2Fsparql%2F', title: 'Comprehensive Knowledge Archive Network'},
		{endpoint: 'http%3A%2F%2Fvocabulary.wolterskluwer.de%2FPoolParty%2Fsparql%2Fcourt', title: 'Courts thesaurus'},
		{endpoint: 'http%3A%2F%2Fcultura.linkeddata.es%2Fsparql', title: 'CulturaLinkedData'},
		{endpoint: 'http%3A%2F%2Fdblp.rkbexplorer.com%2Fsparql%2F', title: 'DBLP Computer Science Bibliography (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fdblp.l3s.de%2Fd2r%2Fsparql', title: 'DBLP in RDF (L3S)'},
		{endpoint: 'http%3A%2F%2Fdbtune.org%2Fmusicbrainz%2Fsparql', title: 'DBTune.org Musicbrainz D2R Server'},
		{endpoint: 'http%3A%2F%2Fdbpedia.org%2Fsparql', title: 'DBpedia'},
		{endpoint: 'http%3A%2F%2Feu.dbpedia.org%2Fsparql', title: 'DBpedia in Basque'},
		{endpoint: 'http%3A%2F%2Fnl.dbpedia.org%2Fsparql', title: 'DBpedia in Dutch'},
		{endpoint: 'http%3A%2F%2Ffr.dbpedia.org%2Fsparql', title: 'DBpedia in French'},
		{endpoint: 'http%3A%2F%2Fde.dbpedia.org%2Fsparql', title: 'DBpedia in German'},
		{endpoint: 'http%3A%2F%2Fja.dbpedia.org%2Fsparql', title: 'DBpedia in Japanese'},
		{endpoint: 'http%3A%2F%2Fpt.dbpedia.org%2Fsparql', title: 'DBpedia in Portuguese'},
		{endpoint: 'http%3A%2F%2Fes.dbpedia.org%2Fsparql', title: 'DBpedia in Spanish'},
		{endpoint: 'http%3A%2F%2Flive.dbpedia.org%2Fsparql', title: 'DBpedia-Live'},
		{endpoint: 'http%3A%2F%2Fdeploy.rkbexplorer.com%2Fsparql%2F', title: 'DEPLOY (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fdata.ox.ac.uk%2Fsparql%2F', },
		{endpoint: 'http%3A%2F%2Fdatos.bcn.cl%2Fsparql', title: 'Datos.bcn.cl'},
		{endpoint: 'http%3A%2F%2Fdeepblue.rkbexplorer.com%2Fsparql%2F', title: 'Deep Blue (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fdewey.info%2Fsparql.php', title: 'Dewey Decimal Classification (DDC)'},
		{endpoint: 'http%3A%2F%2Frdf.disgenet.org%2Fsparql%2F', title: 'DisGeNET'},
		{endpoint: 'http%3A%2F%2Fitaly.rkbexplorer.com%2Fsparql', title: 'Diverse Italian ReSIST Partner Institutions (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fdutchshipsandsailors.nl%2Fdata%2Fsparql%2F', title: 'Dutch Ships and Sailors '},
		{endpoint: 'http%3A%2F%2Fsemanticweb.cs.vu.nl%2Fdss%2Fsparql%2F', title: 'Dutch Ships and Sailors '},
		{endpoint: 'http%3A%2F%2Fwww.eclap.eu%2Fsparql', title: 'ECLAP'},
		{endpoint: 'http%3A%2F%2Fcr.eionet.europa.eu%2Fsparql', },
		{endpoint: 'http%3A%2F%2Fera.rkbexplorer.com%2Fsparql%2F', title: 'ERA - Australian Research Council publication ratings (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fkent.zpr.fer.hr%3A8080%2FeducationalProgram%2Fsparql', title: 'Educational programs - SISVU'},
		{endpoint: 'http%3A%2F%2Fwebenemasuno.linkeddata.es%2Fsparql', title: 'El Viajero\'s tourism dataset'},
		{endpoint: 'http%3A%2F%2Fwww.ida.liu.se%2Fprojects%2Fsemtech%2Fopenrdf-sesame%2Frepositories%2Fenergy', title: 'Energy efficiency assessments and improvements'},
		{endpoint: 'http%3A%2F%2Fheritagedata.org%2Flive%2Fsparql', },
		{endpoint: 'http%3A%2F%2Fenipedia.tudelft.nl%2Fsparql', title: 'Enipedia - Energy Industry Data'},
		{endpoint: 'http%3A%2F%2Fenvironment.data.gov.uk%2Fsparql%2Fbwq%2Fquery', title: 'Environment Agency Bathing Water Quality'},
		{endpoint: 'http%3A%2F%2Fecb.270a.info%2Fsparql', title: 'European Central Bank (ECB) Linked Data'},
		{endpoint: 'http%3A%2F%2Fsemantic.eea.europa.eu%2Fsparql', },
		{endpoint: 'http%3A%2F%2Feuropeana.ontotext.com%2Fsparql', },
		{endpoint: 'http%3A%2F%2Feventmedia.eurecom.fr%2Fsparql', title: 'EventMedia'},
		{endpoint: 'http%3A%2F%2Fdata.linkedu.eu%2Fforge%2Fquery', title: 'FORGE Course information'},
		{endpoint: 'http%3A%2F%2Ffactforge.net%2Fsparql', title: 'Fact Forge'},
		{endpoint: 'http%3A%2F%2Flogd.tw.rpi.edu%2Fsparql', },
		{endpoint: 'http%3A%2F%2Ffrb.270a.info%2Fsparql', title: 'Federal Reserve Board (FRB) Linked Data'},
		{endpoint: 'http%3A%2F%2Fwww.open-biomed.org.uk%2Fsparql%2Fendpoint%2Fflybase', title: 'Flybase'},
		{endpoint: 'http%3A%2F%2Fwww.open-biomed.org.uk%2Fsparql%2Fendpoint%2Fflyted', title: 'Flyted'},
		{endpoint: 'http%3A%2F%2Ffao.270a.info%2Fsparql', title: 'Food and Agriculture Organization of the United Nations (FAO) Linked Data'},
		{endpoint: 'http%3A%2F%2Fft.rkbexplorer.com%2Fsparql%2F', title: 'France Telecom Recherche et Développement (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Flisbon.rkbexplorer.com%2Fsparql', title: 'Fundação da Faculdade de Ciencas da Universidade de Lisboa (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fwww.ebi.ac.uk%2Frdf%2Fservices%2Fatlas%2Fsparql', title: 'Gene Expression Atlas RDF'},
		{endpoint: 'http%3A%2F%2Fgeo.linkeddata.es%2Fsparql', title: 'GeoLinkedData'},
		{endpoint: 'http%3A%2F%2Fresource.geolba.ac.at%2FPoolParty%2Fsparql%2FGeologicTimeScale', title: 'Geological Survey of Austria (GBA) - Thesaurus'},
		{endpoint: 'http%3A%2F%2Fresource.geolba.ac.at%2FPoolParty%2Fsparql%2FGeologicUnit', title: 'Geological Survey of Austria (GBA) - Thesaurus'},
		{endpoint: 'http%3A%2F%2Fresource.geolba.ac.at%2FPoolParty%2Fsparql%2Flithology', title: 'Geological Survey of Austria (GBA) - Thesaurus'},
		{endpoint: 'http%3A%2F%2Fresource.geolba.ac.at%2FPoolParty%2Fsparql%2Ftectonicunit', title: 'Geological Survey of Austria (GBA) - Thesaurus'},
		{endpoint: 'http%3A%2F%2Fvocabulary.wolterskluwer.de%2FPoolParty%2Fsparql%2Farbeitsrecht', title: 'German labor law thesaurus'},
		{endpoint: 'http%3A%2F%2Fdata.globalchange.gov%2Fsparql', title: 'Global Change Information System'},
		{endpoint: 'http%3A%2F%2Fwordnet.okfn.gr%3A8890%2Fsparql%2F', title: 'Greek Wordnet'},
		{endpoint: 'http%3A%2F%2Flod.hebis.de%2Fsparql', title: 'HeBIS - Bibliographic Resources of the Library Union Catalogues of Hessen and parts of the Rhineland Palatinate'},
		{endpoint: 'http%3A%2F%2Fhealthdata.tw.rpi.edu%2Fsparql', title: 'HealthData.gov Platform (HDP) on the Semantic Web'},
		{endpoint: 'http%3A%2F%2Fhelheim.deusto.es%2Fhedatuz%2Fsparql', title: 'Hedatuz'},
		{endpoint: 'http%3A%2F%2Fgreek-lod.auth.gr%2Ffire-brigade%2Fsparql', title: 'Hellenic Fire Brigade'},
		{endpoint: 'http%3A%2F%2Fgreek-lod.auth.gr%2Fpolice%2Fsparql', title: 'Hellenic Police'},
		{endpoint: 'http%3A%2F%2Fsetaria.oszk.hu%2Fsparql', title: 'Hungarian National Library (NSZL) catalog'},
		{endpoint: 'http%3A%2F%2Fsemanticweb.cs.vu.nl%2Fiati%2Fsparql%2F', title: 'IATI as Linked Data'},
		{endpoint: 'http%3A%2F%2Fibm.rkbexplorer.com%2Fsparql%2F', title: 'IBM Research GmbH (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fwww.icane.es%2Fopendata%2Fsparql', title: 'ICANE'},
		{endpoint: 'http%3A%2F%2Fieee.rkbexplorer.com%2Fsparql%2F', title: 'IEEE Papers (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fieeevis.tw.rpi.edu%2Fsparql', title: 'IEEE VIS Source Data'},
		{endpoint: 'http%3A%2F%2Fwww.imagesnippets.com%2Fsparql%2Fimages', title: 'Imagesnippets Image Descriptions'},
		{endpoint: 'http%3A%2F%2Fopendatacommunities.org%2Fsparql', },
		{endpoint: 'http%3A%2F%2Fpurl.org%2Ftwc%2Fhub%2Fsparql', title: 'Instance Hub (all)'},
		{endpoint: 'http%3A%2F%2Feurecom.rkbexplorer.com%2Fsparql%2F', title: 'Institut Eurécom (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fimf.270a.info%2Fsparql', title: 'International Monetary Fund (IMF) Linked Data'},
		{endpoint: 'http%3A%2F%2Fwww.rechercheisidore.fr%2Fsparql', title: 'Isidore'},
		{endpoint: 'http%3A%2F%2Fsparql.kupkb.org%2Fsparql', title: 'Kidney and Urinary Pathway Knowledge Base'},
		{endpoint: 'http%3A%2F%2Fkisti.rkbexplorer.com%2Fsparql%2F', title: 'Korean Institute of Science Technology and Information (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Flod.kaist.ac.kr%2Fsparql', title: 'Korean Traditional Recipes'},
		{endpoint: 'http%3A%2F%2Flaas.rkbexplorer.com%2Fsparql%2F', title: 'LAAS-CNRS (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fsmartcity.linkeddata.es%2Fsparql', title: 'LCC (Leeds City Council Energy Consumption Linked Data)'},
		{endpoint: 'http%3A%2F%2Flod.ac%2Fbdls%2Fsparql', title: 'LODAC BDLS'},
		{endpoint: 'http%3A%2F%2Fdata.linkededucation.org%2Frequest%2Flak-conference%2Fsparql', title: 'Learning Analytics and Knowledge (LAK) Dataset'},
		{endpoint: 'http%3A%2F%2Fwww.linklion.org%3A8890%2Fsparql', title: 'LinkLion - A Link Repository for the Web of Data'},
		{endpoint: 'http%3A%2F%2Fsparql.reegle.info%2F', title: 'Linked Clean Energy Data (reegle.info)'},
		{endpoint: 'http%3A%2F%2Fsparql.contextdatacloud.org', title: 'Linked Crowdsourced Data'},
		{endpoint: 'http%3A%2F%2Flinkedlifedata.com%2Fsparql', title: 'Linked Life Data'},
		{endpoint: 'http%3A%2F%2Fdata.logainm.ie%2Fsparql', title: 'Linked Logainm'},
		{endpoint: 'http%3A%2F%2Fdata.linkedmdb.org%2Fsparql', title: 'Linked Movie DataBase'},
		{endpoint: 'http%3A%2F%2Fdata.aalto.fi%2Fsparql', title: 'Linked Open Aalto Data Service'},
		{endpoint: 'http%3A%2F%2Fdbmi-icode-01.dbmi.pitt.edu%2FlinkedSPLs%2Fsparql', title: 'Linked Structured Product Labels'},
		{endpoint: 'http%3A%2F%2Flinkedgeodata.org%2Fsparql%2F', title: 'LinkedGeoData'},
		{endpoint: 'http%3A%2F%2Flinkedspending.aksw.org%2Fsparql', title: 'LinkedSpending: OpenSpending becomes Linked Open Data'},
		{endpoint: 'http%3A%2F%2Fhelheim.deusto.es%2Flinkedstats%2Fsparql', title: 'LinkedStats'},
		{endpoint: 'http%3A%2F%2Flinkedu.eu%2Fcatalogue%2Fsparql%2F', title: 'LinkedUp Catalogue of Educational Datasets'},
		{endpoint: 'http%3A%2F%2Fid.sgcb.mcu.es%2Fsparql', title: 'Lista de  Encabezamientos de Materia as Linked Open Data'},
		{endpoint: 'http%3A%2F%2Fonto.mondis.cz%2Fopenrdf-sesame%2Frepositories%2Fmondis-record-owlim', title: 'MONDIS'},
		{endpoint: 'http%3A%2F%2Fapps.morelab.deusto.es%2Flabman%2Fsparql', title: 'MORElab'},
		{endpoint: 'http%3A%2F%2Fsparql.msc2010.org', title: 'Mathematics Subject Classification'},
		{endpoint: 'http%3A%2F%2Fdoc.metalex.eu%3A8000%2Fsparql%2F', title: 'MetaLex Document Server'},
		{endpoint: 'http%3A%2F%2Frdf.muninn-project.org%2Fsparql', title: 'Muninn World War I'},
		{endpoint: 'http%3A%2F%2Flod.sztaki.hu%2Fsparql', title: 'National Digital Data Archive of Hungary (partial)'},
		{endpoint: 'http%3A%2F%2Fnsf.rkbexplorer.com%2Fsparql%2F', title: 'National Science Foundation (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fdata.nobelprize.org%2Fsparql', title: 'Nobel Prizes'},
		{endpoint: 'http%3A%2F%2Fdata.lenka.no%2Fsparql', title: 'Norwegian geo-divisions'},
		{endpoint: 'http%3A%2F%2Fspatial.ucd.ie%2Flod%2Fsparql', title: 'OSM Semantic Network'},
		{endpoint: 'http%3A%2F%2Fdata.linkedu.eu%2Fdon%2Fquery', title: 'OUNL DSpace in RDF'},
		{endpoint: 'http%3A%2F%2Fdata.oceandrilling.org%2Fsparql', },
		{endpoint: 'http%3A%2F%2Fonto.beef.org.pl%2Fsparql', title: 'OntoBeef'},
		{endpoint: 'http%3A%2F%2Foai.rkbexplorer.com%2Fsparql%2F', title: 'Open Archive Initiative Harvest over OAI-PMH (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fdata.linkedu.eu%2Focw%2Fquery', title: 'Open Courseware Consortium metadata in RDF'},
		{endpoint: 'http%3A%2F%2Fopendata.ccd.uniroma2.it%2FLMF%2Fsparql%2Fselect', title: 'Open Data @ Tor Vergata'},
		{endpoint: 'http%3A%2F%2Fvocabulary.semantic-web.at%2FPoolParty%2Fsparql%2FOpenData', title: 'Open Data Thesaurus'},
		{endpoint: 'http%3A%2F%2Fdata.cnr.it%2Fsparql-proxy%2F', title: 'Open Data from the Italian National Research Council'},
		{endpoint: 'http%3A%2F%2Fdata.utpl.edu.ec%2Fecuadorresearch%2Flod%2Fsparql', title: 'Open Data of Ecuador'},
		{endpoint: 'http%3A%2F%2Fen.openei.org%2Fsparql', title: 'OpenEI - Open Energy Info'},
		{endpoint: 'http%3A%2F%2Flod.openlinksw.com%2Fsparql', title: 'OpenLink Software LOD Cache'},
		{endpoint: 'http%3A%2F%2Fsparql.openmobilenetwork.org', title: 'OpenMobileNetwork'},
		{endpoint: 'http%3A%2F%2Fapps.ideaconsult.net%3A8080%2Fontology', title: 'OpenTox'},
		{endpoint: 'http%3A%2F%2Fgov.tso.co.uk%2Fcoins%2Fsparql', title: 'OpenUpLabs COINS'},
		{endpoint: 'http%3A%2F%2Fgov.tso.co.uk%2Fdclg%2Fsparql', title: 'OpenUpLabs DCLG'},
		{endpoint: 'http%3A%2F%2Fos.services.tso.co.uk%2Fgeo%2Fsparql', title: 'OpenUpLabs Geographic'},
		{endpoint: 'http%3A%2F%2Fgov.tso.co.uk%2Flegislation%2Fsparql', title: 'OpenUpLabs Legislation'},
		{endpoint: 'http%3A%2F%2Fgov.tso.co.uk%2Ftransport%2Fsparql', title: 'OpenUpLabs Transport'},
		{endpoint: 'http%3A%2F%2Fos.rkbexplorer.com%2Fsparql%2F', title: 'Ordnance Survey (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fdata.organic-edunet.eu%2Fsparql', title: 'Organic Edunet Linked Open Data'},
		{endpoint: 'http%3A%2F%2Foecd.270a.info%2Fsparql', title: 'Organisation for Economic Co-operation and Development (OECD) Linked Data'},
		{endpoint: 'https%3A%2F%2Fdata.ox.ac.uk%2Fsparql%2F', title: 'OxPoints (University of Oxford)'},
		{endpoint: 'http%3A%2F%2Fdata.linkedu.eu%2Fprod%2Fquery', title: 'PROD - JISC Project Directory in RDF'},
		{endpoint: 'http%3A%2F%2Fld.panlex.org%2Fsparql', title: 'PanLex'},
		{endpoint: 'http%3A%2F%2Flinked-data.org%2Fsparql', title: 'Phonetics Information Base and Lexicon (PHOIBLE)'},
		{endpoint: 'http%3A%2F%2Flinked.opendata.cz%2Fsparql', title: 'Publications of Charles University in Prague'},
		{endpoint: 'http%3A%2F%2Flinkeddata4.dia.fi.upm.es%3A8907%2Fsparql', title: 'RDFLicense'},
		{endpoint: 'http%3A%2F%2Frisks.rkbexplorer.com%2Fsparql%2F', title: 'RISKS Digest (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fruian.linked.opendata.cz%2Fsparql', title: 'RUIAN - Register of territorial identification, addresses and real estates of the Czech Republic'},
		{endpoint: 'http%3A%2F%2Fcurriculum.rkbexplorer.com%2Fsparql%2F', title: 'ReSIST MSc in Resilient Computing Curriculum (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fwiki.rkbexplorer.com%2Fsparql%2F', title: 'ReSIST Project Wiki (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fresex.rkbexplorer.com%2Fsparql%2F', title: 'ReSIST Resilience Mechanisms (RKBExplorer.com)'},
		{endpoint: 'https%3A%2F%2Fwww.ebi.ac.uk%2Frdf%2Fservices%2Freactome%2Fsparql', title: 'Reactome RDF'},
		{endpoint: 'http%3A%2F%2Flod.xdams.org%2Fsparql', },
		{endpoint: 'http%3A%2F%2Frae2001.rkbexplorer.com%2Fsparql%2F', title: 'Research Assessment Exercise 2001 (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fcourseware.rkbexplorer.com%2Fsparql%2F', title: 'Resilient Computing Courseware (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Flink.informatics.stonybrook.edu%2Fsparql%2F', title: 'RxNorm'},
		{endpoint: 'http%3A%2F%2Fdata.rism.info%2Fsparql', },
		{endpoint: 'http%3A%2F%2Fbiordf.net%2Fsparql', title: 'SADI Semantic Web Services framework registry'},
		{endpoint: 'http%3A%2F%2Fseek.rkbexplorer.com%2Fsparql%2F', title: 'SEEK-AT-WD ICT tools for education - Web-Share'},
		{endpoint: 'http%3A%2F%2Fzbw.eu%2Fbeta%2Fsparql%2Fstw%2Fquery', title: 'STW Thesaurus for Economics'},
		{endpoint: 'http%3A%2F%2Fsouthampton.rkbexplorer.com%2Fsparql%2F', title: 'School of Electronics and Computer Science, University of Southampton (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fserendipity.utpl.edu.ec%2Flod%2Fsparql', title: 'Serendipity'},
		{endpoint: 'http%3A%2F%2Fdata.linkedu.eu%2Fslidewiki%2Fquery', title: 'Slidewiki (RDF/SPARQL)'},
		{endpoint: 'http%3A%2F%2Fsmartlink.open.ac.uk%2Fsmartlink%2Fsparql', title: 'SmartLink: Linked Services Non-Functional Properties'},
		{endpoint: 'http%3A%2F%2Fsocialarchive.iath.virginia.edu%2Fsparql%2Feac', title: 'Social Networks and Archival Context Fall 2011'},
		{endpoint: 'http%3A%2F%2Fsocialarchive.iath.virginia.edu%2Fsparql%2Fsnac-viaf', title: 'Social Networks and Archival Context Fall 2011'},
		{endpoint: 'http%3A%2F%2Fvocabulary.semantic-web.at%2FPoolParty%2Fsparql%2Fsemweb', title: 'Social Semantic Web Thesaurus'},
		{endpoint: 'http%3A%2F%2Flinguistic.linkeddata.es%2Fsparql', title: 'Spanish Linguistic Datasets'},
		{endpoint: 'http%3A%2F%2Fcrashmap.okfn.gr%3A8890%2Fsparql', title: 'Statistics on Fatal Traffic Accidents in greek roads'},
		{endpoint: 'http%3A%2F%2Fcrime.rkbexplorer.com%2Fsparql%2F', title: 'Street level crime reports for England and Wales'},
		{endpoint: 'http%3A%2F%2Fsymbolicdata.org%3A8890%2Fsparql', title: 'SymbolicData'},
		{endpoint: 'http%3A%2F%2Fagalpha.mathbiol.org%2Frepositories%2Ftcga', title: 'TCGA Roadmap'},
		{endpoint: 'http%3A%2F%2Fwww.open-biomed.org.uk%2Fsparql%2Fendpoint%2Ftcm', title: 'TCMGeneDIT Dataset'},
		{endpoint: 'http%3A%2F%2Fdata.linkededucation.org%2Frequest%2Fted%2Fsparql', title: 'TED Talks'},
		{endpoint: 'http%3A%2F%2Fdarmstadt.rkbexplorer.com%2Fsparql%2F', title: 'Technische Universität Darmstadt (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Flinguistic.linkeddata.es%2Fterminesp%2Fsparql-editor', title: 'Terminesp Linked Data'},
		{endpoint: 'http%3A%2F%2Facademia6.poolparty.biz%2FPoolParty%2Fsparql%2FTesauro-Materias-BUPM', title: 'Tesauro materias BUPM'},
		{endpoint: 'http%3A%2F%2Fapps.morelab.deusto.es%2Fteseo%2Fsparql', title: 'Teseo'},
		{endpoint: 'http%3A%2F%2Flinkeddata.ge.imati.cnr.it%3A8890%2Fsparql', title: 'ThIST'},
		{endpoint: 'http%3A%2F%2Fring.ciard.net%2Fsparql1', title: 'The CIARD RING'},
		{endpoint: 'http%3A%2F%2Fvocab.getty.edu%2Fsparql', },
		{endpoint: 'http%3A%2F%2Flod.gesis.org%2Fthesoz%2Fsparql', title: 'TheSoz Thesaurus for the Social Sciences (GESIS)'},
		{endpoint: 'http%3A%2F%2Fdigitale.bncf.firenze.sbn.it%2Fopenrdf-workbench%2Frepositories%2FNS%2Fquery', title: 'Thesaurus BNCF'},
		{endpoint: 'http%3A%2F%2Ftour-pedia.org%2Fsparql', title: 'Tourpedia'},
		{endpoint: 'http%3A%2F%2Ftkm.kiom.re.kr%2Fontology%2Fsparql', title: 'Traditional Korean Medicine Ontology'},
		{endpoint: 'http%3A%2F%2Ftransparency.270a.info%2Fsparql', title: 'Transparency International Linked Data'},
		{endpoint: 'http%3A%2F%2Fjisc.rkbexplorer.com%2Fsparql%2F', title: 'UK JISC (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Funlocode.rkbexplorer.com%2Fsparql%2F', title: 'UN/LOCODE (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fuis.270a.info%2Fsparql', title: 'UNESCO Institute for Statistics (UIS) Linked Data'},
		{endpoint: 'http%3A%2F%2Fskos.um.es%2Fsparql%2F', title: 'UNESCO Thesaurus'},
		{endpoint: 'http%3A%2F%2Fdata.linkedu.eu%2Fkis1112%2Fquery', title: 'UNISTAT-KIS 2011/2012 in RDF (Key Information Set - UK Universities)'},
		{endpoint: 'http%3A%2F%2Fdata.linkedu.eu%2Fkis%2Fquery', title: 'UNISTAT-KIS in RDF (Key Information Set - UK Universities)'},
		{endpoint: 'http%3A%2F%2Flinkeddata.uriburner.com%2Fsparql', title: 'URIBurner'},
		{endpoint: 'http%3A%2F%2Fbeta.sparql.uniprot.org', },
		{endpoint: 'http%3A%2F%2Fdata.utpl.edu.ec%2Futpl%2Flod%2Fsparql', title: 'Universidad Técnica Particular de Loja - Linked Open Data'},
		{endpoint: 'http%3A%2F%2Fresrev.ilrt.bris.ac.uk%2Fdata-server-workshop%2Fsparql', title: 'University of Bristol'},
		{endpoint: 'http%3A%2F%2Fdata.linkedu.eu%2Fhud%2Fquery', title: 'University of Huddersfield -- Circulation and Recommendation Data'},
		{endpoint: 'http%3A%2F%2Fnewcastle.rkbexplorer.com%2Fsparql%2F', title: 'University of Newcastle upon Tyne (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Froma.rkbexplorer.com%2Fsparql%2F', title: 'Università degli studi di Roma "La Sapienza" (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fpisa.rkbexplorer.com%2Fsparql%2F', title: 'Università di Pisa (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fulm.rkbexplorer.com%2Fsparql%2F', title: 'Universität Ulm (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Firit.rkbexplorer.com%2Fsparql%2F', title: 'Université Paul Sabatier - Toulouse 3 (RKB Explorer)'},
		{endpoint: 'http%3A%2F%2Fsemanticweb.cs.vu.nl%2Fverrijktkoninkrijk%2Fsparql%2F', title: 'Verrijkt Koninkrijk'},
		{endpoint: 'http%3A%2F%2Fkaunas.rkbexplorer.com%2Fsparql', title: 'Vytautas Magnus University, Kaunas (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fwebscience.rkbexplorer.com%2Fsparql', title: 'Web Science Conference (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fsparql.wikipathways.org%2F', title: 'WikiPathways'},
		{endpoint: 'http%3A%2F%2Fwww.opmw.org%2Fsparql', title: 'Wings workflow provenance dataset'},
		{endpoint: 'http%3A%2F%2Fwordnet.rkbexplorer.com%2Fsparql%2F', title: 'WordNet (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fworldbank.270a.info%2Fsparql', title: 'World Bank Linked Data'},
		{endpoint: 'http%3A%2F%2Fmlode.nlp2rdf.org%2Fsparql', },
		{endpoint: 'http%3A%2F%2Fldf.fi%2Fww1lod%2Fsparql', title: 'World War 1 as Linked Open Data'},
		{endpoint: 'http%3A%2F%2Faksw.org%2Fsparql', title: 'aksw.org Research Group dataset'},
		{endpoint: 'http%3A%2F%2Fcrm.rkbexplorer.com%2Fsparql', title: 'crm'},
		{endpoint: 'http%3A%2F%2Fdata.open.ac.uk%2Fquery', title: 'data.open.ac.uk, Linked Data from the Open University'},
		{endpoint: 'http%3A%2F%2Fsparql.data.southampton.ac.uk%2F', },
		{endpoint: 'http%3A%2F%2Fdatos.bne.es%2Fsparql', title: 'datos.bne.es'},
		{endpoint: 'http%3A%2F%2Fkaiko.getalp.org%2Fsparql', title: 'dbnary'},
		{endpoint: 'http%3A%2F%2Fdigitaleconomy.rkbexplorer.com%2Fsparql', title: 'digitaleconomy'},
		{endpoint: 'http%3A%2F%2Fdotac.rkbexplorer.com%2Fsparql%2F', title: 'dotAC (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fforeign.rkbexplorer.com%2Fsparql%2F', title: 'ePrints Harvest (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Feprints.rkbexplorer.com%2Fsparql%2F', title: 'ePrints3 Institutional Archive Collection (RKBExplorer)'},
		{endpoint: 'http%3A%2F%2Fservices.data.gov.uk%2Feducation%2Fsparql', title: 'education.data.gov.uk'},
		{endpoint: 'http%3A%2F%2Fepsrc.rkbexplorer.com%2Fsparql', title: 'epsrc'},
		{endpoint: 'http%3A%2F%2Fwww.open-biomed.org.uk%2Fsparql%2Fendpoint%2Fflyatlas', title: 'flyatlas'},
		{endpoint: 'http%3A%2F%2Fiserve.kmi.open.ac.uk%2Fiserve%2Fsparql', title: 'iServe: Linked Services Registry'},
		{endpoint: 'http%3A%2F%2Fichoose.tw.rpi.edu%2Fsparql', title: 'ichoose'},
		{endpoint: 'http%3A%2F%2Fkdata.kr%2Fsparql%2Fendpoint.jsp', title: 'kdata'},
		{endpoint: 'http%3A%2F%2Flofd.tw.rpi.edu%2Fsparql', title: 'lofd'},
		{endpoint: 'http%3A%2F%2Fprovenanceweb.org%2Fsparql', title: 'provenanceweb'},
		{endpoint: 'http%3A%2F%2Fservices.data.gov.uk%2Freference%2Fsparql', title: 'reference.data.gov.uk'},
		{endpoint: 'http%3A%2F%2Fforeign.rkbexplorer.com%2Fsparql', title: 'rkb-explorer-foreign'},
		{endpoint: 'http%3A%2F%2Fservices.data.gov.uk%2Fstatistics%2Fsparql', title: 'statistics.data.gov.uk'},
		{endpoint: 'http%3A%2F%2Fservices.data.gov.uk%2Ftransport%2Fsparql', title: 'transport.data.gov.uk'},
		{endpoint: 'http%3A%2F%2Fopendap.tw.rpi.edu%2Fsparql', title: 'twc-opendap'},
		{endpoint: 'http%3A%2F%2Fwebconf.rkbexplorer.com%2Fsparql', title: 'webconf'},
		{endpoint: 'http%3A%2F%2Fwiktionary.dbpedia.org%2Fsparql', title: 'wiktionary.dbpedia.org'},
		{endpoint: 'http%3A%2F%2Fdiwis.imis.athena-innovation.gr%3A8181%2Fsparql', title: 'xxxxx'},
	];
	endpoints.forEach(function(endpointObj, i) {
		endpoints[i].endpoint = decodeURIComponent(endpointObj.endpoint);
	});
	endpoints.sort(function(a,b){
		var lhs = a.title || a.endpoint;
		var rhs = b.title || b.endpoint;
		return lhs.toUpperCase().localeCompare(rhs.toUpperCase());
	});
	return endpoints;
};

