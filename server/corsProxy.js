var http = require('follow-redirects').http,
	querystring = require('querystring'),
	url = require('url');


module.exports = function(req, res) {
	if (req.method == 'GET') {
		res.statusCode = 405;
		return res.end('GET request not supported');
	}
	
	var arguments = req.body;
	var acceptHeader = '*/*';
	if (req.headers.accept) acceptHeader = req.headers.accept;
	var requestMethod = "POST";
	if (arguments.requestMethod) {
		requestMethod = arguments.requestMethod;
		delete arguments["requestMethod"];
	}
	
	if (!arguments.endpoint) {
		res.statusCode = 400;
		return res.end('Missing endpoint reference to proxy');
	}
	var endpoint = arguments.endpoint;
	delete arguments["endpoint"];
	
	var parsedEndpoint = url.parse(endpoint);
	
	delete req.headers['content-type'];
	delete req.headers['content-length'];
	
	var endpointReqOptions = {
		host: parsedEndpoint.host,
		path: parsedEndpoint.path,
		headers:  req.headers,
		method: requestMethod,
		headers: {}
	}
	endpointReqOptions.headers['Accept'] = acceptHeader;
	var postData = null;
	if (requestMethod == "GET") {
		var appendedQuery = "";
		if (endpointReqOptions.path.indexOf("?") >= 0) { 
			appendedQuery = "&";
		} else {
			appendedQuery = "?";
		}
		appendedQuery += querystring.stringify(arguments);
		endpointReqOptions.path += appendedQuery;
	} else {
		postData = querystring.stringify(arguments);
		endpointReqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
		endpointReqOptions.headers['Content-Length'] = postData.length
	}
	
	var proxyReq = http.request(endpointReqOptions, function(proxyRes) {
		res.setHeader('content-type', proxyRes.headers['content-type']);
		
		proxyRes.on('data', function(chunk) {
			res.write(chunk);
		});
		proxyRes.on('end', function() {
			res.end();
		});
	});
	if (postData) proxyReq.write(postData);
	proxyReq.end();
	
	
	
	
	
};