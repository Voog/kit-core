'use strict';

import config from './config';
import sites from './sites';
import Voog from 'voog';
import fileUtils from './file_utils';
import fs from 'fs';
import _ from 'lodash';
import request from 'request';
import path from 'path';
import {Promise} from 'bluebird';

const LAYOUTFOLDERS = ['components', 'layouts'];
const ASSETFOLDERS = ['assets', 'images', 'javascripts', 'stylesheets'];

const clientFor = (name, options) => {
  let host = sites.hostFor(name, options);
  let token = sites.tokenFor(name, options);

  if (host && token) {
    return new Voog(host, token);
  }
};

const getLayoutContents = (siteName, id) => {
  return new Promise((resolve, reject) => {
    clientFor(siteName).layout(id, {}, (err, data) => {
      if (err) { reject(err) }
      resolve(data.body);
    });
  });
};

const getLayoutAssetContents = (siteName, id) => {
  return new Promise((resolve, reject) => {
    clientFor(siteName).layoutAsset(id, {}, (err, data) => {
      if (err) { reject(err) }
      if (data.editable) {
        resolve(data.data);
      } else {
        resolve(data.public_url);
      }
    })
  });
};

const getLayouts = (siteName, opts={}) => {
  return new Promise((resolve, reject) => {
    clientFor(siteName)
      .layouts(Object.assign({}, {per_page: 250}, opts), (err, data) => {
        if (err) { reject(err) }
        resolve(data);
      });
  });
};

const getLayoutAssets = (siteName, opts={}) => {
  return new Promise((resolve, reject) => {
    clientFor(siteName)
      .layoutAssets(Object.assign({}, {per_page: 250}, opts), (err, data) => {
        if (err) { reject(err) }
        resolve(data);
      });
  });
};

const pullAllFiles = (siteName) => {
  return new Promise((resolve, reject) => {
    let siteDir = sites.dirFor(siteName);

    Promise.all([
      getLayouts(siteName),
      getLayoutAssets(siteName)
    ]).then(([layouts, assets]) => {
      Promise.all([
        layouts.map(l => {
          let filePath = path.join(siteDir, `${l.component ? 'components' : 'layouts'}/${normalizeTitle(l.title)}.tpl`);
          return pullFile(siteName, filePath);
        }).concat(assets.map(a => {
          let filePath = path.join(siteDir, `${_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset'}s/${a.filename}`);
          return pullFile(siteName, filePath);
        }))
      ]).then(resolve);

    });
  })
};

const pushAllFiles = (siteName) => {
  return new Promise((resolve, reject) => {
    let siteDir = sites.dirFor(siteName);

    // assets.filter(a => ['js', 'css'].indexOf(a.filename.split('.').reverse()[0]) >= 0)

    Promise.all([
      getLayouts(siteName),
      getLayoutAssets(siteName)
    ]).then(([layouts, assets]) => {
      Promise.all([
        layouts.map(l => {
          let filePath = path.join(siteDir, `${l.component ? 'components' : 'layouts'}/${normalizeTitle(l.title)}.tpl`);
          return pushFile(siteName, filePath);
        }).concat(assets.map(a => {
          let filePath = path.join(siteDir, `${_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset'}s/${a.filename}`);
          return pushFile(siteName, filePath);
        }))
      ]).then(resolve);
    });
  });
}

const findLayoutOrComponent = (fileName, component, siteName, options) => {
  let name = normalizeTitle(getLayoutNameFromFilename(fileName));
  return new Promise((resolve, reject) => {
    return clientFor(siteName, options).layouts({
      per_page: 250,
      'q.layout.component': component || false
    }, (err, data) => {
      if (err) { reject(err) }
      let ret = data.filter(l => normalizeTitle(l.title) == name);
      if (ret.length === 0) { reject(undefined); }
      resolve(_.head(ret));
    });
  });
}

const findLayout = (fileName, siteName, options) => {
  return findLayoutOrComponent(fileName, false, siteName, options);
};

const findComponent = (fileName, siteName, options) => {
  return findLayoutOrComponent(fileName, true, siteName, options);
};

const findLayoutAsset = (fileName, siteName, options) => {
  return new Promise((resolve, reject) => {
    return clientFor(siteName, options).layoutAssets({
      per_page: 250,
      'q.layout_asset.filename': fileName
    }, (err, data) => {
      if (err) { reject(err) }
      resolve(_.head(data));
    });
  });
};

const getFileNameFromPath = (filePath) => {
  return filePath.split('/')[1];
};

const getLayoutNameFromFilename = (fileName) => {
  return _.head(fileName.split('.'));
}

const findFile = (filePath, siteName, options) => {
  let type = getTypeFromRelativePath(filePath);
  let fileName = getFileNameFromPath(filePath);
  if (_.includes(['layout', 'component'], type)) {
    return findLayoutOrComponent(fileName, (type == 'component'), siteName, options);
  } else {
    return findLayoutAsset(fileName, siteName, options);
  }
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

const normalizePath = (path, siteDir) => {
  return path
    .replace(siteDir, '')
    .replace(/^\//, '');
};

const writeFile = (siteName, file, destPath) => {
  return new Promise((resolve, reject) => {
    if (file) {
      if (_.includes(Object.keys(file), 'layout_name')) {
        getLayoutContents(siteName, file.id).then(contents => {
          try { fs.mkdirSync(path.dirname(destPath)) } catch(e) { if (e.code != 'EEXIST') { throw e } };
          fs.writeFile(destPath, contents, (err) => {
            if (err) { reject(err) }
            resolve(file);
          });
        })
      } else if (file.editable) {
        getLayoutAssetContents(siteName, file.id).then(contents => {
          try { fs.mkdirSync(path.dirname(destPath)) } catch(e) { if (e.code != 'EEXIST') { throw e } };
          fs.writeFile(destPath, contents, (err) => {
            if (err) { reject(err) }
            resolve(file);
          });
        })
      } else {
        let url = file.public_url;
        try { fs.mkdirSync(path.dirname(destPath)) } catch(e) { if (e.code != 'EEXIST') { throw e } };
        let stream = fs.createWriteStream(destPath);
        if (url && stream) {
          let req = request.get(url).on('error', (err) => reject(err));
          req.pipe(stream);
          resolve(file);
        } else {
          reject(null);
        }
      }
    } else {
      reject();
    }
  })
};

const uploadFile = (siteName, file, filePath, options) => {
  let client = clientFor(siteName, options);
  return new Promise((resolve, reject) => {
    console.log(file);
    if (file) {
      if (_.includes(Object.keys(file), 'layout_name')) {
        let contents = fs.readFileSync(filePath, 'utf8');
        console.log("contents:", contents);
        client.updateLayout(file.id, {
          body: contents
        }, (err, data) => {
          (err ? reject : resolve)(file)
        });
      } else if (file.editable) {
        let contents = fs.readFileSync(filePath, 'utf8');
        console.log("contents:", contents);
        client.updateLayoutAsset(file.id, {
          data: contents
        }, (err, data) => {
          (err ? reject : resolve)(file)
        });
      } else {
        resolve(file);
      }
    } else {
      reject(file);
    }
  });
};

const pullFile = (siteName, filePath, options) => {
  let siteDir = sites.dirFor(siteName, options);

  let normalizedPath = normalizePath(filePath, siteDir);

  return new Promise((resolve, reject) => {
    findFile(normalizedPath, siteName, options).then(file => {
      if (!file || typeof file === 'undefined') {
        reject();
        return;
      }

      resolve(writeFile(siteName, file, filePath, options));
    })
  });
}

const pushFile = (siteName, filePath, options) => {
  let siteDir = sites.dirFor(siteName, options);
  let normalizedPath = normalizePath(filePath, siteDir);

  return new Promise((resolve, reject) => {
    findFile(normalizedPath, siteName, options).then(file => {
      if (!file || typeof file === 'undefined') {
        return reject(file);
      }
      resolve(uploadFile(siteName, file, filePath, options));
    })
  });
};

export default {
  clientFor,
  pullAllFiles,
  pushAllFiles,
  findFile,
  pushFile,
  pullFile
};
