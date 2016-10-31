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

var version = "0.2.1";

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
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4yLjFcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYWxsXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3RcIixcbiAgICBcInByZWJ1aWxkXCI6IFwiZWNobyBSZWJ1aWxkaW5nIC4vaW5kZXguanNcIixcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtY1wiLFxuICAgIFwicG9zdGJ1aWxkXCI6IFwiZWNobyBgZWNobyBSZWJ1aWx0IC4vaW5kZXguanMgJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpYCAmJiB0b3VjaCAuLi9raXQtY2xpL3NyYy9raXQuanNcIixcbiAgICBcInByZXRlc3RcIjogXCJlY2hvIFJ1bm5pbmcgdGVzdHNcIixcbiAgICBcInRlc3RcIjogXCJtb2NoYSAuL3Rlc3QvdGVzdC5qcyB8fCB0cnVlXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGFsbCcgLi9zcmMgLi90ZXN0XCIsXG4gICAgXCJ3YXRjaDpidWlsZFwiOiBcIndhdGNoICducG0tcnVuLWFsbCBidWlsZCB0ZXN0JyAuL3NyY1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIHRlc3QnIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcIjAuMS4wXCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmFiZWwtY2xpXCI6IFwiXjYuNS4xXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1LXJvbGx1cFwiOiBcIl4xLjEuMVwiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjUuMFwiLFxuICAgIFwiY2hhaS1hcy1wcm9taXNlZFwiOiBcIl41LjMuMFwiLFxuICAgIFwibW9jaGFcIjogXCJeMi40LjVcIixcbiAgICBcIm1vY2hhLXNpbm9uXCI6IFwiXjEuMS41XCIsXG4gICAgXCJub2NrXCI6IFwiXjguMC4wXCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWJhYmVsXCI6IFwiXjIuMy45XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcInNpbm9uXCI6IFwiXjEuMTcuM1wiLFxuICAgIFwic2lub24tY2hhaVwiOiBcIl4yLjguMFwiLFxuICAgIFwid2F0Y2hcIjogXCJeMC4xNy4xXCJcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxpc3RGaWxlcyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRmlsZSgpO1xuICB9KTtcbn07XG5cbmNvbnN0IGxpc3RGb2xkZXJzID0gKGZvbGRlclBhdGgpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIGl0ZW1QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGl0ZW0pO1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhpdGVtUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlQ29udGVudHMgPSAoZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmcy51bmxpbmtTeW5jKGZpbGVQYXRoKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChmaWxlUGF0aCwgZGF0YSkgPT4ge1xuICByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGxpc3RGaWxlcyxcbiAgbGlzdEZvbGRlcnMsXG4gIGRlbGV0ZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY3dkOiBwcm9jZXNzLmN3ZCxcbiAgZ2V0RmlsZUNvbnRlbnRzLFxuICBmaWxlRXhpc3RzXG59O1xuIiwiLy8gVGFrZW4gZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9qdXN0bW9vbi8xNTUxMWY5MmU1MjE2ZmEyNjI0YlxuaW1wb3J0IHsgaW5oZXJpdHMgfSBmcm9tICd1dGlsJztcblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDdXN0b21FcnJvcihtZXNzYWdlLCBleHRyYSkge1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLmV4dHJhID0gZXh0cmE7XG59O1xuXG5pbmhlcml0cyhDdXN0b21FcnJvciwgRXJyb3IpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IEN1c3RvbUVycm9yIGZyb20gJy4vY3VzdG9tX2Vycm9yJztcblxuY29uc3QgQ09ORklHX0ZJTEVOQU1FID0gJy52b29nJztcblxuY29uc3QgSE9NRURJUiA9IHByb2Nlc3MuZW52Wyhwcm9jZXNzLnBsYXRmb3JtID09ICd3aW4zMicpID8gJ1VTRVJQUk9GSUxFJyA6ICdIT01FJ107XG5jb25zdCBMT0NBTERJUiA9IHByb2Nlc3MuY3dkKCk7XG5cbmNvbnN0IExPQ0FMX0NPTkZJRyA9IHBhdGguam9pbihMT0NBTERJUiwgQ09ORklHX0ZJTEVOQU1FKTtcbmNvbnN0IEdMT0JBTF9DT05GSUcgPSBwYXRoLmpvaW4oSE9NRURJUiwgQ09ORklHX0ZJTEVOQU1FKTtcblxuY29uc3QgZmluZExvY2FsQ29uZmlnID0gKCkgPT4ge1xuICBpZiAoZmlsZUV4aXN0cyhwYXRoLmpvaW4ocGF0aC5yZXNvbHZlKExPQ0FMRElSLCAnLi4nKSwgQ09ORklHX0ZJTEVOQU1FKSkpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHBhdGgucmVzb2x2ZShMT0NBTERJUiwgJy4uJyksIENPTkZJR19GSUxFTkFNRSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIExPQ0FMX0NPTkZJRztcbiAgfVxufTtcblxuY29uc3Qgc2l0ZUJ5TmFtZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIHNpdGVzKG9wdGlvbnMpLmZpbHRlcihwID0+IHAubmFtZSA9PT0gbmFtZSB8fCBwLmhvc3QgPT09IG5hbWUpWzBdO1xufTtcblxuY29uc3Qgc2l0ZXMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiByZWFkKCdzaXRlcycsIG9wdGlvbnMpIHx8IFtdO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoa2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhmaWxlUGF0aCkpIHtcbiAgICBjcmVhdGUob3B0aW9ucyk7XG4gIH1cblxuICBsZXQgY29uZmlnID0gcmVhZChudWxsLCBvcHRpb25zKSB8fCB7fTtcbiAgY29uZmlnW2tleV0gPSB2YWx1ZTtcblxuICBsZXQgZmlsZUNvbnRlbnRzID0gSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKTtcblxuICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBmaWxlQ29udGVudHMpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmNvbnN0IHJlYWQgPSAoa2V5LCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVQYXRoID0gcGF0aEZyb21PcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmICghY29uZmlnRXhpc3RzKG9wdGlvbnMpKSB7XG4gICAgaWYgKGZpbGVQYXRoID09PSBMT0NBTF9DT05GSUcgJiYgY29uZmlnRXhpc3RzKE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHt9KSkpIHtcbiAgICAgIGZpbGVQYXRoID0gR0xPQkFMX0NPTkZJRztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEN1c3RvbUVycm9yKCdDb25maWd1cmF0aW9uIGZpbGUgbm90IGZvdW5kIScpO1xuICAgIH1cbiAgfVxuXG4gIGxldCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICBsZXQgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cbiAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHBhcnNlZERhdGFba2V5XTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcGFyc2VkRGF0YTtcbiAgfVxufTtcblxuY29uc3QgY3JlYXRlID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgZmlsZVBhdGggPSBwYXRoRnJvbU9wdGlvbnMob3B0aW9ucyk7XG5cbiAgaWYgKCFjb25maWdFeGlzdHMob3B0aW9ucykpIHtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCAne30nKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IHBhdGhGcm9tT3B0aW9ucyA9IChvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKChfLmhhcyhvcHRpb25zLCAnZ2xvYmFsJykgJiYgb3B0aW9ucy5nbG9iYWwgPT09IHRydWUpKSB7XG4gICAgcmV0dXJuIEdMT0JBTF9DT05GSUc7XG4gIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9ucywgJ2xvY2FsJykgJiYgb3B0aW9ucy5sb2NhbCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmaW5kTG9jYWxDb25maWcoKTtcbiAgfSBlbHNlIGlmIChfLmhhcyhvcHRpb25zLCAnY29uZmlnUGF0aCcpIHx8IF8uaGFzKG9wdGlvbnMsICdjb25maWdfcGF0aCcpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuY29uZmlnUGF0aCB8fCBvcHRpb25zLmNvbmZpZ19wYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmaW5kTG9jYWxDb25maWcoKTtcbiAgfVxufTtcblxuY29uc3QgZmlsZUV4aXN0cyA9IChmaWxlUGF0aCkgPT4ge1xuICB0cnkge1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhmaWxlUGF0aCkuaXNGaWxlKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IGNvbmZpZ0V4aXN0cyA9IChvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIGZpbGVFeGlzdHMocGF0aEZyb21PcHRpb25zKG9wdGlvbnMpKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc2l0ZUJ5TmFtZSxcbiAgc2l0ZXMsXG4gIHdyaXRlLFxuICByZWFkLFxuICBjcmVhdGUsXG4gIHBhdGhGcm9tT3B0aW9ucyxcbiAgY29uZmlnRXhpc3RzXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgbWltZSBmcm9tICdtaW1lLXR5cGUvd2l0aC1kYic7XG5cbm1pbWUuZGVmaW5lKCdhcHBsaWNhdGlvbi92bmQudm9vZy5kZXNpZ24uY3VzdG9tK2xpcXVpZCcsIHtleHRlbnNpb25zOiBbJ3RwbCddfSwgbWltZS5kdXBPdmVyd3JpdGUpO1xuXG5jb25zdCBieU5hbWUgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZUJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGFkZCA9IChkYXRhLCBvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKF8uaGFzKGRhdGEsICdob3N0JykgJiYgXy5oYXMoZGF0YSwgJ3Rva2VuJykpIHtcbiAgICBsZXQgc2l0ZXMgPSBjb25maWcuc2l0ZXMob3B0aW9ucyk7XG5cbiAgICAvLyB1cGRhdGVzIGNvbmZpZyBpZiBleHRyYSBvcHRpb25zIGFyZSBwcm92aWRlZCBhbmQgZ2l2ZW4gc2l0ZSBhbHJlYWR5IGV4aXN0c1xuICAgIHZhciBtYXRjaFNpdGUgPSBzaXRlID0+IHNpdGUuaG9zdCA9PT0gZGF0YS5ob3N0IHx8IHNpdGUubmFtZSA9PT0gZGF0YS5uYW1lO1xuICAgIGlmIChzaXRlcy5maWx0ZXIobWF0Y2hTaXRlKS5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgaWR4ID0gXy5maW5kSW5kZXgoc2l0ZXMsIG1hdGNoU2l0ZSk7XG4gICAgICBzaXRlc1tpZHhdID0gT2JqZWN0LmFzc2lnbih7fSwgc2l0ZXNbaWR4XSwgZGF0YSk7IC8vIG1lcmdlIG9sZCBhbmQgbmV3IHZhbHVlc1xuICAgIH0gZWxzZSB7XG4gICAgICBzaXRlcyA9IFtkYXRhXS5jb25jYXQoc2l0ZXMpOyAvLyBvdGhlcndpc2UgYWRkIG5ldyBzaXRlIHRvIGNvbmZpZ1xuICAgIH1cbiAgICBjb25maWcud3JpdGUoJ3NpdGVzJywgc2l0ZXMsIG9wdGlvbnMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgcmVtb3ZlID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZXNJbkNvbmZpZyA9IGNvbmZpZy5zaXRlcyhvcHRpb25zKTtcbiAgbGV0IHNpdGVOYW1lcyA9IHNpdGVzSW5Db25maWcubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG4gIGxldCBpZHggPSBzaXRlTmFtZXMuaW5kZXhPZihuYW1lKTtcbiAgaWYgKGlkeCA8IDApIHsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBmaW5hbFNpdGVzID0gc2l0ZXNJbkNvbmZpZ1xuICAgIC5zbGljZSgwLCBpZHgpXG4gICAgLmNvbmNhdChzaXRlc0luQ29uZmlnLnNsaWNlKGlkeCArIDEpKTtcblxuICByZXR1cm4gY29uZmlnLndyaXRlKCdzaXRlcycsIGZpbmFsU2l0ZXMsIG9wdGlvbnMpO1xufTtcblxuY29uc3QgZ2V0RmlsZUluZm8gPSAoZmlsZVBhdGgpID0+IHtcbiAgbGV0IHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlUGF0aCk7XG5cbiAgaWYgKHN0YXQuaXNGaWxlKCkpIHtcbiAgICBsZXQgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKTtcbiAgICByZXR1cm4ge1xuICAgICAgZmlsZTogZmlsZU5hbWUsXG4gICAgICBzaXplOiBzdGF0LnNpemUsXG4gICAgICBjb250ZW50VHlwZTogbWltZS5sb29rdXAoZmlsZU5hbWUpLFxuICAgICAgcGF0aDogZmlsZVBhdGgsXG4gICAgICB1cGRhdGVkQXQ6IHN0YXQubXRpbWVcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuY29uc3QgdG90YWxGaWxlc0ZvciA9IChzaXRlTmFtZSkgPT4ge1xuICBsZXQgZmlsZXMgPSBmaWxlc0ZvcihzaXRlTmFtZSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyhmaWxlcykucmVkdWNlKCh0b3RhbCwgZm9sZGVyKSA9PiB0b3RhbCArIGZpbGVzW2ZvbGRlcl0ubGVuZ3RoLCAwKTtcbn07XG5cbmNvbnN0IGZpbGVzRm9yID0gKG5hbWUpID0+IHtcbiAgbGV0IGZvbGRlcnMgPSBbXG4gICAgJ2Fzc2V0cycsICdjb21wb25lbnRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdsYXlvdXRzJywgJ3N0eWxlc2hlZXRzJ1xuICBdO1xuXG4gIGxldCB3b3JraW5nRGlyID0gZGlyRm9yKG5hbWUpO1xuXG4gIGxldCByb290ID0gZmlsZVV0aWxzLmxpc3RGb2xkZXJzKHdvcmtpbmdEaXIpO1xuXG4gIGlmIChyb290KSB7XG4gICAgcmV0dXJuIGZvbGRlcnMucmVkdWNlKChzdHJ1Y3R1cmUsIGZvbGRlcikgPT4ge1xuICAgICAgaWYgKHJvb3QuaW5kZXhPZihmb2xkZXIpID49IDApIHtcbiAgICAgICAgbGV0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4od29ya2luZ0RpciwgZm9sZGVyKTtcbiAgICAgICAgc3RydWN0dXJlW2ZvbGRlcl0gPSBmaWxlVXRpbHMubGlzdEZpbGVzKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuICAgICAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgcmV0dXJuIHN0YXQuaXNGaWxlKCk7XG4gICAgICAgIH0pLm1hcChmaWxlID0+IHtcbiAgICAgICAgICBsZXQgZnVsbFBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZSk7XG5cbiAgICAgICAgICByZXR1cm4gZ2V0RmlsZUluZm8oZnVsbFBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJ1Y3R1cmU7XG4gICAgfSwge30pO1xuICB9XG59O1xuXG5jb25zdCBkaXJGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBpZiAob3B0aW9ucy5kaXIgfHwgb3B0aW9ucy5wYXRoKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZGlyIHx8IG9wdGlvbnMucGF0aDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuZGlyIHx8IHNpdGUucGF0aDtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBob3N0bmFtZSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIG5hbWUgaW4gdGhlIGNvbmZpZ3VyYXRpb25cbiAqIFByZWZlcnMgZXhwbGljaXQgb3B0aW9ucyBvdmVyIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgdmFsdWVzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgICAgICAgICBTaXRlIG5hbWUgaW4gdGhlIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSAge09iamVjdH0gW29wdGlvbnM9e31dIE9iamVjdCB3aXRoIHZhbHVlcyB0aGF0IG92ZXJyaWRlIGRlZmF1bHQgY29uZmlndXJhdGlvbiB2YWx1ZXNcbiAqIEByZXR1cm4ge3N0cmluZz99ICAgICAgICAgICAgIFRoZSBmaW5hbCBob3N0bmFtZSBmb3IgdGhlIGdpdmVuIG5hbWVcbiAqL1xuY29uc3QgaG9zdEZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGxldCBob3N0O1xuICBpZiAob3B0aW9ucy5ob3N0KSB7XG4gICAgaG9zdCA9IG9wdGlvbnMuaG9zdDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgaG9zdCA9IHNpdGUuaG9zdDtcbiAgfVxuICBpZiAoaG9zdCkge1xuICAgIHJldHVybiAob3B0aW9ucy5wcm90b2NvbCA/IGAke29wdGlvbnMucHJvdG9jb2x9Oi8vYCA6ICcnKSArIGhvc3QucmVwbGFjZSgvXmh0dHBzPzpcXC9cXC8vLCAnJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIEFQSSB0b2tlbiBmb3IgdGhlIGdpdmVuIHNpdGUgbmFtZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lICAgICAgICAgU2l0ZSBuYW1lIGluIHRoZSBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gIHtPYmplY3R9IFtvcHRpb25zPXt9XSBPYmplY3Qgd2l0aCB2YWx1ZXMgdGhhdCBvdmVycmlkZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gdmFsdWVzXG4gKiBAcmV0dXJuIHtzdHJpbmc/fSAgICAgICAgICAgICBUaGUgQVBJIHRva2VuIGZvciB0aGUgZ2l2ZW4gc2l0ZVxuICovXG5jb25zdCB0b2tlbkZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSwgb3B0aW9ucyk7XG4gIGlmIChvcHRpb25zLnRva2VuIHx8IG9wdGlvbnMuYXBpX3Rva2VuKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMudG9rZW4gfHwgb3B0aW9ucy5hcGlfdG9rZW47XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLnRva2VuIHx8IHNpdGUuYXBpX3Rva2VuO1xuICB9XG59O1xuXG5jb25zdCBuYW1lcyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMob3B0aW9ucykubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG59O1xuXG5jb25zdCBob3N0cyA9IChvcHRpb25zKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMob3B0aW9ucykubWFwKHNpdGUgPT4gc2l0ZS5ob3N0KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgYnlOYW1lLFxuICBhZGQsXG4gIHJlbW92ZSxcbiAgdG90YWxGaWxlc0ZvcixcbiAgZmlsZXNGb3IsXG4gIGRpckZvcixcbiAgaG9zdEZvcixcbiAgdG9rZW5Gb3IsXG4gIG5hbWVzLFxuICBob3N0cyxcbiAgZ2V0RmlsZUluZm9cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBzaXRlcyBmcm9tICcuL3NpdGVzJztcbmltcG9ydCBWb29nIGZyb20gJ3Zvb2cnO1xuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQcm9taXNlfSBmcm9tICdibHVlYmlyZCc7XG5cbmNvbnN0IGNsaWVudEZvciA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGhvc3QgPSBzaXRlcy5ob3N0Rm9yKG5hbWUsIG9wdGlvbnMpO1xuICBsZXQgdG9rZW4gPSBzaXRlcy50b2tlbkZvcihuYW1lLCBvcHRpb25zKTtcbiAgbGV0IHByb3RvY29sID0gb3B0aW9ucy5wcm90b2NvbDtcblxuICBpZiAoaG9zdCAmJiB0b2tlbikge1xuICAgIHJldHVybiBuZXcgVm9vZyhob3N0LCB0b2tlbiwgcHJvdG9jb2wpO1xuICB9XG59O1xuXG5jb25zdCBnZXRUb3RhbEZpbGVDb3VudCA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBQcm9taXNlLmFsbChbZ2V0TGF5b3V0cyhuYW1lLCBvcHRpb25zKSwgZ2V0TGF5b3V0QXNzZXRzKG5hbWUsIG9wdGlvbnMpXSkudGhlbigoW2xheW91dHMsIGFzc2V0c10pID0+IHtcbiAgICAgIHJlc29sdmUobGF5b3V0cy5sZW5ndGggKyBhc3NldHMubGVuZ3RoKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRDb250ZW50cyA9IChzaXRlTmFtZSwgaWQsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShkYXRhLmJvZHkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dEFzc2V0Q29udGVudHMgPSAoc2l0ZU5hbWUsIGlkLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpLmxheW91dEFzc2V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgaWYgKGRhdGEuZWRpdGFibGUpIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLmRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLnB1YmxpY191cmwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dHMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucylcbiAgICAgIC5sYXlvdXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpXG4gICAgICAubGF5b3V0QXNzZXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVzaEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgZmluZExheW91dE9yQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBjb21wb25lbnQsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IG5hbWUgPSBub3JtYWxpemVUaXRsZShnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lKGZpbGVOYW1lKSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0cyh7XG4gICAgICBwZXJfcGFnZTogMjUwLFxuICAgICAgJ3EubGF5b3V0LmNvbXBvbmVudCc6IGNvbXBvbmVudCB8fCBmYWxzZVxuICAgIH0sIChlcnIsIGRhdGEgPSBbXSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgbGV0IHJldCA9IGRhdGEuZmlsdGVyKGwgPT4gbm9ybWFsaXplVGl0bGUobC50aXRsZSkudG9Mb3dlckNhc2UoKSA9PSBuYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgaWYgKHJldC5sZW5ndGggPT09IDApIHsgcmVzb2x2ZSh1bmRlZmluZWQpOyB9XG4gICAgICByZXNvbHZlKF8uaGVhZChyZXQpKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0QXNzZXQgPSAoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXRBc3NldHMoe1xuICAgICAgcGVyX3BhZ2U6IDI1MCxcbiAgICAgICdxLmxheW91dF9hc3NldC5maWxlbmFtZSc6IGZpbGVOYW1lXG4gICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShfLmhlYWQoZGF0YSkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldEZpbGVOYW1lRnJvbVBhdGggPSAoZmlsZVBhdGgpID0+IHtcbiAgcmV0dXJuIGZpbGVQYXRoLnNwbGl0KCcvJylbMV07XG59O1xuXG5jb25zdCBnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lID0gKGZpbGVOYW1lKSA9PiB7XG4gIHJldHVybiBfLmhlYWQoZmlsZU5hbWUuc3BsaXQoJy50cGwnKSk7XG59O1xuXG5jb25zdCBmaW5kRmlsZSA9IChmaWxlUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgbGV0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCk7XG5cbiAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgcmV0dXJuIGZpbmRMYXlvdXRPckNvbXBvbmVudChmaWxlTmFtZSwgKHR5cGUgPT0gJ2NvbXBvbmVudCcpLCBzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZpbmRMYXlvdXRBc3NldChmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICB9XG59O1xuXG5jb25zdCB0aXRsZUZyb21GaWxlbmFtZSA9IChmaWxlTmFtZSkgPT4ge1xuICByZXR1cm4gXy5oZWFkKGZpbGVOYW1lLnNwbGl0KCcuJykpLnJlcGxhY2UoL18vLCAnICcpO1xufTtcblxuY29uc3Qgbm9ybWFsaXplVGl0bGUgPSAodGl0bGUpID0+IHtcbiAgcmV0dXJuIHRpdGxlLnJlcGxhY2UoL1teXFx3XFwtXFwuXS9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aCA9IChwYXRoKSA9PiB7XG4gIGxldCBmb2xkZXIgPSBwYXRoLnNwbGl0KCcvJylbMF07XG4gIGxldCBmb2xkZXJUb1R5cGVNYXAgPSB7XG4gICAgJ2xheW91dHMnOiAnbGF5b3V0JyxcbiAgICAnY29tcG9uZW50cyc6ICdjb21wb25lbnQnLFxuICAgICdhc3NldHMnOiAnYXNzZXQnLFxuICAgICdpbWFnZXMnOiAnaW1hZ2UnLFxuICAgICdqYXZhc2NyaXB0cyc6ICdqYXZhc2NyaXB0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnc3R5bGVzaGVldCdcbiAgfTtcblxuICByZXR1cm4gZm9sZGVyVG9UeXBlTWFwW2ZvbGRlcl07XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbUV4dGVuc2lvbiA9IChmaWxlTmFtZSkgPT4ge1xuICBpZiAoZmlsZU5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxKSB7XG4gICAgbGV0IGV4dGVuc2lvbiA9IF8ubGFzdChmaWxlTmFtZS5zcGxpdCgnLicpKTtcblxuICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgY2FzZSAnanMnOlxuICAgICAgcmV0dXJuICdqYXZhc2NyaXB0JztcbiAgICBjYXNlICdjc3MnOlxuICAgICAgcmV0dXJuICdzdHlsZXNoZWV0JztcbiAgICBjYXNlICdqcGcnOlxuICAgIGNhc2UgJ3BuZyc6XG4gICAgY2FzZSAnanBlZyc6XG4gICAgY2FzZSAnZ2lmJzpcbiAgICAgIHJldHVybiAnaW1hZ2UnO1xuICAgIGNhc2UgJ3RwbCc6XG4gICAgICByZXR1cm4gJ2xheW91dCc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnYXNzZXQnO1xuICAgIH1cbiAgfVxufTtcblxuY29uc3QgZ2V0U3ViZm9sZGVyRm9yVHlwZSA9ICh0eXBlKSA9PiB7XG4gIHJldHVybiB7XG4gICAgJ2Fzc2V0JzogJ2Fzc2V0cycsXG4gICAgJ2ltYWdlJzogJ2ltYWdlcycsXG4gICAgJ2phdmFzY3JpcHQnOiAnamF2YXNjcmlwdHMnLFxuICAgICdzdHlsZXNoZWV0JzogJ3N0eWxlc2hlZXRzJyxcbiAgICAnY29tcG9uZW50JzogJ2NvbXBvbmVudHMnLFxuICAgICdsYXlvdXQnOiAnbGF5b3V0cydcbiAgfVt0eXBlXTtcbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVBhdGggPSAocGF0aCwgc2l0ZURpcikgPT4ge1xuICByZXR1cm4gcGF0aFxuICAgIC5yZXBsYWNlKHNpdGVEaXIsICcnKVxuICAgIC5yZXBsYWNlKC9eXFwvLywgJycpO1xufTtcblxuY29uc3Qgd3JpdGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlLCBkZXN0UGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKF8uaW5jbHVkZXMoT2JqZWN0LmtleXMoZmlsZSksICdsYXlvdXRfbmFtZScpKSB7XG4gICAgICBnZXRMYXlvdXRDb250ZW50cyhzaXRlTmFtZSwgZmlsZS5pZCwgb3B0aW9ucykudGhlbihjb250ZW50cyA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShkZXN0UGF0aCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlOyB9XG4gICAgICAgIH1cblxuICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICBnZXRMYXlvdXRBc3NldENvbnRlbnRzKHNpdGVOYW1lLCBmaWxlLmlkLCBvcHRpb25zKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgICAgfVxuICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB1cmwgPSBmaWxlLnB1YmxpY191cmw7XG4gICAgICB0cnkge1xuICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZTsgfVxuICAgICAgfVxuXG4gICAgICBsZXQgc3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdFBhdGgpO1xuICAgICAgaWYgKHVybCAmJiBzdHJlYW0pIHtcbiAgICAgICAgbGV0IHJlcSA9IHJlcXVlc3QuZ2V0KHVybCkub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpO1xuICAgICAgICByZXEucGlwZShzdHJlYW0pO1xuICAgICAgICByZXNvbHZlKGZpbGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KG51bGwpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCB1cGxvYWRGaWxlID0gKHNpdGVOYW1lLCBmaWxlLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGlmIChmaWxlKSB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhPYmplY3Qua2V5cyhmaWxlKSwgJ2xheW91dF9uYW1lJykpIHtcbiAgICAgICAgbGV0IGNvbnRlbnRzID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICBjbGllbnQudXBkYXRlTGF5b3V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBib2R5OiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5lZGl0YWJsZSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXRBc3NldChmaWxlLmlkLCB7XG4gICAgICAgICAgZGF0YTogY29udGVudHNcbiAgICAgICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGVQYXRoLCBtZXNzYWdlOiAnVW5hYmxlIHRvIHVwZGF0ZSBmaWxlISd9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY3JlYXRlRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgY3JlYXRlRmlsZSA9IChzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgY2xpZW50ID0gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgICBsZXQgZmlsZSA9IGZpbGVPYmplY3RGcm9tUGF0aChmaWxlUGF0aCk7XG5cbiAgICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICAgIGNsaWVudC5jcmVhdGVMYXlvdXQoZmlsZSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlLCBtZXNzYWdlOiAnVW5hYmxlIHRvIGNyZWF0ZSBmaWxlISd9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2xpZW50LmNyZWF0ZUxheW91dEFzc2V0KGZpbGUsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZSwgbWVzc2FnZTogJ1VuYWJsZSB0byBjcmVhdGUgZmlsZSEnfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGZpbGVPYmplY3RGcm9tUGF0aCA9IChmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICBsZXQgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVQYXRoKTtcblxuICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6IF8uaGFzKG9wdGlvbnMsICd0aXRsZScpID8gb3B0aW9ucy50aXRsZSA6IHRpdGxlRnJvbUZpbGVuYW1lKGZpbGVOYW1lKSxcbiAgICAgIGNvbXBvbmVudDogdHlwZSA9PSAnY29tcG9uZW50JyxcbiAgICAgIGNvbnRlbnRfdHlwZTogXy5oYXMob3B0aW9ucywgJ2NvbnRlbnRfdHlwZScpID8gb3B0aW9ucy5jb250ZW50X3R5cGUgOiAncGFnZScsXG4gICAgICBib2R5OiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4JyksXG4gICAgICBwYXJlbnRfaWQ6IF8uaGFzKG9wdGlvbnMsICdwYXJlbnRfaWQnKSA/IG9wdGlvbnMucGFyZW50X2lkIDogbnVsbCxcbiAgICAgIHBhcmVudF90aXRsZTogXy5oYXMob3B0aW9ucywgJ3BhcmVudF90aXRsZScpID8gb3B0aW9ucy5wYXJlbnRfdGl0bGUgOiBudWxsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgZmlsZW5hbWU6IGZpbGVOYW1lLFxuICAgICAgZGF0YTogZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpXG4gICAgfTtcbiAgfVxufTtcblxuY29uc3QgcHVsbEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlUGF0aCwgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJ30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSh3cml0ZUZpbGUoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlUGF0aCwgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJ30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSh1cGxvYWRGaWxlKHNpdGVOYW1lLCBmaWxlLCBmaWxlUGF0aCwgb3B0aW9ucykpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGFkZEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZmlsZTtcbiAgICBsZXQgdHlwZTtcblxuICAgIGlmIChmaWxlTmFtZS5zcGxpdCgnLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZpbGUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVOYW1lLCBvcHRpb25zKTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGUgPSBmaWxlTmFtZTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbUV4dGVuc2lvbihmaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgbGV0IHN1YkZvbGRlciA9IGdldFN1YmZvbGRlckZvclR5cGUodHlwZSk7XG4gICAgbGV0IHByb2plY3REaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaW5hbFBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgc3ViRm9sZGVyLCBmaWxlKTtcblxuICAgIGxldCByZWxhdGl2ZVBhdGggPSBmaW5hbFBhdGgucmVwbGFjZShwcm9qZWN0RGlyICsgJy8nLCAnJyk7XG5cbiAgICBpZiAoZmlsZVV0aWxzLmZpbGVFeGlzdHMocmVsYXRpdmVQYXRoLCBvcHRpb25zKSB8fCB0eXBlb2YgZmlsZVV0aWxzLndyaXRlRmlsZShyZWxhdGl2ZVBhdGgsICcnKSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmVzb2x2ZShjcmVhdGVGaWxlKHNpdGVOYW1lLCByZWxhdGl2ZVBhdGgsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlTmFtZSwgbWVzc2FnZTogJ1VuYWJsZSB0byBjcmVhdGUgZmlsZSEnfSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGRlbGV0ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zKSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlTmFtZSk7XG5cbiAgICBmaW5kRmlsZShmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICAgICAgY2xpZW50LmRlbGV0ZUxheW91dChmaWxlLmlkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNsaWVudC5kZWxldGVMYXlvdXRBc3NldChmaWxlLmlkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCByZW1vdmVGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGZpbGU7XG4gICAgbGV0IHR5cGU7XG5cbiAgICBpZiAoZmlsZU5hbWUuc3BsaXQoJy8nKS5sZW5ndGggPiAxKSB7XG4gICAgICBmaWxlID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlTmFtZSwgb3B0aW9ucyk7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlID0gZmlsZU5hbWU7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21FeHRlbnNpb24oZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIGxldCBzdWJGb2xkZXIgPSBnZXRTdWJmb2xkZXJGb3JUeXBlKHR5cGUpO1xuICAgIGxldCBwcm9qZWN0RGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmluYWxQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIHN1YkZvbGRlciwgZmlsZSk7XG5cbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gZmluYWxQYXRoLnJlcGxhY2UocHJvamVjdERpciArICcvJywgJycpO1xuXG4gICAgaWYgKGZpbGVVdGlscy5maWxlRXhpc3RzKGZpbmFsUGF0aCwgb3B0aW9ucykgfHwgdHlwZW9mIGZpbGVVdGlscy5kZWxldGVGaWxlKHJlbGF0aXZlUGF0aCkgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJlc29sdmUoZGVsZXRlRmlsZShzaXRlTmFtZSwgcmVsYXRpdmVQYXRoLCBvcHRpb25zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZU5hbWUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gcmVtb3ZlIGZpbGUhJ30pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGNsaWVudEZvcixcbiAgZ2V0VG90YWxGaWxlQ291bnQsXG4gIHB1bGxBbGxGaWxlcyxcbiAgcHVzaEFsbEZpbGVzLFxuICBmaW5kRmlsZSxcbiAgcHVzaEZpbGUsXG4gIHB1bGxGaWxlLFxuICBjcmVhdGVGaWxlLFxuICBhZGRGaWxlLFxuICByZW1vdmVGaWxlXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQge3ZlcnNpb259IGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5cbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHNpdGVzIGZyb20gJy4vc2l0ZXMnO1xuaW1wb3J0IGFjdGlvbnMgZnJvbSAnLi9hY3Rpb25zJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICBmaWxlVXRpbHMsXG4gIGNvbmZpZyxcbiAgc2l0ZXMsXG4gIGFjdGlvbnMsXG4gIHZlcnNpb25cbn07XG4iXSwibmFtZXMiOlsiaW5oZXJpdHMiLCJmaWxlRXhpc3RzIiwic2l0ZXMiLCJQcm9taXNlIiwid3JpdGVGaWxlIiwiZGVsZXRlRmlsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDS0EsSUFBTSxZQUFZLFNBQVosU0FBWSxDQUFDLFVBQUQsRUFBZ0I7U0FDekIsR0FBRyxXQUFILENBQWUsVUFBZixFQUEyQixNQUEzQixDQUFrQyxVQUFTLElBQVQsRUFBZTtRQUNsRCxXQUFXLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBc0IsSUFBdEIsQ0FBWCxDQURrRDtXQUUvQyxHQUFHLFFBQUgsQ0FBWSxRQUFaLEVBQXNCLE1BQXRCLEVBQVAsQ0FGc0Q7R0FBZixDQUF6QyxDQURnQztDQUFoQjs7QUFPbEIsSUFBTSxjQUFjLFNBQWQsV0FBYyxDQUFDLFVBQUQsRUFBZ0I7U0FDM0IsR0FBRyxXQUFILENBQWUsVUFBZixFQUEyQixNQUEzQixDQUFrQyxVQUFTLElBQVQsRUFBZTtRQUNsRCxXQUFXLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBc0IsSUFBdEIsQ0FBWCxDQURrRDtXQUUvQyxHQUFHLFFBQUgsQ0FBWSxRQUFaLEVBQXNCLFdBQXRCLEVBQVAsQ0FGc0Q7R0FBZixDQUF6QyxDQURrQztDQUFoQjs7QUFPcEIsSUFBTSxrQkFBa0IsU0FBbEIsZUFBa0IsQ0FBQyxRQUFELEVBQTRCO01BQWpCLGdFQUFVLGtCQUFPOztT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