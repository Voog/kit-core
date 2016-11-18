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

var version = "0.3.2";

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return _.head(sites(options).filter(function (p) {
    return p.name === name || p.host === name;
  }));
};

var sites = function sites() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  return read('sites', options) || [];
};

var write = function write(key, value) {
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  var filePath = pathFromOptions(options);

  if (!configExists(filePath)) {
    create(options);
  }

  var config = read(null, options) || {};
  config[key] = value;

  var fileContents = JSON.stringify(config, null, 2);

  fs.writeFileSync(filePath, fileContents);
  return true;
};

var updateSite = function updateSite(name) {
  var updates = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var filePath = pathFromOptions(options);

  if (!configExists(options)) {
    if (filePath === LOCAL_CONFIG && configExists(Object.assign({}, options, {}))) {
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
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var filePath = pathFromOptions(options);

  if (!configExists(options)) {
    fs.writeFileSync(filePath, '{}');
    return true;
  } else {
    return false;
  }
};

var pathFromOptions = function pathFromOptions() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

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
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return config.siteByName(name, options);
};

var add = function add(data) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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

var dirFor = function dirFor(name) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var site = byName(name, options);
  var host = undefined;
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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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

var clientFor = function clientFor(name) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var host = sites$1.hostFor(name, options);
  var token = sites$1.tokenFor(name, options);
  var protocol = options.protocol;

  if (host && token) {
    return new Voog(host, token, protocol);
  }
};

var getTotalFileCount = function getTotalFileCount(name) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return new bluebird.Promise(function (resolve, reject) {
    bluebird.Promise.all([getLayouts(name, options), getLayoutAssets(name, options)]).then(function (_ref) {
      var _ref2 = babelHelpers.slicedToArray(_ref, 2);

      var layouts = _ref2[0];
      var assets = _ref2[1];

      resolve(layouts.length + assets.length);
    }).catch(reject);
  });
};

var getLayoutContents = function getLayoutContents(siteName, id) {
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName, options);

    bluebird.Promise.all([getLayouts(siteName, options), getLayoutAssets(siteName, options)]).then(function (_ref3) {
      var _ref4 = babelHelpers.slicedToArray(_ref3, 2);

      var layouts = _ref4[0];
      var assets = _ref4[1];

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName, options);
    var fileType = getFileTypeForFolder(folder);

    bluebird.Promise.all(getFolderContents(siteName, folder, options)).then(function (files) {
      bluebird.Promise.map(files, function (f) {
        var filePath = undefined;
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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName, options);
    var fileType = getFileTypeForFolder(folder);

    bluebird.Promise.all(getFolderContents(siteName, folder, options)).then(function (files) {
      bluebird.Promise.map(files, function (f) {
        var filePath = undefined;
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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  return new bluebird.Promise(function (resolve, reject) {
    var siteDir = sites$1.dirFor(siteName, options);

    bluebird.Promise.all([getLayouts(siteName, options), getLayoutAssets(siteName, options)]).then(function (_ref5) {
      var _ref6 = babelHelpers.slicedToArray(_ref5, 2);

      var layouts = _ref6[0];
      var assets = _ref6[1];

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
  var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

  var name = normalizeTitle(getLayoutNameFromFilename(fileName));
  return new bluebird.Promise(function (resolve, reject) {
    return clientFor(siteName, options).layouts({
      per_page: 250,
      'q.layout.component': component || false
    }, function (err) {
      var data = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

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
  var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

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
        var contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayoutAsset(file.id, {
          data: contents
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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  return new bluebird.Promise(function (resolve, reject) {
    var file = undefined;
    var type = undefined;

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
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  return new bluebird.Promise(function (resolve, reject) {
    var file = undefined;
    var type = undefined;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4zLjJcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYWxsXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3RcIixcbiAgICBcInByZWJ1aWxkXCI6IFwiZWNobyBSZWJ1aWxkaW5nIC4vaW5kZXguanNcIixcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtY1wiLFxuICAgIFwicG9zdGJ1aWxkXCI6IFwiZWNobyBgZWNobyBSZWJ1aWx0IC4vaW5kZXguanMgJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpYCAmJiB0b3VjaCAuLi9raXQtY2xpL3NyYy9raXQuanNcIixcbiAgICBcInByZXRlc3RcIjogXCJlY2hvIFJ1bm5pbmcgdGVzdHNcIixcbiAgICBcInRlc3RcIjogXCJtb2NoYSAuL3Rlc3QvdGVzdC5qcyB8fCB0cnVlXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGFsbCcgLi9zcmMgLi90ZXN0XCIsXG4gICAgXCJ3YXRjaDpidWlsZFwiOiBcIndhdGNoICducG0tcnVuLWFsbCBidWlsZCB0ZXN0JyAuL3NyY1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIHRlc3QnIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcIjAuMS4zXCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmFiZWwtY2xpXCI6IFwiXjYuNS4xXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1LXJvbGx1cFwiOiBcIl4xLjEuMVwiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjUuMFwiLFxuICAgIFwiY2hhaS1hcy1wcm9taXNlZFwiOiBcIl41LjMuMFwiLFxuICAgIFwibW9jaGFcIjogXCJeMi40LjVcIixcbiAgICBcIm1vY2hhLXNpbm9uXCI6IFwiXjEuMS41XCIsXG4gICAgXCJub2NrXCI6IFwiXjguMC4wXCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWJhYmVsXCI6IFwiXjIuMy45XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcInNpbm9uXCI6IFwiXjEuMTcuM1wiLFxuICAgIFwic2lub24tY2hhaVwiOiBcIl4yLjguMFwiLFxuICAgIFwid2F0Y2hcIjogXCJeMC4xNy4xXCJcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxpc3RGaWxlcyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRmlsZSgpO1xuICB9KTtcbn07XG5cbmNvbnN0IGxpc3RGb2xkZXJzID0gKGZvbGRlclBhdGgpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIGl0ZW1QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGl0ZW0pO1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhpdGVtUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlQ29udGVudHMgPSAoZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmcy51bmxpbmtTeW5jKGZpbGVQYXRoKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChmaWxlUGF0aCwgZGF0YSkgPT4ge1xuICByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGxpc3RGaWxlcyxcbiAgbGlzdEZvbGRlcnMsXG4gIGRlbGV0ZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY3dkOiBwcm9jZXNzLmN3ZCxcbiAgZ2V0RmlsZUNvbnRlbnRzLFxuICBmaWxlRXhpc3RzXG59O1xuIiwiLy8gVGFrZW4gZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9qdXN0bW9vbi8xNTUxMWY5MmU1MjE2ZmEyNjI0YlxuaW1wb3J0IHsgaW5oZXJpdHMgfSBmcm9tICd1dGlsJztcblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDdXN0b21FcnJvcihtZXNzYWdlLCBleHRyYSkge1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLmV4dHJhID0gZXh0cmE7XG59O1xuXG5pbmhlcml0cyhDdXN0b21FcnJvciwgRXJyb3IpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IEN1c3RvbUVycm9yIGZyb20gJy4vY3VzdG9tX2Vycm9yJztcblxuY29uc3QgQ09ORklHX0ZJTEVOQU1FID0gJy52b29nJztcblxuY29uc3QgSE9NRURJUiA9IHByb2Nlc3MuZW52Wyhwcm9jZXNzLnBsYXRmb3JtID09ICd3aW4zMicpID8gJ1VTRVJQUk9GSUxFJyA6ICdIT01FJ107XG5jb25zdCBMT0NBTERJUiA9IHByb2Nlc3MuY3dkKCk7XG5cbmNvbnN0IExPQ0FMX0NPTkZJRyA9IHBhdGguam9pbihMT0NBTERJUiwgQ09ORklHX0ZJTEVOQU1FKTtcbmNvbnN0IEdMT0JBTF9DT05GSUcgPSBwYXRoLmpvaW4oSE9NRURJUiwgQ09ORklHX0ZJTEVOQU1FKTtcblxuY29uc3QgZmluZExvY2FsQ29uZmlnID0gKCkgPT4ge1xuICBpZiAoZmlsZUV4aXN0cyhwYXRoLmpvaW4ocGF0aC5yZXNvbHZlKExPQ0FMRElSLCAnLi4nKSwgQ09ORklHX0ZJTEVOQU1FKSkpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHBhdGgucmVzb2x2ZShMT0NBTERJUiwgJy4uJyksIENPTkZJR19GSUxFTkFNRSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIExPQ0FMX0NPTkZJRztcbiAgfVxufTtcblxuY29uc3Qgc2l0ZUJ5TmFtZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIF8uaGVhZChcbiAgICBzaXRlcyhvcHRpb25zKVxuICAgIC5maWx0ZXIocCA9PiBwLm5hbWUgPT09IG5hbWUgfHwgcC5ob3N0ID09PSBuYW1lKVxuICApO1xufTtcblxuY29uc3Qgc2l0ZXMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiByZWFkKCdzaXRlcycsIG9wdGlvbnMpIHx8IFtdO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoa2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhmaWxlUGF0aCkpIHtcbiAgICBjcmVhdGUob3B0aW9ucyk7XG4gIH1cblxuICBsZXQgY29uZmlnID0gcmVhZChudWxsLCBvcHRpb25zKSB8fCB7fTtcbiAgY29uZmlnW2tleV0gPSB2YWx1ZTtcblxuICBsZXQgZmlsZUNvbnRlbnRzID0gSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKTtcblxuICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBmaWxlQ29udGVudHMpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmNvbnN0IHVwZGF0ZVNpdGUgPSAobmFtZSwgdXBkYXRlcyA9IHt9LCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBzaXRlQnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBpZiAoIXNpdGUpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgbGV0IGN1cnJlbnRTaXRlcyA9IHNpdGVzKG9wdGlvbnMpO1xuICBsZXQgaWR4ID0gXy5maW5kSW5kZXgoY3VycmVudFNpdGVzLCAocykgPT4gcy5uYW1lID09PSBzaXRlLm5hbWUgfHwgcy5ob3N0ID09PSBzaXRlLmhvc3QpO1xuICBjdXJyZW50U2l0ZXNbaWR4XSA9IE9iamVjdC5hc3NpZ24oe30sIHNpdGUsIHVwZGF0ZXMpO1xuXG4gIHdyaXRlKCdzaXRlcycsIGN1cnJlbnRTaXRlcywgb3B0aW9ucyk7XG59O1xuXG5jb25zdCByZWFkID0gKGtleSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhvcHRpb25zKSkge1xuICAgIGlmIChmaWxlUGF0aCA9PT0gTE9DQUxfQ09ORklHICYmIGNvbmZpZ0V4aXN0cyhPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7fSkpKSB7XG4gICAgICBmaWxlUGF0aCA9IEdMT0JBTF9DT05GSUc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBDdXN0b21FcnJvcignQ29uZmlndXJhdGlvbiBmaWxlIG5vdCBmb3VuZCEnKTtcbiAgICB9XG4gIH1cblxuICBsZXQgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgbGV0IHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuXG4gIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBwYXJzZWREYXRhW2tleV07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhcnNlZERhdGE7XG4gIH1cbn07XG5cbmNvbnN0IGNyZWF0ZSA9IChvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVQYXRoID0gcGF0aEZyb21PcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmICghY29uZmlnRXhpc3RzKG9wdGlvbnMpKSB7XG4gICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgJ3t9Jyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBwYXRoRnJvbU9wdGlvbnMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICgoXy5oYXMob3B0aW9ucywgJ2dsb2JhbCcpICYmIG9wdGlvbnMuZ2xvYmFsID09PSB0cnVlKSkge1xuICAgIHJldHVybiBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2UgaWYgKF8uaGFzKG9wdGlvbnMsICdsb2NhbCcpICYmIG9wdGlvbnMubG9jYWwgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZmluZExvY2FsQ29uZmlnKCk7XG4gIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9ucywgJ2NvbmZpZ1BhdGgnKSB8fCBfLmhhcyhvcHRpb25zLCAnY29uZmlnX3BhdGgnKSkge1xuICAgIHJldHVybiBvcHRpb25zLmNvbmZpZ1BhdGggfHwgb3B0aW9ucy5jb25maWdfcGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmluZExvY2FsQ29uZmlnKCk7XG4gIH1cbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBjb25maWdFeGlzdHMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBmaWxlRXhpc3RzKHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHNpdGVCeU5hbWUsXG4gIHNpdGVzLFxuICB3cml0ZSxcbiAgdXBkYXRlU2l0ZSxcbiAgcmVhZCxcbiAgY3JlYXRlLFxuICBwYXRoRnJvbU9wdGlvbnMsXG4gIGNvbmZpZ0V4aXN0c1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IG1pbWUgZnJvbSAnbWltZS10eXBlL3dpdGgtZGInO1xuXG5taW1lLmRlZmluZSgnYXBwbGljYXRpb24vdm5kLnZvb2cuZGVzaWduLmN1c3RvbStsaXF1aWQnLCB7ZXh0ZW5zaW9uczogWyd0cGwnXX0sIG1pbWUuZHVwT3ZlcndyaXRlKTtcblxuY29uc3QgYnlOYW1lID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVCeU5hbWUobmFtZSwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBhZGQgPSAoZGF0YSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmIChfLmhhcyhkYXRhLCAnaG9zdCcpICYmIF8uaGFzKGRhdGEsICd0b2tlbicpKSB7XG4gICAgbGV0IHNpdGVzID0gY29uZmlnLnNpdGVzKG9wdGlvbnMpO1xuXG4gICAgLy8gdXBkYXRlcyBjb25maWcgaWYgZXh0cmEgb3B0aW9ucyBhcmUgcHJvdmlkZWQgYW5kIGdpdmVuIHNpdGUgYWxyZWFkeSBleGlzdHNcbiAgICB2YXIgbWF0Y2hTaXRlID0gc2l0ZSA9PiBzaXRlLmhvc3QgPT09IGRhdGEuaG9zdCB8fCBzaXRlLm5hbWUgPT09IGRhdGEubmFtZTtcbiAgICBpZiAoc2l0ZXMuZmlsdGVyKG1hdGNoU2l0ZSkubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIGlkeCA9IF8uZmluZEluZGV4KHNpdGVzLCBtYXRjaFNpdGUpO1xuICAgICAgc2l0ZXNbaWR4XSA9IE9iamVjdC5hc3NpZ24oe30sIHNpdGVzW2lkeF0sIGRhdGEpOyAvLyBtZXJnZSBvbGQgYW5kIG5ldyB2YWx1ZXNcbiAgICB9IGVsc2Uge1xuICAgICAgc2l0ZXMgPSBbZGF0YV0uY29uY2F0KHNpdGVzKTsgLy8gb3RoZXJ3aXNlIGFkZCBuZXcgc2l0ZSB0byBjb25maWdcbiAgICB9XG4gICAgY29uZmlnLndyaXRlKCdzaXRlcycsIHNpdGVzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IHJlbW92ZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVzSW5Db25maWcgPSBjb25maWcuc2l0ZXMob3B0aW9ucyk7XG4gIGxldCBzaXRlTmFtZXMgPSBzaXRlc0luQ29uZmlnLm1hcChzaXRlID0+IHNpdGUubmFtZSB8fCBzaXRlLmhvc3QpO1xuICBsZXQgaWR4ID0gc2l0ZU5hbWVzLmluZGV4T2YobmFtZSk7XG4gIGlmIChpZHggPCAwKSB7IHJldHVybiBmYWxzZTsgfVxuICBsZXQgZmluYWxTaXRlcyA9IHNpdGVzSW5Db25maWdcbiAgICAuc2xpY2UoMCwgaWR4KVxuICAgIC5jb25jYXQoc2l0ZXNJbkNvbmZpZy5zbGljZShpZHggKyAxKSk7XG5cbiAgcmV0dXJuIGNvbmZpZy53cml0ZSgnc2l0ZXMnLCBmaW5hbFNpdGVzLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGdldEZpbGVJbmZvID0gKGZpbGVQYXRoKSA9PiB7XG4gIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZVBhdGgpO1xuXG4gIGlmIChzdGF0LmlzRmlsZSgpKSB7XG4gICAgbGV0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZpbGU6IGZpbGVOYW1lLFxuICAgICAgc2l6ZTogc3RhdC5zaXplLFxuICAgICAgY29udGVudFR5cGU6IG1pbWUubG9va3VwKGZpbGVOYW1lKSxcbiAgICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgICAgdXBkYXRlZEF0OiBzdGF0Lm10aW1lXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbmNvbnN0IHRvdGFsRmlsZXNGb3IgPSAoc2l0ZU5hbWUpID0+IHtcbiAgbGV0IGZpbGVzID0gZmlsZXNGb3Ioc2l0ZU5hbWUpO1xuICByZXR1cm4gT2JqZWN0LmtleXMoZmlsZXMpLnJlZHVjZSgodG90YWwsIGZvbGRlcikgPT4gdG90YWwgKyBmaWxlc1tmb2xkZXJdLmxlbmd0aCwgMCk7XG59O1xuXG5jb25zdCBmaWxlc0ZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBmb2xkZXJzID0gW1xuICAgICdhc3NldHMnLCAnY29tcG9uZW50cycsICdpbWFnZXMnLCAnamF2YXNjcmlwdHMnLCAnbGF5b3V0cycsICdzdHlsZXNoZWV0cydcbiAgXTtcblxuICBsZXQgd29ya2luZ0RpciA9IGRpckZvcihuYW1lKTtcblxuICBsZXQgcm9vdCA9IGZpbGVVdGlscy5saXN0Rm9sZGVycyh3b3JraW5nRGlyKTtcblxuICBpZiAocm9vdCkge1xuICAgIHJldHVybiBmb2xkZXJzLnJlZHVjZSgoc3RydWN0dXJlLCBmb2xkZXIpID0+IHtcbiAgICAgIGlmIChyb290LmluZGV4T2YoZm9sZGVyKSA+PSAwKSB7XG4gICAgICAgIGxldCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHdvcmtpbmdEaXIsIGZvbGRlcik7XG4gICAgICAgIHN0cnVjdHVyZVtmb2xkZXJdID0gZmlsZVV0aWxzLmxpc3RGaWxlcyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlKTtcbiAgICAgICAgICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcblxuICAgICAgICAgIHJldHVybiBzdGF0LmlzRmlsZSgpO1xuICAgICAgICB9KS5tYXAoZmlsZSA9PiB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuXG4gICAgICAgICAgcmV0dXJuIGdldEZpbGVJbmZvKGZ1bGxQYXRoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RydWN0dXJlO1xuICAgIH0sIHt9KTtcbiAgfVxufTtcblxuY29uc3QgZGlyRm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbiAgaWYgKG9wdGlvbnMuZGlyIHx8IG9wdGlvbnMucGF0aCkge1xuICAgIHJldHVybiBvcHRpb25zLmRpciB8fCBvcHRpb25zLnBhdGg7XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLmRpciB8fCBzaXRlLnBhdGg7XG4gIH1cbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgaG9zdG5hbWUgdGhhdCBtYXRjaGVzIHRoZSBnaXZlbiBuYW1lIGluIHRoZSBjb25maWd1cmF0aW9uXG4gKiBQcmVmZXJzIGV4cGxpY2l0IG9wdGlvbnMgb3ZlciB0aGUgY29uZmlndXJhdGlvbiBmaWxlIHZhbHVlc1xuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lICAgICAgICAgU2l0ZSBuYW1lIGluIHRoZSBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gIHtPYmplY3R9IFtvcHRpb25zPXt9XSBPYmplY3Qgd2l0aCB2YWx1ZXMgdGhhdCBvdmVycmlkZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gdmFsdWVzXG4gKiBAcmV0dXJuIHtzdHJpbmc/fSAgICAgICAgICAgICBUaGUgZmluYWwgaG9zdG5hbWUgZm9yIHRoZSBnaXZlbiBuYW1lXG4gKi9cbmNvbnN0IGhvc3RGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBsZXQgaG9zdDtcbiAgaWYgKG9wdGlvbnMuaG9zdCkge1xuICAgIGhvc3QgPSBvcHRpb25zLmhvc3Q7XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIGhvc3QgPSBzaXRlLmhvc3Q7XG4gIH1cbiAgaWYgKGhvc3QpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMucHJvdG9jb2wgPyBgJHtvcHRpb25zLnByb3RvY29sfTovL2AgOiAnJykgKyBob3N0LnJlcGxhY2UoL15odHRwcz86XFwvXFwvLywgJycpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBBUEkgdG9rZW4gZm9yIHRoZSBnaXZlbiBzaXRlIG5hbWVcbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAgICAgICAgIFNpdGUgbmFtZSBpbiB0aGUgY29uZmlndXJhdGlvblxuICogQHBhcmFtICB7T2JqZWN0fSBbb3B0aW9ucz17fV0gT2JqZWN0IHdpdGggdmFsdWVzIHRoYXQgb3ZlcnJpZGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIHZhbHVlc1xuICogQHJldHVybiB7c3RyaW5nP30gICAgICAgICAgICAgVGhlIEFQSSB0b2tlbiBmb3IgdGhlIGdpdmVuIHNpdGVcbiAqL1xuY29uc3QgdG9rZW5Gb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBpZiAob3B0aW9ucy50b2tlbiB8fCBvcHRpb25zLmFwaV90b2tlbikge1xuICAgIHJldHVybiBvcHRpb25zLnRva2VuIHx8IG9wdGlvbnMuYXBpX3Rva2VuO1xuICB9IGVsc2UgaWYgKHNpdGUpIHtcbiAgICByZXR1cm4gc2l0ZS50b2tlbiB8fCBzaXRlLmFwaV90b2tlbjtcbiAgfVxufTtcblxuY29uc3QgbmFtZXMgPSAob3B0aW9ucykgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVzKG9wdGlvbnMpLm1hcChzaXRlID0+IHNpdGUubmFtZSB8fCBzaXRlLmhvc3QpO1xufTtcblxuY29uc3QgaG9zdHMgPSAob3B0aW9ucykgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVzKG9wdGlvbnMpLm1hcChzaXRlID0+IHNpdGUuaG9zdCk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGJ5TmFtZSxcbiAgYWRkLFxuICByZW1vdmUsXG4gIHRvdGFsRmlsZXNGb3IsXG4gIGZpbGVzRm9yLFxuICBkaXJGb3IsXG4gIGhvc3RGb3IsXG4gIHRva2VuRm9yLFxuICBuYW1lcyxcbiAgaG9zdHMsXG4gIGdldEZpbGVJbmZvXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgc2l0ZXMgZnJvbSAnLi9zaXRlcyc7XG5pbXBvcnQgVm9vZyBmcm9tICd2b29nJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UHJvbWlzZX0gZnJvbSAnYmx1ZWJpcmQnO1xuXG5jb25zdCBjbGllbnRGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBob3N0ID0gc2l0ZXMuaG9zdEZvcihuYW1lLCBvcHRpb25zKTtcbiAgbGV0IHRva2VuID0gc2l0ZXMudG9rZW5Gb3IobmFtZSwgb3B0aW9ucyk7XG4gIGxldCBwcm90b2NvbCA9IG9wdGlvbnMucHJvdG9jb2w7XG5cbiAgaWYgKGhvc3QgJiYgdG9rZW4pIHtcbiAgICByZXR1cm4gbmV3IFZvb2coaG9zdCwgdG9rZW4sIHByb3RvY29sKTtcbiAgfVxufTtcblxuY29uc3QgZ2V0VG90YWxGaWxlQ291bnQgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgUHJvbWlzZS5hbGwoW2dldExheW91dHMobmFtZSwgb3B0aW9ucyksIGdldExheW91dEFzc2V0cyhuYW1lLCBvcHRpb25zKV0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICByZXNvbHZlKGxheW91dHMubGVuZ3RoICsgYXNzZXRzLmxlbmd0aCk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRDb250ZW50cyA9IChzaXRlTmFtZSwgaWQsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShkYXRhLmJvZHkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dEFzc2V0Q29udGVudHMgPSAoc2l0ZU5hbWUsIGlkLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpLmxheW91dEFzc2V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgaWYgKGRhdGEuZWRpdGFibGUpIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLmRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLnB1YmxpY191cmwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dHMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucylcbiAgICAgIC5sYXlvdXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpXG4gICAgICAubGF5b3V0QXNzZXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0Rm9sZGVyQ29udGVudHMgPSAoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgc3dpdGNoIChmb2xkZXIpIHtcbiAgICBjYXNlICdsYXlvdXRzJzpcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4obGF5b3V0cyA9PiByZXNvbHZlKGxheW91dHMuZmlsdGVyKGwgPT4gIWwuY29tcG9uZW50KSkpLmNhdGNoKHJlamVjdCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjb21wb25lbnRzJzpcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4obGF5b3V0cyA9PiByZXNvbHZlKGxheW91dHMuZmlsdGVyKGwgPT4gbC5jb21wb25lbnQpKSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Fzc2V0cyc6XG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oYXNzZXRzID0+IHJlc29sdmUoYXNzZXRzLmZpbHRlcihhID0+ICFfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGEuYXNzZXRfdHlwZSkpKSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2ltYWdlcyc6XG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oYXNzZXRzID0+IHJlc29sdmUoYXNzZXRzLmZpbHRlcihhID0+IGEuYXNzZXRfdHlwZSA9PT0gJ2ltYWdlJykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnamF2YXNjcmlwdHMnOlxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGFzc2V0cyA9PiByZXNvbHZlKGFzc2V0cy5maWx0ZXIoYSA9PiBhLmFzc2V0X3R5cGUgPT09ICdqYXZhc2NyaXB0JykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc3R5bGVzaGVldHMnOlxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGFzc2V0cyA9PiByZXNvbHZlKGFzc2V0cy5maWx0ZXIoYSA9PiBhLmFzc2V0X3R5cGUgPT09ICdzdHlsZXNoZWV0JykpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJlc29sdmUoW10pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlVHlwZUZvckZvbGRlciA9IChmb2xkZXIpID0+IHtcbiAgcmV0dXJuIHtcbiAgICAnbGF5b3V0cyc6ICdsYXlvdXQnLFxuICAgICdjb21wb25lbnRzJzogJ2xheW91dCcsXG4gICAgJ2Fzc2V0cyc6ICdhc3NldCcsXG4gICAgJ2ltYWdlcyc6ICdhc3NldCcsXG4gICAgJ2phdmFzY3JpcHRzJzogJ2Fzc2V0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnYXNzZXQnXG4gIH1bZm9sZGVyXTtcbn07XG5cbmNvbnN0IHB1bGxGb2xkZXIgPSAoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaWxlVHlwZSA9IGdldEZpbGVUeXBlRm9yRm9sZGVyKGZvbGRlcik7XG5cbiAgICBQcm9taXNlLmFsbChnZXRGb2xkZXJDb250ZW50cyhzaXRlTmFtZSwgZm9sZGVyLCBvcHRpb25zKSkudGhlbihmaWxlcyA9PiB7XG4gICAgICBQcm9taXNlLm1hcChmaWxlcywgZiA9PiB7XG4gICAgICAgIGxldCBmaWxlUGF0aDtcbiAgICAgICAgaWYgKGZpbGVUeXBlID09PSAnbGF5b3V0Jykge1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke2YuY29tcG9uZW50ID8gJ2NvbXBvbmVudHMnIDogJ2xheW91dHMnfS8ke25vcm1hbGl6ZVRpdGxlKGYudGl0bGUpfS50cGxgKTtcbiAgICAgICAgfSBlbHNlIGlmIChmaWxlVHlwZSA9PT0gJ2Fzc2V0Jykge1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgZi5hc3NldF90eXBlKSA/IGYuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2YuZmlsZW5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICAgICAgcmV0dXJuIHB1bGxGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdXNoRm9sZGVyID0gKHNpdGVOYW1lLCBmb2xkZXIsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmlsZVR5cGUgPSBnZXRGaWxlVHlwZUZvckZvbGRlcihmb2xkZXIpO1xuXG4gICAgUHJvbWlzZS5hbGwoZ2V0Rm9sZGVyQ29udGVudHMoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucykpLnRoZW4oZmlsZXMgPT4ge1xuICAgICAgUHJvbWlzZS5tYXAoZmlsZXMsIGYgPT4ge1xuICAgICAgICBsZXQgZmlsZVBhdGg7XG4gICAgICAgIGlmIChmaWxlVHlwZSA9PT0gJ2xheW91dCcpIHtcbiAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtmLmNvbXBvbmVudCA/ICdjb21wb25lbnRzJyA6ICdsYXlvdXRzJ30vJHtub3JtYWxpemVUaXRsZShmLnRpdGxlKX0udHBsYCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZmlsZVR5cGUgPT09ICdhc3NldCcpIHtcbiAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGYuYXNzZXRfdHlwZSkgPyBmLmFzc2V0X3R5cGUgOiAnYXNzZXQnfXMvJHtmLmZpbGVuYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICB9KS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVzaEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgZmluZExheW91dE9yQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBjb21wb25lbnQsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IG5hbWUgPSBub3JtYWxpemVUaXRsZShnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lKGZpbGVOYW1lKSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0cyh7XG4gICAgICBwZXJfcGFnZTogMjUwLFxuICAgICAgJ3EubGF5b3V0LmNvbXBvbmVudCc6IGNvbXBvbmVudCB8fCBmYWxzZVxuICAgIH0sIChlcnIsIGRhdGEgPSBbXSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgbGV0IHJldCA9IGRhdGEuZmlsdGVyKGwgPT4gbm9ybWFsaXplVGl0bGUobC50aXRsZSkudG9Mb3dlckNhc2UoKSA9PSBuYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgaWYgKHJldC5sZW5ndGggPT09IDApIHsgcmVzb2x2ZSh1bmRlZmluZWQpOyB9XG4gICAgICByZXNvbHZlKF8uaGVhZChyZXQpKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0QXNzZXQgPSAoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXRBc3NldHMoe1xuICAgICAgcGVyX3BhZ2U6IDI1MCxcbiAgICAgICdxLmxheW91dF9hc3NldC5maWxlbmFtZSc6IGZpbGVOYW1lXG4gICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShfLmhlYWQoZGF0YSkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldEZpbGVOYW1lRnJvbVBhdGggPSAoZmlsZVBhdGgpID0+IHtcbiAgcmV0dXJuIGZpbGVQYXRoLnNwbGl0KCcvJylbMV07XG59O1xuXG5jb25zdCBnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lID0gKGZpbGVOYW1lKSA9PiB7XG4gIHJldHVybiBfLmhlYWQoZmlsZU5hbWUuc3BsaXQoJy50cGwnKSk7XG59O1xuXG5jb25zdCBmaW5kRmlsZSA9IChmaWxlUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgbGV0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCk7XG5cbiAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgcmV0dXJuIGZpbmRMYXlvdXRPckNvbXBvbmVudChmaWxlTmFtZSwgKHR5cGUgPT0gJ2NvbXBvbmVudCcpLCBzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZpbmRMYXlvdXRBc3NldChmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICB9XG59O1xuXG5jb25zdCB0aXRsZUZyb21GaWxlbmFtZSA9IChmaWxlTmFtZSkgPT4ge1xuICByZXR1cm4gXy5oZWFkKGZpbGVOYW1lLnNwbGl0KCcuJykpLnJlcGxhY2UoL18vLCAnICcpO1xufTtcblxuY29uc3Qgbm9ybWFsaXplVGl0bGUgPSAodGl0bGUpID0+IHtcbiAgcmV0dXJuIHRpdGxlLnJlcGxhY2UoL1teXFx3XFwtXFwuXS9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aCA9IChwYXRoKSA9PiB7XG4gIGxldCBmb2xkZXIgPSBwYXRoLnNwbGl0KCcvJylbMF07XG4gIGxldCBmb2xkZXJUb1R5cGVNYXAgPSB7XG4gICAgJ2xheW91dHMnOiAnbGF5b3V0JyxcbiAgICAnY29tcG9uZW50cyc6ICdjb21wb25lbnQnLFxuICAgICdhc3NldHMnOiAnYXNzZXQnLFxuICAgICdpbWFnZXMnOiAnaW1hZ2UnLFxuICAgICdqYXZhc2NyaXB0cyc6ICdqYXZhc2NyaXB0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnc3R5bGVzaGVldCdcbiAgfTtcblxuICByZXR1cm4gZm9sZGVyVG9UeXBlTWFwW2ZvbGRlcl07XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbUV4dGVuc2lvbiA9IChmaWxlTmFtZSkgPT4ge1xuICBpZiAoZmlsZU5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxKSB7XG4gICAgbGV0IGV4dGVuc2lvbiA9IF8ubGFzdChmaWxlTmFtZS5zcGxpdCgnLicpKTtcblxuICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgY2FzZSAnanMnOlxuICAgICAgcmV0dXJuICdqYXZhc2NyaXB0JztcbiAgICBjYXNlICdjc3MnOlxuICAgICAgcmV0dXJuICdzdHlsZXNoZWV0JztcbiAgICBjYXNlICdqcGcnOlxuICAgIGNhc2UgJ3BuZyc6XG4gICAgY2FzZSAnanBlZyc6XG4gICAgY2FzZSAnZ2lmJzpcbiAgICAgIHJldHVybiAnaW1hZ2UnO1xuICAgIGNhc2UgJ3RwbCc6XG4gICAgICByZXR1cm4gJ2xheW91dCc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnYXNzZXQnO1xuICAgIH1cbiAgfVxufTtcblxuY29uc3QgZ2V0U3ViZm9sZGVyRm9yVHlwZSA9ICh0eXBlKSA9PiB7XG4gIHJldHVybiB7XG4gICAgJ2Fzc2V0JzogJ2Fzc2V0cycsXG4gICAgJ2ltYWdlJzogJ2ltYWdlcycsXG4gICAgJ2phdmFzY3JpcHQnOiAnamF2YXNjcmlwdHMnLFxuICAgICdzdHlsZXNoZWV0JzogJ3N0eWxlc2hlZXRzJyxcbiAgICAnY29tcG9uZW50JzogJ2NvbXBvbmVudHMnLFxuICAgICdsYXlvdXQnOiAnbGF5b3V0cydcbiAgfVt0eXBlXTtcbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVBhdGggPSAocGF0aCwgc2l0ZURpcikgPT4ge1xuICByZXR1cm4gcGF0aFxuICAgIC5yZXBsYWNlKHNpdGVEaXIsICcnKVxuICAgIC5yZXBsYWNlKC9eXFwvLywgJycpO1xufTtcblxuY29uc3Qgd3JpdGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlLCBkZXN0UGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKF8uaW5jbHVkZXMoT2JqZWN0LmtleXMoZmlsZSksICdsYXlvdXRfbmFtZScpKSB7XG4gICAgICBnZXRMYXlvdXRDb250ZW50cyhzaXRlTmFtZSwgZmlsZS5pZCwgb3B0aW9ucykudGhlbihjb250ZW50cyA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShkZXN0UGF0aCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlOyB9XG4gICAgICAgIH1cblxuICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICBnZXRMYXlvdXRBc3NldENvbnRlbnRzKHNpdGVOYW1lLCBmaWxlLmlkLCBvcHRpb25zKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgICAgfVxuICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1cmwgPSBmaWxlLnB1YmxpY191cmw7XG4gICAgICB0cnkge1xuICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZTsgfVxuICAgICAgfVxuXG4gICAgICBsZXQgc3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdFBhdGgpO1xuICAgICAgaWYgKHVybCAmJiBzdHJlYW0pIHtcbiAgICAgICAgbGV0IHJlcSA9IHJlcXVlc3QuZ2V0KHVybCkub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpO1xuICAgICAgICByZXEucGlwZShzdHJlYW0pO1xuICAgICAgICByZXNvbHZlKGZpbGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KG51bGwpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCB1cGxvYWRGaWxlID0gKHNpdGVOYW1lLCBmaWxlLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGlmIChmaWxlKSB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhPYmplY3Qua2V5cyhmaWxlKSwgJ2xheW91dF9uYW1lJykpIHtcbiAgICAgICAgbGV0IGNvbnRlbnRzID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICBjbGllbnQudXBkYXRlTGF5b3V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBib2R5OiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5lZGl0YWJsZSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXRBc3NldChmaWxlLmlkLCB7XG4gICAgICAgICAgZGF0YTogY29udGVudHNcbiAgICAgICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMub3ZlcndyaXRlKSB7XG4gICAgICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICAgICAgdmFyIGZpbGVOYW1lID0gbm9ybWFsaXplUGF0aChmaWxlUGF0aCwgc2l0ZURpcik7XG4gICAgICAgIGRlbGV0ZUZpbGUoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zKS50aGVuKCgpID0+IHtcbiAgICAgICAgICBjcmVhdGVGaWxlKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucykudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZVBhdGgsIG1lc3NhZ2U6ICdVbmFibGUgdG8gdXBkYXRlIGZpbGUhJ30pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjcmVhdGVGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucykudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBjcmVhdGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICAgIGxldCBmaWxlID0gZmlsZU9iamVjdEZyb21QYXRoKGZpbGVQYXRoKTtcblxuICAgIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgICAgY2xpZW50LmNyZWF0ZUxheW91dChmaWxlLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbGllbnQuY3JlYXRlTGF5b3V0QXNzZXQoZmlsZSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlLCBtZXNzYWdlOiAnVW5hYmxlIHRvIGNyZWF0ZSBmaWxlISd9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgZmlsZU9iamVjdEZyb21QYXRoID0gKGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlUGF0aCk7XG4gIGxldCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZVBhdGgpO1xuXG4gIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogXy5oYXMob3B0aW9ucywgJ3RpdGxlJykgPyBvcHRpb25zLnRpdGxlIDogdGl0bGVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpLFxuICAgICAgY29tcG9uZW50OiB0eXBlID09ICdjb21wb25lbnQnLFxuICAgICAgY29udGVudF90eXBlOiBfLmhhcyhvcHRpb25zLCAnY29udGVudF90eXBlJykgPyBvcHRpb25zLmNvbnRlbnRfdHlwZSA6ICdwYWdlJyxcbiAgICAgIGJvZHk6IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKSxcbiAgICAgIHBhcmVudF9pZDogXy5oYXMob3B0aW9ucywgJ3BhcmVudF9pZCcpID8gb3B0aW9ucy5wYXJlbnRfaWQgOiBudWxsLFxuICAgICAgcGFyZW50X3RpdGxlOiBfLmhhcyhvcHRpb25zLCAncGFyZW50X3RpdGxlJykgPyBvcHRpb25zLnBhcmVudF90aXRsZSA6IG51bGxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGxldCBvYmogPSB7XG4gICAgICBmaWxlbmFtZTogZmlsZU5hbWVcbiAgICB9O1xuXG4gICAgaWYgKF8uaW5jbHVkZXMoWydqYXZhc2NyaXB0cycsICdzdHlsZXNoZWV0cyddLCB0eXBlKSkge1xuICAgICAgb2JqLmRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iai5maWxlID0gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cbn07XG5cbmNvbnN0IHB1bGxGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgbGV0IG5vcm1hbGl6ZWRQYXRoID0gbm9ybWFsaXplUGF0aChmaWxlUGF0aCwgc2l0ZURpcik7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBmaW5kRmlsZShub3JtYWxpemVkUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoIWZpbGUgfHwgdHlwZW9mIGZpbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZVBhdGgsIG1lc3NhZ2U6ICdGaWxlIG5vdCBmb3VuZCd9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUod3JpdGVGaWxlKHNpdGVOYW1lLCBmaWxlLCBmaWxlUGF0aCwgb3B0aW9ucykpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IHB1c2hGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgbGV0IG5vcm1hbGl6ZWRQYXRoID0gbm9ybWFsaXplUGF0aChmaWxlUGF0aCwgc2l0ZURpcik7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBmaW5kRmlsZShub3JtYWxpemVkUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoIWZpbGUgfHwgdHlwZW9mIGZpbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZVBhdGgsIG1lc3NhZ2U6ICdGaWxlIG5vdCBmb3VuZCd9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUodXBsb2FkRmlsZShzaXRlTmFtZSwgZmlsZSwgZmlsZVBhdGgsIG9wdGlvbnMpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBhZGRGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGZpbGU7XG4gICAgbGV0IHR5cGU7XG5cbiAgICBpZiAoZmlsZU5hbWUuc3BsaXQoJy8nKS5sZW5ndGggPiAxKSB7XG4gICAgICBmaWxlID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlTmFtZSwgb3B0aW9ucyk7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlID0gZmlsZU5hbWU7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21FeHRlbnNpb24oZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIGxldCBzdWJGb2xkZXIgPSBnZXRTdWJmb2xkZXJGb3JUeXBlKHR5cGUpO1xuICAgIGxldCBwcm9qZWN0RGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmluYWxQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIHN1YkZvbGRlciwgZmlsZSk7XG5cbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gZmluYWxQYXRoLnJlcGxhY2UocHJvamVjdERpciArICcvJywgJycpO1xuXG4gICAgaWYgKGZpbGVVdGlscy5maWxlRXhpc3RzKHJlbGF0aXZlUGF0aCwgb3B0aW9ucykgfHwgdHlwZW9mIGZpbGVVdGlscy53cml0ZUZpbGUocmVsYXRpdmVQYXRoLCAnJykgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJlc29sdmUoY3JlYXRlRmlsZShzaXRlTmFtZSwgcmVsYXRpdmVQYXRoLCBvcHRpb25zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZU5hbWUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgY2xpZW50ID0gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuXG4gICAgZmluZEZpbGUoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgICAgIGNsaWVudC5kZWxldGVMYXlvdXQoZmlsZS5pZCwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGllbnQuZGVsZXRlTGF5b3V0QXNzZXQoZmlsZS5pZCwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcmVtb3ZlRmlsZSA9IChzaXRlTmFtZSwgZmlsZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBmaWxlO1xuICAgIGxldCB0eXBlO1xuXG4gICAgaWYgKGZpbGVOYW1lLnNwbGl0KCcvJykubGVuZ3RoID4gMSkge1xuICAgICAgZmlsZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZU5hbWUsIG9wdGlvbnMpO1xuICAgICAgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZSA9IGZpbGVOYW1lO1xuICAgICAgdHlwZSA9IGdldFR5cGVGcm9tRXh0ZW5zaW9uKGZpbGVOYW1lKTtcbiAgICB9XG5cbiAgICBsZXQgc3ViRm9sZGVyID0gZ2V0U3ViZm9sZGVyRm9yVHlwZSh0eXBlKTtcbiAgICBsZXQgcHJvamVjdERpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gICAgbGV0IGZpbmFsUGF0aCA9IHBhdGguam9pbihwcm9qZWN0RGlyLCBzdWJGb2xkZXIsIGZpbGUpO1xuXG4gICAgbGV0IHJlbGF0aXZlUGF0aCA9IGZpbmFsUGF0aC5yZXBsYWNlKHByb2plY3REaXIgKyAnLycsICcnKTtcblxuICAgIGlmIChmaWxlVXRpbHMuZmlsZUV4aXN0cyhmaW5hbFBhdGgsIG9wdGlvbnMpIHx8IHR5cGVvZiBmaWxlVXRpbHMuZGVsZXRlRmlsZShyZWxhdGl2ZVBhdGgpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXNvbHZlKGRlbGV0ZUZpbGUoc2l0ZU5hbWUsIHJlbGF0aXZlUGF0aCwgb3B0aW9ucykpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGVOYW1lLCBtZXNzYWdlOiAnVW5hYmxlIHRvIHJlbW92ZSBmaWxlISd9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBjbGllbnRGb3IsXG4gIGdldFRvdGFsRmlsZUNvdW50LFxuICBwdWxsQWxsRmlsZXMsXG4gIHB1c2hBbGxGaWxlcyxcbiAgZmluZEZpbGUsXG4gIHB1c2hGaWxlLFxuICBwdWxsRmlsZSxcbiAgcHVsbEZvbGRlcixcbiAgcHVzaEZvbGRlcixcbiAgY3JlYXRlRmlsZSxcbiAgYWRkRmlsZSxcbiAgcmVtb3ZlRmlsZVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHt2ZXJzaW9ufSBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuXG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBzaXRlcyBmcm9tICcuL3NpdGVzJztcbmltcG9ydCBhY3Rpb25zIGZyb20gJy4vYWN0aW9ucyc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZmlsZVV0aWxzLFxuICBjb25maWcsXG4gIHNpdGVzLFxuICBhY3Rpb25zLFxuICB2ZXJzaW9uXG59O1xuIl0sIm5hbWVzIjpbImluaGVyaXRzIiwiZmlsZUV4aXN0cyIsInNpdGVzIiwiUHJvbWlzZSIsIndyaXRlRmlsZSIsImRlbGV0ZUZpbGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0tBLElBQU0sWUFBWSxTQUFaLFNBQVksQ0FBQyxVQUFELEVBQWdCO1NBQ3pCLEdBQUcsV0FB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