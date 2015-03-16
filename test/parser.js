'use strict';

let Parser = require('../lib/parser'),
    mongoose = require('mongoose');

describe('Parser', function() {

  before(function () {
    this.parser = new Parser();
  });

  it('should parse json', function() {

    this.parser.set('card', {
      name: {
        type: "String",
        required: true,
        validate: [
          {
            validator: "isLength",
            arguments: [0, 20]
          }
        ]
      },
      tags: [{
        type: "String"
      }]
    });

    let schema = this.parser.get('card');

    schema.should.have.property('name');

    let name = schema.name;
    name.should.have.property('type');
    name.type.should.be.equal(mongoose.Schema.Types.String);
    name.should.have.property('required', true);
    name.should.have.property('validate');


  });

});
