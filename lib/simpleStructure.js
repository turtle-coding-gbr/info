const {File, Directory, FileEntity} = require("./TurtleFiles");

function simpleStructure(str, sym = "=", sep = "\n") {
	const res = {};
	var list = str.split(sep);
	for (var i of list) {
		var l2 = i.split(sym);
		var key = l2[0];
		var value;
		if (l2.length == 2) {
			value = i.substr(key.length+1);
		} else {
			value = undefined;
		}
		res[key] = value;
	}
	return res;
}
function readSimpleDataFile(path) {
	var result, data;
	try {
		data = new File(path).readSync();
	} catch(err) {}
	if (data != undefined) {
		result = simpleStructure(data, "=", "\n");
	}
	return result ?? {};
}

module.exports = {
	simpleStructure: simpleStructure,
	readSimpleDataFile: readSimpleDataFile
};