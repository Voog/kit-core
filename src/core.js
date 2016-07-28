'use strict';

import {version} from '../package.json';

import fileUtils from './file_utils';
import config from './config';
import sites from './sites';
import actions from './actions';

export default {
  fileUtils,
  config,
  sites,
  actions,
  version
};
