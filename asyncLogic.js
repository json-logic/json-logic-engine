// @ts-check
'use strict'

import defaultMethods from './defaultMethods.js'
import LogicEngine from './logic.js'
import { isSync, OriginalImpl } from './constants.js'
import declareSync from './utilities/declareSync.js'
import { buildAsync } from './compiler.js'
import omitUndefined from './utilities/omitUndefined.js'
import { optimize } from './async_optimizer.js'
import { coerceArray } from './utilities/coerceArray.js'

/**
 * An engine capable of running asynchronous JSON Logic.
 */
class AsyncLogicEngine {
  /**
   * Creates a new instance of the Logic Engine.
   *
   * "compatible" applies a few patches to make it compatible with the preferences of mainline JSON Logic.
   * The main changes are:
   * - In mainline: "all" will return false if the array is empty; by default, we return true.
   * - In mainline: empty arrays are falsey; in our implementation, they are truthy.
   *
   * @param {Object} methods An object that stores key-value pairs between the names of the commands & the functions they execute.
   * @param {{ disableInline?: Boolean, disableInterpretedOptimization?: boolean, permissive?: boolean }} options
   */
  constructor (
    methods = defaultMethods,
    options = { disableInline: false, disableInterpretedOptimization: false, permissive: false }
  ) {
    this.methods = { ...methods }
    /** @type {{disableInline?: Boolean, disableInterpretedOptimization?: Boolean }} */
    this.options = { disableInline: options.disableInline, disableInterpretedOptimization: options.disableInterpretedOptimization }
    this.disableInline = options.disableInline
    this.disableInterpretedOptimization = options.disableInterpretedOptimization
    this.async = true
    this.fallback = new LogicEngine(methods, options)

    this.optimizedMap = new WeakMap()
    this.missesSinceSeen = 0

    if (!this.isData) {
      if (!options.permissive) this.isData = () => false
      else this.isData = (data, key) => !(key in this.methods)
    }

    this.fallback.isData = this.isData
  }

  /**
   * Determines the truthiness of a value.
   * You can override this method to change the way truthiness is determined.
   * @param {*} value
   * @returns
   */
  truthy (value) {
    if (!value) return value
    // The following check could be erased, as it'd be caught by the iterator check,
    // but it's here for performance reasons.
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') {
      if (value[Symbol.iterator]) {
        if ('length' in value && value.length === 0) return false
        if ('size' in value && value.size === 0) return false
      }
      if (value.constructor.name === 'Object') return Object.keys(value).length > 0
    }
    return value
  }

  /**
   * An internal method used to parse through the JSON Logic at a lower level.
   * @param {*} logic The logic being executed.
   * @param {*} context The context of the logic being run (input to the function.)
   * @param {*} above The context above (can be used for handlebars-style data traversal.)
   * @returns {Promise<*>}
   */
  async _parse (logic, context, above, func, length) {
    const data = logic[func]

    if (this.isData(logic, func)) return logic

    // eslint-disable-next-line no-throw-literal
    if (!this.methods[func] || length > 1) throw { type: 'Unknown Operator', key: func }

    // A small but useful micro-optimization for some of the most common functions.
    // Later on, I could define something to shut this off if var / val are redefined.
    if ((func === 'var' || func === 'val') && this.methods[func][OriginalImpl]) {
      const input = (!data || typeof data !== 'object') ? data : this.fallback.run(data, context, { above })
      return this.methods[func].method(input, context, above, this)
    }

    if (typeof this.methods[func] === 'function') {
      const input = (!data || typeof data !== 'object') ? [data] : await this.run(data, context, { above })
      const result = await this.methods[func](coerceArray(input), context, above, this)
      return Array.isArray(result) ? Promise.all(result) : result
    }

    if (typeof this.methods[func] === 'object') {
      const { asyncMethod, method, lazy } = this.methods[func]
      const parsedData = !lazy ? ((!data || typeof data !== 'object') ? [data] : coerceArray(await this.run(data, context, { above }))) : data
      const result = await (asyncMethod || method)(parsedData, context, above, this)
      return Array.isArray(result) ? Promise.all(result) : result
    }

    throw new Error(`Method '${func}' is not set up properly.`)
  }

  /**
   *
   * @param {String} name The name of the method being added.
   * @param {((args: any, context: any, above: any[], engine: AsyncLogicEngine) => any) | { lazy?: Boolean, traverse?: Boolean, method?: (args: any, context: any, above: any[], engine: AsyncLogicEngine) => any, asyncMethod?: (args: any, context: any, above: any[], engine: AsyncLogicEngine) => Promise<any>, deterministic?: Function | Boolean }} method
   * @param {{ deterministic?: Boolean, async?: Boolean, sync?: Boolean, optimizeUnary?: boolean }} annotations This is used by the compiler to help determine if it can optimize the function being generated.
   */
  addMethod (
    name,
    method,
    { deterministic, async, sync, optimizeUnary } = {}
  ) {
    if (typeof async === 'undefined' && typeof sync === 'undefined') sync = false
    if (typeof sync !== 'undefined') async = !sync
    if (typeof async !== 'undefined') sync = !async

    if (typeof method === 'function') {
      if (async) method = { asyncMethod: method, lazy: false }
      else method = { method, lazy: false }
    } else method = { ...method, lazy: typeof method.traverse !== 'undefined' ? !method.traverse : method.lazy }

    Object.assign(method, omitUndefined({ deterministic, optimizeUnary }))
    // @ts-ignore
    this.fallback.addMethod(name, method, { deterministic })
    this.methods[name] = declareSync(method, sync)
  }

  /**
   * Adds a batch of functions to the engine
   * @param {String} name
   * @param {Object} obj
   * @param {{ deterministic?: Boolean, async?: Boolean, sync?: Boolean }} annotations Not recommended unless you're sure every function from the module will match these annotations.
   */
  addModule (name, obj, annotations = {}) {
    Object.getOwnPropertyNames(obj).forEach((key) => {
      if (typeof obj[key] === 'function' || typeof obj[key] === 'object') this.addMethod(`${name}${name ? '.' : ''}${key}`, obj[key], annotations)
    })
  }

  /**
   * Runs the logic against the data.
   *
   * NOTE: With interpreted optimizations enabled, it will cache the execution plan for the logic for
   * future invocations; if you plan to modify the logic, you should disable this feature, by passing
   * `disableInterpretedOptimization: true` in the constructor.
   *
   * If it detects that a bunch of dynamic objects are being passed in, and it doesn't see the same object,
   * it will disable the interpreted optimization.
   *
   * @param {*} logic The logic to be executed
   * @param {*} data The data being passed in to the logic to be executed against.
   * @param {{ above?: any }} options Options for the invocation
   * @returns {Promise}
   */
  async run (logic, data = {}, options = {}) {
    const { above = [] } = options

    // OPTIMIZER BLOCK //
    if (!this.disableInterpretedOptimization && typeof logic === 'object' && logic) {
      if (this.missesSinceSeen > 500) {
        this.disableInterpretedOptimization = true
        this.missesSinceSeen = 0
      }
      if (!this.optimizedMap.has(logic)) {
        this.optimizedMap.set(logic, optimize(logic, this, above))
        this.missesSinceSeen++
        const grab = this.optimizedMap.get(logic)
        return typeof grab === 'function' ? grab(data, above) : grab
      } else {
        this.missesSinceSeen = 0
        const grab = this.optimizedMap.get(logic)
        return typeof grab === 'function' ? grab(data, above) : grab
      }
    }
    // END OPTIMIZER BLOCK //

    if (Array.isArray(logic)) {
      const res = new Array(logic.length)
      // Note: In the past, it used .map and Promise.all; this can be changed in the future
      // if we want it to run concurrently.
      for (let i = 0; i < logic.length; i++) res[i] = await this.run(logic[i], data, { above })
      return res
    }

    if (logic && typeof logic === 'object' && Object.keys(logic).length > 0) {
      const keys = Object.keys(logic)
      if (keys.length > 0) {
        const func = keys[0]
        return this._parse(logic, data, above, func, keys.length)
      }
    }

    return logic
  }

  /**
   *
   * @param {*} logic The logic to be built.
   * @param {{ top?: Boolean, above?: any }} options
   * @returns {Promise<Function>}
   */
  async build (logic, options = {}) {
    const { above = [], top = true } = options
    this.fallback.truthy = this.truthy
    // @ts-ignore
    this.fallback.allowFunctions = this.allowFunctions
    const constructedFunction = await buildAsync(logic, { engine: this, above, async: true })

    const result = declareSync((...args) => {
      if (top === true) {
        try {
          const result = typeof constructedFunction === 'function' ? constructedFunction(...args) : constructedFunction
          return Promise.resolve(result)
        } catch (err) {
          return Promise.reject(err)
        }
      }

      return typeof constructedFunction === 'function' ? constructedFunction(...args) : constructedFunction
    }, top !== true && isSync(constructedFunction))

    if (top === false && constructedFunction.deterministic) return result()
    return (typeof constructedFunction === 'function' || top === true) ? result : constructedFunction
  }
}
export default AsyncLogicEngine
