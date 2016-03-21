'use strict';

import config from './config';
import projects from './projects';
import Voog from 'voog';
import fileUtils from './file_utils';
import fs from 'fs';
import _ from 'lodash';
import request from 'request';
import path from 'path';
import {Promise} from 'bluebird';

const LAYOUTFOLDERS = ['components', 'layouts'];
const ASSETFOLDERS = ['assets', 'images', 'javascripts', 'stylesheets'];

const clientFor = (name) => {
  let host = projects.hostFor(name);
  let token = projects.tokenFor(name);
  if (host && token) {
    return new Voog(host, token);
  }
};

const getLayoutContents = (projectName, id) => {
  return new Promise((resolve, reject) => {
    clientFor(projectName).layout(id, {}, (err, data) => {
      if (err) { reject(err) }
      resolve(data.body);
    });
  });
};

const getLayoutAssetContents = (projectName, id) => {
  return new Promise((resolve, reject) => {
    clientFor(projectName).layoutAsset(id, {}, (err, data) => {
      if (err) { reject(err) }
      if (data.editable) {
        resolve(data.data);
      } else {
        resolve(data.public_url);
      }
    })
  });
};

const getLayouts = (projectName, opts={}) => {
  return new Promise((resolve, reject) => {
    clientFor(projectName).layouts(Object.assign({}, {per_page: 250}, opts), (err, data) => {
      if (err) { reject(err) }
      resolve(data);
    });
  });
};

const getLayoutAssets = (projectName, opts={}) => {
  return new Promise((resolve, reject) => {
    clientFor(projectName).layoutAssets(Object.assign({}, {per_page: 250}, opts), (err, data) => {
      if (err) { reject(err) }
      resolve(data);
    });
  });
};

const pullAllFiles = (projectName) => {
  return new Promise((resolve, reject) => {
    let projectDir = projects.dirFor(projectName);

    Promise.all([
      getLayouts(projectName),
      getLayoutAssets(projectName)
    ]).then(([layouts, assets]) => {
      Promise.all([
        layouts.map(l => {
          let filePath = path.join(projectDir, `${l.component ? 'components' : 'layouts'}/${normalizeTitle(l.title)}.tpl`);
          return pullFile(projectName, filePath);
        }).concat(assets.map(a => {
          let filePath = path.join(projectDir, `${_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset'}s/${a.filename}`);
          return pullFile(projectName, filePath);
        }))
      ]).then(resolve);

    });
  })
};

const pushAllFiles = (projectName) => {
  return new Promise((resolve, reject) => {
    let projectDir = projects.dirFor(projectName);

    Promise.all([
      getLayouts(projectName),
      getLayoutAssets(projectName)
    ]).then(([layouts, assets]) => {
      Promise.all([
        layouts.map(l => {
          let filePath = path.join(projectDir, `${l.component ? 'components' : 'layouts'}/${normalizeTitle(l.title)}.tpl`);
          return pushFile(projectName, filePath);
        }).concat(assets.map(a => {
          let filePath = path.join(projectDir, `${_.includes(['stylesheet', 'image', 'javascript'], a.asset_type) ? a.asset_type : 'asset'}s/${a.filename}`);
          return pushFile(projectName, filePath);
        }))
      ]).then(resolve);
    });
  });
}

const findLayoutOrComponent = (fileName, component, projectName) => {
  let name = normalizeTitle(getLayoutNameFromFilename(fileName));
  return new Promise((resolve, reject) => {
    return clientFor(projectName).layouts({
      per_page: 250,
      'q.layout.component': component || false
    }, (err, data) => {
      if (err) { reject(err) }
      let ret = data.filter(l => normalizeTitle(l.title) == name);
      if (ret.length === 0) { reject(undefined) }
      resolve(ret[0]);
    });
  });
}

const findLayout = (fileName, projectName) => {
  return findLayoutOrComponent(fileName, false, projectName);
};

const findComponent = (fileName, projectName) => {
  return findLayoutOrComponent(fileName, true, projectName);
};

const findLayoutAsset = (fileName, projectName) => {
  return new Promise((resolve, reject) => {
    return clientFor(projectName).layoutAssets({
      per_page: 250,
      'q.layout_asset.filename': fileName
    }, (err, data) => {
      if (err) { reject(err) }
      resolve(data[0]);
    });
  });
};

const getFileNameFromPath = (filePath) => {
  return filePath.split('/')[1];
};

const getLayoutNameFromFilename = (fileName) => {
  return fileName.split('.')[0];
}

const findFile = (filePath, projectName) => {
  let type = getTypeFromRelativePath(filePath);
  if (_.includes(['layout', 'component'], type)) {
    return findLayoutOrComponent(getLayoutNameFromFilename(getFileNameFromPath(filePath)), (type == 'component'), projectName);
  } else {
    return findLayoutAsset(getFileNameFromPath(filePath), projectName);
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

const normalizePath = (path, projectDir) => {
  return path
    .replace(projectDir, '')
    .replace(/^\//, '');
};

const writeFile = (projectName, file, destPath) => {
  return new Promise((resolve, reject) => {
    if (file) {
      if (_.includes(Object.keys(file), 'layout_name')) {
        getLayoutContents(projectName, file.id).then(contents => {
          try { fs.mkdirSync(path.dirname(destPath)) } catch(e) { if (e.code != 'EEXIST') { throw e } };
          fs.writeFile(destPath, contents, (err) => {
            if (err) { reject(false) }
            resolve(file);
          });
        })
      } else if (file.editable) {
        getLayoutAssetContents(projectName, file.id).then(contents => {
          try { fs.mkdirSync(path.dirname(destPath)) } catch(e) { if (e.code != 'EEXIST') { throw e } };
          fs.writeFile(destPath, contents, (err) => {
            if (err) { reject(false) }
            resolve(file);
          });
        })
      } else {
        let url = file.public_url;
        try { fs.mkdirSync(path.dirname(destPath)) } catch(e) { if (e.code != 'EEXIST') { throw e } };
        let stream = fs.createWriteStream(destPath);
        if (url && stream) {
          let req = request.get(url).on('error', (err) => reject(false));
          req.pipe(stream);
          resolve(file);
        } else {
          reject(false);
        }
      }
    } else {
      reject();
    }
  })
};

const uploadFile = (projectName, file, filePath) => {
  let client = clientFor(projectName);
  return new Promise((resolve, reject) => {
    if (file) {
      if (_.includes(Object.keys(file), 'layout_name')) {
        let contents = fs.readFileSync(filePath, 'utf8');
        client.updateLayout(file.id, {
          body: contents
        }, (err, data) => {
          (err ? reject : resolve)(file)
        });
      } else if (file.editable) {
        let contents = fs.readFileSync(filePath, 'utf8');
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

const pullFile = (projectName, filePath) => {
  let projectDir = projects.dirFor(projectName);

  let normalizedPath = normalizePath(filePath, projectDir);

  return new Promise((resolve, reject) => {
    findFile(normalizedPath, projectName).then(file => {
      if (!file || typeof file === 'undefined') {
        reject();
        return;
      }

      resolve(writeFile(projectName, file, filePath));
    })
  });
}

const pushFile = (projectName, filePath) => {
  let projectDir = projects.dirFor(projectName);
  let normalizedPath = normalizePath(filePath, projectDir);

  return new Promise((resolve, reject) => {
    findFile(normalizedPath, projectName).then(file => {
      if (!file || typeof file === 'undefined') {
        return reject(file);
      }
      resolve(uploadFile(projectName, file, filePath));
    })
  });
};

const pushAll = (projectName) => {
  return ['push everything'];
};

const add = (projectName, files) => {
  return ['add files', files];
};

const remove = (projectName, files) => {
  return ['remove files', files];
};

export default {
  clientFor,
  pullAllFiles,
  pushAllFiles,
  findLayout,
  findLayoutAsset,
  pushFile,
  pullFile
};

