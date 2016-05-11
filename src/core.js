'use strict';

import {version} from '../package.json';

import fs from 'fs';

import fileUtils from './file_utils';
import config from './config';
import sites from './sites';
import actions from './actions';
import {default as site} from './site_context';

export default {
  fileUtils,
  config,
  sites,
  actions,
  site,
  version
};
