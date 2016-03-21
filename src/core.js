'use strict';

import {version} from '../package.json';

import fs from 'fs';

import fileUtils from './file_utils';
import config from './config';
import projects from './projects';
import actions from './actions';

export default {
  fileUtils,
  config,
  projects,
  actions,
  version,
};
