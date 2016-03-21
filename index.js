'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));
var _$1 = _interopDefault(require('lodash'));
var mime = _interopDefault(require('mime-type/with-db'));
var Voog = _interopDefault(require('voog'));
var request = _interopDefault(require('request'));
var bluebird = require('bluebird');

var babelHelpers = {};

babelHelpers.slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

babelHelpers;

var version = "0.0.1";

var listFiles = function listFiles(folderPath) {
  return fs.readdirSync(folderPath).filter(function (item) {
    var itemPath = path.join(folderPath, item);
    return fs.statSync(itemPath).isFile();
  });
};

var listFolders = function listFolders(folderPath) {
  return fs.readdirSync(folderPath).filter(function (item) {
    var itemPath = path.join(folderPath, item);
    return fs.statSync(itemPath).isDirectory();
  });
};

var getFileContents = function getFileContents(filePath, options) {
  return fs.readFileSync(filePath, options);
};

var deleteFile = function deleteFile(filePath) {
  return ['fs.unlinkSync', filePath];
};

var writeFile = function writeFile(filePath, data) {
  return fs.writeFileSync(filePath, data);
};

var fileUtils = {
  listFiles: listFiles,
  listFolders: listFolders,
  deleteFile: deleteFile,
  writeFile: writeFile,
  cwd: process.cwd,
  getFileContents: getFileContents
};

var CONFIG_FILENAME = '.voog';

var HOMEDIR = process.env.HOME;
var LOCALDIR = process.cwd();

var LOCAL_CONFIG = path.join(LOCALDIR, CONFIG_FILENAME);
var GLOBAL_CONFIG = path.join(HOMEDIR, CONFIG_FILENAME);

var siteByName = function siteByName(name, options) {
  return sites().filter(function (p) {
    return p.name === name;
  })[0];
};

var sites = function sites(options) {
  return read('sites', options) || read('projects', options) || [];
};

var write = function write(key, value, options) {
  var path = undefined;
  if (!options || _.has(options, 'global') && options.global === true) {
    path = GLOBAL_CONFIG;
  } else {
    path = LOCAL_CONFIG;
  }
  var config = read(null, options) || {};
  config[key] = value;

  var fileContents = JSON.stringify(config, null, 2);

  fs.writeFileSync(path, fileContents);
  return true;
};

var read = function read(key, options) {
  var path = undefined;
  if (!options || _.has(options, 'global') && options.global === true) {
    path = GLOBAL_CONFIG;
  } else {
    path = LOCAL_CONFIG;
  }

  try {
    var data = fs.readFileSync(path, 'utf8');
    var parsedData = JSON.parse(data);
    if (typeof key === 'string') {
      return parsedData[key];
    } else {
      return parsedData;
    }
  } catch (e) {
    return;
  }
};

var deleteKey = function deleteKey(key, options) {
  if (!options) {
    var _path = GLOBAL_CONFIG;
  } else if (options.hasOwnProperty('global') && options.global === true) {
    var _path2 = GLOBAL_CONFIG;
  } else {
    var _path3 = LOCAL_CONFIG;
  }

  var config = read(null, options);
  var deleted = delete config[key];

  if (deleted) {
    var fileContents = JSON.stringify(config);
    fs.writeFileSync(path, fileContents);
  }

  return deleted;
};

var isPresent = function isPresent(global) {
  if (global) {
    var _path4 = GLOBAL_CONFIG;
  } else {
    var _path5 = LOCAL_CONFIG;
  }
  return fs.existsSync(path);
};

var hasKey = function hasKey(key, options) {
  var config = read(null, options);
  return typeof config !== 'undefined' && config.hasOwnProperty(key);
};

var config = {
  siteByName: siteByName,
  write: write,
  read: read,
  delete: deleteKey,
  isPresent: isPresent,
  hasKey: hasKey,
  sites: sites
};

mime.define('application/vnd.voog.design.custom+liquid', { extensions: ['tpl'] }, mime.dupOverwrite);

// byName :: string -> object?
var byName = function byName(name) {
  return config.sites().filter(function (site) {
    return site.name === name || site.host === name;
  })[0];
};

// add :: object -> bool
var add = function add(data) {
  if (_$1.has(data, 'host') && _$1.has(data, 'token')) {
    var sites = config.sites();
    sites.push(data);
    config.write('sites', sites);
    return true;
  } else {
    return false;
  };
};

// remove :: string -> bool
var remove = function remove(name) {
  var sitesInConfig = config.sites();
  var siteNames = sitesInConfig.map(function (site) {
    return site.name || site.host;
  });
  var idx = siteNames.indexOf(name);
  if (idx < 0) {
    return false;
  }
  var finalSites = sitesInConfig.slice(0, idx).concat(sitesInConfig.slice(idx + 1));
  return config.write('sites', finalSites);
};

var getFileInfo = function getFileInfo(filePath) {
  var stat = fs.statSync(filePath);
  var fileName = path.basename(filePath);
  return {
    file: fileName,
    size: stat.size,
    contentType: mime.lookup(fileName),
    path: filePath,
    updatedAt: stat.mtime
  };
};

var totalFilesFor = function totalFilesFor(projectName) {
  var files = filesFor(projectName);
  return Object.keys(files).reduce(function (total, folder) {
    return total + files[folder].length;
  }, 0);
};

// filesFor :: string -> object?
var filesFor = function filesFor(name) {
  var folders = ['assets', 'components', 'images', 'javascripts', 'layouts', 'stylesheets'];

  var workingDir = dirFor(name);

  var root = fileUtils.listFolders(workingDir);

  if (root) {
    return folders.reduce(function (structure, folder) {
      if (root.indexOf(folder) >= 0) {
        (function () {
          var folderPath = path.join(workingDir, folder);
          structure[folder] = fileUtils.listFiles(folderPath).filter(function (file) {
            var fullPath = path.join(folderPath, file);
            var stat = fs.statSync(fullPath);

            return stat.isFile();
          }).map(function (file) {
            var fullPath = path.join(folderPath, file);

            return getFileInfo(fullPath);
          });
        })();
      }
      return structure;
    }, {});
  }
};

// dirFor :: string -> string?
var dirFor = function dirFor(name) {
  var site = byName(name);
  if (site) {
    return site.dir || site.path;
  }
};

// hostFor :: string -> string?
var hostFor = function hostFor(name) {
  var site = byName(name);
  if (site) {
    return site.host;
  }
};

// tokenFor :: string -> string?
var tokenFor = function tokenFor(name) {
  var site = byName(name);
  if (site) {
    return site.token || site.api_token;
  }
};

// names :: * -> [string]
var names = function names() {
  return config.sites().map(function (site) {
    return site.name || site.host;
  });
};

var projects = {
  byName: byName,
  add: add,
  remove: remove,
  totalFilesFor: totalFilesFor,
  filesFor: filesFor,
  dirFor: dirFor,
  hostFor: hostFor,
  tokenFor: tokenFor,
  names: names
};

var clientFor = function clientFor(name) {
  var host = projects.hostFor(name);
  var token = projects.tokenFor(name);
  if (host && token) {
    return new Voog(host, token);
  }
};

var getLayoutContents = function getLayoutContents(projectName, id) {
  return new bluebird.Promise(function (resolve, reject) {
    clientFor(projectName).layout(id, {}, function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data.body);
    });
  });
};

var getLayoutAssetContents = function getLayoutAssetContents(projectName, id) {
  return new bluebird.Promise(function (resolve, reject) {
    clientFor(projectName).layoutAsset(id, {}, function (err, data) {
      if (err) {
        reject(err);
      }
      if (data.editable) {
        resolve(data.data);
      } else {
        resolve(data.public_url);
      }
    });
  });
};

var getLayouts = function getLayouts(projectName) {
  var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return new bluebird.Promise(function (resolve, reject) {
    clientFor(projectName).layouts(Object.assign({}, { per_page: 250 }, opts), function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

var getLayoutAssets = function getLayoutAssets(projectName) {
  var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return new bluebird.Promise(function (resolve, reject) {
    clientFor(projectName).layoutAssets(Object.assign({}, { per_page: 250 }, opts), function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

var pullAllFiles = function pullAllFiles(projectName) {
  return new bluebird.Promise(function (resolve, reject) {
    var projectDir = projects.dirFor(projectName);

    bluebird.Promise.all([getLayouts(projectName), getLayoutAssets(projectName)]).then(function (_ref) {
      var _ref2 = babelHelpers.slicedToArray(_ref, 2);

      var layouts = _ref2[0];
      var assets = _ref2[1];

      bluebird.Promise.all([layouts.map(function (l) {
        var filePath = path.join(projectDir, (l.component ? 'components' : 'layouts') + '/' + normalizeTitle(l.title) + '.tpl');
        return pullFile(projectName, filePath);
      }).concat(assets.map(function (a) {
        var filePath = path.join(projectDir, (_$1.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset') + 's/' + a.filename);
        return pullFile(projectName, filePath);
      }))]).then(resolve);
    });
  });
};

var pushAllFiles = function pushAllFiles(projectName) {
  return new bluebird.Promise(function (resolve, reject) {
    var projectDir = projects.dirFor(projectName);

    bluebird.Promise.all([getLayouts(projectName), getLayoutAssets(projectName)]).then(function (_ref3) {
      var _ref4 = babelHelpers.slicedToArray(_ref3, 2);

      var layouts = _ref4[0];
      var assets = _ref4[1];

      bluebird.Promise.all([layouts.map(function (l) {
        var filePath = path.join(projectDir, (l.component ? 'components' : 'layouts') + '/' + normalizeTitle(l.title) + '.tpl');
        return pushFile(projectName, filePath);
      }).concat(assets.map(function (a) {
        var filePath = path.join(projectDir, (_$1.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset') + 's/' + a.filename);
        return pushFile(projectName, filePath);
      }))]).then(resolve);
    });
  });
};

var findLayoutOrComponent = function findLayoutOrComponent(fileName, component, projectName) {
  var name = normalizeTitle(getLayoutNameFromFilename(fileName));
  return new bluebird.Promise(function (resolve, reject) {
    return clientFor(projectName).layouts({
      per_page: 250,
      'q.layout.component': component || false
    }, function (err, data) {
      if (err) {
        reject(err);
      }
      var ret = data.filter(function (l) {
        return normalizeTitle(l.title) == name;
      });
      if (ret.length === 0) {
        reject(undefined);
      }
      resolve(ret[0]);
    });
  });
};

var findLayout = function findLayout(fileName, projectName) {
  return findLayoutOrComponent(fileName, false, projectName);
};

var findLayoutAsset = function findLayoutAsset(fileName, projectName) {
  return new bluebird.Promise(function (resolve, reject) {
    return clientFor(projectName).layoutAssets({
      per_page: 250,
      'q.layout_asset.filename': fileName
    }, function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data[0]);
    });
  });
};

var getFileNameFromPath = function getFileNameFromPath(filePath) {
  return filePath.split('/')[1];
};

var getLayoutNameFromFilename = function getLayoutNameFromFilename(fileName) {
  return fileName.split('.')[0];
};

var findFile = function findFile(filePath, projectName) {
  var type = getTypeFromRelativePath(filePath);
  if (_$1.includes(['layout', 'component'], type)) {
    return findLayoutOrComponent(getLayoutNameFromFilename(getFileNameFromPath(filePath)), type == 'component', projectName);
  } else {
    return findLayoutAsset(getFileNameFromPath(filePath), projectName);
  }
};

var normalizeTitle = function normalizeTitle(title) {
  return title.replace(/[^\w\-\.]/g, '_').toLowerCase();
};

var getTypeFromRelativePath = function getTypeFromRelativePath(path) {
  var folder = path.split('/')[0];
  var folderToTypeMap = {
    'layouts': 'layout',
    'components': 'component',
    'assets': 'asset',
    'images': 'image',
    'javascripts': 'javascript',
    'stylesheets': 'stylesheet'
  };

  return folderToTypeMap[folder];
};

var normalizePath = function normalizePath(path, projectDir) {
  return path.replace(projectDir, '').replace(/^\//, '');
};

var writeFile$1 = function writeFile(projectName, file, destPath) {
  return new bluebird.Promise(function (resolve, reject) {
    if (file) {
      if (_$1.includes(Object.keys(file), 'layout_name')) {
        getLayoutContents(projectName, file.id).then(function (contents) {
          try {
            fs.mkdirSync(path.dirname(destPath));
          } catch (e) {
            if (e.code != 'EEXIST') {
              throw e;
            }
          };
          fs.writeFile(destPath, contents, function (err) {
            if (err) {
              reject(false);
            }
            resolve(file);
          });
        });
      } else if (file.editable) {
        getLayoutAssetContents(projectName, file.id).then(function (contents) {
          try {
            fs.mkdirSync(path.dirname(destPath));
          } catch (e) {
            if (e.code != 'EEXIST') {
              throw e;
            }
          };
          fs.writeFile(destPath, contents, function (err) {
            if (err) {
              reject(false);
            }
            resolve(file);
          });
        });
      } else {
        var url = file.public_url;
        try {
          fs.mkdirSync(path.dirname(destPath));
        } catch (e) {
          if (e.code != 'EEXIST') {
            throw e;
          }
        };
        var stream = fs.createWriteStream(destPath);
        if (url && stream) {
          var req = request.get(url).on('error', function (err) {
            return reject(false);
          });
          req.pipe(stream);
          resolve(file);
        } else {
          reject(false);
        }
      }
    } else {
      reject();
    }
  });
};

var uploadFile = function uploadFile(projectName, file, filePath) {
  var client = clientFor(projectName);
  return new bluebird.Promise(function (resolve, reject) {
    if (file) {
      if (_$1.includes(Object.keys(file), 'layout_name')) {
        var contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayout(file.id, {
          body: contents
        }, function (err, data) {
          (err ? reject : resolve)(file);
        });
      } else if (file.editable) {
        var contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayoutAsset(file.id, {
          data: contents
        }, function (err, data) {
          (err ? reject : resolve)(file);
        });
      } else {
        resolve(file);
      }
    } else {
      reject(file);
    }
  });
};

var pullFile = function pullFile(projectName, filePath) {
  var projectDir = projects.dirFor(projectName);

  var normalizedPath = normalizePath(filePath, projectDir);

  return new bluebird.Promise(function (resolve, reject) {
    findFile(normalizedPath, projectName).then(function (file) {
      if (!file || typeof file === 'undefined') {
        reject();
        return;
      }

      resolve(writeFile$1(projectName, file, filePath));
    });
  });
};

var pushFile = function pushFile(projectName, filePath) {
  var projectDir = projects.dirFor(projectName);
  var normalizedPath = normalizePath(filePath, projectDir);

  return new bluebird.Promise(function (resolve, reject) {
    findFile(normalizedPath, projectName).then(function (file) {
      if (!file || typeof file === 'undefined') {
        return reject(file);
      }
      resolve(uploadFile(projectName, file, filePath));
    });
  });
};

var actions = {
  clientFor: clientFor,
  pullAllFiles: pullAllFiles,
  pushAllFiles: pushAllFiles,
  findLayout: findLayout,
  findLayoutAsset: findLayoutAsset,
  pushFile: pushFile,
  pullFile: pullFile
};

var core = {
  fileUtils: fileUtils,
  config: config,
  projects: projects,
  actions: actions,
  version: version
};

module.exports = core;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9wcm9qZWN0cy5qcyIsInNyYy9hY3Rpb25zLmpzIiwic3JjL2NvcmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsie1xuICBcIm5hbWVcIjogXCJraXQtY29yZVwiLFxuICBcInZlcnNpb25cIjogXCIwLjAuMVwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiXCIsXG4gIFwibWFpblwiOiBcImluZGV4LmpzXCIsXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJidWlsZFwiOiBcInJvbGx1cCAtbSBpbmxpbmUgLWMgJiYgZWNobyBgZWNobyAkKGRhdGUgK1xcXCJbJUg6JU06JVNdXFxcIikgcmVidWlsdCAuL2luZGV4LmpzYFwiLFxuICAgIFwid2F0Y2hcIjogXCJ3YXRjaCAnbnBtIHJ1biBidWlsZCcgLi9zcmNcIixcbiAgICBcInRlc3RcIjogXCJub2RlIC4vdGVzdC90ZXN0LmpzXCIsXG4gICAgXCJ3YXRjaDp0ZXN0XCI6IFwid2F0Y2ggJ25wbSBydW4gYnVpbGQgJiYgbnBtIHJ1biB0ZXN0JyAuL3NyYyAuL3Rlc3RcIlxuICB9LFxuICBcImF1dGhvclwiOiBcIk1pa2sgUHJpc3RhdmthXCIsXG4gIFwibGljZW5zZVwiOiBcIklTQ1wiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJibHVlYmlyZFwiOiBcIl4zLjMuMVwiLFxuICAgIFwiaGlnaGxhbmRcIjogXCJeMi43LjFcIixcbiAgICBcImxvZGFzaFwiOiBcIl40LjUuMFwiLFxuICAgIFwibWltZS1kYlwiOiBcIl4xLjIyLjBcIixcbiAgICBcIm1pbWUtdHlwZVwiOiBcIl4zLjAuNFwiLFxuICAgIFwicmVxdWVzdFwiOiBcIl4yLjY5LjBcIixcbiAgICBcInZvb2dcIjogXCJnaXQraHR0cHM6Ly9naXRodWIuY29tL1Zvb2cvdm9vZy5qcy5naXRcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJiYWJlbC1jbGlcIjogXCJeNi41LjFcIixcbiAgICBcImJhYmVsLXByZXNldC1lczIwMTUtcm9sbHVwXCI6IFwiXjEuMS4xXCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWJhYmVsXCI6IFwiXjIuMy45XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcIndhdGNoXCI6IFwiXjAuMTcuMVwiXG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBsaXN0RmlsZXMgPSAoZm9sZGVyUGF0aCkgPT4ge1xuICByZXR1cm4gZnMucmVhZGRpclN5bmMoZm9sZGVyUGF0aCkuZmlsdGVyKFxuICAgIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgaXRlbVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgaXRlbSk7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGl0ZW1QYXRoKS5pc0ZpbGUoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBsaXN0Rm9sZGVycyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRGlyZWN0b3J5KCk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0RmlsZUNvbnRlbnRzID0gKGZpbGVQYXRoLCBvcHRpb25zKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsIG9wdGlvbnMpO1xufTtcblxuY29uc3QgZGVsZXRlRmlsZSA9IChmaWxlUGF0aCkgPT4ge1xuICByZXR1cm4gWydmcy51bmxpbmtTeW5jJywgZmlsZVBhdGhdO1xufTtcblxuY29uc3Qgd3JpdGVGaWxlID0gKGZpbGVQYXRoLCBkYXRhKSA9PiB7XG4gIHJldHVybiBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBkYXRhKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgbGlzdEZpbGVzLFxuICBsaXN0Rm9sZGVycyxcbiAgZGVsZXRlRmlsZSxcbiAgd3JpdGVGaWxlLFxuICBjd2Q6IHByb2Nlc3MuY3dkLFxuICBnZXRGaWxlQ29udGVudHNcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgQ09ORklHX0ZJTEVOQU1FID0gJy52b29nJztcblxuY29uc3QgSE9NRURJUiA9IHByb2Nlc3MuZW52LkhPTUU7XG5jb25zdCBMT0NBTERJUiA9IHByb2Nlc3MuY3dkKCk7XG5cbmNvbnN0IExPQ0FMX0NPTkZJRyA9IHBhdGguam9pbihMT0NBTERJUiwgQ09ORklHX0ZJTEVOQU1FKTtcbmNvbnN0IEdMT0JBTF9DT05GSUcgPSBwYXRoLmpvaW4oSE9NRURJUiwgQ09ORklHX0ZJTEVOQU1FKTtcblxuY29uc3Qgc2l0ZUJ5TmFtZSA9IChuYW1lLCBvcHRpb25zKSA9PiB7XG4gIHJldHVybiBzaXRlcygpLmZpbHRlcihmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuIHAubmFtZSA9PT0gbmFtZTtcbiAgfSlbMF07XG59O1xuXG5jb25zdCBzaXRlcyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiByZWFkKCdzaXRlcycsIG9wdGlvbnMpIHx8IHJlYWQoJ3Byb2plY3RzJywgb3B0aW9ucykgfHwgW107XG59O1xuXG5jb25zdCB3cml0ZSA9IChrZXksIHZhbHVlLCBvcHRpb25zKSA9PiB7XG4gIGxldCBwYXRoO1xuICBpZiAoIW9wdGlvbnMgfHwgKF8uaGFzKG9wdGlvbnMsICdnbG9iYWwnKSAmJiBvcHRpb25zLmdsb2JhbCA9PT0gdHJ1ZSkpIHtcbiAgICBwYXRoID0gR0xPQkFMX0NPTkZJRztcbiAgfSBlbHNlIHtcbiAgICBwYXRoID0gTE9DQUxfQ09ORklHO1xuICB9XG4gIGxldCBjb25maWcgPSByZWFkKG51bGwsIG9wdGlvbnMpIHx8IHt9O1xuICBjb25maWdba2V5XSA9IHZhbHVlO1xuXG4gIGxldCBmaWxlQ29udGVudHMgPSBKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDIpO1xuXG4gIGZzLndyaXRlRmlsZVN5bmMocGF0aCwgZmlsZUNvbnRlbnRzKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5jb25zdCByZWFkID0gKGtleSwgb3B0aW9ucykgPT4ge1xuICBsZXQgcGF0aDtcbiAgaWYgKCFvcHRpb25zIHx8IChfLmhhcyhvcHRpb25zLCAnZ2xvYmFsJykgJiYgb3B0aW9ucy5nbG9iYWwgPT09IHRydWUpKSB7XG4gICAgcGF0aCA9IEdMT0JBTF9DT05GSUc7XG4gIH0gZWxzZSB7XG4gICAgcGF0aCA9IExPQ0FMX0NPTkZJRztcbiAgfVxuXG4gIHRyeSB7XG4gICAgbGV0IGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKTtcbiAgICBsZXQgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcGFyc2VkRGF0YVtrZXldO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcGFyc2VkRGF0YTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbmNvbnN0IGRlbGV0ZUtleSA9IChrZXksIG9wdGlvbnMpID0+IHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgbGV0IHBhdGggPSBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ2dsb2JhbCcpICYmIG9wdGlvbnMuZ2xvYmFsID09PSB0cnVlKSB7XG4gICAgbGV0IHBhdGggPSBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2Uge1xuICAgIGxldCBwYXRoID0gTE9DQUxfQ09ORklHO1xuICB9XG5cbiAgbGV0IGNvbmZpZyA9IHJlYWQobnVsbCwgb3B0aW9ucyk7XG4gIGxldCBkZWxldGVkID0gZGVsZXRlIGNvbmZpZ1trZXldO1xuXG4gIGlmIChkZWxldGVkKSB7XG4gICAgbGV0IGZpbGVDb250ZW50cyA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLCBmaWxlQ29udGVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG5jb25zdCBpc1ByZXNlbnQgPSAoZ2xvYmFsKSA9PiB7XG4gIGlmIChnbG9iYWwpIHtcbiAgICBsZXQgcGF0aCA9IEdMT0JBTF9DT05GSUc7XG4gIH0gZWxzZSB7XG4gICAgbGV0IHBhdGggPSBMT0NBTF9DT05GSUc7XG4gIH1cbiAgcmV0dXJuIGZzLmV4aXN0c1N5bmMocGF0aCk7XG59O1xuXG5jb25zdCBoYXNLZXkgPSAoa2V5LCBvcHRpb25zKSA9PiB7XG4gIGxldCBjb25maWcgPSByZWFkKG51bGwsIG9wdGlvbnMpO1xuICByZXR1cm4gKHR5cGVvZiBjb25maWcgIT09ICd1bmRlZmluZWQnKSAmJiBjb25maWcuaGFzT3duUHJvcGVydHkoa2V5KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc2l0ZUJ5TmFtZSxcbiAgd3JpdGUsXG4gIHJlYWQsXG4gIGRlbGV0ZTogZGVsZXRlS2V5LFxuICBpc1ByZXNlbnQsXG4gIGhhc0tleSxcbiAgc2l0ZXNcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IG1pbWUgZnJvbSAnbWltZS10eXBlL3dpdGgtZGInO1xuXG5taW1lLmRlZmluZSgnYXBwbGljYXRpb24vdm5kLnZvb2cuZGVzaWduLmN1c3RvbStsaXF1aWQnLCB7ZXh0ZW5zaW9uczogWyd0cGwnXX0sIG1pbWUuZHVwT3ZlcndyaXRlKTtcblxuLy8gYnlOYW1lIDo6IHN0cmluZyAtPiBvYmplY3Q/XG5jb25zdCBieU5hbWUgPSAobmFtZSkgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVzKCkuZmlsdGVyKHNpdGUgPT4ge1xuICAgIHJldHVybiBzaXRlLm5hbWUgPT09IG5hbWUgfHwgc2l0ZS5ob3N0ID09PSBuYW1lO1xuICB9KVswXTtcbn07XG5cbi8vIGFkZCA6OiBvYmplY3QgLT4gYm9vbFxuY29uc3QgYWRkID0gKGRhdGEpID0+IHtcbiAgaWYgKF8uaGFzKGRhdGEsICdob3N0JykgJiYgXy5oYXMoZGF0YSwgJ3Rva2VuJykpIHtcbiAgICBsZXQgc2l0ZXMgPSBjb25maWcuc2l0ZXMoKTtcbiAgICBzaXRlcy5wdXNoKGRhdGEpO1xuICAgIGNvbmZpZy53cml0ZSgnc2l0ZXMnLCBzaXRlcyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xufTtcblxuLy8gcmVtb3ZlIDo6IHN0cmluZyAtPiBib29sXG5jb25zdCByZW1vdmUgPSAobmFtZSkgPT4ge1xuICBsZXQgc2l0ZXNJbkNvbmZpZyA9IGNvbmZpZy5zaXRlcygpO1xuICBsZXQgc2l0ZU5hbWVzID0gc2l0ZXNJbkNvbmZpZy5tYXAoc2l0ZSA9PiBzaXRlLm5hbWUgfHwgc2l0ZS5ob3N0KTtcbiAgbGV0IGlkeCA9IHNpdGVOYW1lcy5pbmRleE9mKG5hbWUpO1xuICBpZiAoaWR4IDwgMCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgbGV0IGZpbmFsU2l0ZXMgPSBzaXRlc0luQ29uZmlnLnNsaWNlKDAsIGlkeCkuY29uY2F0KHNpdGVzSW5Db25maWcuc2xpY2UoaWR4ICsgMSkpO1xuICByZXR1cm4gY29uZmlnLndyaXRlKCdzaXRlcycsIGZpbmFsU2l0ZXMpO1xufTtcblxuY29uc3QgZ2V0RmlsZUluZm8gPSAoZmlsZVBhdGgpID0+IHtcbiAgbGV0IHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlUGF0aCk7XG4gIGxldCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpO1xuICByZXR1cm4ge1xuICAgIGZpbGU6IGZpbGVOYW1lLFxuICAgIHNpemU6IHN0YXQuc2l6ZSxcbiAgICBjb250ZW50VHlwZTogbWltZS5sb29rdXAoZmlsZU5hbWUpLFxuICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgIHVwZGF0ZWRBdDogc3RhdC5tdGltZVxuICB9O1xufTtcblxuY29uc3QgdG90YWxGaWxlc0ZvciA9IChwcm9qZWN0TmFtZSkgPT4ge1xuICBsZXQgZmlsZXMgPSBmaWxlc0Zvcihwcm9qZWN0TmFtZSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyhmaWxlcykucmVkdWNlKCh0b3RhbCwgZm9sZGVyKSA9PiB0b3RhbCArIGZpbGVzW2ZvbGRlcl0ubGVuZ3RoLCAwKTtcbn07XG5cbi8vIGZpbGVzRm9yIDo6IHN0cmluZyAtPiBvYmplY3Q/XG5jb25zdCBmaWxlc0ZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBmb2xkZXJzID0gW1xuICAgICdhc3NldHMnLCAnY29tcG9uZW50cycsICdpbWFnZXMnLCAnamF2YXNjcmlwdHMnLCAnbGF5b3V0cycsICdzdHlsZXNoZWV0cydcbiAgXTtcblxuICBsZXQgd29ya2luZ0RpciA9IGRpckZvcihuYW1lKTtcblxuICBsZXQgcm9vdCA9IGZpbGVVdGlscy5saXN0Rm9sZGVycyh3b3JraW5nRGlyKTtcblxuICBpZiAocm9vdCkge1xuICAgIHJldHVybiBmb2xkZXJzLnJlZHVjZShmdW5jdGlvbihzdHJ1Y3R1cmUsIGZvbGRlcikge1xuICAgICAgaWYgKHJvb3QuaW5kZXhPZihmb2xkZXIpID49IDApIHtcbiAgICAgICAgbGV0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4od29ya2luZ0RpciwgZm9sZGVyKTtcbiAgICAgICAgc3RydWN0dXJlW2ZvbGRlcl0gPSBmaWxlVXRpbHMubGlzdEZpbGVzKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuICAgICAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgcmV0dXJuIHN0YXQuaXNGaWxlKCk7XG4gICAgICAgIH0pLm1hcChmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuXG4gICAgICAgICAgcmV0dXJuIGdldEZpbGVJbmZvKGZ1bGxQYXRoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RydWN0dXJlO1xuICAgIH0sIHt9KTtcbiAgfVxufTtcblxuLy8gZGlyRm9yIDo6IHN0cmluZyAtPiBzdHJpbmc/XG5jb25zdCBkaXJGb3IgPSAobmFtZSkgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lKTtcbiAgaWYgKHNpdGUpIHtcbiAgICByZXR1cm4gc2l0ZS5kaXIgfHwgc2l0ZS5wYXRoO1xuICB9XG59O1xuXG4vLyBob3N0Rm9yIDo6IHN0cmluZyAtPiBzdHJpbmc/XG5jb25zdCBob3N0Rm9yID0gKG5hbWUpID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSk7XG4gIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuaG9zdDtcbiAgfVxufTtcblxuLy8gdG9rZW5Gb3IgOjogc3RyaW5nIC0+IHN0cmluZz9cbmNvbnN0IHRva2VuRm9yID0gKG5hbWUpID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSk7XG4gIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUudG9rZW4gfHwgc2l0ZS5hcGlfdG9rZW47XG4gIH1cbn07XG5cbi8vIG5hbWVzIDo6ICogLT4gW3N0cmluZ11cbmNvbnN0IG5hbWVzID0gKCkgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVzKCkubWFwKGZ1bmN0aW9uKHNpdGUpIHtcbiAgICByZXR1cm4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdDtcbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGJ5TmFtZSxcbiAgYWRkLFxuICByZW1vdmUsXG4gIHRvdGFsRmlsZXNGb3IsXG4gIGZpbGVzRm9yLFxuICBkaXJGb3IsXG4gIGhvc3RGb3IsXG4gIHRva2VuRm9yLFxuICBuYW1lc1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBwcm9qZWN0cyBmcm9tICcuL3Byb2plY3RzJztcbmltcG9ydCBWb29nIGZyb20gJ3Zvb2cnO1xuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQcm9taXNlfSBmcm9tICdibHVlYmlyZCc7XG5cbmNvbnN0IExBWU9VVEZPTERFUlMgPSBbJ2NvbXBvbmVudHMnLCAnbGF5b3V0cyddO1xuY29uc3QgQVNTRVRGT0xERVJTID0gWydhc3NldHMnLCAnaW1hZ2VzJywgJ2phdmFzY3JpcHRzJywgJ3N0eWxlc2hlZXRzJ107XG5cbmNvbnN0IGNsaWVudEZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBob3N0ID0gcHJvamVjdHMuaG9zdEZvcihuYW1lKTtcbiAgbGV0IHRva2VuID0gcHJvamVjdHMudG9rZW5Gb3IobmFtZSk7XG4gIGlmIChob3N0ICYmIHRva2VuKSB7XG4gICAgcmV0dXJuIG5ldyBWb29nKGhvc3QsIHRva2VuKTtcbiAgfVxufTtcblxuY29uc3QgZ2V0TGF5b3V0Q29udGVudHMgPSAocHJvamVjdE5hbWUsIGlkKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHByb2plY3ROYW1lKS5sYXlvdXQoaWQsIHt9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpIH1cbiAgICAgIHJlc29sdmUoZGF0YS5ib2R5KTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRBc3NldENvbnRlbnRzID0gKHByb2plY3ROYW1lLCBpZCkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihwcm9qZWN0TmFtZSkubGF5b3V0QXNzZXQoaWQsIHt9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpIH1cbiAgICAgIGlmIChkYXRhLmVkaXRhYmxlKSB7XG4gICAgICAgIHJlc29sdmUoZGF0YS5kYXRhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoZGF0YS5wdWJsaWNfdXJsKTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dHMgPSAocHJvamVjdE5hbWUsIG9wdHM9e30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3IocHJvamVjdE5hbWUpLmxheW91dHMoT2JqZWN0LmFzc2lnbih7fSwge3Blcl9wYWdlOiAyNTB9LCBvcHRzKSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICByZXNvbHZlKGRhdGEpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dEFzc2V0cyA9IChwcm9qZWN0TmFtZSwgb3B0cz17fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihwcm9qZWN0TmFtZSkubGF5b3V0QXNzZXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0cyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycikgfVxuICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdWxsQWxsRmlsZXMgPSAocHJvamVjdE5hbWUpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgcHJvamVjdERpciA9IHByb2plY3RzLmRpckZvcihwcm9qZWN0TmFtZSk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHByb2plY3ROYW1lKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhwcm9qZWN0TmFtZSlcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShwcm9qZWN0TmFtZSwgZmlsZVBhdGgpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUocHJvamVjdE5hbWUsIGZpbGVQYXRoKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuXG4gICAgfSk7XG4gIH0pXG59O1xuXG5jb25zdCBwdXNoQWxsRmlsZXMgPSAocHJvamVjdE5hbWUpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgcHJvamVjdERpciA9IHByb2plY3RzLmRpckZvcihwcm9qZWN0TmFtZSk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHByb2plY3ROYW1lKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhwcm9qZWN0TmFtZSlcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShwcm9qZWN0TmFtZSwgZmlsZVBhdGgpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVzaEZpbGUocHJvamVjdE5hbWUsIGZpbGVQYXRoKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuY29uc3QgZmluZExheW91dE9yQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBjb21wb25lbnQsIHByb2plY3ROYW1lKSA9PiB7XG4gIGxldCBuYW1lID0gbm9ybWFsaXplVGl0bGUoZ2V0TGF5b3V0TmFtZUZyb21GaWxlbmFtZShmaWxlTmFtZSkpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJldHVybiBjbGllbnRGb3IocHJvamVjdE5hbWUpLmxheW91dHMoe1xuICAgICAgcGVyX3BhZ2U6IDI1MCxcbiAgICAgICdxLmxheW91dC5jb21wb25lbnQnOiBjb21wb25lbnQgfHwgZmFsc2VcbiAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpIH1cbiAgICAgIGxldCByZXQgPSBkYXRhLmZpbHRlcihsID0+IG5vcm1hbGl6ZVRpdGxlKGwudGl0bGUpID09IG5hbWUpO1xuICAgICAgaWYgKHJldC5sZW5ndGggPT09IDApIHsgcmVqZWN0KHVuZGVmaW5lZCkgfVxuICAgICAgcmVzb2x2ZShyZXRbMF0pO1xuICAgIH0pO1xuICB9KTtcbn1cblxuY29uc3QgZmluZExheW91dCA9IChmaWxlTmFtZSwgcHJvamVjdE5hbWUpID0+IHtcbiAgcmV0dXJuIGZpbmRMYXlvdXRPckNvbXBvbmVudChmaWxlTmFtZSwgZmFsc2UsIHByb2plY3ROYW1lKTtcbn07XG5cbmNvbnN0IGZpbmRDb21wb25lbnQgPSAoZmlsZU5hbWUsIHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBmaW5kTGF5b3V0T3JDb21wb25lbnQoZmlsZU5hbWUsIHRydWUsIHByb2plY3ROYW1lKTtcbn07XG5cbmNvbnN0IGZpbmRMYXlvdXRBc3NldCA9IChmaWxlTmFtZSwgcHJvamVjdE5hbWUpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHByb2plY3ROYW1lKS5sYXlvdXRBc3NldHMoe1xuICAgICAgcGVyX3BhZ2U6IDI1MCxcbiAgICAgICdxLmxheW91dF9hc3NldC5maWxlbmFtZSc6IGZpbGVOYW1lXG4gICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICByZXNvbHZlKGRhdGFbMF0pO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldEZpbGVOYW1lRnJvbVBhdGggPSAoZmlsZVBhdGgpID0+IHtcbiAgcmV0dXJuIGZpbGVQYXRoLnNwbGl0KCcvJylbMV07XG59O1xuXG5jb25zdCBnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lID0gKGZpbGVOYW1lKSA9PiB7XG4gIHJldHVybiBmaWxlTmFtZS5zcGxpdCgnLicpWzBdO1xufVxuXG5jb25zdCBmaW5kRmlsZSA9IChmaWxlUGF0aCwgcHJvamVjdE5hbWUpID0+IHtcbiAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlUGF0aCk7XG4gIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgIHJldHVybiBmaW5kTGF5b3V0T3JDb21wb25lbnQoZ2V0TGF5b3V0TmFtZUZyb21GaWxlbmFtZShnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVQYXRoKSksICh0eXBlID09ICdjb21wb25lbnQnKSwgcHJvamVjdE5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmaW5kTGF5b3V0QXNzZXQoZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCksIHByb2plY3ROYW1lKTtcbiAgfVxufTtcblxuY29uc3Qgbm9ybWFsaXplVGl0bGUgPSAodGl0bGUpID0+IHtcbiAgcmV0dXJuIHRpdGxlLnJlcGxhY2UoL1teXFx3XFwtXFwuXS9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aCA9IChwYXRoKSA9PiB7XG4gIGxldCBmb2xkZXIgPSBwYXRoLnNwbGl0KCcvJylbMF07XG4gIGxldCBmb2xkZXJUb1R5cGVNYXAgPSB7XG4gICAgJ2xheW91dHMnOiAnbGF5b3V0JyxcbiAgICAnY29tcG9uZW50cyc6ICdjb21wb25lbnQnLFxuICAgICdhc3NldHMnOiAnYXNzZXQnLFxuICAgICdpbWFnZXMnOiAnaW1hZ2UnLFxuICAgICdqYXZhc2NyaXB0cyc6ICdqYXZhc2NyaXB0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnc3R5bGVzaGVldCdcbiAgfTtcblxuICByZXR1cm4gZm9sZGVyVG9UeXBlTWFwW2ZvbGRlcl07XG59O1xuXG5jb25zdCBub3JtYWxpemVQYXRoID0gKHBhdGgsIHByb2plY3REaXIpID0+IHtcbiAgcmV0dXJuIHBhdGhcbiAgICAucmVwbGFjZShwcm9qZWN0RGlyLCAnJylcbiAgICAucmVwbGFjZSgvXlxcLy8sICcnKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChwcm9qZWN0TmFtZSwgZmlsZSwgZGVzdFBhdGgpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgaWYgKF8uaW5jbHVkZXMoT2JqZWN0LmtleXMoZmlsZSksICdsYXlvdXRfbmFtZScpKSB7XG4gICAgICAgIGdldExheW91dENvbnRlbnRzKHByb2plY3ROYW1lLCBmaWxlLmlkKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgICB0cnkgeyBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSkgfSBjYXRjaChlKSB7IGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZSB9IH07XG4gICAgICAgICAgZnMud3JpdGVGaWxlKGRlc3RQYXRoLCBjb250ZW50cywgKGVycikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZmFsc2UpIH1cbiAgICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICB9IGVsc2UgaWYgKGZpbGUuZWRpdGFibGUpIHtcbiAgICAgICAgZ2V0TGF5b3V0QXNzZXRDb250ZW50cyhwcm9qZWN0TmFtZSwgZmlsZS5pZCkudGhlbihjb250ZW50cyA9PiB7XG4gICAgICAgICAgdHJ5IHsgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShkZXN0UGF0aCkpIH0gY2F0Y2goZSkgeyBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGUgfSB9O1xuICAgICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGZhbHNlKSB9XG4gICAgICAgICAgICByZXNvbHZlKGZpbGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHVybCA9IGZpbGUucHVibGljX3VybDtcbiAgICAgICAgdHJ5IHsgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShkZXN0UGF0aCkpIH0gY2F0Y2goZSkgeyBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGUgfSB9O1xuICAgICAgICBsZXQgc3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdFBhdGgpO1xuICAgICAgICBpZiAodXJsICYmIHN0cmVhbSkge1xuICAgICAgICAgIGxldCByZXEgPSByZXF1ZXN0LmdldCh1cmwpLm9uKCdlcnJvcicsIChlcnIpID0+IHJlamVjdChmYWxzZSkpO1xuICAgICAgICAgIHJlcS5waXBlKHN0cmVhbSk7XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWplY3QoZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdCgpO1xuICAgIH1cbiAgfSlcbn07XG5cbmNvbnN0IHVwbG9hZEZpbGUgPSAocHJvamVjdE5hbWUsIGZpbGUsIGZpbGVQYXRoKSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3IocHJvamVjdE5hbWUpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGlmIChmaWxlKSB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhPYmplY3Qua2V5cyhmaWxlKSwgJ2xheW91dF9uYW1lJykpIHtcbiAgICAgICAgbGV0IGNvbnRlbnRzID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICBjbGllbnQudXBkYXRlTGF5b3V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBib2R5OiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGZpbGUpXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGxldCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dEFzc2V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBkYXRhOiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGZpbGUpXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KGZpbGUpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBwdWxsRmlsZSA9IChwcm9qZWN0TmFtZSwgZmlsZVBhdGgpID0+IHtcbiAgbGV0IHByb2plY3REaXIgPSBwcm9qZWN0cy5kaXJGb3IocHJvamVjdE5hbWUpO1xuXG4gIGxldCBub3JtYWxpemVkUGF0aCA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgsIHByb2plY3REaXIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZmluZEZpbGUobm9ybWFsaXplZFBhdGgsIHByb2plY3ROYW1lKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKCFmaWxlIHx8IHR5cGVvZiBmaWxlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZXNvbHZlKHdyaXRlRmlsZShwcm9qZWN0TmFtZSwgZmlsZSwgZmlsZVBhdGgpKTtcbiAgICB9KVxuICB9KTtcbn1cblxuY29uc3QgcHVzaEZpbGUgPSAocHJvamVjdE5hbWUsIGZpbGVQYXRoKSA9PiB7XG4gIGxldCBwcm9qZWN0RGlyID0gcHJvamVjdHMuZGlyRm9yKHByb2plY3ROYW1lKTtcbiAgbGV0IG5vcm1hbGl6ZWRQYXRoID0gbm9ybWFsaXplUGF0aChmaWxlUGF0aCwgcHJvamVjdERpcik7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBmaW5kRmlsZShub3JtYWxpemVkUGF0aCwgcHJvamVjdE5hbWUpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoIWZpbGUgfHwgdHlwZW9mIGZpbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZmlsZSk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHVwbG9hZEZpbGUocHJvamVjdE5hbWUsIGZpbGUsIGZpbGVQYXRoKSk7XG4gICAgfSlcbiAgfSk7XG59O1xuXG5jb25zdCBwdXNoQWxsID0gKHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBbJ3B1c2ggZXZlcnl0aGluZyddO1xufTtcblxuY29uc3QgYWRkID0gKHByb2plY3ROYW1lLCBmaWxlcykgPT4ge1xuICByZXR1cm4gWydhZGQgZmlsZXMnLCBmaWxlc107XG59O1xuXG5jb25zdCByZW1vdmUgPSAocHJvamVjdE5hbWUsIGZpbGVzKSA9PiB7XG4gIHJldHVybiBbJ3JlbW92ZSBmaWxlcycsIGZpbGVzXTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgY2xpZW50Rm9yLFxuICBwdWxsQWxsRmlsZXMsXG4gIHB1c2hBbGxGaWxlcyxcbiAgZmluZExheW91dCxcbiAgZmluZExheW91dEFzc2V0LFxuICBwdXNoRmlsZSxcbiAgcHVsbEZpbGVcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHt2ZXJzaW9ufSBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBwcm9qZWN0cyBmcm9tICcuL3Byb2plY3RzJztcbmltcG9ydCBhY3Rpb25zIGZyb20gJy4vYWN0aW9ucyc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZmlsZVV0aWxzLFxuICBjb25maWcsXG4gIHByb2plY3RzLFxuICBhY3Rpb25zLFxuICB2ZXJzaW9uLFxufTtcbiJdLCJuYW1lcyI6WyJfIiwiUHJvbWlzZSIsIndyaXRlRmlsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNLQSxJQUFNLFlBQVksU0FBWixTQUFZLENBQUMsVUFBRCxFQUFnQjtTQUN6QixHQUFHLFdBQUgsQ0FBZSxVQUFmLEVBQTJCLE1BQTNCLENBQ0wsVUFBUyxJQUFULEVBQWU7UUFDWCxXQUFXLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBc0IsSUFBdEIsQ0FBWCxDQURXO1dBRVIsR0FBRyxRQUFILENBQVksUUFBWixFQUFzQixNQUF0QixFQUFQLENBRmU7R0FBZixDQURGLENBRGdDO0NBQWhCOztBQVFsQixJQUFNLGNBQWMsU0FBZCxXQUFjLENBQUMsVUFBRCxFQUFnQjtTQUMzQixHQUFHLFdBQUgsQ0FBZSxVQUFmLEVBQTJCLE1BQTNCLENBQWtDLFVBQVMsSUFBVCxFQUFlO1FBQ2xELFdBQVcsS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixJQUF0QixDQUFYLENBRGtEO1dBRS9DLEdBQUcsUUFBSCxDQUFZLFFBQVosRUFB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