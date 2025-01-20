// @ts-check
// istanbul ignore file
'use strict'
// Old Interface for json-logic-js being mapped onto json-logic-engine
import LogicEngine from './logic.js'

/**
 * This is a to allow json-logic-engine to easily be used as a drop-in replacement for json-logic-js.
 *
 * This shim does not expose all of the functionality of `json-logic-engine`, so it is recommended to switch over
 * to using `json-logic-engine`'s API directly.
 *
 * The direct API is a bit more efficient and allows for logic compilation and other advanced features.
 * @deprecated Please use `json-logic-engine` directly instead.
 */
const jsonLogic = {
  _init () {
    this.engine = new LogicEngine()

    // We don't know if folks are modifying the AST directly, and because this is a widespread package,
    // I'm going to assume some folks might be, so let's go with the safe assumption and disable the optimizer
    this.engine.disableInterpretedOptimization = true
  },
  /**
   * Applies the data to the logic and returns the result.
   * @template T
   * @returns {T}
   * @deprecated Please use `json-logic-engine` directly instead.
   */
  apply (logic, data) {
    if (!this.engine) this._init()
    return this.engine.run(logic, data)
  },
  /**
   * Adds a new operation to the engine.
   * Note that this is much less performant than adding methods to the engine the new way.
   * Either consider switching to using LogicEngine directly, or accessing `jsonLogic.engine.addMethod` instead.
   *
   * Documentation for the new style is available at: https://json-logic.github.io/json-logic-engine/docs/methods
   *
   * @param {string} name
   * @param {((...args: any[]) => any) | Record<string, (...args: any[]) => any> } code
   * @deprecated Please use `json-logic-engine` directly instead.
   * @returns
   */
  add_operation (name, code) {
    if (!this.engine) this._init()
    if (typeof code === 'object') {
      for (const key in code) {
        const method = code[key]
        this.engine.addMethod(name + '.' + key, (args, ctx) => method.apply(ctx, args))
      }
      return
    }

    this.engine.addMethod(name, (args, ctx) => code.apply(ctx, args))
  },
  /**
   * Removes an operation from the engine
   * @param {string} name
   */
  rm_operation (name) {
    if (!this.engine) this._init()
    this.engine.methods[name] = undefined
  },
  /**
   * Gets the first key from an object
   * { >name<: values }
   */
  get_operator (logic) {
    return Object.keys(logic)[0]
  },
  /**
   * Gets the values from the logic
   * { name: >values< }
   */
  get_values (logic) {
    const func = Object.keys(jsonLogic)[0]
    return logic[func]
  },
  /**
   * Allows you to enable the optimizer which will accelerate your logic execution,
   * as long as you don't mutate the logic after it's been run once.
   *
   * This will allow it to cache the execution plan for the logic, speeding things up.
   */
  set_optimizer (val = true) {
    if (!this.engine) this._init()
    this.engine.disableInterpretedOptimization = val
  },
  /**
   * Checks if a given object looks like a logic object.
   */
  is_logic (logic) {
    return typeof logic === 'object' && logic !== null && !Array.isArray(logic) && Object.keys(logic).length === 1
  },
  /**
   * Checks for which variables are used in a given logic object.
   */
  uses_data (logic) {
    /** @type {Set<string>} */
    const collection = new Set()

    if (!jsonLogic.is_logic(logic)) {
      const op = jsonLogic.get_operator(logic)
      let values = logic[op]

      if (!Array.isArray(values)) values = [values]

      if (op === 'var') collection.add(values[0])
      else if (op === 'val') collection.add(values.join('.'))
      else {
        // Recursion!
        for (const val of values) {
          const subCollection = jsonLogic.uses_data(val)
          for (const item of subCollection) collection.add(item)
        }
      }
    }

    return Array.from(collection)
  },
  // Copied directly from json-logic-js
  rule_like (rule, pattern) {
    if (pattern === rule) {
      return true
    } // TODO : Deep object equivalency?
    if (pattern === '@') {
      return true
    } // Wildcard!
    if (pattern === 'number') {
      return (typeof rule === 'number')
    }
    if (pattern === 'string') {
      return (typeof rule === 'string')
    }
    if (pattern === 'array') {
      // !logic test might be superfluous in JavaScript
      return Array.isArray(rule) && !jsonLogic.is_logic(rule)
    }

    if (jsonLogic.is_logic(pattern)) {
      if (jsonLogic.is_logic(rule)) {
        const patternOp = jsonLogic.get_operator(pattern)
        const ruleOp = jsonLogic.get_operator(rule)

        if (patternOp === '@' || patternOp === ruleOp) {
          // echo "\nOperators match, go deeper\n";
          return jsonLogic.rule_like(
            jsonLogic.get_values(rule),
            jsonLogic.get_values(pattern)
          )
        }
      }
      return false // pattern is logic, rule isn't, can't be eq
    }

    if (Array.isArray(pattern)) {
      if (Array.isArray(rule)) {
        if (pattern.length !== rule.length) {
          return false
        }
        /*
          Note, array order MATTERS, because we're using this array test logic to consider arguments, where order can matter. (e.g., + is commutative, but '-' or 'if' or 'var' are NOT)
        */
        for (let i = 0; i < pattern.length; i += 1) {
          // If any fail, we fail
          if (!jsonLogic.rule_like(rule[i], pattern[i])) {
            return false
          }
        }
        return true // If they *all* passed, we pass
      } else {
        return false // Pattern is array, rule isn't
      }
    }

    // Not logic, not array, not a === match for rule.
    return false
  }
}

export default jsonLogic
