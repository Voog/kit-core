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

    // updates config if extra options are provided and given site already exists
    var matchSite = site => site.host === data.host || site.name === data.name;
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
  let site = byName(name, options);
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
const hostFor = (name, options = {}) => {
  let site = byName(name, options);
  let host;
  if (options.host) {
    host = options.host;
  } else if (site) {
    host = site.host;
  }
  if (host) {
    return (options.protocol ? `${options.protocol}://` : '') + host.replace(/^https?:\/\//, '');
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
