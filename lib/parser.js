'use strict';

let assign = require('object-assign'),
    path = require('path'),
    mongoose = require('mongoose'),
    Validate = require('mongoose-validator'),
    jaffamvc = require('jaffamvc-koa'),
    Promise = require('native-or-bluebird');

module.exports = Parser;

function Parser (options) {
  options = options||{};

  if (options.path) {
    this.path = path.resolve(options.path);
  }

  this._schemas = {};
}


assign(Parser.prototype, {
  initialize: function () {
    if (!this.path) return Promise.resolve(this._schemas);

    let exts = ['.json','.js','.coffee','.cson'];
    // Read all files in this.path
    var self = this;
    return jaffamvc.utils.requireDir(this.path, function *(mod, file) {
      let basename = path.basename(file, path.extname(file))

      if (mod != null) {
        self._schemas[basename.toLowerCase()] = mod;
      }
    }, exts, true)
    .then(function () {
      return self.schemas;
    });

  },
  list: function () {
    return Object.keys(this._schemas);
  },
  get: function (name) {
    let schema = this._schemas[name];
    if (!schema) return null;
    return toMongoose.call(this, schema);
  },
  set: function (name, def) {
    this._schemas[name.toLowerCase()] = def;
  }
});

const _has = Object.prototype.hasOwnProperty;

function toMongoose (schema) {
  let Types = mongoose.Schema.Types, out = {}, k, v, val, isArray;

  for (k in schema) {
    v = schema[k];

    isArray = Array.isArray(v);

    // unwrap array
    if (isArray) v = v[0];

    val = assign({}, v);

    if(!_has.call(val,'type')) {
      // Nested
      out[k] = toMongoose.call(this, val);
      continue;
    }

    // Schema
    if (val.type === 'schema' && _has.call(val,'schema')) {
      val.type = this.get(val.schema);
    } else {
      val.type = Types[val.type];
    }

    // rewrap array
    if (isArray) val = [val];

    val.validate = parseValidation(val.validate);

    out[k] = val;
  }

  return out;
}


function parseValidation (validation) {
  if (!validation) return [];
  return validation.map(function (v) {
    return Validate(v);
  });
}
