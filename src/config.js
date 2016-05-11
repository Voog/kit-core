'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import CustomError from './custom_error';

const CONFIG_FILENAME = '.voog';

const HOMEDIR = process.env.HOME;
const LOCALDIR = process.cwd();

const LOCAL_CONFIG = path.join(LOCALDIR, CONFIG_FILENAME);
const GLOBAL_CONFIG = path.join(HOMEDIR, CONFIG_FILENAME);

const siteByName = (name, options) => {
  return _.head(
    sites(options).filter(p => p.name === name)
  );
};

const sites = (options) => {
  return read('sites', options) || [];
};

const write = (key, value, options) => {
  let filePath = configPathFromOptions(options);

  let config = read(null, options) || {};
  config[key] = value;

  let fileContents = JSON.stringify(config, null, 2);

  fs.writeFileSync(filePath, fileContents);
  return true;
};

const read = (key, options) => {
  let filePath = configPathFromOptions(options);

  let data = fs.readFileSync(filePath, 'utf8');
  let parsedData = JSON.parse(data);

  if (typeof key === 'string') {
    return parsedData[key];
  } else {
    return parsedData;
  }
};

const configPathFromOptions = (options = {}) => {
  if ((_.has(options, 'global') && options.global === true)) {
    try {
      if (fs.statSync(GLOBAL_CONFIG).isFile()) {
        return GLOBAL_CONFIG;
      } else {
        throw new CustomError('Unable to find configuration file!', GLOBAL_CONFIG);
      }
    } catch (e) {
      throw new CustomError('Unable to find configuration file!', GLOBAL_CONFIG);
    }
  } else if (_.has(options, 'local') && options.local === true) {
    try {
      if (fs.statSync(LOCAL_CONFIG).isFile()) {
        return LOCAL_CONFIG;
      } else {
        throw new Error;
      }
    } catch (e) {
      let filePath = path.join(LOCAL_CONFIG, '../..', CONFIG_FILENAME);
      try {
        if (fs.statSync(filePath).isFile()) {
          return filePath;
        } else {
          throw new CustomError('Unable to find configuration file!', filePath);
        }
      } catch (e) {
        throw new CustomError('Unable to find configuration file!', filePath);
      }
      throw new CustomError('Unable to find configuration file!', LOCAL_CONFIG);
    }
  } else if (_.has(options, 'config_path')) {
    try {
      if (fs.statSync(options.config_path).isFile()) {
        return options.config_path;
      } else {
        throw new CustomError('Unable to find configuration file!', options.config_path);
      }
    } catch(e) {
      throw new CustomError('Unable to find configuration file!', options.config_path);
    }
  } else {
    try {
      if (fs.statSync(GLOBAL_CONFIG).isFile()) {
        return GLOBAL_CONFIG;
      } else {
        throw new CustomError('Unable to find configuration file!', GLOBAL_CONFIG);
      }
    } catch (e) {
      throw new CustomError('Unable to find configuration file!', GLOBAL_CONFIG);
    }
  }
}

export default {
  siteByName,
  write,
  read,
  sites,
  configPathFromOptions
};
