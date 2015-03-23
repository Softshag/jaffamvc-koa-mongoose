
'use strict';

let MongoStore = require('./mongo-store');

module.exports = function (options) {

  if (!options)
    throw new Error('Mongo cennection options not specified!');

  return function *() {
    let store = new MongoStore(options);


    this.model = store.model.bind(store);
    this.schema = store.schema.bind(store);

    this.context.model = this.model;
    this.context.schema = this.schema;

    this.store = store;

    this.on('close', function () {
      this.store.disconnect();
    });

    yield store.connect();

  };

};
