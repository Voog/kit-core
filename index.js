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

var version = "0.2.0";

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInBhY2thZ2UuanNvbiIsInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2N1c3RvbV9lcnJvci5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvc2l0ZXMuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9jb3JlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwia2l0LWNvcmVcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4yLjBcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYWxsXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3RcIixcbiAgICBcInByZWJ1aWxkXCI6IFwiZWNobyBSZWJ1aWxkaW5nIC4vaW5kZXguanNcIixcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtY1wiLFxuICAgIFwicG9zdGJ1aWxkXCI6IFwiZWNobyBgZWNobyBSZWJ1aWx0IC4vaW5kZXguanMgJChkYXRlICtcXFwiWyVIOiVNOiVTXVxcXCIpYCAmJiB0b3VjaCAuLi9raXQtY2xpL3NyYy9raXQuanNcIixcbiAgICBcInByZXRlc3RcIjogXCJlY2hvIFJ1bm5pbmcgdGVzdHNcIixcbiAgICBcInRlc3RcIjogXCJtb2NoYSAuL3Rlc3QvdGVzdC5qcyB8fCB0cnVlXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGFsbCcgLi9zcmMgLi90ZXN0XCIsXG4gICAgXCJ3YXRjaDpidWlsZFwiOiBcIndhdGNoICducG0tcnVuLWFsbCBidWlsZCB0ZXN0JyAuL3NyY1wiLFxuICAgIFwid2F0Y2g6dGVzdFwiOiBcIndhdGNoICducG0gcnVuIHRlc3QnIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcImdpdCtodHRwczovL2dpdGh1Yi5jb20vVm9vZy92b29nLmpzLmdpdFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJhYmVsLWNsaVwiOiBcIl42LjUuMVwiLFxuICAgIFwiYmFiZWwtcHJlc2V0LWVzMjAxNS1yb2xsdXBcIjogXCJeMS4xLjFcIixcbiAgICBcImNoYWlcIjogXCJeMy41LjBcIixcbiAgICBcImNoYWktYXMtcHJvbWlzZWRcIjogXCJeNS4zLjBcIixcbiAgICBcIm1vY2hhXCI6IFwiXjIuNC41XCIsXG4gICAgXCJtb2NoYS1zaW5vblwiOiBcIl4xLjEuNVwiLFxuICAgIFwibm9ja1wiOiBcIl44LjAuMFwiLFxuICAgIFwicm9sbHVwXCI6IFwiXjAuMjUuNFwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1iYWJlbFwiOiBcIl4yLjMuOVwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1qc29uXCI6IFwiXjIuMC4wXCIsXG4gICAgXCJzaW5vblwiOiBcIl4xLjE3LjNcIixcbiAgICBcInNpbm9uLWNoYWlcIjogXCJeMi44LjBcIixcbiAgICBcIndhdGNoXCI6IFwiXjAuMTcuMVwiXG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBsaXN0RmlsZXMgPSAoZm9sZGVyUGF0aCkgPT4ge1xuICByZXR1cm4gZnMucmVhZGRpclN5bmMoZm9sZGVyUGF0aCkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgaXRlbVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgaXRlbSk7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGl0ZW1QYXRoKS5pc0ZpbGUoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBsaXN0Rm9sZGVycyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRGlyZWN0b3J5KCk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0RmlsZUNvbnRlbnRzID0gKGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBmaWxlRXhpc3RzID0gKGZpbGVQYXRoKSA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuY29uc3QgZGVsZXRlRmlsZSA9IChmaWxlUGF0aCkgPT4ge1xuICByZXR1cm4gZnMudW5saW5rU3luYyhmaWxlUGF0aCk7XG59O1xuXG5jb25zdCB3cml0ZUZpbGUgPSAoZmlsZVBhdGgsIGRhdGEpID0+IHtcbiAgcmV0dXJuIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsIGRhdGEpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBsaXN0RmlsZXMsXG4gIGxpc3RGb2xkZXJzLFxuICBkZWxldGVGaWxlLFxuICB3cml0ZUZpbGUsXG4gIGN3ZDogcHJvY2Vzcy5jd2QsXG4gIGdldEZpbGVDb250ZW50cyxcbiAgZmlsZUV4aXN0c1xufTtcbiIsIi8vIFRha2VuIGZyb20gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vanVzdG1vb24vMTU1MTFmOTJlNTIxNmZhMjYyNGJcbmltcG9ydCB7IGluaGVyaXRzIH0gZnJvbSAndXRpbCc7XG5cbid1c2Ugc3RyaWN0JztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQ3VzdG9tRXJyb3IobWVzc2FnZSwgZXh0cmEpIHtcbiAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gIHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgdGhpcy5leHRyYSA9IGV4dHJhO1xufTtcblxuaW5oZXJpdHMoQ3VzdG9tRXJyb3IsIEVycm9yKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBDdXN0b21FcnJvciBmcm9tICcuL2N1c3RvbV9lcnJvcic7XG5cbmNvbnN0IENPTkZJR19GSUxFTkFNRSA9ICcudm9vZyc7XG5cbmNvbnN0IEhPTUVESVIgPSBwcm9jZXNzLmVudlsocHJvY2Vzcy5wbGF0Zm9ybSA9PSAnd2luMzInKSA/ICdVU0VSUFJPRklMRScgOiAnSE9NRSddO1xuY29uc3QgTE9DQUxESVIgPSBwcm9jZXNzLmN3ZCgpO1xuXG5jb25zdCBMT0NBTF9DT05GSUcgPSBwYXRoLmpvaW4oTE9DQUxESVIsIENPTkZJR19GSUxFTkFNRSk7XG5jb25zdCBHTE9CQUxfQ09ORklHID0gcGF0aC5qb2luKEhPTUVESVIsIENPTkZJR19GSUxFTkFNRSk7XG5cbmNvbnN0IGZpbmRMb2NhbENvbmZpZyA9ICgpID0+IHtcbiAgaWYgKGZpbGVFeGlzdHMocGF0aC5qb2luKHBhdGgucmVzb2x2ZShMT0NBTERJUiwgJy4uJyksIENPTkZJR19GSUxFTkFNRSkpKSB7XG4gICAgcmV0dXJuIHBhdGguam9pbihwYXRoLnJlc29sdmUoTE9DQUxESVIsICcuLicpLCBDT05GSUdfRklMRU5BTUUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBMT0NBTF9DT05GSUc7XG4gIH1cbn07XG5cbmNvbnN0IHNpdGVCeU5hbWUgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBzaXRlcyhvcHRpb25zKS5maWx0ZXIocCA9PiBwLm5hbWUgPT09IG5hbWUgfHwgcC5ob3N0ID09PSBuYW1lKVswXTtcbn07XG5cbmNvbnN0IHNpdGVzID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gcmVhZCgnc2l0ZXMnLCBvcHRpb25zKSB8fCBbXTtcbn07XG5cbmNvbnN0IHdyaXRlID0gKGtleSwgdmFsdWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgZmlsZVBhdGggPSBwYXRoRnJvbU9wdGlvbnMob3B0aW9ucyk7XG5cbiAgaWYgKCFjb25maWdFeGlzdHMoZmlsZVBhdGgpKSB7XG4gICAgY3JlYXRlKG9wdGlvbnMpO1xuICB9XG5cbiAgbGV0IGNvbmZpZyA9IHJlYWQobnVsbCwgb3B0aW9ucykgfHwge307XG4gIGNvbmZpZ1trZXldID0gdmFsdWU7XG5cbiAgbGV0IGZpbGVDb250ZW50cyA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMik7XG5cbiAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZmlsZUNvbnRlbnRzKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5jb25zdCByZWFkID0gKGtleSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBmaWxlUGF0aCA9IHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAoIWNvbmZpZ0V4aXN0cyhvcHRpb25zKSkge1xuICAgIGlmIChmaWxlUGF0aCA9PT0gTE9DQUxfQ09ORklHICYmIGNvbmZpZ0V4aXN0cyhPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7fSkpKSB7XG4gICAgICBmaWxlUGF0aCA9IEdMT0JBTF9DT05GSUc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBDdXN0b21FcnJvcignQ29uZmlndXJhdGlvbiBmaWxlIG5vdCBmb3VuZCEnKTtcbiAgICB9XG4gIH1cblxuICBsZXQgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgbGV0IHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuXG4gIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBwYXJzZWREYXRhW2tleV07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhcnNlZERhdGE7XG4gIH1cbn07XG5cbmNvbnN0IGNyZWF0ZSA9IChvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGZpbGVQYXRoID0gcGF0aEZyb21PcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmICghY29uZmlnRXhpc3RzKG9wdGlvbnMpKSB7XG4gICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgJ3t9Jyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBwYXRoRnJvbU9wdGlvbnMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICgoXy5oYXMob3B0aW9ucywgJ2dsb2JhbCcpICYmIG9wdGlvbnMuZ2xvYmFsID09PSB0cnVlKSkge1xuICAgIHJldHVybiBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2UgaWYgKF8uaGFzKG9wdGlvbnMsICdsb2NhbCcpICYmIG9wdGlvbnMubG9jYWwgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZmluZExvY2FsQ29uZmlnKCk7XG4gIH0gZWxzZSBpZiAoXy5oYXMob3B0aW9ucywgJ2NvbmZpZ1BhdGgnKSB8fCBfLmhhcyhvcHRpb25zLCAnY29uZmlnX3BhdGgnKSkge1xuICAgIHJldHVybiBvcHRpb25zLmNvbmZpZ1BhdGggfHwgb3B0aW9ucy5jb25maWdfcGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmluZExvY2FsQ29uZmlnKCk7XG4gIH1cbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSAoZmlsZVBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBjb25maWdFeGlzdHMgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBmaWxlRXhpc3RzKHBhdGhGcm9tT3B0aW9ucyhvcHRpb25zKSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHNpdGVCeU5hbWUsXG4gIHNpdGVzLFxuICB3cml0ZSxcbiAgcmVhZCxcbiAgY3JlYXRlLFxuICBwYXRoRnJvbU9wdGlvbnMsXG4gIGNvbmZpZ0V4aXN0c1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IG1pbWUgZnJvbSAnbWltZS10eXBlL3dpdGgtZGInO1xuXG5taW1lLmRlZmluZSgnYXBwbGljYXRpb24vdm5kLnZvb2cuZGVzaWduLmN1c3RvbStsaXF1aWQnLCB7ZXh0ZW5zaW9uczogWyd0cGwnXX0sIG1pbWUuZHVwT3ZlcndyaXRlKTtcblxuY29uc3QgYnlOYW1lID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gY29uZmlnLnNpdGVCeU5hbWUobmFtZSwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBhZGQgPSAoZGF0YSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmIChfLmhhcyhkYXRhLCAnaG9zdCcpICYmIF8uaGFzKGRhdGEsICd0b2tlbicpKSB7XG4gICAgbGV0IHNpdGVzID0gY29uZmlnLnNpdGVzKG9wdGlvbnMpO1xuICAgIHNpdGVzLnB1c2goZGF0YSk7XG4gICAgY29uZmlnLndyaXRlKCdzaXRlcycsIHNpdGVzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IHJlbW92ZSA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVzSW5Db25maWcgPSBjb25maWcuc2l0ZXMob3B0aW9ucyk7XG4gIGxldCBzaXRlTmFtZXMgPSBzaXRlc0luQ29uZmlnLm1hcChzaXRlID0+IHNpdGUubmFtZSB8fCBzaXRlLmhvc3QpO1xuICBsZXQgaWR4ID0gc2l0ZU5hbWVzLmluZGV4T2YobmFtZSk7XG4gIGlmIChpZHggPCAwKSB7IHJldHVybiBmYWxzZTsgfVxuICBsZXQgZmluYWxTaXRlcyA9IHNpdGVzSW5Db25maWdcbiAgICAuc2xpY2UoMCwgaWR4KVxuICAgIC5jb25jYXQoc2l0ZXNJbkNvbmZpZy5zbGljZShpZHggKyAxKSk7XG5cbiAgcmV0dXJuIGNvbmZpZy53cml0ZSgnc2l0ZXMnLCBmaW5hbFNpdGVzLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGdldEZpbGVJbmZvID0gKGZpbGVQYXRoKSA9PiB7XG4gIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZVBhdGgpO1xuXG4gIGlmIChzdGF0LmlzRmlsZSgpKSB7XG4gICAgbGV0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZpbGU6IGZpbGVOYW1lLFxuICAgICAgc2l6ZTogc3RhdC5zaXplLFxuICAgICAgY29udGVudFR5cGU6IG1pbWUubG9va3VwKGZpbGVOYW1lKSxcbiAgICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgICAgdXBkYXRlZEF0OiBzdGF0Lm10aW1lXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbmNvbnN0IHRvdGFsRmlsZXNGb3IgPSAoc2l0ZU5hbWUpID0+IHtcbiAgbGV0IGZpbGVzID0gZmlsZXNGb3Ioc2l0ZU5hbWUpO1xuICByZXR1cm4gT2JqZWN0LmtleXMoZmlsZXMpLnJlZHVjZSgodG90YWwsIGZvbGRlcikgPT4gdG90YWwgKyBmaWxlc1tmb2xkZXJdLmxlbmd0aCwgMCk7XG59O1xuXG5jb25zdCBmaWxlc0ZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBmb2xkZXJzID0gW1xuICAgICdhc3NldHMnLCAnY29tcG9uZW50cycsICdpbWFnZXMnLCAnamF2YXNjcmlwdHMnLCAnbGF5b3V0cycsICdzdHlsZXNoZWV0cydcbiAgXTtcblxuICBsZXQgd29ya2luZ0RpciA9IGRpckZvcihuYW1lKTtcblxuICBsZXQgcm9vdCA9IGZpbGVVdGlscy5saXN0Rm9sZGVycyh3b3JraW5nRGlyKTtcblxuICBpZiAocm9vdCkge1xuICAgIHJldHVybiBmb2xkZXJzLnJlZHVjZSgoc3RydWN0dXJlLCBmb2xkZXIpID0+IHtcbiAgICAgIGlmIChyb290LmluZGV4T2YoZm9sZGVyKSA+PSAwKSB7XG4gICAgICAgIGxldCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHdvcmtpbmdEaXIsIGZvbGRlcik7XG4gICAgICAgIHN0cnVjdHVyZVtmb2xkZXJdID0gZmlsZVV0aWxzLmxpc3RGaWxlcyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlKTtcbiAgICAgICAgICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcblxuICAgICAgICAgIHJldHVybiBzdGF0LmlzRmlsZSgpO1xuICAgICAgICB9KS5tYXAoZmlsZSA9PiB7XG4gICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGUpO1xuXG4gICAgICAgICAgcmV0dXJuIGdldEZpbGVJbmZvKGZ1bGxQYXRoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RydWN0dXJlO1xuICAgIH0sIHt9KTtcbiAgfVxufTtcblxuY29uc3QgZGlyRm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTs7XG4gIGlmIChvcHRpb25zLmRpciB8fCBvcHRpb25zLnBhdGgpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5kaXIgfHwgb3B0aW9ucy5wYXRoO1xuICB9IGVsc2UgaWYgKHNpdGUpIHtcbiAgICByZXR1cm4gc2l0ZS5kaXIgfHwgc2l0ZS5wYXRoO1xuICB9XG59O1xuXG5jb25zdCBob3N0Rm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbiAgaWYgKG9wdGlvbnMuaG9zdCkge1xuICAgIHJldHVybiBvcHRpb25zLmhvc3Q7XG4gIH0gZWxzZSBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLmhvc3Q7XG4gIH1cbn07XG5cbmNvbnN0IHRva2VuRm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgc2l0ZSA9IGJ5TmFtZShuYW1lLCBvcHRpb25zKTtcbiAgaWYgKG9wdGlvbnMudG9rZW4gfHwgb3B0aW9ucy5hcGlfdG9rZW4pIHtcbiAgICByZXR1cm4gb3B0aW9ucy50b2tlbiB8fCBvcHRpb25zLmFwaV90b2tlbjtcbiAgfSBlbHNlIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUudG9rZW4gfHwgc2l0ZS5hcGlfdG9rZW47XG4gIH1cbn07XG5cbmNvbnN0IG5hbWVzID0gKG9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlcyhvcHRpb25zKS5tYXAoc2l0ZSA9PiBzaXRlLm5hbWUgfHwgc2l0ZS5ob3N0KTtcbn07XG5cbmNvbnN0IGhvc3RzID0gKG9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlcyhvcHRpb25zKS5tYXAoc2l0ZSA9PiBzaXRlLmhvc3QpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBieU5hbWUsXG4gIGFkZCxcbiAgcmVtb3ZlLFxuICB0b3RhbEZpbGVzRm9yLFxuICBmaWxlc0ZvcixcbiAgZGlyRm9yLFxuICBob3N0Rm9yLFxuICB0b2tlbkZvcixcbiAgbmFtZXMsXG4gIGhvc3RzLFxuICBnZXRGaWxlSW5mb1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHNpdGVzIGZyb20gJy4vc2l0ZXMnO1xuaW1wb3J0IFZvb2cgZnJvbSAndm9vZyc7XG5pbXBvcnQgZmlsZVV0aWxzIGZyb20gJy4vZmlsZV91dGlscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1Byb21pc2V9IGZyb20gJ2JsdWViaXJkJztcblxuY29uc3QgY2xpZW50Rm9yID0gKG5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBsZXQgaG9zdCA9IHNpdGVzLmhvc3RGb3IobmFtZSwgb3B0aW9ucyk7XG4gIGxldCB0b2tlbiA9IHNpdGVzLnRva2VuRm9yKG5hbWUsIG9wdGlvbnMpO1xuXG4gIGlmIChob3N0ICYmIHRva2VuKSB7XG4gICAgcmV0dXJuIG5ldyBWb29nKGhvc3QsIHRva2VuKTtcbiAgfVxufTtcblxuY29uc3QgZ2V0VG90YWxGaWxlQ291bnQgPSAobmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgUHJvbWlzZS5hbGwoW2dldExheW91dHMobmFtZSwgb3B0aW9ucyksIGdldExheW91dEFzc2V0cyhuYW1lLCBvcHRpb25zKV0pLnRoZW4oKFtsYXlvdXRzLCBhc3NldHNdKSA9PiB7XG4gICAgICByZXNvbHZlKGxheW91dHMubGVuZ3RoICsgYXNzZXRzLmxlbmd0aCk7XG4gICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRDb250ZW50cyA9IChzaXRlTmFtZSwgaWQsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgcmVzb2x2ZShkYXRhLmJvZHkpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dEFzc2V0Q29udGVudHMgPSAoc2l0ZU5hbWUsIGlkLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpLmxheW91dEFzc2V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgaWYgKGRhdGEuZWRpdGFibGUpIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLmRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhLnB1YmxpY191cmwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IGdldExheW91dHMgPSAoc2l0ZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucylcbiAgICAgIC5sYXlvdXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpXG4gICAgICAubGF5b3V0QXNzZXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0aW9ucyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEFsbEZpbGVzID0gKHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgc2l0ZURpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHNpdGVOYW1lLCBvcHRpb25zKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhzaXRlTmFtZSwgb3B0aW9ucylcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShzaXRlTmFtZSwgZmlsZVBhdGgsIG9wdGlvbnMpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oc2l0ZURpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVzaEZpbGUoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gIH0pO1xufTtcblxuY29uc3QgZmluZExheW91dE9yQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBjb21wb25lbnQsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IG5hbWUgPSBub3JtYWxpemVUaXRsZShnZXRMYXlvdXROYW1lRnJvbUZpbGVuYW1lKGZpbGVOYW1lKSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0cyh7XG4gICAgICBwZXJfcGFnZTogMjUwLFxuICAgICAgJ3EubGF5b3V0LmNvbXBvbmVudCc6IGNvbXBvbmVudCB8fCBmYWxzZVxuICAgIH0sIChlcnIsIGRhdGEgPSBbXSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKTsgfVxuICAgICAgbGV0IHJldCA9IGRhdGEuZmlsdGVyKGwgPT4gbm9ybWFsaXplVGl0bGUobC50aXRsZSkgPT0gbmFtZSk7XG4gICAgICBpZiAocmV0Lmxlbmd0aCA9PT0gMCkgeyByZWplY3QodW5kZWZpbmVkKTsgfVxuICAgICAgcmVzb2x2ZShfLmhlYWQocmV0KSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZmluZExheW91dEFzc2V0ID0gKGZpbGVOYW1lLCBzaXRlTmFtZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucykubGF5b3V0QXNzZXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXRfYXNzZXQuZmlsZW5hbWUnOiBmaWxlTmFtZVxuICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycik7IH1cbiAgICAgIHJlc29sdmUoXy5oZWFkKGRhdGEpKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlTmFtZUZyb21QYXRoID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmaWxlUGF0aC5zcGxpdCgnLycpWzFdO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0TmFtZUZyb21GaWxlbmFtZSA9IChmaWxlTmFtZSkgPT4ge1xuICByZXR1cm4gXy5oZWFkKGZpbGVOYW1lLnNwbGl0KCcuJykpO1xufTtcblxuY29uc3QgZmluZEZpbGUgPSAoZmlsZVBhdGgsIHNpdGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlUGF0aCk7XG4gIGxldCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZVBhdGgpO1xuXG4gIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgIHJldHVybiBmaW5kTGF5b3V0T3JDb21wb25lbnQoZmlsZU5hbWUsICh0eXBlID09ICdjb21wb25lbnQnKSwgc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmaW5kTGF5b3V0QXNzZXQoZmlsZU5hbWUsIHNpdGVOYW1lLCBvcHRpb25zKTtcbiAgfVxufTtcblxuY29uc3QgdGl0bGVGcm9tRmlsZW5hbWUgPSAoZmlsZU5hbWUpID0+IHtcbiAgcmV0dXJuIF8uaGVhZChmaWxlTmFtZS5zcGxpdCgnLicpKS5yZXBsYWNlKC9fLywgJyAnKTtcbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVRpdGxlID0gKHRpdGxlKSA9PiB7XG4gIHJldHVybiB0aXRsZS5yZXBsYWNlKC9bXlxcd1xcLVxcLl0vZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xufTtcblxuY29uc3QgZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGggPSAocGF0aCkgPT4ge1xuICBsZXQgZm9sZGVyID0gcGF0aC5zcGxpdCgnLycpWzBdO1xuICBsZXQgZm9sZGVyVG9UeXBlTWFwID0ge1xuICAgICdsYXlvdXRzJzogJ2xheW91dCcsXG4gICAgJ2NvbXBvbmVudHMnOiAnY29tcG9uZW50JyxcbiAgICAnYXNzZXRzJzogJ2Fzc2V0JyxcbiAgICAnaW1hZ2VzJzogJ2ltYWdlJyxcbiAgICAnamF2YXNjcmlwdHMnOiAnamF2YXNjcmlwdCcsXG4gICAgJ3N0eWxlc2hlZXRzJzogJ3N0eWxlc2hlZXQnXG4gIH07XG5cbiAgcmV0dXJuIGZvbGRlclRvVHlwZU1hcFtmb2xkZXJdO1xufTtcblxuY29uc3QgZ2V0VHlwZUZyb21FeHRlbnNpb24gPSAoZmlsZU5hbWUpID0+IHtcbiAgaWYgKGZpbGVOYW1lLnNwbGl0KCcuJykubGVuZ3RoID4gMSkge1xuICAgIGxldCBleHRlbnNpb24gPSBfLmxhc3QoZmlsZU5hbWUuc3BsaXQoJy4nKSk7XG5cbiAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgIGNhc2UgJ2pzJzpcbiAgICAgIHJldHVybiAnamF2YXNjcmlwdCc7XG4gICAgY2FzZSAnY3NzJzpcbiAgICAgIHJldHVybiAnc3R5bGVzaGVldCc7XG4gICAgY2FzZSAnanBnJzpcbiAgICBjYXNlICdwbmcnOlxuICAgIGNhc2UgJ2pwZWcnOlxuICAgIGNhc2UgJ2dpZic6XG4gICAgICByZXR1cm4gJ2ltYWdlJztcbiAgICBjYXNlICd0cGwnOlxuICAgICAgcmV0dXJuICdsYXlvdXQnO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJ2Fzc2V0JztcbiAgICB9XG4gIH1cbn07XG5cbmNvbnN0IGdldFN1YmZvbGRlckZvclR5cGUgPSAodHlwZSkgPT4ge1xuICByZXR1cm4ge1xuICAgICdhc3NldCc6ICdhc3NldHMnLFxuICAgICdpbWFnZSc6ICdpbWFnZXMnLFxuICAgICdqYXZhc2NyaXB0JzogJ2phdmFzY3JpcHRzJyxcbiAgICAnc3R5bGVzaGVldCc6ICdzdHlsZXNoZWV0cycsXG4gICAgJ2NvbXBvbmVudCc6ICdjb21wb25lbnRzJyxcbiAgICAnbGF5b3V0JzogJ2xheW91dHMnXG4gIH1bdHlwZV07XG59O1xuXG5jb25zdCBub3JtYWxpemVQYXRoID0gKHBhdGgsIHNpdGVEaXIpID0+IHtcbiAgcmV0dXJuIHBhdGhcbiAgICAucmVwbGFjZShzaXRlRGlyLCAnJylcbiAgICAucmVwbGFjZSgvXlxcLy8sICcnKTtcbn07XG5cbmNvbnN0IHdyaXRlRmlsZSA9IChzaXRlTmFtZSwgZmlsZSwgZGVzdFBhdGgpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBpZiAoXy5pbmNsdWRlcyhPYmplY3Qua2V5cyhmaWxlKSwgJ2xheW91dF9uYW1lJykpIHtcbiAgICAgIGdldExheW91dENvbnRlbnRzKHNpdGVOYW1lLCBmaWxlLmlkKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGU7IH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGZpbGUuZWRpdGFibGUpIHtcbiAgICAgIGdldExheW91dEFzc2V0Q29udGVudHMoc2l0ZU5hbWUsIGZpbGUuaWQpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgIT0gJ0VFWElTVCcpIHsgdGhyb3cgZTsgfVxuICAgICAgICB9XG4gICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpOyB9XG4gICAgICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHVybCA9IGZpbGUucHVibGljX3VybDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlOyB9XG4gICAgICB9XG5cbiAgICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0UGF0aCk7XG4gICAgICBpZiAodXJsICYmIHN0cmVhbSkge1xuICAgICAgICBsZXQgcmVxID0gcmVxdWVzdC5nZXQodXJsKS5vbignZXJyb3InLCAoZXJyKSA9PiByZWplY3QoZXJyKSk7XG4gICAgICAgIHJlcS5waXBlKHN0cmVhbSk7XG4gICAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWplY3QobnVsbCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IHVwbG9hZEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKE9iamVjdC5rZXlzKGZpbGUpLCAnbGF5b3V0X25hbWUnKSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXQoZmlsZS5pZCwge1xuICAgICAgICAgIGJvZHk6IGNvbnRlbnRzXG4gICAgICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGxldCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dEFzc2V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBkYXRhOiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgKGVyciA/IHJlamVjdCA6IHJlc29sdmUpKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoe2ZhaWxlZDogdHJ1ZSwgZmlsZTogZmlsZVBhdGgsIG1lc3NhZ2U6ICdVbmFibGUgdG8gdXBkYXRlIGZpbGUhJ30pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjcmVhdGVGaWxlKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucykudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBjcmVhdGVGaWxlID0gKHNpdGVOYW1lLCBmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCBjbGllbnQgPSBjbGllbnRGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICAgIGxldCBmaWxlID0gZmlsZU9iamVjdEZyb21QYXRoKGZpbGVQYXRoKTtcblxuICAgIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgICAgY2xpZW50LmNyZWF0ZUxheW91dChmaWxlLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNsaWVudC5jcmVhdGVMYXlvdXRBc3NldChmaWxlLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGUsIG1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIGZpbGUhJ30pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGZpbGVPYmplY3RGcm9tUGF0aCA9IChmaWxlUGF0aCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICBsZXQgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVQYXRoKTtcblxuICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6IF8uaGFzKG9wdGlvbnMsICd0aXRsZScpID8gb3B0aW9ucy50aXRsZSA6IHRpdGxlRnJvbUZpbGVuYW1lKGZpbGVOYW1lKSxcbiAgICAgIGNvbXBvbmVudDogdHlwZSA9PSAnY29tcG9uZW50JyxcbiAgICAgIGNvbnRlbnRfdHlwZTogXy5oYXMob3B0aW9ucywgJ2NvbnRlbnRfdHlwZScpID8gb3B0aW9ucy5jb250ZW50X3R5cGUgOiAncGFnZScsXG4gICAgICBib2R5OiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4JyksXG4gICAgICBwYXJlbnRfaWQ6IF8uaGFzKG9wdGlvbnMsICdwYXJlbnRfaWQnKSA/IG9wdGlvbnMucGFyZW50X2lkIDogbnVsbCxcbiAgICAgIHBhcmVudF90aXRsZTogXy5oYXMob3B0aW9ucywgJ3BhcmVudF90aXRsZScpID8gb3B0aW9ucy5wYXJlbnRfdGl0bGUgOiBudWxsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgZmlsZW5hbWU6IGZpbGVOYW1lLFxuICAgICAgZGF0YTogZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpXG4gICAgfTtcbiAgfVxufTtcblxuY29uc3QgcHVsbEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlUGF0aCwgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJ30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSh3cml0ZUZpbGUoc2l0ZU5hbWUsIGZpbGUsIGZpbGVQYXRoLCBvcHRpb25zKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVQYXRoLCBvcHRpb25zID0ge30pID0+IHtcbiAgbGV0IHNpdGVEaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBzaXRlRGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlUGF0aCwgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJ30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSh1cGxvYWRGaWxlKHNpdGVOYW1lLCBmaWxlLCBmaWxlUGF0aCwgb3B0aW9ucykpO1xuICAgICAgfVxuXG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgYWRkRmlsZSA9IChzaXRlTmFtZSwgZmlsZU5hbWUsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBmaWxlO1xuICAgIGxldCB0eXBlO1xuXG4gICAgaWYgKGZpbGVOYW1lLnNwbGl0KCcvJykubGVuZ3RoID4gMSkge1xuICAgICAgZmlsZSA9IGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZU5hbWUsIG9wdGlvbnMpO1xuICAgICAgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZSA9IGZpbGVOYW1lO1xuICAgICAgdHlwZSA9IGdldFR5cGVGcm9tRXh0ZW5zaW9uKGZpbGVOYW1lKTtcbiAgICB9XG5cbiAgICBsZXQgc3ViRm9sZGVyID0gZ2V0U3ViZm9sZGVyRm9yVHlwZSh0eXBlKTtcbiAgICBsZXQgcHJvamVjdERpciA9IHNpdGVzLmRpckZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG4gICAgbGV0IGZpbmFsUGF0aCA9IHBhdGguam9pbihwcm9qZWN0RGlyLCBzdWJGb2xkZXIsIGZpbGUpO1xuXG4gICAgbGV0IHJlbGF0aXZlUGF0aCA9IGZpbmFsUGF0aC5yZXBsYWNlKHByb2plY3REaXIgKyAnLycsICcnKTtcblxuICAgIGlmIChmaWxlVXRpbHMuZmlsZUV4aXN0cyhyZWxhdGl2ZVBhdGgsIG9wdGlvbnMpIHx8IHR5cGVvZiBmaWxlVXRpbHMud3JpdGVGaWxlKHJlbGF0aXZlUGF0aCwgJycpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXNvbHZlKGNyZWF0ZUZpbGUoc2l0ZU5hbWUsIHJlbGF0aXZlUGF0aCwgb3B0aW9ucykpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlKHtmYWlsZWQ6IHRydWUsIGZpbGU6IGZpbGVOYW1lLCBtZXNzYWdlOiAnVW5hYmxlIHRvIGNyZWF0ZSBmaWxlISd9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgZGVsZXRlRmlsZSA9IChzaXRlTmFtZSwgZmlsZU5hbWUsIG9wdGlvbnMpID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihzaXRlTmFtZSwgb3B0aW9ucyk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgdHlwZSA9IGdldFR5cGVGcm9tUmVsYXRpdmVQYXRoKGZpbGVOYW1lKTtcblxuICAgIGZpbmRGaWxlKGZpbGVOYW1lLCBzaXRlTmFtZSwgb3B0aW9ucykudGhlbihmaWxlID0+IHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKFsnbGF5b3V0JywgJ2NvbXBvbmVudCddLCB0eXBlKSkge1xuICAgICAgICBjbGllbnQuZGVsZXRlTGF5b3V0KGZpbGUuaWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xpZW50LmRlbGV0ZUxheW91dEFzc2V0KGZpbGUuaWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAoZXJyID8gcmVqZWN0IDogcmVzb2x2ZSkoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IHJlbW92ZUZpbGUgPSAoc2l0ZU5hbWUsIGZpbGVOYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZmlsZTtcbiAgICBsZXQgdHlwZTtcblxuICAgIGlmIChmaWxlTmFtZS5zcGxpdCgnLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZpbGUgPSBnZXRGaWxlTmFtZUZyb21QYXRoKGZpbGVOYW1lLCBvcHRpb25zKTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbVJlbGF0aXZlUGF0aChmaWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGUgPSBmaWxlTmFtZTtcbiAgICAgIHR5cGUgPSBnZXRUeXBlRnJvbUV4dGVuc2lvbihmaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgbGV0IHN1YkZvbGRlciA9IGdldFN1YmZvbGRlckZvclR5cGUodHlwZSk7XG4gICAgbGV0IHByb2plY3REaXIgPSBzaXRlcy5kaXJGb3Ioc2l0ZU5hbWUsIG9wdGlvbnMpO1xuICAgIGxldCBmaW5hbFBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgc3ViRm9sZGVyLCBmaWxlKTtcblxuICAgIGxldCByZWxhdGl2ZVBhdGggPSBmaW5hbFBhdGgucmVwbGFjZShwcm9qZWN0RGlyICsgJy8nLCAnJyk7XG5cbiAgICBpZiAoZmlsZVV0aWxzLmZpbGVFeGlzdHMoZmluYWxQYXRoLCBvcHRpb25zKSB8fCB0eXBlb2YgZmlsZVV0aWxzLmRlbGV0ZUZpbGUocmVsYXRpdmVQYXRoKSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmVzb2x2ZShkZWxldGVGaWxlKHNpdGVOYW1lLCByZWxhdGl2ZVBhdGgsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZSh7ZmFpbGVkOiB0cnVlLCBmaWxlOiBmaWxlTmFtZSwgbWVzc2FnZTogJ1VuYWJsZSB0byByZW1vdmUgZmlsZSEnfSk7XG4gICAgfVxuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgY2xpZW50Rm9yLFxuICBnZXRUb3RhbEZpbGVDb3VudCxcbiAgcHVsbEFsbEZpbGVzLFxuICBwdXNoQWxsRmlsZXMsXG4gIGZpbmRGaWxlLFxuICBwdXNoRmlsZSxcbiAgcHVsbEZpbGUsXG4gIGNyZWF0ZUZpbGUsXG4gIGFkZEZpbGUsXG4gIHJlbW92ZUZpbGVcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCB7dmVyc2lvbn0gZnJvbSAnLi4vcGFja2FnZS5qc29uJztcblxuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgc2l0ZXMgZnJvbSAnLi9zaXRlcyc7XG5pbXBvcnQgYWN0aW9ucyBmcm9tICcuL2FjdGlvbnMnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGZpbGVVdGlscyxcbiAgY29uZmlnLFxuICBzaXRlcyxcbiAgYWN0aW9ucyxcbiAgdmVyc2lvblxufTtcbiJdLCJuYW1lcyI6WyJpbmhlcml0cyIsImZpbGVFeGlzdHMiLCJzaXRlcyIsIlByb21pc2UiLCJ3cml0ZUZpbGUiLCJkZWxldGVGaWxlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNLQSxJQUFNLFlBQVksU0FBWixTQUFZLENBQUMsVUFBRCxFQUFnQjtTQUN6QixHQUFHLFdBQUgsQ0FBZSxVQUFmLEVBQTJCLE1BQTNCLENBQWtDLFVBQVMsSUFBVCxFQUFlO1FBQ2xELFdBQVcsS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixJQUF0QixDQUFYLENBRGtEO1dBRS9DLEdBQUcsUUFBSCxDQUFZLFFBQVosRUFBc0IsTUFBdEIsRUFBUCxDQUZzRDtHQUFmLENBQXpDLENBRGdDO0NBQWhCOztBQU9sQixJQUFNLGNBQWMsU0FBZCxXQUFjLENBQUMsVUFBRCxFQUFnQjtTQUMzQixHQUFHLFdBQUgsQ0FBZSxVQUFmLEVBQTJCLE1BQTNCLENBQWtDLFVBQVMsSUFBVCxFQUFlO1FBQ2xELFdBQVcsS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixJQUF0QixDQUFYLENBRGtEO1dBRS9DLEdBQUcsUUFBSCxDQUFZLFFBQVosRUFBc0IsV0FBdEIsRUFBUCxDQUZzRDtHQUFmLENBQXpDLENBRGtDO0NBQWhCOztBQU9wQixJQUFNLGtCQUFrQixTQUFsQixlQUFrQixDQUFDLFFBQUQsRUFBNEI7TUFBakIsZ0VBQVUsa0JBQU87O1NBQzNDLEdBQUcsWUFBSCxDQUFnQixRQUFoQixFQUEwQixPQUExQixDQUFQLENBRGtEO0NBQTVCOztBQUl4QixJQUFNLGFBQWEsU0FBYixVQUFhLENBQUMsUUFBRCxFQUFjO01BQzNCO1dBQ0ssR0FBRyxRQUFILENBQVksUUFBWixFQUFzQixNQUF0QixFQUFQLENBREU7R0FBSixDQUVFLE9BQU8sQ0FBUCxFQUFVO1dBQ0gsS0FBUCxDQURVO0dBQVY7Q0FIZTs7QUFRbkIsSUFBTSxhQUFhLFNBQWIsVUFBYSxDQUFDLFFBQUQsRUFBYztTQUN4QixHQUFHLFVBQUgsQ0FBYyxRQUFkLENBQVAsQ0FEK0I7Q0FBZDs7QUFJbkIsSUFBTSxZQUFZLFNBQVosU0FBWSxDQUFDLFFBQUQsRUFBVyxJQUFYLEVBQW9CO1NBQzdCLEdBQUcsYUFBSCxDQUFpQixRQUFqQixFQUEyQixJQUEzQixDQUFQLENBRG9DO0NBQXBCOztBQUlsQixnQkFBZTtzQkFBQTswQkFBQTt3QkFBQTtzQkFBQTtPQUtSLFFBQVEsR0FBUjtrQ0FMUTt3QkFBQTtDQUFmOztBQ2xDZSxTQUFTLFdBQVQsQ0FBcUIsT0FBckIsRUFBOEIsS0FBOUIsRUFBcUM7UUFDNUMsaUJBQU4sQ0FBd0IsSUFBeEIsRUFBOEIsS0FBSyxXQUFMLENBQTlCLENBRGtEO09BRTdDLElBQUwsR0FBWSxLQUFLLFdBQUwsQ0FBaUIsSUFBakIsQ0FGc0M7T0FHN0MsT0FBTCxHQUFlLE9BQWYsQ0FIa0Q7T0FJN0MsS0FBTCxHQUFhLEtBQWIsQ0FKa0Q7Q0FBckM7O0FBT2ZBLGNBQVMsV0FBVCxFQUFzQixLQUF0Qjs7QUNMQSxJQUFNLGtCQUFrQixPQUFsQjs7QUFFTixJQUFNLFVBQVUsUUFBUSxHQUFSLENBQVksT0FBQyxDQUFRLFFBQVIsSUFBb0IsT0FBcEIsR0FBK0IsYUFBaEMsR0FBZ0QsTUFBaEQsQ0FBdEI7QUFDTixJQUFNLFdBQVcsUUFBUSxHQUFSLEVBQVg7O0FBRU4sSUFBTSxlQUFlLEtBQUssSUFBTCxDQUFVLFFBQVYsRUFBb0IsZUFBcEIsQ0FBZjtBQUNOLElBQU0sZ0JBQWdCLEtBQUssSUFBTCxDQUFVLE9BQVYsRUFBbUIsZUFBbkIsQ0FBaEI7O0FBRU4sSUFBTSxrQkFBa0IsU0FBbEIsZUFBa0IsR0FBTTtNQUN4QkMsYUFBVyxLQUFLLElBQUwsQ0FBVSxLQUFLLE9BQUwsQ0FBYSxRQUFiLEVBQXVCLElBQXZCLENBQVYsRUFBd0MsZUFBeEMsQ0FBWCxDQUFKLEVBQTBFO1dBQ2pFLEtBQUssSUFBTCxDQUFVLEtBQUssT0FBTCxDQUFhLFFBQWIsRUFBdUIsSUFBdkIsQ0FBVixFQUF3QyxlQUF4QyxDQUFQLENBRHdFO0dBQTFFLE1BRU87V0FDRSxZQUFQLENBREs7R0FGUDtDQURzQjs7QUFReEIsSUFBTSxhQUFhLFNBQWIsVUFBYSxDQUFDLElBQUQsRUFBd0I7TUFBakIsZ0VBQVUsa0JBQU87O1NBQ2xDLE1BQU0sT0FBTixFQUFlLE1BQWYsQ0FBc0I7V0FBSyxFQUFFLElBQUYsS0FBVyxJQUFYLElBQW1CLEVBQUUsSUFBRixLQUFXLElBQVg7R0FBeEIsQ0FBdEIsQ0FBK0QsQ0FBL0QsQ0FBUCxDQUR5QztDQUF4Qjs7QUFJbkIsSUFBTSxRQUFRLFNBQVIsS0FBUSxHQUFrQjtNQUFqQixnRUFBVSxrQkFBTzs7U0FDdkIsS0FBSyxPQUFMLEVBQWMsT0FBZCxLQUEwQixFQUExQixDQUR1QjtDQUFsQjs7QUFJZCxJQUFNLFFBQVEsU0FBUixLQUFRLENBQUMsR0FBRCxFQUFNLEtBQU4sRUFBOEI7TUFBakIsZ0VBQVUsa0JBQU87O01BQ3RDLFdBQVcsZ0JBQWdCLE9BQWhCLENBQVgsQ0FEc0M7O01BR3RDLENBQUMsYUFBYSxRQUFiLENBQUQsRUFBeUI7V0FDcEIsT0FBUCxFQUQyQjtHQUE3Qjs7TUFJSSxTQUFTLEtBQUssSUFBTCxFQUFXLE9BQVgsS0FBdUIsRUFBdkIsQ0FQNkI7U0FRbkMsR0FBUCxJQUFjLEtBQWQsQ0FSMEM7O01BVXRDLGVBQWUsS0FBSyxTQUFMLENBQWUsTUFBZixFQUF1QixJQUF2QixFQUE2QixDQUE3QixDQUFmLENBVnNDOztLQVl2QyxhQUFILENBQWlCLFFBQWpCLEVBQTJCLFlBQTNCLEVBWjBDO1NBYW5DLElBQVAsQ0FiMEM7Q0FBOUI7O0FBZ0JkLElBQU0sT0FBTyxTQUFQLElBQU8sQ0FBQyxHQUFELEVBQXVCO01BQWpCLGdFQUFVLGtCQUFPOztNQUM5QixXQUFXLGdCQUFnQixPQUFoQixDQUFYLENBRDhCOztNQUc5QixDQUFDLGFBQWEsT0FBYixDQUFELEVBQXdCO1FBQ3RCLGFBQWEsWUFBYixJQUE2QixhQUFhLE9BQU8sTUFBUCxDQUFjLEVBQWQsRUFBa0IsT0FBbEIsRUFBMkIsRUFBM0IsQ0FBYixDQUE3QixFQUEyRTtpQkFDbEUsYUFBWCxDQUQ2RTtLQUEvRSxNQUVPO1lBQ0MsSUFBSSxXQUFKLENBQWdCLCtCQUFoQixDQUFOLENBREs7S0FGUDtHQURGOztNQVFJLE9BQU8sR0FBRyxZQUFILENBQWdCLFFBQWhCLEVBQTBCLE1BQTFCLENBQVAsQ0FYOEI7TUFZOUIsYUFBYSxLQUFLLEtBQUwsQ0FBVyxJQUFYLENBQWIsQ0FaOEI7O01BYzlCLE9BQU8sR0FBUCxLQUFlLFFBQWYsRUFBeUI7V0FDcEIsV0FBVyxHQUFYLENBQVAsQ0FEMkI7R0FBN0IsTUFFTztXQUNFLFVBQVAsQ0FESztHQUZQO0NBZFc7O0FBcUJiLElBQU0sU0FBUyxTQUFULE1BQVMsR0FBa0I7TUFBakIsZ0VBQVUsa0JBQU87O01BQzNCLFdBQVcsZ0JBQWdCLE9BQWhCLENBQVgsQ0FEMkI7O01BRzNCLENBQUMsYUFBYSxPQUFiLENBQUQsRUFBd0I7T0FDdkIsYUFBSCxDQUFpQixRQUFqQixFQUEyQixJQUEzQixFQUQwQjtXQUVuQixJQUFQLENBRjBCO0dBQTVCLE1BR087V0FDRSxLQUFQLENBREs7R0FIUDtDQUhhOztBQVdmLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLEdBQWtCO01BQWpCLGdFQUFVLGtCQUFPOztNQUNuQyxFQUFFLEdBQUYsQ0FBTSxPQUFOLEVBQWUsUUFBZixLQUE0QixRQUFRLE1BQVIsS0FBbUIsSUFBbkIsRUFBMEI7V0FDbEQsYUFBUCxDQUR5RDtHQUEzRCxNQUVPLElBQUksRUFBRSxHQUFGLENBQU0sT0FBTixFQUFlLE9BQWYsS0FBMkIsUUFBUSxLQUFSLEtBQWtCLElBQWxCLEVBQXdCO1dBQ3JELGlCQUFQLENBRDREO0dBQXZELE1BRUEsSUFBSSxFQUFFLEdBQUYsQ0FBTSxPQUFOLEVBQWUsWUFBZixLQUFnQyxFQUFFLEdBQUYsQ0FBTSxPQUFOLEVBQWUsYUFBZixDQUFoQyxFQUErRDtXQUNqRSxRQUFRLFVBQVIsSUFBc0IsUUFBUSxXQUFSLENBRDJDO0dBQW5FLE1BRUE7V0FDRSxpQkFBUCxDQURLO0dBRkE7Q0FMZTs7QUFZeEIsSUFBTUEsZUFBYSxTQUFiLFVBQWEsQ0FBQyxRQUFELEVBQWM7TUFDM0I7V0FDSyxHQUFHLFFBQUgsQ0FBWSxRQUFaLEVBQXNCLE1BQXRCLEVBQVAsQ0FERTtHQUFKLENBRUUsT0FBTyxDQUFQLEVBQVU7V0FDSCxLQUFQLENBRFU7R0FBVjtDQUhlOztBQVFuQixJQUFNLGVBQWUsU0FBZixZQUFlLEdBQWtCO01BQWpCLGdFQUFVLGtCQUFPOztTQUM5QkEsYUFBVyxnQkFBZ0IsT0FBaEIsQ0FBWCxDQUFQLENBRHFDO0NBQWxCOztBQUlyQixhQUFlO3dCQUFBO2NBQUE7Y0FBQTtZQUFBO2dCQUFBO2tDQUFBOzRCQUFBO0NBQWY7O0FDOUZBLEtBQUssTUFBTCxDQUFZLDJDQUFaLEVBQXlELEVBQUMsWUFBWSxDQUFDLEtBQUQsQ0FBWixFQUExRCxFQUFnRixLQUFLLFlBQUwsQ0FBaEY7O0FBRUEsSUFBTSxTQUFTLFNBQVQsTUFBUyxDQUFDLElBQUQsRUFBd0I7TUFBakIsZ0VBQVUsa0JBQU87O1NBQzlCLE9BQU8sVUFBUCxDQUFrQixJQUFsQixFQUF3QixPQUF4QixDQUFQLENBRHFDO0NBQXhCOztBQUlmLElBQU0sTUFBTSxTQUFOLEdBQU0sQ0FBQyxJQUFELEVBQXdCO01BQWpCLGdFQUFVLGtCQUFPOztNQUM5QixFQUFFLEdBQUYsQ0FBTSxJQUFOLEVBQVksTUFBWixLQUF1QixFQUFFLEdBQUYsQ0FBTSxJQUFOLEVBQVksT0FBWixDQUF2QixFQUE2QztRQUMzQyxRQUFRLE9BQU8sS0FBUCxDQUFhLE9BQWIsQ0FBUixDQUQyQztVQUV6QyxJQUFOLENBQVcsSUFBWCxFQUYrQztXQUd4QyxLQUFQLENBQWEsT0FBYixFQUFzQixLQUF0QixFQUE2QixPQUE3QixFQUgrQztXQUl4QyxJQUFQLENBSitDO0dBQWpELE1BS087V0FDRSxLQUFQLENBREs7R0FMUDtDQURVOztBQVdaLElBQU0sU0FBUyxTQUFULE1BQVMsQ0FBQyxJQUFELEVBQXdCO01BQWpCLGdFQUFVLGtCQUFPOztNQUNqQyxnQkFBZ0IsT0FBTyxLQUFQLENBQWEsT0FBYixDQUFoQixDQURpQztNQUVqQyxZQUFZLGNBQWMsR0FBZCxDQUFrQjtXQUFRLEtBQUssSUFBTCxJQUFhLEtBQUssSUFBTDtHQUFyQixDQUE5QixDQUZpQztNQUdqQyxNQUFNLFVBQVUsT0FBVixDQUFrQixJQUFsQixDQUFOLENBSGlDO01BSWpDLE1BQU0sQ0FBTixFQUFTO1dBQVMsS0FBUCxDQUFGO0dBQWI7TUFDSSxhQUFhLGNBQ2QsS0FEYyxDQUNSLENBRFEsRUFDTCxHQURLLEVBRWQsTUFGYyxDQUVQLGNBQWMsS0FBZCxDQUFvQixNQUFNLENBQU4sQ0FGYixDQUFiLENBTGlDOztTQVM5QixPQUFPLEtBQVAsQ0FBYSxPQUFiLEVBQXNCLFVBQXRCLEVBQWtDLE9BQWxDLENBQVAsQ0FUcUM7Q0FBeEI7O0FBWWYsSUFBTSxjQUFjLFNBQWQsV0FBYyxDQUFDLFFBQUQsRUFBYztNQUM1QixPQUFPLEdBQUcsUUFBSCxDQUFZLFFBQVosQ0FBUCxDQUQ0Qjs7TUFHNUIsS0FBSyxNQUFMLEVBQUosRUFBbUI7UUFDYixXQUFXLEtBQUssUUFBTCxDQUFjLFFBQWQsQ0FBWCxDQURhO1dBRVY7WUFDQyxRQUFOO1lBQ00sS0FBSyxJQUFMO21CQUNPLEtBQUssTUFBTCxDQUFZLFFBQVosQ0FBYjtZQUNNLFFBQU47aUJBQ1csS0FBSyxLQUFMO0tBTGIsQ0FGaUI7R0FBbkIsTUFTTztXQUFBO0dBVFA7Q0FIa0I7O0FBaUJwQixJQUFNLGdCQUFnQixTQUFoQixhQUFnQixDQUFDLFFBQUQsRUFBYztNQUM5QixRQUFRLFNBQVMsUUFBVCxDQUFSLENBRDhCO1NBRTNCLE9BQU8sSUFBUCxDQUFZLEtBQVosRUFBbUIsTUFBbkIsQ0FBMEIsVUFBQyxLQUFELEVBQVEsTUFBUjtXQUFtQixRQUFRLE1BQU0sTUFBTixFQUFjLE1BQWQ7R0FBM0IsRUFBaUQsQ0FBM0UsQ0FBUCxDQUZrQztDQUFkOztBQUt0QixJQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsSUFBRCxFQUFVO01BQ3JCLFVBQVUsQ0FDWixRQURZLEVBQ0YsWUFERSxFQUNZLFFBRFosRUFDc0IsYUFEdEIsRUFDcUMsU0FEckMsRUFDZ0QsYUFEaEQsQ0FBVixDQURxQjs7TUFLckIsYUFBYSxPQUFPLElBQVAsQ0FBYixDQUxxQjs7TUFPckIsT0FBTyxVQUFVLFdBQVYsQ0FBc0IsVUFBdEIsQ0FBUCxDQVBxQjs7TUFTckIsSUFBSixFQUFVO1dBQ0QsUUFBUSxNQUFSLENBQWUsVUFBQyxTQUFELEVBQVksTUFBWixFQUF1QjtVQUN2QyxLQUFLLE9BQUwsQ0FBYSxNQUFiLEtBQXdCLENBQXhCLEVBQTJCOztjQUN6QixhQUFhLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBc0IsTUFBdEIsQ0FBYjtvQkFDTSxNQUFWLElBQW9CLFVBQVUsU0FBVixDQUFvQixVQUFwQixFQUFnQyxNQUFoQyxDQUF1QyxVQUFTLElBQVQsRUFBZTtnQkFDcEUsV0FBVyxLQUFLLElBQUwsQ0FBVSxVQUFWLEVBQXNCLElBQXRCLENBQVgsQ0FEb0U7Z0JBRXBFLE9BQU8sR0FBRyxRQUFILENBQVksUUFBWixDQUFQLENBRm9FOzttQkFJakUsS0FBSyxNQUFMLEVBQVAsQ0FKd0U7V0FBZixDQUF2QyxDQUtqQixHQUxpQixDQUtiLGdCQUFRO2dCQUNULFdBQVcsS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixJQUF0QixDQUFYLENBRFM7O21CQUdOLFlBQVksUUFBWixDQUFQLENBSGE7V0FBUixDQUxQO2FBRjZCO09BQS9CO2FBYU8sU0FBUCxDQWQyQztLQUF2QixFQWVuQixFQWZJLENBQVAsQ0FEUTtHQUFWO0NBVGU7O0FBNkJqQixJQUFNLFNBQVMsU0FBVCxNQUFTLENBQUMsSUFBRCxFQUF3QjtNQUFqQixnRUFBVSxrQkFBTzs7TUFDakMsT0FBTyxPQUFPLElBQVAsRUFBYSxPQUFiLENBQVAsQ0FEaUM7TUFFakMsUUFBUSxHQUFSLElBQWUsUUFBUSxJQUFSLEVBQWM7V0FDeEIsUUFBUSxHQUFSLElBQWUsUUFBUSxJQUFSLENBRFM7R0FBakMsTUFFTyxJQUFJLElBQUosRUFBVTtXQUNSLEtBQUssR0FBTCxJQUFZLEtBQUssSUFBTCxDQURKO0dBQVY7Q0FKTTs7QUFTZixJQUFNLFVBQVUsU0FBVixPQUFVLENBQUMsSUFBRCxFQUF3QjtNQUFqQixnRUFBVSxrQkFBTzs7TUFDbEMsT0FBTyxPQUFPLElBQVAsRUFBYSxPQUFiLENBQVAsQ0FEa0M7TUFFbEMsUUFBUSxJQUFSLEVBQWM7V0FDVCxRQUFRLElBQVIsQ0FEUztHQUFsQixNQUVPLElBQUksSUFBSixFQUFVO1dBQ1IsS0FBSyxJQUFMLENBRFE7R0FBVjtDQUpPOztBQVNoQixJQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsSUFBRCxFQUF3QjtNQUFqQixnRUFBVSxrQkFBTzs7TUFDbkMsT0FBTyxPQUFPLElBQVAsRUFBYSxPQUFiLENBQVAsQ0FEbUM7TUFFbkMsUUFBUSxLQUFSLElBQWlCLFFBQVEsU0FBUixFQUFtQjtXQUMvQixRQUFRLEtBQVIsSUFBaUIsUUFBUSxTQUFSLENBRGM7R0FBeEMsTUFFTyxJQUFJLElBQUosRUFBVTtXQUNSLEtBQUssS0FBTCxJQUFjLEtBQUssU0FBTCxDQUROO0dBQVY7Q0FKUTs7QUFTakIsSUFBTSxRQUFRLFNBQVIsS0FBUSxDQUFDLE9BQUQsRUFBYTtTQUNsQixPQUFPLEtBQVAsQ0FBYSxPQUFiLEVBQXNCLEdBQXRCLENBQTBCO1dBQVEsS0FBSyxJQUFMLElBQWEsS0FBSyxJQUFMO0dBQXJCLENBQWpDLENBRHlCO0NBQWI7O0FBSWQsSUFBTSxRQUFRLFNBQVIsS0FBUSxDQUFDLE9BQUQsRUFBYTtTQUNsQixPQUFPLEtBQVAsQ0FBYSxPQUFiLEVBQXNCLEdBQXRCLENBQTBCO1dBQVEsS0FBSyxJQUFMO0dBQVIsQ0FBakMsQ0FEeUI7Q0FBYjs7QUFJZCxjQUFlO2dCQUFBO1VBQUE7Z0JBQUE7OEJBQUE7b0JBQUE7Z0JBQUE7a0JBQUE7b0JBQUE7Y0FBQTtjQUFBOzBCQUFBO0NBQWY7O0FDakhBLElBQU0sWUFBWSxTQUFaLFNBQVksQ0FBQyxJQUFELEVBQXdCO01BQWpCLGdFQUFVLGtCQUFPOztNQUNwQyxPQUFPQyxRQUFNLE9BQU4sQ0FBYyxJQUFkLEVBQW9CLE9BQXBCLENBQVAsQ0FEb0M7TUFFcEMsUUFBUUEsUUFBTSxRQUFOLENBQWUsSUFBZixFQUFxQixPQUFyQixDQUFSLENBRm9DOztNQUlwQyxRQUFRLEtBQVIsRUFBZTtXQUNWLElBQUksSUFBSixDQUFTLElBQVQsRUFBZSxLQUFmLENBQVAsQ0FEaUI7R0FBbkI7Q0FKZ0I7O0FBU2xCLElBQU0sb0JBQW9CLFNBQXBCLGlCQUFvQixDQUFDLElBQUQsRUFBd0I7TUFBakIsZ0VBQVUsa0JBQU87O1NBQ3pDLElBQUlDLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtxQkFDOUIsR0FBUixDQUFZLENBQUMsV0FBVyxJQUFYLEVBQWlCLE9BQWpCLENBQUQsRUFBNEIsZ0JBQWdCLElBQWhCLEVBQXNCLE9BQXRCLENBQTVCLENBQVosRUFBeUUsSUFBekUsQ0FBOEUsZ0JBQXVCOzs7VUFBckIsbUJBQXFCO1VBQVosa0JBQVk7O2NBQzNGLFFBQVEsTUFBUixHQUFpQixPQUFPLE1BQVAsQ0FBekIsQ0FEbUc7S0FBdkIsQ0FBOUUsQ0FFRyxLQUZILENBRVMsTUFGVCxFQURzQztHQUFyQixDQUFuQixDQURnRDtDQUF4Qjs7QUFRMUIsSUFBTSxvQkFBb0IsU0FBcEIsaUJBQW9CLENBQUMsUUFBRCxFQUFXLEVBQVgsRUFBZ0M7TUFBakIsZ0VBQVUsa0JBQU87O1NBQ2pELElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtjQUM1QixRQUFWLEVBQW9CLE9BQXBCLEVBQTZCLE1BQTdCLENBQW9DLEVBQXBDLEVBQXdDLEVBQXhDLEVBQTRDLFVBQUMsR0FBRCxFQUFNLElBQU4sRUFBZTtVQUNyRCxHQUFKLEVBQVM7ZUFBUyxHQUFQLEVBQUY7T0FBVDtjQUNRLEtBQUssSUFBTCxDQUFSLENBRnlEO0tBQWYsQ0FBNUMsQ0FEc0M7R0FBckIsQ0FBbkIsQ0FEd0Q7Q0FBaEM7O0FBUzFCLElBQU0seUJBQXlCLFNBQXpCLHNCQUF5QixDQUFDLFFBQUQsRUFBVyxFQUFYLEVBQWdDO01BQWpCLGdFQUFVLGtCQUFPOztTQUN0RCxJQUFJQSxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7Y0FDNUIsUUFBVixFQUFvQixPQUFwQixFQUE2QixXQUE3QixDQUF5QyxFQUF6QyxFQUE2QyxFQUE3QyxFQUFpRCxVQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWU7VUFDMUQsR0FBSixFQUFTO2VBQVMsR0FBUCxFQUFGO09BQVQ7VUFDSSxLQUFLLFFBQUwsRUFBZTtnQkFDVCxLQUFLLElBQUwsQ0FBUixDQURpQjtPQUFuQixNQUVPO2dCQUNHLEtBQUssVUFBTCxDQUFSLENBREs7T0FGUDtLQUYrQyxDQUFqRCxDQURzQztHQUFyQixDQUFuQixDQUQ2RDtDQUFoQzs7QUFhL0IsSUFBTSxhQUFhLFNBQWIsVUFBYSxDQUFDLFFBQUQsRUFBNEI7TUFBakIsZ0VBQVUsa0JBQU87O1NBQ3RDLElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtjQUM1QixRQUFWLEVBQW9CLE9BQXBCLEVBQ0csT0FESCxDQUNXLE9BQU8sTUFBUCxDQUFjLEVBQWQsRUFBa0IsRUFBQyxVQUFVLEdBQVYsRUFBbkIsRUFBbUMsT0FBbkMsQ0FEWCxFQUN3RCxVQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWU7VUFDL0QsR0FBSixFQUFTO2VBQVMsR0FBUCxFQUFGO09BQVQ7Y0FDUSxJQUFSLEVBRm1FO0tBQWYsQ0FEeEQsQ0FEc0M7R0FBckIsQ0FBbkIsQ0FENkM7Q0FBNUI7O0FBVW5CLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLENBQUMsUUFBRCxFQUE0QjtNQUFqQixnRUFBVSxrQkFBTzs7U0FDM0MsSUFBSUEsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO2NBQzVCLFFBQVYsRUFBb0IsT0FBcEIsRUFDRyxZQURILENBQ2dCLE9BQU8sTUFBUCxDQUFjLEVBQWQsRUFBa0IsRUFBQyxVQUFVLEdBQVYsRUFBbkIsRUFBbUMsT0FBbkMsQ0FEaEIsRUFDNkQsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1VBQ3BFLEdBQUosRUFBUztlQUFTLEdBQVAsRUFBRjtPQUFUO2NBQ1EsSUFBUixFQUZ3RTtLQUFmLENBRDdELENBRHNDO0dBQXJCLENBQW5CLENBRGtEO0NBQTVCOztBQVV4QixJQUFNLGVBQWUsU0FBZixZQUFlLENBQUMsUUFBRCxFQUE0QjtNQUFqQixnRUFBVSxrQkFBTzs7U0FDeEMsSUFBSUEsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO1FBQ2xDLFVBQVVELFFBQU0sTUFBTixDQUFhLFFBQWIsRUFBdUIsT0FBdkIsQ0FBVixDQURrQzs7cUJBRzlCLEdBQVIsQ0FBWSxDQUNWLFdBQVcsUUFBWCxFQUFxQixPQUFyQixDQURVLEVBRVYsZ0JBQWdCLFFBQWhCLEVBQTBCLE9BQTFCLENBRlUsQ0FBWixFQUdHLElBSEgsQ0FHUSxpQkFBdUI7OztVQUFyQixtQkFBcUI7VUFBWixrQkFBWTs7dUJBQ3JCLEdBQVIsQ0FBWSxDQUNWLFFBQVEsR0FBUixDQUFZLGFBQUs7WUFDWCxXQUFXLEtBQUssSUFBTCxDQUFVLE9BQVYsR0FBc0IsRUFBRSxTQUFGLEdBQWMsWUFBZCxHQUE2QixTQUE3QixVQUEwQyxlQUFlLEVBQUUsS0FBRixVQUEvRSxDQUFYLENBRFc7ZUFFUixTQUFTLFFBQVQsRUFBbUIsUUFBbkIsRUFBNkIsT0FBN0IsQ0FBUCxDQUZlO09BQUwsQ0FBWixDQUdHLE1BSEgsQ0FHVSxPQUFPLEdBQVAsQ0FBVyxhQUFLO1lBQ3BCLFdBQVcsS0FBSyxJQUFMLENBQVUsT0FBVixHQUFzQixFQUFFLFFBQUYsQ0FBVyxDQUFDLFlBQUQsRUFBZSxPQUFmLEVBQXdCLFlBQXhCLENBQVgsRUFBa0QsRUFBRSxVQUFGLENBQWxELEdBQWtFLEVBQUUsVUFBRixHQUFlLE9BQWpGLFdBQTZGLEVBQUUsUUFBRixDQUE5SCxDQURvQjtlQUVqQixTQUFTLFFBQVQsRUFBbUIsUUFBbkIsRUFBNkIsT0FBN0IsQ0FBUCxDQUZ3QjtPQUFMLENBSHJCLENBRFUsQ0FBWixFQVFHLElBUkgsQ0FRUSxPQVJSLEVBRDZCO0tBQXZCLENBSFIsQ0FhRyxLQWJILENBYVMsTUFiVCxFQUhzQztHQUFyQixDQUFuQixDQUQrQztDQUE1Qjs7QUFxQnJCLElBQU0sZUFBZSxTQUFmLFlBQWUsQ0FBQyxRQUFELEVBQTRCO01BQWpCLGdFQUFVLGtCQUFPOztTQUN4QyxJQUFJQyxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7UUFDbEMsVUFBVUQsUUFBTSxNQUFOLENBQWEsUUFBYixFQUF1QixPQUF2QixDQUFWLENBRGtDOztxQkFHOUIsR0FBUixDQUFZLENBQ1YsV0FBVyxRQUFYLEVBQXFCLE9BQXJCLENBRFUsRUFFVixnQkFBZ0IsUUFBaEIsRUFBMEIsT0FBMUIsQ0FGVSxDQUFaLEVBR0csSUFISCxDQUdRLGlCQUF1Qjs7O1VBQXJCLG1CQUFxQjtVQUFaLGtCQUFZOzt1QkFDckIsR0FBUixDQUFZLENBQ1YsUUFBUSxHQUFSLENBQVksYUFBSztZQUNYLFdBQVcsS0FBSyxJQUFMLENBQVUsT0FBVixHQUFzQixFQUFFLFNBQUYsR0FBYyxZQUFkLEdBQTZCLFNBQTdCLFVBQTBDLGVBQWUsRUFBRSxLQUFGLFVBQS9FLENBQVgsQ0FEVztlQUVSLFNBQVMsUUFBVCxFQUFtQixRQUFuQixFQUE2QixPQUE3QixDQUFQLENBRmU7T0FBTCxDQUFaLENBR0csTUFISCxDQUdVLE9BQU8sR0FBUCxDQUFXLGFBQUs7WUFDcEIsV0FBVyxLQUFLLElBQUwsQ0FBVSxPQUFWLEdBQXNCLEVBQUUsUUFBRixDQUFXLENBQUMsWUFBRCxFQUFlLE9BQWYsRUFBd0IsWUFBeEIsQ0FBWCxFQUFrRCxFQUFFLFVBQUYsQ0FBbEQsR0FBa0UsRUFBRSxVQUFGLEdBQWUsT0FBakYsV0FBNkYsRUFBRSxRQUFGLENBQTlILENBRG9CO2VBRWpCLFNBQVMsUUFBVCxFQUFtQixRQUFuQixFQUE2QixPQUE3QixDQUFQLENBRndCO09BQUwsQ0FIckIsQ0FEVSxDQUFaLEVBUUcsSUFSSCxDQVFRLE9BUlIsRUFENkI7S0FBdkIsQ0FIUixDQWFHLEtBYkgsQ0FhUyxNQWJULEVBSHNDO0dBQXJCLENBQW5CLENBRCtDO0NBQTVCOztBQXFCckIsSUFBTSx3QkFBd0IsU0FBeEIscUJBQXdCLENBQUMsUUFBRCxFQUFXLFNBQVgsRUFBc0IsUUFBdEIsRUFBaUQ7TUFBakIsZ0VBQVUsa0JBQU87O01BQ3pFLE9BQU8sZUFBZSwwQkFBMEIsUUFBMUIsQ0FBZixDQUFQLENBRHlFO1NBRXRFLElBQUlDLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtXQUMvQixVQUFVLFFBQVYsRUFBb0IsT0FBcEIsRUFBNkIsT0FBN0IsQ0FBcUM7Z0JBQ2hDLEdBQVY7NEJBQ3NCLGFBQWEsS0FBYjtLQUZqQixFQUdKLFVBQUMsR0FBRCxFQUFvQjtVQUFkLDZEQUFPLGtCQUFPOztVQUNqQixHQUFKLEVBQVM7ZUFBUyxHQUFQLEVBQUY7T0FBVDtVQUNJLE1BQU0sS0FBSyxNQUFMLENBQVk7ZUFBSyxlQUFlLEVBQUUsS0FBRixDQUFmLElBQTJCLElBQTNCO09BQUwsQ0FBbEIsQ0FGaUI7VUFHakIsSUFBSSxNQUFKLEtBQWUsQ0FBZixFQUFrQjtlQUFTLFNBQVAsRUFBRjtPQUF0QjtjQUNRLEVBQUUsSUFBRixDQUFPLEdBQVAsQ0FBUixFQUpxQjtLQUFwQixDQUhILENBRHNDO0dBQXJCLENBQW5CLENBRjZFO0NBQWpEOztBQWU5QixJQUFNLGtCQUFrQixTQUFsQixlQUFrQixDQUFDLFFBQUQsRUFBVyxRQUFYLEVBQXNDO01BQWpCLGdFQUFVLGtCQUFPOztTQUNyRCxJQUFJQSxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7V0FDL0IsVUFBVSxRQUFWLEVBQW9CLE9BQXBCLEVBQTZCLFlBQTdCLENBQTBDO2dCQUNyQyxHQUFWO2lDQUMyQixRQUEzQjtLQUZLLEVBR0osVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1VBQ1osR0FBSixFQUFTO2VBQVMsR0FBUCxFQUFGO09BQVQ7Y0FDUSxFQUFFLElBQUYsQ0FBTyxJQUFQLENBQVIsRUFGZ0I7S0FBZixDQUhILENBRHNDO0dBQXJCLENBQW5CLENBRDREO0NBQXRDOztBQVl4QixJQUFNLHNCQUFzQixTQUF0QixtQkFBc0IsQ0FBQyxRQUFELEVBQWM7U0FDakMsU0FBUyxLQUFULENBQWUsR0FBZixFQUFvQixDQUFwQixDQUFQLENBRHdDO0NBQWQ7O0FBSTVCLElBQU0sNEJBQTRCLFNBQTVCLHlCQUE0QixDQUFDLFFBQUQsRUFBYztTQUN2QyxFQUFFLElBQUYsQ0FBTyxTQUFTLEtBQVQsQ0FBZSxHQUFmLENBQVAsQ0FBUCxDQUQ4QztDQUFkOztBQUlsQyxJQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBc0M7TUFBakIsZ0VBQVUsa0JBQU87O01BQ2pELE9BQU8sd0JBQXdCLFFBQXhCLENBQVAsQ0FEaUQ7TUFFakQsV0FBVyxvQkFBb0IsUUFBcEIsQ0FBWCxDQUZpRDs7TUFJakQsRUFBRSxRQUFGLENBQVcsQ0FBQyxRQUFELEVBQVcsV0FBWCxDQUFYLEVBQW9DLElBQXBDLENBQUosRUFBK0M7V0FDdEMsc0JBQXNCLFFBQXRCLEVBQWlDLFFBQVEsV0FBUixFQUFzQixRQUF2RCxFQUFpRSxPQUFqRSxDQUFQLENBRDZDO0dBQS9DLE1BRU87V0FDRSxnQkFBZ0IsUUFBaEIsRUFBMEIsUUFBMUIsRUFBb0MsT0FBcEMsQ0FBUCxDQURLO0dBRlA7Q0FKZTs7QUFXakIsSUFBTSxvQkFBb0IsU0FBcEIsaUJBQW9CLENBQUMsUUFBRCxFQUFjO1NBQy9CLEVBQUUsSUFBRixDQUFPLFNBQVMsS0FBVCxDQUFlLEdBQWYsQ0FBUCxFQUE0QixPQUE1QixDQUFvQyxHQUFwQyxFQUF5QyxHQUF6QyxDQUFQLENBRHNDO0NBQWQ7O0FBSTFCLElBQU0saUJBQWlCLFNBQWpCLGNBQWlCLENBQUMsS0FBRCxFQUFXO1NBQ3pCLE1BQU0sT0FBTixDQUFjLFlBQWQsRUFBNEIsR0FBNUIsRUFBaUMsV0FBakMsRUFBUCxDQURnQztDQUFYOztBQUl2QixJQUFNLDBCQUEwQixTQUExQix1QkFBMEIsQ0FBQyxJQUFELEVBQVU7TUFDcEMsU0FBUyxLQUFLLEtBQUwsQ0FBVyxHQUFYLEVBQWdCLENBQWhCLENBQVQsQ0FEb0M7TUFFcEMsa0JBQWtCO2VBQ1QsUUFBWDtrQkFDYyxXQUFkO2NBQ1UsT0FBVjtjQUNVLE9BQVY7bUJBQ2UsWUFBZjttQkFDZSxZQUFmO0dBTkUsQ0FGb0M7O1NBV2pDLGdCQUFnQixNQUFoQixDQUFQLENBWHdDO0NBQVY7O0FBY2hDLElBQU0sdUJBQXVCLFNBQXZCLG9CQUF1QixDQUFDLFFBQUQsRUFBYztNQUNyQyxTQUFTLEtBQVQsQ0FBZSxHQUFmLEVBQW9CLE1BQXBCLEdBQTZCLENBQTdCLEVBQWdDO1FBQzlCLFlBQVksRUFBRSxJQUFGLENBQU8sU0FBUyxLQUFULENBQWUsR0FBZixDQUFQLENBQVosQ0FEOEI7O1lBRzFCLFNBQVI7V0FDSyxJQUFMO2VBQ1MsWUFBUCxDQURGO1dBRUssS0FBTDtlQUNTLFlBQVAsQ0FERjtXQUVLLEtBQUwsQ0FMQTtXQU1LLEtBQUwsQ0FOQTtXQU9LLE1BQUwsQ0FQQTtXQVFLLEtBQUw7ZUFDUyxPQUFQLENBREY7V0FFSyxLQUFMO2VBQ1MsUUFBUCxDQURGOztlQUdTLE9BQVAsQ0FERjtLQWZrQztHQUFwQztDQUQyQjs7QUFzQjdCLElBQU0sc0JBQXNCLFNBQXRCLG1CQUFzQixDQUFDLElBQUQsRUFBVTtTQUM3QjthQUNJLFFBQVQ7YUFDUyxRQUFUO2tCQUNjLGFBQWQ7a0JBQ2MsYUFBZDtpQkFDYSxZQUFiO2NBQ1UsU0FBVjtHQU5LLENBT0wsSUFQSyxDQUFQLENBRG9DO0NBQVY7O0FBVzVCLElBQU0sZ0JBQWdCLFNBQWhCLGFBQWdCLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBbUI7U0FDaEMsS0FDSixPQURJLENBQ0ksT0FESixFQUNhLEVBRGIsRUFFSixPQUZJLENBRUksS0FGSixFQUVXLEVBRlgsQ0FBUCxDQUR1QztDQUFuQjs7QUFNdEIsSUFBTUMsY0FBWSxTQUFaLFNBQVksQ0FBQyxRQUFELEVBQVcsSUFBWCxFQUFpQixRQUFqQixFQUE4QjtTQUN2QyxJQUFJRCxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7UUFDbEMsRUFBRSxRQUFGLENBQVcsT0FBTyxJQUFQLENBQVksSUFBWixDQUFYLEVBQThCLGFBQTlCLENBQUosRUFBa0Q7d0JBQzlCLFFBQWxCLEVBQTRCLEtBQUssRUFBTCxDQUE1QixDQUFxQyxJQUFyQyxDQUEwQyxvQkFBWTtZQUNoRDthQUNDLFNBQUgsQ0FBYSxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQWIsRUFERTtTQUFKLENBRUUsT0FBTyxDQUFQLEVBQVU7Y0FDTixFQUFFLElBQUYsSUFBVSxRQUFWLEVBQW9CO2tCQUFRLENBQU4sQ0FBRjtXQUF4QjtTQURBOztXQUlDLFNBQUgsQ0FBYSxRQUFiLEVBQXVCLFFBQXZCLEVBQWlDLFVBQUMsR0FBRCxFQUFTO2NBQ3BDLEdBQUosRUFBUzttQkFBUyxHQUFQLEVBQUY7V0FBVDtrQkFDUSxJQUFSLEVBRndDO1NBQVQsQ0FBakMsQ0FQb0Q7T0FBWixDQUExQyxDQURnRDtLQUFsRCxNQWFPLElBQUksS0FBSyxRQUFMLEVBQWU7NkJBQ0QsUUFBdkIsRUFBaUMsS0FBSyxFQUFMLENBQWpDLENBQTBDLElBQTFDLENBQStDLG9CQUFZO1lBQ3JEO2FBQ0MsU0FBSCxDQUFhLEtBQUssT0FBTCxDQUFhLFFBQWIsQ0FBYixFQURFO1NBQUosQ0FFRSxPQUFPLENBQVAsRUFBVTtjQUNOLEVBQUUsSUFBRixJQUFVLFFBQVYsRUFBb0I7a0JBQVEsQ0FBTixDQUFGO1dBQXhCO1NBREE7V0FHQyxTQUFILENBQWEsUUFBYixFQUF1QixRQUF2QixFQUFpQyxVQUFDLEdBQUQsRUFBUztjQUNwQyxHQUFKLEVBQVM7bUJBQVMsR0FBUCxFQUFGO1dBQVQ7a0JBQ1EsSUFBUixFQUZ3QztTQUFULENBQWpDLENBTnlEO09BQVosQ0FBL0MsQ0FEd0I7S0FBbkIsTUFZQTtVQUNELE1BQU0sS0FBSyxVQUFMLENBREw7VUFFRDtXQUNDLFNBQUgsQ0FBYSxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQWIsRUFERTtPQUFKLENBRUUsT0FBTyxDQUFQLEVBQVU7WUFDTixFQUFFLElBQUYsSUFBVSxRQUFWLEVBQW9CO2dCQUFRLENBQU4sQ0FBRjtTQUF4QjtPQURBOztVQUlFLFNBQVMsR0FBRyxpQkFBSCxDQUFxQixRQUFyQixDQUFULENBUkM7VUFTRCxPQUFPLE1BQVAsRUFBZTtZQUNiLE1BQU0sUUFBUSxHQUFSLENBQVksR0FBWixFQUFpQixFQUFqQixDQUFvQixPQUFwQixFQUE2QixVQUFDLEdBQUQ7aUJBQVMsT0FBTyxHQUFQO1NBQVQsQ0FBbkMsQ0FEYTtZQUViLElBQUosQ0FBUyxNQUFULEVBRmlCO2dCQUdULElBQVIsRUFIaUI7T0FBbkIsTUFJTztlQUNFLElBQVAsRUFESztPQUpQO0tBckJLO0dBZFUsQ0FBbkIsQ0FEOEM7Q0FBOUI7O0FBK0NsQixJQUFNLGFBQWEsU0FBYixVQUFhLENBQUMsUUFBRCxFQUFXLElBQVgsRUFBaUIsUUFBakIsRUFBNEM7TUFBakIsZ0VBQVUsa0JBQU87O01BQ3pELFNBQVMsVUFBVSxRQUFWLEVBQW9CLE9BQXBCLENBQVQsQ0FEeUQ7U0FFdEQsSUFBSUEsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO1FBQ2xDLElBQUosRUFBVTtVQUNKLEVBQUUsUUFBRixDQUFXLE9BQU8sSUFBUCxDQUFZLElBQVosQ0FBWCxFQUE4QixhQUE5QixDQUFKLEVBQWtEO1lBQzVDLFdBQVcsR0FBRyxZQUFILENBQWdCLFFBQWhCLEVBQTBCLE1BQTFCLENBQVgsQ0FENEM7ZUFFekMsWUFBUCxDQUFvQixLQUFLLEVBQUwsRUFBUztnQkFDckIsUUFBTjtTQURGLEVBRUcsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1dBQ2YsTUFBTSxNQUFOLEdBQWUsT0FBZixDQUFELENBQXlCLElBQXpCLEVBRGdCO1NBQWYsQ0FGSCxDQUZnRDtPQUFsRCxNQU9PLElBQUksS0FBSyxRQUFMLEVBQWU7WUFDcEIsV0FBVyxHQUFHLFlBQUgsQ0FBZ0IsUUFBaEIsRUFBMEIsTUFBMUIsQ0FBWCxDQURvQjtlQUVqQixpQkFBUCxDQUF5QixLQUFLLEVBQUwsRUFBUztnQkFDMUIsUUFBTjtTQURGLEVBRUcsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1dBQ2YsTUFBTSxNQUFOLEdBQWUsT0FBZixDQUFELENBQXlCLElBQXpCLEVBRGdCO1NBQWYsQ0FGSCxDQUZ3QjtPQUFuQixNQU9BO2dCQUNHLEVBQUMsUUFBUSxJQUFSLEVBQWMsTUFBTSxRQUFOLEVBQWdCLFNBQVMsd0JBQVQsRUFBdkMsRUFESztPQVBBO0tBUlQsTUFrQk87aUJBQ00sUUFBWCxFQUFxQixRQUFyQixFQUErQixPQUEvQixFQUF3QyxJQUF4QyxDQUE2QyxPQUE3QyxFQUFzRCxNQUF0RCxFQURLO0tBbEJQO0dBRGlCLENBQW5CLENBRjZEO0NBQTVDOztBQTJCbkIsSUFBTSxhQUFhLFNBQWIsVUFBYSxDQUFDLFFBQUQsRUFBVyxRQUFYLEVBQXNDO01BQWpCLGdFQUFVLGtCQUFPOztNQUNuRCxTQUFTLFVBQVUsUUFBVixFQUFvQixPQUFwQixDQUFULENBRG1EO1NBRWhELElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtRQUNsQyxPQUFPLHdCQUF3QixRQUF4QixDQUFQLENBRGtDO1FBRWxDLE9BQU8sbUJBQW1CLFFBQW5CLENBQVAsQ0FGa0M7O1FBSWxDLEVBQUUsUUFBRixDQUFXLENBQUMsUUFBRCxFQUFXLFdBQVgsQ0FBWCxFQUFvQyxJQUFwQyxDQUFKLEVBQStDO2FBQ3RDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBMEIsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO1lBQ25DLEdBQUosRUFBUztrQkFDQyxFQUFDLFFBQVEsSUFBUixFQUFjLE1BQU0sSUFBTixFQUFZLFNBQVMsd0JBQVQsRUFBbkMsRUFETztTQUFULE1BRU87a0JBQ0csSUFBUixFQURLO1NBRlA7T0FEd0IsQ0FBMUIsQ0FENkM7S0FBL0MsTUFRTzthQUNFLGlCQUFQLENBQXlCLElBQXpCLEVBQStCLFVBQUMsR0FBRCxFQUFNLElBQU4sRUFBZTtZQUN4QyxHQUFKLEVBQVM7a0JBQ0MsRUFBQyxRQUFRLElBQVIsRUFBYyxNQUFNLElBQU4sRUFBWSxTQUFTLHdCQUFULEVBQW5DLEVBRE87U0FBVCxNQUVPO2tCQUNHLElBQVIsRUFESztTQUZQO09BRDZCLENBQS9CLENBREs7S0FSUDtHQUppQixDQUFuQixDQUZ1RDtDQUF0Qzs7QUEwQm5CLElBQU0scUJBQXFCLFNBQXJCLGtCQUFxQixDQUFDLFFBQUQsRUFBNEI7TUFBakIsZ0VBQVUsa0JBQU87O01BQ2pELE9BQU8sd0JBQXdCLFFBQXhCLENBQVAsQ0FEaUQ7TUFFakQsV0FBVyxvQkFBb0IsUUFBcEIsQ0FBWCxDQUZpRDs7TUFJakQsRUFBRSxRQUFGLENBQVcsQ0FBQyxRQUFELEVBQVcsV0FBWCxDQUFYLEVBQW9DLElBQXBDLENBQUosRUFBK0M7V0FDdEM7YUFDRSxFQUFFLEdBQUYsQ0FBTSxPQUFOLEVBQWUsT0FBZixJQUEwQixRQUFRLEtBQVIsR0FBZ0Isa0JBQWtCLFFBQWxCLENBQTFDO2lCQUNJLFFBQVEsV0FBUjtvQkFDRyxFQUFFLEdBQUYsQ0FBTSxPQUFOLEVBQWUsY0FBZixJQUFpQyxRQUFRLFlBQVIsR0FBdUIsTUFBeEQ7WUFDUixHQUFHLFlBQUgsQ0FBZ0IsUUFBaEIsRUFBMEIsTUFBMUIsQ0FBTjtpQkFDVyxFQUFFLEdBQUYsQ0FBTSxPQUFOLEVBQWUsV0FBZixJQUE4QixRQUFRLFNBQVIsR0FBb0IsSUFBbEQ7b0JBQ0csRUFBRSxHQUFGLENBQU0sT0FBTixFQUFlLGNBQWYsSUFBaUMsUUFBUSxZQUFSLEdBQXVCLElBQXhEO0tBTmhCLENBRDZDO0dBQS9DLE1BU087V0FDRTtnQkFDSyxRQUFWO1lBQ00sR0FBRyxZQUFILENBQWdCLFFBQWhCLEVBQTBCLE1BQTFCLENBQU47S0FGRixDQURLO0dBVFA7Q0FKeUI7O0FBcUIzQixJQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBc0M7TUFBakIsZ0VBQVUsa0JBQU87O01BQ2pELFVBQVVELFFBQU0sTUFBTixDQUFhLFFBQWIsRUFBdUIsT0FBdkIsQ0FBVixDQURpRDtNQUVqRCxpQkFBaUIsY0FBYyxRQUFkLEVBQXdCLE9BQXhCLENBQWpCLENBRmlEOztTQUk5QyxJQUFJQyxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7YUFDN0IsY0FBVCxFQUF5QixRQUF6QixFQUFtQyxPQUFuQyxFQUE0QyxJQUE1QyxDQUFpRCxnQkFBUTtVQUNuRCxDQUFDLElBQUQsSUFBUyxPQUFPLElBQVAsS0FBZ0IsV0FBaEIsRUFBNkI7Z0JBQ2hDLEVBQUMsUUFBUSxJQUFSLEVBQWMsTUFBTSxRQUFOLEVBQWdCLFNBQVMsZ0JBQVQsRUFBdkMsRUFEd0M7T0FBMUMsTUFFTztnQkFDR0MsWUFBVSxRQUFWLEVBQW9CLElBQXBCLEVBQTBCLFFBQTFCLEVBQW9DLE9BQXBDLENBQVIsRUFESztPQUZQO0tBRCtDLENBQWpELENBRHNDO0dBQXJCLENBQW5CLENBSnFEO0NBQXRDOztBQWVqQixJQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBc0M7TUFBakIsZ0VBQVUsa0JBQU87O01BQ2pELFVBQVVGLFFBQU0sTUFBTixDQUFhLFFBQWIsRUFBdUIsT0FBdkIsQ0FBVixDQURpRDtNQUVqRCxpQkFBaUIsY0FBYyxRQUFkLEVBQXdCLE9BQXhCLENBQWpCLENBRmlEOztTQUk5QyxJQUFJQyxnQkFBSixDQUFZLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7YUFDN0IsY0FBVCxFQUF5QixRQUF6QixFQUFtQyxPQUFuQyxFQUE0QyxJQUE1QyxDQUFpRCxnQkFBUTtVQUNuRCxDQUFDLElBQUQsSUFBUyxPQUFPLElBQVAsS0FBZ0IsV0FBaEIsRUFBNkI7Z0JBQ2hDLEVBQUMsUUFBUSxJQUFSLEVBQWMsTUFBTSxRQUFOLEVBQWdCLFNBQVMsZ0JBQVQsRUFBdkMsRUFEd0M7T0FBMUMsTUFFTztnQkFDRyxXQUFXLFFBQVgsRUFBcUIsSUFBckIsRUFBMkIsUUFBM0IsRUFBcUMsT0FBckMsQ0FBUixFQURLO09BRlA7S0FEK0MsQ0FBakQsQ0FEc0M7R0FBckIsQ0FBbkIsQ0FKcUQ7Q0FBdEM7O0FBZ0JqQixJQUFNLFVBQVUsU0FBVixPQUFVLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBc0M7TUFBakIsZ0VBQVUsa0JBQU87O1NBQzdDLElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtRQUNsQyxnQkFBSixDQURzQztRQUVsQyxnQkFBSixDQUZzQzs7UUFJbEMsU0FBUyxLQUFULENBQWUsR0FBZixFQUFvQixNQUFwQixHQUE2QixDQUE3QixFQUFnQzthQUMzQixvQkFBb0IsUUFBcEIsRUFBOEIsT0FBOUIsQ0FBUCxDQURrQzthQUUzQix3QkFBd0IsUUFBeEIsQ0FBUCxDQUZrQztLQUFwQyxNQUdPO2FBQ0UsUUFBUCxDQURLO2FBRUUscUJBQXFCLFFBQXJCLENBQVAsQ0FGSztLQUhQOztRQVFJLFlBQVksb0JBQW9CLElBQXBCLENBQVosQ0Faa0M7UUFhbEMsYUFBYUQsUUFBTSxNQUFOLENBQWEsUUFBYixFQUF1QixPQUF2QixDQUFiLENBYmtDO1FBY2xDLFlBQVksS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixTQUF0QixFQUFpQyxJQUFqQyxDQUFaLENBZGtDOztRQWdCbEMsZUFBZSxVQUFVLE9BQVYsQ0FBa0IsYUFBYSxHQUFiLEVBQWtCLEVBQXBDLENBQWYsQ0FoQmtDOztRQWtCbEMsVUFBVSxVQUFWLENBQXFCLFlBQXJCLEVBQW1DLE9BQW5DLEtBQStDLE9BQU8sVUFBVSxTQUFWLENBQW9CLFlBQXBCLEVBQWtDLEVBQWxDLENBQVAsSUFBZ0QsV0FBaEQsRUFBNkQ7Y0FDdEcsV0FBVyxRQUFYLEVBQXFCLFlBQXJCLEVBQW1DLE9BQW5DLENBQVIsRUFEOEc7S0FBaEgsTUFFTztjQUNHLEVBQUMsUUFBUSxJQUFSLEVBQWMsTUFBTSxRQUFOLEVBQWdCLFNBQVMsd0JBQVQsRUFBdkMsRUFESztLQUZQO0dBbEJpQixDQUFuQixDQURvRDtDQUF0Qzs7QUEyQmhCLElBQU1HLGVBQWEsU0FBYixVQUFhLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBcUIsT0FBckIsRUFBaUM7TUFDOUMsU0FBUyxVQUFVLFFBQVYsRUFBb0IsT0FBcEIsQ0FBVCxDQUQ4Qzs7U0FHM0MsSUFBSUYsZ0JBQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO1FBQ2xDLE9BQU8sd0JBQXdCLFFBQXhCLENBQVAsQ0FEa0M7O2FBRzdCLFFBQVQsRUFBbUIsUUFBbkIsRUFBNkIsT0FBN0IsRUFBc0MsSUFBdEMsQ0FBMkMsZ0JBQVE7VUFDN0MsRUFBRSxRQUFGLENBQVcsQ0FBQyxRQUFELEVBQVcsV0FBWCxDQUFYLEVBQW9DLElBQXBDLENBQUosRUFBK0M7ZUFDdEMsWUFBUCxDQUFvQixLQUFLLEVBQUwsRUFBUyxVQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWU7V0FDekMsTUFBTSxNQUFOLEdBQWUsT0FBZixDQUFELENBQXlCLElBQXpCLEVBRDBDO1NBQWYsQ0FBN0IsQ0FENkM7T0FBL0MsTUFJTztlQUNFLGlCQUFQLENBQXlCLEtBQUssRUFBTCxFQUFTLFVBQUMsR0FBRCxFQUFNLElBQU4sRUFBZTtXQUM5QyxNQUFNLE1BQU4sR0FBZSxPQUFmLENBQUQsQ0FBeUIsSUFBekIsRUFEK0M7U0FBZixDQUFsQyxDQURLO09BSlA7S0FEeUMsQ0FBM0MsQ0FIc0M7R0FBckIsQ0FBbkIsQ0FIa0Q7Q0FBakM7O0FBb0JuQixJQUFNLGFBQWEsU0FBYixVQUFhLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBc0M7TUFBakIsZ0VBQVUsa0JBQU87O1NBQ2hELElBQUlBLGdCQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtRQUNsQyxnQkFBSixDQURzQztRQUVsQyxnQkFBSixDQUZzQzs7UUFJbEMsU0FBUyxLQUFULENBQWUsR0FBZixFQUFvQixNQUFwQixHQUE2QixDQUE3QixFQUFnQzthQUMzQixvQkFBb0IsUUFBcEIsRUFBOEIsT0FBOUIsQ0FBUCxDQURrQzthQUUzQix3QkFBd0IsUUFBeEIsQ0FBUCxDQUZrQztLQUFwQyxNQUdPO2FBQ0UsUUFBUCxDQURLO2FBRUUscUJBQXFCLFFBQXJCLENBQVAsQ0FGSztLQUhQOztRQVFJLFlBQVksb0JBQW9CLElBQXBCLENBQVosQ0Faa0M7UUFhbEMsYUFBYUQsUUFBTSxNQUFOLENBQWEsUUFBYixFQUF1QixPQUF2QixDQUFiLENBYmtDO1FBY2xDLFlBQVksS0FBSyxJQUFMLENBQVUsVUFBVixFQUFzQixTQUF0QixFQUFpQyxJQUFqQyxDQUFaLENBZGtDOztRQWdCbEMsZUFBZSxVQUFVLE9BQVYsQ0FBa0IsYUFBYSxHQUFiLEVBQWtCLEVBQXBDLENBQWYsQ0FoQmtDOztRQWtCbEMsVUFBVSxVQUFWLENBQXFCLFNBQXJCLEVBQWdDLE9BQWhDLEtBQTRDLE9BQU8sVUFBVSxVQUFWLENBQXFCLFlBQXJCLENBQVAsSUFBNkMsV0FBN0MsRUFBMEQ7Y0FDaEdHLGFBQVcsUUFBWCxFQUFxQixZQUFyQixFQUFtQyxPQUFuQyxDQUFSLEVBRHdHO0tBQTFHLE1BRU87Y0FDRyxFQUFDLFFBQVEsSUFBUixFQUFjLE1BQU0sUUFBTixFQUFnQixTQUFTLHdCQUFULEVBQXZDLEVBREs7S0FGUDtHQWxCaUIsQ0FBbkIsQ0FEdUQ7Q0FBdEM7O0FBMkJuQixjQUFlO3NCQUFBO3NDQUFBOzRCQUFBOzRCQUFBO29CQUFBO29CQUFBO29CQUFBO3dCQUFBO2tCQUFBO3dCQUFBO0NBQWY7O1dDcGJlO3NCQUFBO2dCQUFBO2dCQUFBO2tCQUFBO2tCQUFBO0NBQWY7OyJ9