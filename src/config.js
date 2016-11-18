'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import CustomError from './custom_error';

const CONFIG_FILENAME = '.voog';

const HOMEDIR = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
const LOCALDIR = process.cwd();

const LOCAL_CONFIG = path.join(LOCALDIR, CONFIG_FILENAME);
const GLOBAL_CONFIG = path.join(HOMEDIR, CONFIG_FILENAME);

const findLocalConfig = () => {
  if (fileExists(path.join(path.resolve(LOCALDIR, '..'), CONFIG_FILENAME))) {
    return path.join(path.resolve(LOCALDIR, '..'), CONFIG_FILENAME);
  } else {
    return LOCAL_CONFIG;
  }
};

const siteByName = (name, options = {}) => {
  return _.head(
    sites(options)
    .filter(p => p.name === name || p.host === name)
  );
};

const sites = (options = {}) => {
  return read('sites', options) || [];
};

const write = (key, value, options = {}) => {
  let filePath = pathFromOptions(options);

  if (!configExists(filePath)) {
    create(options);
  }

  let config = read(null, options) || {};
  config[key] = value;

  let fileContents = JSON.stringify(config, null, 2);

  fs.writeFileSync(filePath, fileContents);
  return true;
};

const updateSite = (name, updates = {}, options = {}) => {
  let site = siteByName(name, options);
  if (!site) { return false; }

  let currentSites = sites(options);
  let idx = _.findIndex(currentSites, (s) => s.name === site.name || s.host === site.host);
  currentSites[idx] = Object.assign({}, site, updates);

  write('sites', currentSites, options);
};

const read = (key, options = {}) => {
  let filePath = pathFromOptions(options);

  if (!configExists(options)) {
    if (filePath === LOCAL_CONFIG && configExists(Object.assign({}, options, {}))) {
      filePath = GLOBAL_CONFIG;
    } else {
      throw new CustomError('Configuration file not found!');
    }
  }

  let data = fs.readFileSync(filePath, 'utf8');
  let parsedData = JSON.parse(data);

  if (typeof key === 'string') {
    return parsedData[key];
  } else {
    return parsedData;
  }
};

const create = (options = {}) => {
  let filePath = pathFromOptions(options);

  if (!configExists(options)) {
    fs.writeFileSync(filePath, '{}');
    return true;
  } else {
    return false;
  }
};

const pathFromOptions = (options = {}) => {
  if ((_.has(options, 'global') && options.global === true)) {
    return GLOBAL_CONFIG;
  } else if (_.has(options, 'local') && options.local === true) {
    return findLocalConfig();
  } else if (_.has(options, 'configPath') || _.has(options, 'config_path')) {
    return options.configPath || options.config_path;
  } else {
    return findLocalConfig();
  }
};

const fileExists = (filePath) => {
  try {
    return fs.statSync(filePath).isFile();
  } catch (e) {
    return false;
  }
};

const configExists = (options = {}) => {
  return fileExists(pathFromOptions(options));
};

export default {
  siteByName,
  sites,
  write,
  updateSite,
  read,
  create,
  pathFromOptions,
  configExists
};
