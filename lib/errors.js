
'use strict';

let util = require('util');

module.exports = DataStoreError;

function DataStoreError (code, msg) {
  DataStoreError.call(this, msg);
  this.code = code;
  this.message = msg;
}

util.inherits(DataStoreError, Error);

exports.create = function (code, msg) {
  return new DataStoreError(code, msg);
};
