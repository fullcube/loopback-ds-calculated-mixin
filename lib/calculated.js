'use strict';

var debug = require('debug')('loopback-ds-calculated-mixin');
var _ = require('lodash');
var Promise = require('bluebird');

function getPropertyConfig(property) {
  if (typeof property === 'string') {
    return {
      callback: property,
    };
  }
  return property;
}

module.exports = function(Model, options) {

  // Sanity Checks - verify that the defined properties and callbacks exist on the model and log a message if not.
  _.forEach(options.properties, function(options, property) {
    var config = getPropertyConfig(options);

    if (_.isUndefined(Model.definition.properties[property])) {
      debug('Property %s on %s is undefined', property, Model.modelName);
    }

    if (_.isUndefined(config.callback)) {
      debug('Callback on %s is undefined', property);
    }

    if (typeof Model[config.callback] !== 'function') {
      debug('Callback %s for %s is not a model function', config.callback, property);
    }
  });

  debug('Calculated mixin for Model %s with options %o', Model.modelName, options);

  // The loaded observer is triggered when an item is loaded
  Model.observe('before save', function(ctx, next) {
    // Allow user to bypass calculation by setting `skipCalculated` option.
    if (_.get(ctx, 'options.skipCalculated')) {
      debug('Not calculating properties %s (skipCalculated was set)');
      return next();
    }

    var data = ctx.data || ctx.instance;
    var instance = ctx.instance || ctx.currentInstance;

    // upsert or updateAll detected - We only act on single model updates.
    if (!instance) {
      var instanceId = ctx.where[Model.getIdName()];
      if (instanceId) {
        instance = ctx.data;
        instance = new Model(instance);
      } else {
        debug('Not calculating properties (updateAll not supported)');
        return next();
      }
    }

    return Promise.map(Object.keys(options.properties), function(property) {
      var config = getPropertyConfig(options.properties[property]);
      var callback = config.callback;
      var action = ctx.isNewInstance ? 'Calculating' : 'Recalculating';

      if (!callback) {
        debug('Callback not defined for property %s', property);
        return false;
      }

      if (typeof Model[callback] !== 'function') {
        debug('Function %s not found on Model', callback);
        return false;
      }

      if (!ctx.isNewInstance && !config.recalculateOnUpdate) {
        debug('Not recalculating property %s (not a new instance and recalculateOnUpdate not set)', property);
        return false;
      }

      // Convert the data to be plain object to avoid pollutions.
      var instanceCopy = instance.toObject(true);

      // Apply changes from partial update to make available for use in calculation.
      if (ctx.data) {
        instanceCopy = Object.assign(instanceCopy, ctx.data);
      }

      // Make the clone an model instance to pass through to callback.
      instanceCopy =  new Model(instanceCopy);

      debug(`${action} ${property} property for ${Model.modelName} ${instanceCopy.getId()} with callback ${callback}`);

      var value = Model[callback](instanceCopy);

      if (typeof value === 'undefined') {
        debug('Callback returned undefined. Not setting property');
        return false;
      } else if (!_.get(value, 'then')) {
        debug('Setting property %s to %s', property, value);
        data[property] = value;
      } else {
        return value
          .then(function(res) {
            if (typeof res === 'undefined') {
              debug('Callback returned undefined. Not setting property');
              return false;
            }
            debug('Setting property %s to %s', property, res);
            data[property] = res;
            return data;
          });
      }
    });
  });
};
