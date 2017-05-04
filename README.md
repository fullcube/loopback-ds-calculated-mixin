CALCULATED MIXIN
================

[![Greenkeeper badge](https://badges.greenkeeper.io/fullcube/loopback-ds-calculated-mixin.svg)](https://greenkeeper.io/)

[![CircleCI](https://circleci.com/gh/fullcube/loopback-ds-calculated-mixin.svg?style=svg)](https://circleci.com/gh/fullcube/loopback-ds-calculated-mixin) [![Coverage Status](https://coveralls.io/repos/github/fullcube/loopback-ds-calculated-mixin/badge.svg?branch=master)](https://coveralls.io/github/fullcube/loopback-ds-calculated-mixin?branch=master)  [![Dependencies](http://img.shields.io/david/fullcube/loopback-ds-calculated-mixin.svg?style=flat)](https://david-dm.org/fullcube/loopback-ds-calculated-mixin) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This is a mixin for the LoopBack framework that adds calculated properties to a model.

A calculated property is a property of which the value is set once just before it is persisted to the data source.

The mixin enables you to define a callback that will be run in the `before save` operation hook to calculate and set the
value for a given property.

INSTALL
================

```bash
npm install --save loopback-ds-calculated-mixin
```

SERVER CONFIG
=============
Add the mixins property to your server/model-config.json:

```json
{
  "_meta": {
    "sources": [
      "loopback/common/models",
      "loopback/server/models",
      "../common/models",
      "./models"
    ],
    "mixins": [
      "loopback/common/mixins",
      "../node_modules/loopback-ds-calculated-mixin/lib",
      "../common/mixins"
    ]
  }
}
```

CONFIG
=============

To use with your Models add the `mixins` attribute to the definition object of your model config.

The property you want to calculate has to be defined in the model. The callback can be a promise too.

```json
{
  "name": "Item",
  "properties": {
    "name": "String",
    "description": "String",
    "status": "String",
    "readonly": "boolean"
  },
  "mixins": {
    "Calculated": {
      "properties": {
        "readonly": "calculateReadonly",
        "isTest": {
          "recalculateOnUpdate": true,
          "callback": "calculateIsTest"  
        }
      }
    }
  }
}
```

On your model you have to define the callback methods.

```javascript
// Set an item to readonly if status is 'archived'.
Item.calculateReadonly = function calculateReadonly(item) {
  return item.status === 'archived';
};
// Set an isTest if name is 'test'.
Item.calculateIsTest = function calculateIsTest(item) {
  return item.name === 'test'
};

```

USAGE
=============

When saving a new model instance, your callback will be called automatically. The property value will be set to the value
that your callback returns.

By default, the calculated mixin is only called when saving a new instance. You can make it run on updates in addition
by setting `recalculateOnUpdate` in the mixin config for your property.

If you set `skipCalculated` to true when creating or updating a model instance, the mixin will not run:

```javascript
Model.create({
  name: 'Bilbo',
  status: 'active'
  readonly: true,
  isTest: true
}, { skipCalculated: true })
```

CAVEATS
=============

`updateAll`, is not currently supported as this could result in a large amount database queries and excessive memory
usage. If you need to recalculate values en-mass our recommendation is to first apply your changes using `updateAll`,
and then use the same where query to retrieve the result set in batches and apply your calculations manually.

TESTING
=============

Run the tests in `test.js`

```bash
  npm test
```

DEBUGGING
=============

Run with debugging output on:

```bash
  DEBUG='loopback:mixin:calculated' npm test
```
