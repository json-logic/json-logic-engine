// @ts-check
'use strict'

import defaultMethods from './defaultMethods.js'

import { build } from './compiler.js'
import declareSync from './utilities/declareSync.js'
import omitUndefined from './utilities/omitUndefined.js'
import { optimize } from './optimizer.js'
import { coerceArray } from './utilities/coerceArray.js'
import { OriginalImpl } from './constants.js'

/**
 * An engine capable of running synchronous JSON Logic.
 */
class LogicEngine {
  /**
   * Creates a new instance of the Logic Engine.
  *
   * @param {Object} methods An object that stores key-value pairs between the names of the commands & the functions they execute.
   * @param {{ disableInline?: Boolean, disableInterpretedOptimization?: Boolean, permissive?: boolean }} options
   */
  constructor (
    methods = defaultMethods,
    options = { disableInline: false, disableInterpretedOptimization: false, permissive: false }
  ) {
    this.disableInline = options.disableInline
    this.disableInterpretedOptimization = options.disableInterpretedOptimization
    this.methods = { ...methods }

    this.optimizedMap = new WeakMap()
    this.missesSinceSeen = 0

    /** @type {{ disableInline?: Boolean, disableInterpretedOptimization?: Boolean }} */
    this.options = { disableInline: options.disableInline, disableInterpretedOptimization: options.disableInterpretedOptimization }
    if (!this.isData) {
      if (!options.permissive) this.isData = () => false
      else this.isData = (data, key) => !(key in this.methods)
    }
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
   * @returns {{ result: *, func: string }}
   */
  _parse (logic, context, above, func, length) {
    const data = logic[func]

    if (this.isData(logic, func)) return logic

    // eslint-disable-next-line no-throw-literal
    if (!this.methods[func] || length > 1) throw { type: 'Unknown Operator', key: func }

    // A small but useful micro-optimization for some of the most common functions.
    // Later on, I could define something to shut this off if var / val are redefined.
    if ((func === 'var' || func === 'val') && this.methods[func][OriginalImpl]) {
      const input = (!data || typeof data !== 'object') ? data : this.run(data, context, { above })
      return this.methods[func].method(input, context, above, this, null)
    }

    if (typeof this.methods[func] === 'function') {
      const input = (!data || typeof data !== 'object') ? [data] : coerceArray(this.run(data, context, { above }))
      return this.methods[func](input, context, above, this)
    }

    if (typeof this.methods[func] === 'object') {
      const { method, lazy } = this.methods[func]
      const parsedData = !lazy ? ((!data || typeof data !== 'object') ? [data] : coerceArray(this.run(data, context, { above }))) : data
      return method(parsedData, context, above, this)
    }

    throw new Error(`Method '${func}' is not set up properly.`)
  }

  /**
   *
   * @param {String} name The name of the method being added.
   * @param {((args: any, context: any, above: any[], engine: LogicEngine) => any) |{ lazy?: Boolean, traverse?: Boolean, method: (args: any, context: any, above: any[], engine: LogicEngine) => any, deterministic?: Function | Boolean }} method
   * @param {{ deterministic?: Boolean, optimizeUnary?: Boolean }} annotations This is used by the compiler to help determine if it can optimize the function being generated.
   */
  addMethod (name, method, { deterministic, optimizeUnary } = {}) {
    if (typeof method === 'function') method = { method, lazy: false }
    else method = { ...method, lazy: typeof method.traverse !== 'undefined' ? !method.traverse : method.lazy }
    Object.assign(method, omitUndefined({ deterministic, optimizeUnary }))
    this.methods[name] = declareSync(method)
  }

  /**
   * Adds a batch of functions to the engine
   * @param {String} name
   * @param {Object} obj
   * @param {{ deterministic?: Boolean, async?: Boolean, sync?: Boolean }} annotations Not recommended unless you're sure every function from the module will match these annotations.
   */
  addModule (name, obj, annotations) {
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
   * @returns {*}
   */
  run (logic, data = {}, options = {}) {
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
      for (let i = 0; i < logic.length; i++) res[i] = this.run(logic[i], data, { above })
      return res
    }

    if (logic && typeof logic === 'object') {
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
   * @returns {Function}
   */
  build (logic, options = {}) {
    const { above = [], top = true } = options
    const constructedFunction = build(logic, { engine: this, above })
    if (top === false && constructedFunction.deterministic) return constructedFunction()
    return constructedFunction
  }
}
export default LogicEngine
