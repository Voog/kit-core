'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));
var _ = _interopDefault(require('lodash'));
var util = require('util');
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

var version = "0.0.3";

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

function CustomError(message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.extra = extra;
};

util.inherits(CustomError, Error);

var CONFIG_FILENAME = '.voog';

var HOMEDIR = process.env.HOME;
var LOCALDIR = process.cwd();

var LOCAL_CONFIG = path.join(LOCALDIR, CONFIG_FILENAME);
var GLOBAL_CONFIG = path.join(HOMEDIR, CONFIG_FILENAME);

var siteByName = function siteByName(name, options) {
  return _.head(sites(options).filter(function (p) {
    return p.name === name;
  }));
};

var sites = function sites(options) {
  return read('sites', options) || [];
};

var write = function write(key, value, options) {
  var filePath = configPathFromOptions(options);

  var config = read(null, options) || {};
  config[key] = value;

  var fileContents = JSON.stringify(config, null, 2);

  fs.writeFileSync(filePath, fileContents);
  return true;
};

var read = function read(key, options) {
  var filePath = configPathFromOptions(options);

  var data = fs.readFileSync(filePath, 'utf8');
  var parsedData = JSON.parse(data);

  if (typeof key === 'string') {
    return parsedData[key];
  } else {
    return parsedData;
  }
};

var configPathFromOptions = function configPathFromOptions() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  if (_.has(options, 'global') && options.global === true) {
    try {
      if (fs.statSync(GLOBAL_CONFIG).isFile()) {
        return GLOBAL_CONFIG;
      } else {
        throw new CustomError('Unable to find configuration file!', GLOBAL_CONFIG);
      }
    } catch (e) {
      throw new CustomError('Unable to find configuration file!', GLOBAL_CONFIG);
    }
  } else if (_.has(options, 'local') && options.local === true) {
    try {
      if (fs.statSync(LOCAL_CONFIG).isFile()) {
        return LOCAL_CONFIG;
      } else {
        throw new Error();
      }
    } catch (e) {
      var filePath = path.join(LOCAL_CONFIG, '../..', CONFIG_FILENAME);
      try {
        if (fs.statSync(filePath).isFile()) {
          return filePath;
        } else {
          throw new CustomError('Unable to find configuration file!', filePath);
        }
      } catch (e) {
        throw new CustomError('Unable to find configuration file!', filePath);
      }
      throw new CustomError('Unable to find configuration file!', LOCAL_CONFIG);
    }
  } else if (_.has(options, 'config_path')) {
    try {
      if (fs.statSync(options.config_path).isFile()) {
        return options.config_path;
      } else {
        throw new CustomError('Unable to find configuration file!', options.config_path);
      }
    } catch (e) {
      throw new CustomError('Unable to find configuration file!', options.config_path);
    }
  } else {
    try {
      if (fs.statSync(GLOBAL_CONFIG).isFile()) {
        return GLOBAL_CONFIG;
      } else {
        throw new CustomError('Unable to find configuration file!', GLOBAL_CONFIG);
      }
    } catch (e) {
      throw new CustomError('Unable to find configuration file!', GLOBAL_CONFIG);
    }
  }
};

var config = {
  siteByName: siteByName,
  write: write,
  read: read,
  sites: sites,
  configPathFromOptions: configPathFromOptions
};

mime.define('application/vnd.voog.design.custom+liquid', { extensions: ['tpl'] }, mime.dupOverwrite);

var byName = function byName(name, options) {
  return config.siteByName(name, options);
};

var add = function add(data, options) {
  if (_.has(data, 'host') && _.has(data, 'token')) {
    var sites = config.sites(options);
    sites.push(data);
    config.write('sites', sites, options);
    return true;
  } else {
    return false;
  };
};

var remove = function remove(name, options) {
  var sitesInConfig = config.sites(options);
  var siteNames = sitesInConfig.map(function (site) {
    return site.name || site.host;
  });
  var idx = siteNames.indexOf(name);
  if (idx < 0) {
    return false;
  }
  var finalSites = sitesInConfig.slice(0, idx).concat(sitesInConfig.slice(idx + 1));

  return config.write('sites', finalSites, options);
};

var getFileInfo = function getFileInfo(filePath) {
  var stat = undefined;
  try {
    stat = fs.statSync(filePath);
  } catch (e) {
    return;
  }

  var fileName = path.basename(filePath);
  return {
    file: fileName,
    size: stat.size,
    contentType: mime.lookup(fileName),
    path: filePath,
    updatedAt: stat.mtime
  };
};

var totalFilesFor = function totalFilesFor(siteName) {
  var files = filesFor(siteName);
  return Object.keys(files).reduce(function (total, folder) {
    return total + files[folder].length;
  }, 0);
};

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

var dirFor = function dirFor(name, options) {
  var site = byName(name, options);
  if (site) {
    return site.dir || site.path;
  }
};

var hostFor = function hostFor(name, options) {
  var site = byName(name, options);
  if (site) {
    return site.host;
  }
};

var tokenFor = function tokenFor(name, options) {
  var site = byName(name, options);
  if (site) {
    return site.token || site.api_token;
  }
};

var names = function names(options) {
  return config.sites(options).map(function (site) {
    return site.name || site.host;
  });
};

var sites$1 = {
  byName: byName,
  add: add,
  remove: remove,
  totalFilesFor: totalFilesFor,
  filesFor: filesFor,
  dirFor: dirFor,
  hostFor: hostFor,
  tokenFor: tokenFor,
  names: names,
  getFileInfo: getFileInfo
};

var clientFor = function clientFor(name, options) {
  var host = sites$1.hostFor(name, options);
  var token = sites$1.tokenFor(name, options);

  if (host && token) {
    return new Voog(host, token);
  }
};

var getLayoutContents = function getLayoutContents(siteName, id) {
  return new bluebird.Promise(function (resolve, reject) {
    clientFor(siteName).layout(id, {}, function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data.body);
    });
  });
};

var getLayoutAssetContents = function getLayoutAssetContents(siteName, id) {
  return new bluebird.Promise(function (resolve, reject) {
    clientFor(siteName).layoutAsset(id, {}, function (err, data) {
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

var getLayouts = function getLayouts(siteName) {
  var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return new bluebird.Promise(function (resolve, reject) {
    clientFor(siteName).layouts(Object.assign({}, { per_page: 250 }, opts), function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

var getLayoutAssets = function getLayoutAssets(siteName) {
  var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return new bluebird.Promise(function (resolve, reject) {
    clientFor(siteName).layoutAssets(Object.assign({}, { per_page: 250 }, opts), function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

var pullAllFiles = function pullAllFiles(siteName) {
  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName);

    bluebird.Promise.all([getLayouts(siteName), getLayoutAssets(siteName)]).then(function (_ref) {
      var _ref2 = babelHelpers.slicedToArray(_ref, 2);

      var layouts = _ref2[0];
      var assets = _ref2[1];

      bluebird.Promise.all([layouts.map(function (l) {
        var filePath = path.join(siteDir, (l.component ? 'components' : 'layouts') + '/' + normalizeTitle(l.title) + '.tpl');
        return pullFile(siteName, filePath);
      }).concat(assets.map(function (a) {
        var filePath = path.join(siteDir, (_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset') + 's/' + a.filename);
        return pullFile(siteName, filePath);
      }))]).then(resolve);
    });
  });
};

var pushAllFiles = function pushAllFiles(siteName) {
  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName);

    // assets.filter(a => ['js', 'css'].indexOf(a.filename.split('.').reverse()[0]) >= 0)

    bluebird.Promise.all([getLayouts(siteName), getLayoutAssets(siteName)]).then(function (_ref3) {
      var _ref4 = babelHelpers.slicedToArray(_ref3, 2);

      var layouts = _ref4[0];
      var assets = _ref4[1];

      bluebird.Promise.all([layouts.map(function (l) {
        var filePath = path.join(siteDir, (l.component ? 'components' : 'layouts') + '/' + normalizeTitle(l.title) + '.tpl');
        return pushFile(siteName, filePath);
      }).concat(assets.map(function (a) {
        var filePath = path.join(siteDir, (_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset') + 's/' + a.filename);
        return pushFile(siteName, filePath);
      }))]).then(resolve);
    });
  });
};

var findLayoutOrComponent = function findLayoutOrComponent(fileName, component, siteName, options) {
  var name = normalizeTitle(getLayoutNameFromFilename(fileName));
  return new bluebird.Promise(function (resolve, reject) {
    return clientFor(siteName, options).layouts({
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
      resolve(_.head(ret));
    });
  });
};

var findLayoutAsset = function findLayoutAsset(fileName, siteName, options) {
  return new bluebird.Promise(function (resolve, reject) {
    return clientFor(siteName, options).layoutAssets({
      per_page: 250,
      'q.layout_asset.filename': fileName
    }, function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(_.head(data));
    });
  });
};

var getFileNameFromPath = function getFileNameFromPath(filePath) {
  return filePath.split('/')[1];
};

var getLayoutNameFromFilename = function getLayoutNameFromFilename(fileName) {
  return _.head(fileName.split('.'));
};

var findFile = function findFile(filePath, siteName, options) {
  var type = getTypeFromRelativePath(filePath);
  var fileName = getFileNameFromPath(filePath);
  if (_.includes(['layout', 'component'], type)) {
    return findLayoutOrComponent(fileName, type == 'component', siteName, options);
  } else {
    return findLayoutAsset(fileName, siteName, options);
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

var normalizePath = function normalizePath(path, siteDir) {
  return path.replace(siteDir, '').replace(/^\//, '');
};

var writeFile$1 = function writeFile(siteName, file, destPath) {
  return new bluebird.Promise(function (resolve, reject) {
    if (file) {
      if (_.includes(Object.keys(file), 'layout_name')) {
        getLayoutContents(siteName, file.id).then(function (contents) {
          try {
            fs.mkdirSync(path.dirname(destPath));
          } catch (e) {
            if (e.code != 'EEXIST') {
              throw e;
            }
          };
          fs.writeFile(destPath, contents, function (err) {
            if (err) {
              reject(err);
            }
            resolve(file);
          });
        });
      } else if (file.editable) {
        getLayoutAssetContents(siteName, file.id).then(function (contents) {
          try {
            fs.mkdirSync(path.dirname(destPath));
          } catch (e) {
            if (e.code != 'EEXIST') {
              throw e;
            }
          };
          fs.writeFile(destPath, contents, function (err) {
            if (err) {
              reject(err);
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
            return reject(err);
          });
          req.pipe(stream);
          resolve(file);
        } else {
          reject(null);
        }
      }
    } else {
      reject();
    }
  });
};

var uploadFile = function uploadFile(siteName, file, filePath, options) {
  var client = clientFor(siteName, options);
  return new bluebird.Promise(function (resolve, reject) {
    console.log(file);
    if (file) {
      if (_.includes(Object.keys(file), 'layout_name')) {
        var contents = fs.readFileSync(filePath, 'utf8');
        console.log("contents:", contents);
        client.updateLayout(file.id, {
          body: contents
        }, function (err, data) {
          (err ? reject : resolve)(file);
        });
      } else if (file.editable) {
        var contents = fs.readFileSync(filePath, 'utf8');
        console.log("contents:", contents);
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

var pullFile = function pullFile(siteName, filePath, options) {
  var siteDir = sites$1.dirFor(siteName, options);

  var normalizedPath = normalizePath(filePath, siteDir);

  return new bluebird.Promise(function (resolve, reject) {
    findFile(normalizedPath, siteName, options).then(function (file) {
      if (!file || typeof file === 'undefined') {
        reject();
        return;
      }

      resolve(writeFile$1(siteName, file, filePath, options));
    });
  });
};

var pushFile = function pushFile(siteName, filePath, options) {
  var siteDir = sites$1.dirFor(siteName, options);
  var normalizedPath = normalizePath(filePath, siteDir);

  return new bluebird.Promise(function (resolve, reject) {
    findFile(normalizedPath, siteName, options).then(function (file) {
      if (!file || typeof file === 'undefined') {
        return reject(file);
      }
      resolve(uploadFile(siteName, file, filePath, options));
    });
  });
};

var actions = {
  clientFor: clientFor,
  pullAllFiles: pullAllFiles,
  pushAllFiles: pushAllFiles,
  findFile: findFile,
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

var site = (function () {
  var o = {};

  Object.keys(functions).forEach(function (fn) {
    o[fn] = _.curry(functions[fn])('foo');
  });

  return Object.assign({}, o);
})

var core = {
  fileUtils: fileUtils,
  config: config,
  sites: sites$1,
  actions: actions,
  site: site,
  version: version
};

module.exports = core;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9zaXRlX2NvbnRleHQuanMiLCJzcmMvY29yZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ7XG4gIFwibmFtZVwiOiBcImtpdC1jb3JlXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC4zXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJcIixcbiAgXCJtYWluXCI6IFwiaW5kZXguanNcIixcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImFsbFwiOiBcIm5wbSBydW4gYnVpbGQgJiYgbnBtIHJ1biB0ZXN0XCIsXG4gICAgXCJwcmVidWlsZFwiOiBcImVjaG8gUmVidWlsZGluZyAuL2luZGV4LmpzXCIsXG4gICAgXCJidWlsZFwiOiBcInJvbGx1cCAtbSBpbmxpbmUgLWNcIixcbiAgICBcInBvc3RidWlsZFwiOiBcImVjaG8gYGVjaG8gUmVidWlsdCAuL2luZGV4LmpzICQoZGF0ZSArXFxcIlslSDolTTolU11cXFwiKWBcIixcbiAgICBcInByZXRlc3RcIjogXCJlY2hvIFJ1bm5pbmcgdGVzdHNcIixcbiAgICBcInRlc3RcIjogXCJtb2NoYSAuL3Rlc3QvdGVzdC5qcyB8fCB0cnVlXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGFsbCcgLi9zcmMgLi90ZXN0XCIsXG4gICAgXCJ3YXRjaDpidWlsZFwiOiBcIndhdGNoICducG0tcnVuLWFsbCBidWlsZCB0ZXN0JyAuL3NyY1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIHRlc3QnIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcImdpdCtodHRwczovL2dpdGh1Yi5jb20vVm9vZy92b29nLmpzLmdpdFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJhYmVsLWNsaVwiOiBcIl42LjUuMVwiLFxuICAgIFwiYmFiZWwtcHJlc2V0LWVzMjAxNS1yb2xsdXBcIjogXCJeMS4xLjFcIixcbiAgICBcImNoYWlcIjogXCJeMy41LjBcIixcbiAgICBcImNoYWktYXMtcHJvbWlzZWRcIjogXCJeNS4zLjBcIixcbiAgICBcIm1vY2hhXCI6IFwiXjIuNC41XCIsXG4gICAgXCJtb2NoYS1zaW5vblwiOiBcIl4xLjEuNVwiLFxuICAgIFwibm9ja1wiOiBcIl44LjAuMFwiLFxuICAgIFwicm9sbHVwXCI6IFwiXjAuMjUuNFwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1iYWJlbFwiOiBcIl4yLjMuOVwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1qc29uXCI6IFwiXjIuMC4wXCIsXG4gICAgXCJzaW5vblwiOiBcIl4xLjE3LjNcIixcbiAgICBcInNpbm9uLWNoYWlcIjogXCJeMi44LjBcIixcbiAgICBcIndhdGNoXCI6IFwiXjAuMTcuMVwiXG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBsaXN0RmlsZXMgPSAoZm9sZGVyUGF0aCkgPT4ge1xuICByZXR1cm4gZnMucmVhZGRpclN5bmMoZm9sZGVyUGF0aCkuZmlsdGVyKFxuICAgIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgaXRlbVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgaXRlbSk7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGl0ZW1QYXRoKS5pc0ZpbGUoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBsaXN0Rm9sZGVycyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRGlyZWN0b3J5KCk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0RmlsZUNvbnRlbnRzID0gKGZpbGVQYXRoLCBvcHRpb25zKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsIG9wdGlvbnMpO1xufTtcblxuY29uc3QgZGVsZXRlRmlsZSA9IChmaWxlUGF0aCkgPT4ge1xuICByZXR1cm4gWydmcy51bmxpbmtTeW5jJywgZmlsZVBhdGhdO1xufTtcblxuY29uc3Qgd3JpdGVGaWxlID0gKGZpbGVQYXRoLCBkYXRhKSA9PiB7XG4gIHJldHVybiBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBkYXRhKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgbGlzdEZpbGVzLFxuICBsaXN0Rm9sZGVycyxcbiAgZGVsZXRlRmlsZSxcbiAgd3JpdGVGaWxlLFxuICBjd2Q6IHByb2Nlc3MuY3dkLFxuICBnZXRGaWxlQ29udGVudHNcbn07XG4iLCIvLyBUYWtlbiBmcm9tIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL2p1c3Rtb29uLzE1NTExZjkyZTUyMTZmYTI2MjRiXG5pbXBvcnQgeyBpbmhlcml0cyB9IGZyb20gJ3V0aWwnO1xuXG4ndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEN1c3RvbUVycm9yKG1lc3NhZ2UsIGV4dHJhKSB7XG4gIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuICB0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIHRoaXMuZXh0cmEgPSBleHRyYTtcbn07XG5cbmluaGVyaXRzKEN1c3RvbUVycm9yLCBFcnJvcik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgQ3VzdG9tRXJyb3IgZnJvbSAnLi9jdXN0b21fZXJyb3InO1xuXG5jb25zdCBDT05GSUdfRklMRU5BTUUgPSAnLnZvb2cnO1xuXG5jb25zdCBIT01FRElSID0gcHJvY2Vzcy5lbnYuSE9NRTtcbmNvbnN0IExPQ0FMRElSID0gcHJvY2Vzcy5jd2QoKTtcblxuY29uc3QgTE9DQUxfQ09ORklHID0gcGF0aC5qb2luKExPQ0FMRElSLCBDT05GSUdfRklMRU5BTUUpO1xuY29uc3QgR0xPQkFMX0NPTkZJRyA9IHBhdGguam9pbihIT01FRElSLCBDT05GSUdfRklMRU5BTUUpO1xuXG5jb25zdCBzaXRlQnlOYW1lID0gKG5hbWUsIG9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIF8uaGVhZChcbiAgICBzaXRlcyhvcHRpb25zKS5maWx0ZXIocCA9PiBwLm5hbWUgPT09IG5hbWUpXG4gICk7XG59O1xuXG5jb25zdCBzaXRlcyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiByZWFkKCdzaXRlcycsIG9wdGlvbnMpIHx8IFtdO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoa2V5LCB2YWx1ZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgZmlsZVBhdGggPSBjb25maWdQYXRoRnJvbU9wdGlvbnMob3B0aW9ucyk7XG5cbiAgbGV0IGNvbmZpZyA9IHJlYWQobnVsbCwgb3B0aW9ucykgfHwge307XG4gIGNvbmZpZ1trZXldID0gdmFsdWU7XG5cbiAgbGV0IGZpbGVDb250ZW50cyA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMik7XG5cbiAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZmlsZUNvbnRlbnRzKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5jb25zdCByZWFkID0gKGtleSwgb3B0aW9ucykgPT4ge1xuICBsZXQgZmlsZVBhdGggPSBjb25maWdQYXRoRnJvbU9wdGlvbnMob3B0aW9ucyk7XG5cbiAgbGV0IGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gIGxldCBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblxuICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gcGFyc2VkRGF0YVtrZXldO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXJzZWREYXRhO1xuICB9XG59O1xuXG5jb25zdCBjb25maWdQYXRoRnJvbU9wdGlvbnMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICgoXy5oYXMob3B0aW9ucywgJ2dsb2JhbCcpICYmIG9wdGlvbnMuZ2xvYmFsID09PSB0cnVlKSkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoZnMuc3RhdFN5bmMoR0xPQkFMX0NPTkZJRykuaXNGaWxlKCkpIHtcbiAgICAgICAgcmV0dXJuIEdMT0JBTF9DT05GSUc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgQ3VzdG9tRXJyb3IoJ1VuYWJsZSB0byBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSEnLCBHTE9CQUxfQ09ORklHKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBuZXcgQ3VzdG9tRXJyb3IoJ1VuYWJsZSB0byBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSEnLCBHTE9CQUxfQ09ORklHKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9ucywgJ2xvY2FsJykgJiYgb3B0aW9ucy5sb2NhbCA9PT0gdHJ1ZSkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoZnMuc3RhdFN5bmMoTE9DQUxfQ09ORklHKS5pc0ZpbGUoKSkge1xuICAgICAgICByZXR1cm4gTE9DQUxfQ09ORklHO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihMT0NBTF9DT05GSUcsICcuLi8uLicsIENPTkZJR19GSUxFTkFNRSk7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpKSB7XG4gICAgICAgICAgcmV0dXJuIGZpbGVQYXRoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBDdXN0b21FcnJvcignVW5hYmxlIHRvIGZpbmQgY29uZmlndXJhdGlvbiBmaWxlIScsIGZpbGVQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgQ3VzdG9tRXJyb3IoJ1VuYWJsZSB0byBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSEnLCBmaWxlUGF0aCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgQ3VzdG9tRXJyb3IoJ1VuYWJsZSB0byBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSEnLCBMT0NBTF9DT05GSUcpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChfLmhhcyhvcHRpb25zLCAnY29uZmlnX3BhdGgnKSkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoZnMuc3RhdFN5bmMob3B0aW9ucy5jb25maWdfcGF0aCkuaXNGaWxlKCkpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuY29uZmlnX3BhdGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgQ3VzdG9tRXJyb3IoJ1VuYWJsZSB0byBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSEnLCBvcHRpb25zLmNvbmZpZ19wYXRoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHRocm93IG5ldyBDdXN0b21FcnJvcignVW5hYmxlIHRvIGZpbmQgY29uZmlndXJhdGlvbiBmaWxlIScsIG9wdGlvbnMuY29uZmlnX3BhdGgpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgaWYgKGZzLnN0YXRTeW5jKEdMT0JBTF9DT05GSUcpLmlzRmlsZSgpKSB7XG4gICAgICAgIHJldHVybiBHTE9CQUxfQ09ORklHO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEN1c3RvbUVycm9yKCdVbmFibGUgdG8gZmluZCBjb25maWd1cmF0aW9uIGZpbGUhJywgR0xPQkFMX0NPTkZJRyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgbmV3IEN1c3RvbUVycm9yKCdVbmFibGUgdG8gZmluZCBjb25maWd1cmF0aW9uIGZpbGUhJywgR0xPQkFMX0NPTkZJRyk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc2l0ZUJ5TmFtZSxcbiAgd3JpdGUsXG4gIHJlYWQsXG4gIHNpdGVzLFxuICBjb25maWdQYXRoRnJvbU9wdGlvbnNcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBtaW1lIGZyb20gJ21pbWUtdHlwZS93aXRoLWRiJztcblxubWltZS5kZWZpbmUoJ2FwcGxpY2F0aW9uL3ZuZC52b29nLmRlc2lnbi5jdXN0b20rbGlxdWlkJywge2V4dGVuc2lvbnM6IFsndHBsJ119LCBtaW1lLmR1cE92ZXJ3cml0ZSk7XG5cbmNvbnN0IGJ5TmFtZSA9IChuYW1lLCBvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZUJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGFkZCA9IChkYXRhLCBvcHRpb25zKSA9PiB7XG4gIGlmIChfLmhhcyhkYXRhLCAnaG9zdCcpICYmIF8uaGFzKGRhdGEsICd0b2tlbicpKSB7XG4gICAgbGV0IHNpdGVzID0gY29uZmlnLnNpdGVzKG9wdGlvbnMpO1xuICAgIHNpdGVzLnB1c2goZGF0YSk7XG4gICAgY29uZmlnLndyaXRlKCdzaXRlcycsIHNpdGVzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG59O1xuXG5jb25zdCByZW1vdmUgPSAobmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgc2l0ZXNJbkNvbmZpZyA9IGNvbmZpZy5zaXRlcyhvcHRpb25zKTtcbiAgbGV0IHNpdGVOYW1lcyA9IHNpdGVzSW5Db25maWcubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG4gIGxldCBpZHggPSBzaXRlTmFtZXMuaW5kZXhPZihuYW1lKTtcbiAgaWYgKGlkeCA8IDApIHsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBmaW5hbFNpdGVzID0gc2l0ZXNJbkNvbmZpZ1xuICAgIC5zbGljZSgwLCBpZHgpXG4gICAgLmNvbmNhdChzaXRlc0luQ29uZmlnLnNsaWNlKGlkeCArIDEpKTtcblxuICByZXR1cm4gY29uZmlnLndyaXRlKCdzaXRlcycsIGZpbmFsU2l0ZXMsIG9wdGlvbnMpO1xufTtcblxuY29uc3QgZ2V0RmlsZUluZm8gPSAoZmlsZVBhdGgpID0+IHtcbiAgbGV0IHN0YXQ7XG4gIHRyeSB7XG4gICAgc3RhdCA9IGZzLnN0YXRTeW5jKGZpbGVQYXRoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpO1xuICByZXR1cm4ge1xuICAgIGZpbGU6IGZpbGVOYW1lLFxuICAgIHNpemU6IHN0YXQuc2l6ZSxcbiAgICBjb250ZW50VHlwZTogbWltZS5sb29rdXAoZmlsZU5hbWUpLFxuICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgIHVwZGF0ZWRBdDogc3RhdC5tdGltZVxuICB9O1xufTtcblxuY29uc3QgdG90YWxGaWxlc0ZvciA9IChzaXRlTmFtZSkgPT4ge1xuICBsZXQgZmlsZXMgPSBmaWxlc0ZvcihzaXRlTmFtZSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyhmaWxlcykucmVkdWNlKCh0b3RhbCwgZm9sZGVyKSA9PiB0b3RhbCArIGZpbGVzW2ZvbGRlcl0ubGVuZ3RoLCAwKTtcbn07XG5cbmNvbnN0IGZpbGVzRm9yID0gKG5hbWUpID0+IHtcbiAgbGV0IGZvbGRlcnMgPSBbXG4gICAgJ2Fzc2V0cycsICdjb21wb25lbnRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdsYXlvdXRzJywgJ3N0eWxlc2hlZXRzJ1xuICBdO1xuXG4gIGxldCB3b3JraW5nRGlyID0gZGlyRm9yKG5hbWUpO1xuXG4gIGxldCByb290ID0gZmlsZVV0aWxzLmxpc3RGb2xkZXJzKHdvcmtpbmdEaXIpO1xuXG4gIGlmIChyb290KSB7XG4gICAgcmV0dXJuIGZvbGRlcnMucmVkdWNlKChzdHJ1Y3R1cmUsIGZvbGRlcikgPT4ge1xuICAgICAgaWYgKHJvb3QuaW5kZXhPZihmb2xkZXIpID49IDApIHtcbiAgICAgICAgbGV0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4od29ya2luZ0RpciwgZm9sZGVyKTtcbiAgICAgICAgc3RydWN0dXJlW2ZvbGRlcl0gPSBmaWxlVXRpbHMubGlzdEZpbGVzKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuICAgICAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgcmV0dXJuIHN0YXQuaXNGaWxlKCk7XG4gICAgICAgIH0pLm1hcChmaWxlID0+IHtcbiAgICAgICAgICBsZXQgZnVsbFBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZSk7XG5cbiAgICAgICAgICByZXR1cm4gZ2V0RmlsZUluZm8oZnVsbFBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJ1Y3R1cmU7XG4gICAgfSwge30pO1xuICB9XG59O1xuXG5jb25zdCBkaXJGb3IgPSAobmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbiAgaWYgKHNpdGUpIHtcbiAgICByZXR1cm4gc2l0ZS5kaXIgfHwgc2l0ZS5wYXRoO1xuICB9XG59O1xuXG5jb25zdCBob3N0Rm9yID0gKG5hbWUsIG9wdGlvbnMpID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuaG9zdDtcbiAgfVxufTtcblxuY29uc3QgdG9rZW5Gb3IgPSAobmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbiAgaWYgKHNpdGUpIHtcbiAgICByZXR1cm4gc2l0ZS50b2tlbiB8fCBzaXRlLmFwaV90b2tlbjtcbiAgfVxufTtcblxuY29uc3QgbmFtZXMgPSAob3B0aW9ucykgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVzKG9wdGlvbnMpLm1hcChzaXRlID0+IHNpdGUubmFtZSB8fCBzaXRlLmhvc3QpO1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGJ5TmFtZSxcbiAgYWRkLFxuICByZW1vdmUsXG4gIHRvdGFsRmlsZXNGb3IsXG4gIGZpbGVzRm9yLFxuICBkaXJGb3IsXG4gIGhvc3RGb3IsXG4gIHRva2VuRm9yLFxuICBuYW1lcyxcbiAgZ2V0RmlsZUluZm9cbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgc2l0ZXMgZnJvbSAnLi9zaXRlcyc7XG5pbXBvcnQgVm9vZyBmcm9tICd2b29nJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UHJvbWlzZX0gZnJvbSAnYmx1ZWJpcmQnO1xuXG5jb25zdCBMQVlPVVRGT0xERVJTID0gWydjb21wb25lbnRzJywgJ2xheW91dHMnXTtcbmNvbnN0IEFTU0VURk9MREVSUyA9IFsnYXNzZXRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdzdHlsZXNoZWV0cyddO1xuXG5jb25zdCBjbGllbnRGb3IgPSAobmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgaG9zdCA9IHNpdGVzLmhvc3RGb3IobmFtZSwgb3B0aW9ucyk7XG4gIGxldCB0b2tlbiA9IHNpdGVzLnRva2VuRm9yKG5hbWUsIG9wdGlvbnMpO1xuXG4gIGlmIChob3N0ICYmIHRva2VuKSB7XG4gICAgcmV0dXJuIG5ldyBWb29nKGhvc3QsIHRva2VuKTtcbiAgfVxufTtcblxuY29uc3QgZ2V0TGF5b3V0Q29udGVudHMgPSAoc2l0ZU5hbWUsIGlkKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHNpdGVOYW1lKS5sYXlvdXQoaWQsIHt9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpIH1cbiAgICAgIHJlc29sdmUoZGF0YS5ib2R5KTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRBc3NldENvbnRlbnRzID0gKHNpdGVOYW1lLCBpZCkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSkubGF5b3V0QXNzZXQoaWQsIHt9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpIH1cbiAgICAgIGlmIChkYXRhLmVkaXRhYmxlKSB7XG4gICAgICAgIHJlc29sdmUoZGF0YS5kYXRhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoZGF0YS5wdWJsaWNfdXJsKTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dHMgPSAoc2l0ZU5hbWUsIG9wdHM9e30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUpXG4gICAgICAubGF5b3V0cyhPYmplY3QuYXNzaWduKHt9LCB7cGVyX3BhZ2U6IDI1MH0sIG9wdHMpLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycikgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRzID0gKHNpdGVOYW1lLCBvcHRzPXt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHNpdGVOYW1lKVxuICAgICAgLmxheW91dEFzc2V0cyhPYmplY3QuYXNzaWduKHt9LCB7cGVyX3BhZ2U6IDI1MH0sIG9wdHMpLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycikgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHNpdGVOYW1lKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUpO1xuXG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgZ2V0TGF5b3V0cyhzaXRlTmFtZSksXG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUpXG4gICAgXSkudGhlbigoW2xheW91dHMsIGFzc2V0c10pID0+IHtcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgbGF5b3V0cy5tYXAobCA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke2wuY29tcG9uZW50ID8gJ2NvbXBvbmVudHMnIDogJ2xheW91dHMnfS8ke25vcm1hbGl6ZVRpdGxlKGwudGl0bGUpfS50cGxgKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoKTtcbiAgICAgICAgfSkuY29uY2F0KGFzc2V0cy5tYXAoYSA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgYS5hc3NldF90eXBlKSA/IGEuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2EuZmlsZW5hbWV9YCk7XG4gICAgICAgICAgcmV0dXJuIHB1bGxGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCk7XG4gICAgICAgIH0pKVxuICAgICAgXSkudGhlbihyZXNvbHZlKTtcblxuICAgIH0pO1xuICB9KVxufTtcblxuY29uc3QgcHVzaEFsbEZpbGVzID0gKHNpdGVOYW1lKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUpO1xuXG4gICAgLy8gYXNzZXRzLmZpbHRlcihhID0+IFsnanMnLCAnY3NzJ10uaW5kZXhPZihhLmZpbGVuYW1lLnNwbGl0KCcuJykucmV2ZXJzZSgpWzBdKSA+PSAwKVxuXG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgZ2V0TGF5b3V0cyhzaXRlTmFtZSksXG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUpXG4gICAgXSkudGhlbigoW2xheW91dHMsIGFzc2V0c10pID0+IHtcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgbGF5b3V0cy5tYXAobCA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke2wuY29tcG9uZW50ID8gJ2NvbXBvbmVudHMnIDogJ2xheW91dHMnfS8ke25vcm1hbGl6ZVRpdGxlKGwudGl0bGUpfS50cGxgKTtcbiAgICAgICAgICByZXR1cm4gcHVzaEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoKTtcbiAgICAgICAgfSkuY29uY2F0KGFzc2V0cy5tYXAoYSA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgYS5hc3NldF90eXBlKSA/IGEuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2EuZmlsZW5hbWV9YCk7XG4gICAgICAgICAgcmV0dXJuIHB1c2hGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCk7XG4gICAgICAgIH0pKVxuICAgICAgXSkudGhlbihyZXNvbHZlKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmNvbnN0IGZpbmRMYXlvdXRPckNvbXBvbmVudCA9IChmaWxlTmFtZSwgY29tcG9uZW50LCBzaXRlTmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgbmFtZSA9IG5vcm1hbGl6ZVRpdGxlKGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXQuY29tcG9uZW50JzogY29tcG9uZW50IHx8IGZhbHNlXG4gICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICBsZXQgcmV0ID0gZGF0YS5maWx0ZXIobCA9PiBub3JtYWxpemVUaXRsZShsLnRpdGxlKSA9PSBuYW1lKTtcbiAgICAgIGlmIChyZXQubGVuZ3RoID09PSAwKSB7IHJlamVjdCh1bmRlZmluZWQpOyB9XG4gICAgICByZXNvbHZlKF8uaGVhZChyZXQpKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmNvbnN0IGZpbmRMYXlvdXQgPSAoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zKSA9PiB7XG4gIHJldHVybiBmaW5kTGF5b3V0T3JDb21wb25lbnQoZmlsZU5hbWUsIGZhbHNlLCBzaXRlTmFtZSwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBmaW5kQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBzaXRlTmFtZSwgb3B0aW9ucykgPT4ge1xuICByZXR1cm4gZmluZExheW91dE9yQ29tcG9uZW50KGZpbGVOYW1lLCB0cnVlLCBzaXRlTmFtZSwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0QXNzZXQgPSAoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0QXNzZXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXRfYXNzZXQuZmlsZW5hbWUnOiBmaWxlTmFtZVxuICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycikgfVxuICAgICAgcmVzb2x2ZShfLmhlYWQoZGF0YSkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldEZpbGVOYW1lRnJvbVBhdGggPSAoZmlsZVBhdGgpID0+IHtcbiAgcmV0dXJuIGZpbGVQYXRoLnNwbGl0KCcvJylbMV07XG59O1xuXG5jb25zdCBnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lID0gKGZpbGVOYW1lKSA9PiB7XG4gIHJldHVybiBfLmhlYWQoZmlsZU5hbWUuc3BsaXQoJy4nKSk7XG59XG5cbmNvbnN0IGZpbmRGaWxlID0gKGZpbGVQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgbGV0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCk7XG4gIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgIHJldHVybiBmaW5kTGF5b3V0T3JDb21wb25lbnQoZmlsZU5hbWUsICh0eXBlID09ICdjb21wb25lbnQnKSwgc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmaW5kTGF5b3V0QXNzZXQoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgfVxufTtcblxuY29uc3Qgbm9ybWFsaXplVGl0bGUgPSAodGl0bGUpID0+IHtcbiAgcmV0dXJuIHRpdGxlLnJlcGxhY2UoL1teXFx3XFwtXFwuXS9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aCA9IChwYXRoKSA9PiB7XG4gIGxldCBmb2xkZXIgPSBwYXRoLnNwbGl0KCcvJylbMF07XG4gIGxldCBmb2xkZXJUb1R5cGVNYXAgPSB7XG4gICAgJ2xheW91dHMnOiAnbGF5b3V0JyxcbiAgICAnY29tcG9uZW50cyc6ICdjb21wb25lbnQnLFxuICAgICdhc3NldHMnOiAnYXNzZXQnLFxuICAgICdpbWFnZXMnOiAnaW1hZ2UnLFxuICAgICdqYXZhc2NyaXB0cyc6ICdqYXZhc2NyaXB0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnc3R5bGVzaGVldCdcbiAgfTtcblxuICByZXR1cm4gZm9sZGVyVG9UeXBlTWFwW2ZvbGRlcl07XG59O1xuXG5jb25zdCBub3JtYWxpemVQYXRoID0gKHBhdGgsIHNpdGVEaXIpID0+IHtcbiAgcmV0dXJuIHBhdGhcbiAgICAucmVwbGFjZShzaXRlRGlyLCAnJylcbiAgICAucmVwbGFjZSgvXlxcLy8sICcnKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChzaXRlTmFtZSwgZmlsZSwgZGVzdFBhdGgpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgaWYgKF8uaW5jbHVkZXMoT2JqZWN0LmtleXMoZmlsZSksICdsYXlvdXRfbmFtZScpKSB7XG4gICAgICAgIGdldExheW91dENvbnRlbnRzKHNpdGVOYW1lLCBmaWxlLmlkKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgICB0cnkgeyBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSkgfSBjYXRjaChlKSB7IGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZSB9IH07XG4gICAgICAgICAgZnMud3JpdGVGaWxlKGRlc3RQYXRoLCBjb250ZW50cywgKGVycikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICAgICAgICByZXNvbHZlKGZpbGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGdldExheW91dEFzc2V0Q29udGVudHMoc2l0ZU5hbWUsIGZpbGUuaWQpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgICAgIHRyeSB7IGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKSB9IGNhdGNoKGUpIHsgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlIH0gfTtcbiAgICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpIH1cbiAgICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgdXJsID0gZmlsZS5wdWJsaWNfdXJsO1xuICAgICAgICB0cnkgeyBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSkgfSBjYXRjaChlKSB7IGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZSB9IH07XG4gICAgICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0UGF0aCk7XG4gICAgICAgIGlmICh1cmwgJiYgc3RyZWFtKSB7XG4gICAgICAgICAgbGV0IHJlcSA9IHJlcXVlc3QuZ2V0KHVybCkub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpO1xuICAgICAgICAgIHJlcS5waXBlKHN0cmVhbSk7XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWplY3QobnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KCk7XG4gICAgfVxuICB9KVxufTtcblxuY29uc3QgdXBsb2FkRmlsZSA9IChzaXRlTmFtZSwgZmlsZSwgZmlsZVBhdGgsIG9wdGlvbnMpID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc29sZS5sb2coZmlsZSk7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKE9iamVjdC5rZXlzKGZpbGUpLCAnbGF5b3V0X25hbWUnKSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29udGVudHM6XCIsIGNvbnRlbnRzKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dChmaWxlLmlkLCB7XG4gICAgICAgICAgYm9keTogY29udGVudHNcbiAgICAgICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShmaWxlKVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5lZGl0YWJsZSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29udGVudHM6XCIsIGNvbnRlbnRzKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dEFzc2V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBkYXRhOiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGZpbGUpXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KGZpbGUpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBwdWxsRmlsZSA9IChzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuXG4gIGxldCBub3JtYWxpemVkUGF0aCA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgsIHNpdGVEaXIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZmluZEZpbGUobm9ybWFsaXplZFBhdGgsIHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKCFmaWxlIHx8IHR5cGVvZiBmaWxlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZXNvbHZlKHdyaXRlRmlsZShzaXRlTmFtZSwgZmlsZSwgZmlsZVBhdGgsIG9wdGlvbnMpKTtcbiAgICB9KVxuICB9KTtcbn1cblxuY29uc3QgcHVzaEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKSA9PiB7XG4gIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgbGV0IG5vcm1hbGl6ZWRQYXRoID0gbm9ybWFsaXplUGF0aChmaWxlUGF0aCwgc2l0ZURpcik7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBmaW5kRmlsZShub3JtYWxpemVkUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoIWZpbGUgfHwgdHlwZW9mIGZpbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiByZWplY3QoZmlsZSk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHVwbG9hZEZpbGUoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zKSk7XG4gICAgfSlcbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGNsaWVudEZvcixcbiAgcHVsbEFsbEZpbGVzLFxuICBwdXNoQWxsRmlsZXMsXG4gIGZpbmRGaWxlLFxuICBwdXNoRmlsZSxcbiAgcHVsbEZpbGVcbn07XG4iLCJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG5leHBvcnQgbGV0IGZ1bmN0aW9ucyA9IHtcbiAgZm4xOiAoZm9vLCBiYXIpID0+IHtjb25zb2xlLmxvZyhmb28sIGJhcil9LCBcbiAgZm4yOiAoZm9vLCBiYXIpID0+IHtjb25zb2xlLmxvZyhmb28sIGJhcil9XG59O1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIHZhciBvID0ge307XG4gIFxuICBPYmplY3Qua2V5cyhmdW5jdGlvbnMpLmZvckVhY2goZm4gPT4ge1xuICAgIG9bZm5dID0gXy5jdXJyeShmdW5jdGlvbnNbZm5dKSgnZm9vJylcbiAgfSk7XG4gIFxuICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgbyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQge3ZlcnNpb259IGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHNpdGVzIGZyb20gJy4vc2l0ZXMnO1xuaW1wb3J0IGFjdGlvbnMgZnJvbSAnLi9hY3Rpb25zJztcbmltcG9ydCB7ZGVmYXVsdCBhcyBzaXRlfSBmcm9tICcuL3NpdGVfY29udGV4dCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZmlsZVV0aWxzLFxuICBjb25maWcsXG4gIHNpdGVzLFxuICBhY3Rpb25zLFxuICBzaXRlLFxuICB2ZXJzaW9uXG59O1xuIl0sIm5hbWVzIjpbImluaGVyaXRzIiwic2l0ZXMiLCJQcm9taXNlIiwid3JpdGVGaWxlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNLQSxJQUFNLFlBQVksU0FBWixTQUFZLENBQUMsVUFBRCxFQUFnQjtTQUN6QixHQUFHLFdBQUgsQ0FBZSxVQUFmLEVBQTJCLE1BQTNCLENBQ0wsVUFBUyxJQUFULEVBQWU7UUFDWCxXQUFXLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBc0IsSUFBdEIsQ0FBWCxDQURXO1dBRVIsR0FBRyxRQUFILENBQVksUUFBWixFQUFzQixNQUF0QixFQUFQLENBRmU7R0FBZixDQURGLENBRGdDO0NBQWhCOztBQVFsQixJQUFNLGNBQWMsU0FBZCxXQUFjLENBQUMsVUFBRCxFQUFnQjtTQUMzQixHQUFHLFdBQUgsQ0FBZSxVQUFmLEVBQTJCLE1BQTNCLENBQWtDLFVBQVMs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