"use strict";

var $ = require("jquery");
var YASGUI = require("./main.js");
module.exports = {
  persistencyPrefix: function(yasgui) {
    return "yasgui_" + $(yasgui.wrapperElement).closest("[id]").attr("id") + "_";
  },
  allowYasqeResize: true,
  api: {
    corsProxy: null,
    collections: null
  },
  tracker: {
    googleAnalyticsId: null,
    askConsent: true
  },
  onQuotaExceeded: function(e) {
    //fail silently
    console.warn("Could not store in localstorage. Skipping..", e);
  },
  //this endpoint is used when adding a new tab. If unset, we'll take the endpoint of the current tab
  endpoint: null,
  //An undocumented easter-egg ;). Just wanted this to be able to swap the endpoint input for another widget
  endpointInput: function(yasgui, yasqeOpts, $, $controlBar, onChange) {
    return $("<select>").appendTo($controlBar).endpointCombi(yasgui, {
      value: yasqeOpts.sparql.endpoint,
      onChange: onChange
    });
  },
  yasqe: $.extend(
    true,
    {},
    {
      height: 300,
      sparql: {
        endpoint: YASGUI.YASQE.defaults.sparql.endpoint,
        acceptHeaderGraph: YASGUI.YASQE.defaults.sparql.acceptHeaderGraph,
        acceptHeaderSelect: YASGUI.YASQE.defaults.sparql.acceptHeaderSelect,
        args: YASGUI.YASQE.defaults.sparql.args,
        defaultGraphs: YASGUI.YASQE.defaults.sparql.defaultGraphs,
        namedGraphs: YASGUI.YASQE.defaults.sparql.namedGraphs,
        requestMethod: YASGUI.YASQE.defaults.sparql.requestMethod,
        headers: YASGUI.YASQE.defaults.sparql.headers
      }
    }
  ),
  yasr: YASGUI.YASR.defaults,
  tabs: [
    {
      yasqe: module.exports.yasqe,
      yasr: module.exports.yasr
    }
  ],

  /**
	 * Yes, UGLY as well... Problem is: there is NO public catalogue API or SPARQL endpoint (which is cors enabled and works without api key)
	 * I'm waiting for SPARQLES to make a public SPARQL endpoint of TPF API....
	 * For now, just store this list (scraped from the SPARQLES website) statically..
	 */
  catalogueEndpoints: [
    {
      endpoint: "http://biolit.rkbexplorer.com/sparql",
      title: "A Short Biographical Dictionary of English Literature (RKBExplorer)"
    },
    { endpoint: "http://aemet.linkeddata.es/sparql", title: "AEMET metereological dataset" },
    { endpoint: "http://aksw.org/sparql", title: "aksw.org Research Group dataset" },
    {
      endpoint: "http://data.allie.dbcls.jp/sparql",
      title: "Allie Abbreviation And Long Form Database in Life Science"
    },
    {
      endpoint: "http://vocabulary.semantic-web.at/PoolParty/sparql/AustrianSkiTeam",
      title: "Alpine Ski Racers of Austria"
    },
    {
      endpoint: "http://semanticweb.cs.vu.nl/europeana/sparql/",
      title: "Amsterdam Museum as Linked Open Data in the Europeana Data Model"
    },
    { endpoint: "http://opendata.aragon.es/sparql", title: "AragoDBPedia" },
    { endpoint: "http://data.archiveshub.ac.uk/sparql", title: "Archives Hub Linked Data" },
    { endpoint: "http://www.auth.gr/sparql", title: "Aristotle University" },
    { endpoint: "http://sparql.jesandco.org:8890/sparql", title: "ASN:US" },
    {
      endpoint: "http://acm.rkbexplorer.com/sparql/",
      title: "Association for Computing Machinery (ACM) (RKBExplorer)"
    },
    {
      endpoint: "http://lab.environment.data.gov.au/sparql",
      title: "Australian Climate Observations Reference Network - Surface Air Temperature Dataset"
    },
    { endpoint: "http://abs.270a.info/sparql", title: "Australian Bureau of Statistics (ABS) Linked Data" },
    {
      endpoint: "http://lod.b3kat.de/sparql",
      title: "B3Kat - Library Union Catalogues of Bavaria, Berlin and Brandenburg"
    },
    { endpoint: "http://bis.270a.info/sparql", title: "Bank for International Settlements (BIS) Linked Data" },
    { endpoint: "http://www.open-biomed.org.uk/sparql/endpoint/bdgp_20081030", title: "Bdgp" },
    { endpoint: "http://affymetrix.bio2rdf.org/sparql", title: "Bio2RDF::Affymetrix" },
    { endpoint: "http://biomodels.bio2rdf.org/sparql", title: "Bio2RDF::Biomodels" },
    { endpoint: "http://bioportal.bio2rdf.org/sparql", title: "Bio2RDF::Bioportal" },
    { endpoint: "http://clinicaltrials.bio2rdf.org/sparql", title: "Bio2RDF::Clinicaltrials" },
    { endpoint: "http://ctd.bio2rdf.org/sparql", title: "Bio2RDF::Ctd" },
    { endpoint: "http://dbsnp.bio2rdf.org/sparql", title: "Bio2RDF::Dbsnp" },
    { endpoint: "http://drugbank.bio2rdf.org/sparql", title: "Bio2RDF::Drugbank" },
    { endpoint: "http://genage.bio2rdf.org/sparql", title: "Bio2RDF::Genage" },
    { endpoint: "http://gendr.bio2rdf.org/sparql", title: "Bio2RDF::Gendr" },
    { endpoint: "http://goa.bio2rdf.org/sparql", title: "Bio2RDF::Goa" },
    { endpoint: "http://hgnc.bio2rdf.org/sparql", title: "Bio2RDF::Hgnc" },
    { endpoint: "http://homologene.bio2rdf.org/sparql", title: "Bio2RDF::Homologene" },
    { endpoint: "http://inoh.bio2rdf.org/sparql", title: "Bio2RDF::INOH" },
    { endpoint: "http://interpro.bio2rdf.org/sparql", title: "Bio2RDF::Interpro" },
    { endpoint: "http://iproclass.bio2rdf.org/sparql", title: "Bio2RDF::Iproclass" },
    { endpoint: "http://irefindex.bio2rdf.org/sparql", title: "Bio2RDF::Irefindex" },
    { endpoint: "http://biopax.kegg.bio2rdf.org/sparql", title: "Bio2RDF::KEGG::BioPAX" },
    { endpoint: "http://linkedspl.bio2rdf.org/sparql", title: "Bio2RDF::Linkedspl" },
    { endpoint: "http://lsr.bio2rdf.org/sparql", title: "Bio2RDF::Lsr" },
    { endpoint: "http://mesh.bio2rdf.org/sparql", title: "Bio2RDF::Mesh" },
    { endpoint: "http://mgi.bio2rdf.org/sparql", title: "Bio2RDF::Mgi" },
    { endpoint: "http://ncbigene.bio2rdf.org/sparql", title: "Bio2RDF::Ncbigene" },
    { endpoint: "http://ndc.bio2rdf.org/sparql", title: "Bio2RDF::Ndc" },
    { endpoint: "http://netpath.bio2rdf.org/sparql", title: "Bio2RDF::NetPath" },
    { endpoint: "http://omim.bio2rdf.org/sparql", title: "Bio2RDF::Omim" },
    { endpoint: "http://orphanet.bio2rdf.org/sparql", title: "Bio2RDF::Orphanet" },
    { endpoint: "http://pharmgkb.bio2rdf.org/sparql", title: "Bio2RDF::Pharmgkb" },
    { endpoint: "http://biopax.pharmgkb.bio2rdf.org/sparql", title: "Bio2RDF::PharmGKB::BioPAX" },
    { endpoint: "http://pid.bio2rdf.org/sparql", title: "Bio2RDF::PID" },
    { endpoint: "http://pubchem.bio2rdf.org/sparql", title: "Bio2RDF::PubChem" },
    { endpoint: "http://rhea.bio2rdf.org/sparql", title: "Bio2RDF::Rhea" },
    { endpoint: "http://sabiork.bio2rdf.org/sparql", title: "Bio2RDF::Sabiork" },
    { endpoint: "http://sgd.bio2rdf.org/sparql", title: "Bio2RDF::Sgd" },
    { endpoint: "http://sider.bio2rdf.org/sparql", title: "Bio2RDF::Sider" },
    { endpoint: "http://spike.bio2rdf.org/sparql", title: "Bio2RDF::SPIKE" },
    { endpoint: "http://taxonomy.bio2rdf.org/sparql", title: "Bio2RDF::Taxonomy" },
    { endpoint: "http://wikipathways.bio2rdf.org/sparql", title: "Bio2RDF::Wikipathways" },
    { endpoint: "http://wormbase.bio2rdf.org/sparql", title: "Bio2RDF::Wormbase" },
    { endpoint: "https://www.ebi.ac.uk/rdf/services/biomodels/sparql", title: "BioModels RDF" },
    { endpoint: "https://www.ebi.ac.uk/rdf/services/biosamples/sparql", title: "BioSamples RDF" },
    { endpoint: "http://helheim.deusto.es/bizkaisense/sparql", title: "BizkaiSense" },
    {
      endpoint: "http://budapest.rkbexplorer.com/sparql/",
      title: "Budapest University of Technology and Economics (RKBExplorer)"
    },
    {
      endpoint: "http://bfs.270a.info/sparql",
      title: "Bundesamt für Statistik (BFS) - Swiss Federal Statistical Office (FSO) Linked Data"
    },
    { endpoint: "http://opendata-bundestag.de/sparql", title: "BundestagNebeneinkuenfte" },
    { endpoint: "https://www.ebi.ac.uk/rdf/services/chembl/sparql", title: "ChEMBL RDF" },
    { endpoint: "http://chebi.bio2rdf.org/sparql", title: "Chemical Entities of Biological Interest (ChEBI)" },
    { endpoint: "http://citeseer.rkbexplorer.com/sparql/", title: "CiteSeer (Research Index) (RKBExplorer)" },
    { endpoint: "http://data.colinda.org/endpoint.php", title: "COLINDA - Conference Linked Data" },
    {
      endpoint: "http://cordis.rkbexplorer.com/sparql/",
      title: "Community R&amp;D Information Service (CORDIS) (RKBExplorer)"
    },
    { endpoint: "http://semantic.ckan.net/sparql/", title: "Comprehensive Knowledge Archive Network" },
    { endpoint: "http://vocabulary.wolterskluwer.de/PoolParty/sparql/court", title: "Courts thesaurus" },
    { endpoint: "http://crm.rkbexplorer.com/sparql", title: "crm" },
    { endpoint: "http://crtm.linkeddata.es/sparql", title: "CRTM" },
    { endpoint: "http://data.fundacionctic.org/sparql", title: "CTIC Public Dataset Catalogs" },
    { endpoint: "http://cultura.linkeddata.es/sparql", title: "CulturaLinkedData" },
    { endpoint: "http://data.open.ac.uk/query", title: "data.open.ac.uk, Linked Data from the Open University" },
    { endpoint: "http://datos.bcn.cl/sparql", title: "Datos.bcn.cl" },
    { endpoint: "http://datos.bne.es/sparql", title: "datos.bne.es" },
    { endpoint: "http://dblp.rkbexplorer.com/sparql/", title: "DBLP Computer Science Bibliography (RKBExplorer)" },
    { endpoint: "http://dblp.l3s.de/d2r/sparql", title: "DBLP in RDF (L3S)" },
    { endpoint: "http://kaiko.getalp.org/sparql", title: "dbnary" },
    { endpoint: "http://dbpedia.org/sparql", title: "DBpedia" },
    { endpoint: "http://eu.dbpedia.org/sparql", title: "DBpedia in Basque" },
    { endpoint: "http://nl.dbpedia.org/sparql", title: "DBpedia in Dutch" },
    { endpoint: "http://fr.dbpedia.org/sparql", title: "DBpedia in French" },
    { endpoint: "http://de.dbpedia.org/sparql", title: "DBpedia in German" },
    { endpoint: "http://ja.dbpedia.org/sparql", title: "DBpedia in Japanese" },
    { endpoint: "http://pt.dbpedia.org/sparql", title: "DBpedia in Portuguese" },
    { endpoint: "http://es.dbpedia.org/sparql", title: "DBpedia in Spanish" },
    { endpoint: "http://live.dbpedia.org/sparql", title: "DBpedia-Live" },
    { endpoint: "http://dbtune.org/musicbrainz/sparql", title: "DBTune.org Musicbrainz D2R Server" },
    { endpoint: "http://deepblue.rkbexplorer.com/sparql/", title: "Deep Blue (RKBExplorer)" },
    { endpoint: "http://deploy.rkbexplorer.com/sparql/", title: "DEPLOY (RKBExplorer)" },
    { endpoint: "http://dewey.info/sparql.php", title: "Dewey Decimal Classification (DDC)" },
    { endpoint: "http://digitaleconomy.rkbexplorer.com/sparql", title: "digitaleconomy" },
    { endpoint: "http://rdf.disgenet.org/sparql/", title: "DisGeNET" },
    {
      endpoint: "http://italy.rkbexplorer.com/sparql",
      title: "Diverse Italian ReSIST Partner Institutions (RKBExplorer)"
    },
    { endpoint: "http://dotac.rkbexplorer.com/sparql/", title: "dotAC (RKBExplorer)" },
    { endpoint: "http://dutchshipsandsailors.nl/data/sparql/", title: "Dutch Ships and Sailors " },
    { endpoint: "http://semanticweb.cs.vu.nl/dss/sparql/", title: "Dutch Ships and Sailors " },
    { endpoint: "http://www.eclap.eu/sparql", title: "ECLAP" },
    { endpoint: "http://services.data.gov.uk/education/sparql", title: "education.data.gov.uk" },
    { endpoint: "http://kent.zpr.fer.hr:8080/educationalProgram/sparql", title: "Educational programs - SISVU" },
    { endpoint: "http://webenemasuno.linkeddata.es/sparql", title: "El Viajero's tourism dataset" },
    {
      endpoint: "http://www.ida.liu.se/projects/semtech/openrdf-sesame/repositories/energy",
      title: "Energy efficiency assessments and improvements"
    },
    { endpoint: "http://enipedia.tudelft.nl/sparql", title: "Enipedia - Energy Industry Data" },
    { endpoint: "http://environment.data.gov.uk/sparql/bwq/query", title: "Environment Agency Bathing Water Quality" },
    { endpoint: "http://foreign.rkbexplorer.com/sparql/", title: "ePrints Harvest (RKBExplorer)" },
    {
      endpoint: "http://eprints.rkbexplorer.com/sparql/",
      title: "ePrints3 Institutional Archive Collection (RKBExplorer)"
    },
    { endpoint: "http://epsrc.rkbexplorer.com/sparql", title: "epsrc" },
    {
      endpoint: "http://era.rkbexplorer.com/sparql/",
      title: "ERA - Australian Research Council publication ratings (RKBExplorer)"
    },
    { endpoint: "http://ecb.270a.info/sparql", title: "European Central Bank (ECB) Linked Data" },
    { endpoint: "http://eventmedia.eurecom.fr/sparql", title: "EventMedia" },
    { endpoint: "http://factforge.net/sparql", title: "Fact Forge" },
    { endpoint: "http://frb.270a.info/sparql", title: "Federal Reserve Board (FRB) Linked Data" },
    { endpoint: "http://www.open-biomed.org.uk/sparql/endpoint/flyatlas", title: "flyatlas" },
    { endpoint: "http://www.open-biomed.org.uk/sparql/endpoint/flybase", title: "Flybase" },
    { endpoint: "http://www.open-biomed.org.uk/sparql/endpoint/flyted", title: "Flyted" },
    {
      endpoint: "http://fao.270a.info/sparql",
      title: "Food and Agriculture Organization of the United Nations (FAO) Linked Data"
    },
    { endpoint: "http://data.linkedu.eu/forge/query", title: "FORGE Course information" },
    { endpoint: "http://ft.rkbexplorer.com/sparql/", title: "France Telecom Recherche et Développement (RKBExplorer)" },
    {
      endpoint: "http://lisbon.rkbexplorer.com/sparql",
      title: "Fundação da Faculdade de Ciencas da Universidade de Lisboa (RKBExplorer)"
    },
    { endpoint: "http://www.ebi.ac.uk/rdf/services/atlas/sparql", title: "Gene Expression Atlas RDF" },
    { endpoint: "http://geo.linkeddata.es/sparql", title: "GeoLinkedData" },
    {
      endpoint: "http://resource.geolba.ac.at/PoolParty/sparql/tectonicunit",
      title: "Geological Survey of Austria (GBA) - Thesaurus"
    },
    {
      endpoint: "http://resource.geolba.ac.at/PoolParty/sparql/lithology",
      title: "Geological Survey of Austria (GBA) - Thesaurus"
    },
    {
      endpoint: "http://resource.geolba.ac.at/PoolParty/sparql/GeologicTimeScale",
      title: "Geological Survey of Austria (GBA) - Thesaurus"
    },
    {
      endpoint: "http://resource.geolba.ac.at/PoolParty/sparql/GeologicUnit",
      title: "Geological Survey of Austria (GBA) - Thesaurus"
    },
    {
      endpoint: "http://vocabulary.wolterskluwer.de/PoolParty/sparql/arbeitsrecht",
      title: "German labor law thesaurus"
    },
    { endpoint: "http://data.globalchange.gov/sparql", title: "Global Change Information System" },
    { endpoint: "http://wordnet.okfn.gr:8890/sparql/", title: "Greek Wordnet" },
    { endpoint: "http://healthdata.tw.rpi.edu/sparql", title: "HealthData.gov Platform (HDP) on the Semantic Web" },
    {
      endpoint: "http://lod.hebis.de/sparql",
      title: "HeBIS - Bibliographic Resources of the Library Union Catalogues of Hessen and parts of the Rhineland Palatinate"
    },
    { endpoint: "http://helheim.deusto.es/hedatuz/sparql", title: "Hedatuz" },
    { endpoint: "http://greek-lod.auth.gr/fire-brigade/sparql", title: "Hellenic Fire Brigade" },
    { endpoint: "http://greek-lod.auth.gr/police/sparql", title: "Hellenic Police" },
    { endpoint: "http://beta.sparql.uniprot.org" },
    { endpoint: "http://bnb.data.bl.uk/sparql" },
    { endpoint: "http://cr.eionet.europa.eu/sparql" },
    { endpoint: "http://data.oceandrilling.org/sparql" },
    { endpoint: "http://data.ox.ac.uk/sparql/" },
    { endpoint: "http://data.rism.info/sparql" },
    { endpoint: "http://dati.camera.it/sparql" },
    { endpoint: "http://europeana.ontotext.com/sparql" },
    { endpoint: "http://heritagedata.org/live/sparql" },
    { endpoint: "http://lod.xdams.org/sparql" },
    { endpoint: "http://logd.tw.rpi.edu/sparql" },
    { endpoint: "http://mlode.nlp2rdf.org/sparql" },
    { endpoint: "http://opendatacommunities.org/sparql" },
    { endpoint: "http://semantic.eea.europa.eu/sparql" },
    { endpoint: "http://sparql.data.southampton.ac.uk/" },
    { endpoint: "http://visualdataweb.infor.uva.es/sparql" },
    { endpoint: "http://vocab.getty.edu/sparql" },
    { endpoint: "http://setaria.oszk.hu/sparql", title: "Hungarian National Library (NSZL) catalog" },
    { endpoint: "http://semanticweb.cs.vu.nl/iati/sparql/", title: "IATI as Linked Data" },
    { endpoint: "http://ibm.rkbexplorer.com/sparql/", title: "IBM Research GmbH (RKBExplorer)" },
    { endpoint: "http://www.icane.es/opendata/sparql", title: "ICANE" },
    { endpoint: "http://ichoose.tw.rpi.edu/sparql", title: "ichoose" },
    { endpoint: "http://ieee.rkbexplorer.com/sparql/", title: "IEEE Papers (RKBExplorer)" },
    { endpoint: "http://ieeevis.tw.rpi.edu/sparql", title: "IEEE VIS Source Data" },
    { endpoint: "http://www.imagesnippets.com/sparql/images", title: "Imagesnippets Image Descriptions" },
    { endpoint: "http://purl.org/twc/hub/sparql", title: "Instance Hub (all)" },
    { endpoint: "http://eurecom.rkbexplorer.com/sparql/", title: "Institut Eurécom (RKBExplorer)" },
    { endpoint: "http://imf.270a.info/sparql", title: "International Monetary Fund (IMF) Linked Data" },
    { endpoint: "http://iserve.kmi.open.ac.uk/iserve/sparql", title: "iServe: Linked Services Registry" },
    { endpoint: "http://www.rechercheisidore.fr/sparql", title: "Isidore" },
    { endpoint: "http://kdata.kr/sparql/endpoint.jsp", title: "kdata" },
    { endpoint: "http://sparql.kupkb.org/sparql", title: "Kidney and Urinary Pathway Knowledge Base" },
    {
      endpoint: "http://kisti.rkbexplorer.com/sparql/",
      title: "Korean Institute of Science Technology and Information (RKBExplorer)"
    },
    { endpoint: "http://lod.kaist.ac.kr/sparql", title: "Korean Traditional Recipes" },
    { endpoint: "http://laas.rkbexplorer.com/sparql/", title: "LAAS-CNRS (RKBExplorer)" },
    {
      endpoint: "http://smartcity.linkeddata.es/sparql",
      title: "LCC (Leeds City Council Energy Consumption Linked Data)"
    },
    {
      endpoint: "http://data.linkededucation.org/request/lak-conference/sparql",
      title: "Learning Analytics and Knowledge (LAK) Dataset"
    },
    { endpoint: "http://sparql.reegle.info/", title: "Linked Clean Energy Data (reegle.info)" },
    { endpoint: "http://sparql.contextdatacloud.org", title: "Linked Crowdsourced Data" },
    { endpoint: "http://linkedlifedata.com/sparql", title: "Linked Life Data" },
    { endpoint: "http://data.logainm.ie/sparql", title: "Linked Logainm" },
    { endpoint: "http://data.linkedmdb.org/sparql", title: "Linked Movie DataBase" },
    { endpoint: "http://data.aalto.fi/sparql", title: "Linked Open Aalto Data Service" },
    { endpoint: "http://dbmi-icode-01.dbmi.pitt.edu/linkedSPLs/sparql", title: "Linked Structured Product Labels" },
    { endpoint: "http://linkedgeodata.org/sparql/", title: "LinkedGeoData" },
    {
      endpoint: "http://linkedspending.aksw.org/sparql",
      title: "LinkedSpending: OpenSpending becomes Linked Open Data"
    },
    { endpoint: "http://helheim.deusto.es/linkedstats/sparql", title: "LinkedStats" },
    { endpoint: "http://linkedu.eu/catalogue/sparql/", title: "LinkedUp Catalogue of Educational Datasets" },
    { endpoint: "http://www.linklion.org:8890/sparql", title: "LinkLion - A Link Repository for the Web of Data" },
    { endpoint: "http://id.sgcb.mcu.es/sparql", title: "Lista de  Encabezamientos de Materia as Linked Open Data" },
    { endpoint: "http://lod.ac/bdls/sparql", title: "LODAC BDLS" },
    { endpoint: "http://lofd.tw.rpi.edu/sparql", title: "lofd" },
    { endpoint: "http://sparql.msc2010.org", title: "Mathematics Subject Classification" },
    { endpoint: "http://doc.metalex.eu:8000/sparql/", title: "MetaLex Document Server" },
    { endpoint: "http://onto.mondis.cz/openrdf-sesame/repositories/mondis-record-owlim", title: "MONDIS" },
    { endpoint: "http://apps.morelab.deusto.es/labman/sparql", title: "MORElab" },
    { endpoint: "http://rdf.muninn-project.org/sparql", title: "Muninn World War I" },
    { endpoint: "http://lod.sztaki.hu/sparql", title: "National Digital Data Archive of Hungary (partial)" },
    { endpoint: "http://nsf.rkbexplorer.com/sparql/", title: "National Science Foundation (RKBExplorer)" },
    { endpoint: "http://data.nobelprize.org/sparql", title: "Nobel Prizes" },
    { endpoint: "http://data.lenka.no/sparql", title: "Norwegian geo-divisions" },
    { endpoint: "http://onto.beef.org.pl/sparql", title: "OntoBeef" },
    {
      endpoint: "http://oai.rkbexplorer.com/sparql/",
      title: "Open Archive Initiative Harvest over OAI-PMH (RKBExplorer)"
    },
    { endpoint: "http://data.linkedu.eu/ocw/query", title: "Open Courseware Consortium metadata in RDF" },
    { endpoint: "http://opendata.ccd.uniroma2.it/LMF/sparql/select", title: "Open Data @ Tor Vergata" },
    { endpoint: "http://data.cnr.it/sparql-proxy/", title: "Open Data from the Italian National Research Council" },
    { endpoint: "http://data.utpl.edu.ec/ecuadorresearch/lod/sparql", title: "Open Data of Ecuador" },
    { endpoint: "http://vocabulary.semantic-web.at/PoolParty/sparql/OpenData", title: "Open Data Thesaurus" },
    { endpoint: "http://en.openei.org/sparql", title: "OpenEI - Open Energy Info" },
    { endpoint: "http://lod.openlinksw.com/sparql", title: "OpenLink Software LOD Cache" },
    { endpoint: "http://sparql.openmobilenetwork.org", title: "OpenMobileNetwork" },
    { endpoint: "http://apps.ideaconsult.net:8080/ontology", title: "OpenTox" },
    { endpoint: "http://gov.tso.co.uk/coins/sparql", title: "OpenUpLabs COINS" },
    { endpoint: "http://gov.tso.co.uk/dclg/sparql", title: "OpenUpLabs DCLG" },
    { endpoint: "http://os.services.tso.co.uk/geo/sparql", title: "OpenUpLabs Geographic" },
    { endpoint: "http://gov.tso.co.uk/legislation/sparql", title: "OpenUpLabs Legislation" },
    { endpoint: "http://gov.tso.co.uk/transport/sparql", title: "OpenUpLabs Transport" },
    { endpoint: "http://os.rkbexplorer.com/sparql/", title: "Ordnance Survey (RKBExplorer)" },
    { endpoint: "http://data.organic-edunet.eu/sparql", title: "Organic Edunet Linked Open Data" },
    {
      endpoint: "http://oecd.270a.info/sparql",
      title: "Organisation for Economic Co-operation and Development (OECD) Linked Data"
    },
    { endpoint: "http://spatial.ucd.ie/lod/sparql", title: "OSM Semantic Network" },
    { endpoint: "http://data.linkedu.eu/don/query", title: "OUNL DSpace in RDF" },
    { endpoint: "https://data.ox.ac.uk/sparql/", title: "OxPoints (University of Oxford)" },
    { endpoint: "http://ld.panlex.org/sparql", title: "PanLex" },
    { endpoint: "http://linked-data.org/sparql", title: "Phonetics Information Base and Lexicon (PHOIBLE)" },
    { endpoint: "http://data.linkedu.eu/prod/query", title: "PROD - JISC Project Directory in RDF" },
    { endpoint: "http://provenanceweb.org/sparql", title: "provenanceweb" },
    { endpoint: "http://linked.opendata.cz/sparql", title: "Publications of Charles University in Prague" },
    { endpoint: "http://linkeddata4.dia.fi.upm.es:8907/sparql", title: "RDFLicense" },
    { endpoint: "https://www.ebi.ac.uk/rdf/services/reactome/sparql", title: "Reactome RDF" },
    { endpoint: "http://services.data.gov.uk/reference/sparql", title: "reference.data.gov.uk" },
    { endpoint: "http://rae2001.rkbexplorer.com/sparql/", title: "Research Assessment Exercise 2001 (RKBExplorer)" },
    { endpoint: "http://courseware.rkbexplorer.com/sparql/", title: "Resilient Computing Courseware (RKBExplorer)" },
    {
      endpoint: "http://curriculum.rkbexplorer.com/sparql/",
      title: "ReSIST MSc in Resilient Computing Curriculum (RKBExplorer)"
    },
    { endpoint: "http://wiki.rkbexplorer.com/sparql/", title: "ReSIST Project Wiki (RKBExplorer)" },
    { endpoint: "http://resex.rkbexplorer.com/sparql/", title: "ReSIST Resilience Mechanisms (RKBExplorer.com)" },
    { endpoint: "http://risks.rkbexplorer.com/sparql/", title: "RISKS Digest (RKBExplorer)" },
    { endpoint: "http://foreign.rkbexplorer.com/sparql", title: "rkb-explorer-foreign" },
    {
      endpoint: "http://ruian.linked.opendata.cz/sparql",
      title: "RUIAN - Register of territorial identification, addresses and real estates of the Czech Republic"
    },
    { endpoint: "http://link.informatics.stonybrook.edu/sparql/", title: "RxNorm" },
    { endpoint: "http://biordf.net/sparql", title: "SADI Semantic Web Services framework registry" },
    {
      endpoint: "http://southampton.rkbexplorer.com/sparql/",
      title: "School of Electronics and Computer Science, University of Southampton (RKBExplorer)"
    },
    { endpoint: "http://seek.rkbexplorer.com/sparql/", title: "SEEK-AT-WD ICT tools for education - Web-Share" },
    { endpoint: "http://serendipity.utpl.edu.ec/lod/sparql", title: "Serendipity" },
    { endpoint: "http://data.linkedu.eu/slidewiki/query", title: "Slidewiki (RDF/SPARQL)" },
    {
      endpoint: "http://smartlink.open.ac.uk/smartlink/sparql",
      title: "SmartLink: Linked Services Non-Functional Properties"
    },
    {
      endpoint: "http://socialarchive.iath.virginia.edu/sparql/eac",
      title: "Social Networks and Archival Context Fall 2011"
    },
    {
      endpoint: "http://socialarchive.iath.virginia.edu/sparql/snac-viaf",
      title: "Social Networks and Archival Context Fall 2011"
    },
    { endpoint: "http://vocabulary.semantic-web.at/PoolParty/sparql/semweb", title: "Social Semantic Web Thesaurus" },
    { endpoint: "http://linguistic.linkeddata.es/sparql", title: "Spanish Linguistic Datasets" },
    { endpoint: "http://crashmap.okfn.gr:8890/sparql", title: "Statistics on Fatal Traffic Accidents in greek roads" },
    { endpoint: "http://services.data.gov.uk/statistics/sparql", title: "statistics.data.gov.uk" },
    { endpoint: "http://crime.rkbexplorer.com/sparql/", title: "Street level crime reports for England and Wales" },
    { endpoint: "http://zbw.eu/beta/sparql/stw/query", title: "STW Thesaurus for Economics" },
    { endpoint: "http://symbolicdata.org:8890/sparql", title: "SymbolicData" },
    { endpoint: "http://agalpha.mathbiol.org/repositories/tcga", title: "TCGA Roadmap" },
    { endpoint: "http://www.open-biomed.org.uk/sparql/endpoint/tcm", title: "TCMGeneDIT Dataset" },
    { endpoint: "http://darmstadt.rkbexplorer.com/sparql/", title: "Technische Universität Darmstadt (RKBExplorer)" },
    { endpoint: "http://data.linkededucation.org/request/ted/sparql", title: "TED Talks" },
    { endpoint: "http://linguistic.linkeddata.es/terminesp/sparql-editor", title: "Terminesp Linked Data" },
    {
      endpoint: "http://academia6.poolparty.biz/PoolParty/sparql/Tesauro-Materias-BUPM",
      title: "Tesauro materias BUPM"
    },
    { endpoint: "http://apps.morelab.deusto.es/teseo/sparql", title: "Teseo" },
    { endpoint: "http://ring.ciard.net/sparql1", title: "The CIARD RING" },
    {
      endpoint: "http://digitale.bncf.firenze.sbn.it/openrdf-workbench/repositories/NS/query",
      title: "Thesaurus BNCF"
    },
    { endpoint: "http://lod.gesis.org/thesoz/sparql", title: "TheSoz Thesaurus for the Social Sciences (GESIS)" },
    { endpoint: "http://linkeddata.ge.imati.cnr.it:8890/sparql", title: "ThIST" },
    { endpoint: "http://tour-pedia.org/sparql", title: "Tourpedia" },
    { endpoint: "http://tkm.kiom.re.kr/ontology/sparql", title: "Traditional Korean Medicine Ontology" },
    { endpoint: "http://transparency.270a.info/sparql", title: "Transparency International Linked Data" },
    { endpoint: "http://services.data.gov.uk/transport/sparql", title: "transport.data.gov.uk" },
    { endpoint: "http://opendap.tw.rpi.edu/sparql", title: "twc-opendap" },
    { endpoint: "http://jisc.rkbexplorer.com/sparql/", title: "UK JISC (RKBExplorer)" },
    { endpoint: "http://unlocode.rkbexplorer.com/sparql/", title: "UN/LOCODE (RKBExplorer)" },
    { endpoint: "http://uis.270a.info/sparql", title: "UNESCO Institute for Statistics (UIS) Linked Data" },
    { endpoint: "http://skos.um.es/sparql/", title: "UNESCO Thesaurus" },
    {
      endpoint: "http://data.linkedu.eu/kis1112/query",
      title: "UNISTAT-KIS 2011/2012 in RDF (Key Information Set - UK Universities)"
    },
    {
      endpoint: "http://data.linkedu.eu/kis/query",
      title: "UNISTAT-KIS in RDF (Key Information Set - UK Universities)"
    },
    {
      endpoint: "http://data.utpl.edu.ec/utpl/lod/sparql",
      title: "Universidad Técnica Particular de Loja - Linked Open Data"
    },
    {
      endpoint: "http://roma.rkbexplorer.com/sparql/",
      title: 'Università degli studi di Roma "La Sapienza" (RKBExplorer)'
    },
    { endpoint: "http://pisa.rkbexplorer.com/sparql/", title: "Università di Pisa (RKBExplorer)" },
    { endpoint: "http://ulm.rkbexplorer.com/sparql/", title: "Universität Ulm (RKBExplorer)" },
    { endpoint: "http://irit.rkbexplorer.com/sparql/", title: "Université Paul Sabatier - Toulouse 3 (RKB Explorer)" },
    { endpoint: "http://resrev.ilrt.bris.ac.uk/data-server-workshop/sparql", title: "University of Bristol" },
    {
      endpoint: "http://data.linkedu.eu/hud/query",
      title: "University of Huddersfield -- Circulation and Recommendation Data"
    },
    { endpoint: "http://newcastle.rkbexplorer.com/sparql/", title: "University of Newcastle upon Tyne (RKBExplorer)" },
    { endpoint: "http://linkeddata.uriburner.com/sparql", title: "URIBurner" },
    { endpoint: "http://semanticweb.cs.vu.nl/verrijktkoninkrijk/sparql/", title: "Verrijkt Koninkrijk" },
    { endpoint: "http://kaunas.rkbexplorer.com/sparql", title: "Vytautas Magnus University, Kaunas (RKBExplorer)" },
    { endpoint: "http://webscience.rkbexplorer.com/sparql", title: "Web Science Conference (RKBExplorer)" },
    { endpoint: "http://webconf.rkbexplorer.com/sparql", title: "webconf" },
    { endpoint: "http://sparql.wikipathways.org/", title: "WikiPathways" },
    { endpoint: "http://wiktionary.dbpedia.org/sparql", title: "wiktionary.dbpedia.org" },
    { endpoint: "http://www.opmw.org/sparql", title: "Wings workflow provenance dataset" },
    { endpoint: "http://wordnet.rkbexplorer.com/sparql/", title: "WordNet (RKBExplorer)" },
    { endpoint: "http://worldbank.270a.info/sparql", title: "World Bank Linked Data" },
    { endpoint: "http://ldf.fi/ww1lod/sparql", title: "World War 1 as Linked Open Data" },
    { endpoint: "http://diwis.imis.athena-innovation.gr:8181/sparql", title: "xxxxx" }
  ]
};
