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

var version = "0.3.1";

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

  return sites(options).filter(function (p) {
    return p.name === name || p.host === name;
  })[0];
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
      } else {
        resolve({ failed: true, file: filePath, message: 'Unable to update file!' });
      }
    } else {
      createFile(siteName, filePath, options).then(resolve, reject);
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
    return {
      filename: fileName,
      data: fs.readFileSync(filePath, 'utf8')
    };
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4zLjFcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYWxsXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3RcIixcbiAgICBcInByZWJ1aWxkXCI6IFwiZWNobyBSZWJ1aWxkaW5nIC4vaW5kZXguanNcIixcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtY1wiLFxuICAgIFwicG9zdGJ1aWxkXCI6IFwiZWNobyBgZWNobyBSZWJ1aWx0IC4vaW5kZXguanMgJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpYCAmJiB0b3VjaCAuLi9raXQtY2xpL3NyYy9raXQuanNcIixcbiAgICBcInByZXRlc3RcIjogXCJlY2hvIFJ1bm5pbmcgdGVzdHNcIixcbiAgICBcInRlc3RcIjogXCJtb2NoYSAuL3Rlc3QvdGVzdC5qcyB8fCB0cnVlXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGFsbCcgLi9zcmMgLi90ZXN0XCIsXG4gICAgXCJ3YXRjaDpidWlsZFwiOiBcIndhdGNoICducG0tcnVuLWFsbCBidWlsZCB0ZXN0JyAuL3NyY1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIHRlc3QnIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcIjAuMS4wXCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmFiZWwtY2xpXCI6IFwiXjYuNS4xXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1LXJvbGx1cFwiOiBcIl4xLjEuMVwiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjUuMFwiLFxuICAgIFwiY2hhaS1hcy1wcm9taXNlZFwiOiBcIl41LjMuMFwiLFxuICAgIFwibW9jaGFcIjogXCJeMi40LjVcIixcbiAgICBcIm1vY2hhLXNpbm9uXCI6IFwiXjEuMS41XCIsXG4gICAgXCJub2NrXCI6IFwiXjguMC4wXCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWJhYmVsXCI6IFwiXjIuMy45XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcInNpbm9uXCI6IFwiXjEuMTcuM1wiLFxuICAgIFwic2lub24tY2hhaVwiOiBcIl4yLjguMFwiLFxuICAgIFwid2F0Y2hcIjogXCJeMC4xNy4xXCJcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxpc3RGaWxlcyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRmlsZSgpO1xuICB9KTtcbn07XG5cbmNvbnN0IGxpc3RGb2xkZXJzID0gKGZvbGRlclBhdGgpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIGl0ZW1QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGl0ZW0pO1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhpdGVtUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlQ29udGVudHMgPSAoZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmcy51bmxpbmtTeW5jKGZpbGVQYXRoKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChmaWxlUGF0aCwgZGF0YSkgPT4ge1xuICByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGxpc3RGaWxlcyxcbiAgbGlzdEZvbGRlcnMsXG4gIGRlbGV0ZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY3dkOiBwcm9jZXNzLmN3ZCxcbiAgZ2V0RmlsZUNvbnRlbnRzLFxuICBmaWxlRXhpc3RzXG59O1xuIiwiLy8gVGFrZW4gZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9qdXN0bW9vbi8xNTUxMWY5MmU1MjE2ZmEyNjI0YlxuaW1wb3J0IHsgaW5oZXJpdHMgfSBmcm9tICd1dGlsJztcblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDdXN0b21FcnJvcihtZXNzYWdlLCBleHRyYSkge1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLmV4dHJhID0gZXh0cmE7XG59O1xuXG5pbmhlcml0cyhDdXN0b21FcnJvciwgRXJyb3IpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IEN1c3RvbUVycm9yIGZyb20gJy4vY3VzdG9tX2Vycm9yJztcblxuY29uc3QgQ09ORklHX0ZJTEVOQU1FID0gJy52b29nJztcblxuY29uc3QgSE9NRURJUiA9IHByb2Nlc3MuZW52Wyhwcm9jZXNzLnBsYXRmb3JtID09ICd3aW4zMicpID8gJ1VTRVJQUk9GSUxFJyA6ICdIT01FJ107XG5jb25zdCBMT0NBTERJUiA9IHByb2Nlc3MuY3dkKCk7XG5cbmNvbnN0IExPQ0FMX0NPTkZJRyA9IHBhdGguam9pbihMT0NBTERJUiwgQ09ORklHX0ZJTEVOQU1FKTtcbmNvbnN0IEdMT0JBTF9DT05GSUcgPSBwYXRoLmpvaW4oSE9NRURJUiwgQ09ORklHX0ZJTEVOQU1FKTtcblxuY29uc3QgZmluZExvY2FsQ29uZmlnID0gKCkgPT4ge1xuICBpZiAoZmlsZUV4aXN0cyhwYXRoLmpvaW4ocGF0aC5yZXNvbHZlKExPQ0FMRElSLCAnLi4nKSwgQ09ORklHX0ZJTEVOQU1FKSkpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHBhdGgucmVzb2x2ZShMT0NBTERJUiwgJy4uJyksIENPTkZJR19GSUxFTkFNRSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIExPQ0FMX0NPTkZJRztcbiAgfVxufTtcblxuY29uc3Qgc2l0ZUJ5TmFtZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIHNpdGVzKG9wdGlvbnMpLmZpbHRlcihwID0+IHAubmFtZSA9PT0gbmFtZSB8fCBwLmhvc3QgPT09IG5hbWUpWzBdO1xufTtcblxuY29uc3Qgc2l0ZXMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiByZWFkKCdzaXRlcycsIG9wdGlvbnMpIHx8IFtdO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoa2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhmaWxlUGF0aCkpIHtcbiAgICBjcmVhdGUob3B0aW9ucyk7XG4gIH1cblxuICBsZXQgY29uZmlnID0gcmVhZChudWxsLCBvcHRpb25zKSB8fCB7fTtcbiAgY29uZmlnW2tleV0gPSB2YWx1ZTtcblxuICBsZXQgZmlsZUNvbnRlbnRzID0gSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKTtcblxuICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBmaWxlQ29udGVudHMpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmNvbnN0IHJlYWQgPSAoa2V5LCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVQYXRoID0gcGF0aEZyb21PcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmICghY29uZmlnRXhpc3RzKG9wdGlvbnMpKSB7XG4gICAgaWYgKGZpbGVQYXRoID09PSBMT0NBTF9DT05GSUcgJiYgY29uZmlnRXhpc3RzKE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHt9KSkpIHtcbiAgICAgIGZpbGVQYXRoID0gR0xPQkFMX0NPTkZJRztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEN1c3RvbUVycm9yKCdDb25maWd1cmF0aW9uIGZpbGUgbm90IGZvdW5kIScpO1xuICAgIH1cbiAgfVxuXG4gIGxldCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICBsZXQgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cbiAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHBhcnNlZERhdGFba2V5XTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcGFyc2VkRGF0YTtcbiAgfVxufTtcblxuY29uc3QgY3JlYXRlID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgZmlsZVBhdGggPSBwYXRoRnJvbU9wdGlvbnMob3B0aW9ucyk7XG5cbiAgaWYgKCFjb25maWdFeGlzdHMob3B0aW9ucykpIHtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCAne30nKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IHBhdGhGcm9tT3B0aW9ucyA9IChvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKChfLmhhcyhvcHRpb25zLCAnZ2xvYmFsJykgJiYgb3B0aW9ucy5nbG9iYWwgPT09IHRydWUpKSB7XG4gICAgcmV0dXJuIEdMT0JBTF9DT05GSUc7XG4gIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9ucywgJ2xvY2FsJykgJiYgb3B0aW9ucy5sb2NhbCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmaW5kTG9jYWxDb25maWcoKTtcbiAgfSBlbHNlIGlmIChfLmhhcyhvcHRpb25zLCAnY29uZmlnUGF0aCcpIHx8IF8uaGFzKG9wdGlvbnMsICdjb25maWdfcGF0aCcpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuY29uZmlnUGF0aCB8fCBvcHRpb25zLmNvbmZpZ19wYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmaW5kTG9jYWxDb25maWcoKTtcbiAgfVxufTtcblxuY29uc3QgZmlsZUV4aXN0cyA9IChmaWxlUGF0aCkgPT4ge1xuICB0cnkge1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhmaWxlUGF0aCkuaXNGaWxlKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IGNvbmZpZ0V4aXN0cyA9IChvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIGZpbGVFeGlzdHMocGF0aEZyb21PcHRpb25zKG9wdGlvbnMpKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc2l0ZUJ5TmFtZSxcbiAgc2l0ZXMsXG4gIHdyaXRlLFxuICByZWFkLFxuICBjcmVhdGUsXG4gIHBhdGhGcm9tT3B0aW9ucyxcbiAgY29uZmlnRXhpc3RzXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgbWltZSBmcm9tICdtaW1lLXR5cGUvd2l0aC1kYic7XG5cbm1pbWUuZGVmaW5lKCdhcHBsaWNhdGlvbi92bmQudm9vZy5kZXNpZ24uY3VzdG9tK2xpcXVpZCcsIHtleHRlbnNpb25zOiBbJ3RwbCddfSwgbWltZS5kdXBPdmVyd3JpdGUpO1xuXG5jb25zdCBieU5hbWUgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZUJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGFkZCA9IChkYXRhLCBvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKF8uaGFzKGRhdGEsICdob3N0JykgJiYgXy5oYXMoZGF0YSwgJ3Rva2VuJykpIHtcbiAgICBsZXQgc2l0ZXMgPSBjb25maWcuc2l0ZXMob3B0aW9ucyk7XG5cbiAgICAvLyB1cGRhdGVzIGNvbmZpZyBpZiBleHRyYSBvcHRpb25zIGFyZSBwcm92aWRlZCBhbmQgZ2l2ZW4gc2l0ZSBhbHJlYWR5IGV4aXN0c1xuICAgIHZhciBtYXRjaFNpdGUgPSBzaXRlID0+IHNpdGUuaG9zdCA9PT0gZGF0YS5ob3N0IHx8IHNpdGUubmFtZSA9PT0gZGF0YS5uYW1lO1xuICAgIGlmIChzaXRlcy5maWx0ZXIobWF0Y2hTaXRlKS5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgaWR4ID0gXy5maW5kSW5kZXgoc2l0ZXMsIG1hdGNoU2l0ZSk7XG4gICAgICBzaXRlc1tpZHhdID0gT2JqZWN0LmFzc2lnbih7fSwgc2l0ZXNbaWR4XSwgZGF0YSk7IC8vIG1lcmdlIG9sZCBhbmQgbmV3IHZhbHVlc1xuICAgIH0gZWxzZSB7XG4gICAgICBzaXRlcyA9IFtkYXRhXS5jb25jYXQoc2l0ZXMpOyAvLyBvdGhlcndpc2UgYWRkIG5ldyBzaXRlIHRvIGNvbmZpZ1xuICAgIH1cbiAgICBjb25maWcud3JpdGUoJ3NpdGVzJywgc2l0ZXMsIG9wdGlvbnMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgcmVtb3ZlID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZXNJbkNvbmZpZyA9IGNvbmZpZy5zaXRlcyhvcHRpb25zKTtcbiAgbGV0IHNpdGVOYW1lcyA9IHNpdGVzSW5Db25maWcubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG4gIGxldCBpZHggPSBzaXRlTmFtZXMuaW5kZXhPZihuYW1lKTtcbiAgaWYgKGlkeCA8IDApIHsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBmaW5hbFNpdGVzID0gc2l0ZXNJbkNvbmZpZ1xuICAgIC5zbGljZSgwLCBpZHgpXG4gICAgLmNvbmNhdChzaXRlc0luQ29uZmlnLnNsaWNlKGlkeCArIDEpKTtcblxuICByZXR1cm4gY29uZmlnLndyaXRlKCdzaXRlcycsIGZpbmFsU2l0ZXMsIG9wdGlvbnMpO1xufTtcblxuY29uc3QgZ2V0RmlsZUluZm8gPSAoZmlsZVBhdGgpID0+IHtcbiAgbGV0IHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlUGF0aCk7XG5cbiAgaWYgKHN0YXQuaXNGaWxlKCkpIHtcbiAgICBsZXQgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKTtcbiAgICByZXR1cm4ge1xuICAgICAgZmlsZTogZmlsZU5hbWUsXG4gICAgICBzaXplOiBzdGF0LnNpemUsXG4gICAgICBjb250ZW50VHlwZTogbWltZS5sb29rdXAoZmlsZU5hbWUpLFxuICAgICAgcGF0aDogZmlsZVBhdGgsXG4gICAgICB1cGRhdGVkQXQ6IHN0YXQubXRpbWVcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuY29uc3QgdG90YWxGaWxlc0ZvciA9IChzaXRlTmFtZSkgPT4ge1xuICBsZXQgZmlsZXMgPSBmaWxlc0ZvcihzaXRlTmFtZSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyhmaWxlcykucmVkdWNlKCh0b3RhbCwgZm9sZGVyKSA9PiB0b3RhbCArIGZpbGVzW2ZvbGRlcl0ubGVuZ3RoLCAwKTtcbn07XG5cbmNvbnN0IGZpbGVzRm9yID0gKG5hbWUpID0+IHtcbiAgbGV0IGZvbGRlcnMgPSBbXG4gICAgJ2Fzc2V0cycsICdjb21wb25lbnRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdsYXlvdXRzJywgJ3N0eWxlc2hlZXRzJ1xuICBdO1xuXG4gIGxldCB3b3JraW5nRGlyID0gZGlyRm9yKG5hbWUpO1xuXG4gIGxldCByb290ID0gZmlsZVV0aWxzLmxpc3RGb2xkZXJzKHdvcmtpbmdEaXIpO1xuXG4gIGlmIChyb290KSB7XG4gICAgcmV0dXJuIGZvbGRlcnMucmVkdWNlKChzdHJ1Y3R1cmUsIGZvbGRlcikgPT4ge1xuICAgICAgaWYgKHJvb3QuaW5kZXhPZihmb2xkZXIpID49IDApIHtcbiAgICAgICAgbGV0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4od29ya2luZ0RpciwgZm9sZGVyKTtcbiAgICAgICAgc3RydWN0dXJlW2ZvbGRlcl0gPSBmaWxlVXRpbHMubGlzdEZpbGVzKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuICAgICAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgcmV0dXJuIHN0YXQuaXNGaWxlKCk7XG4gICAgICAgIH0pLm1hcChmaWxlID0+IHtcbiAgICAgICAgICBsZXQgZnVsbFBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZSk7XG5cbiAgICAgICAgICByZXR1cm4gZ2V0RmlsZUluZm8oZnVsbFBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJ1Y3R1cmU7XG4gICAgfSwge30pO1xuICB9XG59O1xuXG5jb25zdCBkaXJGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBpZiAob3B0aW9ucy5kaXIgfHwgb3B0aW9ucy5wYXRoKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZGlyIHx8IG9wdGlvbnMucGF0aDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuZGlyIHx8IHNpdGUucGF0aDtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBob3N0bmFtZSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIG5hbWUgaW4gdGhlIGNvbmZpZ3VyYXRpb25cbiAqIFByZWZlcnMgZXhwbGljaXQgb3B0aW9ucyBvdmVyIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgdmFsdWVzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgICAgICAgICBTaXRlIG5hbWUgaW4gdGhlIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSAge09iamVjdH0gW29wdGlvbnM9e31dIE9iamVjdCB3aXRoIHZhbHVlcyB0aGF0IG92ZXJyaWRlIGRlZmF1bHQgY29uZmlndXJhdGlvbiB2YWx1ZXNcbiAqIEByZXR1cm4ge3N0cmluZz99ICAgICAgICAgICAgIFRoZSBmaW5hbCBob3N0bmFtZSBmb3IgdGhlIGdpdmVuIG5hbWVcbiAqL1xuY29uc3QgaG9zdEZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGxldCBob3N0O1xuICBpZiAob3B0aW9ucy5ob3N0KSB7XG4gICAgaG9zdCA9IG9wdGlvbnMuaG9zdDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgaG9zdCA9IHNpdGUuaG9zdDtcbiAgfVxuICBpZiAoaG9zdCkge1xuICAgIHJldHVybiAob3B0aW9ucy5wcm90b2NvbCA/IGAke29wdGlvbnMucHJvdG9jb2x9Oi8vYCA6ICcnKSArIGhvc3QucmVwbGFjZSgvXmh0dHBzPzpcXC9cXC8vLCAnJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIEFQSSB0b2tlbiBmb3IgdGhlIGdpdmVuIHNpdGUgbmFtZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lICAgICAgICAgU2l0ZSBuYW1lIGluIHRoZSBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gIHtPYmplY3R9IFtvcHRpb25zPXt9XSBPYmplY3Qgd2l0aCB2YWx1ZXMgdGhhdCBvdmVycmlkZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gdmFsdWVzXG4gKiBAcmV0dXJuIHtzdHJpbmc/fSAgICAgICAgICAgICBUaGUgQVBJIHRva2VuIGZvciB0aGUgZ2l2ZW4gc2l0ZVxuICovXG5jb25zdCB0b2tlbkZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGlmIChvcHRpb25zLnRva2VuIHx8IG9wdGlvbnMuYXBpX3Rva2VuKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMudG9rZW4gfHwgb3B0aW9ucy5hcGlfdG9rZW47XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLnRva2VuIHx8IHNpdGUuYXBpX3Rva2VuO1xuICB9XG59O1xuXG5jb25zdCBuYW1lcyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMob3B0aW9ucykubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG59O1xuXG5jb25zdCBob3N0cyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMob3B0aW9ucykubWFwKHNpdGUgPT4gc2l0ZS5ob3N0KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgYnlOYW1lLFxuICBhZGQsXG4gIHJlbW92ZSxcbiAgdG90YWxGaWxlc0ZvcixcbiAgZmlsZXNGb3IsXG4gIGRpckZvcixcbiAgaG9zdEZvcixcbiAgdG9rZW5Gb3IsXG4gIG5hbWVzLFxuICBob3N0cyxcbiAgZ2V0RmlsZUluZm9cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBzaXRlcyBmcm9tICcuL3NpdGVzJztcbmltcG9ydCBWb29nIGZyb20gJ3Zvb2cnO1xuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQcm9taXNlfSBmcm9tICdibHVlYmlyZCc7XG5cbmNvbnN0IGNsaWVudEZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGhvc3QgPSBzaXRlcy5ob3N0Rm9yKG5hbWUsIG9wdGlvbnMpO1xuICBsZXQgdG9rZW4gPSBzaXRlcy50b2tlbkZvcihuYW1lLCBvcHRpb25zKTtcbiAgbGV0IHByb3RvY29sID0gb3B0aW9ucy5wcm90b2NvbDtcblxuICBpZiAoaG9zdCAmJiB0b2tlbikge1xuICAgIHJldHVybiBuZXcgVm9vZyhob3N0LCB0b2tlbiwgcHJvdG9jb2wpO1xuICB9XG59O1xuXG5jb25zdCBnZXRUb3RhbEZpbGVDb3VudCA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBQcm9taXNlLmFsbChbZ2V0TGF5b3V0cyhuYW1lLCBvcHRpb25zKSwgZ2V0TGF5b3V0QXNzZXRzKG5hbWUsIG9wdGlvbnMpXSkudGhlbigoW2xheW91dHMsIGFzc2V0c10pID0+IHtcbiAgICAgIHJlc29sdmUobGF5b3V0cy5sZW5ndGggKyBhc3NldHMubGVuZ3RoKTtcbiAgICB9KS5jYXRjaChyZWplY3QpO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dENvbnRlbnRzID0gKHNpdGVOYW1lLCBpZCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXQoaWQsIHt9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICByZXNvbHZlKGRhdGEuYm9keSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRDb250ZW50cyA9IChzaXRlTmFtZSwgaWQsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0QXNzZXQoaWQsIHt9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICBpZiAoZGF0YS5lZGl0YWJsZSkge1xuICAgICAgICByZXNvbHZlKGRhdGEuZGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKGRhdGEucHVibGljX3VybCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0cyA9IChzaXRlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKVxuICAgICAgLmxheW91dHMoT2JqZWN0LmFzc2lnbih7fSwge3Blcl9wYWdlOiAyNTB9LCBvcHRpb25zKSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRBc3NldHMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucylcbiAgICAgIC5sYXlvdXRBc3NldHMoT2JqZWN0LmFzc2lnbih7fSwge3Blcl9wYWdlOiAyNTB9LCBvcHRpb25zKSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdWxsQWxsRmlsZXMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcblxuICAgIFByb21pc2UuYWxsKFtcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLFxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKVxuICAgIF0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgIGxheW91dHMubWFwKGwgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtsLmNvbXBvbmVudCA/ICdjb21wb25lbnRzJyA6ICdsYXlvdXRzJ30vJHtub3JtYWxpemVUaXRsZShsLnRpdGxlKX0udHBsYCk7XG4gICAgICAgICAgcmV0dXJuIHB1bGxGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH0pLmNvbmNhdChhc3NldHMubWFwKGEgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGEuYXNzZXRfdHlwZSkgPyBhLmFzc2V0X3R5cGUgOiAnYXNzZXQnfXMvJHthLmZpbGVuYW1lfWApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KSlcbiAgICAgIF0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGb2xkZXJDb250ZW50cyA9IChzaXRlTmFtZSwgZm9sZGVyLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBzd2l0Y2ggKGZvbGRlcikge1xuICAgIGNhc2UgJ2xheW91dHMnOlxuICAgICAgZ2V0TGF5b3V0cyhzaXRlTmFtZSwgb3B0aW9ucykudGhlbihsYXlvdXRzID0+IHJlc29sdmUobGF5b3V0cy5maWx0ZXIobCA9PiAhbC5jb21wb25lbnQpKSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NvbXBvbmVudHMnOlxuICAgICAgZ2V0TGF5b3V0cyhzaXRlTmFtZSwgb3B0aW9ucykudGhlbihsYXlvdXRzID0+IHJlc29sdmUobGF5b3V0cy5maWx0ZXIobCA9PiBsLmNvbXBvbmVudCkpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYXNzZXRzJzpcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucykudGhlbihhc3NldHMgPT4gcmVzb2x2ZShhc3NldHMuZmlsdGVyKGEgPT4gIV8uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgYS5hc3NldF90eXBlKSkpKS5jYXRjaChyZWplY3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnaW1hZ2VzJzpcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucykudGhlbihhc3NldHMgPT4gcmVzb2x2ZShhc3NldHMuZmlsdGVyKGEgPT4gYS5hc3NldF90eXBlID09PSAnaW1hZ2UnKSkpLmNhdGNoKHJlamVjdCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdqYXZhc2NyaXB0cyc6XG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oYXNzZXRzID0+IHJlc29sdmUoYXNzZXRzLmZpbHRlcihhID0+IGEuYXNzZXRfdHlwZSA9PT0gJ2phdmFzY3JpcHQnKSkpLmNhdGNoKHJlamVjdCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdzdHlsZXNoZWV0cyc6XG4gICAgICBnZXRMYXlvdXRBc3NldHMoc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oYXNzZXRzID0+IHJlc29sdmUoYXNzZXRzLmZpbHRlcihhID0+IGEuYXNzZXRfdHlwZSA9PT0gJ3N0eWxlc2hlZXQnKSkpLmNhdGNoKHJlamVjdCk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmVzb2x2ZShbXSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGdldEZpbGVUeXBlRm9yRm9sZGVyID0gKGZvbGRlcikgPT4ge1xuICByZXR1cm4ge1xuICAgICdsYXlvdXRzJzogJ2xheW91dCcsXG4gICAgJ2NvbXBvbmVudHMnOiAnbGF5b3V0JyxcbiAgICAnYXNzZXRzJzogJ2Fzc2V0JyxcbiAgICAnaW1hZ2VzJzogJ2Fzc2V0JyxcbiAgICAnamF2YXNjcmlwdHMnOiAnYXNzZXQnLFxuICAgICdzdHlsZXNoZWV0cyc6ICdhc3NldCdcbiAgfVtmb2xkZXJdO1xufTtcblxuY29uc3QgcHVsbEZvbGRlciA9IChzaXRlTmFtZSwgZm9sZGVyLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gICAgbGV0IGZpbGVUeXBlID0gZ2V0RmlsZVR5cGVGb3JGb2xkZXIoZm9sZGVyKTtcblxuICAgIFByb21pc2UuYWxsKGdldEZvbGRlckNvbnRlbnRzKHNpdGVOYW1lLCBmb2xkZXIsIG9wdGlvbnMpKS50aGVuKGZpbGVzID0+IHtcbiAgICAgIFByb21pc2UubWFwKGZpbGVzLCBmID0+IHtcbiAgICAgICAgbGV0IGZpbGVQYXRoO1xuICAgICAgICBpZiAoZmlsZVR5cGUgPT09ICdsYXlvdXQnKSB7XG4gICAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Zi5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUoZi50aXRsZSl9LnRwbGApO1xuICAgICAgICB9IGVsc2UgaWYgKGZpbGVUeXBlID09PSAnYXNzZXQnKSB7XG4gICAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBmLmFzc2V0X3R5cGUpID8gZi5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7Zi5maWxlbmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlsZVBhdGgpIHtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSkudGhlbihyZXNvbHZlKTtcbiAgICB9KS5jYXRjaChyZWplY3QpO1xuICB9KTtcbn07XG5cbmNvbnN0IHB1c2hGb2xkZXIgPSAoc2l0ZU5hbWUsIGZvbGRlciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaWxlVHlwZSA9IGdldEZpbGVUeXBlRm9yRm9sZGVyKGZvbGRlcik7XG5cbiAgICBQcm9taXNlLmFsbChnZXRGb2xkZXJDb250ZW50cyhzaXRlTmFtZSwgZm9sZGVyLCBvcHRpb25zKSkudGhlbihmaWxlcyA9PiB7XG4gICAgICBQcm9taXNlLm1hcChmaWxlcywgZiA9PiB7XG4gICAgICAgIGxldCBmaWxlUGF0aDtcbiAgICAgICAgaWYgKGZpbGVUeXBlID09PSAnbGF5b3V0Jykge1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke2YuY29tcG9uZW50ID8gJ2NvbXBvbmVudHMnIDogJ2xheW91dHMnfS8ke25vcm1hbGl6ZVRpdGxlKGYudGl0bGUpfS50cGxgKTtcbiAgICAgICAgfSBlbHNlIGlmIChmaWxlVHlwZSA9PT0gJ2Fzc2V0Jykge1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKHNpdGVEaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgZi5hc3NldF90eXBlKSA/IGYuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2YuZmlsZW5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICAgICAgcmV0dXJuIHB1c2hGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdXNoQWxsRmlsZXMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcblxuICAgIFByb21pc2UuYWxsKFtcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLFxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKVxuICAgIF0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgIGxheW91dHMubWFwKGwgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtsLmNvbXBvbmVudCA/ICdjb21wb25lbnRzJyA6ICdsYXlvdXRzJ30vJHtub3JtYWxpemVUaXRsZShsLnRpdGxlKX0udHBsYCk7XG4gICAgICAgICAgcmV0dXJuIHB1c2hGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH0pLmNvbmNhdChhc3NldHMubWFwKGEgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGEuYXNzZXRfdHlwZSkgPyBhLmFzc2V0X3R5cGUgOiAnYXNzZXQnfXMvJHthLmZpbGVuYW1lfWApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KSlcbiAgICAgIF0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0T3JDb21wb25lbnQgPSAoZmlsZU5hbWUsIGNvbXBvbmVudCwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgbmFtZSA9IG5vcm1hbGl6ZVRpdGxlKGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXQuY29tcG9uZW50JzogY29tcG9uZW50IHx8IGZhbHNlXG4gICAgfSwgKGVyciwgZGF0YSA9IFtdKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICBsZXQgcmV0ID0gZGF0YS5maWx0ZXIobCA9PiBub3JtYWxpemVUaXRsZShsLnRpdGxlKS50b0xvd2VyQ2FzZSgpID09IG5hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgICBpZiAocmV0Lmxlbmd0aCA9PT0gMCkgeyByZXNvbHZlKHVuZGVmaW5lZCk7IH1cbiAgICAgIHJlc29sdmUoXy5oZWFkKHJldCkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGZpbmRMYXlvdXRBc3NldCA9IChmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJldHVybiBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpLmxheW91dEFzc2V0cyh7XG4gICAgICBwZXJfcGFnZTogMjUwLFxuICAgICAgJ3EubGF5b3V0X2Fzc2V0LmZpbGVuYW1lJzogZmlsZU5hbWVcbiAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICByZXNvbHZlKF8uaGVhZChkYXRhKSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0RmlsZU5hbWVGcm9tUGF0aCA9IChmaWxlUGF0aCkgPT4ge1xuICByZXR1cm4gZmlsZVBhdGguc3BsaXQoJy8nKVsxXTtcbn07XG5cbmNvbnN0IGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUgPSAoZmlsZU5hbWUpID0+IHtcbiAgcmV0dXJuIF8uaGVhZChmaWxlTmFtZS5zcGxpdCgnLnRwbCcpKTtcbn07XG5cbmNvbnN0IGZpbmRGaWxlID0gKGZpbGVQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICBsZXQgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVQYXRoKTtcblxuICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICByZXR1cm4gZmluZExheW91dE9yQ29tcG9uZW50KGZpbGVOYW1lLCAodHlwZSA9PSAnY29tcG9uZW50JyksIHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmluZExheW91dEFzc2V0KGZpbGVOYW1lLCBzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIH1cbn07XG5cbmNvbnN0IHRpdGxlRnJvbUZpbGVuYW1lID0gKGZpbGVOYW1lKSA9PiB7XG4gIHJldHVybiBfLmhlYWQoZmlsZU5hbWUuc3BsaXQoJy4nKSkucmVwbGFjZSgvXy8sICcgJyk7XG59O1xuXG5jb25zdCBub3JtYWxpemVUaXRsZSA9ICh0aXRsZSkgPT4ge1xuICByZXR1cm4gdGl0bGUucmVwbGFjZSgvW15cXHdcXC1cXC5dL2csICdfJykudG9Mb3dlckNhc2UoKTtcbn07XG5cbmNvbnN0IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoID0gKHBhdGgpID0+IHtcbiAgbGV0IGZvbGRlciA9IHBhdGguc3BsaXQoJy8nKVswXTtcbiAgbGV0IGZvbGRlclRvVHlwZU1hcCA9IHtcbiAgICAnbGF5b3V0cyc6ICdsYXlvdXQnLFxuICAgICdjb21wb25lbnRzJzogJ2NvbXBvbmVudCcsXG4gICAgJ2Fzc2V0cyc6ICdhc3NldCcsXG4gICAgJ2ltYWdlcyc6ICdpbWFnZScsXG4gICAgJ2phdmFzY3JpcHRzJzogJ2phdmFzY3JpcHQnLFxuICAgICdzdHlsZXNoZWV0cyc6ICdzdHlsZXNoZWV0J1xuICB9O1xuXG4gIHJldHVybiBmb2xkZXJUb1R5cGVNYXBbZm9sZGVyXTtcbn07XG5cbmNvbnN0IGdldFR5cGVGcm9tRXh0ZW5zaW9uID0gKGZpbGVOYW1lKSA9PiB7XG4gIGlmIChmaWxlTmFtZS5zcGxpdCgnLicpLmxlbmd0aCA+IDEpIHtcbiAgICBsZXQgZXh0ZW5zaW9uID0gXy5sYXN0KGZpbGVOYW1lLnNwbGl0KCcuJykpO1xuXG4gICAgc3dpdGNoIChleHRlbnNpb24pIHtcbiAgICBjYXNlICdqcyc6XG4gICAgICByZXR1cm4gJ2phdmFzY3JpcHQnO1xuICAgIGNhc2UgJ2Nzcyc6XG4gICAgICByZXR1cm4gJ3N0eWxlc2hlZXQnO1xuICAgIGNhc2UgJ2pwZyc6XG4gICAgY2FzZSAncG5nJzpcbiAgICBjYXNlICdqcGVnJzpcbiAgICBjYXNlICdnaWYnOlxuICAgICAgcmV0dXJuICdpbWFnZSc7XG4gICAgY2FzZSAndHBsJzpcbiAgICAgIHJldHVybiAnbGF5b3V0JztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICdhc3NldCc7XG4gICAgfVxuICB9XG59O1xuXG5jb25zdCBnZXRTdWJmb2xkZXJGb3JUeXBlID0gKHR5cGUpID0+IHtcbiAgcmV0dXJuIHtcbiAgICAnYXNzZXQnOiAnYXNzZXRzJyxcbiAgICAnaW1hZ2UnOiAnaW1hZ2VzJyxcbiAgICAnamF2YXNjcmlwdCc6ICdqYXZhc2NyaXB0cycsXG4gICAgJ3N0eWxlc2hlZXQnOiAnc3R5bGVzaGVldHMnLFxuICAgICdjb21wb25lbnQnOiAnY29tcG9uZW50cycsXG4gICAgJ2xheW91dCc6ICdsYXlvdXRzJ1xuICB9W3R5cGVdO1xufTtcblxuY29uc3Qgbm9ybWFsaXplUGF0aCA9IChwYXRoLCBzaXRlRGlyKSA9PiB7XG4gIHJldHVybiBwYXRoXG4gICAgLnJlcGxhY2Uoc2l0ZURpciwgJycpXG4gICAgLnJlcGxhY2UoL15cXC8vLCAnJyk7XG59O1xuXG5jb25zdCB3cml0ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGUsIGRlc3RQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBpZiAoXy5pbmNsdWRlcyhPYmplY3Qua2V5cyhmaWxlKSwgJ2xheW91dF9uYW1lJykpIHtcbiAgICAgIGdldExheW91dENvbnRlbnRzKHNpdGVOYW1lLCBmaWxlLmlkLCBvcHRpb25zKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGZpbGUuZWRpdGFibGUpIHtcbiAgICAgIGdldExheW91dEFzc2V0Q29udGVudHMoc2l0ZU5hbWUsIGZpbGUuaWQsIG9wdGlvbnMpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZTsgfVxuICAgICAgICB9XG4gICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHVybCA9IGZpbGUucHVibGljX3VybDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlOyB9XG4gICAgICB9XG5cbiAgICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0UGF0aCk7XG4gICAgICBpZiAodXJsICYmIHN0cmVhbSkge1xuICAgICAgICBsZXQgcmVxID0gcmVxdWVzdC5nZXQodXJsKS5vbignZXJyb3InLCAoZXJyKSA9PiByZWplY3QoZXJyKSk7XG4gICAgICAgIHJlcS5waXBlKHN0cmVhbSk7XG4gICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWplY3QobnVsbCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IHVwbG9hZEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKE9iamVjdC5rZXlzKGZpbGUpLCAnbGF5b3V0X25hbWUnKSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXQoZmlsZS5pZCwge1xuICAgICAgICAgIGJvZHk6IGNvbnRlbnRzXG4gICAgICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGxldCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dEFzc2V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBkYXRhOiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZVBhdGgsIG1lc3NhZ2U6ICdVbmFibGUgdG8gdXBkYXRlIGZpbGUhJ30pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjcmVhdGVGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucykudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBjcmVhdGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICAgIGxldCBmaWxlID0gZmlsZU9iamVjdEZyb21QYXRoKGZpbGVQYXRoKTtcblxuICAgIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgICAgY2xpZW50LmNyZWF0ZUxheW91dChmaWxlLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbGllbnQuY3JlYXRlTGF5b3V0QXNzZXQoZmlsZSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlLCBtZXNzYWdlOiAnVW5hYmxlIHRvIGNyZWF0ZSBmaWxlISd9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgZmlsZU9iamVjdEZyb21QYXRoID0gKGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlUGF0aCk7XG4gIGxldCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZVBhdGgpO1xuXG4gIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogXy5oYXMob3B0aW9ucywgJ3RpdGxlJykgPyBvcHRpb25zLnRpdGxlIDogdGl0bGVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpLFxuICAgICAgY29tcG9uZW50OiB0eXBlID09ICdjb21wb25lbnQnLFxuICAgICAgY29udGVudF90eXBlOiBfLmhhcyhvcHRpb25zLCAnY29udGVudF90eXBlJykgPyBvcHRpb25zLmNvbnRlbnRfdHlwZSA6ICdwYWdlJyxcbiAgICAgIGJvZHk6IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKSxcbiAgICAgIHBhcmVudF9pZDogXy5oYXMob3B0aW9ucywgJ3BhcmVudF9pZCcpID8gb3B0aW9ucy5wYXJlbnRfaWQgOiBudWxsLFxuICAgICAgcGFyZW50X3RpdGxlOiBfLmhhcyhvcHRpb25zLCAncGFyZW50X3RpdGxlJykgPyBvcHRpb25zLnBhcmVudF90aXRsZSA6IG51bGxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICBmaWxlbmFtZTogZmlsZU5hbWUsXG4gICAgICBkYXRhOiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4JylcbiAgICB9O1xuICB9XG59O1xuXG5jb25zdCBwdWxsRmlsZSA9IChzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIGxldCBub3JtYWxpemVkUGF0aCA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgsIHNpdGVEaXIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZmluZEZpbGUobm9ybWFsaXplZFBhdGgsIHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKCFmaWxlIHx8IHR5cGVvZiBmaWxlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGVQYXRoLCBtZXNzYWdlOiAnRmlsZSBub3QgZm91bmQnfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHdyaXRlRmlsZShzaXRlTmFtZSwgZmlsZSwgZmlsZVBhdGgsIG9wdGlvbnMpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdXNoRmlsZSA9IChzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIGxldCBub3JtYWxpemVkUGF0aCA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgsIHNpdGVEaXIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZmluZEZpbGUobm9ybWFsaXplZFBhdGgsIHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKCFmaWxlIHx8IHR5cGVvZiBmaWxlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGVQYXRoLCBtZXNzYWdlOiAnRmlsZSBub3QgZm91bmQnfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHVwbG9hZEZpbGUoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgYWRkRmlsZSA9IChzaXRlTmFtZSwgZmlsZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBmaWxlO1xuICAgIGxldCB0eXBlO1xuXG4gICAgaWYgKGZpbGVOYW1lLnNwbGl0KCcvJykubGVuZ3RoID4gMSkge1xuICAgICAgZmlsZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZU5hbWUsIG9wdGlvbnMpO1xuICAgICAgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZSA9IGZpbGVOYW1lO1xuICAgICAgdHlwZSA9IGdldFR5cGVGcm9tRXh0ZW5zaW9uKGZpbGVOYW1lKTtcbiAgICB9XG5cbiAgICBsZXQgc3ViRm9sZGVyID0gZ2V0U3ViZm9sZGVyRm9yVHlwZSh0eXBlKTtcbiAgICBsZXQgcHJvamVjdERpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gICAgbGV0IGZpbmFsUGF0aCA9IHBhdGguam9pbihwcm9qZWN0RGlyLCBzdWJGb2xkZXIsIGZpbGUpO1xuXG4gICAgbGV0IHJlbGF0aXZlUGF0aCA9IGZpbmFsUGF0aC5yZXBsYWNlKHByb2plY3REaXIgKyAnLycsICcnKTtcblxuICAgIGlmIChmaWxlVXRpbHMuZmlsZUV4aXN0cyhyZWxhdGl2ZVBhdGgsIG9wdGlvbnMpIHx8IHR5cGVvZiBmaWxlVXRpbHMud3JpdGVGaWxlKHJlbGF0aXZlUGF0aCwgJycpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXNvbHZlKGNyZWF0ZUZpbGUoc2l0ZU5hbWUsIHJlbGF0aXZlUGF0aCwgb3B0aW9ucykpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGVOYW1lLCBtZXNzYWdlOiAnVW5hYmxlIHRvIGNyZWF0ZSBmaWxlISd9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgZGVsZXRlRmlsZSA9IChzaXRlTmFtZSwgZmlsZU5hbWUsIG9wdGlvbnMpID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVOYW1lKTtcblxuICAgIGZpbmRGaWxlKGZpbGVOYW1lLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgICAgICBjbGllbnQuZGVsZXRlTGF5b3V0KGZpbGUuaWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xpZW50LmRlbGV0ZUxheW91dEFzc2V0KGZpbGUuaWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IHJlbW92ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZmlsZTtcbiAgICBsZXQgdHlwZTtcblxuICAgIGlmIChmaWxlTmFtZS5zcGxpdCgnLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZpbGUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVOYW1lLCBvcHRpb25zKTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGUgPSBmaWxlTmFtZTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbUV4dGVuc2lvbihmaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgbGV0IHN1YkZvbGRlciA9IGdldFN1YmZvbGRlckZvclR5cGUodHlwZSk7XG4gICAgbGV0IHByb2plY3REaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaW5hbFBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgc3ViRm9sZGVyLCBmaWxlKTtcblxuICAgIGxldCByZWxhdGl2ZVBhdGggPSBmaW5hbFBhdGgucmVwbGFjZShwcm9qZWN0RGlyICsgJy8nLCAnJyk7XG5cbiAgICBpZiAoZmlsZVV0aWxzLmZpbGVFeGlzdHMoZmluYWxQYXRoLCBvcHRpb25zKSB8fCB0eXBlb2YgZmlsZVV0aWxzLmRlbGV0ZUZpbGUocmVsYXRpdmVQYXRoKSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmVzb2x2ZShkZWxldGVGaWxlKHNpdGVOYW1lLCByZWxhdGl2ZVBhdGgsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlTmFtZSwgbWVzc2FnZTogJ1VuYWJsZSB0byByZW1vdmUgZmlsZSEnfSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgY2xpZW50Rm9yLFxuICBnZXRUb3RhbEZpbGVDb3VudCxcbiAgcHVsbEFsbEZpbGVzLFxuICBwdXNoQWxsRmlsZXMsXG4gIGZpbmRGaWxlLFxuICBwdXNoRmlsZSxcbiAgcHVsbEZpbGUsXG4gIHB1bGxGb2xkZXIsXG4gIHB1c2hGb2xkZXIsXG4gIGNyZWF0ZUZpbGUsXG4gIGFkZEZpbGUsXG4gIHJlbW92ZUZpbGVcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCB7dmVyc2lvbn0gZnJvbSAnLi4vcGFja2FnZS5qc29uJztcblxuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgc2l0ZXMgZnJvbSAnLi9zaXRlcyc7XG5pbXBvcnQgYWN0aW9ucyBmcm9tICcuL2FjdGlvbnMnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGZpbGVVdGlscyxcbiAgY29uZmlnLFxuICBzaXRlcyxcbiAgYWN0aW9ucyxcbiAgdmVyc2lvblxufTtcbiJdLCJuYW1lcyI6WyJpbmhlcml0cyIsImZpbGVFeGlzdHMiLCJzaXRlcyIsIlByb21pc2UiLCJ3cml0ZUZpbGUiLCJkZWxldGVGaWxlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNLQSxJQUFNLFlBQVksU0FBWixTQUFZLENBQUMsVUFBRCxF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