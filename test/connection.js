
'use strict';

var MongoStore = require('../lib/mongo-store');

describe('connection', function () {

  before(function * () {
    this.store = new MongoStore({
      host: 'localhost',
      port: 27017,
      db: 'test-db'
    });
  });

  it('should connect', function *() {
    yield this.store.connect();
    this.store.connection.should.not.be.null;
    this.store.db.should.not.be.null;
    this.store.db.should.equal(this.store.connection.db);
  });

  it('should disconnect', function *() {
    yield this.store.disconnect();
    (this.store.connection == null).should.be.true;
  })
});
