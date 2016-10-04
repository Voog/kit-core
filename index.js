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

var version = "0.1.2";

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4xLjJcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYWxsXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3RcIixcbiAgICBcInByZWJ1aWxkXCI6IFwiZWNobyBSZWJ1aWxkaW5nIC4vaW5kZXguanNcIixcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtY1wiLFxuICAgIFwicG9zdGJ1aWxkXCI6IFwiZWNobyBgZWNobyBSZWJ1aWx0IC4vaW5kZXguanMgJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpYCAmJiB0b3VjaCAuLi9raXQtY2xpL3NyYy9raXQuanNcIixcbiAgICBcInByZXRlc3RcIjogXCJlY2hvIFJ1bm5pbmcgdGVzdHNcIixcbiAgICBcInRlc3RcIjogXCJtb2NoYSAuL3Rlc3QvdGVzdC5qcyB8fCB0cnVlXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGFsbCcgLi9zcmMgLi90ZXN0XCIsXG4gICAgXCJ3YXRjaDpidWlsZFwiOiBcIndhdGNoICducG0tcnVuLWFsbCBidWlsZCB0ZXN0JyAuL3NyY1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIHRlc3QnIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcImdpdCtodHRwczovL2dpdGh1Yi5jb20vVm9vZy92b29nLmpzLmdpdFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJhYmVsLWNsaVwiOiBcIl42LjUuMVwiLFxuICAgIFwiYmFiZWwtcHJlc2V0LWVzMjAxNS1yb2xsdXBcIjogXCJeMS4xLjFcIixcbiAgICBcImNoYWlcIjogXCJeMy41LjBcIixcbiAgICBcImNoYWktYXMtcHJvbWlzZWRcIjogXCJeNS4zLjBcIixcbiAgICBcIm1vY2hhXCI6IFwiXjIuNC41XCIsXG4gICAgXCJtb2NoYS1zaW5vblwiOiBcIl4xLjEuNVwiLFxuICAgIFwibm9ja1wiOiBcIl44LjAuMFwiLFxuICAgIFwicm9sbHVwXCI6IFwiXjAuMjUuNFwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1iYWJlbFwiOiBcIl4yLjMuOVwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1qc29uXCI6IFwiXjIuMC4wXCIsXG4gICAgXCJzaW5vblwiOiBcIl4xLjE3LjNcIixcbiAgICBcInNpbm9uLWNoYWlcIjogXCJeMi44LjBcIixcbiAgICBcIndhdGNoXCI6IFwiXjAuMTcuMVwiXG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBsaXN0RmlsZXMgPSAoZm9sZGVyUGF0aCkgPT4ge1xuICByZXR1cm4gZnMucmVhZGRpclN5bmMoZm9sZGVyUGF0aCkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgaXRlbVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgaXRlbSk7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGl0ZW1QYXRoKS5pc0ZpbGUoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBsaXN0Rm9sZGVycyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRGlyZWN0b3J5KCk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0RmlsZUNvbnRlbnRzID0gKGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBmaWxlRXhpc3RzID0gKGZpbGVQYXRoKSA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgZGVsZXRlRmlsZSA9IChmaWxlUGF0aCkgPT4ge1xuICByZXR1cm4gZnMudW5saW5rU3luYyhmaWxlUGF0aCk7XG59O1xuXG5jb25zdCB3cml0ZUZpbGUgPSAoZmlsZVBhdGgsIGRhdGEpID0+IHtcbiAgcmV0dXJuIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsIGRhdGEpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBsaXN0RmlsZXMsXG4gIGxpc3RGb2xkZXJzLFxuICBkZWxldGVGaWxlLFxuICB3cml0ZUZpbGUsXG4gIGN3ZDogcHJvY2Vzcy5jd2QsXG4gIGdldEZpbGVDb250ZW50cyxcbiAgZmlsZUV4aXN0c1xufTtcbiIsIi8vIFRha2VuIGZyb20gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vanVzdG1vb24vMTU1MTFmOTJlNTIxNmZhMjYyNGJcbmltcG9ydCB7IGluaGVyaXRzIH0gZnJvbSAndXRpbCc7XG5cbid1c2Ugc3RyaWN0JztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQ3VzdG9tRXJyb3IobWVzc2FnZSwgZXh0cmEpIHtcbiAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gIHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgdGhpcy5leHRyYSA9IGV4dHJhO1xufTtcblxuaW5oZXJpdHMoQ3VzdG9tRXJyb3IsIEVycm9yKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBDdXN0b21FcnJvciBmcm9tICcuL2N1c3RvbV9lcnJvcic7XG5cbmNvbnN0IENPTkZJR19GSUxFTkFNRSA9ICcudm9vZyc7XG5cbmNvbnN0IEhPTUVESVIgPSBwcm9jZXNzLmVudi5IT01FO1xuY29uc3QgTE9DQUxESVIgPSBwcm9jZXNzLmN3ZCgpO1xuXG5jb25zdCBMT0NBTF9DT05GSUcgPSBwYXRoLmpvaW4oTE9DQUxESVIsIENPTkZJR19GSUxFTkFNRSk7XG5jb25zdCBHTE9CQUxfQ09ORklHID0gcGF0aC5qb2luKEhPTUVESVIsIENPTkZJR19GSUxFTkFNRSk7XG5cbmNvbnN0IGZpbmRMb2NhbENvbmZpZyA9ICgpID0+IHtcbiAgaWYgKGZpbGVFeGlzdHMocGF0aC5qb2luKHBhdGgucmVzb2x2ZShMT0NBTERJUiwgJy4uJyksIENPTkZJR19GSUxFTkFNRSkpKSB7XG4gICAgcmV0dXJuIHBhdGguam9pbihwYXRoLnJlc29sdmUoTE9DQUxESVIsICcuLicpLCBDT05GSUdfRklMRU5BTUUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBMT0NBTF9DT05GSUc7XG4gIH1cbn07XG5cbmNvbnN0IHNpdGVCeU5hbWUgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBzaXRlcyhvcHRpb25zKS5maWx0ZXIocCA9PiBwLm5hbWUgPT09IG5hbWUgfHwgcC5ob3N0ID09PSBuYW1lKVswXTtcbn07XG5cbmNvbnN0IHNpdGVzID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gcmVhZCgnc2l0ZXMnLCBvcHRpb25zKSB8fCBbXTtcbn07XG5cbmNvbnN0IHdyaXRlID0gKGtleSwgdmFsdWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgZmlsZVBhdGggPSBwYXRoRnJvbU9wdGlvbnMob3B0aW9ucyk7XG5cbiAgaWYgKCFjb25maWdFeGlzdHMoZmlsZVBhdGgpKSB7XG4gICAgY3JlYXRlKG9wdGlvbnMpO1xuICB9XG5cbiAgbGV0IGNvbmZpZyA9IHJlYWQobnVsbCwgb3B0aW9ucykgfHwge307XG4gIGNvbmZpZ1trZXldID0gdmFsdWU7XG5cbiAgbGV0IGZpbGVDb250ZW50cyA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMik7XG5cbiAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZmlsZUNvbnRlbnRzKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5jb25zdCByZWFkID0gKGtleSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhvcHRpb25zKSkge1xuICAgIGlmIChmaWxlUGF0aCA9PT0gTE9DQUxfQ09ORklHICYmIGNvbmZpZ0V4aXN0cyhPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7fSkpKSB7XG4gICAgICBmaWxlUGF0aCA9IEdMT0JBTF9DT05GSUc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBDdXN0b21FcnJvcignQ29uZmlndXJhdGlvbiBmaWxlIG5vdCBmb3VuZCEnKTtcbiAgICB9XG4gIH1cblxuICBsZXQgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgbGV0IHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuXG4gIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBwYXJzZWREYXRhW2tleV07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhcnNlZERhdGE7XG4gIH1cbn07XG5cbmNvbnN0IGNyZWF0ZSA9IChvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVQYXRoID0gcGF0aEZyb21PcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmICghY29uZmlnRXhpc3RzKG9wdGlvbnMpKSB7XG4gICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgJ3t9Jyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBwYXRoRnJvbU9wdGlvbnMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICgoXy5oYXMob3B0aW9ucywgJ2dsb2JhbCcpICYmIG9wdGlvbnMuZ2xvYmFsID09PSB0cnVlKSkge1xuICAgIHJldHVybiBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2UgaWYgKF8uaGFzKG9wdGlvbnMsICdsb2NhbCcpICYmIG9wdGlvbnMubG9jYWwgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZmluZExvY2FsQ29uZmlnKCk7XG4gIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9ucywgJ2NvbmZpZ1BhdGgnKSB8fCBfLmhhcyhvcHRpb25zLCAnY29uZmlnX3BhdGgnKSkge1xuICAgIHJldHVybiBvcHRpb25zLmNvbmZpZ1BhdGggfHwgb3B0aW9ucy5jb25maWdfcGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmluZExvY2FsQ29uZmlnKCk7XG4gIH1cbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBjb25maWdFeGlzdHMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBmaWxlRXhpc3RzKHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHNpdGVCeU5hbWUsXG4gIHNpdGVzLFxuICB3cml0ZSxcbiAgcmVhZCxcbiAgY3JlYXRlLFxuICBwYXRoRnJvbU9wdGlvbnMsXG4gIGNvbmZpZ0V4aXN0c1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IG1pbWUgZnJvbSAnbWltZS10eXBlL3dpdGgtZGInO1xuXG5taW1lLmRlZmluZSgnYXBwbGljYXRpb24vdm5kLnZvb2cuZGVzaWduLmN1c3RvbStsaXF1aWQnLCB7ZXh0ZW5zaW9uczogWyd0cGwnXX0sIG1pbWUuZHVwT3ZlcndyaXRlKTtcblxuY29uc3QgYnlOYW1lID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVCeU5hbWUobmFtZSwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBhZGQgPSAoZGF0YSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmIChfLmhhcyhkYXRhLCAnaG9zdCcpICYmIF8uaGFzKGRhdGEsICd0b2tlbicpKSB7XG4gICAgbGV0IHNpdGVzID0gY29uZmlnLnNpdGVzKG9wdGlvbnMpO1xuICAgIHNpdGVzLnB1c2goZGF0YSk7XG4gICAgY29uZmlnLndyaXRlKCdzaXRlcycsIHNpdGVzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IHJlbW92ZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVzSW5Db25maWcgPSBjb25maWcuc2l0ZXMob3B0aW9ucyk7XG4gIGxldCBzaXRlTmFtZXMgPSBzaXRlc0luQ29uZmlnLm1hcChzaXRlID0+IHNpdGUubmFtZSB8fCBzaXRlLmhvc3QpO1xuICBsZXQgaWR4ID0gc2l0ZU5hbWVzLmluZGV4T2YobmFtZSk7XG4gIGlmIChpZHggPCAwKSB7IHJldHVybiBmYWxzZTsgfVxuICBsZXQgZmluYWxTaXRlcyA9IHNpdGVzSW5Db25maWdcbiAgICAuc2xpY2UoMCwgaWR4KVxuICAgIC5jb25jYXQoc2l0ZXNJbkNvbmZpZy5zbGljZShpZHggKyAxKSk7XG5cbiAgcmV0dXJuIGNvbmZpZy53cml0ZSgnc2l0ZXMnLCBmaW5hbFNpdGVzLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGdldEZpbGVJbmZvID0gKGZpbGVQYXRoKSA9PiB7XG4gIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZVBhdGgpO1xuXG4gIGlmIChzdGF0LmlzRmlsZSgpKSB7XG4gICAgbGV0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZpbGU6IGZpbGVOYW1lLFxuICAgICAgc2l6ZTogc3RhdC5zaXplLFxuICAgICAgY29udGVudFR5cGU6IG1pbWUubG9va3VwKGZpbGVOYW1lKSxcbiAgICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgICAgdXBkYXRlZEF0OiBzdGF0Lm10aW1lXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbmNvbnN0IHRvdGFsRmlsZXNGb3IgPSAoc2l0ZU5hbWUpID0+IHtcbiAgbGV0IGZpbGVzID0gZmlsZXNGb3Ioc2l0ZU5hbWUpO1xuICByZXR1cm4gT2JqZWN0LmtleXMoZmlsZXMpLnJlZHVjZSgodG90YWwsIGZvbGRlcikgPT4gdG90YWwgKyBmaWxlc1tmb2xkZXJdLmxlbmd0aCwgMCk7XG59O1xuXG5jb25zdCBmaWxlc0ZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBmb2xkZXJzID0gW1xuICAgICdhc3NldHMnLCAnY29tcG9uZW50cycsICdpbWFnZXMnLCAnamF2YXNjcmlwdHMnLCAnbGF5b3V0cycsICdzdHlsZXNoZWV0cydcbiAgXTtcblxuICBsZXQgd29ya2luZ0RpciA9IGRpckZvcihuYW1lKTtcblxuICBsZXQgcm9vdCA9IGZpbGVVdGlscy5saXN0Rm9sZGVycyh3b3JraW5nRGlyKTtcblxuICBpZiAocm9vdCkge1xuICAgIHJldHVybiBmb2xkZXJzLnJlZHVjZSgoc3RydWN0dXJlLCBmb2xkZXIpID0+IHtcbiAgICAgIGlmIChyb290LmluZGV4T2YoZm9sZGVyKSA+PSAwKSB7XG4gICAgICAgIGxldCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHdvcmtpbmdEaXIsIGZvbGRlcik7XG4gICAgICAgIHN0cnVjdHVyZVtmb2xkZXJdID0gZmlsZVV0aWxzLmxpc3RGaWxlcyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlKTtcbiAgICAgICAgICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcblxuICAgICAgICAgIHJldHVybiBzdGF0LmlzRmlsZSgpO1xuICAgICAgICB9KS5tYXAoZmlsZSA9PiB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuXG4gICAgICAgICAgcmV0dXJuIGdldEZpbGVJbmZvKGZ1bGxQYXRoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RydWN0dXJlO1xuICAgIH0sIHt9KTtcbiAgfVxufTtcblxuY29uc3QgZGlyRm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTs7XG4gIGlmIChvcHRpb25zLmRpciB8fCBvcHRpb25zLnBhdGgpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5kaXIgfHwgb3B0aW9ucy5wYXRoO1xuICB9IGVsc2UgaWYgKHNpdGUpIHtcbiAgICByZXR1cm4gc2l0ZS5kaXIgfHwgc2l0ZS5wYXRoO1xuICB9XG59O1xuXG5jb25zdCBob3N0Rm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbiAgaWYgKG9wdGlvbnMuaG9zdCkge1xuICAgIHJldHVybiBvcHRpb25zLmhvc3Q7XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLmhvc3Q7XG4gIH1cbn07XG5cbmNvbnN0IHRva2VuRm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbiAgaWYgKG9wdGlvbnMudG9rZW4gfHwgb3B0aW9ucy5hcGlfdG9rZW4pIHtcbiAgICByZXR1cm4gb3B0aW9ucy50b2tlbiB8fCBvcHRpb25zLmFwaV90b2tlbjtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUudG9rZW4gfHwgc2l0ZS5hcGlfdG9rZW47XG4gIH1cbn07XG5cbmNvbnN0IG5hbWVzID0gKG9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlcyhvcHRpb25zKS5tYXAoc2l0ZSA9PiBzaXRlLm5hbWUgfHwgc2l0ZS5ob3N0KTtcbn07XG5cbmNvbnN0IGhvc3RzID0gKG9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlcyhvcHRpb25zKS5tYXAoc2l0ZSA9PiBzaXRlLmhvc3QpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBieU5hbWUsXG4gIGFkZCxcbiAgcmVtb3ZlLFxuICB0b3RhbEZpbGVzRm9yLFxuICBmaWxlc0ZvcixcbiAgZGlyRm9yLFxuICBob3N0Rm9yLFxuICB0b2tlbkZvcixcbiAgbmFtZXMsXG4gIGhvc3RzLFxuICBnZXRGaWxlSW5mb1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHNpdGVzIGZyb20gJy4vc2l0ZXMnO1xuaW1wb3J0IFZvb2cgZnJvbSAndm9vZyc7XG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1Byb21pc2V9IGZyb20gJ2JsdWViaXJkJztcblxuY29uc3QgY2xpZW50Rm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgaG9zdCA9IHNpdGVzLmhvc3RGb3IobmFtZSwgb3B0aW9ucyk7XG4gIGxldCB0b2tlbiA9IHNpdGVzLnRva2VuRm9yKG5hbWUsIG9wdGlvbnMpO1xuXG4gIGlmIChob3N0ICYmIHRva2VuKSB7XG4gICAgcmV0dXJuIG5ldyBWb29nKGhvc3QsIHRva2VuKTtcbiAgfVxufTtcblxuY29uc3QgZ2V0VG90YWxGaWxlQ291bnQgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgUHJvbWlzZS5hbGwoW2dldExheW91dHMobmFtZSwgb3B0aW9ucyksIGdldExheW91dEFzc2V0cyhuYW1lLCBvcHRpb25zKV0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICByZXNvbHZlKGxheW91dHMubGVuZ3RoICsgYXNzZXRzLmxlbmd0aCk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRDb250ZW50cyA9IChzaXRlTmFtZSwgaWQsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShkYXRhLmJvZHkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dEFzc2V0Q29udGVudHMgPSAoc2l0ZU5hbWUsIGlkLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpLmxheW91dEFzc2V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgaWYgKGRhdGEuZWRpdGFibGUpIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLmRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLnB1YmxpY191cmwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dHMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucylcbiAgICAgIC5sYXlvdXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpXG4gICAgICAubGF5b3V0QXNzZXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVzaEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgZmluZExheW91dE9yQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBjb21wb25lbnQsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IG5hbWUgPSBub3JtYWxpemVUaXRsZShnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lKGZpbGVOYW1lKSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0cyh7XG4gICAgICBwZXJfcGFnZTogMjUwLFxuICAgICAgJ3EubGF5b3V0LmNvbXBvbmVudCc6IGNvbXBvbmVudCB8fCBmYWxzZVxuICAgIH0sIChlcnIsIGRhdGEgPSBbXSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgbGV0IHJldCA9IGRhdGEuZmlsdGVyKGwgPT4gbm9ybWFsaXplVGl0bGUobC50aXRsZSkgPT0gbmFtZSk7XG4gICAgICBpZiAocmV0Lmxlbmd0aCA9PT0gMCkgeyByZWplY3QodW5kZWZpbmVkKTsgfVxuICAgICAgcmVzb2x2ZShfLmhlYWQocmV0KSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZmluZExheW91dEFzc2V0ID0gKGZpbGVOYW1lLCBzaXRlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0QXNzZXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXRfYXNzZXQuZmlsZW5hbWUnOiBmaWxlTmFtZVxuICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycik7IH1cbiAgICAgIHJlc29sdmUoXy5oZWFkKGRhdGEpKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlTmFtZUZyb21QYXRoID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmaWxlUGF0aC5zcGxpdCgnLycpWzFdO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0TmFtZUZyb21GaWxlbmFtZSA9IChmaWxlTmFtZSkgPT4ge1xuICByZXR1cm4gXy5oZWFkKGZpbGVOYW1lLnNwbGl0KCcuJykpO1xufTtcblxuY29uc3QgZmluZEZpbGUgPSAoZmlsZVBhdGgsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlUGF0aCk7XG4gIGxldCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZVBhdGgpO1xuXG4gIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgIHJldHVybiBmaW5kTGF5b3V0T3JDb21wb25lbnQoZmlsZU5hbWUsICh0eXBlID09ICdjb21wb25lbnQnKSwgc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmaW5kTGF5b3V0QXNzZXQoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgfVxufTtcblxuY29uc3QgdGl0bGVGcm9tRmlsZW5hbWUgPSAoZmlsZU5hbWUpID0+IHtcbiAgcmV0dXJuIF8uaGVhZChmaWxlTmFtZS5zcGxpdCgnLicpKS5yZXBsYWNlKC9fLywgJyAnKTtcbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVRpdGxlID0gKHRpdGxlKSA9PiB7XG4gIHJldHVybiB0aXRsZS5yZXBsYWNlKC9bXlxcd1xcLVxcLl0vZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xufTtcblxuY29uc3QgZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGggPSAocGF0aCkgPT4ge1xuICBsZXQgZm9sZGVyID0gcGF0aC5zcGxpdCgnLycpWzBdO1xuICBsZXQgZm9sZGVyVG9UeXBlTWFwID0ge1xuICAgICdsYXlvdXRzJzogJ2xheW91dCcsXG4gICAgJ2NvbXBvbmVudHMnOiAnY29tcG9uZW50JyxcbiAgICAnYXNzZXRzJzogJ2Fzc2V0JyxcbiAgICAnaW1hZ2VzJzogJ2ltYWdlJyxcbiAgICAnamF2YXNjcmlwdHMnOiAnamF2YXNjcmlwdCcsXG4gICAgJ3N0eWxlc2hlZXRzJzogJ3N0eWxlc2hlZXQnXG4gIH07XG5cbiAgcmV0dXJuIGZvbGRlclRvVHlwZU1hcFtmb2xkZXJdO1xufTtcblxuY29uc3QgZ2V0VHlwZUZyb21FeHRlbnNpb24gPSAoZmlsZU5hbWUpID0+IHtcbiAgaWYgKGZpbGVOYW1lLnNwbGl0KCcuJykubGVuZ3RoID4gMSkge1xuICAgIGxldCBleHRlbnNpb24gPSBfLmxhc3QoZmlsZU5hbWUuc3BsaXQoJy4nKSk7XG5cbiAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgIGNhc2UgJ2pzJzpcbiAgICAgIHJldHVybiAnamF2YXNjcmlwdCc7XG4gICAgY2FzZSAnY3NzJzpcbiAgICAgIHJldHVybiAnc3R5bGVzaGVldCc7XG4gICAgY2FzZSAnanBnJzpcbiAgICBjYXNlICdwbmcnOlxuICAgIGNhc2UgJ2pwZWcnOlxuICAgIGNhc2UgJ2dpZic6XG4gICAgICByZXR1cm4gJ2ltYWdlJztcbiAgICBjYXNlICd0cGwnOlxuICAgICAgcmV0dXJuICdsYXlvdXQnO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJ2Fzc2V0JztcbiAgICB9XG4gIH1cbn07XG5cbmNvbnN0IGdldFN1YmZvbGRlckZvclR5cGUgPSAodHlwZSkgPT4ge1xuICByZXR1cm4ge1xuICAgICdhc3NldCc6ICdhc3NldHMnLFxuICAgICdpbWFnZSc6ICdpbWFnZXMnLFxuICAgICdqYXZhc2NyaXB0JzogJ2phdmFzY3JpcHRzJyxcbiAgICAnc3R5bGVzaGVldCc6ICdzdHlsZXNoZWV0cycsXG4gICAgJ2NvbXBvbmVudCc6ICdjb21wb25lbnRzJyxcbiAgICAnbGF5b3V0JzogJ2xheW91dHMnXG4gIH1bdHlwZV07XG59O1xuXG5jb25zdCBub3JtYWxpemVQYXRoID0gKHBhdGgsIHNpdGVEaXIpID0+IHtcbiAgcmV0dXJuIHBhdGhcbiAgICAucmVwbGFjZShzaXRlRGlyLCAnJylcbiAgICAucmVwbGFjZSgvXlxcLy8sICcnKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChzaXRlTmFtZSwgZmlsZSwgZGVzdFBhdGgpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgaWYgKF8uaW5jbHVkZXMoT2JqZWN0LmtleXMoZmlsZSksICdsYXlvdXRfbmFtZScpKSB7XG4gICAgICAgIGdldExheW91dENvbnRlbnRzKHNpdGVOYW1lLCBmaWxlLmlkKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShkZXN0UGF0aCkpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZTsgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycik7IH1cbiAgICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGdldExheW91dEFzc2V0Q29udGVudHMoc2l0ZU5hbWUsIGZpbGUuaWQpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycik7IH1cbiAgICAgICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHVybCA9IGZpbGUucHVibGljX3VybDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0UGF0aCk7XG4gICAgICAgIGlmICh1cmwgJiYgc3RyZWFtKSB7XG4gICAgICAgICAgbGV0IHJlcSA9IHJlcXVlc3QuZ2V0KHVybCkub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpO1xuICAgICAgICAgIHJlcS5waXBlKHN0cmVhbSk7XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWplY3QobnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IHVwbG9hZEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKE9iamVjdC5rZXlzKGZpbGUpLCAnbGF5b3V0X25hbWUnKSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXQoZmlsZS5pZCwge1xuICAgICAgICAgIGJvZHk6IGNvbnRlbnRzXG4gICAgICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGxldCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dEFzc2V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBkYXRhOiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNyZWF0ZUZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGNyZWF0ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlUGF0aCk7XG4gICAgbGV0IGZpbGUgPSBmaWxlT2JqZWN0RnJvbVBhdGgoZmlsZVBhdGgpO1xuXG4gICAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgICBjbGllbnQuY3JlYXRlTGF5b3V0KGZpbGUsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNsaWVudC5jcmVhdGVMYXlvdXRBc3NldChmaWxlLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIChlcnIgPyByZWplY3QgOiByZXNvbHZlKShkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBmaWxlT2JqZWN0RnJvbVBhdGggPSAoZmlsZVBhdGgsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVQYXRoKTtcbiAgbGV0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCk7XG5cbiAgaWYgKF8uaW5jbHVkZXMoWydsYXlvdXQnLCAnY29tcG9uZW50J10sIHR5cGUpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiBfLmhhcyhvcHRpb25zLCAndGl0bGUnKSA/IG9wdGlvbnMudGl0bGUgOiB0aXRsZUZyb21GaWxlbmFtZShmaWxlTmFtZSksXG4gICAgICBjb21wb25lbnQ6IHR5cGUgPT0gJ2NvbXBvbmVudCcsXG4gICAgICBjb250ZW50X3R5cGU6IF8uaGFzKG9wdGlvbnMsICdjb250ZW50X3R5cGUnKSA/IG9wdGlvbnMuY29udGVudF90eXBlIDogJ3BhZ2UnLFxuICAgICAgYm9keTogZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpLFxuICAgICAgcGFyZW50X2lkOiBfLmhhcyhvcHRpb25zLCAncGFyZW50X2lkJykgPyBvcHRpb25zLnBhcmVudF9pZCA6IG51bGwsXG4gICAgICBwYXJlbnRfdGl0bGU6IF8uaGFzKG9wdGlvbnMsICdwYXJlbnRfdGl0bGUnKSA/IG9wdGlvbnMucGFyZW50X3RpdGxlIDogbnVsbFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZpbGVuYW1lOiBmaWxlTmFtZSxcbiAgICAgIGRhdGE6IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKVxuICAgIH07XG4gIH1cbn07XG5cbmNvbnN0IHB1bGxGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBzaXRlRGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcblxuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVzb2x2ZSh3cml0ZUZpbGUoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zKSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihcbiAgICAgIGZpbGUgPT4ge1xuICAgICAgICBpZiAoIWZpbGUgfHwgdHlwZW9mIGZpbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChmaWxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlKHVwbG9hZEZpbGUoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zKSk7XG4gICAgICB9XG4gICAgKS5jYXRjaCgoZXJyKSA9PiB7Y29uc29sZS5sb2coZXJyKTtyZXNvbHZlKHVwbG9hZEZpbGUoc2l0ZU5hbWUsIHVuZGVmaW5lZCwgZmlsZVBhdGgsIG9wdGlvbnMpKTt9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBhZGRGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGZpbGU7XG4gICAgbGV0IHR5cGU7XG5cbiAgICBpZiAoZmlsZU5hbWUuc3BsaXQoJy8nKS5sZW5ndGggPiAxKSB7XG4gICAgICBmaWxlID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlTmFtZSwgb3B0aW9ucyk7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlID0gZmlsZU5hbWU7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21FeHRlbnNpb24oZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIGxldCBzdWJGb2xkZXIgPSBnZXRTdWJmb2xkZXJGb3JUeXBlKHR5cGUpO1xuICAgIGxldCBwcm9qZWN0RGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmluYWxQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIHN1YkZvbGRlciwgZmlsZSk7XG5cbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gZmluYWxQYXRoLnJlcGxhY2UocHJvamVjdERpciArICcvJywgJycpO1xuXG4gICAgaWYgKGZpbGVVdGlscy5maWxlRXhpc3RzKHJlbGF0aXZlUGF0aCwgb3B0aW9ucykpIHtcbiAgICAgIHJlamVjdCh7ZmlsZTogZmlsZU5hbWUsIG1lc3NhZ2U6ICdGaWxlIGFscmVhZHkgZXhpc3RzISd9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBmaWxlVXRpbHMud3JpdGVGaWxlKHJlbGF0aXZlUGF0aCwgJycpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjcmVhdGVGaWxlKHNpdGVOYW1lLCByZWxhdGl2ZVBhdGgsIG9wdGlvbnMpLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdCh7ZmlsZTogZmlsZU5hbWUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucykgPT4ge1xuICBsZXQgY2xpZW50ID0gY2xpZW50Rm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVOYW1lKTtcbiAgICBmaW5kRmlsZShmaWxlTmFtZSwgc2l0ZU5hbWUsIG9wdGlvbnMpLnRoZW4oZmlsZSA9PiB7XG4gICAgICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICAgICAgY2xpZW50LmRlbGV0ZUxheW91dChmaWxlLmlkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNsaWVudC5kZWxldGVMYXlvdXRBc3NldChmaWxlLmlkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCByZW1vdmVGaWxlID0gKHNpdGVOYW1lLCBmaWxlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGZpbGU7XG4gICAgbGV0IHR5cGU7XG5cbiAgICBpZiAoZmlsZU5hbWUuc3BsaXQoJy8nKS5sZW5ndGggPiAxKSB7XG4gICAgICBmaWxlID0gZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlTmFtZSwgb3B0aW9ucyk7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaWxlID0gZmlsZU5hbWU7XG4gICAgICB0eXBlID0gZ2V0VHlwZUZyb21FeHRlbnNpb24oZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIGxldCBzdWJGb2xkZXIgPSBnZXRTdWJmb2xkZXJGb3JUeXBlKHR5cGUpO1xuICAgIGxldCBwcm9qZWN0RGlyID0gc2l0ZXMuZGlyRm9yKHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgICBsZXQgZmluYWxQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIHN1YkZvbGRlciwgZmlsZSk7XG5cbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gZmluYWxQYXRoLnJlcGxhY2UocHJvamVjdERpciArICcvJywgJycpO1xuXG4gICAgaWYgKGZpbGVVdGlscy5maWxlRXhpc3RzKGZpbmFsUGF0aCwgb3B0aW9ucykpIHtcbiAgICAgIGlmICh0eXBlb2YgZmlsZVV0aWxzLmRlbGV0ZUZpbGUocmVsYXRpdmVQYXRoKSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBkZWxldGVGaWxlKHNpdGVOYW1lLCByZWxhdGl2ZVBhdGgsIG9wdGlvbnMpLnRoZW4ocmVzb2x2ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWplY3Qoe2ZpbGU6IGZpbGVOYW1lLCBtZXNzYWdlOiAnVW5hYmxlIHRvIHJlbW92ZSBmaWxlISd9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBjbGllbnRGb3IsXG4gIGdldFRvdGFsRmlsZUNvdW50LFxuICBwdWxsQWxsRmlsZXMsXG4gIHB1c2hBbGxGaWxlcyxcbiAgZmluZEZpbGUsXG4gIHB1c2hGaWxlLFxuICBwdWxsRmlsZSxcbiAgY3JlYXRlRmlsZSxcbiAgYWRkRmlsZSxcbiAgcmVtb3ZlRmlsZVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHt2ZXJzaW9ufSBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuXG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBzaXRlcyBmcm9tICcuL3NpdGVzJztcbmltcG9ydCBhY3Rpb25zIGZyb20gJy4vYWN0aW9ucyc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZmlsZVV0aWxzLFxuICBjb25maWcsXG4gIHNpdGVzLFxuICBhY3Rpb25zLFxuICB2ZXJzaW9uXG59O1xuIl0sIm5hbWVzIjpbImluaGVyaXRzIiwiZmlsZUV4aXN0cyIsInNpdGVzIiwiUHJvbWlzZSIsIndyaXRlRmlsZSIsImRlbGV0ZUZpbGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0tBLElBQU0sWUFBWSxTQUFaLFNBQVksQ0FBQyxVQUFELEVBQWdCO1NBQ3pCLEdBQUcsV0FBSCxDQUFlLFVBQWYsRUFBMkIsTUFBM0IsQ0FBa0MsVUFBUyxJQUFULEVBQWU7UUFDbEQsV0FBVyxLQUFLLElBQUwsQ0FBVSxVQUFWLEVBQXNCLElBQXRCLENBQVgsQ0FEa0Q7V0FFL0MsR0FBRyxRQUFILENBQVksUUFBWixFQUFzQixNQUF0QixFQUFQLENBRnNEO0dBQWYsQ0FBekMsQ0FEZ0M7Q0FBaEI7O0FBT2xCLElBQU0sY0FBYyxTQUFkLFdBQWMsQ0FBQyxVQUFELEVBQWdCO1NBQzNCLEdBQUcsV0FBSCxDQUFlLFVBQWYsRUFBMkIsTUFBM0IsQ0FBa0MsVUFBUyxJQUFULEVBQWU7UUFDbEQsV0FBVyxLQUFLLElBQUwsQ0FBVSxVQUFWLEVBQXNCLElBQXRCLENBQVgsQ0FEa0Q7V0FFL0MsR0FBRyxRQUFILENBQVksUUFBWixFQUFzQixXQUF0QixFQUFQLENBRnNEO0dBQWYsQ0FBekMsQ0FEa0M7Q0FBaEI7O0FBT3BCLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLENBQUMsUUFBRCxFQUE0QjtNQUFqQixnRUFBVSxrQkFBTzs7U0FDM0MsR0FBRyxZQUFILENBQWdCLFFBQWhCLEVBQTBCLE9BQTFCLENBQVAsQ0FEa0Q7Q0FBNUI7O0FBSXhCLElBQU0sYUFBYSxTQUFiLFVBQWEsQ0FBQyxRQUFELEVBQWM7TUFDM0I7V0FDSyxHQUFHLFFBQUgsQ0FBWSxRQUFaLEVBQXNCLE1BQXRCLEVBQVAsQ0FERTtHQUFKLENBRUUsT0FBTyxDQUFQLEVBQVU7V0FDSCxLQUFQLENBRFU7R0FBVjtDQUhlOztBQVFuQixJQUFNLGFBQWEsU0FBYixVQUFhLENBQUMsUUFBRCxFQUFjO1NBQ3hCLEdBQUcsVUFBSCxDQUFjLFFBQWQsQ0FBUCxDQUQrQjtDQUFkOztBQUluQixJQUFNLFlBQVksU0FBWixTQUFZLENBQUMsUUFBRCxFQUFXLElBQVgsRUFBb0I7U0FDN0IsR0FBRyxhQUFILENBQWlCLFFBQWpCLEVBQTJCLElBQTNCLENBQVAsQ0FEb0M7Q0FBcEI7O0FBSWxCLGdCQUFlO3NCQUFBOzBCQUFBO3dCQUFBO3NCQUFBO09BS1IsUUFBUSxHQUFSO2tDQUxRO3dCQUFBO0NBQWY7O0FDbENlLFNBQVMsV0FBVCxDQUFxQixPQUFyQixFQUE4QixLQUE5QixFQUFxQztRQUM1QyxpQkFBTixDQUF3QixJQUF4QixFQUE4QixLQUFLLFdBQUwsQ0FBOUIsQ0FEa0Q7T0FFN0MsSUFBTCxHQUFZLEtBQUssV0FBTCxDQUFpQixJQUFqQixDQUZzQztPQUc3QyxPQUFMLEdBQWUsT0FBZixDQUhrRDtPQUk3QyxLQUFMLEdBQWEsS0FBYixDQUprRDtDQUFyQzs7QUFPZkEsY0FBUyxXQUFULEVBQXNCLEtBQXRCOztBQ0xBLElBQU0sa0JBQWtCLE9BQWxCOztBQUVOLElBQU0sVUFBVSxRQUFRLEdBQVIsQ0FBWSxJQUFaO0FBQ2hCLElBQU0sV0FBVyxRQUFRLEdBQVIsRUFBWDs7QUFFTixJQUFNLGVBQWUsS0FBSyxJQUFMLENBQVUsUUFBVixFQUFvQixlQUFwQixDQUFmO0FBQ04sSUFBTSxnQkFBZ0IsS0FBSyxJQUFMLENBQVUsT0FBVixFQUFtQixlQUFuQixDQUFoQjs7QUFFTixJQUFNLGtCQUFrQixTQUFsQixlQUFrQixHQUFNO01BQ3hCQyxhQUFXLEtBQUssSUFBTCxDQUFVLEtBQUssT0FBTCxDQUFhLFFBQWIsRUFBdUIsSUFBdkIsQ0FBVixFQUF3QyxlQUF4QyxDQUFYLENBQUosRUFBMEU7V0FDakUsS0FBSyxJQUFMLENBQVUsS0FBSyxPQUFMLENBQWEsUUFBYixFQUF1QixJQUF2QixDQUFWLEVBQXdDLGVBQXhDLENBQVAsQ0FEd0U7R0FBMUUsTUFFTztXQUNFLFlBQVAsQ0FESztHQUZQO0NBRHNCOztBQVF4QixJQUFNLGFBQWEsU0FBYixVQUFhLENBQUMsSUFBRCxFQUF3QjtNQUFqQixnRUFBVSxrQkFBTzs7U0FDbEMsTUFBTSxPQUFOLEVBQWUsTUFBZixDQUFzQjtXQUFLLEVBQUUsSUFBRixLQUFXLElBQVgsSUFBbUIsRUFBRSxJQUFGLEtBQVcsSUFBWDtHQUF4QixDQUF0QixDQUErRCxDQUEvRCxDQUFQLENBRHlDO0NBQXhCOztBQUluQixJQUFNLFFBQVEsU0FBUixLQUFRLEdBQWtCO01BQWpCLGdFQUFVLGtCQUFPOztTQUN2QixLQUFLLE9BQUwsRUFBYyxPQUFkLEtBQTBCLEVBQTFCLENBRHVCO0NBQWxCOztBQUlkLElBQU0sUUFBUSxTQUFSLEtBQVEsQ0FBQyxHQUFELEVBQU0sS0FBTixFQUE4QjtNQUFqQixnRUFBVSxrQkFBTzs7TUFDdEMsV0FBVyxnQkFBZ0IsT0FBaEIsQ0FBWCxDQURzQzs7TUFHdEMsQ0FBQyxhQUFhLFFBQWIsQ0FBRCxFQUF5QjtXQUNwQixPQUFQLEVBRDJCO0dBQTdCOztNQUlJLFNBQVMsS0FBSyxJQUFMLEVBQVcsT0FBWCxLQUF1QixFQUF2QixDQVA2QjtTQVFuQyxHQUFQLElBQWMsS0FBZCxDQVIwQzs7TUFVdEMsZUFBZSxLQUFLLFNBQUwsQ0FBZSxNQUFmLEVBQXVCLElBQXZCLEVBQTZCLENBQTdCLENBQWYsQ0FWc0M7O0tBWXZDLGFBQUgsQ0FBaUIsUUFBakIsRUFBMkIsWUFBM0IsRUFaMEM7U0FhbkMsSUFBUCxDQWIwQztDQUE5Qjs7QUFnQmQsSUFBTSxPQUFPLFNBQVAsSUFBTyxDQUFDLEdBQUQsRUFBdUI7TUFBakIsZ0VBQVUsa0JBQU87O01BQzlCLFdBQVcsZ0JBQWdCLE9BQWhCLENBQVgsQ0FEOEI7O01BRzlCLENBQUMsYUFBYSxPQUFiLENBQUQsRUFBd0I7UUFDdEIsYUFBYSxZQUFiLElBQTZCLGFBQWEsT0FBTyxNQUFQLENBQWMsRUFBZCxFQUFrQixPQUFsQixFQUEyQixFQUEzQixDQUFiLENBQTdCLEVBQTJFO2lCQUNsRSxhQUFYLENBRDZFO0tBQS9FLE1BRU87WUFDQyxJQUFJLFdBQUosQ0FBZ0IsK0JBQWhCLENBQU4sQ0FESztLQUZQO0dBREY7O01BUUksT0FBTyxHQUFHLFlBQUgsQ0FBZ0IsUUFBaEIsRUFBMEIsTUFBMUIsQ0FBUCxDQVg4QjtNQVk5QixhQUFhLEtBQUssS0FBTCxDQUFXLElBQVgsQ0FBYixDQVo4Qjs7TUFjOUIsT0FBTyxHQUFQLEtBQWUsUUFBZixFQUF5QjtXQUNwQixXQUFXLEdBQVgsQ0FBUCxDQUQyQjtHQUE3QixNQUVPO1dBQ0UsVUFBUCxDQURLO0dBRlA7Q0FkVzs7QUFxQmIsSUFBTSxTQUFTLFNBQVQsTUFBUyxHQUFrQjtNQUFqQixnRUFBVSxrQkFBTzs7TUFDM0IsV0FBVyxnQkFBZ0IsT0FBaEIsQ0FBWCxDQUQyQjs7TUFHM0IsQ0FBQyxhQUFhLE9BQWIsQ0FBRCxFQUF3QjtPQUN2QixhQUFILENBQWlCLFFBQWpCLEVBQTJCLElBQTNCLEVBRDBCO1dBRW5CLElBQVAsQ0FGMEI7R0FBNUIsTUFHTztXQUNFLEtBQVAsQ0FESztHQUhQO0NBSGE7O0FBV2YsSUFBTSxrQkFBa0IsU0FBbEIsZUFBa0IsR0FBa0I7TUFBakIsZ0VBQVUsa0JBQU87O01BQ25DLEVBQUUsR0FBRixDQUFNLE9BQU4sRUFBZSxRQUFmLEtBQTRCLFFBQVEsTUFBUixLQUFtQixJQUFuQixFQUEwQjtXQUNsRCxhQUFQLENBRHlEO0dBQTNELE1BRU8sSUFBSSxFQUFFLEdBQUYsQ0FBTSxPQUFOLEVBQWUsT0FBZixLQUEyQixRQUFRLEtBQVIsS0FBa0IsSUFBbEIsRUFBd0I7V0FDckQsaUJBQVAsQ0FENEQ7R0FBdkQsTUFFQSxJQUFJLEVBQUUsR0FBRixDQUFNLE9BQU4sRUFBZSxZQUFmLEtBQWdDLEVBQUUsR0FBRixDQUFNLE9BQU4sRUFBZSxhQUFmLENBQWhDLEVBQStEO1dBQ2pFLFFBQVEsVUFBUixJQUFzQixRQUFRLFdBQVIsQ0FEMkM7R0FBbkUsTUFFQTtXQUNFLGlCQUFQLENBREs7R0FGQTtDQUxlOztBQVl4QixJQUFNQSxlQUFhLFNBQWIsVUFBYSxDQUFDLFFBQUQsRUFBYztNQUMzQjtXQUNLLEdBQUcsUUFBSCxDQUFZLFFBQVosRUFBc0IsTUFBdEIsRUFBUCxDQURFO0dBQUosQ0FFRSxPQUFPLENBQVAsRUFBVTtXQUNILEtBQVAsQ0FEVTtHQUFWO0NBSGU7O0FBUW5CLElBQU0sZUFBZSxTQUFmLFlBQWUsR0FBa0I7TUFBakIsZ0VBQVUsa0JBQU87O1NBQzlCQSxhQUFXLGdCQUFnQixPQUFoQixDQUFYLENBQVAsQ0FEcUM7Q0FBbEI7O0FBSXJCLGFBQWU7d0JBQUE7Y0FBQTtjQUFBO1lBQUE7Z0JBQUE7a0NBQUE7NEJBQUE7Q0FBZjs7QUM5RkEsS0FBSyxNQUFMLENBQVksMkNBQVosRUFBeUQsRUFBQyxZQUFZLENBQUMsS0FBRCxDQUFaLEVBQTFELEVBQWdGLEtBQUssWUFBTCxDQUFoRjs7QUFFQSxJQUFNLFNBQVMsU0FBVCxNQUFTLENBQUMsSUFBRCxFQUF3QjtNQUFqQixnRUFBVSxrQkFBTzs7U0FDOUIsT0FBTyxVQUFQLENBQWtCLElBQWxCLEVBQXdCLE9BQXhCLENBQVAsQ0FEcUM7Q0FBeEI7O0FBSWYsSUFBTSxNQUFNLFNBQU4sR0FBTSxDQUFDLElBQUQsRUFBd0I7TUFBakIsZ0VBQVUsa0JBQU87O01BQzlCLEVBQUUsR0FBRixDQUFNLElBQU4sRUFBWSxNQUFaLEtBQXVCLEVBQUUsR0FBRixDQUFNLElBQU4sRUFBWSxPQUFaLENBQXZCLEVBQTZDO1FBQzNDLFFBQVEsT0FBTyxLQUFQLENBQWEsT0FBYixDQUFSLENBRDJDO1VBRXpDLElBQU4sQ0FBVyxJQUFYLEVBRitDO1dBR3hDLEtBQVAsQ0FBYSxPQUFiLEVBQXNCLEtBQXRCLEVBQTZCLE9BQTdCLEVBSCtDO1dBSXhDLElBQVAsQ0FKK0M7R0FBakQsTUFLTztXQUNFLEtBQVAsQ0FESztHQUxQO0NBRFU7O0FBV1osSUFBTSxTQUFTLFNBQVQsTUFBUyxDQUFDLElBQUQsRUFBd0I7TUFBakIsZ0VBQVUsa0JBQU87O01BQ2pDLGdCQUFnQixPQUFPLEtBQVAsQ0FBYSxPQUFiLENBQWhCLENBRGlDO01BRWpDLFlBQVksY0FBYyxHQUFkLENBQWtCO1dBQVEsS0FBSyxJQUFMLElBQWEsS0FBSyxJQUFMO0dBQXJCLENBQTlCLENBRmlDO01BR2pDLE1BQU0sVUFBVSxPQUFWLENBQWtCLElBQWxCLENBQU4sQ0FIaUM7TUFJakMsTUFBTSxDQUFOLEVBQVM7V0FBUyxLQUFQLENBQUY7R0FBYjtNQUNJLGFBQWEsY0FDZCxLQURjLENBQ1IsQ0FEUSxFQUNMLEdBREssRUFFZCxNQUZjLENBRVAsY0FBYyxLQUFkLENBQW9CLE1BQU0sQ0FBTixDQUZiLENBQWIsQ0FMaUM7O1NBUzlCLE9BQU8sS0FBUCxDQUFhLE9BQWIsRUFBc0IsVUFBdEIsRUFBa0MsT0FBbEMsQ0FBUCxDQVRxQztDQUF4Qjs7QUFZZixJQUFNLGNBQWMsU0FBZCxXQUFjLENBQUMsUUFBRCxFQUFjO01BQzVCLE9BQU8sR0FBRyxRQUFILENBQVksUUFBWixDQUFQLENBRDRCOztNQUc1QixLQUFLLE1BQUwsRUFBSixFQUFtQjtRQUNiLFdBQVcsS0FBSyxRQUFMLENBQWMsUUFBZCxDQUFYLENBRGE7V0FFVjtZQUNDLFFBQU47WUFDTSxLQUFLLElBQUw7bUJBQ08sS0FBSyxNQUFMLENBQVksUUFBWixDQUFiO1lBQ00sUUFBTjtpQkFDVyxLQUFLLEtBQUw7S0FMYixDQUZpQjtHQUFuQixNQVNPO1dBQUE7R0FUUDtDQUhrQjs7QUFpQnBCLElBQU0sZ0JBQWdCLFNBQWhCLGFBQWdCLENBQUMsUUFBRCxFQUFjO01BQzlCLFFBQVEsU0FBUyxRQUFULENBQVIsQ0FEOEI7U0FFM0IsT0FBTyxJQUFQLENBQVksS0FBWixFQUFtQixNQUFuQixDQUEwQixVQUFDLEtBQUQsRUFBUSxNQUFSO1dBQW1CLFFBQVEsTUFBTSxNQUFOLEVBQWMsTUFBZDtHQUEzQixFQUFpRCxDQUEzRSxDQUFQLENBRmtDO0NBQWQ7O0FBS3RCLElBQU0sV0FBVyxTQUFYLFFBQVcsQ0FBQyxJQUFELEVBQVU7TUFDckIsVUFBVSxDQUNaLFFBRFksRUFDRixZQURFLEVBQ1ksUUFEWixFQUNzQixhQUR0QixFQUNxQyxTQURyQyxFQUNnRCxhQURoRCxDQUFWLENBRHFCOztNQUtyQixhQUFhLE9BQU8sSUFBUCxDQUFiLENBTHFCOztNQU9yQixPQUFPLFVBQVUsV0FBVixDQUFzQixVQUF0QixDQUFQLENBUHFCOztNQVNyQixJQUFKLEVBQVU7V0FDRCxRQUFRLE1BQVIsQ0FBZSxVQUFDLFNBQUQsRUFBWSxNQUFaLEVBQXVCO1VBQ3ZDLEtBQUssT0FBTCxDQUFhLE1BQWIsS0FBd0IsQ0FBeEIsRUFBMkI7O2NBQ3pCLGFBQWEsS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixNQUF0QixDQUFiO29CQUNNLE1BQVYsSUFBb0IsVUFBVSxTQUFWLENBQW9CLFVBQXBCLEVBQWdDLE1BQWhDLENBQXVDLFVBQVMsSUFBVCxFQUFlO2dCQUNwRSxXQUFXLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBc0IsSUFBdEIsQ0FBWCxDQURvRTtnQkFFcEUsT0FBTyxHQUFHLFFBQUgsQ0FBWSxRQUFaLENBQVAsQ0FGb0U7O21CQUlqRSxLQUFLLE1BQUwsRUFBUCxDQUp3RTtXQUFmLENBQXZDLENBS2pCLEdBTGlCLENBS2IsZ0JBQVE7Z0JBQ1QsV0FBVyxLQUFLLElBQUwsQ0FBVSxVQUFWLEVBQXNCLElBQXRCLENBQVgsQ0FEUzs7bUJBR04sWUFBWSxRQUFaLENBQVAsQ0FIYTtXQUFSLENBTFA7YUFGNkI7T0FBL0I7YUFhTyxTQUFQLENBZDJDO0tBQXZCLEVBZW5CLEVBZkksQ0FBUCxDQURRO0dBQVY7Q0FUZTs7QUE2QmpCLElBQU0sU0FBUyxTQUFULE1BQVMsQ0FBQyxJQUFELEVBQXdCO01BQWpCLGdFQUFVLGtCQUFPOztNQUNqQyxPQUFPLE9BQU8sSUFBUCxFQUFhLE9BQWIsQ0FBUCxDQURpQztNQUVqQyxRQUFRLEdBQVIsSUFBZSxRQUFRLElBQVIsRUFBYztXQUN4QixRQUFRLEdBQVIsSUFBZSxRQUFRLElBQVIsQ0FEUztHQUFqQyxNQUVPLElBQUksSUFBSixFQUFVO1dBQ1IsS0FBSyxHQUFMLElBQVksS0FBSyxJQUFMLENBREo7R0FBVjtDQUpNOztBQVNmLElBQU0sVUFBVSxTQUFWLE9BQVUsQ0FBQyxJQUFELEVBQXdCO01BQWpCLGdFQUFVLGtCQUFPOztNQUNsQyxPQUFPLE9BQU8sSUFBUCxFQUFhLE9BQWIsQ0FBUCxDQURrQztNQUVsQyxRQUFRLElBQVIsRUFBYztXQUNULFFBQVEsSUFBUixDQURTO0dBQWxCLE1BRU8sSUFBSSxJQUFKLEVBQVU7V0FDUixLQUFLLElBQUwsQ0FEUTtHQUFWO0NBSk87O0FBU2hCLElBQU0sV0FBVyxTQUFYLFFBQVcsQ0FBQyxJQUFELEVBQXdCO01BQWpCLGdFQUFVLGtCQUFPOztNQUNuQyxPQUFPLE9BQU8sSUFBUCxFQUFhLE9BQWIsQ0FBUCxDQURtQztNQUVuQyxRQUFRLEtBQVIsSUFBaUIsUUFBUSxTQUFSLEVBQW1CO1dBQy9CLFFBQVEsS0FBUixJQUFpQixRQUFRLFNBQVIsQ0FEYztHQUF4QyxNQUVPLElBQUksSUFBSixFQUFVO1dBQ1IsS0FBSyxLQUFMLElBQWMsS0FBSyxTQUFMLENBRE47R0FBVjtDQUpROztBQVNqQixJQUFNLFFBQVEsU0FBUixLQUFRLENBQUMsT0FBRCxFQUFhO1NBQ2xCLE9BQU8sS0FBUCxDQUFhLE9BQWIsRUFBc0IsR0FBdEIsQ0FBMEI7V0FBUSxLQUFLLElBQUwsSUFBYSxLQUFLLElBQUw7R0FBckIsQ0FBakMsQ0FEeUI7Q0FBYjs7QUFJZCxJQUFNLFFBQVEsU0FBUixLQUFRLENBQUMsT0FBRCxFQUFhO1NBQ2xCLE9BQU8sS0FBUCxDQUFhLE9BQWIsRUFBc0IsR0FBdEIsQ0FBMEI7V0FBUSxLQUFLLElBQUw7R0FBUixDQUFqQyxDQUR5QjtDQUFiOztBQUlkLGNBQWU7Z0JBQUE7VUFBQTtnQkFBQTs4QkFBQTtvQkFBQTtnQkFBQTtrQkFBQTtvQkFBQTtjQUFBO2NBQUE7MEJBQUE7Q0FBZjs7QUNqSEEsSUFBTSxZQUFZLFNBQVosU0FBWSxDQUFDLElBQUQsRUFBd0I7TUFBakIsZ0VBQVUsa0JBQU87O01BQ3BDLE9BQU9DLFFBQU0sT0FBTixDQUFjLElBQWQsRUFBb0IsT0FBcEIsQ0FBUCxDQURvQztNQUVwQyxRQUFRQSxRQUFNLFFBQU4sQ0FBZSxJQUFmLEVBQXFCLE9BQXJCLENBQVIsQ0FGb0M7O01BSXBDLFFBQVEsS0FBUixFQUFlO1dBQ1YsSUFBSSxJQUFKLENBQVMsSUFBVCxFQUFlLEtBQWYsQ0FBUCxDQURpQjtHQUFuQjtDQUpnQjs7QUFTbEIsSUFBTSxvQkFBb0IsU0FBcEIsaUJBQW9CLENBQUMsSUFBRCxFQUF3QjtNQUFqQixnRUFBVSxrQkFBTzs7U0FDekMsSUFBSUMsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO3FCQUM5QixHQUFSLENBQVksQ0FBQyxXQUFXLElBQVgsRUFBaUIsT0FBakIsQ0FBRCxFQUE0QixnQkFBZ0IsSUFBaEIsRUFBc0IsT0FBdEIsQ0FBNUIsQ0FBWixFQUF5RSxJQUF6RSxDQUE4RSxnQkFBdUI7OztVQUFyQixtQkFBcUI7VUFBWixrQkFBWTs7Y0FDM0YsUUFBUSxNQUFSLEdBQWlCLE9BQU8sTUFBUCxDQUF6QixDQURtRztLQUF2QixDQUE5RSxDQUVHLEtBRkgsQ0FFUyxNQUZULEVBRHNDO0dBQXJCLENBQW5CLENBRGdEO0NBQXhCOztBQVExQixJQUFNLG9CQUFvQixTQUFwQixpQkFBb0IsQ0FBQyxRQUFELEVBQVcsRUFBWCxFQUFnQztNQUFqQixnRUFBVSxrQkFBTzs7U0FDakQsSUFBSUEsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO2NBQzVCLFFBQVYsRUFBb0IsT0FBcEIsRUFBNkIsTUFBN0IsQ0FBb0MsRUFBcEMsRUFBd0MsRUFBeEMsRUFBNEMsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1VBQ3JELEdBQUosRUFBUztlQUFTLEdBQVAsRUFBRjtPQUFUO2NBQ1EsS0FBSyxJQUFMLENBQVIsQ0FGeUQ7S0FBZixDQUE1QyxDQURzQztHQUFyQixDQUFuQixDQUR3RDtDQUFoQzs7QUFTMUIsSUFBTSx5QkFBeUIsU0FBekIsc0JBQXlCLENBQUMsUUFBRCxFQUFXLEVBQVgsRUFBZ0M7TUFBakIsZ0VBQVUsa0JBQU87O1NBQ3RELElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtjQUM1QixRQUFWLEVBQW9CLE9BQXBCLEVBQTZCLFdBQTdCLENBQXlDLEVBQXpDLEVBQTZDLEVBQTdDLEVBQWlELFVBQUMsR0FBRCxFQUFNLElBQU4sRUFBZTtVQUMxRCxHQUFKLEVBQVM7ZUFBUyxHQUFQLEVBQUY7T0FBVDtVQUNJLEtBQUssUUFBTCxFQUFlO2dCQUNULEtBQUssSUFBTCxDQUFSLENBRGlCO09BQW5CLE1BRU87Z0JBQ0csS0FBSyxVQUFMLENBQVIsQ0FESztPQUZQO0tBRitDLENBQWpELENBRHNDO0dBQXJCLENBQW5CLENBRDZEO0NBQWhDOztBQWEvQixJQUFNLGFBQWEsU0FBYixVQUFhLENBQUMsUUFBRCxFQUE0QjtNQUFqQixnRUFBVSxrQkFBTzs7U0FDdEMsSUFBSUEsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO2NBQzVCLFFBQVYsRUFBb0IsT0FBcEIsRUFDRyxPQURILENBQ1csT0FBTyxNQUFQLENBQWMsRUFBZCxFQUFrQixFQUFDLFVBQVUsR0FBVixFQUFuQixFQUFtQyxPQUFuQyxDQURYLEVBQ3dELFVBQUMsR0FBRCxFQUFNLElBQU4sRUFBZTtVQUMvRCxHQUFKLEVBQVM7ZUFBUyxHQUFQLEVBQUY7T0FBVDtjQUNRLElBQVIsRUFGbUU7S0FBZixDQUR4RCxDQURzQztHQUFyQixDQUFuQixDQUQ2QztDQUE1Qjs7QUFVbkIsSUFBTSxrQkFBa0IsU0FBbEIsZUFBa0IsQ0FBQyxRQUFELEVBQTRCO01BQWpCLGdFQUFVLGtCQUFPOztTQUMzQyxJQUFJQSxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7Y0FDNUIsUUFBVixFQUFvQixPQUFwQixFQUNHLFlBREgsQ0FDZ0IsT0FBTyxNQUFQLENBQWMsRUFBZCxFQUFrQixFQUFDLFVBQVUsR0FBVixFQUFuQixFQUFtQyxPQUFuQyxDQURoQixFQUM2RCxVQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWU7VUFDcEUsR0FBSixFQUFTO2VBQVMsR0FBUCxFQUFGO09BQVQ7Y0FDUSxJQUFSLEVBRndFO0tBQWYsQ0FEN0QsQ0FEc0M7R0FBckIsQ0FBbkIsQ0FEa0Q7Q0FBNUI7O0FBVXhCLElBQU0sZUFBZSxTQUFmLFlBQWUsQ0FBQyxRQUFELEVBQTRCO01BQWpCLGdFQUFVLGtCQUFPOztTQUN4QyxJQUFJQSxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7UUFDbEMsVUFBVUQsUUFBTSxNQUFOLENBQWEsUUFBYixFQUF1QixPQUF2QixDQUFWLENBRGtDOztxQkFHOUIsR0FBUixDQUFZLENBQ1YsV0FBVyxRQUFYLEVBQXFCLE9BQXJCLENBRFUsRUFFVixnQkFBZ0IsUUFBaEIsRUFBMEIsT0FBMUIsQ0FGVSxDQUFaLEVBR0csSUFISCxDQUdRLGlCQUF1Qjs7O1VBQXJCLG1CQUFxQjtVQUFaLGtCQUFZOzt1QkFDckIsR0FBUixDQUFZLENBQ1YsUUFBUSxHQUFSLENBQVksYUFBSztZQUNYLFdBQVcsS0FBSyxJQUFMLENBQVUsT0FBVixHQUFzQixFQUFFLFNBQUYsR0FBYyxZQUFkLEdBQTZCLFNBQTdCLFVBQTBDLGVBQWUsRUFBRSxLQUFGLFVBQS9FLENBQVgsQ0FEVztlQUVSLFNBQVMsUUFBVCxFQUFtQixRQUFuQixFQUE2QixPQUE3QixDQUFQLENBRmU7T0FBTCxDQUFaLENBR0csTUFISCxDQUdVLE9BQU8sR0FBUCxDQUFXLGFBQUs7WUFDcEIsV0FBVyxLQUFLLElBQUwsQ0FBVSxPQUFWLEdBQXNCLEVBQUUsUUFBRixDQUFXLENBQUMsWUFBRCxFQUFlLE9BQWYsRUFBd0IsWUFBeEIsQ0FBWCxFQUFrRCxFQUFFLFVBQUYsQ0FBbEQsR0FBa0UsRUFBRSxVQUFGLEdBQWUsT0FBakYsV0FBNkYsRUFBRSxRQUFGLENBQTlILENBRG9CO2VBRWpCLFNBQVMsUUFBVCxFQUFtQixRQUFuQixFQUE2QixPQUE3QixDQUFQLENBRndCO09BQUwsQ0FIckIsQ0FEVSxDQUFaLEVBUUcsSUFSSCxDQVFRLE9BUlIsRUFENkI7S0FBdkIsQ0FIUixDQWFHLEtBYkgsQ0FhUyxNQWJULEVBSHNDO0dBQXJCLENBQW5CLENBRCtDO0NBQTVCOztBQXFCckIsSUFBTSxlQUFlLFNBQWYsWUFBZSxDQUFDLFFBQUQsRUFBNEI7TUFBakIsZ0VBQVUsa0JBQU87O1NBQ3hDLElBQUlDLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtRQUNsQyxVQUFVRCxRQUFNLE1BQU4sQ0FBYSxRQUFiLEVBQXVCLE9BQXZCLENBQVYsQ0FEa0M7O3FCQUc5QixHQUFSLENBQVksQ0FDVixXQUFXLFFBQVgsRUFBcUIsT0FBckIsQ0FEVSxFQUVWLGdCQUFnQixRQUFoQixFQUEwQixPQUExQixDQUZVLENBQVosRUFHRyxJQUhILENBR1EsaUJBQXVCOzs7VUFBckIsbUJBQXFCO1VBQVosa0JBQVk7O3VCQUNyQixHQUFSLENBQVksQ0FDVixRQUFRLEdBQVIsQ0FBWSxhQUFLO1lBQ1gsV0FBVyxLQUFLLElBQUwsQ0FBVSxPQUFWLEdBQXNCLEVBQUUsU0FBRixHQUFjLFlBQWQsR0FBNkIsU0FBN0IsVUFBMEMsZUFBZSxFQUFFLEtBQUYsVUFBL0UsQ0FBWCxDQURXO2VBRVIsU0FBUyxRQUFULEVBQW1CLFFBQW5CLEVBQTZCLE9BQTdCLENBQVAsQ0FGZTtPQUFMLENBQVosQ0FHRyxNQUhILENBR1UsT0FBTyxHQUFQLENBQVcsYUFBSztZQUNwQixXQUFXLEtBQUssSUFBTCxDQUFVLE9BQVYsR0FBc0IsRUFBRSxRQUFGLENBQVcsQ0FBQyxZQUFELEVBQWUsT0FBZixFQUF3QixZQUF4QixDQUFYLEVBQWtELEVBQUUsVUFBRixDQUFsRCxHQUFrRSxFQUFFLFVBQUYsR0FBZSxPQUFqRixXQUE2RixFQUFFLFFBQUYsQ0FBOUgsQ0FEb0I7ZUFFakIsU0FBUyxRQUFULEVBQW1CLFFBQW5CLEVBQTZCLE9BQTdCLENBQVAsQ0FGd0I7T0FBTCxDQUhyQixDQURVLENBQVosRUFRRyxJQVJILENBUVEsT0FSUixFQUQ2QjtLQUF2QixDQUhSLENBYUcsS0FiSCxDQWFTLE1BYlQsRUFIc0M7R0FBckIsQ0FBbkIsQ0FEK0M7Q0FBNUI7O0FBcUJyQixJQUFNLHdCQUF3QixTQUF4QixxQkFBd0IsQ0FBQyxRQUFELEVBQVcsU0FBWCxFQUFzQixRQUF0QixFQUFpRDtNQUFqQixnRUFBVSxrQkFBTzs7TUFDekUsT0FBTyxlQUFlLDBCQUEwQixRQUExQixDQUFmLENBQVAsQ0FEeUU7U0FFdEUsSUFBSUMsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO1dBQy9CLFVBQVUsUUFBVixFQUFvQixPQUFwQixFQUE2QixPQUE3QixDQUFxQztnQkFDaEMsR0FBVjs0QkFDc0IsYUFBYSxLQUFiO0tBRmpCLEVBR0osVUFBQyxHQUFELEVBQW9CO1VBQWQsNkRBQU8sa0JBQU87O1VBQ2pCLEdBQUosRUFBUztlQUFTLEdBQVAsRUFBRjtPQUFUO1VBQ0ksTUFBTSxLQUFLLE1BQUwsQ0FBWTtlQUFLLGVBQWUsRUFBRSxLQUFGLENBQWYsSUFBMkIsSUFBM0I7T0FBTCxDQUFsQixDQUZpQjtVQUdqQixJQUFJLE1BQUosS0FBZSxDQUFmLEVBQWtCO2VBQVMsU0FBUCxFQUFGO09BQXRCO2NBQ1EsRUFBRSxJQUFGLENBQU8sR0FBUCxDQUFSLEVBSnFCO0tBQXBCLENBSEgsQ0FEc0M7R0FBckIsQ0FBbkIsQ0FGNkU7Q0FBakQ7O0FBZTlCLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBc0M7TUFBakIsZ0VBQVUsa0JBQU87O1NBQ3JELElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtXQUMvQixVQUFVLFFBQVYsRUFBb0IsT0FBcEIsRUFBNkIsWUFBN0IsQ0FBMEM7Z0JBQ3JDLEdBQVY7aUNBQzJCLFFBQTNCO0tBRkssRUFHSixVQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWU7VUFDWixHQUFKLEVBQVM7ZUFBUyxHQUFQLEVBQUY7T0FBVDtjQUNRLEVBQUUsSUFBRixDQUFPLElBQVAsQ0FBUixFQUZnQjtLQUFmLENBSEgsQ0FEc0M7R0FBckIsQ0FBbkIsQ0FENEQ7Q0FBdEM7O0FBWXhCLElBQU0sc0JBQXNCLFNBQXRCLG1CQUFzQixDQUFDLFFBQUQsRUFBYztTQUNqQyxTQUFTLEtBQVQsQ0FBZSxHQUFmLEVBQW9CLENBQXBCLENBQVAsQ0FEd0M7Q0FBZDs7QUFJNUIsSUFBTSw0QkFBNEIsU0FBNUIseUJBQTRCLENBQUMsUUFBRCxFQUFjO1NBQ3ZDLEVBQUUsSUFBRixDQUFPLFNBQVMsS0FBVCxDQUFlLEdBQWYsQ0FBUCxDQUFQLENBRDhDO0NBQWQ7O0FBSWxDLElBQU0sV0FBVyxTQUFYLFFBQVcsQ0FBQyxRQUFELEVBQVcsUUFBWCxFQUFzQztNQUFqQixnRUFBVSxrQkFBTzs7TUFDakQsT0FBTyx3QkFBd0IsUUFBeEIsQ0FBUCxDQURpRDtNQUVqRCxXQUFXLG9CQUFvQixRQUFwQixDQUFYLENBRmlEOztNQUlqRCxFQUFFLFFBQUYsQ0FBVyxDQUFDLFFBQUQsRUFBVyxXQUFYLENBQVgsRUFBb0MsSUFBcEMsQ0FBSixFQUErQztXQUN0QyxzQkFBc0IsUUFBdEIsRUFBaUMsUUFBUSxXQUFSLEVBQXNCLFFBQXZELEVBQWlFLE9BQWpFLENBQVAsQ0FENkM7R0FBL0MsTUFFTztXQUNFLGdCQUFnQixRQUFoQixFQUEwQixRQUExQixFQUFvQyxPQUFwQyxDQUFQLENBREs7R0FGUDtDQUplOztBQVdqQixJQUFNLG9CQUFvQixTQUFwQixpQkFBb0IsQ0FBQyxRQUFELEVBQWM7U0FDL0IsRUFBRSxJQUFGLENBQU8sU0FBUyxLQUFULENBQWUsR0FBZixDQUFQLEVBQTRCLE9BQTVCLENBQW9DLEdBQXBDLEVBQXlDLEdBQXpDLENBQVAsQ0FEc0M7Q0FBZDs7QUFJMUIsSUFBTSxpQkFBaUIsU0FBakIsY0FBaUIsQ0FBQyxLQUFELEVBQVc7U0FDekIsTUFBTSxPQUFOLENBQWMsWUFBZCxFQUE0QixHQUE1QixFQUFpQyxXQUFqQyxFQUFQLENBRGdDO0NBQVg7O0FBSXZCLElBQU0sMEJBQTBCLFNBQTFCLHVCQUEwQixDQUFDLElBQUQsRUFBVTtNQUNwQyxTQUFTLEtBQUssS0FBTCxDQUFXLEdBQVgsRUFBZ0IsQ0FBaEIsQ0FBVCxDQURvQztNQUVwQyxrQkFBa0I7ZUFDVCxRQUFYO2tCQUNjLFdBQWQ7Y0FDVSxPQUFWO2NBQ1UsT0FBVjttQkFDZSxZQUFmO21CQUNlLFlBQWY7R0FORSxDQUZvQzs7U0FXakMsZ0JBQWdCLE1BQWhCLENBQVAsQ0FYd0M7Q0FBVjs7QUFjaEMsSUFBTSx1QkFBdUIsU0FBdkIsb0JBQXVCLENBQUMsUUFBRCxFQUFjO01BQ3JDLFNBQVMsS0FBVCxDQUFlLEdBQWYsRUFBb0IsTUFBcEIsR0FBNkIsQ0FBN0IsRUFBZ0M7UUFDOUIsWUFBWSxFQUFFLElBQUYsQ0FBTyxTQUFTLEtBQVQsQ0FBZSxHQUFmLENBQVAsQ0FBWixDQUQ4Qjs7WUFHMUIsU0FBUjtXQUNLLElBQUw7ZUFDUyxZQUFQLENBREY7V0FFSyxLQUFMO2VBQ1MsWUFBUCxDQURGO1dBRUssS0FBTCxDQUxBO1dBTUssS0FBTCxDQU5BO1dBT0ssTUFBTCxDQVBBO1dBUUssS0FBTDtlQUNTLE9BQVAsQ0FERjtXQUVLLEtBQUw7ZUFDUyxRQUFQLENBREY7O2VBR1MsT0FBUCxDQURGO0tBZmtDO0dBQXBDO0NBRDJCOztBQXNCN0IsSUFBTSxzQkFBc0IsU0FBdEIsbUJBQXNCLENBQUMsSUFBRCxFQUFVO1NBQzdCO2FBQ0ksUUFBVDthQUNTLFFBQVQ7a0JBQ2MsYUFBZDtrQkFDYyxhQUFkO2lCQUNhLFlBQWI7Y0FDVSxTQUFWO0dBTkssQ0FPTCxJQVBLLENBQVAsQ0FEb0M7Q0FBVjs7QUFXNUIsSUFBTSxnQkFBZ0IsU0FBaEIsYUFBZ0IsQ0FBQyxJQUFELEVBQU8sT0FBUCxFQUFtQjtTQUNoQyxLQUNKLE9BREksQ0FDSSxPQURKLEVBQ2EsRUFEYixFQUVKLE9BRkksQ0FFSSxLQUZKLEVBRVcsRUFGWCxDQUFQLENBRHVDO0NBQW5COztBQU10QixJQUFNQyxjQUFZLFNBQVosU0FBWSxDQUFDLFFBQUQsRUFBVyxJQUFYLEVBQWlCLFFBQWpCLEVBQThCO1NBQ3ZDLElBQUlELGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtRQUNsQyxJQUFKLEVBQVU7VUFDSixFQUFFLFFBQUYsQ0FBVyxPQUFPLElBQVAsQ0FBWSxJQUFaLENBQVgsRUFBOEIsYUFBOUIsQ0FBSixFQUFrRDswQkFDOUIsUUFBbEIsRUFBNEIsS0FBSyxFQUFMLENBQTVCLENBQXFDLElBQXJDLENBQTBDLG9CQUFZO2NBQ2hEO2VBQ0MsU0FBSCxDQUFhLEtBQUssT0FBTCxDQUFhLFFBQWIsQ0FBYixFQURFO1dBQUosQ0FFRSxPQUFPLENBQVAsRUFBVTtnQkFDTixFQUFFLElBQUYsSUFBVSxRQUFWLEVBQW9CO29CQUFRLENBQU4sQ0FBRjthQUF4QjtXQURBOzthQUlDLFNBQUgsQ0FBYSxRQUFiLEVBQXVCLFFBQXZCLEVBQWlDLFVBQUMsR0FBRCxFQUFTO2dCQUNwQyxHQUFKLEVBQVM7cUJBQVMsR0FBUCxFQUFGO2FBQVQ7b0JBQ1EsSUFBUixFQUZ3QztXQUFULENBQWpDLENBUG9EO1NBQVosQ0FBMUMsQ0FEZ0Q7T0FBbEQsTUFhTyxJQUFJLEtBQUssUUFBTCxFQUFlOytCQUNELFFBQXZCLEVBQWlDLEtBQUssRUFBTCxDQUFqQyxDQUEwQyxJQUExQyxDQUErQyxvQkFBWTtjQUNyRDtlQUNDLFNBQUgsQ0FBYSxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQWIsRUFERTtXQUFKLENBRUUsT0FBTyxDQUFQLEVBQVU7Z0JBQ04sRUFBRSxJQUFGLElBQVUsUUFBVixFQUFvQjtvQkFBUSxDQUFOLENBQUY7YUFBeEI7V0FEQTthQUdDLFNBQUgsQ0FBYSxRQUFiLEVBQXVCLFFBQXZCLEVBQWlDLFVBQUMsR0FBRCxFQUFTO2dCQUNwQyxHQUFKLEVBQVM7cUJBQVMsR0FBUCxFQUFGO2FBQVQ7b0JBQ1EsSUFBUixFQUZ3QztXQUFULENBQWpDLENBTnlEO1NBQVosQ0FBL0MsQ0FEd0I7T0FBbkIsTUFZQTtZQUNELE1BQU0sS0FBSyxVQUFMLENBREw7WUFFRDthQUNDLFNBQUgsQ0FBYSxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQWIsRUFERTtTQUFKLENBRUUsT0FBTyxDQUFQLEVBQVU7Y0FDTixFQUFFLElBQUYsSUFBVSxRQUFWLEVBQW9CO2tCQUFRLENBQU4sQ0FBRjtXQUF4QjtTQURBOztZQUlFLFNBQVMsR0FBRyxpQkFBSCxDQUFxQixRQUFyQixDQUFULENBUkM7WUFTRCxPQUFPLE1BQVAsRUFBZTtjQUNiLE1BQU0sUUFBUSxHQUFSLENBQVksR0FBWixFQUFpQixFQUFqQixDQUFvQixPQUFwQixFQUE2QixVQUFDLEdBQUQ7bUJBQVMsT0FBTyxHQUFQO1dBQVQsQ0FBbkMsQ0FEYTtjQUViLElBQUosQ0FBUyxNQUFULEVBRmlCO2tCQUdULElBQVIsRUFIaUI7U0FBbkIsTUFJTztpQkFDRSxJQUFQLEVBREs7U0FKUDtPQXJCSztLQWRULE1BMkNPO2VBQUE7S0EzQ1A7R0FEaUIsQ0FBbkIsQ0FEOEM7Q0FBOUI7O0FBbURsQixJQUFNLGFBQWEsU0FBYixVQUFhLENBQUMsUUFBRCxFQUFXLElBQVgsRUFBaUIsUUFBakIsRUFBNEM7TUFBakIsZ0VBQVUsa0JBQU87O01BQ3pELFNBQVMsVUFBVSxRQUFWLEVBQW9CLE9BQXBCLENBQVQsQ0FEeUQ7U0FFdEQsSUFBSUEsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO1FBQ2xDLElBQUosRUFBVTtVQUNKLEVBQUUsUUFBRixDQUFXLE9BQU8sSUFBUCxDQUFZLElBQVosQ0FBWCxFQUE4QixhQUE5QixDQUFKLEVBQWtEO1lBQzVDLFdBQVcsR0FBRyxZQUFILENBQWdCLFFBQWhCLEVBQTBCLE1BQTFCLENBQVgsQ0FENEM7ZUFFekMsWUFBUCxDQUFvQixLQUFLLEVBQUwsRUFBUztnQkFDckIsUUFBTjtTQURGLEVBRUcsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1dBQ2YsTUFBTSxNQUFOLEdBQWUsT0FBZixDQUFELENBQXlCLElBQXpCLEVBRGdCO1NBQWYsQ0FGSCxDQUZnRDtPQUFsRCxNQU9PLElBQUksS0FBSyxRQUFMLEVBQWU7WUFDcEIsV0FBVyxHQUFHLFlBQUgsQ0FBZ0IsUUFBaEIsRUFBMEIsTUFBMUIsQ0FBWCxDQURvQjtlQUVqQixpQkFBUCxDQUF5QixLQUFLLEVBQUwsRUFBUztnQkFDMUIsUUFBTjtTQURGLEVBRUcsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1dBQ2YsTUFBTSxNQUFOLEdBQWUsT0FBZixDQUFELENBQXlCLElBQXpCLEVBRGdCO1NBQWYsQ0FGSCxDQUZ3QjtPQUFuQixNQU9BO2dCQUNHLElBQVIsRUFESztPQVBBO0tBUlQsTUFrQk87aUJBQ00sUUFBWCxFQUFxQixRQUFyQixFQUErQixPQUEvQixFQUF3QyxJQUF4QyxDQUE2QyxPQUE3QyxFQUFzRCxNQUF0RCxFQURLO0tBbEJQO0dBRGlCLENBQW5CLENBRjZEO0NBQTVDOztBQTJCbkIsSUFBTSxhQUFhLFNBQWIsVUFBYSxDQUFDLFFBQUQsRUFBVyxRQUFYLEVBQXNDO01BQWpCLGdFQUFVLGtCQUFPOztNQUNuRCxTQUFTLFVBQVUsUUFBVixFQUFvQixPQUFwQixDQUFULENBRG1EO1NBRWhELElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtRQUNsQyxPQUFPLHdCQUF3QixRQUF4QixDQUFQLENBRGtDO1FBRWxDLE9BQU8sbUJBQW1CLFFBQW5CLENBQVAsQ0FGa0M7O1FBSWxDLEVBQUUsUUFBRixDQUFXLENBQUMsUUFBRCxFQUFXLFdBQVgsQ0FBWCxFQUFvQyxJQUFwQyxDQUFKLEVBQStDO2FBQ3RDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBMEIsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1NBQ3RDLE1BQU0sTUFBTixHQUFlLE9BQWYsQ0FBRCxDQUF5QixJQUF6QixFQUR1QztPQUFmLENBQTFCLENBRDZDO0tBQS9DLE1BSU87YUFDRSxpQkFBUCxDQUF5QixJQUF6QixFQUErQixVQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWU7U0FDM0MsTUFBTSxNQUFOLEdBQWUsT0FBZixDQUFELENBQXlCLElBQXpCLEVBRDRDO09BQWYsQ0FBL0IsQ0FESztLQUpQO0dBSmlCLENBQW5CLENBRnVEO0NBQXRDOztBQWtCbkIsSUFBTSxxQkFBcUIsU0FBckIsa0JBQXFCLENBQUMsUUFBRCxFQUE0QjtNQUFqQixnRUFBVSxrQkFBTzs7TUFDakQsT0FBTyx3QkFBd0IsUUFBeEIsQ0FBUCxDQURpRDtNQUVqRCxXQUFXLG9CQUFvQixRQUFwQixDQUFYLENBRmlEOztNQUlqRCxFQUFFLFFBQUYsQ0FBVyxDQUFDLFFBQUQsRUFBVyxXQUFYLENBQVgsRUFBb0MsSUFBcEMsQ0FBSixFQUErQztXQUN0QzthQUNFLEVBQUUsR0FBRixDQUFNLE9BQU4sRUFBZSxPQUFmLElBQTBCLFFBQVEsS0FBUixHQUFnQixrQkFBa0IsUUFBbEIsQ0FBMUM7aUJBQ0ksUUFBUSxXQUFSO29CQUNHLEVBQUUsR0FBRixDQUFNLE9BQU4sRUFBZSxjQUFmLElBQWlDLFFBQVEsWUFBUixHQUF1QixNQUF4RDtZQUNSLEdBQUcsWUFBSCxDQUFnQixRQUFoQixFQUEwQixNQUExQixDQUFOO2lCQUNXLEVBQUUsR0FBRixDQUFNLE9BQU4sRUFBZSxXQUFmLElBQThCLFFBQVEsU0FBUixHQUFvQixJQUFsRDtvQkFDRyxFQUFFLEdBQUYsQ0FBTSxPQUFOLEVBQWUsY0FBZixJQUFpQyxRQUFRLFlBQVIsR0FBdUIsSUFBeEQ7S0FOaEIsQ0FENkM7R0FBL0MsTUFTTztXQUNFO2dCQUNLLFFBQVY7WUFDTSxHQUFHLFlBQUgsQ0FBZ0IsUUFBaEIsRUFBMEIsTUFBMUIsQ0FBTjtLQUZGLENBREs7R0FUUDtDQUp5Qjs7QUFxQjNCLElBQU0sV0FBVyxTQUFYLFFBQVcsQ0FBQyxRQUFELEVBQVcsUUFBWCxFQUFzQztNQUFqQixnRUFBVSxrQkFBTzs7TUFDakQsVUFBVUQsUUFBTSxNQUFOLENBQWEsUUFBYixFQUF1QixPQUF2QixDQUFWLENBRGlEOztNQUdqRCxpQkFBaUIsY0FBYyxRQUFkLEVBQXdCLE9BQXhCLENBQWpCLENBSGlEOztTQUs5QyxJQUFJQyxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7YUFDN0IsY0FBVCxFQUF5QixRQUF6QixFQUFtQyxPQUFuQyxFQUE0QyxJQUE1QyxDQUFpRCxnQkFBUTtVQUNuRCxDQUFDLElBQUQsSUFBUyxPQUFPLElBQVAsS0FBZ0IsV0FBaEIsRUFBNkI7aUJBQUE7ZUFBQTtPQUExQzs7Y0FLUUMsWUFBVSxRQUFWLEVBQW9CLElBQXBCLEVBQTBCLFFBQTFCLEVBQW9DLE9BQXBDLENBQVIsRUFOdUQ7S0FBUixDQUFqRCxDQURzQztHQUFyQixDQUFuQixDQUxxRDtDQUF0Qzs7QUFpQmpCLElBQU0sV0FBVyxTQUFYLFFBQVcsQ0FBQyxRQUFELEVBQVcsUUFBWCxFQUFzQztNQUFqQixnRUFBVSxrQkFBTzs7TUFDakQsVUFBVUYsUUFBTSxNQUFOLENBQWEsUUFBYixFQUF1QixPQUF2QixDQUFWLENBRGlEO01BRWpELGlCQUFpQixjQUFjLFFBQWQsRUFBd0IsT0FBeEIsQ0FBakIsQ0FGaUQ7O1NBSTlDLElBQUlDLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjthQUM3QixjQUFULEVBQXlCLFFBQXpCLEVBQW1DLE9BQW5DLEVBQTRDLElBQTVDLENBQ0UsZ0JBQVE7VUFDRixDQUFDLElBQUQsSUFBUyxPQUFPLElBQVAsS0FBZ0IsV0FBaEIsRUFBNkI7ZUFDakMsT0FBTyxJQUFQLENBQVAsQ0FEd0M7T0FBMUM7Y0FHUSxXQUFXLFFBQVgsRUFBcUIsSUFBckIsRUFBMkIsUUFBM0IsRUFBcUMsT0FBckMsQ0FBUixFQUpNO0tBQVIsQ0FERixDQU9FLEtBUEYsQ0FPUSxVQUFDLEdBQUQsRUFBUztjQUFTLEdBQVIsQ0FBWSxHQUFaLEVBQUQsT0FBa0IsQ0FBUSxXQUFXLFFBQVgsRUFBcUIsU0FBckIsRUFBZ0MsUUFBaEMsRUFBMEMsT0FBMUMsQ0FBUixFQUFsQjtLQUFULENBUFIsQ0FEc0M7R0FBckIsQ0FBbkIsQ0FKcUQ7Q0FBdEM7O0FBZ0JqQixJQUFNLFVBQVUsU0FBVixPQUFVLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBc0M7TUFBakIsZ0VBQVUsa0JBQU87O1NBQzdDLElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtRQUNsQyxnQkFBSixDQURzQztRQUVsQyxnQkFBSixDQUZzQzs7UUFJbEMsU0FBUyxLQUFULENBQWUsR0FBZixFQUFvQixNQUFwQixHQUE2QixDQUE3QixFQUFnQzthQUMzQixvQkFBb0IsUUFBcEIsRUFBOEIsT0FBOUIsQ0FBUCxDQURrQzthQUUzQix3QkFBd0IsUUFBeEIsQ0FBUCxDQUZrQztLQUFwQyxNQUdPO2FBQ0UsUUFBUCxDQURLO2FBRUUscUJBQXFCLFFBQXJCLENBQVAsQ0FGSztLQUhQOztRQVFJLFlBQVksb0JBQW9CLElBQXBCLENBQVosQ0Faa0M7UUFhbEMsYUFBYUQsUUFBTSxNQUFOLENBQWEsUUFBYixFQUF1QixPQUF2QixDQUFiLENBYmtDO1FBY2xDLFlBQVksS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixTQUF0QixFQUFpQyxJQUFqQyxDQUFaLENBZGtDOztRQWdCbEMsZUFBZSxVQUFVLE9BQVYsQ0FBa0IsYUFBYSxHQUFiLEVBQWtCLEVBQXBDLENBQWYsQ0FoQmtDOztRQWtCbEMsVUFBVSxVQUFWLENBQXFCLFlBQXJCLEVBQW1DLE9BQW5DLENBQUosRUFBaUQ7YUFDeEMsRUFBQyxNQUFNLFFBQU4sRUFBZ0IsU0FBUyxzQkFBVCxFQUF4QixFQUQrQztLQUFqRCxNQUVPLElBQUksT0FBTyxVQUFVLFNBQVYsQ0FBb0IsWUFBcEIsRUFBa0MsRUFBbEMsQ0FBUCxJQUFnRCxXQUFoRCxFQUE2RDtpQkFDM0QsUUFBWCxFQUFxQixZQUFyQixFQUFtQyxPQUFuQyxFQUE0QyxJQUE1QyxDQUFpRCxPQUFqRCxFQURzRTtLQUFqRSxNQUVBO2FBQ0UsRUFBQyxNQUFNLFFBQU4sRUFBZ0IsU0FBUyx3QkFBVCxFQUF4QixFQURLO0tBRkE7R0FwQlUsQ0FBbkIsQ0FEb0Q7Q0FBdEM7O0FBNkJoQixJQUFNRyxlQUFhLFNBQWIsVUFBYSxDQUFDLFFBQUQsRUFBVyxRQUFYLEVBQXFCLE9BQXJCLEVBQWlDO01BQzlDLFNBQVMsVUFBVSxRQUFWLEVBQW9CLE9BQXBCLENBQVQsQ0FEOEM7U0FFM0MsSUFBSUYsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO1FBQ2xDLE9BQU8sd0JBQXdCLFFBQXhCLENBQVAsQ0FEa0M7YUFFN0IsUUFBVCxFQUFtQixRQUFuQixFQUE2QixPQUE3QixFQUFzQyxJQUF0QyxDQUEyQyxnQkFBUTtVQUM3QyxFQUFFLFFBQUYsQ0FBVyxDQUFDLFFBQUQsRUFBVyxXQUFYLENBQVgsRUFBb0MsSUFBcEMsQ0FBSixFQUErQztlQUN0QyxZQUFQLENBQW9CLEtBQUssRUFBTCxFQUFTLFVBQUMsR0FBRCxFQUFNLElBQU4sRUFBZTtXQUN6QyxNQUFNLE1BQU4sR0FBZSxPQUFmLENBQUQsQ0FBeUIsSUFBekIsRUFEMEM7U0FBZixDQUE3QixDQUQ2QztPQUEvQyxNQUlPO2VBQ0UsaUJBQVAsQ0FBeUIsS0FBSyxFQUFMLEVBQVMsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1dBQzlDLE1BQU0sTUFBTixHQUFlLE9BQWYsQ0FBRCxDQUF5QixJQUF6QixFQUQrQztTQUFmLENBQWxDLENBREs7T0FKUDtLQUR5QyxDQUEzQyxDQUZzQztHQUFyQixDQUFuQixDQUZrRDtDQUFqQzs7QUFrQm5CLElBQU0sYUFBYSxTQUFiLFVBQWEsQ0FBQyxRQUFELEVBQVcsUUFBWCxFQUFzQztNQUFqQixnRUFBVSxrQkFBTzs7U0FDaEQsSUFBSUEsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO1FBQ2xDLGdCQUFKLENBRHNDO1FBRWxDLGdCQUFKLENBRnNDOztRQUlsQyxTQUFTLEtBQVQsQ0FBZSxHQUFmLEVBQW9CLE1BQXBCLEdBQTZCLENBQTdCLEVBQWdDO2FBQzNCLG9CQUFvQixRQUFwQixFQUE4QixPQUE5QixDQUFQLENBRGtDO2FBRTNCLHdCQUF3QixRQUF4QixDQUFQLENBRmtDO0tBQXBDLE1BR087YUFDRSxRQUFQLENBREs7YUFFRSxxQkFBcUIsUUFBckIsQ0FBUCxDQUZLO0tBSFA7O1FBUUksWUFBWSxvQkFBb0IsSUFBcEIsQ0FBWixDQVprQztRQWFsQyxhQUFhRCxRQUFNLE1BQU4sQ0FBYSxRQUFiLEVBQXVCLE9BQXZCLENBQWIsQ0Fia0M7UUFjbEMsWUFBWSxLQUFLLElBQUwsQ0FBVSxVQUFWLEVBQXNCLFNBQXRCLEVBQWlDLElBQWpDLENBQVosQ0Fka0M7O1FBZ0JsQyxlQUFlLFVBQVUsT0FBVixDQUFrQixhQUFhLEdBQWIsRUFBa0IsRUFBcEMsQ0FBZixDQWhCa0M7O1FBa0JsQyxVQUFVLFVBQVYsQ0FBcUIsU0FBckIsRUFBZ0MsT0FBaEMsQ0FBSixFQUE4QztVQUN4QyxPQUFPLFVBQVUsVUFBVixDQUFxQixZQUFyQixDQUFQLElBQTZDLFdBQTdDLEVBQTBEO3FCQUNqRCxRQUFYLEVBQXFCLFlBQXJCLEVBQW1DLE9BQW5DLEVBQTRDLElBQTVDLENBQWlELE9BQWpELEVBRDREO09BQTlELE1BRU87ZUFDRSxFQUFDLE1BQU0sUUFBTixFQUFnQixTQUFTLHdCQUFULEVBQXhCLEVBREs7T0FGUDtLQURGO0dBbEJpQixDQUFuQixDQUR1RDtDQUF0Qzs7QUE2Qm5CLGNBQWU7c0JBQUE7c0NBQUE7NEJBQUE7NEJBQUE7b0JBQUE7b0JBQUE7b0JBQUE7d0JBQUE7a0JBQUE7d0JBQUE7Q0FBZjs7V0NwYmU7c0JBQUE7Z0JBQUE7Z0JBQUE7a0JBQUE7a0JBQUE7Q0FBZjs7In0=