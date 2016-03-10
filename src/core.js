'use strict';

import fs from 'fs';
import fileUtils from './file_utils';
import config from './config';
import projects from './projects';
import actions from './actions';
import {version} from '../package.json';

export default {
  fileUtils,
  config,
  projects,
  actions,
  version,
};
