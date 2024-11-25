// @ts-check
'use strict'

import defaultMethods from './defaultMethods.js'

import { build } from './compiler.js'
import declareSync from './utilities/declareSync.js'
import omitUndefined from './utilities/omitUndefined.js'
import { optimize } from './optimizer.js'
import { applyPatches } from './compatibility.js'

/**
 * An engine capable of running synchronous JSON Logic.
 */
class LogicEngine {
  /**
   * Creates a new instance of the Logic Engine.
   *
   * "compatible" applies a few patches to make it compatible with the preferences of mainline JSON Logic.
   * The main changes are:
   * - In mainline: "all" will return false if the array is empty; by default, we return true.
   * - In mainline: empty arrays are falsey; in our implementation, they are truthy.
   *
   * @param {Object} methods An object that stores key-value pairs between the names of the commands & the functions they execute.
   * @param {{ disableInline?: Boolean, disableInterpretedOptimization?: Boolean, permissive?: boolean, compatible?: boolean }} options
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

    if (options.compatible) applyPatches(this)

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
    return value
  }

  /**
   * An internal method used to parse through the JSON Logic at a lower level.
   * @param {*} logic The logic being executed.
   * @param {*} context The context of the logic being run (input to the function.)
   * @param {*} above The context above (can be used for handlebars-style data traversal.)
   * @returns {{ result: *, func: string }}
   */
  _parse (logic, context, above) {
    const [func] = Object.keys(logic)
    const data = logic[func]

    if (this.isData(logic, func)) return logic

    if (!this.methods[func]) throw new Error(`Method '${func}' was not found in the Logic Engine.`)

    if (typeof this.methods[func] === 'function') {
      const input = this.run(data, context, { above })
      return this.methods[func](input, context, above, this)
    }

    if (typeof this.methods[func] === 'object') {
      const { method, traverse } = this.methods[func]
      const shouldTraverse = typeof traverse === 'undefined' ? true : traverse
      const parsedData = shouldTraverse ? this.run(data, context, { above }) : data
      return method(parsedData, context, above, this)
    }

    throw new Error(`Method '${func}' is not set up properly.`)
  }

  /**
   *
   * @param {String} name The name of the method being added.
   * @param {((args: any, context: any, above: any[], engine: LogicEngine) => any) |{ traverse?: Boolean, method: (args: any, context: any, above: any[], engine: LogicEngine) => any, deterministic?: Function | Boolean }} method
   * @param {{ deterministic?: Boolean }} annotations This is used by the compiler to help determine if it can optimize the function being generated.
   */
  addMethod (name, method, { deterministic } = {}) {
    if (typeof method === 'function') method = { method, traverse: true }
    else method = { ...method }
    Object.assign(method, omitUndefined({ deterministic }))
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
    if (this.missesSinceSeen > 500) {
      this.disableInterpretedOptimization = true
      this.missesSinceSeen = 0
    }

    if (!this.disableInterpretedOptimization && typeof logic === 'object' && logic && !this.optimizedMap.has(logic)) {
      this.optimizedMap.set(logic, optimize(logic, this, above))
      this.missesSinceSeen++
      return typeof this.optimizedMap.get(logic) === 'function' ? this.optimizedMap.get(logic)(data, above) : this.optimizedMap.get(logic)
    }

    if (!this.disableInterpretedOptimization && logic && typeof logic === 'object' && this.optimizedMap.get(logic)) {
      this.missesSinceSeen = 0
      return typeof this.optimizedMap.get(logic) === 'function' ? this.optimizedMap.get(logic)(data, above) : this.optimizedMap.get(logic)
    }
    // END OPTIMIZER BLOCK //

    if (Array.isArray(logic)) {
      const res = []
      for (let i = 0; i < logic.length; i++) res.push(this.run(logic[i], data, { above }))
      return res
    }

    if (logic && typeof logic === 'object' && Object.keys(logic).length > 0) return this._parse(logic, data, above)

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
    if (top) {
      const constructedFunction = build(logic, { state: {}, engine: this, above })
      if (typeof constructedFunction === 'function' || top === true) return (...args) => typeof constructedFunction === 'function' ? constructedFunction(...args) : constructedFunction
      return constructedFunction
    }
    return logic
  }
}
Object.assign(LogicEngine.prototype.truthy, { IDENTITY: true })
export default LogicEngine
