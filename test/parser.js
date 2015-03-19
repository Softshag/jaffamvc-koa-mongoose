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

    schema.should.have.properties('name','tags');

    // Name Property
    let name = schema.name;
    name.should.have.property('type');
    name.type.should.be.equal(mongoose.Schema.Types.String);
    name.should.have.property('required', true);
    name.should.have.property('validate');

    let validate = name.validate;
    validate.should.instanceOf(Array).with.length(1);
    validate[0].should.have.properties('msg','validator');

    // Tags
    let tags = schema.tags;
    tags.should.be.instanceOf(Array).with.length(1);
    tags[0].should.be.instanceOf(Object).with.properties('type','validate');
    tags[0].validate.should.be.instanceOf(Array).with.length(0);
    tags[0].type.should.be.equal(mongoose.Schema.Types.String);

  });

});
