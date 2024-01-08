const fs = require("fs");
const lPath = require("path");

const {readSimpleDataFile} = require("../lib/simpleStructure");
const {File, Directory} = require("../lib/TurtleFiles");

const getMainPath = (path) => lPath.join(lPath.resolve(__dirname, '..'), path);
const definedPages = {
	"notFound": [ "/pageNotFound", "Page not found!" ],
	"err": [ "/errorPage", "An Error occurred!" ]
};
const imageEnds = [
	"jpg", "jpeg", "png", "ico", "gif"
];
const scriptEnds = [
	"js", "css"
];

function isImage(file) {
	let splited = file.split(".");
	if (splited.length <= 1) return false;
	const fileEnd = splited[splited.length-1];
	for (var i of imageEnds) {
		if (typeof i != "string") continue;
		if (fileEnd.toLowerCase() == i.toLowerCase()) {
			return true;
		}
	}
	return false;
}
function getScriptName(file) {
	let splited = file.split(".");
	if (splited.length <= 1) return false;
	const fileEnd = splited[splited.length-1];
	for (var i of scriptEnds) {
		if (typeof i != "string") continue;
		if (fileEnd.toLowerCase() == i.toLowerCase()) {
			return fileEnd.toLowerCase();
		}
	}
	return null;
}
function removeFileEnd(file) {
	let splited = file.split(".");
	if (splited.length <= 1) return file;
	let fileEnd = splited[splited.length-1];
	return file.substr(0, file.length - fileEnd.length - 1);
}
function readFile(path, encoding = "utf-8") {
	const file = new File(path);
	if (file.exists()) {
		try {
			return file.readSync(encoding);
		} catch(err) {}
	}
	return null;
}
function setVariablesInString(value, lV, symStart, symEnd) {
	if (value == undefined) return undefined;
	const list = value.split(symStart);
	if (list.length <= 1) return value;
	for (var _i in list) {
		if (i == 0) continue;
		
		var i = list[_i];
		let l2 = i.split(symEnd);
		if (l2.length <= 1) continue;
		const fullKey = symStart + l2[0] + symEnd;
		const key = l2[0];
		const _val = lV[key];
		var val;
		if (typeof _val == "object") {
			val = JSON.stringify(lV[key]);
		} else if (_val == undefined) {
			val = "undefined";
		} else if (typeof _val == "string") {
			val = _val;
		} else {
			val = _val + "";
		}
		list[_i] = val + i.substr(key.length + symEnd.length);
	}
	var result = "";
	for (var i of list) {
		result += i;
	}
	return result;
}
function setWebVariables(value, vars) {
	return setVariablesInString(value, vars, "{{-", "-}}");
}
function setLocalVariables(value, vars) {
	return setVariablesInString(value, vars, "{{_", "_}}");
}
function setVariables(value, gV, lV) {
	value = setWebVariables(value, gV);
	value = setLocalVariables(value, lV);
	return value;
}

function parseData(webVariables = {}) {
	const gV = readSimpleDataFile("-/config/globalVariables.txt");
	for (var i in gV) {
		webVariables[i] = gV[i];
	}
}
function readWebTemplates(webVariables = {}) {
	const temps = {};
	const readAll = function(path, webPath = "") {
		if (!fs.existsSync(path)) return;
		let files = fs.readdirSync(path);
		files.forEach(file => {
			const p = lPath.join(path, file);
			if (!fs.lstatSync(p).isDirectory()) {
				const content = readFile(p, "utf-8");
				if (content != null && content != undefined) {
					if (webPath.length > 0) webPath += "/";
					temps["temp:" + webPath + file] = content;
				}
			} else {
				readAll(p, webPath + "/" + file);
			}
		});
	}
	readAll(getMainPath("/temps"));
	for (var i in temps) {
		webVariables[i] = setWebVariables(temps[i], webVariables);
	}
}

function parseWebPage(p, webPath, webPages, webVariables) {
	try {
		const file = new File(p).getName();
		if (webPath.endsWith("/")) webPath = webPath.substring(0, webPath.length-1);
		var finalWebPath;
		const page = {
			"type": "text",
			"data": "",
			"file": webPath+"/"+file,
			"script": undefined
		};
		if (isImage(file)) {
			page.type = "image";
			page.data = readFile(p, "base64");
			finalWebPath = webPath + "/" + file;
		} else if (getScriptName(file) != null) {
			page.type = "script";
			page.script = getScriptName(file);
			page.data = readFile(p, "utf-8");
			finalWebPath = webPath + "/" + file;
		} else {
			page.type = "text";
			page.data = readFile(p, "utf-8");
		}
		if (page.data != null) {
			if (finalWebPath == undefined) {
				finalWebPath = webPath + "/" + removeFileEnd(file);
				if (finalWebPath.toLowerCase() == "/home") finalWebPath = "/";
			}
			finalWebPath = finalWebPath.replace(/[*]/g, "");
			if (finalWebPath.endsWith("/") && finalWebPath.length > 1) {
				finalWebPath = finalWebPath.substring(0, finalWebPath.length-1);
			}
			webVariables.webPages.push(finalWebPath.toLowerCase());
			if (webPages[finalWebPath.toLowerCase()] == undefined) {
				delete webPages[finalWebPath.toLowerCase()];
			}
			webPages[finalWebPath.toLowerCase()] = page;
		} else {
			throw "Failed to read file: \"file is null!\"";
		}
	} catch(err) {
		console.error("Error >> " + err);
	}
}
function readWebPages(webPages = {}, webVariables = {}) {
	webVariables["webPages"] = [];
	const readAll = function(path, webPath = "") {
		let files = fs.readdirSync(path);
		files.forEach(file => {
			const p = lPath.join(path, file);
			if (!fs.lstatSync(p).isDirectory()) {
				parseWebPage(p, webPath, webPages, webVariables);
			} else {
				readAll(p, webPath + "/" + file);
			}
		});
	}
	readAll(getMainPath("/html"));
	for (var _i in definedPages) {
		const i = definedPages[_i];
		const key = i[0].toLowerCase();
		if (webPages[key] == undefined || webPages[key] == null) {
			webPages[key] = {
				"type": "text",
				"data": i[1]
			};
		}
	}
}

function load(actions = [], vars = {}) {
	const _parseData = actions.includes("parseData"),
	_readWebPages = actions.includes("readWebPages"),
	_readWebTemplates = actions.includes("readWebTemplates");
	const webVariables = vars["webVariables"] ?? {},
	webPages = vars["webPages"];
	if (_parseData) {
		parseData(webVariables);
	} if (_readWebPages) {
		readWebPages(webPages, webVariables);
	} if (_readWebTemplates) {
		readWebTemplates(webVariables);
	}
}
async function webReq(req, res, next) {
  try {
		const lV = {
			"cookieState": 0,
			"url": undefined,
			"pageUrl": undefined,
			"urlArguments": {},
			"isClient": true
		};

		var url = req.originalUrl.toLowerCase();
		if (url.endsWith("/") && url != "/") {
			url = url.substr(0,url.length-1);
		}
		lV["url"] = url;

		var urlArgs = {};
		var rawUrlArguments = "";
		var pageUrl = url;
		var splPageUrl = url.split("/");
		if (splPageUrl[splPageUrl.length-1].indexOf("?") > -1) {
			let spl = splPageUrl[splPageUrl.length-1].split("?");
			rawUrlArguments = spl[spl.length-1];
			pageUrl = "/" + spl[0];
		}
		if (rawUrlArguments.length > 0) {
			for (var i of rawUrlArguments.split(",")) {
				if (i.indexOf("=") == -1) {
					urlArgs[i] = 1;
				} else {
					let spl = i.split("=");
					var key = spl[0];
					urlArgs[key] = i.substring(key.length+1);
				}
			}
		}
		if (pageUrl == "/home") {
			pageUrl = "/";
		}
		lV["pageUrl"] = pageUrl;
		lV["urlArguments"] = urlArgs;
		var webCookies = req.cookies;

		const cookieState = webCookies["tc_cookies"];
		if (cookieState == "1") {
			lV.cookieState = 1;
		} else if (cookieState == "2") {
			lV.cookieState = 2;
		} else {
			lV.cookieState = 0;
		}
		res.setCookie = (key, value, args) => {
			if (lV.cookieState != 2) return; 
			args["maxAge"] ??= 900000;
			args["httpOnly"] ??= true; 
			res.cookie(key, value, args);
		};

		const acceptH = req.headers["accept"];
		if (acceptH != null || acceptH != undefined) {
			let acceptL1 = acceptH.split(";");
			const acceptL = acceptL1[0].split(",");
			req.acceptList = acceptL;
			if (acceptL.includes("text/html") || acceptL.includes("application/xhtml+xml") || acceptL.includes("application/xml")) {
				lV.isClient = true;
			} else {
				lV.isClient = false;
			}
		}
		req.lV = lV;
	} catch(err) {
		console.error(err);
	}
	next();
}

module.exports = {
	load: load,
	parseWebPage: parseWebPage,
	setVariablesInString: setVariablesInString,
	setWebVariables: setWebVariables,
	setLocalVariables: setLocalVariables,
	setVariables: setVariables,
  webReq: webReq,
}