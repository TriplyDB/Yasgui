const puppeteer = require("puppeteer");
const static = require("node-static");
const http = require("http");
const PORT = 40001;

// const endpoint = "https://api.nightly.triply.cc/datasets/gerwinbosch/Triply-pets/services/Triply-pets/sparql";
// const plugin = "gallery";
// const query = `
//
//
// PREFIX wrongrdfs: <https://www.w3.org/2000/01/rdf-schema#>
// PREFIX foaf: <http://xmlns.com/foaf/0.1/>
// PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
// PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
// SELECT Distinct ?cat ?image ?name ?widget WHERE {
//   ?cat foaf:depiction ?image .
//   bind('<div><img src="{{image}}"/></div>' as ?widget)
// } LIMIT 10
//
//
// `;

// const endpoint = "https://api.druid.datalegend.net/datasets/dataLegend/Catasto/services/Catasto/sparql";
// const plugin = "table";
// const query = `
//
//
// PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
// PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
// PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
// PREFIX catastodim: <https://iisg.amsterdam/catasto/dimension/>
// PREFIX catasto: <https://iisg.amsterdam/catasto/>
// PREFIX catastoregion: <https://iisg.amsterdam/catasto/code/NUMSER/>
//
// SELECT ?occupation (count(distinct ?sub) as ?n_hh) (round(avg(?wealth)) as ?avg_wealth_rounded) (avg(?hh_members) as ?avg_hh_members) WHERE
// { SELECT (count(?members) as ?hh_members) ?occupation ?sub ?wealth
//
// WHERE {
//
// ?sub catastodim:householdMember ?members ;
//      catastodim:TOTAL ?wealth ;
//      catastodim:DEDUCT ?debt ;
//      catastodim:CREANCE ?pubcred ;
//      catastodim:CREDPUB ?privcred ;
//      catastodim:NUMSER catastoregion:1 .
// ?sub catastodim:METIER ?occ .
// ?occ skos:altLabel ?occupationlabel .
//
//  BIND(STR(?occupationlabel) as ?occupation)
//  FILTER(?wealth > 1500)
//   }}
//
//  ORDER BY  DESC(?n_hh)
// LIMIT 10
//
//
//
// `;

const endpoint =
  "https://api.druid.datalegend.net/datasets/netwerk-maritieme-bronnen/demo-netwerk-maritieme-bronnen/services/demo-netwerk-maritieme-bronnen/sparql";
const plugin = "geo";
const query = `


prefix dce: <http://purl.org/dc/elements/1.1/>
prefix das: <https://demo.triply.cc/huygens-ing/dutch-asiatic-shipping/>
prefix edm: <http://www.europeana.eu/schemas/edm/>
prefix foaf: <http://xmlns.com/foaf/0.1/>
prefix geo: <http://www.opengis.net/ont/geosparql#>
prefix misc: <https://demo.triply.cc/huygens-ing/graph/misc/>
prefix owl: <http://www.w3.org/2002/07/owl#>
prefix ship: <https://demo.triply.cc/huygens-ing/dutch-asiatic-shipping/id/ship/>
prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
select * {
  bind(ship:DAS_ship0010 as ?ship)# 't Vliegend Hart' == DAS_ship0010
  ?voyage
    das:shipid ?ship;
    das:voyarrivalplaceid [
      das:toponym_original ?arrivalName;
      owl:sameAs [ wgs84:lat ?arrivalLat; wgs84:long ?arrivalLong]];
    das:voydepartureplaceid [
      das:toponym_original ?departureName;
      owl:sameAs [ wgs84:lat ?departureLat; wgs84:long ?departureLong]].
  bind(strdt(concat('Point(',?arrivalLong,' ',?arrivalLat,')'),geo:wktLiteral) as ?arrivalShape)
  bind(strdt(concat('Point(',?departureLong,' ',?departureLat,')'),geo:wktLiteral) as ?departureShape)
  optional {
    [ dce:creator ?departureImageCreator;
      dce:description ?departureImageDescription;
      foaf:depiction ?departureImage1;
      misc:place ?departureName;
      misc:year ?departureImageYear].
    optional {
      [ edm:isShownAt ?departureImage1;
        edm:isShownBy ?departureImage2;
        edm:provider ?departureProvider].
    }
    bind(if(bound(?departureImage1)&&strends(str(?departureImage1),'.jpg'),?departureImage1,?departureImage2) as ?departureImageUrl)
  }
  bind(if(bound(?departureImageUrl),'<img src="{{departureImageUrl}}" style="width:300px;height:300px;">','') as ?departureImg)
  optional {
    [ dce:creator ?arrivalImageCreator;
      dce:description ?arrivalImageDescription;
      foaf:depiction ?arrivalImage1;
      misc:place ?arrivalName;
      misc:year ?arrivalImageYear].
    optional {
      [ edm:isShownAt ?arrivalImage1;
        edm:isShownBy ?arrivalImage2].
    }
    bind(if(bound(?arrivalImage1),?arrivalImage1,?arrivalImage2) as ?arrivalImageUrl)
  }
  bind(if(bound(?arrivalImageUrl),'<img src="{{arrivalImageUrl}}" style="width:300px;height:300px;">','') as ?arrivalImg)
  bind(<http://sws.geonames.org/3367577/> as ?kaap)
  ?kaap wgs84:lat ?latKaap; wgs84:long ?longKaap.
  bind(strdt(concat('Point(',?longKaap,' ',?latKaap,')'),geo:wktLiteral) as ?restShape)
  optional {
    [ dce:creator ?restImageCreator;
      dce:description ?restImageDescription;
      foaf:depiction ?restImage;
      misc:ExternalGeoIdentifier ?kaap;
      misc:place ?restName;
      misc:year ?restImageYear].
    filter(strends(str(?restImage),'.jpg'))
  }
  bind(strdt(if(xsd:integer(?departureLat)>45,
                concat('LineString(',?departureLong,' ',?departureLat,',3.07966 51.77924,1.34205 50.87258,-2.08131 49.93115,-5.33326 48.67037,-9.77174 43.27050,-11.44166 36.68907,-14.78151 28.71317,-19.00026 18.92025,-23.87345 12.6475,-30.5023 -10.39992,-33.11856 -18.33260,-31.73428 -27.76883,-29.9325 -32.07113,-27.9500 -34.08019,-26.13816 -35.75632,-23.80906 -37.13492,-20.90867 -37.65861,-15.32761 -37.86705,-6.80222 -37.41468,2.64602 -36.71335,8.0073 -36.1831,12.36839 -36.07712,',?longKaap,' ',?latKaap,',18.35680 -35.39930,20.55277 -36.59887,26.11185 -37.56297,36.15953 -37.76297,44.45902 -38.03175,72.07865 -38.13552,97.47012 -38.35985,100.16931 -37.15799,102.45447 -35.40458,103.81677 -33.19029,104.45398 -29.83812,105.09119 -24.40449,104.82752 -17.17519,103.15760 -11.10593,',?arrivalLong,' ',?arrivalLat,')'),
                concat('LineString(',?departureLong,' ',?departureLat,',74.5229 7.69870,71.78581 7.03825,69.14909 5.55316,65.91911 2.85805,62.66716 -0.83214,60.38200 -4.60650,57.21794 -11.21877,54.93278 -16.42287,52.82341 -21.89969,49.25455 -27.66664,42.75065 -31.18710,36.07096 -33.70848,28.51237 -36.15797,21.65690 -37.14512,',?longKaap,' ',?latKaap,',17.03490 -34.35846,14.92553 -30.50223,11.11303 -23.29844,5.65209  -15.34412,-8.80494 2.39809,-17.59401 10.08075,-22.00026 16.52025,-28.7247 30.78764,-26.85550 37.54813,-21.58206 43.00792,-17.01175 46.65251,-12.0898 48.75189,-6.03727 49.37919,-0.956103 50.02224,2.53750 51.63169,',?arrivalLong,' ',?arrivalLat,')')),
             geo:wktLiteral) as ?shape3)
  ?voyage
    das:voydepartureedtf ?departureDate;
    das:voycapedepartureedtf ?depCapeDate;
    das:voyarrivaldateedtf ?arrivalDate;
    das:voycapearrivaledtf ?arrCapeDate.
  bind((?arrivalDate-?departureDate) / (24*60*60) as ?days)
  bind('''
       Vertrokken van {{departureName}}: {{departureDate}}<br>
       Aangekomen op {{restName}}: {{arrCapeDate}}<br>
       Vertrokken van {{restName}}: {{depCapeDate}}<br>
       Aangekomen in {{arrivalName}}: {{arrivalDate}}<br>
       Duur van de reis: {{days}} dagen
       ''' as ?shape3Label)
  bind(if(bound(?departureImageDescription),
          '''
          <h3>{{departureName}}</h3>
          <p>Vertrokken op {{departureDate}}</p>
          <figure>
            {{departureImg}}
            <figcaption>
              “{{departureImageDescription}}” door {{departureImageCreator}}, {{departureImageYear}} [Herkomstcollectie: {{departureProvider}}].
            </figcaption>
          </figure>
          ''',
          '''<h3>{{departureName}}</h3>
          <p>Vertrokken op {{departureDate}}</p>
          ''') as ?departureShapeLabel)
  bind('''
       <h3>{{arrivalName}}</h3>
       <p>Aangekomen op {{arrivalDate}}</p>
       <figure>
         {{arrivalImg}}
         <figcaption>
           {{arrivalImageDescription}} door {{arrivalImageCreator}}, {{arrivalImageYear}} [Herkomstcollectie: Nationaal Archief].
         </figcaption>
       </figure>
       ''' as ?arrivalShapeLabel)
  bind('''
       <h3>{{restName}}</h3>
       <p>Aangekomen op {{arrCapeDate}}</br>Vertrokken op {{depCapeDate}}</p>
       <figure>
         <img src="{{restImage}}" style="width:300px;height:300px;">
         <figcaption>
           “{{restImageDescription}}” door {{restImageCreator}}, {{restImageYear}} [Herkomstcollectie: Nationaal Archief].
         </figcaption>
       </figure>
       ''' as ?restShapeLabel)
  bind(if(strends(str(?voyage),'6'),'green','red') as ?shape3Color)
}



`;

// const endpoint = "http://dbpedia.org/sparql";
// const plugin = "geo";
// const query = `
//
//
// prefix geo: <http://www.opengis.net/ont/geosparql#>
// select * {
//   #Testing points and polygons with a tooltip
//   bind("Point(5.89118305 50.94279662)"^^geo:wktLiteral as ?tooltip_point)
//   bind("Polygon((5.86118305 50.99279662, 5.96118305 50.99279662, 5.86118305 50.89279662))"^^geo:wktLiteral as ?tooltip_polygon)
//   bind("Polygon((5.88118305 50.99279662, 5.96118305 50.99279662, 5.86118305 50.89279662))"^^geo:wktLiteral as ?tooltip_smallerPolygon)
//   bind("tooltip_pointTooltip" as ?tooltip_pointTooltip)
//   bind("tooltip_polygonTooltip" as ?tooltip_polygonTooltip)
//   bind("tooltip_smallerPolygonTooltip" as ?tooltip_smallerPolygonTooltip)
//
//   #Testing points and polygons with a label
//   bind("Point(6.19118305 50.94279662)"^^geo:wktLiteral as ?label_point)
//   bind("Polygon((6.16118305 50.99279662, 6.96118305 50.99279662, 6.16118305 50.89279662))"^^geo:wktLiteral as ?label_polygon)
//   bind("Polygon((6.18118305 50.99279662, 6.96118305 50.99279662, 6.16118305 50.89279662))"^^geo:wktLiteral as ?label_smallerPolygon)
//   bind("label_pointLabel" as ?label_pointLabel)
//   bind("rgb(255, 0, 0)" as ?label_pointColor)
//   bind("label_polygonLabel" as ?label_polygonLabel)
//   bind("rgb(221, 208, 0)" as ?label_polygonColor)
//   bind("label_smallerPolygonLabel" as ?label_smallerPolygonLabel)
//   bind("rgb(176, 153, 153)" as ?label_smallerPolygonColor)
// }
//
//
// `;

const getHtml = plugin => `

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>YASR</title>
  <link rel="icon" type="image/png" href="doc/imgs/favicon.png" />

  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.0.0/polyfill.js"></script>
  <style>
    body {
	 font-family: 'Roboto', sans-serif;
	}
	</style>
  <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />
  <link rel="stylesheet" href="build/yasr.min.css" />
  <link rel="stylesheet" href="build/pro-gallery.min.css">
  <link rel="stylesheet" href="build/pro-geo.min.css">
  <link rel="stylesheet" href="build/pro-geo3d.min.css">
  <link rel="stylesheet" href="build/pro-gchart.min.css">
  <link href="./node_modules/@triply/yasqe/build/yasqe.min.css" rel="stylesheet">
</head>

<body>
  <div id="yasqe"></div>
  <div id="yasr"></div>

  <script src="build/yasr.min.js"></script>
  <script src="build/pro-gallery.min.js"></script>
  <script src="build/pro-geo.min.js"></script>
  <script src="build/pro-geo3d.min.js"></script>
  <script src="build/pro-gchart.min.js"></script>
  <script src="./node_modules/@triply/yasqe/build/yasqe.min.js"></script>
  <script type="text/javascript">
    window.onload = function () {
      console.log('onload')
      window.yasqe = Yasqe(document.getElementById("yasqe"), {
        requestConfig: {
          endpoint: "${endpoint}"
        },
        value: \`
        ${query}
        \`
      });
      yasqe.on("queryResponse", function (yasqe, response, duration) {

        console.log({
          response: response
        })
        window.yasr.setResponse(response, duration);
      });
      yasqe.query();
      window.yasr = Yasr(document.getElementById("yasr"), {
        prefixes: function () {
          yasqe.getPrefixesFromQuery();
        },
        defaultPlugin: "${plugin}",
        //Disable persisting settings. Makes it easier to use this file for our puppeteer tests
        persistenceId: null,
      });

    };
  </script>
</body>

</html>




`;

const getScreenWidth = plugin => {
  switch (plugin) {
    case "geo":
      // case "table":
      return 1200;
    // return 831;
    case "gallery":
      return 900;
    default:
      return 1920;
  }
};

let staticFileServer = new static.Server("./");
function setupServer() {
  return new Promise((resolve, reject) => {
    var server = http
      .createServer(function(request, response) {
        if (request.url === "/") return response.end(getHtml(plugin));
        request
          .addListener("end", function() {
            staticFileServer.serve(request, response);
          })
          .resume();
      })
      .listen(PORT, "localhost", () => {
        resolve(server);
      })
      .on("error", e => reject(e));
  });
}
function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}
function waitForImagesToLoad(page) {
  return page.evaluate(() => {
    const selectors = Array.from(document.querySelectorAll("img"));
    return Promise.all(
      selectors.map(img => {
        if (img.complete) return;
        return new Promise((resolve, reject) => {
          img.addEventListener("load", resolve);
          img.addEventListener("error", reject);
        });
      })
    );
  });
}

(async () => {
  const server = await setupServer();
  const browser = await puppeteer.launch({
    headless: false,
    // devtools: true,
    args: [process.env["NO_SANDBOX"] ? "--no-sandbox" : ""]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: getScreenWidth(plugin), height: 1200 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: ["load", "domcontentloaded", "networkidle0"] });
  //Wait for results to be drawn
  // await page.waitForFunction('document.getElementsByClassName("yasr_results")[0].childElementCount > 0');
  // await waitForImagesToLoad(page);
  // await wait(100);
  const clip = await page.evaluate(() => {
    const rect = document.querySelector(".yasr_results").getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  });
  console.log(clip);
  await page.screenshot({
    path: "screenshot.png",
    fullPage: false,
    clip: clip
  });
  await page.close();
  await browser.close();
  await server.close();
})();
