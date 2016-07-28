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

var version = "0.1.0";

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

var HOMEDIR = process.env.HOME;
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

  if (!config_exists(filePath)) {
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

  if (filePath === LOCAL_CONFIG && !config_exists(options)) {
    filePath = GLOBAL_CONFIG;
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

  if (!config_exists(options)) {
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

var config_exists = function config_exists() {
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
  config_exists: config_exists
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
    sites.push(data);
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

  var site = byName(name, options);;
  if (options.dir || options.path) {
    return options.dir || options.path;
  } else if (site) {
    return site.dir || site.path;
  }
};

var hostFor = function hostFor(name) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var site = byName(name, options);
  if (options.host) {
    return options.host;
  } else if (site) {
    return site.host;
  }
};

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

  if (host && token) {
    return new Voog(host, token);
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
        return normalizeTitle(l.title) == name;
      });
      if (ret.length === 0) {
        reject(undefined);
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
  return _.head(fileName.split('.'));
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
          }

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
    } else {
      reject();
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
        resolve(file);
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
        (err ? reject : resolve)(data);
      });
    } else {
      client.createLayoutAsset(file, function (err, data) {
        (err ? reject : resolve)(data);
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
        reject();
        return;
      }

      resolve(writeFile$1(siteName, file, filePath, options));
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
        return reject(file);
      }
      resolve(uploadFile(siteName, file, filePath, options));
    }).catch(function (err) {
      console.log(err);resolve(uploadFile(siteName, undefined, filePath, options));
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

    if (fileUtils.fileExists(relativePath, options)) {
      reject({ file: fileName, message: 'File already exists!' });
    } else if (typeof fileUtils.writeFile(relativePath, '') == 'undefined') {
      createFile(siteName, relativePath, options).then(resolve);
    } else {
      reject({ file: fileName, message: 'Unable to create file!' });
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

    if (fileUtils.fileExists(finalPath, options)) {
      if (typeof fileUtils.deleteFile(relativePath) == 'undefined') {
        deleteFile$1(siteName, relativePath, options).then(resolve);
      } else {
        reject({ file: fileName, message: 'Unable to remove file!' });
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4xLjBcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYWxsXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3RcIixcbiAgICBcInByZWJ1aWxkXCI6IFwiZWNobyBSZWJ1aWxkaW5nIC4vaW5kZXguanNcIixcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtY1wiLFxuICAgIFwicG9zdGJ1aWxkXCI6IFwiZWNobyBgZWNobyBSZWJ1aWx0IC4vaW5kZXguanMgJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpYFwiLFxuICAgIFwicHJldGVzdFwiOiBcImVjaG8gUnVubmluZyB0ZXN0c1wiLFxuICAgIFwidGVzdFwiOiBcIm1vY2hhIC4vdGVzdC90ZXN0LmpzIHx8IHRydWVcIixcbiAgICBcIndhdGNoXCI6IFwid2F0Y2ggJ25wbSBydW4gYWxsJyAuL3NyYyAuL3Rlc3RcIixcbiAgICBcIndhdGNoOmJ1aWxkXCI6IFwid2F0Y2ggJ25wbS1ydW4tYWxsIGJ1aWxkIHRlc3QnIC4vc3JjXCIsXG4gICAgXCJ3YXRjaDp0ZXN0XCI6IFwid2F0Y2ggJ25wbSBydW4gdGVzdCcgLi90ZXN0XCJcbiAgfSxcbiAgXCJhdXRob3JcIjogXCJNaWtrIFByaXN0YXZrYVwiLFxuICBcImxpY2Vuc2VcIjogXCJJU0NcIixcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmx1ZWJpcmRcIjogXCJeMy4zLjFcIixcbiAgICBcImhpZ2hsYW5kXCI6IFwiXjIuNy4xXCIsXG4gICAgXCJsb2Rhc2hcIjogXCJeNC41LjBcIixcbiAgICBcIm1pbWUtZGJcIjogXCJeMS4yMi4wXCIsXG4gICAgXCJtaW1lLXR5cGVcIjogXCJeMy4wLjRcIixcbiAgICBcInJlcXVlc3RcIjogXCJeMi42OS4wXCIsXG4gICAgXCJ2b29nXCI6IFwiZ2l0K2h0dHBzOi8vZ2l0aHViLmNvbS9Wb29nL3Zvb2cuanMuZ2l0XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYmFiZWwtY2xpXCI6IFwiXjYuNS4xXCIsXG4gICAgXCJiYWJlbC1wcmVzZXQtZXMyMDE1LXJvbGx1cFwiOiBcIl4xLjEuMVwiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjUuMFwiLFxuICAgIFwiY2hhaS1hcy1wcm9taXNlZFwiOiBcIl41LjMuMFwiLFxuICAgIFwibW9jaGFcIjogXCJeMi40LjVcIixcbiAgICBcIm1vY2hhLXNpbm9uXCI6IFwiXjEuMS41XCIsXG4gICAgXCJub2NrXCI6IFwiXjguMC4wXCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWJhYmVsXCI6IFwiXjIuMy45XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcInNpbm9uXCI6IFwiXjEuMTcuM1wiLFxuICAgIFwic2lub24tY2hhaVwiOiBcIl4yLjguMFwiLFxuICAgIFwid2F0Y2hcIjogXCJeMC4xNy4xXCJcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxpc3RGaWxlcyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRmlsZSgpO1xuICB9KTtcbn07XG5cbmNvbnN0IGxpc3RGb2xkZXJzID0gKGZvbGRlclBhdGgpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIGl0ZW1QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGl0ZW0pO1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhpdGVtUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlQ29udGVudHMgPSAoZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmcy51bmxpbmtTeW5jKGZpbGVQYXRoKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChmaWxlUGF0aCwgZGF0YSkgPT4ge1xuICByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGxpc3RGaWxlcyxcbiAgbGlzdEZvbGRlcnMsXG4gIGRlbGV0ZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY3dkOiBwcm9jZXNzLmN3ZCxcbiAgZ2V0RmlsZUNvbnRlbnRzLFxuICBmaWxlRXhpc3RzXG59O1xuIiwiLy8gVGFrZW4gZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9qdXN0bW9vbi8xNTUxMWY5MmU1MjE2ZmEyNjI0YlxuaW1wb3J0IHsgaW5oZXJpdHMgfSBmcm9tICd1dGlsJztcblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDdXN0b21FcnJvcihtZXNzYWdlLCBleHRyYSkge1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLmV4dHJhID0gZXh0cmE7XG59O1xuXG5pbmhlcml0cyhDdXN0b21FcnJvciwgRXJyb3IpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IEN1c3RvbUVycm9yIGZyb20gJy4vY3VzdG9tX2Vycm9yJztcblxuY29uc3QgQ09ORklHX0ZJTEVOQU1FID0gJy52b29nJztcblxuY29uc3QgSE9NRURJUiA9IHByb2Nlc3MuZW52LkhPTUU7XG5jb25zdCBMT0NBTERJUiA9IHByb2Nlc3MuY3dkKCk7XG5cbmNvbnN0IExPQ0FMX0NPTkZJRyA9IHBhdGguam9pbihMT0NBTERJUiwgQ09ORklHX0ZJTEVOQU1FKTtcbmNvbnN0IEdMT0JBTF9DT05GSUcgPSBwYXRoLmpvaW4oSE9NRURJUiwgQ09ORklHX0ZJTEVOQU1FKTtcblxuY29uc3QgZmluZExvY2FsQ29uZmlnID0gKCkgPT4ge1xuICBpZiAoZmlsZUV4aXN0cyhwYXRoLmpvaW4ocGF0aC5yZXNvbHZlKExPQ0FMRElSLCAnLi4nKSwgQ09ORklHX0ZJTEVOQU1FKSkpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHBhdGgucmVzb2x2ZShMT0NBTERJUiwgJy4uJyksIENPTkZJR19GSUxFTkFNRSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIExPQ0FMX0NPTkZJRztcbiAgfVxufTtcblxuY29uc3Qgc2l0ZUJ5TmFtZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIHNpdGVzKG9wdGlvbnMpLmZpbHRlcihwID0+IHAubmFtZSA9PT0gbmFtZSB8fCBwLmhvc3QgPT09IG5hbWUpWzBdO1xufTtcblxuY29uc3Qgc2l0ZXMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiByZWFkKCdzaXRlcycsIG9wdGlvbnMpIHx8IFtdO1xufTtcblxuY29uc3Qgd3JpdGUgPSAoa2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ19leGlzdHMoZmlsZVBhdGgpKSB7XG4gICAgY3JlYXRlKG9wdGlvbnMpO1xuICB9XG5cbiAgbGV0IGNvbmZpZyA9IHJlYWQobnVsbCwgb3B0aW9ucykgfHwge307XG4gIGNvbmZpZ1trZXldID0gdmFsdWU7XG5cbiAgbGV0IGZpbGVDb250ZW50cyA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMik7XG5cbiAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZmlsZUNvbnRlbnRzKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5jb25zdCByZWFkID0gKGtleSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoZmlsZVBhdGggPT09IExPQ0FMX0NPTkZJRyAmJiAhY29uZmlnX2V4aXN0cyhvcHRpb25zKSkge1xuICAgIGZpbGVQYXRoID0gR0xPQkFMX0NPTkZJRztcbiAgfVxuXG4gIGxldCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICBsZXQgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cbiAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHBhcnNlZERhdGFba2V5XTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcGFyc2VkRGF0YTtcbiAgfVxufTtcblxuY29uc3QgY3JlYXRlID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgZmlsZVBhdGggPSBwYXRoRnJvbU9wdGlvbnMob3B0aW9ucyk7XG5cbiAgaWYgKCFjb25maWdfZXhpc3RzKG9wdGlvbnMpKSB7XG4gICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgJ3t9Jyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBwYXRoRnJvbU9wdGlvbnMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICgoXy5oYXMob3B0aW9ucywgJ2dsb2JhbCcpICYmIG9wdGlvbnMuZ2xvYmFsID09PSB0cnVlKSkge1xuICAgIHJldHVybiBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2UgaWYgKF8uaGFzKG9wdGlvbnMsICdsb2NhbCcpICYmIG9wdGlvbnMubG9jYWwgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZmluZExvY2FsQ29uZmlnKCk7XG4gIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9ucywgJ2NvbmZpZ1BhdGgnKSB8fCBfLmhhcyhvcHRpb25zLCAnY29uZmlnX3BhdGgnKSkge1xuICAgIHJldHVybiBvcHRpb25zLmNvbmZpZ1BhdGggfHwgb3B0aW9ucy5jb25maWdfcGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmluZExvY2FsQ29uZmlnKCk7XG4gIH1cbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBjb25maWdfZXhpc3RzID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gZmlsZUV4aXN0cyhwYXRoRnJvbU9wdGlvbnMob3B0aW9ucykpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBzaXRlQnlOYW1lLFxuICBzaXRlcyxcbiAgd3JpdGUsXG4gIHJlYWQsXG4gIGNyZWF0ZSxcbiAgcGF0aEZyb21PcHRpb25zLFxuICBjb25maWdfZXhpc3RzXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgbWltZSBmcm9tICdtaW1lLXR5cGUvd2l0aC1kYic7XG5cbm1pbWUuZGVmaW5lKCdhcHBsaWNhdGlvbi92bmQudm9vZy5kZXNpZ24uY3VzdG9tK2xpcXVpZCcsIHtleHRlbnNpb25zOiBbJ3RwbCddfSwgbWltZS5kdXBPdmVyd3JpdGUpO1xuXG5jb25zdCBieU5hbWUgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZUJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGFkZCA9IChkYXRhLCBvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKF8uaGFzKGRhdGEsICdob3N0JykgJiYgXy5oYXMoZGF0YSwgJ3Rva2VuJykpIHtcbiAgICBsZXQgc2l0ZXMgPSBjb25maWcuc2l0ZXMob3B0aW9ucyk7XG4gICAgc2l0ZXMucHVzaChkYXRhKTtcbiAgICBjb25maWcud3JpdGUoJ3NpdGVzJywgc2l0ZXMsIG9wdGlvbnMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgcmVtb3ZlID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZXNJbkNvbmZpZyA9IGNvbmZpZy5zaXRlcyhvcHRpb25zKTtcbiAgbGV0IHNpdGVOYW1lcyA9IHNpdGVzSW5Db25maWcubWFwKHNpdGUgPT4gc2l0ZS5uYW1lIHx8IHNpdGUuaG9zdCk7XG4gIGxldCBpZHggPSBzaXRlTmFtZXMuaW5kZXhPZihuYW1lKTtcbiAgaWYgKGlkeCA8IDApIHsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBmaW5hbFNpdGVzID0gc2l0ZXNJbkNvbmZpZ1xuICAgIC5zbGljZSgwLCBpZHgpXG4gICAgLmNvbmNhdChzaXRlc0luQ29uZmlnLnNsaWNlKGlkeCArIDEpKTtcblxuICByZXR1cm4gY29uZmlnLndyaXRlKCdzaXRlcycsIGZpbmFsU2l0ZXMsIG9wdGlvbnMpO1xufTtcblxuY29uc3QgZ2V0RmlsZUluZm8gPSAoZmlsZVBhdGgpID0+IHtcbiAgbGV0IHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlUGF0aCk7XG5cbiAgaWYgKHN0YXQuaXNGaWxlKCkpIHtcbiAgICBsZXQgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKTtcbiAgICByZXR1cm4ge1xuICAgICAgZmlsZTogZmlsZU5hbWUsXG4gICAgICBzaXplOiBzdGF0LnNpemUsXG4gICAgICBjb250ZW50VHlwZTogbWltZS5sb29rdXAoZmlsZU5hbWUpLFxuICAgICAgcGF0aDogZmlsZVBhdGgsXG4gICAgICB1cGRhdGVkQXQ6IHN0YXQubXRpbWVcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuY29uc3QgdG90YWxGaWxlc0ZvciA9IChzaXRlTmFtZSkgPT4ge1xuICBsZXQgZmlsZXMgPSBmaWxlc0ZvcihzaXRlTmFtZSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyhmaWxlcykucmVkdWNlKCh0b3RhbCwgZm9sZGVyKSA9PiB0b3RhbCArIGZpbGVzW2ZvbGRlcl0ubGVuZ3RoLCAwKTtcbn07XG5cbmNvbnN0IGZpbGVzRm9yID0gKG5hbWUpID0+IHtcbiAgbGV0IGZvbGRlcnMgPSBbXG4gICAgJ2Fzc2V0cycsICdjb21wb25lbnRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdsYXlvdXRzJywgJ3N0eWxlc2hlZXRzJ1xuICBdO1xuXG4gIGxldCB3b3JraW5nRGlyID0gZGlyRm9yKG5hbWUpO1xuXG4gIGxldCByb290ID0gZmlsZVV0aWxzLmxpc3RGb2xkZXJzKHdvcmtpbmdEaXIpO1xuXG4gIGlmIChyb290KSB7XG4gICAgcmV0dXJuIGZvbGRlcnMucmVkdWNlKChzdHJ1Y3R1cmUsIGZvbGRlcikgPT4ge1xuICAgICAgaWYgKHJvb3QuaW5kZXhPZihmb2xkZXIpID49IDApIHtcbiAgICAgICAgbGV0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4od29ya2luZ0RpciwgZm9sZGVyKTtcbiAgICAgICAgc3RydWN0dXJlW2ZvbGRlcl0gPSBmaWxlVXRpbHMubGlzdEZpbGVzKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuICAgICAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgcmV0dXJuIHN0YXQuaXNGaWxlKCk7XG4gICAgICAgIH0pLm1hcChmaWxlID0+IHtcbiAgICAgICAgICBsZXQgZnVsbFBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZSk7XG5cbiAgICAgICAgICByZXR1cm4gZ2V0RmlsZUluZm8oZnVsbFBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJ1Y3R1cmU7XG4gICAgfSwge30pO1xuICB9XG59O1xuXG5jb25zdCBkaXJGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpOztcbiAgaWYgKG9wdGlvbnMuZGlyIHx8IG9wdGlvbnMucGF0aCkge1xuICAgIHJldHVybiBvcHRpb25zLmRpciB8fCBvcHRpb25zLnBhdGg7XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLmRpciB8fCBzaXRlLnBhdGg7XG4gIH1cbn07XG5cbmNvbnN0IGhvc3RGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBpZiAob3B0aW9ucy5ob3N0KSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaG9zdDtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuaG9zdDtcbiAgfVxufTtcblxuY29uc3QgdG9rZW5Gb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUsIG9wdGlvbnMpO1xuICBpZiAob3B0aW9ucy50b2tlbiB8fCBvcHRpb25zLmFwaV90b2tlbikge1xuICAgIHJldHVybiBvcHRpb25zLnRva2VuIHx8IG9wdGlvbnMuYXBpX3Rva2VuO1xuICB9IGVsc2UgaWYgKHNpdGUpIHtcbiAgICByZXR1cm4gc2l0ZS50b2tlbiB8fCBzaXRlLmFwaV90b2tlbjtcbiAgfVxufTtcblxuY29uc3QgbmFtZXMgPSAob3B0aW9ucykgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVzKG9wdGlvbnMpLm1hcChzaXRlID0+IHNpdGUubmFtZSB8fCBzaXRlLmhvc3QpO1xufTtcblxuY29uc3QgaG9zdHMgPSAob3B0aW9ucykgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVzKG9wdGlvbnMpLm1hcChzaXRlID0+IHNpdGUuaG9zdCk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGJ5TmFtZSxcbiAgYWRkLFxuICByZW1vdmUsXG4gIHRvdGFsRmlsZXNGb3IsXG4gIGZpbGVzRm9yLFxuICBkaXJGb3IsXG4gIGhvc3RGb3IsXG4gIHRva2VuRm9yLFxuICBuYW1lcyxcbiAgaG9zdHMsXG4gIGdldEZpbGVJbmZvXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgc2l0ZXMgZnJvbSAnLi9zaXRlcyc7XG5pbXBvcnQgVm9vZyBmcm9tICd2b29nJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UHJvbWlzZX0gZnJvbSAnYmx1ZWJpcmQnO1xuXG5jb25zdCBjbGllbnRGb3IgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBob3N0ID0gc2l0ZXMuaG9zdEZvcihuYW1lLCBvcHRpb25zKTtcbiAgbGV0IHRva2VuID0gc2l0ZXMudG9rZW5Gb3IobmFtZSwgb3B0aW9ucyk7XG5cbiAgaWYgKGhvc3QgJiYgdG9rZW4pIHtcbiAgICByZXR1cm4gbmV3IFZvb2coaG9zdCwgdG9rZW4pO1xuICB9XG59O1xuXG5jb25zdCBnZXRUb3RhbEZpbGVDb3VudCA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBQcm9taXNlLmFsbChbZ2V0TGF5b3V0cyhuYW1lLCBvcHRpb25zKSwgZ2V0TGF5b3V0QXNzZXRzKG5hbWUsIG9wdGlvbnMpXSkudGhlbigoW2xheW91dHMsIGFzc2V0c10pID0+IHtcbiAgICAgIHJlc29sdmUobGF5b3V0cy5sZW5ndGggKyBhc3NldHMubGVuZ3RoKTtcbiAgICB9KS5jYXRjaChyZWplY3QpO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dENvbnRlbnRzID0gKHNpdGVOYW1lLCBpZCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXQoaWQsIHt9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICByZXNvbHZlKGRhdGEuYm9keSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRDb250ZW50cyA9IChzaXRlTmFtZSwgaWQsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0QXNzZXQoaWQsIHt9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICBpZiAoZGF0YS5lZGl0YWJsZSkge1xuICAgICAgICByZXNvbHZlKGRhdGEuZGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKGRhdGEucHVibGljX3VybCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0cyA9IChzaXRlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKVxuICAgICAgLmxheW91dHMoT2JqZWN0LmFzc2lnbih7fSwge3Blcl9wYWdlOiAyNTB9LCBvcHRpb25zKSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRBc3NldHMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucylcbiAgICAgIC5sYXlvdXRBc3NldHMoT2JqZWN0LmFzc2lnbih7fSwge3Blcl9wYWdlOiAyNTB9LCBvcHRpb25zKSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdWxsQWxsRmlsZXMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcblxuICAgIFByb21pc2UuYWxsKFtcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLFxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKVxuICAgIF0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgIGxheW91dHMubWFwKGwgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtsLmNvbXBvbmVudCA/ICdjb21wb25lbnRzJyA6ICdsYXlvdXRzJ30vJHtub3JtYWxpemVUaXRsZShsLnRpdGxlKX0udHBsYCk7XG4gICAgICAgICAgcmV0dXJuIHB1bGxGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH0pLmNvbmNhdChhc3NldHMubWFwKGEgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGEuYXNzZXRfdHlwZSkgPyBhLmFzc2V0X3R5cGUgOiAnYXNzZXQnfXMvJHthLmZpbGVuYW1lfWApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KSlcbiAgICAgIF0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdXNoQWxsRmlsZXMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcblxuICAgIFByb21pc2UuYWxsKFtcbiAgICAgIGdldExheW91dHMoc2l0ZU5hbWUsIG9wdGlvbnMpLFxuICAgICAgZ2V0TGF5b3V0QXNzZXRzKHNpdGVOYW1lLCBvcHRpb25zKVxuICAgIF0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgIGxheW91dHMubWFwKGwgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtsLmNvbXBvbmVudCA/ICdjb21wb25lbnRzJyA6ICdsYXlvdXRzJ30vJHtub3JtYWxpemVUaXRsZShsLnRpdGxlKX0udHBsYCk7XG4gICAgICAgICAgcmV0dXJuIHB1c2hGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyk7XG4gICAgICAgIH0pLmNvbmNhdChhc3NldHMubWFwKGEgPT4ge1xuICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihzaXRlRGlyLCBgJHtfLmluY2x1ZGVzKFsnc3R5bGVzaGVldCcsICdpbWFnZScsICdqYXZhc2NyaXB0J10sIGEuYXNzZXRfdHlwZSkgPyBhLmFzc2V0X3R5cGUgOiAnYXNzZXQnfXMvJHthLmZpbGVuYW1lfWApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KSlcbiAgICAgIF0pLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0T3JDb21wb25lbnQgPSAoZmlsZU5hbWUsIGNvbXBvbmVudCwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgbmFtZSA9IG5vcm1hbGl6ZVRpdGxlKGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXQuY29tcG9uZW50JzogY29tcG9uZW50IHx8IGZhbHNlXG4gICAgfSwgKGVyciwgZGF0YSA9IFtdKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICBsZXQgcmV0ID0gZGF0YS5maWx0ZXIobCA9PiBub3JtYWxpemVUaXRsZShsLnRpdGxlKSA9PSBuYW1lKTtcbiAgICAgIGlmIChyZXQubGVuZ3RoID09PSAwKSB7IHJlamVjdCh1bmRlZmluZWQpOyB9XG4gICAgICByZXNvbHZlKF8uaGVhZChyZXQpKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0QXNzZXQgPSAoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKS5sYXlvdXRBc3NldHMoe1xuICAgICAgcGVyX3BhZ2U6IDI1MCxcbiAgICAgICdxLmxheW91dF9hc3NldC5maWxlbmFtZSc6IGZpbGVOYW1lXG4gICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShfLmhlYWQoZGF0YSkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldEZpbGVOYW1lRnJvbVBhdGggPSAoZmlsZVBhdGgpID0+IHtcbiAgcmV0dXJuIGZpbGVQYXRoLnNwbGl0KCcvJylbMV07XG59O1xuXG5jb25zdCBnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lID0gKGZpbGVOYW1lKSA9PiB7XG4gIHJldHVybiBfLmhlYWQoZmlsZU5hbWUuc3BsaXQoJy4nKSk7XG59O1xuXG5jb25zdCBmaW5kRmlsZSA9IChmaWxlUGF0aCwgc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgbGV0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCk7XG5cbiAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgcmV0dXJuIGZpbmRMYXlvdXRPckNvbXBvbmVudChmaWxlTmFtZSwgKHR5cGUgPT0gJ2NvbXBvbmVudCcpLCBzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZpbmRMYXlvdXRBc3NldChmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICB9XG59O1xuXG5jb25zdCB0aXRsZUZyb21GaWxlbmFtZSA9IChmaWxlTmFtZSkgPT4ge1xuICByZXR1cm4gXy5oZWFkKGZpbGVOYW1lLnNwbGl0KCcuJykpLnJlcGxhY2UoL18vLCAnICcpO1xufTtcblxuY29uc3Qgbm9ybWFsaXplVGl0bGUgPSAodGl0bGUpID0+IHtcbiAgcmV0dXJuIHRpdGxlLnJlcGxhY2UoL1teXFx3XFwtXFwuXS9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aCA9IChwYXRoKSA9PiB7XG4gIGxldCBmb2xkZXIgPSBwYXRoLnNwbGl0KCcvJylbMF07XG4gIGxldCBmb2xkZXJUb1R5cGVNYXAgPSB7XG4gICAgJ2xheW91dHMnOiAnbGF5b3V0JyxcbiAgICAnY29tcG9uZW50cyc6ICdjb21wb25lbnQnLFxuICAgICdhc3NldHMnOiAnYXNzZXQnLFxuICAgICdpbWFnZXMnOiAnaW1hZ2UnLFxuICAgICdqYXZhc2NyaXB0cyc6ICdqYXZhc2NyaXB0JyxcbiAgICAnc3R5bGVzaGVldHMnOiAnc3R5bGVzaGVldCdcbiAgfTtcblxuICByZXR1cm4gZm9sZGVyVG9UeXBlTWFwW2ZvbGRlcl07XG59O1xuXG5jb25zdCBnZXRUeXBlRnJvbUV4dGVuc2lvbiA9IChmaWxlTmFtZSkgPT4ge1xuICBpZiAoZmlsZU5hbWUuc3BsaXQoJy4nKS5sZW5ndGggPiAxKSB7XG4gICAgbGV0IGV4dGVuc2lvbiA9IF8ubGFzdChmaWxlTmFtZS5zcGxpdCgnLicpKTtcblxuICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgY2FzZSAnanMnOlxuICAgICAgcmV0dXJuICdqYXZhc2NyaXB0JztcbiAgICBjYXNlICdjc3MnOlxuICAgICAgcmV0dXJuICdzdHlsZXNoZWV0JztcbiAgICBjYXNlICdqcGcnOlxuICAgIGNhc2UgJ3BuZyc6XG4gICAgY2FzZSAnanBlZyc6XG4gICAgY2FzZSAnZ2lmJzpcbiAgICAgIHJldHVybiAnaW1hZ2UnO1xuICAgIGNhc2UgJ3RwbCc6XG4gICAgICByZXR1cm4gJ2xheW91dCc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnYXNzZXQnO1xuICAgIH1cbiAgfVxufTtcblxuY29uc3QgZ2V0U3ViZm9sZGVyRm9yVHlwZSA9ICh0eXBlKSA9PiB7XG4gIHJldHVybiB7XG4gICAgJ2Fzc2V0JzogJ2Fzc2V0cycsXG4gICAgJ2ltYWdlJzogJ2ltYWdlcycsXG4gICAgJ2phdmFzY3JpcHQnOiAnamF2YXNjcmlwdHMnLFxuICAgICdzdHlsZXNoZWV0JzogJ3N0eWxlc2hlZXRzJyxcbiAgICAnY29tcG9uZW50JzogJ2NvbXBvbmVudHMnLFxuICAgICdsYXlvdXQnOiAnbGF5b3V0cydcbiAgfVt0eXBlXTtcbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVBhdGggPSAocGF0aCwgc2l0ZURpcikgPT4ge1xuICByZXR1cm4gcGF0aFxuICAgIC5yZXBsYWNlKHNpdGVEaXIsICcnKVxuICAgIC5yZXBsYWNlKC9eXFwvLywgJycpO1xufTtcblxuY29uc3Qgd3JpdGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlLCBkZXN0UGF0aCkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGlmIChmaWxlKSB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhPYmplY3Qua2V5cyhmaWxlKSwgJ2xheW91dF9uYW1lJykpIHtcbiAgICAgICAgZ2V0TGF5b3V0Q29udGVudHMoc2l0ZU5hbWUsIGZpbGUuaWQpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlOyB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnMud3JpdGVGaWxlKGRlc3RQYXRoLCBjb250ZW50cywgKGVycikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGZpbGUuZWRpdGFibGUpIHtcbiAgICAgICAgZ2V0TGF5b3V0QXNzZXRDb250ZW50cyhzaXRlTmFtZSwgZmlsZS5pZCkudGhlbihjb250ZW50cyA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZnMud3JpdGVGaWxlKGRlc3RQYXRoLCBjb250ZW50cywgKGVycikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgdXJsID0gZmlsZS5wdWJsaWNfdXJsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZTsgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRlc3RQYXRoKTtcbiAgICAgICAgaWYgKHVybCAmJiBzdHJlYW0pIHtcbiAgICAgICAgICBsZXQgcmVxID0gcmVxdWVzdC5nZXQodXJsKS5vbignZXJyb3InLCAoZXJyKSA9PiByZWplY3QoZXJyKSk7XG4gICAgICAgICAgcmVxLnBpcGUoc3RyZWFtKTtcbiAgICAgICAgICByZXNvbHZlKGZpbGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlamVjdChudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZWplY3QoKTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgdXBsb2FkRmlsZSA9IChzaXRlTmFtZSwgZmlsZSwgZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgY2xpZW50ID0gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgaWYgKF8uaW5jbHVkZXMoT2JqZWN0LmtleXMoZmlsZSksICdsYXlvdXRfbmFtZScpKSB7XG4gICAgICAgIGxldCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dChmaWxlLmlkLCB7XG4gICAgICAgICAgYm9keTogY29udGVudHNcbiAgICAgICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGZpbGUuZWRpdGFibGUpIHtcbiAgICAgICAgbGV0IGNvbnRlbnRzID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICBjbGllbnQudXBkYXRlTGF5b3V0QXNzZXQoZmlsZS5pZCwge1xuICAgICAgICAgIGRhdGE6IGNvbnRlbnRzXG4gICAgICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY3JlYXRlRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgY3JlYXRlRmlsZSA9IChzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgY2xpZW50ID0gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgICBsZXQgZmlsZSA9IGZpbGVPYmplY3RGcm9tUGF0aChmaWxlUGF0aCk7XG5cbiAgICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICAgIGNsaWVudC5jcmVhdGVMYXlvdXQoZmlsZSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2xpZW50LmNyZWF0ZUxheW91dEFzc2V0KGZpbGUsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGZpbGVPYmplY3RGcm9tUGF0aCA9IChmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICBsZXQgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVQYXRoKTtcblxuICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6IF8uaGFzKG9wdGlvbnMsICd0aXRsZScpID8gb3B0aW9ucy50aXRsZSA6IHRpdGxlRnJvbUZpbGVuYW1lKGZpbGVOYW1lKSxcbiAgICAgIGNvbXBvbmVudDogdHlwZSA9PSAnY29tcG9uZW50JyxcbiAgICAgIGNvbnRlbnRfdHlwZTogXy5oYXMob3B0aW9ucywgJ2NvbnRlbnRfdHlwZScpID8gb3B0aW9ucy5jb250ZW50X3R5cGUgOiAncGFnZScsXG4gICAgICBib2R5OiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4JyksXG4gICAgICBwYXJlbnRfaWQ6IF8uaGFzKG9wdGlvbnMsICdwYXJlbnRfaWQnKSA/IG9wdGlvbnMucGFyZW50X2lkIDogbnVsbCxcbiAgICAgIHBhcmVudF90aXRsZTogXy5oYXMob3B0aW9ucywgJ3BhcmVudF90aXRsZScpID8gb3B0aW9ucy5wYXJlbnRfdGl0bGUgOiBudWxsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgZmlsZW5hbWU6IGZpbGVOYW1lLFxuICAgICAgZGF0YTogZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpXG4gICAgfTtcbiAgfVxufTtcblxuY29uc3QgcHVsbEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuXG4gIGxldCBub3JtYWxpemVkUGF0aCA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgsIHNpdGVEaXIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZmluZEZpbGUobm9ybWFsaXplZFBhdGgsIHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKCFmaWxlIHx8IHR5cGVvZiBmaWxlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZXNvbHZlKHdyaXRlRmlsZShzaXRlTmFtZSwgZmlsZSwgZmlsZVBhdGgsIG9wdGlvbnMpKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBwdXNoRmlsZSA9IChzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIGxldCBub3JtYWxpemVkUGF0aCA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgsIHNpdGVEaXIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZmluZEZpbGUobm9ybWFsaXplZFBhdGgsIHNpdGVOYW1lLCBvcHRpb25zKS50aGVuKFxuICAgICAgZmlsZSA9PiB7XG4gICAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmUodXBsb2FkRmlsZShzaXRlTmFtZSwgZmlsZSwgZmlsZVBhdGgsIG9wdGlvbnMpKTtcbiAgICAgIH1cbiAgICApLmNhdGNoKChlcnIpID0+IHtjb25zb2xlLmxvZyhlcnIpO3Jlc29sdmUodXBsb2FkRmlsZShzaXRlTmFtZSwgdW5kZWZpbmVkLCBmaWxlUGF0aCwgb3B0aW9ucykpO30pO1xuICB9KTtcbn07XG5cbmNvbnN0IGFkZEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZmlsZTtcbiAgICBsZXQgdHlwZTtcblxuICAgIGlmIChmaWxlTmFtZS5zcGxpdCgnLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZpbGUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVOYW1lLCBvcHRpb25zKTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGUgPSBmaWxlTmFtZTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbUV4dGVuc2lvbihmaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgbGV0IHN1YkZvbGRlciA9IGdldFN1YmZvbGRlckZvclR5cGUodHlwZSk7XG4gICAgbGV0IHByb2plY3REaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaW5hbFBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgc3ViRm9sZGVyLCBmaWxlKTtcblxuICAgIGxldCByZWxhdGl2ZVBhdGggPSBmaW5hbFBhdGgucmVwbGFjZShwcm9qZWN0RGlyICsgJy8nLCAnJyk7XG5cbiAgICBpZiAoZmlsZVV0aWxzLmZpbGVFeGlzdHMocmVsYXRpdmVQYXRoLCBvcHRpb25zKSkge1xuICAgICAgcmVqZWN0KHtmaWxlOiBmaWxlTmFtZSwgbWVzc2FnZTogJ0ZpbGUgYWxyZWFkeSBleGlzdHMhJ30pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGZpbGVVdGlscy53cml0ZUZpbGUocmVsYXRpdmVQYXRoLCAnJykgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNyZWF0ZUZpbGUoc2l0ZU5hbWUsIHJlbGF0aXZlUGF0aCwgb3B0aW9ucykudGhlbihyZXNvbHZlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KHtmaWxlOiBmaWxlTmFtZSwgbWVzc2FnZTogJ1VuYWJsZSB0byBjcmVhdGUgZmlsZSEnfSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGRlbGV0ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zKSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuICAgIGZpbmRGaWxlKGZpbGVOYW1lLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgICAgICBjbGllbnQuZGVsZXRlTGF5b3V0KGZpbGUuaWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xpZW50LmRlbGV0ZUxheW91dEFzc2V0KGZpbGUuaWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IHJlbW92ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZmlsZTtcbiAgICBsZXQgdHlwZTtcblxuICAgIGlmIChmaWxlTmFtZS5zcGxpdCgnLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZpbGUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVOYW1lLCBvcHRpb25zKTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGUgPSBmaWxlTmFtZTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbUV4dGVuc2lvbihmaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgbGV0IHN1YkZvbGRlciA9IGdldFN1YmZvbGRlckZvclR5cGUodHlwZSk7XG4gICAgbGV0IHByb2plY3REaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaW5hbFBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgc3ViRm9sZGVyLCBmaWxlKTtcblxuICAgIGxldCByZWxhdGl2ZVBhdGggPSBmaW5hbFBhdGgucmVwbGFjZShwcm9qZWN0RGlyICsgJy8nLCAnJyk7XG5cbiAgICBpZiAoZmlsZVV0aWxzLmZpbGVFeGlzdHMoZmluYWxQYXRoLCBvcHRpb25zKSkge1xuICAgICAgaWYgKHR5cGVvZiBmaWxlVXRpbHMuZGVsZXRlRmlsZShyZWxhdGl2ZVBhdGgpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGRlbGV0ZUZpbGUoc2l0ZU5hbWUsIHJlbGF0aXZlUGF0aCwgb3B0aW9ucykudGhlbihyZXNvbHZlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdCh7ZmlsZTogZmlsZU5hbWUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gcmVtb3ZlIGZpbGUhJ30pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGNsaWVudEZvcixcbiAgZ2V0VG90YWxGaWxlQ291bnQsXG4gIHB1bGxBbGxGaWxlcyxcbiAgcHVzaEFsbEZpbGVzLFxuICBmaW5kRmlsZSxcbiAgcHVzaEZpbGUsXG4gIHB1bGxGaWxlLFxuICBjcmVhdGVGaWxlLFxuICBhZGRGaWxlLFxuICByZW1vdmVGaWxlXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQge3ZlcnNpb259IGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5cbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHNpdGVzIGZyb20gJy4vc2l0ZXMnO1xuaW1wb3J0IGFjdGlvbnMgZnJvbSAnLi9hY3Rpb25zJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICBmaWxlVXRpbHMsXG4gIGNvbmZpZyxcbiAgc2l0ZXMsXG4gIGFjdGlvbnMsXG4gIHZlcnNpb25cbn07XG4iXSwibmFtZXMiOlsiaW5oZXJpdHMiLCJmaWxlRXhpc3RzIiwic2l0ZXMiLCJQcm9taXNlIiwid3JpdGVGaWxlIiwiZGVsZXRlRmlsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDS0EsSUFBTSxZQUFZLFNBQVosU0FBWSxDQUFDLFVBQUQsRUFBZ0I7U0FDekIsR0FBRyxXQUFILENBQWUsVUFBZixFQUEyQixNQUEzQixDQUFrQyxVQUFTLElBQVQsRUFBZTtRQUNsRCxXQUFXLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBc0IsSUFBdEIsQ0FBWCxDQURrRDtXQUUvQyxHQUFHLFFBQUgsQ0FBWSxRQUFaLEVBQXNCLE1BQXRCLEVBQVAsQ0FGc0Q7R0FBZixDQUF6QyxDQURnQztDQUFoQjs7QUFPbEIsSUFBTSxjQUFjLFNBQWQsV0FBYyxDQUFDLFVBQUQsRUFBZ0I7U0FDM0IsR0FBRyxXQUFILENBQWUsVUFBZixFQUEyQixNQUEzQixDQUFrQyxVQUFTLElBQVQs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