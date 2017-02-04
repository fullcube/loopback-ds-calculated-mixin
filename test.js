/* jshint mocha: true */

var debug = require('debug')('loopback-ds-calculated-mixin');
var utils = require('loopback-datasource-juggler/lib/utils');

var loopback = require('loopback');

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('chai-datetime'));
chai.use(require('sinon-chai'));
require('mocha-sinon');

// Create a new loopback app.
var app = loopback();

// Set up promise support for loopback in non-ES6 runtime environment.
global.Promise = require('bluebird');

// import our Changed mixin.
require('./')(app);

// Connect to db
var dbConnector = loopback.memory();

var Item = loopback.PersistedModel.extend('item', {
  name: String,
  status: String,
  readonly: Boolean,
  readonlyRecalculated: Boolean,
  promised: String,
}, {
  mixins: {
    Calculated: {
      properties: {
        created: 'calculateCreated',
        readonly: {
          callback: 'calculateReadonly',
          recalculateOnUpdate: true,
        },
        promised: 'calculatePromised',
      },
    }
  }
});

Item.calculateReadonly = function calculateReadonly(item) {
  return item.status === 'archived';
};

Item.calculateCreated = function calculateCreated(item) {
  return new Date();
};

Item.calculatePromised = function calculatePromised(item, cb) {
  cb = cb || utils.createPromiseCallback();
  process.nextTick(function() {
    cb(null, 'As promised I get back to you!');
  });
  return cb.promise;
};

// Attach model to db
Item.attachTo(dbConnector);
app.model(Item);
app.use(loopback.rest());
app.set('legacyExplorer', false);

beforeEach(function() {
  this.sinon.spy(Item, 'calculateReadonly')
  this.sinon.spy(Item, 'calculateCreated')
  this.sinon.spy(Item, 'calculatePromised')
  this.clock = this.sinon.useFakeTimers();
});

describe('Creating new items', function() {
  describe('findOrCreate', function() {
    beforeEach(function() {
      return Item.findOrCreate({
        name: 'Item 3',
        status: 'new',
      })
        .then(item => (this.res = item[0]))
    });
    describe('basic', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateCreated).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(new Date(this.res.created)).to.equalDate(new Date('1970-01-01'))
      });
    });
    describe('promise', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculatePromised).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.promised).to.equal('As promised I get back to you!');
      });
    })
    describe('recalculateOnUpdate', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateReadonly).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.readonly).to.equal(false);
      });
    });
  });

  describe('upsert', function() {
    beforeEach(function() {
      return Item.upsert({
        name: 'Item 3',
        status: 'new',
      })
        .then(item => (this.res = item))
    });
    describe('basic', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateCreated).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(new Date(this.res.created)).to.equalDate(new Date('1970-01-01'))
      });
    });
    describe('promise', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculatePromised).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.promised).to.equal('As promised I get back to you!');
      });
    })
    describe('recalculateOnUpdate', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateReadonly).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.readonly).to.equal(false);
      });
    });
  });

  describe('save', function() {
    beforeEach(function() {
      var item = new Item({
        name: 'Item',
        status: 'new',
      })
      return item.save()
        .then(item => (this.res = item));
    });
    describe('basic', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateCreated).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(new Date(this.res.created)).to.equalDate(new Date('1970-01-01'))
      });
    });
    describe('promise', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculatePromised).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.promised).to.equal('As promised I get back to you!');
      });
    })
    describe('recalculateOnUpdate', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateReadonly).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.readonly).to.equal(false);
      });
    });
  });
});

describe('Updating existing items', function() {
  describe('save', function() {
    beforeEach(function() {
      var item = new Item({
        name: 'Item',
        status: 'new',
      })
      return item.save()
        .then(item => {
          item.status = 'archived'
          return item.save()
        })
        .then(item => (this.res = item));
    });
    describe('basic', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateCreated).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(new Date(this.res.created)).to.equalDate(new Date('1970-01-01'))
      });
    });
    describe('promise', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculatePromised).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.promised).to.equal('As promised I get back to you!');
      });
    })
    describe('recalculateOnUpdate', function() {
      it('should call the defined callback twice', function() {
        expect(Item.calculateReadonly).to.have.been.calledTwice
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.readonly).to.equal(true);
      });
    });
  });

  describe('upsert', function() {
    beforeEach(function() {
      var item = new Item({
        name: 'Item',
        status: 'new',
      })
      return item.save()
        .then(item => {
          item.status = 'archived'
          return Item.upsert(item)
        })
        .then(item => (this.res = item));
    });
    describe('basic', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateCreated).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(new Date(this.res.created)).to.equalDate(new Date('1970-01-01'))
      });
    });
    describe('promise', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculatePromised).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.promised).to.equal('As promised I get back to you!');
      });
    })
    describe('recalculateOnUpdate', function() {
      it('should call the defined callback twice', function() {
        expect(Item.calculateReadonly).to.have.been.calledTwice
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.readonly).to.equal(true);
      });
    });
  });

  describe('updateAttributes', function() {
    beforeEach(function() {
      var item = new Item({
        name: 'Item',
        status: 'new',
      })
      return item.save()
        .then(item => item.updateAttribute('status', 'archived'))
        .then(item => (this.res = item));
    });
    describe('basic', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculateCreated).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(new Date(this.res.created)).to.equalDate(new Date('1970-01-01'))
      });
    });
    describe('promise', function() {
      it('should call the defined callback once', function() {
        expect(Item.calculatePromised).to.have.been.calledOnce
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.promised).to.equal('As promised I get back to you!');
      });
    })
    describe('recalculateOnUpdate', function() {
      it('should call the defined callback twice', function() {
        expect(Item.calculateReadonly).to.have.been.calledTwice
      });
      it('should set property to the callbacks return value', function() {
        expect(this.res.readonly).to.equal(true);
      });
    });
  });

});
