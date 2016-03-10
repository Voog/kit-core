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

var getLayoutInfo = function getLayoutInfo(layout) {
  var name = layout.title.replace(/[^\w\.\-]/g, '_').toLowerCase();
  return {
    title: layout.title,
    layout_name: name,
    content_type: layout.content_type,
    component: layout.component,
    file: (layout.component ? 'components' : 'layouts') + '/' + name
  };
};

var getAssetInfo = function getAssetInfo(asset) {
  return {
    kind: asset.asset_type,
    filename: asset.filename,
    file: asset.asset_type + 's/' + asset.filename,
    content_type: asset.content_type
  };
};

var getManifest = function getManifest(name) {
  return new bluebird.Promise(function (resolve, reject) {
    bluebird.Promise.all([getLayouts(name), getLayoutAssets(name)]).then(function (files) {
      resolve({
        layouts: files[0].map(getLayoutInfo),
        assets: files[1].map(getAssetInfo)
      });
    }, reject);
  });
};

var writeManifest = function writeManifest(name, manifest) {
  var manifestPath = projects.dirFor(name) + '/manifest2.json';
  fileUtils.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
};

var generateRemoteManifest = function generateRemoteManifest(name) {
  getManifest(name).then(_$1.curry(writeManifest)(name));
};

var readManifest = function readManifest(name) {
  var manifestFilePath = path.join(path.normalize(projects.dirFor(name)), 'manifest2.json');
  if (!fs.existsSync(manifestFilePath)) {
    return;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestFilePath));
  } catch (e) {
    return;
  }
};

var getLayoutContents = function getLayoutContents(id, projectName) {
  return new bluebird.Promise(function (resolve, reject) {
    clientFor(projectName).layout(id, {}, function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data.body);
    });
  });
};

var getLayoutAssetContents = function getLayoutAssetContents(id, projectName) {
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

    bluebird.Promise.all([getLayouts(projectName), getLayoutAssets(projectName)]).then(function (_ref3) {
      var _ref4 = babelHelpers.slicedToArray(_ref3, 2);

      var layouts = _ref4[0];
      var assets = _ref4[1];

      bluebird.Promise.all([layouts.map(function (l) {
        var filePath = path.join(projectDir, (l.component ? 'components' : 'layouts') + '/' + normalizeTitle(l.title) + '.tpl');
        return pushFile(projectName, filePath);
      }).concat(assets.filter(function (a) {
        return ['js', 'css'].indexOf(a.filename.split('.').reverse()[0]) >= 0;
      }).map(function (a) {
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
        getLayoutContents(file.id, projectName).then(function (contents) {
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
            resolve(true);
          });
        });
      } else if (file.editable) {
        getLayoutAssetContents(file.id, projectName).then(function (contents) {
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
            resolve(true);
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
          if (err) {
            reject(false);
          } else {
            resolve(true);
          }
        });
      } else if (file.editable) {
        var contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayoutAsset(file.id, {
          data: contents
        }, function (err, data) {
          if (err) {
            reject(false);
          } else {
            resolve(true);
          }
        });
      } else {
        reject(false);
      }
    } else {
      reject();
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
        reject();
        return;
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
  pullFile: pullFile,
  getManifest: getManifest,
  readManifest: readManifest,
  writeManifest: generateRemoteManifest
};

var version = "0.0.1";

var core = {
  fileUtils: fileUtils,
  config: config,
  projects: projects,
  actions: actions,
  version: version
};

module.exports = core;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInNyYy9maWxlX3V0aWxzLmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9wcm9qZWN0cy5qcyIsInNyYy9hY3Rpb25zLmpzIiwicGFja2FnZS5qc29uIiwic3JjL2NvcmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxpc3RGaWxlcyA9IChmb2xkZXJQYXRoKSA9PiB7XG4gIHJldHVybiBmcy5yZWFkZGlyU3luYyhmb2xkZXJQYXRoKS5maWx0ZXIoXG4gICAgZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBpdGVtUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBpdGVtKTtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoaXRlbVBhdGgpLmlzRmlsZSgpO1xuICB9KTtcbn07XG5cbmNvbnN0IGxpc3RGb2xkZXJzID0gKGZvbGRlclBhdGgpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKGZvbGRlclBhdGgpLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIGl0ZW1QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGl0ZW0pO1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhpdGVtUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlQ29udGVudHMgPSAoZmlsZVBhdGgsIG9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBkZWxldGVGaWxlID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBbJ2ZzLnVubGlua1N5bmMnLCBmaWxlUGF0aF07XG59O1xuXG5jb25zdCB3cml0ZUZpbGUgPSAoZmlsZVBhdGgsIGRhdGEpID0+IHtcbiAgcmV0dXJuIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsIGRhdGEpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBsaXN0RmlsZXMsXG4gIGxpc3RGb2xkZXJzLFxuICBkZWxldGVGaWxlLFxuICB3cml0ZUZpbGUsXG4gIGN3ZDogcHJvY2Vzcy5jd2QsXG4gIGdldEZpbGVDb250ZW50c1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBDT05GSUdfRklMRU5BTUUgPSAnLnZvb2cnO1xuXG5jb25zdCBIT01FRElSID0gcHJvY2Vzcy5lbnYuSE9NRTtcbmNvbnN0IExPQ0FMRElSID0gcHJvY2Vzcy5jd2QoKTtcblxuY29uc3QgTE9DQUxfQ09ORklHID0gcGF0aC5qb2luKExPQ0FMRElSLCBDT05GSUdfRklMRU5BTUUpO1xuY29uc3QgR0xPQkFMX0NPTkZJRyA9IHBhdGguam9pbihIT01FRElSLCBDT05GSUdfRklMRU5BTUUpO1xuXG5jb25zdCBzaXRlQnlOYW1lID0gKG5hbWUsIG9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIHNpdGVzKCkuZmlsdGVyKGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gcC5uYW1lID09PSBuYW1lO1xuICB9KVswXTtcbn07XG5cbmNvbnN0IHNpdGVzID0gKG9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIHJlYWQoJ3NpdGVzJywgb3B0aW9ucykgfHwgcmVhZCgncHJvamVjdHMnLCBvcHRpb25zKSB8fCBbXTtcbn07XG5cbmNvbnN0IHdyaXRlID0gKGtleSwgdmFsdWUsIG9wdGlvbnMpID0+IHtcbiAgbGV0IHBhdGg7XG4gIGlmICghb3B0aW9ucyB8fCAoXy5oYXMob3B0aW9ucywgJ2dsb2JhbCcpICYmIG9wdGlvbnMuZ2xvYmFsID09PSB0cnVlKSkge1xuICAgIHBhdGggPSBHTE9CQUxfQ09ORklHO1xuICB9IGVsc2Uge1xuICAgIHBhdGggPSBMT0NBTF9DT05GSUc7XG4gIH1cbiAgbGV0IGNvbmZpZyA9IHJlYWQobnVsbCwgb3B0aW9ucykgfHwge307XG4gIGNvbmZpZ1trZXldID0gdmFsdWU7XG5cbiAgbGV0IGZpbGVDb250ZW50cyA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMik7XG5cbiAgZnMud3JpdGVGaWxlU3luYyhwYXRoLCBmaWxlQ29udGVudHMpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmNvbnN0IHJlYWQgPSAoa2V5LCBvcHRpb25zKSA9PiB7XG4gIGxldCBwYXRoO1xuICBpZiAoIW9wdGlvbnMgfHwgKF8uaGFzKG9wdGlvbnMsICdnbG9iYWwnKSAmJiBvcHRpb25zLmdsb2JhbCA9PT0gdHJ1ZSkpIHtcbiAgICBwYXRoID0gR0xPQkFMX0NPTkZJRztcbiAgfSBlbHNlIHtcbiAgICBwYXRoID0gTE9DQUxfQ09ORklHO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBsZXQgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpO1xuICAgIGxldCBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBwYXJzZWREYXRhW2tleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwYXJzZWREYXRhO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuY29uc3QgZGVsZXRlS2V5ID0gKGtleSwgb3B0aW9ucykgPT4ge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBsZXQgcGF0aCA9IEdMT0JBTF9DT05GSUc7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnZ2xvYmFsJykgJiYgb3B0aW9ucy5nbG9iYWwgPT09IHRydWUpIHtcbiAgICBsZXQgcGF0aCA9IEdMT0JBTF9DT05GSUc7XG4gIH0gZWxzZSB7XG4gICAgbGV0IHBhdGggPSBMT0NBTF9DT05GSUc7XG4gIH1cblxuICBsZXQgY29uZmlnID0gcmVhZChudWxsLCBvcHRpb25zKTtcbiAgbGV0IGRlbGV0ZWQgPSBkZWxldGUgY29uZmlnW2tleV07XG5cbiAgaWYgKGRlbGV0ZWQpIHtcbiAgICBsZXQgZmlsZUNvbnRlbnRzID0gSlNPTi5zdHJpbmdpZnkoY29uZmlnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGgsIGZpbGVDb250ZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVsZXRlZDtcbn07XG5cbmNvbnN0IGlzUHJlc2VudCA9IChnbG9iYWwpID0+IHtcbiAgaWYgKGdsb2JhbCkge1xuICAgIGxldCBwYXRoID0gR0xPQkFMX0NPTkZJRztcbiAgfSBlbHNlIHtcbiAgICBsZXQgcGF0aCA9IExPQ0FMX0NPTkZJRztcbiAgfVxuICByZXR1cm4gZnMuZXhpc3RzU3luYyhwYXRoKTtcbn07XG5cbmNvbnN0IGhhc0tleSA9IChrZXksIG9wdGlvbnMpID0+IHtcbiAgbGV0IGNvbmZpZyA9IHJlYWQobnVsbCwgb3B0aW9ucyk7XG4gIHJldHVybiAodHlwZW9mIGNvbmZpZyAhPT0gJ3VuZGVmaW5lZCcpICYmIGNvbmZpZy5oYXNPd25Qcm9wZXJ0eShrZXkpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBzaXRlQnlOYW1lLFxuICB3cml0ZSxcbiAgcmVhZCxcbiAgZGVsZXRlOiBkZWxldGVLZXksXG4gIGlzUHJlc2VudCxcbiAgaGFzS2V5LFxuICBzaXRlc1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgbWltZSBmcm9tICdtaW1lLXR5cGUvd2l0aC1kYic7XG5cbm1pbWUuZGVmaW5lKCdhcHBsaWNhdGlvbi92bmQudm9vZy5kZXNpZ24uY3VzdG9tK2xpcXVpZCcsIHtleHRlbnNpb25zOiBbJ3RwbCddfSwgbWltZS5kdXBPdmVyd3JpdGUpO1xuXG4vLyBieU5hbWUgOjogc3RyaW5nIC0+IG9iamVjdD9cbmNvbnN0IGJ5TmFtZSA9IChuYW1lKSA9PiB7XG4gIHJldHVybiBjb25maWcuc2l0ZXMoKS5maWx0ZXIoc2l0ZSA9PiB7XG4gICAgcmV0dXJuIHNpdGUubmFtZSA9PT0gbmFtZSB8fCBzaXRlLmhvc3QgPT09IG5hbWU7XG4gIH0pWzBdO1xufTtcblxuLy8gYWRkIDo6IG9iamVjdCAtPiBib29sXG5jb25zdCBhZGQgPSAoZGF0YSkgPT4ge1xuICBpZiAoXy5oYXMoZGF0YSwgJ2hvc3QnKSAmJiBfLmhhcyhkYXRhLCAndG9rZW4nKSkge1xuICAgIGxldCBzaXRlcyA9IGNvbmZpZy5zaXRlcygpO1xuICAgIHNpdGVzLnB1c2goZGF0YSk7XG4gICAgY29uZmlnLndyaXRlKCdzaXRlcycsIHNpdGVzKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG59O1xuXG4vLyByZW1vdmUgOjogc3RyaW5nIC0+IGJvb2xcbmNvbnN0IHJlbW92ZSA9IChuYW1lKSA9PiB7XG4gIGxldCBzaXRlc0luQ29uZmlnID0gY29uZmlnLnNpdGVzKCk7XG4gIGxldCBzaXRlTmFtZXMgPSBzaXRlc0luQ29uZmlnLm1hcChzaXRlID0+IHNpdGUubmFtZSB8fCBzaXRlLmhvc3QpO1xuICBsZXQgaWR4ID0gc2l0ZU5hbWVzLmluZGV4T2YobmFtZSk7XG4gIGlmIChpZHggPCAwKSB7IHJldHVybiBmYWxzZTsgfVxuICBsZXQgZmluYWxTaXRlcyA9IHNpdGVzSW5Db25maWcuc2xpY2UoMCwgaWR4KS5jb25jYXQoc2l0ZXNJbkNvbmZpZy5zbGljZShpZHggKyAxKSk7XG4gIHJldHVybiBjb25maWcud3JpdGUoJ3NpdGVzJywgZmluYWxTaXRlcyk7XG59O1xuXG5jb25zdCBnZXRGaWxlSW5mbyA9IChmaWxlUGF0aCkgPT4ge1xuICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGZpbGVQYXRoKTtcbiAgbGV0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCk7XG4gIHJldHVybiB7XG4gICAgZmlsZTogZmlsZU5hbWUsXG4gICAgc2l6ZTogc3RhdC5zaXplLFxuICAgIGNvbnRlbnRUeXBlOiBtaW1lLmxvb2t1cChmaWxlTmFtZSksXG4gICAgcGF0aDogZmlsZVBhdGgsXG4gICAgdXBkYXRlZEF0OiBzdGF0Lm10aW1lXG4gIH07XG59O1xuXG4vLyBmaWxlc0ZvciA6OiBzdHJpbmcgLT4gb2JqZWN0P1xuY29uc3QgZmlsZXNGb3IgPSAobmFtZSkgPT4ge1xuICBsZXQgZm9sZGVycyA9IFtcbiAgICAnYXNzZXRzJywgJ2NvbXBvbmVudHMnLCAnaW1hZ2VzJywgJ2phdmFzY3JpcHRzJywgJ2xheW91dHMnLCAnc3R5bGVzaGVldHMnXG4gIF07XG5cbiAgbGV0IHdvcmtpbmdEaXIgPSBkaXJGb3IobmFtZSk7XG5cbiAgbGV0IHJvb3QgPSBmaWxlVXRpbHMubGlzdEZvbGRlcnMod29ya2luZ0Rpcik7XG5cbiAgaWYgKHJvb3QpIHtcbiAgICByZXR1cm4gZm9sZGVycy5yZWR1Y2UoZnVuY3Rpb24oc3RydWN0dXJlLCBmb2xkZXIpIHtcbiAgICAgIGlmIChyb290LmluZGV4T2YoZm9sZGVyKSA+PSAwKSB7XG4gICAgICAgIGxldCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHdvcmtpbmdEaXIsIGZvbGRlcik7XG4gICAgICAgIHN0cnVjdHVyZVtmb2xkZXJdID0gZmlsZVV0aWxzLmxpc3RGaWxlcyhmb2xkZXJQYXRoKS5maWx0ZXIoZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlKTtcbiAgICAgICAgICBsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcblxuICAgICAgICAgIHJldHVybiBzdGF0LmlzRmlsZSgpO1xuICAgICAgICB9KS5tYXAoZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlKTtcblxuICAgICAgICAgIHJldHVybiBnZXRGaWxlSW5mbyhmdWxsUGF0aCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cnVjdHVyZTtcbiAgICB9LCB7fSk7XG4gIH1cbn07XG5cbi8vIGRpckZvciA6OiBzdHJpbmcgLT4gc3RyaW5nP1xuY29uc3QgZGlyRm9yID0gKG5hbWUpID0+IHtcbiAgbGV0IHNpdGUgPSBieU5hbWUobmFtZSk7XG4gIGlmIChzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUuZGlyIHx8IHNpdGUucGF0aDtcbiAgfVxufTtcblxuLy8gaG9zdEZvciA6OiBzdHJpbmcgLT4gc3RyaW5nP1xuY29uc3QgaG9zdEZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUpO1xuICBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLmhvc3Q7XG4gIH1cbn07XG5cbi8vIHRva2VuRm9yIDo6IHN0cmluZyAtPiBzdHJpbmc/XG5jb25zdCB0b2tlbkZvciA9IChuYW1lKSA9PiB7XG4gIGxldCBzaXRlID0gYnlOYW1lKG5hbWUpO1xuICBpZiAoc2l0ZSkge1xuICAgIHJldHVybiBzaXRlLnRva2VuIHx8IHNpdGUuYXBpX3Rva2VuO1xuICB9XG59O1xuXG4vLyBuYW1lcyA6OiAqIC0+IFtzdHJpbmddXG5jb25zdCBuYW1lcyA9ICgpID0+IHtcbiAgcmV0dXJuIGNvbmZpZy5zaXRlcygpLm1hcChmdW5jdGlvbihzaXRlKSB7XG4gICAgcmV0dXJuIHNpdGUubmFtZSB8fCBzaXRlLmhvc3Q7XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBieU5hbWUsXG4gIGFkZCxcbiAgcmVtb3ZlLFxuICBmaWxlc0ZvcixcbiAgZGlyRm9yLFxuICBob3N0Rm9yLFxuICB0b2tlbkZvcixcbiAgbmFtZXNcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgcHJvamVjdHMgZnJvbSAnLi9wcm9qZWN0cyc7XG5pbXBvcnQgVm9vZyBmcm9tICd2b29nJztcbmltcG9ydCBmaWxlVXRpbHMgZnJvbSAnLi9maWxlX3V0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UHJvbWlzZX0gZnJvbSAnYmx1ZWJpcmQnO1xuXG5jb25zdCBMQVlPVVRGT0xERVJTID0gWydjb21wb25lbnRzJywgJ2xheW91dHMnXTtcbmNvbnN0IEFTU0VURk9MREVSUyA9IFsnYXNzZXRzJywgJ2ltYWdlcycsICdqYXZhc2NyaXB0cycsICdzdHlsZXNoZWV0cyddO1xuXG5jb25zdCBjbGllbnRGb3IgPSAobmFtZSkgPT4ge1xuICBsZXQgaG9zdCA9IHByb2plY3RzLmhvc3RGb3IobmFtZSk7XG4gIGxldCB0b2tlbiA9IHByb2plY3RzLnRva2VuRm9yKG5hbWUpO1xuICBpZiAoaG9zdCAmJiB0b2tlbikge1xuICAgIHJldHVybiBuZXcgVm9vZyhob3N0LCB0b2tlbik7XG4gIH1cbn07XG5cbmNvbnN0IGdldExheW91dEluZm8gPSAobGF5b3V0KSA9PiB7XG4gIGxldCBuYW1lID0gbGF5b3V0LnRpdGxlLnJlcGxhY2UoL1teXFx3XFwuXFwtXS9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiB7XG4gICAgdGl0bGU6IGxheW91dC50aXRsZSxcbiAgICBsYXlvdXRfbmFtZTogbmFtZSxcbiAgICBjb250ZW50X3R5cGU6IGxheW91dC5jb250ZW50X3R5cGUsXG4gICAgY29tcG9uZW50OiBsYXlvdXQuY29tcG9uZW50LFxuICAgIGZpbGU6IGAke2xheW91dC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bmFtZX1gXG4gIH1cbn07XG5cbmNvbnN0IGdldEFzc2V0SW5mbyA9IChhc3NldCkgPT4ge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IGFzc2V0LmFzc2V0X3R5cGUsXG4gICAgZmlsZW5hbWU6IGFzc2V0LmZpbGVuYW1lLFxuICAgIGZpbGU6IGAke2Fzc2V0LmFzc2V0X3R5cGV9cy8ke2Fzc2V0LmZpbGVuYW1lfWAsXG4gICAgY29udGVudF90eXBlOiBhc3NldC5jb250ZW50X3R5cGVcbiAgfTtcbn07XG5cbmNvbnN0IGdldE1hbmlmZXN0ID0gKG5hbWUpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBQcm9taXNlLmFsbChbZ2V0TGF5b3V0cyhuYW1lKSwgZ2V0TGF5b3V0QXNzZXRzKG5hbWUpXSkudGhlbihmaWxlcyA9PiB7XG4gICAgICByZXNvbHZlKHtcbiAgICAgICAgbGF5b3V0czogZmlsZXNbMF0ubWFwKGdldExheW91dEluZm8pLFxuICAgICAgICBhc3NldHM6IGZpbGVzWzFdLm1hcChnZXRBc3NldEluZm8pXG4gICAgICB9KTtcbiAgICB9LCByZWplY3QpO1xuICB9KTtcbn07XG5cbmNvbnN0IHdyaXRlTWFuaWZlc3QgPSAobmFtZSwgbWFuaWZlc3QpID0+IHtcbiAgbGV0IG1hbmlmZXN0UGF0aCA9IGAke3Byb2plY3RzLmRpckZvcihuYW1lKX0vbWFuaWZlc3QyLmpzb25gO1xuICBmaWxlVXRpbHMud3JpdGVGaWxlKG1hbmlmZXN0UGF0aCwgSlNPTi5zdHJpbmdpZnkobWFuaWZlc3QsIG51bGwsIDIpKTtcbn07XG5cbmNvbnN0IGdlbmVyYXRlUmVtb3RlTWFuaWZlc3QgPSAobmFtZSkgPT4ge1xuICBnZXRNYW5pZmVzdChuYW1lKS50aGVuKF8uY3Vycnkod3JpdGVNYW5pZmVzdCkobmFtZSkpO1xufTtcblxuY29uc3QgcmVhZE1hbmlmZXN0ID0gKG5hbWUpID0+IHtcbiAgbGV0IG1hbmlmZXN0RmlsZVBhdGggPSBwYXRoLmpvaW4ocGF0aC5ub3JtYWxpemUocHJvamVjdHMuZGlyRm9yKG5hbWUpKSwgJ21hbmlmZXN0Mi5qc29uJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhtYW5pZmVzdEZpbGVQYXRoKSkgeyByZXR1cm47IH1cblxuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtYW5pZmVzdEZpbGVQYXRoKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbmNvbnN0IGdldExheW91dENvbnRlbnRzID0gKGlkLCBwcm9qZWN0TmFtZSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNsaWVudEZvcihwcm9qZWN0TmFtZSkubGF5b3V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICByZXNvbHZlKGRhdGEuYm9keSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0QXNzZXRDb250ZW50cyA9IChpZCwgcHJvamVjdE5hbWUpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3IocHJvamVjdE5hbWUpLmxheW91dEFzc2V0KGlkLCB7fSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICBpZiAoZGF0YS5lZGl0YWJsZSkge1xuICAgICAgICByZXNvbHZlKGRhdGEuZGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKGRhdGEucHVibGljX3VybCk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRzID0gKHByb2plY3ROYW1lLCBvcHRzPXt9KSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2xpZW50Rm9yKHByb2plY3ROYW1lKS5sYXlvdXRzKE9iamVjdC5hc3NpZ24oe30sIHtwZXJfcGFnZTogMjUwfSwgb3B0cyksIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycikgfVxuICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRMYXlvdXRBc3NldHMgPSAocHJvamVjdE5hbWUsIG9wdHM9e30pID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjbGllbnRGb3IocHJvamVjdE5hbWUpLmxheW91dEFzc2V0cyhPYmplY3QuYXNzaWduKHt9LCB7cGVyX3BhZ2U6IDI1MH0sIG9wdHMpLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7IHJlamVjdChlcnIpIH1cbiAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEFsbEZpbGVzID0gKHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHByb2plY3REaXIgPSBwcm9qZWN0cy5kaXJGb3IocHJvamVjdE5hbWUpO1xuXG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgZ2V0TGF5b3V0cyhwcm9qZWN0TmFtZSksXG4gICAgICBnZXRMYXlvdXRBc3NldHMocHJvamVjdE5hbWUpXG4gICAgXSkudGhlbigoW2xheW91dHMsIGFzc2V0c10pID0+IHtcblxuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdWxsRmlsZShwcm9qZWN0TmFtZSwgZmlsZVBhdGgpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLm1hcChhID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgYCR7Xy5pbmNsdWRlcyhbJ3N0eWxlc2hlZXQnLCAnaW1hZ2UnLCAnamF2YXNjcmlwdCddLCBhLmFzc2V0X3R5cGUpID8gYS5hc3NldF90eXBlIDogJ2Fzc2V0J31zLyR7YS5maWxlbmFtZX1gKTtcbiAgICAgICAgICByZXR1cm4gcHVsbEZpbGUocHJvamVjdE5hbWUsIGZpbGVQYXRoKTtcbiAgICAgICAgfSkpXG4gICAgICBdKS50aGVuKHJlc29sdmUpO1xuXG4gICAgfSk7XG4gIH0pXG59O1xuXG5jb25zdCBwdXNoQWxsRmlsZXMgPSAocHJvamVjdE5hbWUpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgcHJvamVjdERpciA9IHByb2plY3RzLmRpckZvcihwcm9qZWN0TmFtZSk7XG5cbiAgICBQcm9taXNlLmFsbChbXG4gICAgICBnZXRMYXlvdXRzKHByb2plY3ROYW1lKSxcbiAgICAgIGdldExheW91dEFzc2V0cyhwcm9qZWN0TmFtZSlcbiAgICBdKS50aGVuKChbbGF5b3V0cywgYXNzZXRzXSkgPT4ge1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBsYXlvdXRzLm1hcChsID0+IHtcbiAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpciwgYCR7bC5jb21wb25lbnQgPyAnY29tcG9uZW50cycgOiAnbGF5b3V0cyd9LyR7bm9ybWFsaXplVGl0bGUobC50aXRsZSl9LnRwbGApO1xuICAgICAgICAgIHJldHVybiBwdXNoRmlsZShwcm9qZWN0TmFtZSwgZmlsZVBhdGgpO1xuICAgICAgICB9KS5jb25jYXQoYXNzZXRzLmZpbHRlcihhID0+IFsnanMnLCAnY3NzJ10uaW5kZXhPZihhLmZpbGVuYW1lLnNwbGl0KCcuJykucmV2ZXJzZSgpWzBdKSA+PSAwKS5tYXAoYSA9PiB7XG4gICAgICAgICAgbGV0IGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2plY3REaXIsIGAke18uaW5jbHVkZXMoWydzdHlsZXNoZWV0JywgJ2ltYWdlJywgJ2phdmFzY3JpcHQnXSwgYS5hc3NldF90eXBlKSA/IGEuYXNzZXRfdHlwZSA6ICdhc3NldCd9cy8ke2EuZmlsZW5hbWV9YCk7XG4gICAgICAgICAgcmV0dXJuIHB1c2hGaWxlKHByb2plY3ROYW1lLCBmaWxlUGF0aCk7XG4gICAgICAgIH0pKVxuICAgICAgXSkudGhlbihyZXNvbHZlKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmNvbnN0IGZpbmRMYXlvdXRPckNvbXBvbmVudCA9IChmaWxlTmFtZSwgY29tcG9uZW50LCBwcm9qZWN0TmFtZSkgPT4ge1xuICBsZXQgbmFtZSA9IG5vcm1hbGl6ZVRpdGxlKGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUoZmlsZU5hbWUpKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXR1cm4gY2xpZW50Rm9yKHByb2plY3ROYW1lKS5sYXlvdXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXQuY29tcG9uZW50JzogY29tcG9uZW50IHx8IGZhbHNlXG4gICAgfSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICBsZXQgcmV0ID0gZGF0YS5maWx0ZXIobCA9PiBub3JtYWxpemVUaXRsZShsLnRpdGxlKSA9PSBuYW1lKTtcbiAgICAgIGlmIChyZXQubGVuZ3RoID09PSAwKSB7IHJlamVjdCh1bmRlZmluZWQpIH1cbiAgICAgIHJlc29sdmUocmV0WzBdKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmNvbnN0IGZpbmRMYXlvdXQgPSAoZmlsZU5hbWUsIHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBmaW5kTGF5b3V0T3JDb21wb25lbnQoZmlsZU5hbWUsIGZhbHNlLCBwcm9qZWN0TmFtZSk7XG59O1xuXG5jb25zdCBmaW5kQ29tcG9uZW50ID0gKGZpbGVOYW1lLCBwcm9qZWN0TmFtZSkgPT4ge1xuICByZXR1cm4gZmluZExheW91dE9yQ29tcG9uZW50KGZpbGVOYW1lLCB0cnVlLCBwcm9qZWN0TmFtZSk7XG59O1xuXG5jb25zdCBmaW5kTGF5b3V0QXNzZXQgPSAoZmlsZU5hbWUsIHByb2plY3ROYW1lKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmV0dXJuIGNsaWVudEZvcihwcm9qZWN0TmFtZSkubGF5b3V0QXNzZXRzKHtcbiAgICAgIHBlcl9wYWdlOiAyNTAsXG4gICAgICAncS5sYXlvdXRfYXNzZXQuZmlsZW5hbWUnOiBmaWxlTmFtZVxuICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGVycikgfVxuICAgICAgcmVzb2x2ZShkYXRhWzBdKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5jb25zdCBnZXRGaWxlTmFtZUZyb21QYXRoID0gKGZpbGVQYXRoKSA9PiB7XG4gIHJldHVybiBmaWxlUGF0aC5zcGxpdCgnLycpWzFdO1xufTtcblxuY29uc3QgZ2V0TGF5b3V0TmFtZUZyb21GaWxlbmFtZSA9IChmaWxlTmFtZSkgPT4ge1xuICByZXR1cm4gZmlsZU5hbWUuc3BsaXQoJy4nKVswXTtcbn1cblxuY29uc3QgZmluZEZpbGUgPSAoZmlsZVBhdGgsIHByb2plY3ROYW1lKSA9PiB7XG4gIGxldCB0eXBlID0gZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGgoZmlsZVBhdGgpO1xuICBpZiAoXy5pbmNsdWRlcyhbJ2xheW91dCcsICdjb21wb25lbnQnXSwgdHlwZSkpIHtcbiAgICByZXR1cm4gZmluZExheW91dE9yQ29tcG9uZW50KGdldExheW91dE5hbWVGcm9tRmlsZW5hbWUoZ2V0RmlsZU5hbWVGcm9tUGF0aChmaWxlUGF0aCkpLCAodHlwZSA9PSAnY29tcG9uZW50JyksIHByb2plY3ROYW1lKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmluZExheW91dEFzc2V0KGdldEZpbGVOYW1lRnJvbVBhdGgoZmlsZVBhdGgpLCBwcm9qZWN0TmFtZSk7XG4gIH1cbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVRpdGxlID0gKHRpdGxlKSA9PiB7XG4gIHJldHVybiB0aXRsZS5yZXBsYWNlKC9bXlxcd1xcLVxcLl0vZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xufTtcblxuY29uc3QgZ2V0VHlwZUZyb21SZWxhdGl2ZVBhdGggPSAocGF0aCkgPT4ge1xuICBsZXQgZm9sZGVyID0gcGF0aC5zcGxpdCgnLycpWzBdO1xuICBsZXQgZm9sZGVyVG9UeXBlTWFwID0ge1xuICAgICdsYXlvdXRzJzogJ2xheW91dCcsXG4gICAgJ2NvbXBvbmVudHMnOiAnY29tcG9uZW50JyxcbiAgICAnYXNzZXRzJzogJ2Fzc2V0JyxcbiAgICAnaW1hZ2VzJzogJ2ltYWdlJyxcbiAgICAnamF2YXNjcmlwdHMnOiAnamF2YXNjcmlwdCcsXG4gICAgJ3N0eWxlc2hlZXRzJzogJ3N0eWxlc2hlZXQnXG4gIH07XG5cbiAgcmV0dXJuIGZvbGRlclRvVHlwZU1hcFtmb2xkZXJdO1xufTtcblxuY29uc3Qgbm9ybWFsaXplUGF0aCA9IChwYXRoLCBwcm9qZWN0RGlyKSA9PiB7XG4gIHJldHVybiBwYXRoXG4gICAgLnJlcGxhY2UocHJvamVjdERpciwgJycpXG4gICAgLnJlcGxhY2UoL15cXC8vLCAnJyk7XG59O1xuXG5jb25zdCB3cml0ZUZpbGUgPSAocHJvamVjdE5hbWUsIGZpbGUsIGRlc3RQYXRoKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKE9iamVjdC5rZXlzKGZpbGUpLCAnbGF5b3V0X25hbWUnKSkge1xuICAgICAgICBnZXRMYXlvdXRDb250ZW50cyhmaWxlLmlkLCBwcm9qZWN0TmFtZSkudGhlbihjb250ZW50cyA9PiB7XG4gICAgICAgICAgdHJ5IHsgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShkZXN0UGF0aCkpIH0gY2F0Y2goZSkgeyBpZiAoZS5jb2RlICE9ICdFRVhJU1QnKSB7IHRocm93IGUgfSB9O1xuICAgICAgICAgIGZzLndyaXRlRmlsZShkZXN0UGF0aCwgY29udGVudHMsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGZhbHNlKSB9XG4gICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGdldExheW91dEFzc2V0Q29udGVudHMoZmlsZS5pZCwgcHJvamVjdE5hbWUpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgICAgIHRyeSB7IGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKSB9IGNhdGNoKGUpIHsgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlIH0gfTtcbiAgICAgICAgICBmcy53cml0ZUZpbGUoZGVzdFBhdGgsIGNvbnRlbnRzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdChmYWxzZSkgfVxuICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCB1cmwgPSBmaWxlLnB1YmxpY191cmw7XG4gICAgICAgIHRyeSB7IGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKSB9IGNhdGNoKGUpIHsgaWYgKGUuY29kZSAhPSAnRUVYSVNUJykgeyB0aHJvdyBlIH0gfTtcbiAgICAgICAgbGV0IHN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRlc3RQYXRoKTtcbiAgICAgICAgaWYgKHVybCAmJiBzdHJlYW0pIHtcbiAgICAgICAgICBsZXQgcmVxID0gcmVxdWVzdC5nZXQodXJsKS5vbignZXJyb3InLCAoZXJyKSA9PiByZWplY3QoZmFsc2UpKTtcbiAgICAgICAgICByZXEucGlwZShzdHJlYW0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlamVjdChmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KCk7XG4gICAgfVxuICB9KVxufTtcblxuY29uc3QgdXBsb2FkRmlsZSA9IChwcm9qZWN0TmFtZSwgZmlsZSwgZmlsZVBhdGgpID0+IHtcbiAgbGV0IGNsaWVudCA9IGNsaWVudEZvcihwcm9qZWN0TmFtZSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgIGlmIChfLmluY2x1ZGVzKE9iamVjdC5rZXlzKGZpbGUpLCAnbGF5b3V0X25hbWUnKSkge1xuICAgICAgICBsZXQgY29udGVudHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNsaWVudC51cGRhdGVMYXlvdXQoZmlsZS5pZCwge1xuICAgICAgICAgIGJvZHk6IGNvbnRlbnRzXG4gICAgICAgIH0sIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgaWYgKGVycikgeyByZWplY3QoZmFsc2UpOyB9IGVsc2UgeyByZXNvbHZlKHRydWUpOyB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChmaWxlLmVkaXRhYmxlKSB7XG4gICAgICAgIGxldCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY2xpZW50LnVwZGF0ZUxheW91dEFzc2V0KGZpbGUuaWQsIHtcbiAgICAgICAgICBkYXRhOiBjb250ZW50c1xuICAgICAgICB9LCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgIGlmIChlcnIpIHsgcmVqZWN0KGZhbHNlKTsgfSBlbHNlIHsgcmVzb2x2ZSh0cnVlKTsgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdChmYWxzZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICByZWplY3QoKTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgcHVsbEZpbGUgPSAocHJvamVjdE5hbWUsIGZpbGVQYXRoKSA9PiB7XG4gIGxldCBwcm9qZWN0RGlyID0gcHJvamVjdHMuZGlyRm9yKHByb2plY3ROYW1lKTtcblxuICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGZpbGVQYXRoLCBwcm9qZWN0RGlyKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZpbmRGaWxlKG5vcm1hbGl6ZWRQYXRoLCBwcm9qZWN0TmFtZSkudGhlbihmaWxlID0+IHtcbiAgICAgIGlmICghZmlsZSB8fCB0eXBlb2YgZmlsZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVzb2x2ZSh3cml0ZUZpbGUocHJvamVjdE5hbWUsIGZpbGUsIGZpbGVQYXRoKSk7XG4gICAgfSlcbiAgfSk7XG59XG5cbmNvbnN0IHB1c2hGaWxlID0gKHByb2plY3ROYW1lLCBmaWxlUGF0aCkgPT4ge1xuICBsZXQgcHJvamVjdERpciA9IHByb2plY3RzLmRpckZvcihwcm9qZWN0TmFtZSk7XG4gIGxldCBub3JtYWxpemVkUGF0aCA9IG5vcm1hbGl6ZVBhdGgoZmlsZVBhdGgsIHByb2plY3REaXIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZmluZEZpbGUobm9ybWFsaXplZFBhdGgsIHByb2plY3ROYW1lKS50aGVuKGZpbGUgPT4ge1xuICAgICAgaWYgKCFmaWxlIHx8IHR5cGVvZiBmaWxlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZWplY3QoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZSh1cGxvYWRGaWxlKHByb2plY3ROYW1lLCBmaWxlLCBmaWxlUGF0aCkpO1xuICAgIH0pXG4gIH0pO1xufTtcblxuY29uc3QgcHVzaEFsbCA9IChwcm9qZWN0TmFtZSkgPT4ge1xuICByZXR1cm4gWydwdXNoIGV2ZXJ5dGhpbmcnXTtcbn07XG5cbmNvbnN0IGFkZCA9IChwcm9qZWN0TmFtZSwgZmlsZXMpID0+IHtcbiAgcmV0dXJuIFsnYWRkIGZpbGVzJywgZmlsZXNdO1xufTtcblxuY29uc3QgcmVtb3ZlID0gKHByb2plY3ROYW1lLCBmaWxlcykgPT4ge1xuICByZXR1cm4gWydyZW1vdmUgZmlsZXMnLCBmaWxlc107XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGNsaWVudEZvcixcbiAgcHVsbEFsbEZpbGVzLFxuICBwdXNoQWxsRmlsZXMsXG4gIGZpbmRMYXlvdXQsXG4gIGZpbmRMYXlvdXRBc3NldCxcbiAgcHVzaEZpbGUsXG4gIHB1bGxGaWxlLFxuICBnZXRNYW5pZmVzdCxcbiAgcmVhZE1hbmlmZXN0LFxuICB3cml0ZU1hbmlmZXN0OiBnZW5lcmF0ZVJlbW90ZU1hbmlmZXN0XG59O1xuXG4iLCJ7XG4gIFwibmFtZVwiOiBcImtpdC1jb3JlXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC4xXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJcIixcbiAgXCJtYWluXCI6IFwiaW5kZXguanNcIixcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1tIGlubGluZSAtYyAmJiBlY2hvIGBlY2hvICQoZGF0ZSArXFxcIlslSDolTTolU11cXFwiKSByZWJ1aWx0IC4vaW5kZXguanNgXCIsXG4gICAgXCJ3YXRjaFwiOiBcIndhdGNoICducG0gcnVuIGJ1aWxkJyAuL3NyY1wiLFxuICAgIFwidGVzdFwiOiBcIm5vZGUgLi90ZXN0L3Rlc3QuanNcIixcbiAgICBcIndhdGNoOnRlc3RcIjogXCJ3YXRjaCAnbnBtIHJ1biBidWlsZCAmJiBucG0gcnVuIHRlc3QnIC4vc3JjIC4vdGVzdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiTWlrayBQcmlzdGF2a2FcIixcbiAgXCJsaWNlbnNlXCI6IFwiSVNDXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJsdWViaXJkXCI6IFwiXjMuMy4xXCIsXG4gICAgXCJoaWdobGFuZFwiOiBcIl4yLjcuMVwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJtaW1lLWRiXCI6IFwiXjEuMjIuMFwiLFxuICAgIFwibWltZS10eXBlXCI6IFwiXjMuMC40XCIsXG4gICAgXCJyZXF1ZXN0XCI6IFwiXjIuNjkuMFwiLFxuICAgIFwidm9vZ1wiOiBcImdpdCtodHRwczovL2dpdGh1Yi5jb20vVm9vZy92b29nLmpzLmdpdFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJhYmVsLWNsaVwiOiBcIl42LjUuMVwiLFxuICAgIFwiYmFiZWwtcHJlc2V0LWVzMjAxNS1yb2xsdXBcIjogXCJeMS4xLjFcIixcbiAgICBcInJvbGx1cFwiOiBcIl4wLjI1LjRcIixcbiAgICBcInJvbGx1cC1wbHVnaW4tYmFiZWxcIjogXCJeMi4zLjlcIixcbiAgICBcInJvbGx1cC1wbHVnaW4tanNvblwiOiBcIl4yLjAuMFwiLFxuICAgIFwid2F0Y2hcIjogXCJeMC4xNy4xXCJcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZpbGVVdGlscyBmcm9tICcuL2ZpbGVfdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgcHJvamVjdHMgZnJvbSAnLi9wcm9qZWN0cyc7XG5pbXBvcnQgYWN0aW9ucyBmcm9tICcuL2FjdGlvbnMnO1xuaW1wb3J0IHt2ZXJzaW9ufSBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGZpbGVVdGlscyxcbiAgY29uZmlnLFxuICBwcm9qZWN0cyxcbiAgYWN0aW9ucyxcbiAgdmVyc2lvbixcbn07XG4iXSwibmFtZXMi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