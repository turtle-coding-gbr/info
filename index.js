const lPath = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

const {File,Directory} = require("./lib/TurtleFiles");
const {
	load,
	parseWebPage,
	setVariables,
  webReq
} = require("./utils/WebPageRegister");

const config = require("./config.json");
const debug = config.debug;

const mainPath = process.cwd();
const webVariables = {};
const webPages = {};
const definedPages = {
	"notFound": "/pageNotFound",
	"err": "/errorPage"
};


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(webReq);

app.get(/[/]/, async function(req, res) {
	try {
		const lV = req.lV;
		const urlArgs = lV.urlArguments;
		const pageUrl = lV.pageUrl;
		const accept = req.acceptList;
		const notFound = function() {
			res.send(setVariables(webPages[definedPages.notFound.toLowerCase()].data, webVariables, lV));
		};
		
		//registry
		var webObj = webPages[pageUrl];
		if (debug && webObj != undefined) {
			const file = new File(lPath.join(lPath.join(mainPath, "html"), webObj.file));
			if (!file.exists()) {
				if (webObj[pageUrl] != undefined)
					delete webObj[pageUrl];
				webObj = undefined;
			} else {
				parseWebPage(
					file.path,
					new File(webObj.file).getDirectory(),
					webPages,
					webVariables
				);
				webObj = webPages[pageUrl];
			}
		}
		if (webObj != undefined) {
			const type = webObj.type;
			if (type == "text") {
				const no_cookie = lV.urlArguments["no_cookie"] == 1;
				if (lV.cookieState == 0 && !no_cookie) {
					if (debug) loadCookieConfig();
					res.send(setVariables(
						webObj.data.replace("</html>", "<footer>\n" + cookie_config_page + "\n</footer>\n</html>"),
						webVariables,
						lV
					));
				} else {
					res.send(setVariables(webObj.data, webVariables, lV));
				}
			} else if (type == "script") {
				res.statusCode = 200;
				var scr = webObj.script;
				if (scr == "css") {
					if (accept.includes("text/css")) {
						res.setHeader("Content-type", "text/css");
					} else {
						notFound();
						return;
					}
				} else if (scr == "js") {
					if (accept.length == 1 && accept[0] == "*/*") {
					} else {
						notFound();
						return;
					}
				}
				res.end(setVariables(webObj.data, webVariables, lV));
			} else if (type == "image") {
				if (!lV.isClient) {
					var img = Buffer.from(webObj.data, "base64");
					res.statusCode = 200;
					res.setHeader("Content-Length", img.length);
					res.setHeader("Content-Type", "image/x-icon");
					res.end(img);
				} else {
					notFound();
				}
			}
		} else {
			notFound();
		}
	} catch(err) {
		res.send(webPages[definedPages.err.toLowerCase()].data);
		if (debug) throw(err);
		else console.error("Error >> An error occurred while recieving the request: "+err);
	}
});
app.post(/[/]/, async function(req, res) {
	try {
		const lV = req.lV;
		const urlArgs = lV.urlArguments;
		const pageUrl = lV.pageUrl;
		const body = req.body ?? {};
	} catch(err) {
		if (debug) throw(err);
		else console.error("Error >> An error occurred while recieving the request: "+err);
	}
});

var cookie_config_page;
function loadCookieConfig() {
	let res = "";
	try {
		res = new File("-/config/cookiePage.html").readSync();
	} catch(_) {}
	cookie_config_page = res;
}

function run() {
	load(
		["parseData", "readWebPages", "readWebTemplates"],
		{
			"webVariables": webVariables,
			"webPages": webPages
		}
	);
	loadCookieConfig();
	app.listen(8080, () => {
		console.log(
`Server >> The server woke up!
[DEBUG=${debug}]`
		);
	});
	process.on("exit", () => {
	    console.log("Server >> The Server is now offline!");
	});
}

run();