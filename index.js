'use strict';

var debug = require('debug')('loopback-ds-calculated-mixin');
var _ = require('lodash');
var Promise = global.Promise;

function calculated(Model, options) {

  // Trigger a warning and remove the property from the watchlist when one of
  // the property is not found on the model or the defined callback is not found
  _.mapKeys(options.properties, function(callback, property) {
    var removeProperty = false;
    if (_.isUndefined(Model.definition.properties[property])) {
      console.warn('Property %s on %s is undefined', property, Model.modelName);
      removeProperty = true;
    }

    if (typeof Model[callback] !== 'function') {
      console.warn('Callback %s for %s is not a model function', callback, property);
      removeProperty = true;
    }

    if (removeProperty) {
      debug('Remove calculated property %s for %s ', property, Model.modelName);
      delete options.properties[property];
    }
  });

  debug('Calculated mixin for Model %s with options %o', Model.modelName, options);

  // The loaded observer is triggered when an item is loaded
  Model.observe('before save', function(ctx, next) {
    // We only act on new instances
    if (ctx.instance !== undefined && ctx.isNewInstance !== undefined && ctx.isNewInstance === true) {
      Promise.map(Object.keys(options.properties), function(property) {
        var callback = options.properties[property];

        if (typeof Model[callback] !== 'function') {
          console.warn('Function %s not found on Model', callback);
          return false;
        }

        debug('Calculating property %s with callback %s', property, callback);

        var value = Model[callback](ctx.instance);
        if (!_.get(value, 'then')) {
          ctx.instance[property] = value;
        } else {
          return value
            .then(function(res) {
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
}

module.exports = function mixin(app) {
  app.loopback.modelBuilder.mixins.define('Calculated', calculated);
};
