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

    // assets.filter(a => ['js', 'css'].indexOf(a.filename.split('.').reverse()[0]) >= 0)

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

var functions = {
  fn1: function fn1(foo, bar) {
    console.log(foo, bar);
  },
  fn2: function fn2(foo, bar) {
    console.log(foo, bar);
  }
};

var project = (function () {
  var o = {};

  Object.keys(functions).forEach(function (fn) {
    o[fn] = _$1.curry(functions[fn])('foo');
  });

  return Object.assign({}, o);
})

var core = Object.assign({}, functions, {
  fileUtils: fileUtils,
  config: config,
  projects: projects,
  actions: actions,
  version: version,
  project: project
});

module.exports = core;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9wcm9qZWN0cy5qcyIsInNyYy9hY3Rpb25zLmpzIiwic3JjL3Byb2plY3RfY29udGV4dC5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjFcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYnVpbGRcIjogXCJyb2xsdXAgLW0gaW5saW5lIC1jICYmIGVjaG8gYGVjaG8gJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpIHJlYnVpbHQgLi9pbmRleC5qc2BcIixcbiAgICBcIndhdGNoXCI6IFwid2F0Y2ggJ25wbSBydW4gYnVpbGQnIC4vc3JjXCIsXG4gICAgXCJ0ZXN0XCI6IFwibm9kZSAuL3Rlc3QvdGVzdC5qc1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIGJ1aWxkICYmIG5wbSBydW4gdGVzdCcgLi9zcmMgLi90ZXN0XCJcbiAgfSxcbiAgXCJhdXRob3JcIjogXCJNaWtrIFByaXN0YXZrYVwiLFxuICBcImxpY2Vuc2VcIjogXCJJU0NcIixcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmx1ZWJpcmRcIjogXCJeMy4zLjFcIixcbiAgICBcImhpZ2hsYW5kXCI6IFwiXjIuNy4xXCIsXG4gICAgXCJsb2Rhc2hcIjogXCJeNC41LjBcIixcbiAgICBcIm1pbWUtZGJcIjogXCJeMS4yMi4wXCIsXG4gICAgXCJtaW1lLXR5cGVcIjogXCJeMy4wLjRcIixcbiAgICBcInJlcXVlc3RcIjogXCJeMi42OS4wXCIsXG4gICAgXCJ2b29nXCI6IFwiZ2l0K2h0dHBzOi8vZ2l0aHViLmNvbS9Wb29nL3Zvb2cuanMuZ2l0XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmFiZWwtY2xpXCI6IFwiXjYuNS4xXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1LXJvbGx1cFwiOiBcIl4xLjEuMVwiLFxuICAgIFwicm9sbHVwXCI6IFwiXjAuMjUuNFwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1iYWJlbFwiOiBcIl4yLjMuOVwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1qc29uXCI6IFwiXjIuMC4wXCIsXG4gICAgXCJ3YXRjaFwiOiBcIl4wLjE3LjFcIlxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgbGlzdEZpbGVzID0gKGZvbGRlclBhdGgpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGZvbGRlclBhdGgpLmZpbHRlcihcbiAgICBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIGl0ZW1QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGl0ZW0pO1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhpdGVtUGF0aCkuaXNGaWxlKCk7XG4gIH0pO1xufTtcblxuY29uc3QgbGlzdEZvbGRlcnMgPSAoZm9sZGVyUGF0aCkgPT4ge1xuICByZXR1cm4gZnMucmVhZGRpclN5bmMoZm9sZGVyUGF0aCkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgaXRlbVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgaXRlbSk7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGl0ZW1QYXRoKS5pc0RpcmVjdG9yeSgpO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldEZpbGVDb250ZW50cyA9IChmaWxlUGF0aCwgb3B0aW9ucykgPT4ge1xuICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGRlbGV0ZUZpbGUgPSAoZmlsZVBhdGgpID0+IHtcbiAgcmV0dXJuIFsnZnMudW5saW5rU3luYycsIGZpbGVQYXRoXTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChmaWxlUGF0aCwgZGF0YSkgPT4ge1xuICByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGxpc3RGaWxlcyxcbiAgbGlzdEZvbGRlcnMsXG4gIGRlbGV0ZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY3dkOiBwcm9jZXNzLmN3ZCxcbiAgZ2V0RmlsZUNvbnRlbnRzXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IENPTkZJR19GSUxFTkFNRSA9ICcudm9vZyc7XG5cbmNvbnN0IEhPTUVESVIgPSBwcm9jZXNzLmVudi5IT01FO1xuY29uc3QgTE9DQUxESVIgPSBwcm9jZXNzLmN3ZCgpO1xuXG5jb25zdCBMT0NBTF9DT05GSUcgPSBwYXRoLmpvaW4oTE9DQUxESVIsIENPTkZJR19GSUxFTkFNRSk7XG5jb25zdCBHTE9CQUxfQ09ORklHID0gcGF0aC5qb2luKEhPTUVESVIsIENPTkZJR19GSUxFTkFNRSk7XG5cbmNvbnN0IHNpdGVCeU5hbWUgPSAobmFtZSwgb3B0aW9ucykgPT4ge1xuICByZXR1cm4gc2l0ZXMoKS5maWx0ZXIoZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiBwLm5hbWUgPT09IG5hbWU7XG4gIH0pWzBdO1xufTtcblxuY29uc3Qgc2l0ZXMgPSAob3B0aW9ucykgPT4ge1xuICByZXR1cm4gcmVhZCgnc2l0ZXMnLCBvcHRpb25zKSB8fCByZWFkKCdwcm9qZWN0cycsIG9wdGlvbnMpIHx8IFtdO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoa2V5LCB2YWx1ZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgcGF0aDtcbiAgaWYgKCFvcHRpb25zIHx8IChfLmhhcyhvcHRpb25zLCAnZ2xvYmFsJykgJiYgb3B0aW9ucy5nbG9iYWwgPT09IHRydWUpKSB7XG4gICAgcGF0aCA9IEdMT0JBTF9DT05GSUc7XG4gIH0gZWxzZSB7XG4gICAgcGF0aCA9IExPQ0FMX0NPTkZJRztcbiAgfVxuICBsZXQgY29uZmlnID0gcmVhZChudWxsLCBvcHRpb25zKSB8fCB7fTtcbiAgY29uZmlnW2tleV0gPSB2YWx1ZTtcblxuICBsZXQgZmlsZUNvbnRlbnRzID0gSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKTtcblxuICBmcy53cml0ZUZpbGVTeW5jKHBhdGgsIGZpbGVDb250ZW50cyk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuY29uc3QgcmVhZCA9IChrZXksIG9wdGlvbnMpID0+IHtcbiAgbGV0IHBhdGg7XG4gIGlmICghb3B0aW9ucyB8fCAoXy5oYXMob3B0aW9ucywgJ2dsb2JhbCcpICYmIG9wdGlvbnMuZ2xvYmFsID09PSB0cnVlKSkge1xuICAgIHBhdGggPSBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2Uge1xuICAgIHBhdGggPSBMT0NBTF9DT05GSUc7XG4gIH1cblxuICB0cnkge1xuICAgIGxldCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4Jyk7XG4gICAgbGV0IHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHBhcnNlZERhdGFba2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhcnNlZERhdGE7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG5jb25zdCBkZWxldGVLZXkgPSAoa2V5LCBvcHRpb25zKSA9PiB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIGxldCBwYXRoID0gR0xPQkFMX0NPTkZJRztcbiAgfSBlbHNlIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KCdnbG9iYWwnKSAmJiBvcHRpb25zLmdsb2JhbCA9PT0gdHJ1ZSkge1xuICAgIGxldCBwYXRoID0gR0xPQkFMX0NPTkZJRztcbiAgfSBlbHNlIHtcbiAgICBsZXQgcGF0aCA9IExPQ0FMX0NPTkZJRztcbiAgfVxuXG4gIGxldCBjb25maWcgPSByZWFkKG51bGwsIG9wdGlvbnMpO1xuICBsZXQgZGVsZXRlZCA9IGRlbGV0ZSBjb25maWdba2V5XTtcblxuICBpZiAoZGVsZXRlZCkge1xuICAgIGxldCBmaWxlQ29udGVudHMgPSBKU09OLnN0cmluZ2lmeShjb25maWcpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aCwgZmlsZUNvbnRlbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZWxldGVkO1xufTtcblxuY29uc3QgaXNQcmVzZW50ID0gKGdsb2JhbCkgPT4ge1xuICBpZiAoZ2xvYmFsKSB7XG4gICAgbGV0IHBhdGggPSBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2Uge1xuICAgIGxldCBwYXRoID0gTE9DQUxfQ09ORklHO1xuICB9XG4gIHJldHVybiBmcy5leGlzdHNTeW5jKHBhdGgpO1xufTtcblxuY29uc3QgaGFzS2V5ID0gKGtleSwgb3B0aW9ucykgPT4ge1xuICBsZXQgY29uZmlnID0gcmVhZChudWxsLCBvcHRpb25zKTtcbiAgcmV0dXJuICh0eXBlb2YgY29uZmlnICE9PSAndW5kZWZpbmVkJykgJiYgY29uZmlnLmhhc093blByb3BlcnR5KGtleSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHNpdGVCeU5hbWUsXG4gIHdyaXRlLFxuICByZWFkLFxuICBkZWxldGU6IGRlbGV0ZUtleSxcbiAgaXNQcmVzZW50LFxuICBoYXNLZXksXG4gIHNpdGVzXG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBtaW1lIGZyb20gJ21pbWUtdHlwZS93aXRoLWRiJztcblxubWltZS5kZWZpbmUoJ2FwcGxpY2F0aW9uL3ZuZC52b29nLmRlc2lnbi5jdXN0b20rbGlxdWlkJywge2V4dGVuc2lvbnM6IFsndHBsJ119LCBtaW1lLmR1cE92ZXJ3cml0ZSk7XG5cbi8vIGJ5TmFtZSA6OiBzdHJpbmcgLT4gb2JqZWN0P1xuY29uc3QgYnlOYW1lID0gKG5hbWUpID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlcygpLmZpbHRlcihzaXRlID0+IHtcbiAgICByZXR1cm4gc2l0ZS5uYW1lID09PSBuYW1lIHx8IHNpdGUuaG9zdCA9PT0gbmFtZTtcbiAgfSlbMF07XG59O1xuXG4vLyBhZGQgOjogb2JqZWN0IC0+IGJvb2xcbmNvbnN0IGFkZCA9IChkYXRhKSA9PiB7XG4gIGlmIChfLmhhcyhkYXRhLCAnaG9zdCcpICYmIF8uaGFzKGRhdGEsICd0b2tlbicpKSB7XG4gICAgbGV0IHNpdGVzID0gY29uZmlnLnNpdGVzKCk7XG4gICAgc2l0ZXMucHVzaChkYXRhKTtcbiAgICBjb25maWcud3JpdGUoJ3NpdGVzJywgc2l0ZXMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbn07XG5cbi8vIHJlbW92ZSA6OiBzdHJpbmcgLT4gYm9vbFxuY29uc3QgcmVtb3ZlID0gKG5hbWUpID0+IHtcbiAgbGV0IHNpdGVzSW5Db25maWcgPSBjb25maWcuc2l0ZXMoKTtcbiAgbGV0IHNpdGVOYW1lcyA9IHNpdGVzSW5Db25maWcubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG4gIGxldCBpZHggPSBzaXRlTmFtZXMuaW5kZXhPZihuYW1lKTtcbiAgaWYgKGlkeCA8IDApIHsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBmaW5hbFNpdGVzID0gc2l0ZXNJbkNvbmZpZy5zbGljZSgwLCBpZHgpLmNvbmNhdChzaXRlc0luQ29uZmlnLnNsaWNlKGlkeCArIDEpKTtcbiAgcmV0dXJuIGNvbmZpZy53cml0ZSgnc2l0ZXMnLCBmaW5hbFNpdGVzKTtcbn07XG5cbmNvbnN0IGdldEZpbGVJbmZvID0gKGZpbGVQYXRoKSA9PiB7XG4gIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZVBhdGgpO1xuICBsZXQgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKTtcbiAgcmV0dXJuIHtcbiAgICBmaWxlOiBmaWxlTmFtZSxcbiAgICBzaXplOiBzdGF0LnNpemUsXG4gICAgY29udGVudFR5cGU6IG1pbWUubG9va3VwKGZpbGVOYW1lKSxcbiAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICB1cGRhdGVkQXQ6IHN0YXQubXRpbWVcbiAgfTtcbn07XG5cbmNvbnN0IHRvdGFsRmlsZXNGb3IgPSAocHJvamVjdE5hbWUpID0+IHtcbiAgbGV0IGZpbGVzID0gZmlsZXNGb3IocHJvamVjdE5hbWUpO1xuICByZXR1cm4gT2JqZWN0LmtleXMoZmlsZXMpLnJlZHVjZSgodG90YWwsIGZvbGRlcikgPT4gdG90YWwgKyBmaWxlc1tmb2xkZXJdLmxlbmd0aCwgMCk7XG59O1xuXG4vLyBmaWxlc0ZvciA6OiBzdHJpbmcgLT4gb2JqZWN0P1xuY29uc3QgZmlsZXNGb3IgPSAobmFtZSkgPT4ge1xuICBsZXQgZm9sZGVycyA9IFtcbiAgICAnYXNzZXRzJywgJ2NvbXBvbmVudHMnLCAnaW1hZ2VzJywgJ2phdmFzY3JpcHRzJywgJ2xheW91dHMnLCAnc3R5bGVzaGVldHMnXG4gIF07XG5cbiAgbGV0IHdvcmtpbmdEaXIgPSBkaXJGb3IobmFtZSk7XG5cbiAgbGV0IHJvb3QgPSBmaWxlVXRpbHMubGlzdEZvbGRlcnMod29ya2luZ0Rpcik7XG5cbiAgaWYgKHJvb3QpIHtcbiAgICByZXR1cm4gZm9sZGVycy5yZWR1Y2UoZnVuY3Rpb24oc3RydWN0dXJlLCBmb2xkZXIpIHtcbiAgICAgIGlmIChyb290LmluZGV4T2YoZm9sZGVyKSA+PSAwKSB7XG4gICAgICAgIGxldCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHdvcmtpbmdEaXIsIGZvbGRlcik7XG4gICAgICAgIHN0cnVjdHVyZVtmb2xkZXJdID0gZmlsZVV0aWxzLmxpc3RGaWxlcyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlKTtcbiAgICAgICAgICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcblxuICAgICAgICAgIHJldHVybiBzdGF0LmlzRmlsZSgpO1xuICAgICAgICB9KS5tYXAoZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlKTtcblxuICAgICAgICAgIHJldHVybiBnZXRGaWxlSW5mbyhmdWxsUGF0aCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cnVjdHVyZTtcbiAgICB9LCB7fSk7XG4gIH1cbn07XG5cbi8vIGRpckZvciA6OiBzdHJpbmcgLT4gc3RyaW5nP1xuY29uc3QgZGlyRm9yID0gKG5hbWUpID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSk7XG4gIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuZGlyIHx8IHNpdGUucGF0aDtcbiAgfVxufTtcblxuLy8gaG9zdEZvciA6OiBzdHJpbmcgLT4gc3RyaW5nP1xuY29uc3QgaG9zdEZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUpO1xuICBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLmhvc3Q7XG4gIH1cbn07XG5cbi8vIHRva2VuRm9yIDo6IHN0cmluZyAtPiBzdHJpbmc/XG5jb25zdCB0b2tlbkZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUpO1xuICBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLnRva2VuIHx8IHNpdGUuYXBpX3Rva2VuO1xuICB9XG59O1xuXG4vLyBuYW1lcyA6OiAqIC0+IFtzdHJpbmddXG5jb25zdCBuYW1lcyA9ICgpID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlcygpLm1hcChmdW5jdGlvbihzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUubmFtZSB8fCBzaXRlLmhvc3Q7XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBieU5hbWUsXG4gIGFkZCxcbiAgcmVtb3ZlLFxuICB0b3RhbEZpbGVzRm9yLFxuICBmaWxlc0ZvcixcbiAgZGlyRm9yLFxuICBob3N0Rm9yLFxuICB0b2tlbkZvcixcbiAgbmFtZXNcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgcHJvamVjdHMgZnJvbSAnLi9wcm9qZWN0cyc7XG5pbXBvcnQgVm9vZyBmcm9tICd2b29nJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UHJvbWlzZX0gZnJvbSAnYmx1ZWJpcmQnO1xuXG5jb25zdCBMQVlPVVRGT0xERVJTID0gWydjb21wb25lbnRzJywgJ2xheW91dHMnXTtcbmNvbnN0IEFTU0VURk9MREVSUyA9IFsnYXNzZXRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdzdHlsZXNoZWV0cyddO1xuXG5jb25zdCBjbGllbnRGb3IgPSAobmFtZSkgPT4ge1xuICBsZXQgaG9zdCA9IHByb2plY3RzLmhvc3RGb3IobmFtZSk7XG4gIGxldCB0b2tlbiA9IHByb2plY3RzLnRva2VuRm9yKG5hbWUpO1xuICBpZiAoaG9zdCAmJiB0b2tlbikge1xuICAgIHJldHVybiBuZXcgVm9vZyhob3N0LCB0b2tlbik7XG4gIH1cbn07XG5cbmNvbnN0IGdldExheW91dENvbnRlbnRzID0gKHByb2plY3ROYW1lLCBpZCkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihwcm9qZWN0TmFtZSkubGF5b3V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICByZXNvbHZlKGRhdGEuYm9keSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRDb250ZW50cyA9IChwcm9qZWN0TmFtZSwgaWQpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3IocHJvamVjdE5hbWUpLmxheW91dEFzc2V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICBpZiAoZGF0YS5lZGl0YWJsZSkge1xuICAgICAgICByZXNvbHZlKGRhdGEuZGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKGRhdGEucHVibGljX3VybCk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRzID0gKHByb2plY3ROYW1lLCBvcHRzPXt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHByb2plY3ROYW1lKS5sYXlvdXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0cyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycikgfVxuICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRBc3NldHMgPSAocHJvamVjdE5hbWUsIG9wdHM9e30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3IocHJvamVjdE5hbWUpLmxheW91dEFzc2V0cyhPYmplY3QuYXNzaWduKHt9LCB7cGVyX3BhZ2U6IDI1MH0sIG9wdHMpLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpIH1cbiAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHByb2plY3REaXIgPSBwcm9qZWN0cy5kaXJGb3IocHJvamVjdE5hbWUpO1xuXG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgZ2V0TGF5b3V0cyhwcm9qZWN0TmFtZSksXG4gICAgICBnZXRMYXlvdXRBc3NldHMocHJvamVjdE5hbWUpXG4gICAgXSkudGhlbigoW2xheW91dHMsIGFzc2V0c10pID0+IHtcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgbGF5b3V0cy5tYXAobCA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIGAke2wuY29tcG9uZW50ID8gJ2NvbXBvbmVudHMnIDogJ2xheW91dHMnfS8ke25vcm1hbGl6ZVRpdGxlKGwudGl0bGUpfS50cGxgKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUocHJvamVjdE5hbWUsIGZpbGVQYXRoKTtcbiAgICAgICAgfSkuY29uY2F0KGFzc2V0cy5tYXAoYSA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgYS5hc3NldF90eXBlKSA/IGEuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2EuZmlsZW5hbWV9YCk7XG4gICAgICAgICAgcmV0dXJuIHB1bGxGaWxlKHByb2plY3ROYW1lLCBmaWxlUGF0aCk7XG4gICAgICAgIH0pKVxuICAgICAgXSkudGhlbihyZXNvbHZlKTtcblxuICAgIH0pO1xuICB9KVxufTtcblxuY29uc3QgcHVzaEFsbEZpbGVzID0gKHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHByb2plY3REaXIgPSBwcm9qZWN0cy5kaXJGb3IocHJvamVjdE5hbWUpO1xuXG4gICAgLy8gYXNzZXRzLmZpbHRlcihhID0+IFsnanMnLCAnY3NzJ10uaW5kZXhPZihhLmZpbGVuYW1lLnNwbGl0KCcuJykucmV2ZXJzZSgpWzBdKSA+PSAwKVxuXG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgZ2V0TGF5b3V0cyhwcm9qZWN0TmFtZSksXG4gICAgICBnZXRMYXlvdXRBc3NldHMocHJvamVjdE5hbWUpXG4gICAgXSkudGhlbigoW2xheW91dHMsIGFzc2V0c10pID0+IHtcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgbGF5b3V0cy5tYXAobCA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIGAke2wuY29tcG9uZW50ID8gJ2NvbXBvbmVudHMnIDogJ2xheW91dHMnfS8ke25vcm1hbGl6ZVRpdGxlKGwudGl0bGUpfS50cGxgKTtcbiAgICAgICAgICByZXR1cm4gcHVzaEZpbGUocHJvamVjdE5hbWUsIGZpbGVQYXRoKTtcbiAgICAgICAgfSkuY29uY2F0KGFzc2V0cy5tYXAoYSA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgYS5hc3NldF90eXBlKSA/IGEuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2EuZmlsZW5hbWV9YCk7XG4gICAgICAgICAgcmV0dXJuIHB1c2hGaWxlKHByb2plY3ROYW1lLCBmaWxlUGF0aCk7XG4gICAgICAgIH0pKVxuICAgICAgXSkudGhlbihyZXNvbHZlKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmNvbnN0IGZpbmRMYXlvdXRPckNvbXBvbmVudCA9IChmaWxlTmFtZSwgY29tcG9uZW50LCBwcm9qZWN0TmFtZSkgPT4ge1xuICBsZXQgbmFtZSA9IG5vcm1hbGl6ZVRpdGxlKGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHByb2plY3ROYW1lKS5sYXlvdXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXQuY29tcG9uZW50JzogY29tcG9uZW50IHx8IGZhbHNlXG4gICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICBsZXQgcmV0ID0gZGF0YS5maWx0ZXIobCA9PiBub3JtYWxpemVUaXRsZShsLnRpdGxlKSA9PSBuYW1lKTtcbiAgICAgIGlmIChyZXQubGVuZ3RoID09PSAwKSB7IHJlamVjdCh1bmRlZmluZWQpIH1cbiAgICAgIHJlc29sdmUocmV0WzBdKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmNvbnN0IGZpbmRMYXlvdXQgPSAoZmlsZU5hbWUsIHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBmaW5kTGF5b3V0T3JDb21wb25lbnQoZmlsZU5hbWUsIGZhbHNlLCBwcm9qZWN0TmFtZSk7XG59O1xuXG5jb25zdCBmaW5kQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBwcm9qZWN0TmFtZSkgPT4ge1xuICByZXR1cm4gZmluZExheW91dE9yQ29tcG9uZW50KGZpbGVOYW1lLCB0cnVlLCBwcm9qZWN0TmFtZSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0QXNzZXQgPSAoZmlsZU5hbWUsIHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihwcm9qZWN0TmFtZSkubGF5b3V0QXNzZXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXRfYXNzZXQuZmlsZW5hbWUnOiBmaWxlTmFtZVxuICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycikgfVxuICAgICAgcmVzb2x2ZShkYXRhWzBdKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlTmFtZUZyb21QYXRoID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmaWxlUGF0aC5zcGxpdCgnLycpWzFdO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0TmFtZUZyb21GaWxlbmFtZSA9IChmaWxlTmFtZSkgPT4ge1xuICByZXR1cm4gZmlsZU5hbWUuc3BsaXQoJy4nKVswXTtcbn1cblxuY29uc3QgZmluZEZpbGUgPSAoZmlsZVBhdGgsIHByb2plY3ROYW1lKSA9PiB7XG4gIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICByZXR1cm4gZmluZExheW91dE9yQ29tcG9uZW50KGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUoZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCkpLCAodHlwZSA9PSAnY29tcG9uZW50JyksIHByb2plY3ROYW1lKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmluZExheW91dEFzc2V0KGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZVBhdGgpLCBwcm9qZWN0TmFtZSk7XG4gIH1cbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVRpdGxlID0gKHRpdGxlKSA9PiB7XG4gIHJldHVybiB0aXRsZS5yZXBsYWNlKC9bXlxcd1xcLVxcLl0vZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xufTtcblxuY29uc3QgZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGggPSAocGF0aCkgPT4ge1xuICBsZXQgZm9sZGVyID0gcGF0aC5zcGxpdCgnLycpWzBdO1xuICBsZXQgZm9sZGVyVG9UeXBlTWFwID0ge1xuICAgICdsYXlvdXRzJzogJ2xheW91dCcsXG4gICAgJ2NvbXBvbmVudHMnOiAnY29tcG9uZW50JyxcbiAgICAnYXNzZXRzJzogJ2Fzc2V0JyxcbiAgICAnaW1hZ2VzJzogJ2ltYWdlJyxcbiAgICAnamF2YXNjcmlwdHMnOiAnamF2YXNjcmlwdCcsXG4gICAgJ3N0eWxlc2hlZXRzJzogJ3N0eWxlc2hlZXQnXG4gIH07XG5cbiAgcmV0dXJuIGZvbGRlclRvVHlwZU1hcFtmb2xkZXJdO1xufTtcblxuY29uc3Qgbm9ybWFsaXplUGF0aCA9IChwYXRoLCBwcm9qZWN0RGlyKSA9PiB7XG4gIHJldHVybiBwYXRoXG4gICAgLnJlcGxhY2UocHJvamVjdERpciwgJycpXG4gICAgLnJlcGxhY2UoL15cXC8vLCAnJyk7XG59O1xuXG5jb25zdCB3cml0ZUZpbGUgPSAocHJvamVjdE5hbWUsIGZpbGUsIGRlc3RQYXRoKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKE9iamVjdC5rZXlzKGZpbGUpLCAnbGF5b3V0X25hbWUnKSkge1xuICAgICAgICBnZXRMYXlvdXRDb250ZW50cyhwcm9qZWN0TmFtZSwgZmlsZS5pZCkudGhlbihjb250ZW50cyA9PiB7XG4gICAgICAgICAgdHJ5IHsgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShkZXN0UGF0aCkpIH0gY2F0Y2goZSkgeyBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGUgfSB9O1xuICAgICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGZhbHNlKSB9XG4gICAgICAgICAgICByZXNvbHZlKGZpbGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGdldExheW91dEFzc2V0Q29udGVudHMocHJvamVjdE5hbWUsIGZpbGUuaWQpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgICAgIHRyeSB7IGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKSB9IGNhdGNoKGUpIHsgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlIH0gfTtcbiAgICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChmYWxzZSkgfVxuICAgICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCB1cmwgPSBmaWxlLnB1YmxpY191cmw7XG4gICAgICAgIHRyeSB7IGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKSB9IGNhdGNoKGUpIHsgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlIH0gfTtcbiAgICAgICAgbGV0IHN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRlc3RQYXRoKTtcbiAgICAgICAgaWYgKHVybCAmJiBzdHJlYW0pIHtcbiAgICAgICAgICBsZXQgcmVxID0gcmVxdWVzdC5nZXQodXJsKS5vbignZXJyb3InLCAoZXJyKSA9PiByZWplY3QoZmFsc2UpKTtcbiAgICAgICAgICByZXEucGlwZShzdHJlYW0pO1xuICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVqZWN0KGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZWplY3QoKTtcbiAgICB9XG4gIH0pXG59O1xuXG5jb25zdCB1cGxvYWRGaWxlID0gKHByb2plY3ROYW1lLCBmaWxlLCBmaWxlUGF0aCkgPT4ge1xuICBsZXQgY2xpZW50ID0gY2xpZW50Rm9yKHByb2plY3ROYW1lKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgaWYgKF8uaW5jbHVkZXMoT2JqZWN0LmtleXMoZmlsZSksICdsYXlvdXRfbmFtZScpKSB7XG4gICAgICAgIGxldCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dChmaWxlLmlkLCB7XG4gICAgICAgICAgYm9keTogY29udGVudHNcbiAgICAgICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShmaWxlKVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5lZGl0YWJsZSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXRBc3NldChmaWxlLmlkLCB7XG4gICAgICAgICAgZGF0YTogY29udGVudHNcbiAgICAgICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShmaWxlKVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdChmaWxlKTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEZpbGUgPSAocHJvamVjdE5hbWUsIGZpbGVQYXRoKSA9PiB7XG4gIGxldCBwcm9qZWN0RGlyID0gcHJvamVjdHMuZGlyRm9yKHByb2plY3ROYW1lKTtcblxuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBwcm9qZWN0RGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBwcm9qZWN0TmFtZSkudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVzb2x2ZSh3cml0ZUZpbGUocHJvamVjdE5hbWUsIGZpbGUsIGZpbGVQYXRoKSk7XG4gICAgfSlcbiAgfSk7XG59XG5cbmNvbnN0IHB1c2hGaWxlID0gKHByb2plY3ROYW1lLCBmaWxlUGF0aCkgPT4ge1xuICBsZXQgcHJvamVjdERpciA9IHByb2plY3RzLmRpckZvcihwcm9qZWN0TmFtZSk7XG4gIGxldCBub3JtYWxpemVkUGF0aCA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgsIHByb2plY3REaXIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZmluZEZpbGUobm9ybWFsaXplZFBhdGgsIHByb2plY3ROYW1lKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKCFmaWxlIHx8IHR5cGVvZiBmaWxlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGZpbGUpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZSh1cGxvYWRGaWxlKHByb2plY3ROYW1lLCBmaWxlLCBmaWxlUGF0aCkpO1xuICAgIH0pXG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEFsbCA9IChwcm9qZWN0TmFtZSkgPT4ge1xuICByZXR1cm4gWydwdXNoIGV2ZXJ5dGhpbmcnXTtcbn07XG5cbmNvbnN0IGFkZCA9IChwcm9qZWN0TmFtZSwgZmlsZXMpID0+IHtcbiAgcmV0dXJuIFsnYWRkIGZpbGVzJywgZmlsZXNdO1xufTtcblxuY29uc3QgcmVtb3ZlID0gKHByb2plY3ROYW1lLCBmaWxlcykgPT4ge1xuICByZXR1cm4gWydyZW1vdmUgZmlsZXMnLCBmaWxlc107XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGNsaWVudEZvcixcbiAgcHVsbEFsbEZpbGVzLFxuICBwdXNoQWxsRmlsZXMsXG4gIGZpbmRMYXlvdXQsXG4gIGZpbmRMYXlvdXRBc3NldCxcbiAgcHVzaEZpbGUsXG4gIHB1bGxGaWxlXG59O1xuXG4iLCJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG5leHBvcnQgbGV0IGZ1bmN0aW9ucyA9IHtcbiAgZm4xOiAoZm9vLCBiYXIpID0+IHtjb25zb2xlLmxvZyhmb28sIGJhcil9LCBcbiAgZm4yOiAoZm9vLCBiYXIpID0+IHtjb25zb2xlLmxvZyhmb28sIGJhcil9XG59O1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIHZhciBvID0ge307XG4gIFxuICBPYmplY3Qua2V5cyhmdW5jdGlvbnMpLmZvckVhY2goZm4gPT4ge1xuICAgIG9bZm5dID0gXy5jdXJyeShmdW5jdGlvbnNbZm5dKSgnZm9vJylcbiAgfSk7XG4gIFxuICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgbyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQge3ZlcnNpb259IGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHByb2plY3RzIGZyb20gJy4vcHJvamVjdHMnO1xuaW1wb3J0IGFjdGlvbnMgZnJvbSAnLi9hY3Rpb25zJztcblxuaW1wb3J0IHtkZWZhdWx0IGFzIHByb2plY3R9IGZyb20gJy4vcHJvamVjdF9jb250ZXh0JztcbmltcG9ydCB7ZnVuY3Rpb25zIGFzIHNjb3BlZEZ1bmN0aW9uc30gZnJvbSAnLi9wcm9qZWN0X2NvbnRleHQnO1xuXG5leHBvcnQgZGVmYXVsdCBPYmplY3QuYXNzaWduKHt9LFxuICBzY29wZWRGdW5jdGlvbnMsIHtcbiAgZmlsZVV0aWxzLFxuICBjb25maWcsXG4gIHByb2plY3RzLFxuICBhY3Rpb25zLFxuICB2ZXJzaW9uLFxuICBwcm9qZWN0XG59KTtcbiJdLCJuYW1lcyI6WyJfIiwiUHJvbWlzZSIsIndyaXRlRmlsZSIsInNjb3BlZEZ1bmN0aW9ucyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNLQSxJQUFNLFlBQVksU0FBWixTQUFZLENBQUMsVUFBRCxFQUFnQjtTQUN6QixHQUFHLFdBQUgsQ0FBZSxVQUFmLEVBQTJCLE1BQTNCLENBQ0wsVUFBUyxJQUFULEVBQWU7UUFDWCxXQUFXLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBc0IsSUFBdEIsQ0FBWCxDQURXO1dBRVIsR0FBRyxRQUFILENBQVksUUFBWixFQUFzQixNQUF0QixFQUFQLENBRmU7R0FBZixDQURGLENBRGdDO0NBQWhCOztBQVFsQixJQUFNLGNBQWMsU0FBZCxXQUFjLENBQUMsVUFBRCxFQUFnQjtTQUMzQixHQUFHLFdBQUgsQ0FBZSxVQUFmLEVBQTJCLE1BQTNCLENBQWtDLFVBQVMsSUFBVCxFQUFlO1FBQ2xELFdBQVcsS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixJQUF0QixDQUFYLENBRGtEO1dBRS9DLEdBQUcsUUFBSCxDQUFZLFFBQVosRUFBc0IsV0FBdEIsRUFBUCxDQUZzRDtHQUFmLENBQXpDLENBRGtDO0NBQWhCOztBQU9wQixJQUFNLGtCQUFrQixTQUFsQixlQUFrQixDQUFDLFFBQUQsRUFBVyxPQUFYLEVBQXVCO1NBQ3RDLEdBQUcsWUFBSCxDQUFnQixRQUFoQixFQUEwQixPQUExQixDQUFQLENBRDZDO0NBQXZCOztBQUl4QixJQUFNLGFBQWEsU0FBYixVQUFhLENBQUMsUUFBRCxFQUFjO1NBQ3hCLENBQUMsZUFBRCxFQUFrQixRQUFsQixDQUFQLENBRCtCO0NBQWQ7O0FBSW5CLElBQU0sWUFBWSxT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