'use strict';

import {version} from '../package.json';

import fs from 'fs';

import fileUtils from './file_utils';
import config from './config';
import projects from './projects';
import actions from './actions';

import {default as project} from './project_context';
import {functions as scopedFunctions} from './project_context';

export default Object.assign({},
  scopedFunctions, {
  fileUtils,
  config,
  projects,
  actions,
  version,
  project
});
