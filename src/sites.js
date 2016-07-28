'use strict';

import config from './config';
import fileUtils from './file_utils';
import path from 'path';
import _ from 'lodash';
import fs from 'fs';
import mime from 'mime-type/with-db';

mime.define('application/vnd.voog.design.custom+liquid', {extensions: ['tpl']}, mime.dupOverwrite);

const byName = (name, options = {}) => {
  return config.siteByName(name, options);
};

const add = (data, options = {}) => {
  if (_.has(data, 'host') && _.has(data, 'token')) {
    let sites = config.sites(options);
    sites.push(data);
    config.write('sites', sites, options);
    return true;
  } else {
    return false;
  }
};

const remove = (name, options = {}) => {
  let sitesInConfig = config.sites(options);
  let siteNames = sitesInConfig.map(site => site.name || site.host);
  let idx = siteNames.indexOf(name);
  if (idx < 0) { return false; }
  let finalSites = sitesInConfig
    .slice(0, idx)
    .concat(sitesInConfig.slice(idx + 1));

  return config.write('sites', finalSites, options);
};

const getFileInfo = (filePath) => {
  let stat = fs.statSync(filePath);

  if (stat.isFile()) {
    let fileName = path.basename(filePath);
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

const totalFilesFor = (siteName) => {
  let files = filesFor(siteName);
  return Object.keys(files).reduce((total, folder) => total + files[folder].length, 0);
};

const filesFor = (name) => {
  let folders = [
    'assets', 'components', 'images', 'javascripts', 'layouts', 'stylesheets'
  ];

  let workingDir = dirFor(name);

  let root = fileUtils.listFolders(workingDir);

  if (root) {
    return folders.reduce((structure, folder) => {
      if (root.indexOf(folder) >= 0) {
        let folderPath = path.join(workingDir, folder);
        structure[folder] = fileUtils.listFiles(folderPath).filter(function(file) {
          let fullPath = path.join(folderPath, file);
          let stat = fs.statSync(fullPath);

          return stat.isFile();
        }).map(file => {
          let fullPath = path.join(folderPath, file);

          return getFileInfo(fullPath);
        });
      }
      return structure;
    }, {});
  }
};

const dirFor = (name, options = {}) => {
  let site = byName(name, options);;
  if (options.dir || options.path) {
    return options.dir || options.path;
  } else if (site) {
    return site.dir || site.path;
  }
};

const hostFor = (name, options = {}) => {
  let site = byName(name, options);
  if (options.host) {
    return options.host;
  } else if (site) {
    return site.host;
  }
};

const tokenFor = (name, options = {}) => {
  let site = byName(name, options);
  if (options.token || options.api_token) {
    return options.token || options.api_token;
  } else if (site) {
    return site.token || site.api_token;
  }
};

const names = (options) => {
  return config.sites(options).map(site => site.name || site.host);
};

const hosts = (options) => {
  return config.sites(options).map(site => site.host);
};

export default {
  byName,
  add,
  remove,
  totalFilesFor,
  filesFor,
  dirFor,
  hostFor,
  tokenFor,
  names,
  hosts,
  getFileInfo
};
