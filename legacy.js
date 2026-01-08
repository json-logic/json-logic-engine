'use strict'
import { splitPathMemoized } from './utilities/splitPath.js'
import { OriginalImpl } from './constants.js'

/** @type {Record<'get' | 'missing' | 'missing_some' | 'var', { method: (...args) => any }>} **/
const legacyMethods = {
  get: {
    method: ([data, key, defaultValue], context, above, engine) => {
      const notFound = defaultValue === undefined ? null : defaultValue

      const subProps = splitPathMemoized(String(key))
      for (let i = 0; i < subProps.length; i++) {
        if (data === null || data === undefined) return notFound
        // Descending into context
        data = data[subProps[i]]
        if (data === undefined) return notFound
      }

      if (engine.allowFunctions || typeof data[key] !== 'function') return data
      return null
    }
  },
  var: {
    [OriginalImpl]: true,
    method: (key, context, above, engine) => {
      let b
      if (Array.isArray(key)) {
        b = key[1]
        key = key[0]
      }
      let iter = 0
      while (typeof key === 'string' && key.startsWith('../') && iter < above.length) {
        context = above[iter++]
        key = key.substring(3)
        // A performance optimization that allows you to pass the previous above array without spreading it as the last argument
        if (iter === above.length && Array.isArray(context)) {
          iter = 0
          above = context
          context = above[iter++]
        }
      }

      const notFound = b === undefined ? null : b
      if (typeof key === 'undefined' || key === '' || key === null) {
        if (engine.allowFunctions || typeof context !== 'function') return context
        return null
      }
      const subProps = splitPathMemoized(String(key))
      for (let i = 0; i < subProps.length; i++) {
        if (context === null || context === undefined) return notFound

        // Descending into context
        context = context[subProps[i]]
        if (context === undefined) return notFound
      }

      if (engine.allowFunctions || typeof context !== 'function') return context
      return null
    },
    optimizeUnary: true
  },
  missing: {
    optimizeUnary: false,
    method: (checked, context) => {
      if (!checked.length) return []

      // Check every item in checked
      const missing = []

      for (let i = 0; i < checked.length; i++) {
        // check context for the key, exiting early if any is null
        const path = splitPathMemoized(String(checked[i]))
        let data = context
        let found = true
        for (let j = 0; j < path.length; j++) {
          if (!data) {
            found = false
            break
          }
          data = data[path[j]]
          if (data === undefined) {
            found = false
            break
          }
        }
        if (!found) missing.push(checked[i])
      }

      return missing
    },
    compile: (data, buildState) => {
      if (!Array.isArray(data)) return false
      if (data.length === 0) return buildState.compile`[]`
      if (data.length === 1 && typeof data[0] === 'string' && !data[0].includes('.')) return buildState.compile`(context || 0)[${data[0]}] === undefined ? [${data[0]}] : []`
      if (data.length === 2 && typeof data[0] === 'string' && typeof data[1] === 'string' && !data[0].includes('.') && !data[1].includes('.')) return buildState.compile`(context || 0)[${data[0]}] === undefined ? (context || 0)[${data[1]}] === undefined ? [${data[0]}, ${data[1]}] : [${data[0]}] : (context || 0)[${data[1]}] === undefined ? [${data[1]}] : []`
      return false
    }
  },
  missing_some: {
    optimizeUnary: false,
    method: ([needCount, options], context) => {
      const missing = legacyMethods.missing.method(options, context)
      if (options.length - missing.length >= needCount) return []
      return missing
    }
  }
}

export default { ...legacyMethods }
