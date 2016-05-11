// Taken from https://gist.github.com/justmoon/15511f92e5216fa2624b
import { inherits } from 'util';

'use strict';

export default function CustomError(message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.extra = extra;
};

inherits(CustomError, Error);
