'use strict'
import { buildString } from './compiler.js'
import { splitPathMemoized } from './utilities/splitPath.js'
import chainingSupported from './utilities/chainingSupported.js'
import { Sync, OriginalImpl } from './constants.js'

/** @type {Record<'get' | 'missing' | 'missing_some' | 'var', { method: (...args) => any }>} **/
const legacyMethods = {
  get: {
    [Sync]: true,
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
    },
    deterministic: true,
    compile: (data, buildState) => {
      let defaultValue = null
      let key = data
      let obj = null
      if (Array.isArray(data) && data.length <= 3) {
        obj = data[0]
        key = data[1]
        defaultValue = typeof data[2] === 'undefined' ? null : data[2]

        // Bail out if the key is dynamic; dynamic keys are not really optimized by this block.
        if (key && typeof key === 'object') return false

        key = key.toString()
        const pieces = splitPathMemoized(key)
        if (!chainingSupported) {
          return `(((a,b) => (typeof a === 'undefined' || a === null) ? b : a)(${pieces.reduce(
                (text, i) => `(${text}||0)[${JSON.stringify(i)}]`,
                `(${buildString(obj, buildState)}||0)`
              )}, ${buildString(defaultValue, buildState)}))`
        }
        return `((${buildString(obj, buildState)})${pieces
              .map((i) => `?.[${buildString(i, buildState)}]`)
              .join('')} ?? ${buildString(defaultValue, buildState)})`
      }
      return false
    }
  },
  var: {
    [OriginalImpl]: true,
    [Sync]: true,
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
    deterministic: (data, buildState) => buildState.insideIterator && !String(data).includes('../../'),
    optimizeUnary: true,
    compile: (data, buildState) => {
      let key = data
      let defaultValue = null
      if (
        !key ||
          typeof data === 'string' ||
          typeof data === 'number' ||
          (Array.isArray(data) && data.length <= 2)
      ) {
        if (Array.isArray(data)) {
          key = data[0]
          defaultValue = typeof data[1] === 'undefined' ? null : data[1]
        }

        if (key === '../index' && buildState.iteratorCompile) return 'index'

        // this counts the number of var accesses to determine if they're all just using this override.
        // this allows for a small optimization :)
        if (typeof key === 'undefined' || key === null || key === '') return 'context'
        if (typeof key !== 'string' && typeof key !== 'number') return false

        key = key.toString()
        if (key.includes('../')) return false

        const pieces = splitPathMemoized(key)

        if (!buildState.engine.allowFunctions) buildState.methods.preventFunctions = a => typeof a === 'function' ? null : a
        else buildState.methods.preventFunctions = a => a

        // support older versions of node
        if (!chainingSupported) {
          return `(methods.preventFunctions(((a,b) => (typeof a === 'undefined' || a === null) ? b : a)(${pieces.reduce(
              (text, i) => `(${text}||0)[${JSON.stringify(i)}]`,
              '(context||0)'
            )}, ${buildString(defaultValue, buildState)})))`
        }
        return `(methods.preventFunctions(context${pieces
            .map((i) => `?.[${JSON.stringify(i)}]`)
            .join('')} ?? ${buildString(defaultValue, buildState)}))`
      }
      return false
    }
  },
  missing: {
    [Sync]: true,
    optimizeUnary: false,
    method: (checked, context, above, engine) => {
      return (Array.isArray(checked) ? checked : [checked]).filter((key) => {
        return legacyMethods.var.method(key, context, above, engine) === null
      })
    },
    deterministic: false
  },
  missing_some: {
    [Sync]: true,
    optimizeUnary: false,
    method: ([needCount, options], context, above, engine) => {
      const missing = legacyMethods.missing.method(options, context, above, engine)
      if (options.length - missing.length >= needCount) {
        return []
      } else {
        return missing
      }
    },
    deterministic: false
  }
}

export default { ...legacyMethods }
