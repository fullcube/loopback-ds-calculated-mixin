'use strict'

const debug = require('debug')('loopback-ds-calculated-mixin')
const _ = require('lodash')
const Promise = require('bluebird')

function getPropertyConfig(property) {
  if (typeof property === 'string') {
    return {
      callback: property,
    }
  }
  return property
}

module.exports = (Model, options) => {

  // Sanity Checks - verify that the defined properties and callbacks exist on the model and log a message if not.
  _.forEach(options.properties, (config, property) => {
    config = getPropertyConfig(config)

    if (_.isUndefined(Model.definition.properties[property])) {
      debug('Property %s on %s is undefined', property, Model.modelName)
    }

    if (_.isUndefined(config.callback)) {
      debug('Callback on %s is undefined', property)
    }

    if (typeof Model[config.callback] !== 'function') {
      debug('Callback %s for %s is not a model function', config.callback, property)
    }
  })

  debug('Calculated mixin for Model %s with options %o', Model.modelName, options)

  // The loaded observer is triggered when an item is loaded
  Model.observe('before save', (ctx, next) => {
    // Allow user to bypass calculation by setting `skipCalculated` option.
    if (_.get(ctx, 'options.skipCalculated')) {
      debug('Not calculating properties %s (skipCalculated was set)')
      return next()
    }

    const data = ctx.data || ctx.instance
    let instance = ctx.instance || ctx.currentInstance

    // upsert or updateAll detected - We only act on single model updates.
    if (!instance) {
      const instanceId = ctx.where[Model.getIdName()]

      if (instanceId) {
        instance = ctx.data
        instance = new Model(instance)
      }
      else {
        debug('Not calculating properties (updateAll not supported)')
        return next()
      }
    }

    return Promise.map(Object.keys(options.properties), property => {
      const config = getPropertyConfig(options.properties[property])
      const callback = config.callback
      const action = ctx.isNewInstance ? 'Calculating' : 'Recalculating'

      if (!callback) {
        debug('Callback not defined for property %s', property)
        return null
      }

      if (typeof Model[callback] !== 'function') {
        debug('Function %s not found on Model', callback)
        return null
      }

      if (!ctx.isNewInstance && !config.recalculateOnUpdate) {
        debug('Not recalculating property %s (not a new instance and recalculateOnUpdate not set)', property)
        return null
      }

      // Convert the data to be plain object to avoid pollutions.
      let instanceCopy = instance.toObject(true)

      // Apply changes from partial update to make available for use in calculation.
      if (ctx.data) {
        instanceCopy = Object.assign(instanceCopy, ctx.data)
      }

      // Make the clone an model instance to pass through to callback.
      instanceCopy = new Model(instanceCopy)

      debug(`${action} ${property} property for ${Model.modelName} ${instanceCopy.getId()} with callback ${callback}`)

      const value = Model[callback](instanceCopy)

      if (typeof value === 'undefined') {
        debug('Callback returned undefined. Not setting property')
        return null
      }
      if (_.get(value, 'then')) {
        return value
          .then(res => {
            if (typeof res === 'undefined') {
              debug('Callback returned undefined. Not setting property')
              return null
            }
            debug('Setting property %s to %s', property, res)
            data[property] = res
            return null
          })
      }
      debug('Setting property %s to %s', property, value)
      data[property] = value
      return null
    })
  })
}
