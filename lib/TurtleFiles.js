const fs = require("fs");
const lPath = require("path");

class FileEntity {
  constructor(path, lclDir = process.cwd()) {
    if (typeof path != "string") throw "The path is not a string!";
    if (typeof lclDir != "string") throw "The localDirectory is not a string!";
    if (path.startsWith("-/") || path.startsWith("./")) {
      path = lPath.join(lclDir, path.substring(1));
    } else if (!path.startsWith("/")) {
      path = lPath.join(lclDir, path);
    }
    this.path = lPath.normalize(path);
  }
  getName() {
    return lPath.basename(this.path);
  }
  getDirectory() {
    return lPath.dirname(this.path);
  }
  isFile() {
    return fs.lstatSync(this.path).isFile();
  }
  isDirectory() {
    return fs.lstatSync(this.path).isDirectory();
  }
  exists() {
    return fs.existsSync(this.path);
  }
  rename(newPath) {
    return new Promise((resolve, reject) => {
      fs.rename(this.path, newPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(err);
        }
      });
    });
  }
  renameSync(newPath) {
    fs.renameSync(this.path, newPath);
  }
}

class File extends FileEntity {
  constructor(path, lclDir) {
    super(path, lclDir);
  }
  delete() {
    return new Promise((resolve, reject) => {
      fs.unlink(this.path, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(err);
        }
      });
    });
  }
  deleteSync() {
    fs.unlinkSync(this.path);
  }
  read(encoding = "utf-8") {
    return new Promise((resolve, reject) => {
      fs.readFile(this.path, encoding, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  readSync(encoding = "utf-8", safety = false) {
    if (safety) {
      try {
        return fs.readFileSync(this.path, encoding);
      } catch (err) {
        return undefined;
      }
    } else {
      return fs.readFileSync(this.path, encoding);
    }
  }
  write(data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.path, data, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  writeSync(data) {
    fs.writeFileSync(this.path, data);
  }
}
class Directory extends FileEntity {
  constructor(path, lclDir) {
    super(path, lclDir);
  }
  delete(recursive = false) {
    return new Promise((resolve, reject) => {
      fs.rmdir(this.path, { recursive: recursive }, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      })
    });
  }
  deleteSync(recursive = false) {
    fs.rmdirSync(this.path, { recursive: recursive });
  }
  list(recursive = false) {
    return new Promise((resolve, reject) => {
      fs.readdir(this.path, async (err, files) => {
        if (err) {
          reject(err);
          return;
        };
        var res = [];
        for (var file of files) {
          var fullPath = lPath.join(this.path, file);
          var stats = fs.lstatSync(fullPath);
          if (stats.isFile()) {
            res.push(new File(fullPath));
          } else if (stats.isDirectory()) {
            var dir = new Directory(fullPath);
            res.push(dir);
            if (recursive) {
              var files2 = await dir.list();
              for (var i2 of files2) {
                res.push(i2);
              }
            }
          } else {
            res.push(new FileEntity(fullPath));
          }
        }
        resolve(res);
      });
    });
  }
  listSync(recursive = false) {
    var res = [];
    var files = fs.readdirSync(this.path);
    for (var file of files) {
      var fullPath = lPath.join(this.path, file);
      var stats = fs.lstatSync(fullPath);
      if (stats.isFile()) {
        res.push(new File(fullPath));
      } else if (stats.isDirectory()) {
        var dir = new Directory(fullPath);
        res.push(dir);
        if (recursive) {
          var files2 = dir.listSync();
          for (var i2 of files2) {
            res.push(i2);
          }
        }
      } else {
        res.push(new FileEntity(fullPath));
      }
    }
    return res;
  }
}
module.exports = {
  "File": File,
  "Directory": Directory,
  "FileEntity": FileEntity
};