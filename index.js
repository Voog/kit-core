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

var version = "0.3.4";

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

var getFileContents = function getFileContents(filePath) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return fs.readFileSync(filePath, options);
};

var fileExists = function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (e) {
    return false;
  }
};

var deleteFile = function deleteFile(filePath) {
  return fs.unlinkSync(filePath);
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
  getFileContents: getFileContents,
  fileExists: fileExists
};

function CustomError(message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.extra = extra;
};

util.inherits(CustomError, Error);

var CONFIG_FILENAME = '.voog';

var HOMEDIR = process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];
var LOCALDIR = process.cwd();

var LOCAL_CONFIG = path.join(LOCALDIR, CONFIG_FILENAME);
var GLOBAL_CONFIG = path.join(HOMEDIR, CONFIG_FILENAME);

var findLocalConfig = function findLocalConfig() {
  if (fileExists$1(path.join(path.resolve(LOCALDIR, '..'), CONFIG_FILENAME))) {
    return path.join(path.resolve(LOCALDIR, '..'), CONFIG_FILENAME);
  } else {
    return LOCAL_CONFIG;
  }
};

var siteByName = function siteByName(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return _.head(sites(options).filter(function (p) {
    return p.name === name || p.host === name;
  }));
};

var sites = function sites() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  return read('sites', options) || [];
};

var write = function write(key, value) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var filePath = pathFromOptions(options);

  if (!configExists(options)) {
    create(options);
  }

  var config = read(null, options) || {};
  config[key] = value;

  var fileContents = JSON.stringify(config, null, 2);

  fs.writeFileSync(filePath, fileContents);
  return true;
};

var updateSite = function updateSite(name) {
  var updates = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var site = siteByName(name, options);
  if (!site) {
    return false;
  }

  var currentSites = sites(options);
  var idx = _.findIndex(currentSites, function (s) {
    return s.name === site.name || s.host === site.host;
  });
  currentSites[idx] = Object.assign({}, site, updates);

  write('sites', currentSites, options);
};

var read = function read(key) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var filePath = pathFromOptions(options);

  if (!configExists(options)) {
    if (filePath === LOCAL_CONFIG && configExists(Object.assign({}, options, { configPath: filePath }))) {
      filePath = GLOBAL_CONFIG;
    } else {
      throw new CustomError('Configuration file not found!');
    }
  }

  var data = fs.readFileSync(filePath, 'utf8');
  var parsedData = JSON.parse(data);

  if (typeof key === 'string') {
    return parsedData[key];
  } else {
    return parsedData;
  }
};

var create = function create() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var filePath = pathFromOptions(options);

  if (!configExists(options)) {
    fs.writeFileSync(filePath, '{}');
    return true;
  } else {
    return false;
  }
};

var pathFromOptions = function pathFromOptions() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (_.has(options, 'global') && options.global === true) {
    return GLOBAL_CONFIG;
  } else if (_.has(options, 'local') && options.local === true) {
    return findLocalConfig();
  } else if (_.has(options, 'configPath') || _.has(options, 'config_path')) {
    return options.configPath || options.config_path;
  } else {
    return findLocalConfig();
  }
};

var fileExists$1 = function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (e) {
    return false;
  }
};

var configExists = function configExists() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  return fileExists$1(pathFromOptions(options));
};

var config = {
  siteByName: siteByName,
  sites: sites,
  write: write,
  updateSite: updateSite,
  read: read,
  create: create,
  pathFromOptions: pathFromOptions,
  configExists: configExists
};

mime.define('application/vnd.voog.design.custom+liquid', { extensions: ['tpl'] }, mime.dupOverwrite);

var byName = function byName(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return config.siteByName(name, options);
};

var add = function add(data) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (_.has(data, 'host') && _.has(data, 'token')) {
    var sites = config.sites(options);

    // updates config if extra options are provided and given site already exists
    var matchSite = function matchSite(site) {
      return site.host === data.host || site.name === data.name;
    };
    if (sites.filter(matchSite).length > 0) {
      var idx = _.findIndex(sites, matchSite);
      sites[idx] = Object.assign({}, sites[idx], data); // merge old and new values
    } else {
      sites = [data].concat(sites); // otherwise add new site to config
    }
    config.write('sites', sites, options);
    return true;
  } else {
    return false;
  }
};

var remove = function remove(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

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
  var stat = fs.statSync(filePath);

  if (stat.isFile()) {
    var fileName = path.basename(filePath);
    return {
      file: fileName,
      size: stat.size,
      contentType: mime.lookup(fileName),
      path: filePath,
      updatedAt: stat.mtime
    };
  } else {
    return;
  }
};

var totalFilesFor = function totalFilesFor(siteName) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var files = filesFor(siteName, options);
  return Object.keys(files).reduce(function (total, folder) {
    return total + files[folder].length;
  }, 0);
};

var filesFor = function filesFor(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var folders = ['assets', 'components', 'images', 'javascripts', 'layouts', 'stylesheets'];

  var workingDir = dirFor(name, options);

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

var dirFor = function dirFor(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var site = byName(name, options);
  if (options.dir || options.path) {
    return options.dir || options.path;
  } else if (site) {
    return site.dir || site.path;
  }
};

/**
 * Returns the hostname that matches the given name in the configuration
 * Prefers explicit options over the configuration file values
 * @param  {string} name         Site name in the configuration
 * @param  {Object} [options={}] Object with values that override default configuration values
 * @return {string?}             The final hostname for the given name
 */
var hostFor = function hostFor(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var site = byName(name, options);
  var host = void 0;
  if (options.host) {
    host = options.host;
  } else if (site) {
    host = site.host;
  }
  if (host) {
    return (options.protocol ? options.protocol + '://' : '') + host.replace(/^https?:\/\//, '');
  } else {
    return;
  }
};

/**
 * Returns the API token for the given site name
 * @param  {string} name         Site name in the configuration
 * @param  {Object} [options={}] Object with values that override default configuration values
 * @return {string?}             The API token for the given site
 */
var tokenFor = function tokenFor(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var site = byName(name, options);
  if (options.token || options.api_token) {
    return options.token || options.api_token;
  } else if (site) {
    return site.token || site.api_token;
  }
};

var names = function names(options) {
  return config.sites(options).map(function (site) {
    return site.name || site.host;
  });
};

var hosts = function hosts(options) {
  return config.sites(options).map(function (site) {
    return site.host;
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
  hosts: hosts,
  getFileInfo: getFileInfo
};

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();

var slicedToArray = function () {
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

var clientFor = function clientFor(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var host = sites$1.hostFor(name, options);
  var token = sites$1.tokenFor(name, options);
  var protocol = options.protocol;

  if (host && token) {
    return new Voog(host, token, protocol);
  }
};

var getTotalFileCount = function getTotalFileCount(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return new bluebird.Promise(function (resolve, reject) {
    bluebird.Promise.all([getLayouts(name, options), getLayoutAssets(name, options)]).then(function (_ref) {
      var _ref2 = slicedToArray(_ref, 2),
          layouts = _ref2[0],
          assets = _ref2[1];

      resolve(layouts.length + assets.length);
    }).catch(reject);
  });
};

var getLayoutContents = function getLayoutContents(siteName, id) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return new bluebird.Promise(function (resolve, reject) {
    clientFor(siteName, options).layout(id, {}, function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data.body);
    });
  });
};

var getLayoutAssetContents = function getLayoutAssetContents(siteName, id) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return new bluebird.Promise(function (resolve, reject) {
    clientFor(siteName, options).layoutAsset(id, {}, function (err, data) {
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
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return new bluebird.Promise(function (resolve, reject) {
    clientFor(siteName, options).layouts(Object.assign({}, { per_page: 250 }, options), function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

var getLayoutAssets = function getLayoutAssets(siteName) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return new bluebird.Promise(function (resolve, reject) {
    clientFor(siteName, options).layoutAssets(Object.assign({}, { per_page: 250 }, options), function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

var pullAllFiles = function pullAllFiles(siteName) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName, options);

    bluebird.Promise.all([getLayouts(siteName, options), getLayoutAssets(siteName, options)]).then(function (_ref3) {
      var _ref4 = slicedToArray(_ref3, 2),
          layouts = _ref4[0],
          assets = _ref4[1];

      bluebird.Promise.all([layouts.map(function (l) {
        var filePath = path.join(siteDir, (l.component ? 'components' : 'layouts') + '/' + normalizeTitle(l.title) + '.tpl');
        return pullFile(siteName, filePath, options);
      }).concat(assets.map(function (a) {
        var filePath = path.join(siteDir, (_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset') + 's/' + a.filename);
        return pullFile(siteName, filePath, options);
      }))]).then(resolve);
    }).catch(reject);
  });
};

var getFolderContents = function getFolderContents(siteName, folder) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return new bluebird.Promise(function (resolve, reject) {
    switch (folder) {
      case 'layouts':
        getLayouts(siteName, options).then(function (layouts) {
          return resolve(layouts.filter(function (l) {
            return !l.component;
          }));
        }).catch(reject);
        break;
      case 'components':
        getLayouts(siteName, options).then(function (layouts) {
          return resolve(layouts.filter(function (l) {
            return l.component;
          }));
        }).catch(reject);
        break;
      case 'assets':
        getLayoutAssets(siteName, options).then(function (assets) {
          return resolve(assets.filter(function (a) {
            return !_.includes(['stylesheet', 'image', 'javascript'], a.asset_type);
          }));
        }).catch(reject);
        break;
      case 'images':
        getLayoutAssets(siteName, options).then(function (assets) {
          return resolve(assets.filter(function (a) {
            return a.asset_type === 'image';
          }));
        }).catch(reject);
        break;
      case 'javascripts':
        getLayoutAssets(siteName, options).then(function (assets) {
          return resolve(assets.filter(function (a) {
            return a.asset_type === 'javascript';
          }));
        }).catch(reject);
        break;
      case 'stylesheets':
        getLayoutAssets(siteName, options).then(function (assets) {
          return resolve(assets.filter(function (a) {
            return a.asset_type === 'stylesheet';
          }));
        }).catch(reject);
        break;
      default:
        resolve([]);
    }
  });
};

var getFileTypeForFolder = function getFileTypeForFolder(folder) {
  return {
    'layouts': 'layout',
    'components': 'layout',
    'assets': 'asset',
    'images': 'asset',
    'javascripts': 'asset',
    'stylesheets': 'asset'
  }[folder];
};

var pullFolder = function pullFolder(siteName, folder) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName, options);
    var fileType = getFileTypeForFolder(folder);

    bluebird.Promise.all(getFolderContents(siteName, folder, options)).then(function (files) {
      bluebird.Promise.map(files, function (f) {
        var filePath = void 0;
        if (fileType === 'layout') {
          filePath = path.join(siteDir, (f.component ? 'components' : 'layouts') + '/' + normalizeTitle(f.title) + '.tpl');
        } else if (fileType === 'asset') {
          filePath = path.join(siteDir, (_.includes(['stylesheet', 'image', 'javascript'], f.asset_type) ? f.asset_type : 'asset') + 's/' + f.filename);
        }
        if (filePath) {
          return pullFile(siteName, filePath, options);
        }
      }).then(resolve);
    }).catch(reject);
  });
};

var pushFolder = function pushFolder(siteName, folder) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName, options);
    var fileType = getFileTypeForFolder(folder);

    bluebird.Promise.all(getFolderContents(siteName, folder, options)).then(function (files) {
      bluebird.Promise.map(files, function (f) {
        var filePath = void 0;
        if (fileType === 'layout') {
          filePath = path.join(siteDir, (f.component ? 'components' : 'layouts') + '/' + normalizeTitle(f.title) + '.tpl');
        } else if (fileType === 'asset') {
          filePath = path.join(siteDir, (_.includes(['stylesheet', 'image', 'javascript'], f.asset_type) ? f.asset_type : 'asset') + 's/' + f.filename);
        }
        if (filePath) {
          return pushFile(siteName, filePath, options);
        }
      }).then(resolve);
    }).catch(reject);
  });
};

var pushAllFiles = function pushAllFiles(siteName) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName, options);

    bluebird.Promise.all([getLayouts(siteName, options), getLayoutAssets(siteName, options)]).then(function (_ref5) {
      var _ref6 = slicedToArray(_ref5, 2),
          layouts = _ref6[0],
          assets = _ref6[1];

      bluebird.Promise.all([layouts.map(function (l) {
        var filePath = path.join(siteDir, (l.component ? 'components' : 'layouts') + '/' + normalizeTitle(l.title) + '.tpl');
        return pushFile(siteName, filePath, options);
      }).concat(assets.map(function (a) {
        var filePath = path.join(siteDir, (_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset') + 's/' + a.filename);
        return pushFile(siteName, filePath, options);
      }))]).then(resolve);
    }).catch(reject);
  });
};

var findLayoutOrComponent = function findLayoutOrComponent(fileName, component, siteName) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var name = normalizeTitle(getLayoutNameFromFilename(fileName));
  return new bluebird.Promise(function (resolve, reject) {
    return clientFor(siteName, options).layouts({
      per_page: 250,
      'q.layout.component': component || false
    }, function (err) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      if (err) {
        reject(err);
      }
      var ret = data.filter(function (l) {
        return normalizeTitle(l.title).toLowerCase() == name.toLowerCase();
      });
      if (ret.length === 0) {
        resolve(undefined);
      }
      resolve(_.head(ret));
    });
  });
};

var findLayoutAsset = function findLayoutAsset(fileName, siteName) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

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
  return _.head(fileName.split('.tpl'));
};

var findFile = function findFile(filePath, siteName) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var type = getTypeFromRelativePath(filePath);
  var fileName = getFileNameFromPath(filePath);

  if (_.includes(['layout', 'component'], type)) {
    return findLayoutOrComponent(fileName, type == 'component', siteName, options);
  } else {
    return findLayoutAsset(fileName, siteName, options);
  }
};

var titleFromFilename = function titleFromFilename(fileName) {
  return _.head(fileName.split('.')).replace(/_/, ' ');
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

var getTypeFromExtension = function getTypeFromExtension(fileName) {
  if (fileName.split('.').length > 1) {
    var extension = _.last(fileName.split('.'));

    switch (extension) {
      case 'js':
        return 'javascript';
      case 'css':
        return 'stylesheet';
      case 'jpg':
      case 'png':
      case 'jpeg':
      case 'gif':
        return 'image';
      case 'tpl':
        return 'layout';
      default:
        return 'asset';
    }
  }
};

var getSubfolderForType = function getSubfolderForType(type) {
  return {
    'asset': 'assets',
    'image': 'images',
    'javascript': 'javascripts',
    'stylesheet': 'stylesheets',
    'component': 'components',
    'layout': 'layouts'
  }[type];
};

var normalizePath = function normalizePath(path, siteDir) {
  return path.replace(siteDir, '').replace(/^\//, '');
};

var writeFile$1 = function writeFile(siteName, file, destPath) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  return new bluebird.Promise(function (resolve, reject) {
    if (_.includes(Object.keys(file), 'layout_name')) {
      getLayoutContents(siteName, file.id, options).then(function (contents) {
        try {
          fs.mkdirSync(path.dirname(destPath));
        } catch (e) {
          if (e.code != 'EEXIST') {
            throw e;
          }
        }

        fs.writeFile(destPath, contents, function (err) {
          if (err) {
            reject(err);
          }
          resolve(file);
        });
      });
    } else if (file.editable) {
      getLayoutAssetContents(siteName, file.id, options).then(function (contents) {
        try {
          fs.mkdirSync(path.dirname(destPath));
        } catch (e) {
          if (e.code != 'EEXIST') {
            throw e;
          }
        }
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
      }

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
  });
};

var uploadFile = function uploadFile(siteName, file, filePath) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var client = clientFor(siteName, options);
  return new bluebird.Promise(function (resolve, reject) {
    if (file) {
      if (_.includes(Object.keys(file), 'layout_name')) {
        var contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayout(file.id, {
          body: contents
        }, function (err, data) {
          (err ? reject : resolve)(data);
        });
      } else if (file.editable) {
        var _contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayoutAsset(file.id, {
          data: _contents
        }, function (err, data) {
          (err ? reject : resolve)(data);
        });
      } else if (options.overwrite) {
        var siteDir = sites$1.dirFor(siteName, options);
        var fileName = normalizePath(filePath, siteDir);
        deleteFile$1(siteName, fileName, options).then(function () {
          createFile(siteName, fileName, options).then(resolve).catch(reject);
        });
      } else {
        resolve({ failed: true, file: filePath, message: 'Unable to update file!' });
      }
    } else {
      createFile(siteName, filePath, options).then(resolve).catch(reject);
    }
  });
};

var createFile = function createFile(siteName, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var client = clientFor(siteName, options);
  return new bluebird.Promise(function (resolve, reject) {
    var type = getTypeFromRelativePath(filePath);
    var file = fileObjectFromPath(filePath);

    if (_.includes(['layout', 'component'], type)) {
      client.createLayout(file, function (err, data) {
        if (err) {
          resolve({ failed: true, file: file, message: 'Unable to create file!' });
        } else {
          resolve(data);
        }
      });
    } else {
      client.createLayoutAsset(file, function (err, data) {
        if (err) {
          resolve({ failed: true, file: file, message: 'Unable to create file!' });
        } else {
          resolve(data);
        }
      });
    }
  });
};

var fileObjectFromPath = function fileObjectFromPath(filePath) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var type = getTypeFromRelativePath(filePath);
  var fileName = getFileNameFromPath(filePath);

  if (_.includes(['layout', 'component'], type)) {
    return {
      title: _.has(options, 'title') ? options.title : titleFromFilename(fileName),
      component: type == 'component',
      content_type: _.has(options, 'content_type') ? options.content_type : 'page',
      body: fs.readFileSync(filePath, 'utf8'),
      parent_id: _.has(options, 'parent_id') ? options.parent_id : null,
      parent_title: _.has(options, 'parent_title') ? options.parent_title : null
    };
  } else {
    var obj = {
      filename: fileName
    };

    if (_.includes(['javascripts', 'stylesheets'], type)) {
      obj.data = fs.readFileSync(filePath, 'utf8');
    } else {
      obj.file = fs.createReadStream(filePath);
    }
    return obj;
  }
};

var pullFile = function pullFile(siteName, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var siteDir = sites$1.dirFor(siteName, options);
  var normalizedPath = normalizePath(filePath, siteDir);

  return new bluebird.Promise(function (resolve, reject) {
    findFile(normalizedPath, siteName, options).then(function (file) {
      if (!file || typeof file === 'undefined') {
        resolve({ failed: true, file: filePath, message: 'File not found' });
      } else {
        resolve(writeFile$1(siteName, file, filePath, options));
      }
    });
  });
};

var pushFile = function pushFile(siteName, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var siteDir = sites$1.dirFor(siteName, options);
  var normalizedPath = normalizePath(filePath, siteDir);

  return new bluebird.Promise(function (resolve, reject) {
    findFile(normalizedPath, siteName, options).then(function (file) {
      if (!file || typeof file === 'undefined') {
        resolve({ failed: true, file: filePath, message: 'File not found' });
      } else {
        resolve(uploadFile(siteName, file, filePath, options));
      }
    });
  });
};

var addFile = function addFile(siteName, fileName) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return new bluebird.Promise(function (resolve, reject) {
    var file = void 0;
    var type = void 0;

    if (fileName.split('/').length > 1) {
      file = getFileNameFromPath(fileName, options);
      type = getTypeFromRelativePath(fileName);
    } else {
      file = fileName;
      type = getTypeFromExtension(fileName);
    }

    var subFolder = getSubfolderForType(type);
    var projectDir = sites$1.dirFor(siteName, options);
    var finalPath = path.join(projectDir, subFolder, file);

    var relativePath = finalPath.replace(projectDir + '/', '');

    if (fileUtils.fileExists(relativePath, options) || typeof fileUtils.writeFile(relativePath, '') == 'undefined') {
      resolve(createFile(siteName, relativePath, options));
    } else {
      resolve({ failed: true, file: fileName, message: 'Unable to create file!' });
    }
  });
};

var deleteFile$1 = function deleteFile(siteName, fileName, options) {
  var client = clientFor(siteName, options);

  return new bluebird.Promise(function (resolve, reject) {
    var type = getTypeFromRelativePath(fileName);

    findFile(fileName, siteName, options).then(function (file) {
      if (_.includes(['layout', 'component'], type)) {
        client.deleteLayout(file.id, function (err, data) {
          (err ? reject : resolve)(data);
        });
      } else {
        client.deleteLayoutAsset(file.id, function (err, data) {
          (err ? reject : resolve)(data);
        });
      }
    });
  });
};

var removeFile = function removeFile(siteName, fileName) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return new bluebird.Promise(function (resolve, reject) {
    var file = void 0;
    var type = void 0;

    if (fileName.split('/').length > 1) {
      file = getFileNameFromPath(fileName, options);
      type = getTypeFromRelativePath(fileName);
    } else {
      file = fileName;
      type = getTypeFromExtension(fileName);
    }

    var subFolder = getSubfolderForType(type);
    var projectDir = sites$1.dirFor(siteName, options);
    var finalPath = path.join(projectDir, subFolder, file);

    var relativePath = finalPath.replace(projectDir + '/', '');

    if (fileUtils.fileExists(finalPath, options) || typeof fileUtils.deleteFile(relativePath) == 'undefined') {
      resolve(deleteFile$1(siteName, relativePath, options));
    } else {
      resolve({ failed: true, file: fileName, message: 'Unable to remove file!' });
    }
  });
};

var actions = {
  clientFor: clientFor,
  getTotalFileCount: getTotalFileCount,
  pullAllFiles: pullAllFiles,
  pushAllFiles: pushAllFiles,
  findFile: findFile,
  pushFile: pushFile,
  pullFile: pullFile,
  pullFolder: pullFolder,
  pushFolder: pushFolder,
  createFile: createFile,
  addFile: addFile,
  removeFile: removeFile
};

var core = {
  fileUtils: fileUtils,
  config: config,
  sites: sites$1,
  actions: actions,
  version: version
};

module.exports = core;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9cdTAwMDBiYWJlbEhlbHBlcnMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4zLjRcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYWxsXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3RcIixcbiAgICBcInByZWJ1aWxkXCI6IFwiZWNobyBSZWJ1aWxkaW5nIC4vaW5kZXguanNcIixcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtY1wiLFxuICAgIFwicG9zdGJ1aWxkXCI6IFwiZWNobyBgZWNobyBSZWJ1aWx0IC4vaW5kZXguanMgJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpYCAmJiB0b3VjaCAuLi9raXQtY2xpL3NyYy9raXQuanNcIixcbiAgICBcInByZXRlc3RcIjogXCJlY2hvIFJ1bm5pbmcgdGVzdHNcIixcbiAgICBcInRlc3RcIjogXCJtb2NoYSAuL3Rlc3QvdGVzdC5qcyB8fCB0cnVlXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGFsbCcgLi9zcmMgLi90ZXN0XCIsXG4gICAgXCJ3YXRjaDpidWlsZFwiOiBcIndhdGNoICducG0tcnVuLWFsbCBidWlsZCB0ZXN0JyAuL3NyY1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIHRlc3QnIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcIjAuMS4zXCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmFiZWwtY2xpXCI6IFwiXjYuNS4xXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1LXJvbGx1cFwiOiBcIl4xLjEuMVwiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjUuMFwiLFxuICAgIFwiY2hhaS1hcy1wcm9taXNlZFwiOiBcIl41LjMuMFwiLFxuICAgIFwibW9jaGFcIjogXCJeMi40LjVcIixcbiAgICBcIm1vY2hhLXNpbm9uXCI6IFwiXjEuMS41XCIsXG4gICAgXCJub2NrXCI6IFwiXjguMC4wXCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWJhYmVsXCI6IFwiXjIuMy45XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcInNpbm9uXCI6IFwiXjEuMTcuM1wiLFxuICAgIFwic2lub24tY2hhaVwiOiBcIl4yLjguMFwiLFxuICAgIFwid2F0Y2hcIjogXCJeMC4xNy4xXCJcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxpc3RGaWxlcyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRmlsZSgpO1xuICB9KTtcbn07XG5cbmNvbnN0IGxpc3RGb2xkZXJzID0gKGZvbGRlclBhdGgpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIGl0ZW1QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGl0ZW0pO1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhpdGVtUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlQ29udGVudHMgPSAoZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmcy51bmxpbmtTeW5jKGZpbGVQYXRoKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChmaWxlUGF0aCwgZGF0YSkgPT4ge1xuICByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGxpc3RGaWxlcyxcbiAgbGlzdEZvbGRlcnMsXG4gIGRlbGV0ZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY3dkOiBwcm9jZXNzLmN3ZCxcbiAgZ2V0RmlsZUNvbnRlbnRzLFxuICBmaWxlRXhpc3RzXG59O1xuIiwiLy8gVGFrZW4gZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9qdXN0bW9vbi8xNTUxMWY5MmU1MjE2ZmEyNjI0YlxuaW1wb3J0IHsgaW5oZXJpdHMgfSBmcm9tICd1dGlsJztcblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDdXN0b21FcnJvcihtZXNzYWdlLCBleHRyYSkge1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLmV4dHJhID0gZXh0cmE7XG59O1xuXG5pbmhlcml0cyhDdXN0b21FcnJvciwgRXJyb3IpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IEN1c3RvbUVycm9yIGZyb20gJy4vY3VzdG9tX2Vycm9yJztcblxuY29uc3QgQ09ORklHX0ZJTEVOQU1FID0gJy52b29nJztcblxuY29uc3QgSE9NRURJUiA9IHByb2Nlc3MuZW52Wyhwcm9jZXNzLnBsYXRmb3JtID09ICd3aW4zMicpID8gJ1VTRVJQUk9GSUxFJyA6ICdIT01FJ107XG5jb25zdCBMT0NBTERJUiA9IHByb2Nlc3MuY3dkKCk7XG5cbmNvbnN0IExPQ0FMX0NPTkZJRyA9IHBhdGguam9pbihMT0NBTERJUiwgQ09ORklHX0ZJTEVOQU1FKTtcbmNvbnN0IEdMT0JBTF9DT05GSUcgPSBwYXRoLmpvaW4oSE9NRURJUiwgQ09ORklHX0ZJTEVOQU1FKTtcblxuY29uc3QgZmluZExvY2FsQ29uZmlnID0gKCkgPT4ge1xuICBpZiAoZmlsZUV4aXN0cyhwYXRoLmpvaW4ocGF0aC5yZXNvbHZlKExPQ0FMRElSLCAnLi4nKSwgQ09ORklHX0ZJTEVOQU1FKSkpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHBhdGgucmVzb2x2ZShMT0NBTERJUiwgJy4uJyksIENPTkZJR19GSUxFTkFNRSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIExPQ0FMX0NPTkZJRztcbiAgfVxufTtcblxuY29uc3Qgc2l0ZUJ5TmFtZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIF8uaGVhZChcbiAgICBzaXRlcyhvcHRpb25zKVxuICAgIC5maWx0ZXIocCA9PiBwLm5hbWUgPT09IG5hbWUgfHwgcC5ob3N0ID09PSBuYW1lKVxuICApO1xufTtcblxuY29uc3Qgc2l0ZXMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiByZWFkKCdzaXRlcycsIG9wdGlvbnMpIHx8IFtdO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoa2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhvcHRpb25zKSkge1xuICAgIGNyZWF0ZShvcHRpb25zKTtcbiAgfVxuXG4gIGxldCBjb25maWcgPSByZWFkKG51bGwsIG9wdGlvbnMpIHx8IHt9O1xuICBjb25maWdba2V5XSA9IHZhbHVlO1xuXG4gIGxldCBmaWxlQ29udGVudHMgPSBKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDIpO1xuXG4gIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsIGZpbGVDb250ZW50cyk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuY29uc3QgdXBkYXRlU2l0ZSA9IChuYW1lLCB1cGRhdGVzID0ge30sIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IHNpdGVCeU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGlmICghc2l0ZSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICBsZXQgY3VycmVudFNpdGVzID0gc2l0ZXMob3B0aW9ucyk7XG4gIGxldCBpZHggPSBfLmZpbmRJbmRleChjdXJyZW50U2l0ZXMsIChzKSA9PiBzLm5hbWUgPT09IHNpdGUubmFtZSB8fCBzLmhvc3QgPT09IHNpdGUuaG9zdCk7XG4gIGN1cnJlbnRTaXRlc1tpZHhdID0gT2JqZWN0LmFzc2lnbih7fSwgc2l0ZSwgdXBkYXRlcyk7XG5cbiAgd3JpdGUoJ3NpdGVzJywgY3VycmVudFNpdGVzLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IHJlYWQgPSAoa2V5LCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVQYXRoID0gcGF0aEZyb21PcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmICghY29uZmlnRXhpc3RzKG9wdGlvbnMpKSB7XG4gICAgaWYgKGZpbGVQYXRoID09PSBMT0NBTF9DT05GSUcgJiYgY29uZmlnRXhpc3RzKE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtjb25maWdQYXRoOiBmaWxlUGF0aH0pKSkge1xuICAgICAgZmlsZVBhdGggPSBHTE9CQUxfQ09ORklHO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgQ3VzdG9tRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZmlsZSBub3QgZm91bmQhJyk7XG4gICAgfVxuICB9XG5cbiAgbGV0IGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gIGxldCBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblxuICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gcGFyc2VkRGF0YVtrZXldO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXJzZWREYXRhO1xuICB9XG59O1xuXG5jb25zdCBjcmVhdGUgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhvcHRpb25zKSkge1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsICd7fScpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgcGF0aEZyb21PcHRpb25zID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAoKF8uaGFzKG9wdGlvbnMsICdnbG9iYWwnKSAmJiBvcHRpb25zLmdsb2JhbCA9PT0gdHJ1ZSkpIHtcbiAgICByZXR1cm4gR0xPQkFMX0NPTkZJRztcbiAgfSBlbHNlIGlmIChfLmhhcyhvcHRpb25zLCAnbG9jYWwnKSAmJiBvcHRpb25zLmxvY2FsID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZpbmRMb2NhbENvbmZpZygpO1xuICB9IGVsc2UgaWYgKF8uaGFzKG9wdGlvbnMsICdjb25maWdQYXRoJykgfHwgXy5oYXMob3B0aW9ucywgJ2NvbmZpZ19wYXRoJykpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5jb25maWdQYXRoIHx8IG9wdGlvbnMuY29uZmlnX3BhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZpbmRMb2NhbENvbmZpZygpO1xuICB9XG59O1xuXG5jb25zdCBmaWxlRXhpc3RzID0gKGZpbGVQYXRoKSA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgY29uZmlnRXhpc3RzID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZmlsZUV4aXN0cyhwYXRoRnJvbU9wdGlvbnMob3B0aW9ucykpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBzaXRlQnlOYW1lLFxuICBzaXRlcyxcbiAgd3JpdGUsXG4gIHVwZGF0ZVNpdGUsXG4gIHJlYWQsXG4gIGNyZWF0ZSxcbiAgcGF0aEZyb21PcHRpb25zLFxuICBjb25maWdFeGlzdHNcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBtaW1lIGZyb20gJ21pbWUtdHlwZS93aXRoLWRiJztcblxubWltZS5kZWZpbmUoJ2FwcGxpY2F0aW9uL3ZuZC52b29nLmRlc2lnbi5jdXN0b20rbGlxdWlkJywge2V4dGVuc2lvbnM6IFsndHBsJ119LCBtaW1lLmR1cE92ZXJ3cml0ZSk7XG5cbmNvbnN0IGJ5TmFtZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlQnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xufTtcblxuY29uc3QgYWRkID0gKGRhdGEsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAoXy5oYXMoZGF0YSwgJ2hvc3QnKSAmJiBfLmhhcyhkYXRhLCAndG9rZW4nKSkge1xuICAgIGxldCBzaXRlcyA9IGNvbmZpZy5zaXRlcyhvcHRpb25zKTtcblxuICAgIC8vIHVwZGF0ZXMgY29uZmlnIGlmIGV4dHJhIG9wdGlvbnMgYXJlIHByb3ZpZGVkIGFuZCBnaXZlbiBzaXRlIGFscmVhZHkgZXhpc3RzXG4gICAgdmFyIG1hdGNoU2l0ZSA9IHNpdGUgPT4gc2l0ZS5ob3N0ID09PSBkYXRhLmhvc3QgfHwgc2l0ZS5uYW1lID09PSBkYXRhLm5hbWU7XG4gICAgaWYgKHNpdGVzLmZpbHRlcihtYXRjaFNpdGUpLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBpZHggPSBfLmZpbmRJbmRleChzaXRlcywgbWF0Y2hTaXRlKTtcbiAgICAgIHNpdGVzW2lkeF0gPSBPYmplY3QuYXNzaWduKHt9LCBzaXRlc1tpZHhdLCBkYXRhKTsgLy8gbWVyZ2Ugb2xkIGFuZCBuZXcgdmFsdWVzXG4gICAgfSBlbHNlIHtcbiAgICAgIHNpdGVzID0gW2RhdGFdLmNvbmNhdChzaXRlcyk7IC8vIG90aGVyd2lzZSBhZGQgbmV3IHNpdGUgdG8gY29uZmlnXG4gICAgfVxuICAgIGNvbmZpZy53cml0ZSgnc2l0ZXMnLCBzaXRlcywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCByZW1vdmUgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlc0luQ29uZmlnID0gY29uZmlnLnNpdGVzKG9wdGlvbnMpO1xuICBsZXQgc2l0ZU5hbWVzID0gc2l0ZXNJbkNvbmZpZy5tYXAoc2l0ZSA9PiBzaXRlLm5hbWUgfHwgc2l0ZS5ob3N0KTtcbiAgbGV0IGlkeCA9IHNpdGVOYW1lcy5pbmRleE9mKG5hbWUpO1xuICBpZiAoaWR4IDwgMCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgbGV0IGZpbmFsU2l0ZXMgPSBzaXRlc0luQ29uZmlnXG4gICAgLnNsaWNlKDAsIGlkeClcbiAgICAuY29uY2F0KHNpdGVzSW5Db25maWcuc2xpY2UoaWR4ICsgMSkpO1xuXG4gIHJldHVybiBjb25maWcud3JpdGUoJ3NpdGVzJywgZmluYWxTaXRlcywgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBnZXRGaWxlSW5mbyA9IChmaWxlUGF0aCkgPT4ge1xuICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGZpbGVQYXRoKTtcblxuICBpZiAoc3RhdC5pc0ZpbGUoKSkge1xuICAgIGxldCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpO1xuICAgIHJldHVybiB7XG4gICAgICBmaWxlOiBmaWxlTmFtZSxcbiAgICAgIHNpemU6IHN0YXQuc2l6ZSxcbiAgICAgIGNvbnRlbnRUeXBlOiBtaW1lLmxvb2t1cChmaWxlTmFtZSksXG4gICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgIHVwZGF0ZWRBdDogc3RhdC5tdGltZVxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG5jb25zdCB0b3RhbEZpbGVzRm9yID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVzID0gZmlsZXNGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gT2JqZWN0LmtleXMoZmlsZXMpLnJlZHVjZSgodG90YWwsIGZvbGRlcikgPT4gdG90YWwgKyBmaWxlc1tmb2xkZXJdLmxlbmd0aCwgMCk7XG59O1xuXG5jb25zdCBmaWxlc0ZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZvbGRlcnMgPSBbXG4gICAgJ2Fzc2V0cycsICdjb21wb25lbnRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdsYXlvdXRzJywgJ3N0eWxlc2hlZXRzJ1xuICBdO1xuXG4gIGxldCB3b3JraW5nRGlyID0gZGlyRm9yKG5hbWUsIG9wdGlvbnMpO1xuXG4gIGxldCByb290ID0gZmlsZVV0aWxzLmxpc3RGb2xkZXJzKHdvcmtpbmdEaXIpO1xuXG4gIGlmIChyb290KSB7XG4gICAgcmV0dXJuIGZvbGRlcnMucmVkdWNlKChzdHJ1Y3R1cmUsIGZvbGRlcikgPT4ge1xuICAgICAgaWYgKHJvb3QuaW5kZXhPZihmb2xkZXIpID49IDApIHtcbiAgICAgICAgbGV0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4od29ya2luZ0RpciwgZm9sZGVyKTtcbiAgICAgICAgc3RydWN0dXJlW2ZvbGRlcl0gPSBmaWxlVXRpbHMubGlzdEZpbGVzKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuICAgICAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgcmV0dXJuIHN0YXQuaXNGaWxlKCk7XG4gICAgICAgIH0pLm1hcChmaWxlID0+IHtcbiAgICAgICAgICBsZXQgZnVsbFBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZSk7XG5cbiAgICAgICAgICByZXR1cm4gZ2V0RmlsZUluZm8oZnVsbFBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJ1Y3R1cmU7XG4gICAgfSwge30pO1xuICB9XG59O1xuXG5jb25zdCBkaXJGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBpZiAob3B0aW9ucy5kaXIgfHwgb3B0aW9ucy5wYXRoKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZGlyIHx8IG9wdGlvbnMucGF0aDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuZGlyIHx8IHNpdGUucGF0aDtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBob3N0bmFtZSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIG5hbWUgaW4gdGhlIGNvbmZpZ3VyYXRpb25cbiAqIFByZWZlcnMgZXhwbGljaXQgb3B0aW9ucyBvdmVyIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgdmFsdWVzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgICAgICAgICBTaXRlIG5hbWUgaW4gdGhlIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSAge09iamVjdH0gW29wdGlvbnM9e31dIE9iamVjdCB3aXRoIHZhbHVlcyB0aGF0IG92ZXJyaWRlIGRlZmF1bHQgY29uZmlndXJhdGlvbiB2YWx1ZXNcbiAqIEByZXR1cm4ge3N0cmluZz99ICAgICAgICAgICAgIFRoZSBmaW5hbCBob3N0bmFtZSBmb3IgdGhlIGdpdmVuIG5hbWVcbiAqL1xuY29uc3QgaG9zdEZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGxldCBob3N0O1xuICBpZiAob3B0aW9ucy5ob3N0KSB7XG4gICAgaG9zdCA9IG9wdGlvbnMuaG9zdDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgaG9zdCA9IHNpdGUuaG9zdDtcbiAgfVxuICBpZiAoaG9zdCkge1xuICAgIHJldHVybiAob3B0aW9ucy5wcm90b2NvbCA/IGAke29wdGlvbnMucHJvdG9jb2x9Oi8vYCA6ICcnKSArIGhvc3QucmVwbGFjZSgvXmh0dHBzPzpcXC9cXC8vLCAnJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIEFQSSB0b2tlbiBmb3IgdGhlIGdpdmVuIHNpdGUgbmFtZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lICAgICAgICAgU2l0ZSBuYW1lIGluIHRoZSBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gIHtPYmplY3R9IFtvcHRpb25zPXt9XSBPYmplY3Qgd2l0aCB2YWx1ZXMgdGhhdCBvdmVycmlkZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gdmFsdWVzXG4gKiBAcmV0dXJuIHtzdHJpbmc/fSAgICAgICAgICAgICBUaGUgQVBJIHRva2VuIGZvciB0aGUgZ2l2ZW4gc2l0ZVxuICovXG5jb25zdCB0b2tlbkZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGlmIChvcHRpb25zLnRva2VuIHx8IG9wdGlvbnMuYXBpX3Rva2VuKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMudG9rZW4gfHwgb3B0aW9ucy5hcGlfdG9rZW47XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLnRva2VuIHx8IHNpdGUuYXBpX3Rva2VuO1xuICB9XG59O1xuXG5jb25zdCBuYW1lcyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMob3B0aW9ucykubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG59O1xuXG5jb25zdCBob3N0cyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMob3B0aW9ucykubWFwKHNpdGUgPT4gc2l0ZS5ob3N0KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgYnlOYW1lLFxuICBhZGQsXG4gIHJlbW92ZSxcbiAgdG90YWxGaWxlc0ZvcixcbiAgZmlsZXNGb3IsXG4gIGRpckZvcixcbiAgaG9zdEZvcixcbiAgdG9rZW5Gb3IsXG4gIG5hbWVzLFxuICBob3N0cyxcbiAgZ2V0RmlsZUluZm9cbn07XG4iLCJ2YXIgYmFiZWxIZWxwZXJzID0ge307XG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iajtcbn0gOiBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqO1xufTtcblxuZXhwb3J0IHZhciBqc3ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBSRUFDVF9FTEVNRU5UX1RZUEUgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLmZvciAmJiBTeW1ib2wuZm9yKFwicmVhY3QuZWxlbWVudFwiKSB8fCAweGVhYzc7XG4gIHJldHVybiBmdW5jdGlvbiBjcmVhdGVSYXdSZWFjdEVsZW1lbnQodHlwZSwgcHJvcHMsIGtleSwgY2hpbGRyZW4pIHtcbiAgICB2YXIgZGVmYXVsdFByb3BzID0gdHlwZSAmJiB0eXBlLmRlZmF1bHRQcm9wcztcbiAgICB2YXIgY2hpbGRyZW5MZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoIC0gMztcblxuICAgIGlmICghcHJvcHMgJiYgY2hpbGRyZW5MZW5ndGggIT09IDApIHtcbiAgICAgIHByb3BzID0ge307XG4gICAgfVxuXG4gICAgaWYgKHByb3BzICYmIGRlZmF1bHRQcm9wcykge1xuICAgICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gZGVmYXVsdFByb3BzKSB7XG4gICAgICAgIGlmIChwcm9wc1twcm9wTmFtZV0gPT09IHZvaWQgMCkge1xuICAgICAgICAgIHByb3BzW3Byb3BOYW1lXSA9IGRlZmF1bHRQcm9wc1twcm9wTmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCFwcm9wcykge1xuICAgICAgcHJvcHMgPSBkZWZhdWx0UHJvcHMgfHwge307XG4gICAgfVxuXG4gICAgaWYgKGNoaWxkcmVuTGVuZ3RoID09PSAxKSB7XG4gICAgICBwcm9wcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIH0gZWxzZSBpZiAoY2hpbGRyZW5MZW5ndGggPiAxKSB7XG4gICAgICB2YXIgY2hpbGRBcnJheSA9IEFycmF5KGNoaWxkcmVuTGVuZ3RoKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNoaWxkQXJyYXlbaV0gPSBhcmd1bWVudHNbaSArIDNdO1xuICAgICAgfVxuXG4gICAgICBwcm9wcy5jaGlsZHJlbiA9IGNoaWxkQXJyYXk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICQkdHlwZW9mOiBSRUFDVF9FTEVNRU5UX1RZUEUsXG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAga2V5OiBrZXkgPT09IHVuZGVmaW5lZCA/IG51bGwgOiAnJyArIGtleSxcbiAgICAgIHJlZjogbnVsbCxcbiAgICAgIHByb3BzOiBwcm9wcyxcbiAgICAgIF9vd25lcjogbnVsbFxuICAgIH07XG4gIH07XG59KCk7XG5cbmV4cG9ydCB2YXIgYXN5bmNJdGVyYXRvciA9IGZ1bmN0aW9uIChpdGVyYWJsZSkge1xuICBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgaWYgKFN5bWJvbC5hc3luY0l0ZXJhdG9yKSB7XG4gICAgICB2YXIgbWV0aG9kID0gaXRlcmFibGVbU3ltYm9sLmFzeW5jSXRlcmF0b3JdO1xuICAgICAgaWYgKG1ldGhvZCAhPSBudWxsKSByZXR1cm4gbWV0aG9kLmNhbGwoaXRlcmFibGUpO1xuICAgIH1cblxuICAgIGlmIChTeW1ib2wuaXRlcmF0b3IpIHtcbiAgICAgIHJldHVybiBpdGVyYWJsZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBpcyBub3QgYXN5bmMgaXRlcmFibGVcIik7XG59O1xuXG5leHBvcnQgdmFyIGFzeW5jR2VuZXJhdG9yID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBBd2FpdFZhbHVlKHZhbHVlKSB7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gQXN5bmNHZW5lcmF0b3IoZ2VuKSB7XG4gICAgdmFyIGZyb250LCBiYWNrO1xuXG4gICAgZnVuY3Rpb24gc2VuZChrZXksIGFyZykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgYXJnOiBhcmcsXG4gICAgICAgICAgcmVzb2x2ZTogcmVzb2x2ZSxcbiAgICAgICAgICByZWplY3Q6IHJlamVjdCxcbiAgICAgICAgICBuZXh0OiBudWxsXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGJhY2spIHtcbiAgICAgICAgICBiYWNrID0gYmFjay5uZXh0ID0gcmVxdWVzdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmcm9udCA9IGJhY2sgPSByZXF1ZXN0O1xuICAgICAgICAgIHJlc3VtZShrZXksIGFyZyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc3VtZShrZXksIGFyZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGdlbltrZXldKGFyZyk7XG4gICAgICAgIHZhciB2YWx1ZSA9IHJlc3VsdC52YWx1ZTtcblxuICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBBd2FpdFZhbHVlKSB7XG4gICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlLnZhbHVlKS50aGVuKGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgIHJlc3VtZShcIm5leHRcIiwgYXJnKTtcbiAgICAgICAgICB9LCBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXN1bWUoXCJ0aHJvd1wiLCBhcmcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNldHRsZShyZXN1bHQuZG9uZSA/IFwicmV0dXJuXCIgOiBcIm5vcm1hbFwiLCByZXN1bHQudmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgc2V0dGxlKFwidGhyb3dcIiwgZXJyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR0bGUodHlwZSwgdmFsdWUpIHtcbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIFwicmV0dXJuXCI6XG4gICAgICAgICAgZnJvbnQucmVzb2x2ZSh7XG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBkb25lOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBcInRocm93XCI6XG4gICAgICAgICAgZnJvbnQucmVqZWN0KHZhbHVlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGZyb250LnJlc29sdmUoe1xuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgZG9uZTogZmFsc2VcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgZnJvbnQgPSBmcm9udC5uZXh0O1xuXG4gICAgICBpZiAoZnJvbnQpIHtcbiAgICAgICAgcmVzdW1lKGZyb250LmtleSwgZnJvbnQuYXJnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhY2sgPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2ludm9rZSA9IHNlbmQ7XG5cbiAgICBpZiAodHlwZW9mIGdlbi5yZXR1cm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZXR1cm4gPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuYXN5bmNJdGVyYXRvcikge1xuICAgIEFzeW5jR2VuZXJhdG9yLnByb3RvdHlwZVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICB9XG5cbiAgQXN5bmNHZW5lcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoYXJnKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ludm9rZShcIm5leHRcIiwgYXJnKTtcbiAgfTtcblxuICBBc3luY0dlbmVyYXRvci5wcm90b3R5cGUudGhyb3cgPSBmdW5jdGlvbiAoYXJnKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ludm9rZShcInRocm93XCIsIGFyZyk7XG4gIH07XG5cbiAgQXN5bmNHZW5lcmF0b3IucHJvdG90eXBlLnJldHVybiA9IGZ1bmN0aW9uIChhcmcpIHtcbiAgICByZXR1cm4gdGhpcy5faW52b2tlKFwicmV0dXJuXCIsIGFyZyk7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICB3cmFwOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgQXN5bmNHZW5lcmF0b3IoZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICB9O1xuICAgIH0sXG4gICAgYXdhaXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIG5ldyBBd2FpdFZhbHVlKHZhbHVlKTtcbiAgICB9XG4gIH07XG59KCk7XG5cbmV4cG9ydCB2YXIgYXN5bmNHZW5lcmF0b3JEZWxlZ2F0ZSA9IGZ1bmN0aW9uIChpbm5lciwgYXdhaXRXcmFwKSB7XG4gIHZhciBpdGVyID0ge30sXG4gICAgICB3YWl0aW5nID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gcHVtcChrZXksIHZhbHVlKSB7XG4gICAgd2FpdGluZyA9IHRydWU7XG4gICAgdmFsdWUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgICAgcmVzb2x2ZShpbm5lcltrZXldKHZhbHVlKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgdmFsdWU6IGF3YWl0V3JhcCh2YWx1ZSlcbiAgICB9O1xuICB9XG5cbiAgO1xuXG4gIGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yKSB7XG4gICAgaXRlcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgfVxuXG4gIGl0ZXIubmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh3YWl0aW5nKSB7XG4gICAgICB3YWl0aW5nID0gZmFsc2U7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHB1bXAoXCJuZXh0XCIsIHZhbHVlKTtcbiAgfTtcblxuICBpZiAodHlwZW9mIGlubmVyLnRocm93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBpdGVyLnRocm93ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAod2FpdGluZykge1xuICAgICAgICB3YWl0aW5nID0gZmFsc2U7XG4gICAgICAgIHRocm93IHZhbHVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHVtcChcInRocm93XCIsIHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBpbm5lci5yZXR1cm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGl0ZXIucmV0dXJuID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gcHVtcChcInJldHVyblwiLCB2YWx1ZSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBpdGVyO1xufTtcblxuZXhwb3J0IHZhciBhc3luY1RvR2VuZXJhdG9yID0gZnVuY3Rpb24gKGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGdlbiA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGZ1bmN0aW9uIHN0ZXAoa2V5LCBhcmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgaW5mbyA9IGdlbltrZXldKGFyZyk7XG4gICAgICAgICAgdmFyIHZhbHVlID0gaW5mby52YWx1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbmZvLmRvbmUpIHtcbiAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgc3RlcChcIm5leHRcIiwgdmFsdWUpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHN0ZXAoXCJ0aHJvd1wiLCBlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdGVwKFwibmV4dFwiKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbmV4cG9ydCB2YXIgY2xhc3NDYWxsQ2hlY2sgPSBmdW5jdGlvbiAoaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7XG4gIGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTtcbiAgfVxufTtcblxuZXhwb3J0IHZhciBjcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTtcbiAgICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTtcbiAgICAgIGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpO1xuICAgIHJldHVybiBDb25zdHJ1Y3RvcjtcbiAgfTtcbn0oKTtcblxuZXhwb3J0IHZhciBkZWZpbmVFbnVtZXJhYmxlUHJvcGVydGllcyA9IGZ1bmN0aW9uIChvYmosIGRlc2NzKSB7XG4gIGZvciAodmFyIGtleSBpbiBkZXNjcykge1xuICAgIHZhciBkZXNjID0gZGVzY3Nba2V5XTtcbiAgICBkZXNjLmNvbmZpZ3VyYWJsZSA9IGRlc2MuZW51bWVyYWJsZSA9IHRydWU7XG4gICAgaWYgKFwidmFsdWVcIiBpbiBkZXNjKSBkZXNjLndyaXRhYmxlID0gdHJ1ZTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIGRlc2MpO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbmV4cG9ydCB2YXIgZGVmYXVsdHMgPSBmdW5jdGlvbiAob2JqLCBkZWZhdWx0cykge1xuICB2YXIga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGRlZmF1bHRzKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICB2YXIgdmFsdWUgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGRlZmF1bHRzLCBrZXkpO1xuXG4gICAgaWYgKHZhbHVlICYmIHZhbHVlLmNvbmZpZ3VyYWJsZSAmJiBvYmpba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxuZXhwb3J0IHZhciBkZWZpbmVQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvYmosIGtleSwgdmFsdWUpIHtcbiAgaWYgKGtleSBpbiBvYmopIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIG9ialtrZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7XG4gICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydCB2YXIgZ2V0ID0gZnVuY3Rpb24gZ2V0KG9iamVjdCwgcHJvcGVydHksIHJlY2VpdmVyKSB7XG4gIGlmIChvYmplY3QgPT09IG51bGwpIG9iamVjdCA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbiAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgcHJvcGVydHkpO1xuXG4gIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCk7XG5cbiAgICBpZiAocGFyZW50ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZ2V0KHBhcmVudCwgcHJvcGVydHksIHJlY2VpdmVyKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoXCJ2YWx1ZVwiIGluIGRlc2MpIHtcbiAgICByZXR1cm4gZGVzYy52YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgZ2V0dGVyID0gZGVzYy5nZXQ7XG5cbiAgICBpZiAoZ2V0dGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGdldHRlci5jYWxsKHJlY2VpdmVyKTtcbiAgfVxufTtcblxuZXhwb3J0IHZhciBpbmhlcml0cyA9IGZ1bmN0aW9uIChzdWJDbGFzcywgc3VwZXJDbGFzcykge1xuICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyk7XG4gIH1cblxuICBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IHN1YkNsYXNzLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH1cbiAgfSk7XG4gIGlmIChzdXBlckNsYXNzKSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3Quc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIDogc3ViQ2xhc3MuX19wcm90b19fID0gc3VwZXJDbGFzcztcbn07XG5cbnZhciBfaW5zdGFuY2VvZiA9IGZ1bmN0aW9uIChsZWZ0LCByaWdodCkge1xuICBpZiAocmlnaHQgIT0gbnVsbCAmJiB0eXBlb2YgU3ltYm9sICE9PSBcInVuZGVmaW5lZFwiICYmIHJpZ2h0W1N5bWJvbC5oYXNJbnN0YW5jZV0pIHtcbiAgICByZXR1cm4gcmlnaHRbU3ltYm9sLmhhc0luc3RhbmNlXShsZWZ0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbGVmdCBpbnN0YW5jZW9mIHJpZ2h0O1xuICB9XG59O1xuXG5leHBvcnQgdmFyIGludGVyb3BSZXF1aXJlRGVmYXVsdCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHtcbiAgICBkZWZhdWx0OiBvYmpcbiAgfTtcbn07XG5cbmV4cG9ydCB2YXIgaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkge1xuICAgIHJldHVybiBvYmo7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG5ld09iaiA9IHt9O1xuXG4gICAgaWYgKG9iaiAhPSBudWxsKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIG5ld09iai5kZWZhdWx0ID0gb2JqO1xuICAgIHJldHVybiBuZXdPYmo7XG4gIH1cbn07XG5cbmV4cG9ydCB2YXIgbmV3QXJyb3dDaGVjayA9IGZ1bmN0aW9uIChpbm5lclRoaXMsIGJvdW5kVGhpcykge1xuICBpZiAoaW5uZXJUaGlzICE9PSBib3VuZFRoaXMpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGluc3RhbnRpYXRlIGFuIGFycm93IGZ1bmN0aW9uXCIpO1xuICB9XG59O1xuXG5leHBvcnQgdmFyIG9iamVjdERlc3RydWN0dXJpbmdFbXB0eSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgaWYgKG9iaiA9PSBudWxsKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGRlc3RydWN0dXJlIHVuZGVmaW5lZFwiKTtcbn07XG5cbmV4cG9ydCB2YXIgb2JqZWN0V2l0aG91dFByb3BlcnRpZXMgPSBmdW5jdGlvbiAob2JqLCBrZXlzKSB7XG4gIHZhciB0YXJnZXQgPSB7fTtcblxuICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgIGlmIChrZXlzLmluZGV4T2YoaSkgPj0gMCkgY29udGludWU7XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBpKSkgY29udGludWU7XG4gICAgdGFyZ2V0W2ldID0gb2JqW2ldO1xuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydCB2YXIgcG9zc2libGVDb25zdHJ1Y3RvclJldHVybiA9IGZ1bmN0aW9uIChzZWxmLCBjYWxsKSB7XG4gIGlmICghc2VsZikge1xuICAgIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTtcbiAgfVxuXG4gIHJldHVybiBjYWxsICYmICh0eXBlb2YgY2FsbCA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSA/IGNhbGwgOiBzZWxmO1xufTtcblxuZXhwb3J0IHZhciBzZWxmR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiBnbG9iYWw7XG5cbmV4cG9ydCB2YXIgc2V0ID0gZnVuY3Rpb24gc2V0KG9iamVjdCwgcHJvcGVydHksIHZhbHVlLCByZWNlaXZlcikge1xuICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBwcm9wZXJ0eSk7XG5cbiAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTtcblxuICAgIGlmIChwYXJlbnQgIT09IG51bGwpIHtcbiAgICAgIHNldChwYXJlbnQsIHByb3BlcnR5LCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChcInZhbHVlXCIgaW4gZGVzYyAmJiBkZXNjLndyaXRhYmxlKSB7XG4gICAgZGVzYy52YWx1ZSA9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHZhciBzZXR0ZXIgPSBkZXNjLnNldDtcblxuICAgIGlmIChzZXR0ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgc2V0dGVyLmNhbGwocmVjZWl2ZXIsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5leHBvcnQgdmFyIHNsaWNlZFRvQXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIHNsaWNlSXRlcmF0b3IoYXJyLCBpKSB7XG4gICAgdmFyIF9hcnIgPSBbXTtcbiAgICB2YXIgX24gPSB0cnVlO1xuICAgIHZhciBfZCA9IGZhbHNlO1xuICAgIHZhciBfZSA9IHVuZGVmaW5lZDtcblxuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7XG4gICAgICAgIF9hcnIucHVzaChfcy52YWx1ZSk7XG5cbiAgICAgICAgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgX2QgPSB0cnVlO1xuICAgICAgX2UgPSBlcnI7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0pIF9pW1wicmV0dXJuXCJdKCk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAoX2QpIHRocm93IF9lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfYXJyO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgICByZXR1cm4gYXJyO1xuICAgIH0gZWxzZSBpZiAoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSB7XG4gICAgICByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBhdHRlbXB0IHRvIGRlc3RydWN0dXJlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZVwiKTtcbiAgICB9XG4gIH07XG59KCk7XG5cbmV4cG9ydCB2YXIgc2xpY2VkVG9BcnJheUxvb3NlID0gZnVuY3Rpb24gKGFyciwgaSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgcmV0dXJuIGFycjtcbiAgfSBlbHNlIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpIHtcbiAgICB2YXIgX2FyciA9IFtdO1xuXG4gICAgZm9yICh2YXIgX2l0ZXJhdG9yID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXA7ICEoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lOykge1xuICAgICAgX2Fyci5wdXNoKF9zdGVwLnZhbHVlKTtcblxuICAgICAgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBfYXJyO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlXCIpO1xuICB9XG59O1xuXG5leHBvcnQgdmFyIHRhZ2dlZFRlbXBsYXRlTGl0ZXJhbCA9IGZ1bmN0aW9uIChzdHJpbmdzLCByYXcpIHtcbiAgcmV0dXJuIE9iamVjdC5mcmVlemUoT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc3RyaW5ncywge1xuICAgIHJhdzoge1xuICAgICAgdmFsdWU6IE9iamVjdC5mcmVlemUocmF3KVxuICAgIH1cbiAgfSkpO1xufTtcblxuZXhwb3J0IHZhciB0YWdnZWRUZW1wbGF0ZUxpdGVyYWxMb29zZSA9IGZ1bmN0aW9uIChzdHJpbmdzLCByYXcpIHtcbiAgc3RyaW5ncy5yYXcgPSByYXc7XG4gIHJldHVybiBzdHJpbmdzO1xufTtcblxuZXhwb3J0IHZhciB0ZW1wb3JhbFJlZiA9IGZ1bmN0aW9uICh2YWwsIG5hbWUsIHVuZGVmKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmKSB7XG4gICAgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKG5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZCAtIHRlbXBvcmFsIGRlYWQgem9uZVwiKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsO1xuICB9XG59O1xuXG5leHBvcnQgdmFyIHRlbXBvcmFsVW5kZWZpbmVkID0ge307XG5cbmV4cG9ydCB2YXIgdG9BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXJyKSA/IGFyciA6IEFycmF5LmZyb20oYXJyKTtcbn07XG5cbmV4cG9ydCB2YXIgdG9Db25zdW1hYmxlQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KGFycikpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgYXJyMiA9IEFycmF5KGFyci5sZW5ndGgpOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBhcnIyW2ldID0gYXJyW2ldO1xuXG4gICAgcmV0dXJuIGFycjI7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oYXJyKTtcbiAgfVxufTtcblxuYmFiZWxIZWxwZXJzO1xuXG5leHBvcnQgeyBfdHlwZW9mIGFzIHR5cGVvZiwgX2V4dGVuZHMgYXMgZXh0ZW5kcywgX2luc3RhbmNlb2YgYXMgaW5zdGFuY2VvZiB9IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgc2l0ZXMgZnJvbSAnLi9zaXRlcyc7XG5pbXBvcnQgVm9vZyBmcm9tICd2b29nJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UHJvbWlzZX0gZnJvbSAnYmx1ZWJpcmQnO1xuXG5jb25zdCBjbGllbnRGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBob3N0ID0gc2l0ZXMuaG9zdEZvcihuYW1lLCBvcHRpb25zKTtcbiAgbGV0IHRva2VuID0gc2l0ZXMudG9rZW5Gb3IobmFtZSwgb3B0aW9ucyk7XG4gIGxldCBwcm90b2NvbCA9IG9wdGlvbnMucHJvdG9jb2w7XG5cbiAgaWYgKGhvc3QgJiYgdG9rZW4pIHtcbiAgICByZXR1cm4gbmV3IFZvb2coaG9zdCwgdG9rZW4sIHByb3RvY29sKTtcbiAgfVxufTtcblxuY29uc3QgZ2V0VG90YWxGaWxlQ291bnQgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgUHJvbWlzZS5hbGwoW2dldExheW91dHMobmFtZSwgb3B0aW9ucyksIGdldExheW91dEFzc2V0cyhuYW1lLCBvcHRpb25zKV0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICByZXNvbHZlKGxheW91dHMubGVuZ3RoICsgYXNzZXRzLmxlbmd0aCk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRDb250ZW50cyA9IChzaXRlTmFtZSwgaWQsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShkYXRhLmJvZHkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dEFzc2V0Q29udGVudHMgPSAoc2l0ZU5hbWUsIGlkLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpLmxheW91dEFzc2V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgaWYgKGRhdGEuZWRpdGFibGUpIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLmRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLnB1YmxpY191cmwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dHMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucylcbiAgICAgIC5sYXlvdXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpXG4gICAgICAubGF5b3V0QXNzZXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0Rm9sZGVyQ29udGVudHMgPSAoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgc3dpdGNoIChmb2xkZXIpIHtcbiAgICBjYXNlICdsYXlvdXRzJzpcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4obGF5b3V0cyA9PiByZXNvbHZlKGxheW91dHMuZmlsdGVyKGwgPT4gIWwuY29tcG9uZW50KSkpLmNhdGNoKHJlamVjdCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjb21wb25lbnRzJzpcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4obGF5b3V0cyA9PiByZXNvbHZlKGxheW91dHMuZmlsdGVyKGwgPT4gbC5jb21wb25lbnQpKSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Fzc2V0cyc6XG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oYXNzZXRzID0+IHJlc29sdmUoYXNzZXRzLmZpbHRlcihhID0+ICFfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGEuYXNzZXRfdHlwZSkpKSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2ltYWdlcyc6XG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oYXNzZXRzID0+IHJlc29sdmUoYXNzZXRzLmZpbHRlcihhID0+IGEuYXNzZXRfdHlwZSA9PT0gJ2ltYWdlJykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnamF2YXNjcmlwdHMnOlxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGFzc2V0cyA9PiByZXNvbHZlKGFzc2V0cy5maWx0ZXIoYSA9PiBhLmFzc2V0X3R5cGUgPT09ICdqYXZhc2NyaXB0JykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc3R5bGVzaGVldHMnOlxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGFzc2V0cyA9PiByZXNvbHZlKGFzc2V0cy5maWx0ZXIoYSA9PiBhLmFzc2V0X3R5cGUgPT09ICdzdHlsZXNoZWV0JykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJlc29sdmUoW10pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlVHlwZUZvckZvbGRlciA9IChmb2xkZXIpID0+IHtcbiAgcmV0dXJuIHtcbiAgICAnbGF5b3V0cyc6ICdsYXlvdXQnLFxuICAgICdjb21wb25lbnRzJzogJ2xheW91dCcsXG4gICAgJ2Fzc2V0cyc6ICdhc3NldCcsXG4gICAgJ2ltYWdlcyc6ICdhc3NldCcsXG4gICAgJ2phdmFzY3JpcHRzJzogJ2Fzc2V0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnYXNzZXQnXG4gIH1bZm9sZGVyXTtcbn07XG5cbmNvbnN0IHB1bGxGb2xkZXIgPSAoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaWxlVHlwZSA9IGdldEZpbGVUeXBlRm9yRm9sZGVyKGZvbGRlcik7XG5cbiAgICBQcm9taXNlLmFsbChnZXRGb2xkZXJDb250ZW50cyhzaXRlTmFtZSwgZm9sZGVyLCBvcHRpb25zKSkudGhlbihmaWxlcyA9PiB7XG4gICAgICBQcm9taXNlLm1hcChmaWxlcywgZiA9PiB7XG4gICAgICAgIGxldCBmaWxlUGF0aDtcbiAgICAgICAgaWYgKGZpbGVUeXBlID09PSAnbGF5b3V0Jykge1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke2YuY29tcG9uZW50ID8gJ2NvbXBvbmVudHMnIDogJ2xheW91dHMnfS8ke25vcm1hbGl6ZVRpdGxlKGYudGl0bGUpfS50cGxgKTtcbiAgICAgICAgfSBlbHNlIGlmIChmaWxlVHlwZSA9PT0gJ2Fzc2V0Jykge1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgZi5hc3NldF90eXBlKSA/IGYuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2YuZmlsZW5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICAgICAgcmV0dXJuIHB1bGxGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdXNoRm9sZGVyID0gKHNpdGVOYW1lLCBmb2xkZXIsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmlsZVR5cGUgPSBnZXRGaWxlVHlwZUZvckZvbGRlcihmb2xkZXIpO1xuXG4gICAgUHJvbWlzZS5hbGwoZ2V0Rm9sZGVyQ29udGVudHMoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucykpLnRoZW4oZmlsZXMgPT4ge1xuICAgICAgUHJvbWlzZS5tYXAoZmlsZXMsIGYgPT4ge1xuICAgICAgICBsZXQgZmlsZVBhdGg7XG4gICAgICAgIGlmIChmaWxlVHlwZSA9PT0gJ2xheW91dCcpIHtcbiAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtmLmNvbXBvbmVudCA/ICdjb21wb25lbnRzJyA6ICdsYXlvdXRzJ30vJHtub3JtYWxpemVUaXRsZShmLnRpdGxlKX0udHBsYCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZmlsZVR5cGUgPT09ICdhc3NldCcpIHtcbiAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGYuYXNzZXRfdHlwZSkgPyBmLmFzc2V0X3R5cGUgOiAnYXNzZXQnfXMvJHtmLmZpbGVuYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICB9KS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVzaEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgZmluZExheW91dE9yQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBjb21wb25lbnQsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IG5hbWUgPSBub3JtYWxpemVUaXRsZShnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lKGZpbGVOYW1lKSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0cyh7XG4gICAgICBwZXJfcGFnZTogMjUwLFxuICAgICAgJ3EubGF5b3V0LmNvbXBvbmVudCc6IGNvbXBvbmVudCB8fCBmYWxzZVxuICAgIH0sIChlcnIsIGRhdGEgPSBbXSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgbGV0IHJldCA9IGRhdGEuZmlsdGVyKGwgPT4gbm9ybWFsaXplVGl0bGUobC50aXRsZSkudG9Mb3dlckNhc2UoKSA9PSBuYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgaWYgKHJldC5sZW5ndGggPT09IDApIHsgcmVzb2x2ZSh1bmRlZmluZWQpOyB9XG4gICAgICByZXNvbHZlKF8uaGVhZChyZXQpKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0QXNzZXQgPSAoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXRBc3NldHMoe1xuICAgICAgcGVyX3BhZ2U6IDI1MCxcbiAgICAgICdxLmxheW91dF9hc3NldC5maWxlbmFtZSc6IGZpbGVOYW1lXG4gICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShfLmhlYWQoZGF0YSkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldEZpbGVOYW1lRnJvbVBhdGggPSAoZmlsZVBhdGgpID0+IHtcbiAgcmV0dXJuIGZpbGVQYXRoLnNwbGl0KCcvJylbMV07XG59O1xuXG5jb25zdCBnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lID0gKGZpbGVOYW1lKSA9PiB7XG4gIHJldHVybiBfLmhlYWQoZmlsZU5hbWUuc3BsaXQoJy50cGwnKSk7XG59O1xuXG5jb25zdCBmaW5kRmlsZSA9IChmaWxlUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgbGV0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCk7XG5cbiAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgcmV0dXJuIGZpbmRMYXlvdXRPckNvbXBvbmVudChmaWxlTmFtZSwgKHR5cGUgPT0gJ2NvbXBvbmVudCcpLCBzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZpbmRMYXlvdXRBc3NldChmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICB9XG59O1xuXG5jb25zdCB0aXRsZUZyb21GaWxlbmFtZSA9IChmaWxlTmFtZSkgPT4ge1xuICByZXR1cm4gXy5oZWFkKGZpbGVOYW1lLnNwbGl0KCcuJykpLnJlcGxhY2UoL18vLCAnICcpO1xufTtcblxuY29uc3Qgbm9ybWFsaXplVGl0bGUgPSAodGl0bGUpID0+IHtcbiAgcmV0dXJuIHRpdGxlLnJlcGxhY2UoL1teXFx3XFwtXFwuXS9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aCA9IChwYXRoKSA9PiB7XG4gIGxldCBmb2xkZXIgPSBwYXRoLnNwbGl0KCcvJylbMF07XG4gIGxldCBmb2xkZXJUb1R5cGVNYXAgPSB7XG4gICAgJ2xheW91dHMnOiAnbGF5b3V0JyxcbiAgICAnY29tcG9uZW50cyc6ICdjb21wb25lbnQnLFxuICAgICdhc3NldHMnOiAnYXNzZXQnLFxuICAgICdpbWFnZXMnOiAnaW1hZ2UnLFxuICAgICdqYXZhc2NyaXB0cyc6ICdqYXZhc2NyaXB0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnc3R5bGVzaGVldCdcbiAgfTtcblxuICByZXR1cm4gZm9sZGVyVG9UeXBlTWFwW2ZvbGRlcl07XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbUV4dGVuc2lvbiA9IChmaWxlTmFtZSkgPT4ge1xuICBpZiAoZmlsZU5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxKSB7XG4gICAgbGV0IGV4dGVuc2lvbiA9IF8ubGFzdChmaWxlTmFtZS5zcGxpdCgnLicpKTtcblxuICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgY2FzZSAnanMnOlxuICAgICAgcmV0dXJuICdqYXZhc2NyaXB0JztcbiAgICBjYXNlICdjc3MnOlxuICAgICAgcmV0dXJuICdzdHlsZXNoZWV0JztcbiAgICBjYXNlICdqcGcnOlxuICAgIGNhc2UgJ3BuZyc6XG4gICAgY2FzZSAnanBlZyc6XG4gICAgY2FzZSAnZ2lmJzpcbiAgICAgIHJldHVybiAnaW1hZ2UnO1xuICAgIGNhc2UgJ3RwbCc6XG4gICAgICByZXR1cm4gJ2xheW91dCc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnYXNzZXQnO1xuICAgIH1cbiAgfVxufTtcblxuY29uc3QgZ2V0U3ViZm9sZGVyRm9yVHlwZSA9ICh0eXBlKSA9PiB7XG4gIHJldHVybiB7XG4gICAgJ2Fzc2V0JzogJ2Fzc2V0cycsXG4gICAgJ2ltYWdlJzogJ2ltYWdlcycsXG4gICAgJ2phdmFzY3JpcHQnOiAnamF2YXNjcmlwdHMnLFxuICAgICdzdHlsZXNoZWV0JzogJ3N0eWxlc2hlZXRzJyxcbiAgICAnY29tcG9uZW50JzogJ2NvbXBvbmVudHMnLFxuICAgICdsYXlvdXQnOiAnbGF5b3V0cydcbiAgfVt0eXBlXTtcbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVBhdGggPSAocGF0aCwgc2l0ZURpcikgPT4ge1xuICByZXR1cm4gcGF0aFxuICAgIC5yZXBsYWNlKHNpdGVEaXIsICcnKVxuICAgIC5yZXBsYWNlKC9eXFwvLywgJycpO1xufTtcblxuY29uc3Qgd3JpdGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlLCBkZXN0UGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKF8uaW5jbHVkZXMoT2JqZWN0LmtleXMoZmlsZSksICdsYXlvdXRfbmFtZScpKSB7XG4gICAgICBnZXRMYXlvdXRDb250ZW50cyhzaXRlTmFtZSwgZmlsZS5pZCwgb3B0aW9ucykudGhlbihjb250ZW50cyA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShkZXN0UGF0aCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlOyB9XG4gICAgICAgIH1cblxuICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICBnZXRMYXlvdXRBc3NldENvbnRlbnRzKHNpdGVOYW1lLCBmaWxlLmlkLCBvcHRpb25zKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgICAgfVxuICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1cmwgPSBmaWxlLnB1YmxpY191cmw7XG4gICAgICB0cnkge1xuICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZTsgfVxuICAgICAgfVxuXG4gICAgICBsZXQgc3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdFBhdGgpO1xuICAgICAgaWYgKHVybCAmJiBzdHJlYW0pIHtcbiAgICAgICAgbGV0IHJlcSA9IHJlcXVlc3QuZ2V0KHVybCkub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpO1xuICAgICAgICByZXEucGlwZShzdHJlYW0pO1xuICAgICAgICByZXNvbHZlKGZpbGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KG51bGwpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCB1cGxvYWRGaWxlID0gKHNpdGVOYW1lLCBmaWxlLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGlmIChmaWxlKSB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhPYmplY3Qua2V5cyhmaWxlKSwgJ2xheW91dF9uYW1lJykpIHtcbiAgICAgICAgbGV0IGNvbnRlbnRzID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICBjbGllbnQudXBkYXRlTGF5b3V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBib2R5OiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5lZGl0YWJsZSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXRBc3NldChmaWxlLmlkLCB7XG4gICAgICAgICAgZGF0YTogY29udGVudHNcbiAgICAgICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMub3ZlcndyaXRlKSB7XG4gICAgICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICAgICAgdmFyIGZpbGVOYW1lID0gbm9ybWFsaXplUGF0aChmaWxlUGF0aCwgc2l0ZURpcik7XG4gICAgICAgIGRlbGV0ZUZpbGUoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zKS50aGVuKCgpID0+IHtcbiAgICAgICAgICBjcmVhdGVGaWxlKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucykudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZVBhdGgsIG1lc3NhZ2U6ICdVbmFibGUgdG8gdXBkYXRlIGZpbGUhJ30pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjcmVhdGVGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucykudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBjcmVhdGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICAgIGxldCBmaWxlID0gZmlsZU9iamVjdEZyb21QYXRoKGZpbGVQYXRoKTtcblxuICAgIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgICAgY2xpZW50LmNyZWF0ZUxheW91dChmaWxlLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbGllbnQuY3JlYXRlTGF5b3V0QXNzZXQoZmlsZSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlLCBtZXNzYWdlOiAnVW5hYmxlIHRvIGNyZWF0ZSBmaWxlISd9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgZmlsZU9iamVjdEZyb21QYXRoID0gKGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlUGF0aCk7XG4gIGxldCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZVBhdGgpO1xuXG4gIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogXy5oYXMob3B0aW9ucywgJ3RpdGxlJykgPyBvcHRpb25zLnRpdGxlIDogdGl0bGVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpLFxuICAgICAgY29tcG9uZW50OiB0eXBlID09ICdjb21wb25lbnQnLFxuICAgICAgY29udGVudF90eXBlOiBfLmhhcyhvcHRpb25zLCAnY29udGVudF90eXBlJykgPyBvcHRpb25zLmNvbnRlbnRfdHlwZSA6ICdwYWdlJyxcbiAgICAgIGJvZHk6IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKSxcbiAgICAgIHBhcmVudF9pZDogXy5oYXMob3B0aW9ucywgJ3BhcmVudF9pZCcpID8gb3B0aW9ucy5wYXJlbnRfaWQgOiBudWxsLFxuICAgICAgcGFyZW50X3RpdGxlOiBfLmhhcyhvcHRpb25zLCAncGFyZW50X3RpdGxlJykgPyBvcHRpb25zLnBhcmVudF90aXRsZSA6IG51bGxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGxldCBvYmogPSB7XG4gICAgICBmaWxlbmFtZTogZmlsZU5hbWVcbiAgICB9O1xuXG4gICAgaWYgKF8uaW5jbHVkZXMoWydqYXZhc2NyaXB0cycsICdzdHlsZXNoZWV0cyddLCB0eXBlKSkge1xuICAgICAgb2JqLmRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iai5maWxlID0gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cbn07XG5cbmNvbnN0IHB1bGxGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgbGV0IG5vcm1hbGl6ZWRQYXRoID0gbm9ybWFsaXplUGF0aChmaWxlUGF0aCwgc2l0ZURpcik7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBmaW5kRmlsZShub3JtYWxpemVkUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoIWZpbGUgfHwgdHlwZW9mIGZpbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZVBhdGgsIG1lc3NhZ2U6ICdGaWxlIG5vdCBmb3VuZCd9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUod3JpdGVGaWxlKHNpdGVOYW1lLCBmaWxlLCBmaWxlUGF0aCwgb3B0aW9ucykpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IHB1c2hGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgbGV0IG5vcm1hbGl6ZWRQYXRoID0gbm9ybWFsaXplUGF0aChmaWxlUGF0aCwgc2l0ZURpcik7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBmaW5kRmlsZShub3JtYWxpemVkUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoIWZpbGUgfHwgdHlwZW9mIGZpbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZVBhdGgsIG1lc3NhZ2U6ICdGaWxlIG5vdCBmb3VuZCd9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUodXBsb2FkRmlsZShzaXRlTmFtZSwgZmlsZSwgZmlsZVBhdGgsIG9wdGlvbnMpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBhZGRGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGZpbGU7XG4gICAgbGV0IHR5cGU7XG5cbiAgICBpZiAoZmlsZU5hbWUuc3BsaXQoJy8nKS5sZW5ndGggPiAxKSB7XG4gICAgICBmaWxlID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlTmFtZSwgb3B0aW9ucyk7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlID0gZmlsZU5hbWU7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21FeHRlbnNpb24oZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIGxldCBzdWJGb2xkZXIgPSBnZXRTdWJmb2xkZXJGb3JUeXBlKHR5cGUpO1xuICAgIGxldCBwcm9qZWN0RGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmluYWxQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIHN1YkZvbGRlciwgZmlsZSk7XG5cbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gZmluYWxQYXRoLnJlcGxhY2UocHJvamVjdERpciArICcvJywgJycpO1xuXG4gICAgaWYgKGZpbGVVdGlscy5maWxlRXhpc3RzKHJlbGF0aXZlUGF0aCwgb3B0aW9ucykgfHwgdHlwZW9mIGZpbGVVdGlscy53cml0ZUZpbGUocmVsYXRpdmVQYXRoLCAnJykgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJlc29sdmUoY3JlYXRlRmlsZShzaXRlTmFtZSwgcmVsYXRpdmVQYXRoLCBvcHRpb25zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZU5hbWUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgY2xpZW50ID0gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuXG4gICAgZmluZEZpbGUoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgICAgIGNsaWVudC5kZWxldGVMYXlvdXQoZmlsZS5pZCwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGllbnQuZGVsZXRlTGF5b3V0QXNzZXQoZmlsZS5pZCwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcmVtb3ZlRmlsZSA9IChzaXRlTmFtZSwgZmlsZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBmaWxlO1xuICAgIGxldCB0eXBlO1xuXG4gICAgaWYgKGZpbGVOYW1lLnNwbGl0KCcvJykubGVuZ3RoID4gMSkge1xuICAgICAgZmlsZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZU5hbWUsIG9wdGlvbnMpO1xuICAgICAgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZSA9IGZpbGVOYW1lO1xuICAgICAgdHlwZSA9IGdldFR5cGVGcm9tRXh0ZW5zaW9uKGZpbGVOYW1lKTtcbiAgICB9XG5cbiAgICBsZXQgc3ViRm9sZGVyID0gZ2V0U3ViZm9sZGVyRm9yVHlwZSh0eXBlKTtcbiAgICBsZXQgcHJvamVjdERpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gICAgbGV0IGZpbmFsUGF0aCA9IHBhdGguam9pbihwcm9qZWN0RGlyLCBzdWJGb2xkZXIsIGZpbGUpO1xuXG4gICAgbGV0IHJlbGF0aXZlUGF0aCA9IGZpbmFsUGF0aC5yZXBsYWNlKHByb2plY3REaXIgKyAnLycsICcnKTtcblxuICAgIGlmIChmaWxlVXRpbHMuZmlsZUV4aXN0cyhmaW5hbFBhdGgsIG9wdGlvbnMpIHx8IHR5cGVvZiBmaWxlVXRpbHMuZGVsZXRlRmlsZShyZWxhdGl2ZVBhdGgpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXNvbHZlKGRlbGV0ZUZpbGUoc2l0ZU5hbWUsIHJlbGF0aXZlUGF0aCwgb3B0aW9ucykpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGVOYW1lLCBtZXNzYWdlOiAnVW5hYmxlIHRvIHJlbW92ZSBmaWxlISd9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBjbGllbnRGb3IsXG4gIGdldFRvdGFsRmlsZUNvdW50LFxuICBwdWxsQWxsRmlsZXMsXG4gIHB1c2hBbGxGaWxlcyxcbiAgZmluZEZpbGUsXG4gIHB1c2hGaWxlLFxuICBwdWxsRmlsZSxcbiAgcHVsbEZvbGRlcixcbiAgcHVzaEZvbGRlcixcbiAgY3JlYXRlRmlsZSxcbiAgYWRkRmlsZSxcbiAgcmVtb3ZlRmlsZVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHt2ZXJzaW9ufSBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuXG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBzaXRlcyBmcm9tICcuL3NpdGVzJztcbmltcG9ydCBhY3Rpb25zIGZyb20gJy4vYWN0aW9ucyc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZmlsZVV0aWxzLFxuICBjb25maWcsXG4gIHNpdGVzLFxuICBhY3Rpb25zLFxuICB2ZXJzaW9uXG59O1xuIl0sIm5hbWVzIjpbImxpc3RGaWxlcyIsImZvbGRlclBhdGgiLCJmcyIsInJlYWRkaXJTeW5jIiwiZmlsdGVyIiwiaXRlbSIsIml0ZW1QYXRoIiwicGF0aCIsImpvaW4iLCJzdGF0U3luYyIsImlzRmlsZSIsImxpc3RGb2xkZXJzIiwiaXNEaXJlY3RvcnkiLCJnZXRGaWxlQ29udGVudHMiLCJmaWxlUGF0aCIsIm9wdGlvbnMiLCJyZWFkRmlsZVN5bmMiLCJmaWxlRXhpc3RzIiwiZSIsImRlbGV0ZUZpbGUiLCJ1bmxpbmtTeW5jIiwid3JpdGVGaWxlIiwiZGF0YSIsIndyaXRlRmlsZVN5bmMiLCJwcm9jZXNzIiwiY3dkIiwiQ3VzdG9tRXJyb3IiLCJtZXNzYWdlIiwiZXh0cmEiLCJjYXB0dXJlU3RhY2tUcmFjZSIsImNvbnN0cnVjdG9yIiwibmFtZSIsImluaGVyaXRzIiwiRXJyb3IiLCJDT05GSUdfRklMRU5BTUUiLCJIT01FRElSIiwiZW52IiwicGxhdGZvcm0iLCJMT0NBTERJUiIsIkxPQ0FMX0NPTkZJRyIsIkdMT0JBTF9DT05GSUciLCJmaW5kTG9jYWxDb25maWciLCJyZXNvbHZlIiwic2l0ZUJ5TmFtZSIsIl8iLCJoZWFkIiwic2l0ZXMiLCJwIiwiaG9zdCIsInJlYWQiLCJ3cml0ZSIsImtleSIsInZhbHVlIiwicGF0aEZyb21PcHRpb25zIiwiY29uZmlnRXhpc3RzIiwiY29uZmlnIiwiZmlsZUNvbnRlbnRzIiwiSlNPTiIsInN0cmluZ2lmeSIsInVwZGF0ZVNpdGUiLCJ1cGRhdGVzIiwic2l0ZSIsImN1cnJlbnRTaXRlcyIsImlkeCIsImZpbmRJbmRleCIsInMiLCJPYmplY3QiLCJhc3NpZ24iLCJjb25maWdQYXRoIiwicGFyc2VkRGF0YSIsInBhcnNlIiwiY3JlYXRlIiwiaGFzIiwiZ2xvYmFsIiwibG9jYWwiLCJjb25maWdfcGF0aCIsIm1pbWUiLCJkZWZpbmUiLCJleHRlbnNpb25zIiwiZHVwT3ZlcndyaXRlIiwiYnlOYW1lIiwiYWRkIiwibWF0Y2hTaXRlIiwibGVuZ3RoIiwiY29uY2F0IiwicmVtb3ZlIiwic2l0ZXNJbkNvbmZpZyIsInNpdGVOYW1lcyIsIm1hcCIsImluZGV4T2YiLCJmaW5hbFNpdGVzIiwic2xpY2UiLCJnZXRGaWxlSW5mbyIsInN0YXQiLCJmaWxlTmFtZSIsImJhc2VuYW1lIiwic2l6ZSIsImxvb2t1cCIsIm10aW1lIiwidG90YWxGaWxlc0ZvciIsInNpdGVOYW1lIiwiZmlsZXMiLCJmaWxlc0ZvciIsImtleXMiLCJyZWR1Y2UiLCJ0b3RhbCIsImZvbGRlciIsImZvbGRlcnMiLCJ3b3JraW5nRGlyIiwiZGlyRm9yIiwicm9vdCIsImZpbGVVdGlscyIsInN0cnVjdHVyZSIsImZpbGUiLCJmdWxsUGF0aCIsImRpciIsImhvc3RGb3IiLCJwcm90b2NvbCIsInJlcGxhY2UiLCJ0b2tlbkZvciIsInRva2VuIiwiYXBpX3Rva2VuIiwibmFtZXMiLCJob3N0cyIsImNsaWVudEZvciIsIlZvb2ciLCJnZXRUb3RhbEZpbGVDb3VudCIsIlByb21pc2UiLCJyZWplY3QiLCJhbGwiLCJnZXRMYXlvdXRzIiwiZ2V0TGF5b3V0QXNzZXRzIiwidGhlbiIsImxheW91dHMiLCJhc3NldHMiLCJjYXRjaCIsImdldExheW91dENvbnRlbnRzIiwiaWQiLCJsYXlvdXQiLCJlcnIiLCJib2R5IiwiZ2V0TGF5b3V0QXNzZXRDb250ZW50cyIsImxheW91dEFzc2V0IiwiZWRpdGFibGUiLCJwdWJsaWNfdXJsIiwicGVyX3BhZ2UiLCJsYXlvdXRBc3NldHMiLCJwdWxsQWxsRmlsZXMiLCJzaXRlRGlyIiwibCIsImNvbXBvbmVudCIsIm5vcm1hbGl6ZVRpdGxlIiwidGl0bGUiLCJwdWxsRmlsZSIsImluY2x1ZGVzIiwiYSIsImFzc2V0X3R5cGUiLCJmaWxlbmFtZSIsImdldEZvbGRlckNvbnRlbnRzIiwiZ2V0RmlsZVR5cGVGb3JGb2xkZXIiLCJwdWxsRm9sZGVyIiwiZmlsZVR5cGUiLCJmIiwicHVzaEZvbGRlciIsInB1c2hGaWxlIiwicHVzaEFsbEZpbGVzIiwiZmluZExheW91dE9yQ29tcG9uZW50IiwiZ2V0TGF5b3V0TmFtZUZyb21GaWxlbmFtZSIsInJldCIsInRvTG93ZXJDYXNlIiwidW5kZWZpbmVkIiwiZmluZExheW91dEFzc2V0IiwiZ2V0RmlsZU5hbWVGcm9tUGF0aCIsInNwbGl0IiwiZmluZEZpbGUiLCJ0eXBlIiwiZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgiLCJ0aXRsZUZyb21GaWxlbmFtZSIsImZvbGRlclRvVHlwZU1hcCIsImdldFR5cGVGcm9tRXh0ZW5zaW9uIiwiZXh0ZW5zaW9uIiwibGFzdCIsImdldFN1YmZvbGRlckZvclR5cGUiLCJub3JtYWxpemVQYXRoIiwiZGVzdFBhdGgiLCJta2RpclN5bmMiLCJkaXJuYW1lIiwiY29kZSIsImNvbnRlbnRzIiwidXJsIiwic3RyZWFtIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJyZXEiLCJyZXF1ZXN0IiwiZ2V0Iiwib24iLCJwaXBlIiwidXBsb2FkRmlsZSIsImNsaWVudCIsInVwZGF0ZUxheW91dCIsInVwZGF0ZUxheW91dEFzc2V0Iiwib3ZlcndyaXRlIiwiZmFpbGVkIiwiY3JlYXRlRmlsZSIsImZpbGVPYmplY3RGcm9tUGF0aCIsImNyZWF0ZUxheW91dCIsImNyZWF0ZUxheW91dEFzc2V0IiwiY29udGVudF90eXBlIiwicGFyZW50X2lkIiwicGFyZW50X3RpdGxlIiwib2JqIiwiY3JlYXRlUmVhZFN0cmVhbSIsIm5vcm1hbGl6ZWRQYXRoIiwiYWRkRmlsZSIsInN1YkZvbGRlciIsInByb2plY3REaXIiLCJmaW5hbFBhdGgiLCJyZWxhdGl2ZVBhdGgiLCJkZWxldGVMYXlvdXQiLCJkZWxldGVMYXlvdXRBc3NldCIsInJlbW92ZUZpbGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQ0tBLElBQU1BLFlBQVksU0FBWkEsU0FBWSxDQUFDQyxVQUFELEVBQWdCO1NBQ3pCQyxHQUFHQyxXQUFILENBQWVGLFVBQWYsRUFBMkJHLE1BQTNCLENBQWtDLFVBQVNDLElBQVQsRUFBZTtRQUNsREMsV0FBV0MsS0FBS0MsSUFBTCxDQUFVUCxVQUFWLEVBQXNCSSxJQUF0QixDQUFmO1dBQ09ILEdBQUdPLFFBQUgsQ0FBWUgsUUFBWixFQUFzQkksTUFBdEIsRUFBUDtHQUZLLENBQVA7Q0FERjs7QUFPQSxJQUFNQyxjQUFjLFNBQWRBLFdBQWMsQ0FBQ1YsVUFBRCxFQUFnQjtTQUMzQkMsR0FBR0MsV0FBSCxDQUFlRixVQUFmLEVBQTJCRyxNQUEzQixDQUFrQyxVQUFTQyxJQUFULEVBQWU7UUFDbERDLFdBQVdDLEtBQUtDLElBQUwsQ0FBVVAsVUFBVixFQUFzQkksSUFBdEIsQ0FBZjtXQUNPSCxHQUFHTyxRQUFILENBQVlILFFBQVosRUFBc0JNLFdBQXRCLEVBQVA7R0FGSyxDQUFQO0NBREY7O0FBT0EsSUFBTUMsa0JBQWtCLFNBQWxCQSxlQUFrQixDQUFDQyxRQUFELEVBQTRCO01BQWpCQyxPQUFpQix1RUFBUCxFQUFPOztTQUMzQ2IsR0FBR2MsWUFBSCxDQUFnQkYsUUFBaEIsRUFBMEJDLE9BQTFCLENBQVA7Q0FERjs7QUFJQSxJQUFNRSxhQUFhLFNBQWJBLFVBQWEsQ0FBQ0gsUUFBRCxFQUFjO01BQzNCO1dBQ0taLEdBQUdPLFFBQUgsQ0FBWUssUUFBWixFQUFzQkosTUFBdEIsRUFBUDtHQURGLENBRUUsT0FBT1EsQ0FBUCxFQUFVO1dBQ0gsS0FBUDs7Q0FKSjs7QUFRQSxJQUFNQyxhQUFhLFNBQWJBLFVBQWEsQ0FBQ0wsUUFBRCxFQUFjO1NBQ3hCWixHQUFHa0IsVUFBSCxDQUFjTixRQUFkLENBQVA7Q0FERjs7QUFJ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