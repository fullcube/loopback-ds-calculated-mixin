'use strict';

var debug = require('debug')('loopback-ds-calculated-mixin');
var _ = require('lodash');

module.exports = function(Model, options) {

  // Trigger a warning and remove the property from the watchlist when one of
  // the property is not found on the model or the defined callback is not found
  _.mapKeys(options.properties, function(callback, property) {
    if (_.isUndefined(Model.definition.properties[property])) {
      debug('Property %s on %s is undefined', property, Model.modelName);
    }

    if (typeof Model[callback] !== 'function') {
      debug('Callback %s for %s is not a model function', callback, property);
    }
  });

  debug('Calculated mixin for Model %s with options %o', Model.modelName, options);

  // The loaded observer is triggered when an item is loaded
  Model.observe('before save', function(ctx, next) {
    // Allow user to bypass calculation by setting `skipCalculated` option.
    if (ctx.options && ctx.options.skipCalculated) {
      return next();
    }
    // We only act on new instances
    if (ctx.instance !== undefined && ctx.isNewInstance !== undefined && ctx.isNewInstance === true) {
      Promise.map(Object.keys(options.properties), function(property) {
        var callback = options.properties[property];

        if (typeof Model[callback] !== 'function') {
          debug('Function %s not found on Model', callback);
          return false;
        }

        debug('Calculating property %s with callback %s', property, callback);

        var value = Model[callback](ctx.instance);
        if (value === undefined) {
          debug('Callback returned undefined. Not setting property');
          return false;
        } else if (!_.get(value, 'then')) {
          debug('Setting property %s to %s', property, value);
          ctx.instance[property] = value;
        } else {
          return value
            .then(function(res) {
              if (res === undefined) {
                debug('Callback returned undefined. Not setting property');
                return false;
              }
              debug('Setting property %s to %s', property, res);
              ctx.instance[property] = res;
            })
            .catch(next);
        }
      }).then(function() {
        next();
      }).catch(next);
    } else {
      return next();
    }
  });
};
