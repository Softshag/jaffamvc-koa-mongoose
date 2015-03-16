'use strict';

let assign = require('object-assign'),
  mongoose = require('mongoose'),
  util = require('util'),
  co = require('co'),
  Promise = require('native-or-bluebird'),
  EventEmitter = require('events').EventEmitter,
  errors = require('./errors'),
  Parser = require('./parser'),
  Path = require('path'),
  jaffamvc = require('jaffamvc-koa'),
  debug = require('debug')('mvc:mongoose'),
  fs = require('mz/fs');

module.exports = MongoStore;

function MongoStore(options) {
  this.opts = options;
  this.connection = null;

  this._schemas = {};
  this._models = {};
  this.parser = new Parser(options);
}

util.inherits(MongoStore, EventEmitter);

Object.defineProperty(MongoStore.prototype, 'db', {
  get: function() {
    if (this.connection == null) return null;
    return this.connection.db;
  }
});

assign(MongoStore.prototype, {
  /**
   * Connect to mongodb
   * @return {Promise}
   */
  connect: function() {
    return co(function * () {

      this.connection = yield getConnection(this.opts);

      this.delegateEvents();


      if (this.opts.models) {
        debug('using model patH: %s', this.opts.models);
        let dp = Path.resolve(this.opts.models, 'schemas');

        if (yield fs.exists(dp)) {
          debug('using schema path: %s', dp);
          this.parser.path = dp;

          yield this.parser.initialize();
        }



        let schemas = yield initSchemas(this.opts.models, this.parser);
        this._schemas = schemas;
      }


    }.bind(this));
  },

  /**
   * Disconnect
   * @return {Promise}
   */
  disconnect: function(force) {
    force = force || true;

    if (this.connection) {
      var self = this;
      this.undelegateEvents();
      return new Promise(function(resolve, reject) {
        self.connection.close(function(err) {
          if (err) return reject(err);
          self.connection = null;
          resolve();
        });
      });
    }
    return Promise.resolve();
  },

  /**
   * Drop the database
   * @return {Promise}
   */
  dropDataBase: function() {
    let self = this;
    return new Promise(function(resolve, reject) {
      if (self.db == null) {
        return reject(errors.create(400, 'Not connected'));
      }
      return self.db.dropDatabase(function(err) {
        if (err != null) {
          return reject(err);
        }
        return resolve();
      });
    });

  },

  /**
   * Drop a collection
   * @param  {String} col the name of the collection
   * @return {Promise}
   */
  dropCollection: function(col) {
    return this.model(col).remove().exec();
  },

  /**
   * Get the names of all collections in the database
   * @return {Promise<Array<String>>}
   */
  collectionNames: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      let cols, dbName;
      if (self.db == null) {
        return reject(errors.create(400, 'Not connected'));
      }
      dbName = self.db.databaseName;
      cols = Object.keys(self.connection.collections);
      return resolve(cols);
    });

  },

  /**
   * Check whether a collection exists
   * @param  {String}  col the name of the collection
   * @return {Promise<Boolean>}
   */
  hasCollection: function(col) {
    return this.collectionNames().then(function(cols) {
      if (~cols.indexOf(col)) return true;
      return false;
    });
  },

  model: function(name) {
    let model, schema = this.schema(name);
    if (!schema) return null;

    try {
      model = mongoose.model(name);
    } catch (e) {
      model = mongoose.model(name, schema);
    }
    return model;
  },

  schema: function(name) {
    if (this._schemas.hasOwnProperty(name)) {
      return this._schemas[name];
    }

    let def = this.parser.get(name);

    if (!def) return null;

    let schema = new mongoose.Schema(def);

    this._schemas[name] = schema;

    return schema;
  },

  /**
   * @private
   * @return {[type]} [description]
   */
  delegateEvents: function() {
    this.connection.on('error', function(err) {
      this.trigger('error', err);
    }.bind(this));
  },

  /**
   * @private
   * @return {[type]} [description]
   */
  undelegateEvents: function() {
    this.connection.removeAllListeners('error');
  }

});


/* Privates */
function getConnectionString(opts) {
  let str = '';
  if (opts.user && opts.pass)
    str = opts.user + ':' + opts.pass;
  return util.format('mongodb://%s%s:%s/%s', str, opts.host, opts.port, opts.db);
}

function getConnection(opts) {
  var cStr = getConnectionString(opts);

  return new Promise(function(resolve, reject) {
    debug('connecting to %s', cStr);

    mongoose.connect(cStr);

    let conn = mongoose.connection;

    conn.once('open', function() {
      debug('connection open');
      conn.removeListener('error', reject);
      resolve(conn);
    });

    conn.once('error', function(err) {
      conn.removeListener('open', resolve);
      reject(err);
    });

  });
}

function initSchemas(modelPath, parser) {
  let schemas = {},
    self = this,
    schema;
  modelPath = Path.resolve(modelPath);

  return jaffamvc.utils.requireDir(modelPath, function * (mod, file) {

    let basename = Path.basename(file, Path.extname(file));

    debug('loading schema: %s', basename);
    schemas[basename] = schema = mod.call(self, mongoose.Schema, parser);
    debug('initializing model: %s', basename);

    if (schema) {
      schema.set('autoIndex', process.env.NODE_ENV === 'development');
    }
  }).then(function() {
    return schemas;
  });
}
