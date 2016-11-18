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

var version = "0.3.3";

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

  console.log('pushAllFiles', options);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9cdTAwMDBiYWJlbEhlbHBlcnMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4zLjNcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYWxsXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3RcIixcbiAgICBcInByZWJ1aWxkXCI6IFwiZWNobyBSZWJ1aWxkaW5nIC4vaW5kZXguanNcIixcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtY1wiLFxuICAgIFwicG9zdGJ1aWxkXCI6IFwiZWNobyBgZWNobyBSZWJ1aWx0IC4vaW5kZXguanMgJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpYCAmJiB0b3VjaCAuLi9raXQtY2xpL3NyYy9raXQuanNcIixcbiAgICBcInByZXRlc3RcIjogXCJlY2hvIFJ1bm5pbmcgdGVzdHNcIixcbiAgICBcInRlc3RcIjogXCJtb2NoYSAuL3Rlc3QvdGVzdC5qcyB8fCB0cnVlXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGFsbCcgLi9zcmMgLi90ZXN0XCIsXG4gICAgXCJ3YXRjaDpidWlsZFwiOiBcIndhdGNoICducG0tcnVuLWFsbCBidWlsZCB0ZXN0JyAuL3NyY1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIHRlc3QnIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcIjAuMS4zXCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmFiZWwtY2xpXCI6IFwiXjYuNS4xXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1LXJvbGx1cFwiOiBcIl4xLjEuMVwiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjUuMFwiLFxuICAgIFwiY2hhaS1hcy1wcm9taXNlZFwiOiBcIl41LjMuMFwiLFxuICAgIFwibW9jaGFcIjogXCJeMi40LjVcIixcbiAgICBcIm1vY2hhLXNpbm9uXCI6IFwiXjEuMS41XCIsXG4gICAgXCJub2NrXCI6IFwiXjguMC4wXCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWJhYmVsXCI6IFwiXjIuMy45XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcInNpbm9uXCI6IFwiXjEuMTcuM1wiLFxuICAgIFwic2lub24tY2hhaVwiOiBcIl4yLjguMFwiLFxuICAgIFwid2F0Y2hcIjogXCJeMC4xNy4xXCJcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxpc3RGaWxlcyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRmlsZSgpO1xuICB9KTtcbn07XG5cbmNvbnN0IGxpc3RGb2xkZXJzID0gKGZvbGRlclBhdGgpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIGl0ZW1QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGl0ZW0pO1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhpdGVtUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlQ29udGVudHMgPSAoZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmcy51bmxpbmtTeW5jKGZpbGVQYXRoKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChmaWxlUGF0aCwgZGF0YSkgPT4ge1xuICByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGxpc3RGaWxlcyxcbiAgbGlzdEZvbGRlcnMsXG4gIGRlbGV0ZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY3dkOiBwcm9jZXNzLmN3ZCxcbiAgZ2V0RmlsZUNvbnRlbnRzLFxuICBmaWxlRXhpc3RzXG59O1xuIiwiLy8gVGFrZW4gZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9qdXN0bW9vbi8xNTUxMWY5MmU1MjE2ZmEyNjI0YlxuaW1wb3J0IHsgaW5oZXJpdHMgfSBmcm9tICd1dGlsJztcblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDdXN0b21FcnJvcihtZXNzYWdlLCBleHRyYSkge1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLmV4dHJhID0gZXh0cmE7XG59O1xuXG5pbmhlcml0cyhDdXN0b21FcnJvciwgRXJyb3IpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IEN1c3RvbUVycm9yIGZyb20gJy4vY3VzdG9tX2Vycm9yJztcblxuY29uc3QgQ09ORklHX0ZJTEVOQU1FID0gJy52b29nJztcblxuY29uc3QgSE9NRURJUiA9IHByb2Nlc3MuZW52Wyhwcm9jZXNzLnBsYXRmb3JtID09ICd3aW4zMicpID8gJ1VTRVJQUk9GSUxFJyA6ICdIT01FJ107XG5jb25zdCBMT0NBTERJUiA9IHByb2Nlc3MuY3dkKCk7XG5cbmNvbnN0IExPQ0FMX0NPTkZJRyA9IHBhdGguam9pbihMT0NBTERJUiwgQ09ORklHX0ZJTEVOQU1FKTtcbmNvbnN0IEdMT0JBTF9DT05GSUcgPSBwYXRoLmpvaW4oSE9NRURJUiwgQ09ORklHX0ZJTEVOQU1FKTtcblxuY29uc3QgZmluZExvY2FsQ29uZmlnID0gKCkgPT4ge1xuICBpZiAoZmlsZUV4aXN0cyhwYXRoLmpvaW4ocGF0aC5yZXNvbHZlKExPQ0FMRElSLCAnLi4nKSwgQ09ORklHX0ZJTEVOQU1FKSkpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHBhdGgucmVzb2x2ZShMT0NBTERJUiwgJy4uJyksIENPTkZJR19GSUxFTkFNRSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIExPQ0FMX0NPTkZJRztcbiAgfVxufTtcblxuY29uc3Qgc2l0ZUJ5TmFtZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIF8uaGVhZChcbiAgICBzaXRlcyhvcHRpb25zKVxuICAgIC5maWx0ZXIocCA9PiBwLm5hbWUgPT09IG5hbWUgfHwgcC5ob3N0ID09PSBuYW1lKVxuICApO1xufTtcblxuY29uc3Qgc2l0ZXMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiByZWFkKCdzaXRlcycsIG9wdGlvbnMpIHx8IFtdO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoa2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhvcHRpb25zKSkge1xuICAgIGNyZWF0ZShvcHRpb25zKTtcbiAgfVxuXG4gIGxldCBjb25maWcgPSByZWFkKG51bGwsIG9wdGlvbnMpIHx8IHt9O1xuICBjb25maWdba2V5XSA9IHZhbHVlO1xuXG4gIGxldCBmaWxlQ29udGVudHMgPSBKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDIpO1xuXG4gIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsIGZpbGVDb250ZW50cyk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuY29uc3QgdXBkYXRlU2l0ZSA9IChuYW1lLCB1cGRhdGVzID0ge30sIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IHNpdGVCeU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGlmICghc2l0ZSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICBsZXQgY3VycmVudFNpdGVzID0gc2l0ZXMob3B0aW9ucyk7XG4gIGxldCBpZHggPSBfLmZpbmRJbmRleChjdXJyZW50U2l0ZXMsIChzKSA9PiBzLm5hbWUgPT09IHNpdGUubmFtZSB8fCBzLmhvc3QgPT09IHNpdGUuaG9zdCk7XG4gIGN1cnJlbnRTaXRlc1tpZHhdID0gT2JqZWN0LmFzc2lnbih7fSwgc2l0ZSwgdXBkYXRlcyk7XG5cbiAgd3JpdGUoJ3NpdGVzJywgY3VycmVudFNpdGVzLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IHJlYWQgPSAoa2V5LCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVQYXRoID0gcGF0aEZyb21PcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmICghY29uZmlnRXhpc3RzKG9wdGlvbnMpKSB7XG4gICAgaWYgKGZpbGVQYXRoID09PSBMT0NBTF9DT05GSUcgJiYgY29uZmlnRXhpc3RzKE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtjb25maWdQYXRoOiBmaWxlUGF0aH0pKSkge1xuICAgICAgZmlsZVBhdGggPSBHTE9CQUxfQ09ORklHO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgQ3VzdG9tRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZmlsZSBub3QgZm91bmQhJyk7XG4gICAgfVxuICB9XG5cbiAgbGV0IGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gIGxldCBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblxuICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gcGFyc2VkRGF0YVtrZXldO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXJzZWREYXRhO1xuICB9XG59O1xuXG5jb25zdCBjcmVhdGUgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhvcHRpb25zKSkge1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsICd7fScpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgcGF0aEZyb21PcHRpb25zID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAoKF8uaGFzKG9wdGlvbnMsICdnbG9iYWwnKSAmJiBvcHRpb25zLmdsb2JhbCA9PT0gdHJ1ZSkpIHtcbiAgICByZXR1cm4gR0xPQkFMX0NPTkZJRztcbiAgfSBlbHNlIGlmIChfLmhhcyhvcHRpb25zLCAnbG9jYWwnKSAmJiBvcHRpb25zLmxvY2FsID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZpbmRMb2NhbENvbmZpZygpO1xuICB9IGVsc2UgaWYgKF8uaGFzKG9wdGlvbnMsICdjb25maWdQYXRoJykgfHwgXy5oYXMob3B0aW9ucywgJ2NvbmZpZ19wYXRoJykpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5jb25maWdQYXRoIHx8IG9wdGlvbnMuY29uZmlnX3BhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZpbmRMb2NhbENvbmZpZygpO1xuICB9XG59O1xuXG5jb25zdCBmaWxlRXhpc3RzID0gKGZpbGVQYXRoKSA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgY29uZmlnRXhpc3RzID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZmlsZUV4aXN0cyhwYXRoRnJvbU9wdGlvbnMob3B0aW9ucykpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBzaXRlQnlOYW1lLFxuICBzaXRlcyxcbiAgd3JpdGUsXG4gIHVwZGF0ZVNpdGUsXG4gIHJlYWQsXG4gIGNyZWF0ZSxcbiAgcGF0aEZyb21PcHRpb25zLFxuICBjb25maWdFeGlzdHNcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBtaW1lIGZyb20gJ21pbWUtdHlwZS93aXRoLWRiJztcblxubWltZS5kZWZpbmUoJ2FwcGxpY2F0aW9uL3ZuZC52b29nLmRlc2lnbi5jdXN0b20rbGlxdWlkJywge2V4dGVuc2lvbnM6IFsndHBsJ119LCBtaW1lLmR1cE92ZXJ3cml0ZSk7XG5cbmNvbnN0IGJ5TmFtZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlQnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xufTtcblxuY29uc3QgYWRkID0gKGRhdGEsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAoXy5oYXMoZGF0YSwgJ2hvc3QnKSAmJiBfLmhhcyhkYXRhLCAndG9rZW4nKSkge1xuICAgIGxldCBzaXRlcyA9IGNvbmZpZy5zaXRlcyhvcHRpb25zKTtcblxuICAgIC8vIHVwZGF0ZXMgY29uZmlnIGlmIGV4dHJhIG9wdGlvbnMgYXJlIHByb3ZpZGVkIGFuZCBnaXZlbiBzaXRlIGFscmVhZHkgZXhpc3RzXG4gICAgdmFyIG1hdGNoU2l0ZSA9IHNpdGUgPT4gc2l0ZS5ob3N0ID09PSBkYXRhLmhvc3QgfHwgc2l0ZS5uYW1lID09PSBkYXRhLm5hbWU7XG4gICAgaWYgKHNpdGVzLmZpbHRlcihtYXRjaFNpdGUpLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBpZHggPSBfLmZpbmRJbmRleChzaXRlcywgbWF0Y2hTaXRlKTtcbiAgICAgIHNpdGVzW2lkeF0gPSBPYmplY3QuYXNzaWduKHt9LCBzaXRlc1tpZHhdLCBkYXRhKTsgLy8gbWVyZ2Ugb2xkIGFuZCBuZXcgdmFsdWVzXG4gICAgfSBlbHNlIHtcbiAgICAgIHNpdGVzID0gW2RhdGFdLmNvbmNhdChzaXRlcyk7IC8vIG90aGVyd2lzZSBhZGQgbmV3IHNpdGUgdG8gY29uZmlnXG4gICAgfVxuICAgIGNvbmZpZy53cml0ZSgnc2l0ZXMnLCBzaXRlcywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCByZW1vdmUgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlc0luQ29uZmlnID0gY29uZmlnLnNpdGVzKG9wdGlvbnMpO1xuICBsZXQgc2l0ZU5hbWVzID0gc2l0ZXNJbkNvbmZpZy5tYXAoc2l0ZSA9PiBzaXRlLm5hbWUgfHwgc2l0ZS5ob3N0KTtcbiAgbGV0IGlkeCA9IHNpdGVOYW1lcy5pbmRleE9mKG5hbWUpO1xuICBpZiAoaWR4IDwgMCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgbGV0IGZpbmFsU2l0ZXMgPSBzaXRlc0luQ29uZmlnXG4gICAgLnNsaWNlKDAsIGlkeClcbiAgICAuY29uY2F0KHNpdGVzSW5Db25maWcuc2xpY2UoaWR4ICsgMSkpO1xuXG4gIHJldHVybiBjb25maWcud3JpdGUoJ3NpdGVzJywgZmluYWxTaXRlcywgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBnZXRGaWxlSW5mbyA9IChmaWxlUGF0aCkgPT4ge1xuICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGZpbGVQYXRoKTtcblxuICBpZiAoc3RhdC5pc0ZpbGUoKSkge1xuICAgIGxldCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpO1xuICAgIHJldHVybiB7XG4gICAgICBmaWxlOiBmaWxlTmFtZSxcbiAgICAgIHNpemU6IHN0YXQuc2l6ZSxcbiAgICAgIGNvbnRlbnRUeXBlOiBtaW1lLmxvb2t1cChmaWxlTmFtZSksXG4gICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgIHVwZGF0ZWRBdDogc3RhdC5tdGltZVxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG5jb25zdCB0b3RhbEZpbGVzRm9yID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVzID0gZmlsZXNGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gT2JqZWN0LmtleXMoZmlsZXMpLnJlZHVjZSgodG90YWwsIGZvbGRlcikgPT4gdG90YWwgKyBmaWxlc1tmb2xkZXJdLmxlbmd0aCwgMCk7XG59O1xuXG5jb25zdCBmaWxlc0ZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZvbGRlcnMgPSBbXG4gICAgJ2Fzc2V0cycsICdjb21wb25lbnRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdsYXlvdXRzJywgJ3N0eWxlc2hlZXRzJ1xuICBdO1xuXG4gIGxldCB3b3JraW5nRGlyID0gZGlyRm9yKG5hbWUsIG9wdGlvbnMpO1xuXG4gIGxldCByb290ID0gZmlsZVV0aWxzLmxpc3RGb2xkZXJzKHdvcmtpbmdEaXIpO1xuXG4gIGlmIChyb290KSB7XG4gICAgcmV0dXJuIGZvbGRlcnMucmVkdWNlKChzdHJ1Y3R1cmUsIGZvbGRlcikgPT4ge1xuICAgICAgaWYgKHJvb3QuaW5kZXhPZihmb2xkZXIpID49IDApIHtcbiAgICAgICAgbGV0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4od29ya2luZ0RpciwgZm9sZGVyKTtcbiAgICAgICAgc3RydWN0dXJlW2ZvbGRlcl0gPSBmaWxlVXRpbHMubGlzdEZpbGVzKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuICAgICAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgcmV0dXJuIHN0YXQuaXNGaWxlKCk7XG4gICAgICAgIH0pLm1hcChmaWxlID0+IHtcbiAgICAgICAgICBsZXQgZnVsbFBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZSk7XG5cbiAgICAgICAgICByZXR1cm4gZ2V0RmlsZUluZm8oZnVsbFBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJ1Y3R1cmU7XG4gICAgfSwge30pO1xuICB9XG59O1xuXG5jb25zdCBkaXJGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBpZiAob3B0aW9ucy5kaXIgfHwgb3B0aW9ucy5wYXRoKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZGlyIHx8IG9wdGlvbnMucGF0aDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuZGlyIHx8IHNpdGUucGF0aDtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBob3N0bmFtZSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIG5hbWUgaW4gdGhlIGNvbmZpZ3VyYXRpb25cbiAqIFByZWZlcnMgZXhwbGljaXQgb3B0aW9ucyBvdmVyIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgdmFsdWVzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgICAgICAgICBTaXRlIG5hbWUgaW4gdGhlIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSAge09iamVjdH0gW29wdGlvbnM9e31dIE9iamVjdCB3aXRoIHZhbHVlcyB0aGF0IG92ZXJyaWRlIGRlZmF1bHQgY29uZmlndXJhdGlvbiB2YWx1ZXNcbiAqIEByZXR1cm4ge3N0cmluZz99ICAgICAgICAgICAgIFRoZSBmaW5hbCBob3N0bmFtZSBmb3IgdGhlIGdpdmVuIG5hbWVcbiAqL1xuY29uc3QgaG9zdEZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGxldCBob3N0O1xuICBpZiAob3B0aW9ucy5ob3N0KSB7XG4gICAgaG9zdCA9IG9wdGlvbnMuaG9zdDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgaG9zdCA9IHNpdGUuaG9zdDtcbiAgfVxuICBpZiAoaG9zdCkge1xuICAgIHJldHVybiAob3B0aW9ucy5wcm90b2NvbCA/IGAke29wdGlvbnMucHJvdG9jb2x9Oi8vYCA6ICcnKSArIGhvc3QucmVwbGFjZSgvXmh0dHBzPzpcXC9cXC8vLCAnJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIEFQSSB0b2tlbiBmb3IgdGhlIGdpdmVuIHNpdGUgbmFtZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lICAgICAgICAgU2l0ZSBuYW1lIGluIHRoZSBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gIHtPYmplY3R9IFtvcHRpb25zPXt9XSBPYmplY3Qgd2l0aCB2YWx1ZXMgdGhhdCBvdmVycmlkZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gdmFsdWVzXG4gKiBAcmV0dXJuIHtzdHJpbmc/fSAgICAgICAgICAgICBUaGUgQVBJIHRva2VuIGZvciB0aGUgZ2l2ZW4gc2l0ZVxuICovXG5jb25zdCB0b2tlbkZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGlmIChvcHRpb25zLnRva2VuIHx8IG9wdGlvbnMuYXBpX3Rva2VuKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMudG9rZW4gfHwgb3B0aW9ucy5hcGlfdG9rZW47XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLnRva2VuIHx8IHNpdGUuYXBpX3Rva2VuO1xuICB9XG59O1xuXG5jb25zdCBuYW1lcyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMob3B0aW9ucykubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG59O1xuXG5jb25zdCBob3N0cyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMob3B0aW9ucykubWFwKHNpdGUgPT4gc2l0ZS5ob3N0KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgYnlOYW1lLFxuICBhZGQsXG4gIHJlbW92ZSxcbiAgdG90YWxGaWxlc0ZvcixcbiAgZmlsZXNGb3IsXG4gIGRpckZvcixcbiAgaG9zdEZvcixcbiAgdG9rZW5Gb3IsXG4gIG5hbWVzLFxuICBob3N0cyxcbiAgZ2V0RmlsZUluZm9cbn07XG4iLCJ2YXIgYmFiZWxIZWxwZXJzID0ge307XG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iajtcbn0gOiBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqO1xufTtcblxuZXhwb3J0IHZhciBqc3ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBSRUFDVF9FTEVNRU5UX1RZUEUgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLmZvciAmJiBTeW1ib2wuZm9yKFwicmVhY3QuZWxlbWVudFwiKSB8fCAweGVhYzc7XG4gIHJldHVybiBmdW5jdGlvbiBjcmVhdGVSYXdSZWFjdEVsZW1lbnQodHlwZSwgcHJvcHMsIGtleSwgY2hpbGRyZW4pIHtcbiAgICB2YXIgZGVmYXVsdFByb3BzID0gdHlwZSAmJiB0eXBlLmRlZmF1bHRQcm9wcztcbiAgICB2YXIgY2hpbGRyZW5MZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoIC0gMztcblxuICAgIGlmICghcHJvcHMgJiYgY2hpbGRyZW5MZW5ndGggIT09IDApIHtcbiAgICAgIHByb3BzID0ge307XG4gICAgfVxuXG4gICAgaWYgKHByb3BzICYmIGRlZmF1bHRQcm9wcykge1xuICAgICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gZGVmYXVsdFByb3BzKSB7XG4gICAgICAgIGlmIChwcm9wc1twcm9wTmFtZV0gPT09IHZvaWQgMCkge1xuICAgICAgICAgIHByb3BzW3Byb3BOYW1lXSA9IGRlZmF1bHRQcm9wc1twcm9wTmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCFwcm9wcykge1xuICAgICAgcHJvcHMgPSBkZWZhdWx0UHJvcHMgfHwge307XG4gICAgfVxuXG4gICAgaWYgKGNoaWxkcmVuTGVuZ3RoID09PSAxKSB7XG4gICAgICBwcm9wcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIH0gZWxzZSBpZiAoY2hpbGRyZW5MZW5ndGggPiAxKSB7XG4gICAgICB2YXIgY2hpbGRBcnJheSA9IEFycmF5KGNoaWxkcmVuTGVuZ3RoKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNoaWxkQXJyYXlbaV0gPSBhcmd1bWVudHNbaSArIDNdO1xuICAgICAgfVxuXG4gICAgICBwcm9wcy5jaGlsZHJlbiA9IGNoaWxkQXJyYXk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICQkdHlwZW9mOiBSRUFDVF9FTEVNRU5UX1RZUEUsXG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAga2V5OiBrZXkgPT09IHVuZGVmaW5lZCA/IG51bGwgOiAnJyArIGtleSxcbiAgICAgIHJlZjogbnVsbCxcbiAgICAgIHByb3BzOiBwcm9wcyxcbiAgICAgIF9vd25lcjogbnVsbFxuICAgIH07XG4gIH07XG59KCk7XG5cbmV4cG9ydCB2YXIgYXN5bmNJdGVyYXRvciA9IGZ1bmN0aW9uIChpdGVyYWJsZSkge1xuICBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgaWYgKFN5bWJvbC5hc3luY0l0ZXJhdG9yKSB7XG4gICAgICB2YXIgbWV0aG9kID0gaXRlcmFibGVbU3ltYm9sLmFzeW5jSXRlcmF0b3JdO1xuICAgICAgaWYgKG1ldGhvZCAhPSBudWxsKSByZXR1cm4gbWV0aG9kLmNhbGwoaXRlcmFibGUpO1xuICAgIH1cblxuICAgIGlmIChTeW1ib2wuaXRlcmF0b3IpIHtcbiAgICAgIHJldHVybiBpdGVyYWJsZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBpcyBub3QgYXN5bmMgaXRlcmFibGVcIik7XG59O1xuXG5leHBvcnQgdmFyIGFzeW5jR2VuZXJhdG9yID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBBd2FpdFZhbHVlKHZhbHVlKSB7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gQXN5bmNHZW5lcmF0b3IoZ2VuKSB7XG4gICAgdmFyIGZyb250LCBiYWNrO1xuXG4gICAgZnVuY3Rpb24gc2VuZChrZXksIGFyZykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgYXJnOiBhcmcsXG4gICAgICAgICAgcmVzb2x2ZTogcmVzb2x2ZSxcbiAgICAgICAgICByZWplY3Q6IHJlamVjdCxcbiAgICAgICAgICBuZXh0OiBudWxsXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGJhY2spIHtcbiAgICAgICAgICBiYWNrID0gYmFjay5uZXh0ID0gcmVxdWVzdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmcm9udCA9IGJhY2sgPSByZXF1ZXN0O1xuICAgICAgICAgIHJlc3VtZShrZXksIGFyZyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc3VtZShrZXksIGFyZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGdlbltrZXldKGFyZyk7XG4gICAgICAgIHZhciB2YWx1ZSA9IHJlc3VsdC52YWx1ZTtcblxuICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBBd2FpdFZhbHVlKSB7XG4gICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlLnZhbHVlKS50aGVuKGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgICAgIHJlc3VtZShcIm5leHRcIiwgYXJnKTtcbiAgICAgICAgICB9LCBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXN1bWUoXCJ0aHJvd1wiLCBhcmcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNldHRsZShyZXN1bHQuZG9uZSA/IFwicmV0dXJuXCIgOiBcIm5vcm1hbFwiLCByZXN1bHQudmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgc2V0dGxlKFwidGhyb3dcIiwgZXJyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR0bGUodHlwZSwgdmFsdWUpIHtcbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIFwicmV0dXJuXCI6XG4gICAgICAgICAgZnJvbnQucmVzb2x2ZSh7XG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBkb25lOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBcInRocm93XCI6XG4gICAgICAgICAgZnJvbnQucmVqZWN0KHZhbHVlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGZyb250LnJlc29sdmUoe1xuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgZG9uZTogZmFsc2VcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgZnJvbnQgPSBmcm9udC5uZXh0O1xuXG4gICAgICBpZiAoZnJvbnQpIHtcbiAgICAgICAgcmVzdW1lKGZyb250LmtleSwgZnJvbnQuYXJnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhY2sgPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2ludm9rZSA9IHNlbmQ7XG5cbiAgICBpZiAodHlwZW9mIGdlbi5yZXR1cm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5yZXR1cm4gPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuYXN5bmNJdGVyYXRvcikge1xuICAgIEFzeW5jR2VuZXJhdG9yLnByb3RvdHlwZVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICB9XG5cbiAgQXN5bmNHZW5lcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoYXJnKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ludm9rZShcIm5leHRcIiwgYXJnKTtcbiAgfTtcblxuICBBc3luY0dlbmVyYXRvci5wcm90b3R5cGUudGhyb3cgPSBmdW5jdGlvbiAoYXJnKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ludm9rZShcInRocm93XCIsIGFyZyk7XG4gIH07XG5cbiAgQXN5bmNHZW5lcmF0b3IucHJvdG90eXBlLnJldHVybiA9IGZ1bmN0aW9uIChhcmcpIHtcbiAgICByZXR1cm4gdGhpcy5faW52b2tlKFwicmV0dXJuXCIsIGFyZyk7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICB3cmFwOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgQXN5bmNHZW5lcmF0b3IoZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICB9O1xuICAgIH0sXG4gICAgYXdhaXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIG5ldyBBd2FpdFZhbHVlKHZhbHVlKTtcbiAgICB9XG4gIH07XG59KCk7XG5cbmV4cG9ydCB2YXIgYXN5bmNHZW5lcmF0b3JEZWxlZ2F0ZSA9IGZ1bmN0aW9uIChpbm5lciwgYXdhaXRXcmFwKSB7XG4gIHZhciBpdGVyID0ge30sXG4gICAgICB3YWl0aW5nID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gcHVtcChrZXksIHZhbHVlKSB7XG4gICAgd2FpdGluZyA9IHRydWU7XG4gICAgdmFsdWUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgICAgcmVzb2x2ZShpbm5lcltrZXldKHZhbHVlKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgdmFsdWU6IGF3YWl0V3JhcCh2YWx1ZSlcbiAgICB9O1xuICB9XG5cbiAgO1xuXG4gIGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yKSB7XG4gICAgaXRlcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgfVxuXG4gIGl0ZXIubmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh3YWl0aW5nKSB7XG4gICAgICB3YWl0aW5nID0gZmFsc2U7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHB1bXAoXCJuZXh0XCIsIHZhbHVlKTtcbiAgfTtcblxuICBpZiAodHlwZW9mIGlubmVyLnRocm93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBpdGVyLnRocm93ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAod2FpdGluZykge1xuICAgICAgICB3YWl0aW5nID0gZmFsc2U7XG4gICAgICAgIHRocm93IHZhbHVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHVtcChcInRocm93XCIsIHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBpbm5lci5yZXR1cm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGl0ZXIucmV0dXJuID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gcHVtcChcInJldHVyblwiLCB2YWx1ZSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBpdGVyO1xufTtcblxuZXhwb3J0IHZhciBhc3luY1RvR2VuZXJhdG9yID0gZnVuY3Rpb24gKGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGdlbiA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGZ1bmN0aW9uIHN0ZXAoa2V5LCBhcmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgaW5mbyA9IGdlbltrZXldKGFyZyk7XG4gICAgICAgICAgdmFyIHZhbHVlID0gaW5mby52YWx1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbmZvLmRvbmUpIHtcbiAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgc3RlcChcIm5leHRcIiwgdmFsdWUpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHN0ZXAoXCJ0aHJvd1wiLCBlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdGVwKFwibmV4dFwiKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbmV4cG9ydCB2YXIgY2xhc3NDYWxsQ2hlY2sgPSBmdW5jdGlvbiAoaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7XG4gIGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTtcbiAgfVxufTtcblxuZXhwb3J0IHZhciBjcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTtcbiAgICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTtcbiAgICAgIGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpO1xuICAgIHJldHVybiBDb25zdHJ1Y3RvcjtcbiAgfTtcbn0oKTtcblxuZXhwb3J0IHZhciBkZWZpbmVFbnVtZXJhYmxlUHJvcGVydGllcyA9IGZ1bmN0aW9uIChvYmosIGRlc2NzKSB7XG4gIGZvciAodmFyIGtleSBpbiBkZXNjcykge1xuICAgIHZhciBkZXNjID0gZGVzY3Nba2V5XTtcbiAgICBkZXNjLmNvbmZpZ3VyYWJsZSA9IGRlc2MuZW51bWVyYWJsZSA9IHRydWU7XG4gICAgaWYgKFwidmFsdWVcIiBpbiBkZXNjKSBkZXNjLndyaXRhYmxlID0gdHJ1ZTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIGRlc2MpO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbmV4cG9ydCB2YXIgZGVmYXVsdHMgPSBmdW5jdGlvbiAob2JqLCBkZWZhdWx0cykge1xuICB2YXIga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGRlZmF1bHRzKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICB2YXIgdmFsdWUgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGRlZmF1bHRzLCBrZXkpO1xuXG4gICAgaWYgKHZhbHVlICYmIHZhbHVlLmNvbmZpZ3VyYWJsZSAmJiBvYmpba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxuZXhwb3J0IHZhciBkZWZpbmVQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvYmosIGtleSwgdmFsdWUpIHtcbiAgaWYgKGtleSBpbiBvYmopIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIG9ialtrZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7XG4gICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydCB2YXIgZ2V0ID0gZnVuY3Rpb24gZ2V0KG9iamVjdCwgcHJvcGVydHksIHJlY2VpdmVyKSB7XG4gIGlmIChvYmplY3QgPT09IG51bGwpIG9iamVjdCA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbiAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgcHJvcGVydHkpO1xuXG4gIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCk7XG5cbiAgICBpZiAocGFyZW50ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZ2V0KHBhcmVudCwgcHJvcGVydHksIHJlY2VpdmVyKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoXCJ2YWx1ZVwiIGluIGRlc2MpIHtcbiAgICByZXR1cm4gZGVzYy52YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgZ2V0dGVyID0gZGVzYy5nZXQ7XG5cbiAgICBpZiAoZ2V0dGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGdldHRlci5jYWxsKHJlY2VpdmVyKTtcbiAgfVxufTtcblxuZXhwb3J0IHZhciBpbmhlcml0cyA9IGZ1bmN0aW9uIChzdWJDbGFzcywgc3VwZXJDbGFzcykge1xuICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyk7XG4gIH1cblxuICBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IHN1YkNsYXNzLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH1cbiAgfSk7XG4gIGlmIChzdXBlckNsYXNzKSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3Quc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIDogc3ViQ2xhc3MuX19wcm90b19fID0gc3VwZXJDbGFzcztcbn07XG5cbnZhciBfaW5zdGFuY2VvZiA9IGZ1bmN0aW9uIChsZWZ0LCByaWdodCkge1xuICBpZiAocmlnaHQgIT0gbnVsbCAmJiB0eXBlb2YgU3ltYm9sICE9PSBcInVuZGVmaW5lZFwiICYmIHJpZ2h0W1N5bWJvbC5oYXNJbnN0YW5jZV0pIHtcbiAgICByZXR1cm4gcmlnaHRbU3ltYm9sLmhhc0luc3RhbmNlXShsZWZ0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbGVmdCBpbnN0YW5jZW9mIHJpZ2h0O1xuICB9XG59O1xuXG5leHBvcnQgdmFyIGludGVyb3BSZXF1aXJlRGVmYXVsdCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHtcbiAgICBkZWZhdWx0OiBvYmpcbiAgfTtcbn07XG5cbmV4cG9ydCB2YXIgaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkge1xuICAgIHJldHVybiBvYmo7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG5ld09iaiA9IHt9O1xuXG4gICAgaWYgKG9iaiAhPSBudWxsKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIG5ld09iai5kZWZhdWx0ID0gb2JqO1xuICAgIHJldHVybiBuZXdPYmo7XG4gIH1cbn07XG5cbmV4cG9ydCB2YXIgbmV3QXJyb3dDaGVjayA9IGZ1bmN0aW9uIChpbm5lclRoaXMsIGJvdW5kVGhpcykge1xuICBpZiAoaW5uZXJUaGlzICE9PSBib3VuZFRoaXMpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGluc3RhbnRpYXRlIGFuIGFycm93IGZ1bmN0aW9uXCIpO1xuICB9XG59O1xuXG5leHBvcnQgdmFyIG9iamVjdERlc3RydWN0dXJpbmdFbXB0eSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgaWYgKG9iaiA9PSBudWxsKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGRlc3RydWN0dXJlIHVuZGVmaW5lZFwiKTtcbn07XG5cbmV4cG9ydCB2YXIgb2JqZWN0V2l0aG91dFByb3BlcnRpZXMgPSBmdW5jdGlvbiAob2JqLCBrZXlzKSB7XG4gIHZhciB0YXJnZXQgPSB7fTtcblxuICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgIGlmIChrZXlzLmluZGV4T2YoaSkgPj0gMCkgY29udGludWU7XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBpKSkgY29udGludWU7XG4gICAgdGFyZ2V0W2ldID0gb2JqW2ldO1xuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydCB2YXIgcG9zc2libGVDb25zdHJ1Y3RvclJldHVybiA9IGZ1bmN0aW9uIChzZWxmLCBjYWxsKSB7XG4gIGlmICghc2VsZikge1xuICAgIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTtcbiAgfVxuXG4gIHJldHVybiBjYWxsICYmICh0eXBlb2YgY2FsbCA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSA/IGNhbGwgOiBzZWxmO1xufTtcblxuZXhwb3J0IHZhciBzZWxmR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiBnbG9iYWw7XG5cbmV4cG9ydCB2YXIgc2V0ID0gZnVuY3Rpb24gc2V0KG9iamVjdCwgcHJvcGVydHksIHZhbHVlLCByZWNlaXZlcikge1xuICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBwcm9wZXJ0eSk7XG5cbiAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTtcblxuICAgIGlmIChwYXJlbnQgIT09IG51bGwpIHtcbiAgICAgIHNldChwYXJlbnQsIHByb3BlcnR5LCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChcInZhbHVlXCIgaW4gZGVzYyAmJiBkZXNjLndyaXRhYmxlKSB7XG4gICAgZGVzYy52YWx1ZSA9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHZhciBzZXR0ZXIgPSBkZXNjLnNldDtcblxuICAgIGlmIChzZXR0ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgc2V0dGVyLmNhbGwocmVjZWl2ZXIsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5leHBvcnQgdmFyIHNsaWNlZFRvQXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIHNsaWNlSXRlcmF0b3IoYXJyLCBpKSB7XG4gICAgdmFyIF9hcnIgPSBbXTtcbiAgICB2YXIgX24gPSB0cnVlO1xuICAgIHZhciBfZCA9IGZhbHNlO1xuICAgIHZhciBfZSA9IHVuZGVmaW5lZDtcblxuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7XG4gICAgICAgIF9hcnIucHVzaChfcy52YWx1ZSk7XG5cbiAgICAgICAgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgX2QgPSB0cnVlO1xuICAgICAgX2UgPSBlcnI7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0pIF9pW1wicmV0dXJuXCJdKCk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAoX2QpIHRocm93IF9lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfYXJyO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgICByZXR1cm4gYXJyO1xuICAgIH0gZWxzZSBpZiAoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSB7XG4gICAgICByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBhdHRlbXB0IHRvIGRlc3RydWN0dXJlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZVwiKTtcbiAgICB9XG4gIH07XG59KCk7XG5cbmV4cG9ydCB2YXIgc2xpY2VkVG9BcnJheUxvb3NlID0gZnVuY3Rpb24gKGFyciwgaSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgcmV0dXJuIGFycjtcbiAgfSBlbHNlIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpIHtcbiAgICB2YXIgX2FyciA9IFtdO1xuXG4gICAgZm9yICh2YXIgX2l0ZXJhdG9yID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXA7ICEoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lOykge1xuICAgICAgX2Fyci5wdXNoKF9zdGVwLnZhbHVlKTtcblxuICAgICAgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBfYXJyO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlXCIpO1xuICB9XG59O1xuXG5leHBvcnQgdmFyIHRhZ2dlZFRlbXBsYXRlTGl0ZXJhbCA9IGZ1bmN0aW9uIChzdHJpbmdzLCByYXcpIHtcbiAgcmV0dXJuIE9iamVjdC5mcmVlemUoT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc3RyaW5ncywge1xuICAgIHJhdzoge1xuICAgICAgdmFsdWU6IE9iamVjdC5mcmVlemUocmF3KVxuICAgIH1cbiAgfSkpO1xufTtcblxuZXhwb3J0IHZhciB0YWdnZWRUZW1wbGF0ZUxpdGVyYWxMb29zZSA9IGZ1bmN0aW9uIChzdHJpbmdzLCByYXcpIHtcbiAgc3RyaW5ncy5yYXcgPSByYXc7XG4gIHJldHVybiBzdHJpbmdzO1xufTtcblxuZXhwb3J0IHZhciB0ZW1wb3JhbFJlZiA9IGZ1bmN0aW9uICh2YWwsIG5hbWUsIHVuZGVmKSB7XG4gIGlmICh2YWwgPT09IHVuZGVmKSB7XG4gICAgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKG5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZCAtIHRlbXBvcmFsIGRlYWQgem9uZVwiKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsO1xuICB9XG59O1xuXG5leHBvcnQgdmFyIHRlbXBvcmFsVW5kZWZpbmVkID0ge307XG5cbmV4cG9ydCB2YXIgdG9BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXJyKSA/IGFyciA6IEFycmF5LmZyb20oYXJyKTtcbn07XG5cbmV4cG9ydCB2YXIgdG9Db25zdW1hYmxlQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KGFycikpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgYXJyMiA9IEFycmF5KGFyci5sZW5ndGgpOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBhcnIyW2ldID0gYXJyW2ldO1xuXG4gICAgcmV0dXJuIGFycjI7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oYXJyKTtcbiAgfVxufTtcblxuYmFiZWxIZWxwZXJzO1xuXG5leHBvcnQgeyBfdHlwZW9mIGFzIHR5cGVvZiwgX2V4dGVuZHMgYXMgZXh0ZW5kcywgX2luc3RhbmNlb2YgYXMgaW5zdGFuY2VvZiB9IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgc2l0ZXMgZnJvbSAnLi9zaXRlcyc7XG5pbXBvcnQgVm9vZyBmcm9tICd2b29nJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UHJvbWlzZX0gZnJvbSAnYmx1ZWJpcmQnO1xuXG5jb25zdCBjbGllbnRGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBob3N0ID0gc2l0ZXMuaG9zdEZvcihuYW1lLCBvcHRpb25zKTtcbiAgbGV0IHRva2VuID0gc2l0ZXMudG9rZW5Gb3IobmFtZSwgb3B0aW9ucyk7XG4gIGxldCBwcm90b2NvbCA9IG9wdGlvbnMucHJvdG9jb2w7XG5cbiAgaWYgKGhvc3QgJiYgdG9rZW4pIHtcbiAgICByZXR1cm4gbmV3IFZvb2coaG9zdCwgdG9rZW4sIHByb3RvY29sKTtcbiAgfVxufTtcblxuY29uc3QgZ2V0VG90YWxGaWxlQ291bnQgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgUHJvbWlzZS5hbGwoW2dldExheW91dHMobmFtZSwgb3B0aW9ucyksIGdldExheW91dEFzc2V0cyhuYW1lLCBvcHRpb25zKV0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICByZXNvbHZlKGxheW91dHMubGVuZ3RoICsgYXNzZXRzLmxlbmd0aCk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRDb250ZW50cyA9IChzaXRlTmFtZSwgaWQsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShkYXRhLmJvZHkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dEFzc2V0Q29udGVudHMgPSAoc2l0ZU5hbWUsIGlkLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpLmxheW91dEFzc2V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgaWYgKGRhdGEuZWRpdGFibGUpIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLmRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLnB1YmxpY191cmwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dHMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucylcbiAgICAgIC5sYXlvdXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpXG4gICAgICAubGF5b3V0QXNzZXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0Rm9sZGVyQ29udGVudHMgPSAoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgc3dpdGNoIChmb2xkZXIpIHtcbiAgICBjYXNlICdsYXlvdXRzJzpcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4obGF5b3V0cyA9PiByZXNvbHZlKGxheW91dHMuZmlsdGVyKGwgPT4gIWwuY29tcG9uZW50KSkpLmNhdGNoKHJlamVjdCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjb21wb25lbnRzJzpcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4obGF5b3V0cyA9PiByZXNvbHZlKGxheW91dHMuZmlsdGVyKGwgPT4gbC5jb21wb25lbnQpKSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Fzc2V0cyc6XG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oYXNzZXRzID0+IHJlc29sdmUoYXNzZXRzLmZpbHRlcihhID0+ICFfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGEuYXNzZXRfdHlwZSkpKSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2ltYWdlcyc6XG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oYXNzZXRzID0+IHJlc29sdmUoYXNzZXRzLmZpbHRlcihhID0+IGEuYXNzZXRfdHlwZSA9PT0gJ2ltYWdlJykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnamF2YXNjcmlwdHMnOlxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGFzc2V0cyA9PiByZXNvbHZlKGFzc2V0cy5maWx0ZXIoYSA9PiBhLmFzc2V0X3R5cGUgPT09ICdqYXZhc2NyaXB0JykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc3R5bGVzaGVldHMnOlxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGFzc2V0cyA9PiByZXNvbHZlKGFzc2V0cy5maWx0ZXIoYSA9PiBhLmFzc2V0X3R5cGUgPT09ICdzdHlsZXNoZWV0JykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJlc29sdmUoW10pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlVHlwZUZvckZvbGRlciA9IChmb2xkZXIpID0+IHtcbiAgcmV0dXJuIHtcbiAgICAnbGF5b3V0cyc6ICdsYXlvdXQnLFxuICAgICdjb21wb25lbnRzJzogJ2xheW91dCcsXG4gICAgJ2Fzc2V0cyc6ICdhc3NldCcsXG4gICAgJ2ltYWdlcyc6ICdhc3NldCcsXG4gICAgJ2phdmFzY3JpcHRzJzogJ2Fzc2V0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnYXNzZXQnXG4gIH1bZm9sZGVyXTtcbn07XG5cbmNvbnN0IHB1bGxGb2xkZXIgPSAoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaWxlVHlwZSA9IGdldEZpbGVUeXBlRm9yRm9sZGVyKGZvbGRlcik7XG5cbiAgICBQcm9taXNlLmFsbChnZXRGb2xkZXJDb250ZW50cyhzaXRlTmFtZSwgZm9sZGVyLCBvcHRpb25zKSkudGhlbihmaWxlcyA9PiB7XG4gICAgICBQcm9taXNlLm1hcChmaWxlcywgZiA9PiB7XG4gICAgICAgIGxldCBmaWxlUGF0aDtcbiAgICAgICAgaWYgKGZpbGVUeXBlID09PSAnbGF5b3V0Jykge1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke2YuY29tcG9uZW50ID8gJ2NvbXBvbmVudHMnIDogJ2xheW91dHMnfS8ke25vcm1hbGl6ZVRpdGxlKGYudGl0bGUpfS50cGxgKTtcbiAgICAgICAgfSBlbHNlIGlmIChmaWxlVHlwZSA9PT0gJ2Fzc2V0Jykge1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgZi5hc3NldF90eXBlKSA/IGYuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2YuZmlsZW5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICAgICAgcmV0dXJuIHB1bGxGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdXNoRm9sZGVyID0gKHNpdGVOYW1lLCBmb2xkZXIsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmlsZVR5cGUgPSBnZXRGaWxlVHlwZUZvckZvbGRlcihmb2xkZXIpO1xuXG4gICAgUHJvbWlzZS5hbGwoZ2V0Rm9sZGVyQ29udGVudHMoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucykpLnRoZW4oZmlsZXMgPT4ge1xuICAgICAgUHJvbWlzZS5tYXAoZmlsZXMsIGYgPT4ge1xuICAgICAgICBsZXQgZmlsZVBhdGg7XG4gICAgICAgIGlmIChmaWxlVHlwZSA9PT0gJ2xheW91dCcpIHtcbiAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtmLmNvbXBvbmVudCA/ICdjb21wb25lbnRzJyA6ICdsYXlvdXRzJ30vJHtub3JtYWxpemVUaXRsZShmLnRpdGxlKX0udHBsYCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZmlsZVR5cGUgPT09ICdhc3NldCcpIHtcbiAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGYuYXNzZXRfdHlwZSkgPyBmLmFzc2V0X3R5cGUgOiAnYXNzZXQnfXMvJHtmLmZpbGVuYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICB9KS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgY29uc29sZS5sb2coJ3B1c2hBbGxGaWxlcycsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcblxuICAgIFByb21pc2UuYWxsKFtcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLFxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKVxuICAgIF0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgIGxheW91dHMubWFwKGwgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtsLmNvbXBvbmVudCA/ICdjb21wb25lbnRzJyA6ICdsYXlvdXRzJ30vJHtub3JtYWxpemVUaXRsZShsLnRpdGxlKX0udHBsYCk7XG4gICAgICAgICAgcmV0dXJuIHB1c2hGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH0pLmNvbmNhdChhc3NldHMubWFwKGEgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGEuYXNzZXRfdHlwZSkgPyBhLmFzc2V0X3R5cGUgOiAnYXNzZXQnfXMvJHthLmZpbGVuYW1lfWApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KSlcbiAgICAgIF0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0T3JDb21wb25lbnQgPSAoZmlsZU5hbWUsIGNvbXBvbmVudCwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgbmFtZSA9IG5vcm1hbGl6ZVRpdGxlKGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXQuY29tcG9uZW50JzogY29tcG9uZW50IHx8IGZhbHNlXG4gICAgfSwgKGVyciwgZGF0YSA9IFtdKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICBsZXQgcmV0ID0gZGF0YS5maWx0ZXIobCA9PiBub3JtYWxpemVUaXRsZShsLnRpdGxlKS50b0xvd2VyQ2FzZSgpID09IG5hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgICBpZiAocmV0Lmxlbmd0aCA9PT0gMCkgeyByZXNvbHZlKHVuZGVmaW5lZCk7IH1cbiAgICAgIHJlc29sdmUoXy5oZWFkKHJldCkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGZpbmRMYXlvdXRBc3NldCA9IChmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJldHVybiBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpLmxheW91dEFzc2V0cyh7XG4gICAgICBwZXJfcGFnZTogMjUwLFxuICAgICAgJ3EubGF5b3V0X2Fzc2V0LmZpbGVuYW1lJzogZmlsZU5hbWVcbiAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICByZXNvbHZlKF8uaGVhZChkYXRhKSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0RmlsZU5hbWVGcm9tUGF0aCA9IChmaWxlUGF0aCkgPT4ge1xuICByZXR1cm4gZmlsZVBhdGguc3BsaXQoJy8nKVsxXTtcbn07XG5cbmNvbnN0IGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUgPSAoZmlsZU5hbWUpID0+IHtcbiAgcmV0dXJuIF8uaGVhZChmaWxlTmFtZS5zcGxpdCgnLnRwbCcpKTtcbn07XG5cbmNvbnN0IGZpbmRGaWxlID0gKGZpbGVQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICBsZXQgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVQYXRoKTtcblxuICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICByZXR1cm4gZmluZExheW91dE9yQ29tcG9uZW50KGZpbGVOYW1lLCAodHlwZSA9PSAnY29tcG9uZW50JyksIHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmluZExheW91dEFzc2V0KGZpbGVOYW1lLCBzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIH1cbn07XG5cbmNvbnN0IHRpdGxlRnJvbUZpbGVuYW1lID0gKGZpbGVOYW1lKSA9PiB7XG4gIHJldHVybiBfLmhlYWQoZmlsZU5hbWUuc3BsaXQoJy4nKSkucmVwbGFjZSgvXy8sICcgJyk7XG59O1xuXG5jb25zdCBub3JtYWxpemVUaXRsZSA9ICh0aXRsZSkgPT4ge1xuICByZXR1cm4gdGl0bGUucmVwbGFjZSgvW15cXHdcXC1cXC5dL2csICdfJykudG9Mb3dlckNhc2UoKTtcbn07XG5cbmNvbnN0IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoID0gKHBhdGgpID0+IHtcbiAgbGV0IGZvbGRlciA9IHBhdGguc3BsaXQoJy8nKVswXTtcbiAgbGV0IGZvbGRlclRvVHlwZU1hcCA9IHtcbiAgICAnbGF5b3V0cyc6ICdsYXlvdXQnLFxuICAgICdjb21wb25lbnRzJzogJ2NvbXBvbmVudCcsXG4gICAgJ2Fzc2V0cyc6ICdhc3NldCcsXG4gICAgJ2ltYWdlcyc6ICdpbWFnZScsXG4gICAgJ2phdmFzY3JpcHRzJzogJ2phdmFzY3JpcHQnLFxuICAgICdzdHlsZXNoZWV0cyc6ICdzdHlsZXNoZWV0J1xuICB9O1xuXG4gIHJldHVybiBmb2xkZXJUb1R5cGVNYXBbZm9sZGVyXTtcbn07XG5cbmNvbnN0IGdldFR5cGVGcm9tRXh0ZW5zaW9uID0gKGZpbGVOYW1lKSA9PiB7XG4gIGlmIChmaWxlTmFtZS5zcGxpdCgnLicpLmxlbmd0aCA+IDEpIHtcbiAgICBsZXQgZXh0ZW5zaW9uID0gXy5sYXN0KGZpbGVOYW1lLnNwbGl0KCcuJykpO1xuXG4gICAgc3dpdGNoIChleHRlbnNpb24pIHtcbiAgICBjYXNlICdqcyc6XG4gICAgICByZXR1cm4gJ2phdmFzY3JpcHQnO1xuICAgIGNhc2UgJ2Nzcyc6XG4gICAgICByZXR1cm4gJ3N0eWxlc2hlZXQnO1xuICAgIGNhc2UgJ2pwZyc6XG4gICAgY2FzZSAncG5nJzpcbiAgICBjYXNlICdqcGVnJzpcbiAgICBjYXNlICdnaWYnOlxuICAgICAgcmV0dXJuICdpbWFnZSc7XG4gICAgY2FzZSAndHBsJzpcbiAgICAgIHJldHVybiAnbGF5b3V0JztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICdhc3NldCc7XG4gICAgfVxuICB9XG59O1xuXG5jb25zdCBnZXRTdWJmb2xkZXJGb3JUeXBlID0gKHR5cGUpID0+IHtcbiAgcmV0dXJuIHtcbiAgICAnYXNzZXQnOiAnYXNzZXRzJyxcbiAgICAnaW1hZ2UnOiAnaW1hZ2VzJyxcbiAgICAnamF2YXNjcmlwdCc6ICdqYXZhc2NyaXB0cycsXG4gICAgJ3N0eWxlc2hlZXQnOiAnc3R5bGVzaGVldHMnLFxuICAgICdjb21wb25lbnQnOiAnY29tcG9uZW50cycsXG4gICAgJ2xheW91dCc6ICdsYXlvdXRzJ1xuICB9W3R5cGVdO1xufTtcblxuY29uc3Qgbm9ybWFsaXplUGF0aCA9IChwYXRoLCBzaXRlRGlyKSA9PiB7XG4gIHJldHVybiBwYXRoXG4gICAgLnJlcGxhY2Uoc2l0ZURpciwgJycpXG4gICAgLnJlcGxhY2UoL15cXC8vLCAnJyk7XG59O1xuXG5jb25zdCB3cml0ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGUsIGRlc3RQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBpZiAoXy5pbmNsdWRlcyhPYmplY3Qua2V5cyhmaWxlKSwgJ2xheW91dF9uYW1lJykpIHtcbiAgICAgIGdldExheW91dENvbnRlbnRzKHNpdGVOYW1lLCBmaWxlLmlkLCBvcHRpb25zKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGZpbGUuZWRpdGFibGUpIHtcbiAgICAgIGdldExheW91dEFzc2V0Q29udGVudHMoc2l0ZU5hbWUsIGZpbGUuaWQsIG9wdGlvbnMpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZTsgfVxuICAgICAgICB9XG4gICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHVybCA9IGZpbGUucHVibGljX3VybDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlOyB9XG4gICAgICB9XG5cbiAgICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0UGF0aCk7XG4gICAgICBpZiAodXJsICYmIHN0cmVhbSkge1xuICAgICAgICBsZXQgcmVxID0gcmVxdWVzdC5nZXQodXJsKS5vbignZXJyb3InLCAoZXJyKSA9PiByZWplY3QoZXJyKSk7XG4gICAgICAgIHJlcS5waXBlKHN0cmVhbSk7XG4gICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWplY3QobnVsbCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IHVwbG9hZEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKE9iamVjdC5rZXlzKGZpbGUpLCAnbGF5b3V0X25hbWUnKSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXQoZmlsZS5pZCwge1xuICAgICAgICAgIGJvZHk6IGNvbnRlbnRzXG4gICAgICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGxldCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dEFzc2V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBkYXRhOiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5vdmVyd3JpdGUpIHtcbiAgICAgICAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgICAgICB2YXIgZmlsZU5hbWUgPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcbiAgICAgICAgZGVsZXRlRmlsZShzaXRlTmFtZSwgZmlsZU5hbWUsIG9wdGlvbnMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGNyZWF0ZUZpbGUoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zKS50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlUGF0aCwgbWVzc2FnZTogJ1VuYWJsZSB0byB1cGRhdGUgZmlsZSEnfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNyZWF0ZUZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKS50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGNyZWF0ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlUGF0aCk7XG4gICAgbGV0IGZpbGUgPSBmaWxlT2JqZWN0RnJvbVBhdGgoZmlsZVBhdGgpO1xuXG4gICAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgICBjbGllbnQuY3JlYXRlTGF5b3V0KGZpbGUsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZSwgbWVzc2FnZTogJ1VuYWJsZSB0byBjcmVhdGUgZmlsZSEnfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNsaWVudC5jcmVhdGVMYXlvdXRBc3NldChmaWxlLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBmaWxlT2JqZWN0RnJvbVBhdGggPSAoZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgbGV0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCk7XG5cbiAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiBfLmhhcyhvcHRpb25zLCAndGl0bGUnKSA/IG9wdGlvbnMudGl0bGUgOiB0aXRsZUZyb21GaWxlbmFtZShmaWxlTmFtZSksXG4gICAgICBjb21wb25lbnQ6IHR5cGUgPT0gJ2NvbXBvbmVudCcsXG4gICAgICBjb250ZW50X3R5cGU6IF8uaGFzKG9wdGlvbnMsICdjb250ZW50X3R5cGUnKSA/IG9wdGlvbnMuY29udGVudF90eXBlIDogJ3BhZ2UnLFxuICAgICAgYm9keTogZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpLFxuICAgICAgcGFyZW50X2lkOiBfLmhhcyhvcHRpb25zLCAncGFyZW50X2lkJykgPyBvcHRpb25zLnBhcmVudF9pZCA6IG51bGwsXG4gICAgICBwYXJlbnRfdGl0bGU6IF8uaGFzKG9wdGlvbnMsICdwYXJlbnRfdGl0bGUnKSA/IG9wdGlvbnMucGFyZW50X3RpdGxlIDogbnVsbFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgbGV0IG9iaiA9IHtcbiAgICAgIGZpbGVuYW1lOiBmaWxlTmFtZVxuICAgIH07XG5cbiAgICBpZiAoXy5pbmNsdWRlcyhbJ2phdmFzY3JpcHRzJywgJ3N0eWxlc2hlZXRzJ10sIHR5cGUpKSB7XG4gICAgICBvYmouZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqLmZpbGUgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGVQYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxufTtcblxuY29uc3QgcHVsbEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlUGF0aCwgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJ30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSh3cml0ZUZpbGUoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlUGF0aCwgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJ30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSh1cGxvYWRGaWxlKHNpdGVOYW1lLCBmaWxlLCBmaWxlUGF0aCwgb3B0aW9ucykpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGFkZEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZmlsZTtcbiAgICBsZXQgdHlwZTtcblxuICAgIGlmIChmaWxlTmFtZS5zcGxpdCgnLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZpbGUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVOYW1lLCBvcHRpb25zKTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGUgPSBmaWxlTmFtZTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbUV4dGVuc2lvbihmaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgbGV0IHN1YkZvbGRlciA9IGdldFN1YmZvbGRlckZvclR5cGUodHlwZSk7XG4gICAgbGV0IHByb2plY3REaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaW5hbFBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgc3ViRm9sZGVyLCBmaWxlKTtcblxuICAgIGxldCByZWxhdGl2ZVBhdGggPSBmaW5hbFBhdGgucmVwbGFjZShwcm9qZWN0RGlyICsgJy8nLCAnJyk7XG5cbiAgICBpZiAoZmlsZVV0aWxzLmZpbGVFeGlzdHMocmVsYXRpdmVQYXRoLCBvcHRpb25zKSB8fCB0eXBlb2YgZmlsZVV0aWxzLndyaXRlRmlsZShyZWxhdGl2ZVBhdGgsICcnKSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmVzb2x2ZShjcmVhdGVGaWxlKHNpdGVOYW1lLCByZWxhdGl2ZVBhdGgsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlTmFtZSwgbWVzc2FnZTogJ1VuYWJsZSB0byBjcmVhdGUgZmlsZSEnfSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGRlbGV0ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zKSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlTmFtZSk7XG5cbiAgICBmaW5kRmlsZShmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICAgICAgY2xpZW50LmRlbGV0ZUxheW91dChmaWxlLmlkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNsaWVudC5kZWxldGVMYXlvdXRBc3NldChmaWxlLmlkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCByZW1vdmVGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGZpbGU7XG4gICAgbGV0IHR5cGU7XG5cbiAgICBpZiAoZmlsZU5hbWUuc3BsaXQoJy8nKS5sZW5ndGggPiAxKSB7XG4gICAgICBmaWxlID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlTmFtZSwgb3B0aW9ucyk7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlID0gZmlsZU5hbWU7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21FeHRlbnNpb24oZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIGxldCBzdWJGb2xkZXIgPSBnZXRTdWJmb2xkZXJGb3JUeXBlKHR5cGUpO1xuICAgIGxldCBwcm9qZWN0RGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmluYWxQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIHN1YkZvbGRlciwgZmlsZSk7XG5cbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gZmluYWxQYXRoLnJlcGxhY2UocHJvamVjdERpciArICcvJywgJycpO1xuXG4gICAgaWYgKGZpbGVVdGlscy5maWxlRXhpc3RzKGZpbmFsUGF0aCwgb3B0aW9ucykgfHwgdHlwZW9mIGZpbGVVdGlscy5kZWxldGVGaWxlKHJlbGF0aXZlUGF0aCkgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJlc29sdmUoZGVsZXRlRmlsZShzaXRlTmFtZSwgcmVsYXRpdmVQYXRoLCBvcHRpb25zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZU5hbWUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gcmVtb3ZlIGZpbGUhJ30pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGNsaWVudEZvcixcbiAgZ2V0VG90YWxGaWxlQ291bnQsXG4gIHB1bGxBbGxGaWxlcyxcbiAgcHVzaEFsbEZpbGVzLFxuICBmaW5kRmlsZSxcbiAgcHVzaEZpbGUsXG4gIHB1bGxGaWxlLFxuICBwdWxsRm9sZGVyLFxuICBwdXNoRm9sZGVyLFxuICBjcmVhdGVGaWxlLFxuICBhZGRGaWxlLFxuICByZW1vdmVGaWxlXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQge3ZlcnNpb259IGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5cbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHNpdGVzIGZyb20gJy4vc2l0ZXMnO1xuaW1wb3J0IGFjdGlvbnMgZnJvbSAnLi9hY3Rpb25zJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICBmaWxlVXRpbHMsXG4gIGNvbmZpZyxcbiAgc2l0ZXMsXG4gIGFjdGlvbnMsXG4gIHZlcnNpb25cbn07XG4iXSwibmFtZXMiOlsibGlzdEZpbGVzIiwiZm9sZGVyUGF0aCIsImZzIiwicmVhZGRpclN5bmMiLCJmaWx0ZXIiLCJpdGVtIiwiaXRlbVBhdGgiLCJwYXRoIiwiam9pbiIsInN0YXRTeW5jIiwiaXNGaWxlIiwibGlzdEZvbGRlcnMiLCJpc0RpcmVjdG9yeSIsImdldEZpbGVDb250ZW50cyIsImZpbGVQYXRoIiwib3B0aW9ucyIsInJlYWRGaWxlU3luYyIsImZpbGVFeGlzdHMiLCJlIiwiZGVsZXRlRmlsZSIsInVubGlua1N5bmMiLCJ3cml0ZUZpbGUiLCJkYXRhIiwid3JpdGVGaWxlU3luYyIsInByb2Nlc3MiLCJjd2QiLCJDdXN0b21FcnJvciIsIm1lc3NhZ2UiLCJleHRyYSIsImNhcHR1cmVTdGFja1RyYWNlIiwiY29uc3RydWN0b3IiLCJuYW1lIiwiaW5oZXJpdHMiLCJFcnJvciIsIkNPTkZJR19GSUxFTkFNRSIsIkhPTUVESVIiLCJlbnYiLCJwbGF0Zm9ybSIsIkxPQ0FMRElSIiwiTE9DQUxfQ09ORklHIiwiR0xPQkFMX0NPTkZJRyIsImZpbmRMb2NhbENvbmZpZyIsInJlc29sdmUiLCJzaXRlQnlOYW1lIiwiXyIsImhlYWQiLCJzaXRlcyIsInAiLCJob3N0IiwicmVhZCIsIndyaXRlIiwia2V5IiwidmFsdWUiLCJwYXRoRnJvbU9wdGlvbnMiLCJjb25maWdFeGlzdHMiLCJjb25maWciLCJmaWxlQ29udGVudHMiLCJKU09OIiwic3RyaW5naWZ5IiwidXBkYXRlU2l0ZSIsInVwZGF0ZXMiLCJzaXRlIiwiY3VycmVudFNpdGVzIiwiaWR4IiwiZmluZEluZGV4IiwicyIsIk9iamVjdCIsImFzc2lnbiIsImNvbmZpZ1BhdGgiLCJwYXJzZWREYXRhIiwicGFyc2UiLCJjcmVhdGUiLCJoYXMiLCJnbG9iYWwiLCJsb2NhbCIsImNvbmZpZ19wYXRoIiwibWltZSIsImRlZmluZSIsImV4dGVuc2lvbnMiLCJkdXBPdmVyd3JpdGUiLCJieU5hbWUiLCJhZGQiLCJtYXRjaFNpdGUiLCJsZW5ndGgiLCJjb25jYXQiLCJyZW1vdmUiLCJzaXRlc0luQ29uZmlnIiwic2l0ZU5hbWVzIiwibWFwIiwiaW5kZXhPZiIsImZpbmFsU2l0ZXMiLCJzbGljZSIsImdldEZpbGVJbmZvIiwic3RhdCIsImZpbGVOYW1lIiwiYmFzZW5hbWUiLCJzaXplIiwibG9va3VwIiwibXRpbWUiLCJ0b3RhbEZpbGVzRm9yIiwic2l0ZU5hbWUiLCJmaWxlcyIsImZpbGVzRm9yIiwia2V5cyIsInJlZHVjZSIsInRvdGFsIiwiZm9sZGVyIiwiZm9sZGVycyIsIndvcmtpbmdEaXIiLCJkaXJGb3IiLCJyb290IiwiZmlsZVV0aWxzIiwic3RydWN0dXJlIiwiZmlsZSIsImZ1bGxQYXRoIiwiZGlyIiwiaG9zdEZvciIsInByb3RvY29sIiwicmVwbGFjZSIsInRva2VuRm9yIiwidG9rZW4iLCJhcGlfdG9rZW4iLCJuYW1lcyIsImhvc3RzIiwiY2xpZW50Rm9yIiwiVm9vZyIsImdldFRvdGFsRmlsZUNvdW50IiwiUHJvbWlzZSIsInJlamVjdCIsImFsbCIsImdldExheW91dHMiLCJnZXRMYXlvdXRBc3NldHMiLCJ0aGVuIiwibGF5b3V0cyIsImFzc2V0cyIsImNhdGNoIiwiZ2V0TGF5b3V0Q29udGVudHMiLCJpZCIsImxheW91dCIsImVyciIsImJvZHkiLCJnZXRMYXlvdXRBc3NldENvbnRlbnRzIiwibGF5b3V0QXNzZXQiLCJlZGl0YWJsZSIsInB1YmxpY191cmwiLCJwZXJfcGFnZSIsImxheW91dEFzc2V0cyIsInB1bGxBbGxGaWxlcyIsInNpdGVEaXIiLCJsIiwiY29tcG9uZW50Iiwibm9ybWFsaXplVGl0bGUiLCJ0aXRsZSIsInB1bGxGaWxlIiwiaW5jbHVkZXMiLCJhIiwiYXNzZXRfdHlwZSIsImZpbGVuYW1lIiwiZ2V0Rm9sZGVyQ29udGVudHMiLCJnZXRGaWxlVHlwZUZvckZvbGRlciIsInB1bGxGb2xkZXIiLCJmaWxlVHlwZSIsImYiLCJwdXNoRm9sZGVyIiwicHVzaEZpbGUiLCJwdXNoQWxsRmlsZXMiLCJsb2ciLCJmaW5kTGF5b3V0T3JDb21wb25lbnQiLCJnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lIiwicmV0IiwidG9Mb3dlckNhc2UiLCJ1bmRlZmluZWQiLCJmaW5kTGF5b3V0QXNzZXQiLCJnZXRGaWxlTmFtZUZyb21QYXRoIiwic3BsaXQiLCJmaW5kRmlsZSIsInR5cGUiLCJnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aCIsInRpdGxlRnJvbUZpbGVuYW1lIiwiZm9sZGVyVG9UeXBlTWFwIiwiZ2V0VHlwZUZyb21FeHRlbnNpb24iLCJleHRlbnNpb24iLCJsYXN0IiwiZ2V0U3ViZm9sZGVyRm9yVHlwZSIsIm5vcm1hbGl6ZVBhdGgiLCJkZXN0UGF0aCIsIm1rZGlyU3luYyIsImRpcm5hbWUiLCJjb2RlIiwiY29udGVudHMiLCJ1cmwiLCJzdHJlYW0iLCJjcmVhdGVXcml0ZVN0cmVhbSIsInJlcSIsInJlcXVlc3QiLCJnZXQiLCJvbiIsInBpcGUiLCJ1cGxvYWRGaWxlIiwiY2xpZW50IiwidXBkYXRlTGF5b3V0IiwidXBkYXRlTGF5b3V0QXNzZXQiLCJvdmVyd3JpdGUiLCJmYWlsZWQiLCJjcmVhdGVGaWxlIiwiZmlsZU9iamVjdEZyb21QYXRoIiwiY3JlYXRlTGF5b3V0IiwiY3JlYXRlTGF5b3V0QXNzZXQiLCJjb250ZW50X3R5cGUiLCJwYXJlbnRfaWQiLCJwYXJlbnRfdGl0bGUiLCJvYmoiLCJjcmVhdGVSZWFkU3RyZWFtIiwibm9ybWFsaXplZFBhdGgiLCJhZGRGaWxlIiwic3ViRm9sZGVyIiwicHJvamVjdERpciIsImZpbmFsUGF0aCIsInJlbGF0aXZlUGF0aCIsImRlbGV0ZUxheW91dCIsImRlbGV0ZUxheW91dEFzc2V0IiwicmVtb3ZlRmlsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FDS0EsSUFBTUEsWUFBWSxTQUFaQSxTQUFZLENBQUNDLFVBQUQsRUFBZ0I7U0FDekJDLEdBQUdDLFdBQUgsQ0FBZUYsVUFBZixFQUEyQkcsTUFBM0IsQ0FBa0MsVUFBU0MsSUFBVCxFQUFlO1FBQ2xEQyxXQUFXQyxLQUFLQyxJQUFMLENBQVVQLFVBQVYsRUFBc0JJLElBQXRCLENBQWY7V0FDT0gsR0FBR08sUUFBSCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixFQUFQO0dBRkssQ0FBUDtDQURGOztBQU9BLElBQU1DLGNBQWMsU0FBZEEsV0FBYyxDQUFDVixVQUFELEVBQWdCO1NBQzNCQyxHQUFHQyxXQUFILENBQWVGLFVBQWYsRUFBMkJHLE1BQTNCLENBQWtDLFVBQVNDLElBQVQsRUFBZTtRQUNsREMsV0FBV0MsS0FBS0MsSUFBTCxDQUFVUCxVQUFWLEVBQXNCSSxJQUF0QixDQUFmO1dBQ09ILEdBQUdPLFFBQUgsQ0FBWUgsUUFBWixFQUFzQk0sV0FBdEIsRUFBUDtHQUZLLENBQVA7Q0FERjs7QUFPQSxJQUFNQyxrQkFBa0IsU0FBbEJBLGVBQWtCLENBQUNDLFFBQUQsRUFBNEI7TUFBakJDLE9BQWlCLHVFQUFQLEVBQU87O1NBQzNDYixHQUFHYyxZQUFILENBQWdCRixRQUFoQixFQUEwQkMsT0FBMUIsQ0FBUDtDQURGOztBQUlBLElBQU1FLGFBQWEsU0FBYkEsVUFBYSxDQUFDSCxRQUFELEVBQWM7TUFDM0I7V0FDS1osR0FBR08sUUFBSCxDQUFZSyxRQUFaLEVBQXNCSixNQUF0QixFQUFQO0dBREYsQ0FFRSxPQUFPUSxDQUFQLEVBQVU7V0FDSCxLQUFQOztDQUpKOztBQVFBLElBQU1DLGFBQWEsU0FBYkEsVUFBYSxDQUFDTCxRQUFELEVB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