'use strict';

import sites from './sites';
import Voog from 'voog';
import fileUtils from './file_utils';
import fs from 'fs';
import _ from 'lodash';
import request from 'request';
import path from 'path';
import {Promise} from 'bluebird';

const clientFor = (name, options = {}) => {
  let host = sites.hostFor(name, options);
  let token = sites.tokenFor(name, options);
  let protocol = options.protocol;

  if (host && token) {
    return new Voog(host, token, protocol);
  }
};

const getTotalFileCount = (name, options = {}) => {
  return new Promise((resolve, reject) => {
    Promise.all([getLayouts(name, options), getLayoutAssets(name, options)]).then(([layouts, assets]) => {
      resolve(layouts.length + assets.length);
    }).catch(reject);
  });
};

const getLayoutContents = (siteName, id, options = {}) => {
  return new Promise((resolve, reject) => {
    clientFor(siteName, options).layout(id, {}, (err, data) => {
      if (err) { reject(err); }
      resolve(data.body);
    });
  });
};

const getLayoutAssetContents = (siteName, id, options = {}) => {
  return new Promise((resolve, reject) => {
    clientFor(siteName, options).layoutAsset(id, {}, (err, data) => {
      if (err) { reject(err); }
      if (data.editable) {
        resolve(data.data);
      } else {
        resolve(data.public_url);
      }
    });
  });
};

const getLayouts = (siteName, options = {}) => {
  return new Promise((resolve, reject) => {
    clientFor(siteName, options)
      .layouts(Object.assign({}, {per_page: 250}, options), (err, data) => {
        if (err) { reject(err); }
        resolve(data);
      });
  });
};

const getLayoutAssets = (siteName, options = {}) => {
  return new Promise((resolve, reject) => {
    clientFor(siteName, options)
      .layoutAssets(Object.assign({}, {per_page: 250}, options), (err, data) => {
        if (err) { reject(err); }
        resolve(data);
      });
  });
};

const pullAllFiles = (siteName, options = {}) => {
  return new Promise((resolve, reject) => {
    let siteDir = sites.dirFor(siteName, options);

    Promise.all([
      getLayouts(siteName, options),
      getLayoutAssets(siteName, options)
    ]).then(([layouts, assets]) => {
      Promise.all([
        layouts.map(l => {
          let filePath = path.join(siteDir, `${l.component ? 'components' : 'layouts'}/${normalizeTitle(l.title)}.tpl`);
          return pullFile(siteName, filePath, options);
        }).concat(assets.map(a => {
          let filePath = path.join(siteDir, `${_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset'}s/${a.filename}`);
          return pullFile(siteName, filePath, options);
        }))
      ]).then(resolve);
    }).catch(reject);
  });
};

const getFolderContents = (siteName, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    switch (folder) {
    case 'layouts':
      getLayouts(siteName, options).then(layouts => resolve(layouts.filter(l => !l.component))).catch(reject);
      break;
    case 'components':
      getLayouts(siteName, options).then(layouts => resolve(layouts.filter(l => l.component))).catch(reject);
      break;
    case 'assets':
      getLayoutAssets(siteName, options).then(assets => resolve(assets.filter(a => !_.includes(['stylesheet', 'image', 'javascript'], a.asset_type)))).catch(reject);
      break;
    case 'images':
      getLayoutAssets(siteName, options).then(assets => resolve(assets.filter(a => a.asset_type === 'image'))).catch(reject);
      break;
    case 'javascripts':
      getLayoutAssets(siteName, options).then(assets => resolve(assets.filter(a => a.asset_type === 'javascript'))).catch(reject);
      break;
    case 'stylesheets':
      getLayoutAssets(siteName, options).then(assets => resolve(assets.filter(a => a.asset_type === 'stylesheet'))).catch(reject);
      break;
    default:
      resolve([]);
    }
  });
};

const getFileTypeForFolder = (folder) => {
  return {
    'layouts': 'layout',
    'components': 'layout',
    'assets': 'asset',
    'images': 'asset',
    'javascripts': 'asset',
    'stylesheets': 'asset'
  }[folder];
};

const pullFolder = (siteName, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    let siteDir = sites.dirFor(siteName, options);
    let fileType = getFileTypeForFolder(folder);

    Promise.all(getFolderContents(siteName, folder, options)).then(files => {
      Promise.map(files, f => {
        let filePath;
        if (fileType === 'layout') {
          filePath = path.join(siteDir, `${f.component ? 'components' : 'layouts'}/${normalizeTitle(f.title)}.tpl`);
        } else if (fileType === 'asset') {
          filePath = path.join(siteDir, `${_.includes(['stylesheet', 'image', 'javascript'], f.asset_type) ? f.asset_type : 'asset'}s/${f.filename}`);
        }
        if (filePath) {
          return pullFile(siteName, filePath, options);
        }
      }).then(resolve);
    }).catch(reject);
  });
};

const pushFolder = (siteName, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    let siteDir = sites.dirFor(siteName, options);
    let fileType = getFileTypeForFolder(folder);

    Promise.all(getFolderContents(siteName, folder, options)).then(files => {
      Promise.map(files, f => {
        let filePath;
        if (fileType === 'layout') {
          filePath = path.join(siteDir, `${f.component ? 'components' : 'layouts'}/${normalizeTitle(f.title)}.tpl`);
        } else if (fileType === 'asset') {
          filePath = path.join(siteDir, `${_.includes(['stylesheet', 'image', 'javascript'], f.asset_type) ? f.asset_type : 'asset'}s/${f.filename}`);
        }
        if (filePath) {
          return pushFile(siteName, filePath, options);
        }
      }).then(resolve);
    }).catch(reject);
  });
};

const pushAllFiles = (siteName, options = {}) => {
  return new Promise((resolve, reject) => {
    let siteDir = sites.dirFor(siteName, options);

    Promise.all([
      getLayouts(siteName, options),
      getLayoutAssets(siteName, options)
    ]).then(([layouts, assets]) => {
      Promise.all([
        layouts.map(l => {
          let filePath = path.join(siteDir, `${l.component ? 'components' : 'layouts'}/${normalizeTitle(l.title)}.tpl`);
          return pushFile(siteName, filePath, options);
        }).concat(assets.map(a => {
          let filePath = path.join(siteDir, `${_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset'}s/${a.filename}`);
          return pushFile(siteName, filePath, options);
        }))
      ]).then(resolve);
    }).catch(reject);
  });
};

const findLayoutOrComponent = (fileName, component, siteName, options = {}) => {
  let name = normalizeTitle(getLayoutNameFromFilename(fileName));
  return new Promise((resolve, reject) => {
    return clientFor(siteName, options).layouts({
      per_page: 250,
      'q.layout.component': component || false
    }, (err, data = []) => {
      if (err) { reject(err); }
      let ret = data.filter(l => normalizeTitle(l.title).toLowerCase() == name.toLowerCase());
      if (ret.length === 0) { resolve(undefined); }
      resolve(_.head(ret));
    });
  });
};

const findLayoutAsset = (fileName, siteName, options = {}) => {
  return new Promise((resolve, reject) => {
    return clientFor(siteName, options).layoutAssets({
      per_page: 250,
      'q.layout_asset.filename': fileName
    }, (err, data) => {
      if (err) { reject(err); }
      resolve(_.head(data));
    });
  });
};

const getFileNameFromPath = (filePath) => {
  return filePath.split('/')[1];
};

const getLayoutNameFromFilename = (fileName) => {
  return _.head(fileName.split('.tpl'));
};

const findFile = (filePath, siteName, options = {}) => {
  let type = getTypeFromRelativePath(filePath);
  let fileName = getFileNameFromPath(filePath);

  if (_.includes(['layout', 'component'], type)) {
    return findLayoutOrComponent(fileName, (type == 'component'), siteName, options);
  } else {
    return findLayoutAsset(fileName, siteName, options);
  }
};

const titleFromFilename = (fileName) => {
  return _.head(fileName.split('.')).replace(/_/, ' ');
};

const normalizeTitle = (title) => {
  return title.replace(/[^\w\-\.]/g, '_').toLowerCase();
};

const getTypeFromRelativePath = (path) => {
  let folder = path.split('/')[0];
  let folderToTypeMap = {
    'layouts': 'layout',
    'components': 'component',
    'assets': 'asset',
    'images': 'image',
    'javascripts': 'javascript',
    'stylesheets': 'stylesheet'
  };

  return folderToTypeMap[folder];
};

const getTypeFromExtension = (fileName) => {
  if (fileName.split('.').length > 1) {
    let extension = _.last(fileName.split('.'));

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

const getSubfolderForType = (type) => {
  return {
    'asset': 'assets',
    'image': 'images',
    'javascript': 'javascripts',
    'stylesheet': 'stylesheets',
    'component': 'components',
    'layout': 'layouts'
  }[type];
};

const normalizePath = (path, siteDir) => {
  return path
    .replace(siteDir, '')
    .replace(/^\//, '');
};

const writeFile = (siteName, file, destPath, options = {}) => {
  return new Promise((resolve, reject) => {
    if (_.includes(Object.keys(file), 'layout_name')) {
      getLayoutContents(siteName, file.id, options).then(contents => {
        try {
          fs.mkdirSync(path.dirname(destPath));
        } catch (e) {
          if (e.code != 'EEXIST') { throw e; }
        }

        fs.writeFile(destPath, contents, (err) => {
          if (err) { reject(err); }
          resolve(file);
        });
      });
    } else if (file.editable) {
      getLayoutAssetContents(siteName, file.id, options).then(contents => {
        try {
          fs.mkdirSync(path.dirname(destPath));
        } catch (e) {
          if (e.code != 'EEXIST') { throw e; }
        }
        fs.writeFile(destPath, contents, (err) => {
          if (err) { reject(err); }
          resolve(file);
        });
      });
    } else {
      let url = file.public_url;
      try {
        fs.mkdirSync(path.dirname(destPath));
      } catch (e) {
        if (e.code != 'EEXIST') { throw e; }
      }

      let stream = fs.createWriteStream(destPath);
      if (url && stream) {
        let req = request.get(url).on('error', (err) => reject(err));
        req.pipe(stream);
        resolve(file);
      } else {
        reject(null);
      }
    }
  });
};

const uploadFile = (siteName, file, filePath, options = {}) => {
  let client = clientFor(siteName, options);
  return new Promise((resolve, reject) => {
    if (file) {
      if (_.includes(Object.keys(file), 'layout_name')) {
        let contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayout(file.id, {
          body: contents
        }, (err, data) => {
          (err ? reject : resolve)(data);
        });
      } else if (file.editable) {
        let contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayoutAsset(file.id, {
          data: contents
        }, (err, data) => {
          (err ? reject : resolve)(data);
        });
      } else if (options.overwrite) {
        let siteDir = sites.dirFor(siteName, options);
        var fileName = normalizePath(filePath, siteDir);
        deleteFile(siteName, fileName, options).then(() => {
          createFile(siteName, fileName, options).then(resolve).catch(reject);
        });
      } else {
        resolve({failed: true, file: filePath, message: 'Unable to update file!'});
      }
    } else {
      createFile(siteName, filePath, options).then(resolve).catch(reject);
    }
  });
};

const createFile = (siteName, filePath, options = {}) => {
  let client = clientFor(siteName, options);
  return new Promise((resolve, reject) => {
    let type = getTypeFromRelativePath(filePath);
    let file = fileObjectFromPath(filePath);

    if (_.includes(['layout', 'component'], type)) {
      client.createLayout(file, (err, data) => {
        if (err) {
          resolve({failed: true, file: file, message: 'Unable to create file!'});
        } else {
          resolve(data);
        }
      });
    } else {
      client.createLayoutAsset(file, (err, data) => {
        if (err) {
          resolve({failed: true, file: file, message: 'Unable to create file!'});
        } else {
          resolve(data);
        }
      });
    }
  });
};

const fileObjectFromPath = (filePath, options = {}) => {
  let type = getTypeFromRelativePath(filePath);
  let fileName = getFileNameFromPath(filePath);

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
    let obj = {
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

const pullFile = (siteName, filePath, options = {}) => {
  let siteDir = sites.dirFor(siteName, options);
  let normalizedPath = normalizePath(filePath, siteDir);

  return new Promise((resolve, reject) => {
    findFile(normalizedPath, siteName, options).then(file => {
      if (!file || typeof file === 'undefined') {
        resolve({failed: true, file: filePath, message: 'File not found'});
      } else {
        resolve(writeFile(siteName, file, filePath, options));
      }
    });
  });
};

const pushFile = (siteName, filePath, options = {}) => {
  let siteDir = sites.dirFor(siteName, options);
  let normalizedPath = normalizePath(filePath, siteDir);

  return new Promise((resolve, reject) => {
    findFile(normalizedPath, siteName, options).then(file => {
      if (!file || typeof file === 'undefined') {
        resolve({failed: true, file: filePath, message: 'File not found'});
      } else {
        resolve(uploadFile(siteName, file, filePath, options));
      }
    });
  });
};

const addFile = (siteName, fileName, options = {}) => {
  return new Promise((resolve, reject) => {
    let file;
    let type;

    if (fileName.split('/').length > 1) {
      file = getFileNameFromPath(fileName, options);
      type = getTypeFromRelativePath(fileName);
    } else {
      file = fileName;
      type = getTypeFromExtension(fileName);
    }

    let subFolder = getSubfolderForType(type);
    let projectDir = sites.dirFor(siteName, options);
    let finalPath = path.join(projectDir, subFolder, file);

    let relativePath = finalPath.replace(projectDir + '/', '');

    if (fileUtils.fileExists(relativePath, options) || typeof fileUtils.writeFile(relativePath, '') == 'undefined') {
      resolve(createFile(siteName, relativePath, options));
    } else {
      resolve({failed: true, file: fileName, message: 'Unable to create file!'});
    }
  });
};

const deleteFile = (siteName, fileName, options) => {
  let client = clientFor(siteName, options);

  return new Promise((resolve, reject) => {
    let type = getTypeFromRelativePath(fileName);

    findFile(fileName, siteName, options).then(file => {
      if (_.includes(['layout', 'component'], type)) {
        client.deleteLayout(file.id, (err, data) => {
          (err ? reject : resolve)(data);
        });
      } else {
        client.deleteLayoutAsset(file.id, (err, data) => {
          (err ? reject : resolve)(data);
        });
      }
    });
  });
};

const removeFile = (siteName, fileName, options = {}) => {
  return new Promise((resolve, reject) => {
    let file;
    let type;

    if (fileName.split('/').length > 1) {
      file = getFileNameFromPath(fileName, options);
      type = getTypeFromRelativePath(fileName);
    } else {
      file = fileName;
      type = getTypeFromExtension(fileName);
    }

    let subFolder = getSubfolderForType(type);
    let projectDir = sites.dirFor(siteName, options);
    let finalPath = path.join(projectDir, subFolder, file);

    let relativePath = finalPath.replace(projectDir + '/', '');

    if (fileUtils.fileExists(finalPath, options) || typeof fileUtils.deleteFile(relativePath) == 'undefined') {
      resolve(deleteFile(siteName, relativePath, options));
    } else {
      resolve({failed: true, file: fileName, message: 'Unable to remove file!'});
    }
  });
};

export default {
  clientFor,
  getTotalFileCount,
  pullAllFiles,
  pushAllFiles,
  findFile,
  pushFile,
  pullFile,
  pullFolder,
  pushFolder,
  createFile,
  addFile,
  removeFile
};
