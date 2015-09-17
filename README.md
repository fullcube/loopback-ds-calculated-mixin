CALCULATED
================

This is a mixin for the LoopBack framework that adds calculated properties to a model.

A calculated property is a property of which the value is set once just before it is persisted to the data source.

- The mixin uses the `before save` observer.
- It only runs when a single instance gets saved, e.g. it checks `ctx.instance`.
- It only runs when it is a new instance, e.g. it checks `ctx.isNewInstance`.
- It overrides the configured property if it gets submitted to the API.

INSTALL
=============

```bash
npm install --save loopback-ds-calculated-mixin
```

SERVER.JS
=============

In your `server/server.js` file add the following line before the `boot(app, __dirname);` line.

```javascript
...
var app = module.exports = loopback();
...
// Add Calculated Mixin to loopback
require('loopback-ds-calculated-mixin')(app);

boot(app, __dirname, function(err) {
  'use strict';
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
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
                "readonly": "calculateReadonly"
            }
        }
    }
}
```

On your model you have to define the callback method.

```javascript
// Set an item to readonly if status is archived
Item.calculateReadonly = function calculateReadonly(item) {
  return item.status === 'archived';
};

```

TESTING
=============

Run the tests in `test.js`

```bash
  npm test
```

Run with debugging output on:

```bash
  DEBUG='loopback-ds-calculated-mixin' npm test
```

# MIT License