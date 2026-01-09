// @ts-check
'use strict'

import asyncIterators from './async_iterators.js'
import { Unfound, OriginalImpl } from './constants.js'
import legacyMethods from './legacy.js'
import { precoerceNumber, assertAllowedDepth } from './utilities/downgrade.js'

const INVALID_ARGUMENTS = { type: 'Invalid Arguments' }

/**
 * Runs the logic with the given data.
 */
function runOptimizedOrFallback (logic, engine, data, above) {
  if (!logic) return logic
  if (typeof logic !== 'object') return logic
  return engine.run(logic, data, { above })
}

const oldAll = createArrayIterativeMethod('every', true)
const defaultMethods = {
  '+': (data) => {
    if (!data) return 0
    if (typeof data === 'string') return precoerceNumber(+data)
    if (typeof data === 'number') return precoerceNumber(+data)
    if (typeof data === 'boolean') return precoerceNumber(+data)
    if (typeof data === 'object' && !Array.isArray(data)) throw NaN
    let res = 0
    for (let i = 0; i < data.length; i++) {
      if (data[i] && typeof data[i] === 'object') throw NaN
      res += +data[i]
    }
    if (Number.isNaN(res)) throw NaN
    return res
  },
  '*': (data) => {
    if (data.length === 0) return 1
    let res = 1
    for (let i = 0; i < data.length; i++) {
      if (data[i] && typeof data[i] === 'object') throw NaN
      res *= +data[i]
    }
    if (Number.isNaN(res)) throw NaN
    return res
  },
  '/': (data) => {
    if (data[0] && typeof data[0] === 'object') throw NaN

    if (data.length === 0) throw INVALID_ARGUMENTS
    if (data.length === 1) {
      if (!+data[0] || (data[0] && typeof data[0] === 'object')) throw NaN
      return 1 / +data[0]
    }
    let res = +data[0]
    for (let i = 1; i < data.length; i++) {
      if ((data[i] && typeof data[i] === 'object') || !data[i]) throw NaN
      res /= +data[i]
    }
    if (Number.isNaN(res) || res === Infinity) throw NaN
    return res
  },
  '-': (data) => {
    if (!data) return 0
    if (typeof data === 'string') return precoerceNumber(-data)
    if (typeof data === 'number') return precoerceNumber(-data)
    if (typeof data === 'boolean') return precoerceNumber(-data)
    if (typeof data === 'object' && !Array.isArray(data)) throw NaN
    if (data[0] && typeof data[0] === 'object') throw NaN
    if (data.length === 0) throw INVALID_ARGUMENTS
    if (data.length === 1) return -data[0]
    let res = data[0]
    for (let i = 1; i < data.length; i++) {
      if (data[i] && typeof data[i] === 'object') throw NaN
      res -= +data[i]
    }
    if (Number.isNaN(res)) throw NaN
    return res
  },
  '%': (data) => {
    if (data[0] && typeof data[0] === 'object') throw NaN

    if (data.length < 2) throw INVALID_ARGUMENTS
    let res = +data[0]
    for (let i = 1; i < data.length; i++) {
      if (data[i] && typeof data[i] === 'object') throw NaN
      res %= +data[i]
    }
    if (Number.isNaN(res)) throw NaN
    return res
  },
  throw: (type) => {
    if (Array.isArray(type)) type = type[0]
    if (typeof type === 'object') throw type

    // eslint-disable-next-line no-throw-literal
    throw { type }
  },
  max: (data) => {
    if (!data.length || typeof data[0] !== 'number') throw INVALID_ARGUMENTS
    let max = data[0]
    for (let i = 1; i < data.length; i++) {
      if (typeof data[i] !== 'number') throw INVALID_ARGUMENTS
      if (data[i] > max) max = data[i]
    }
    return max
  },
  min: (data) => {
    if (!data.length || typeof data[0] !== 'number') throw INVALID_ARGUMENTS
    let min = data[0]
    for (let i = 1; i < data.length; i++) {
      if (typeof data[i] !== 'number') throw INVALID_ARGUMENTS
      if (data[i] < min) min = data[i]
    }
    return min
  },
  in: ([item, array]) => (array || []).includes(item),
  preserve: {
    lazy: true,
    method: i => i
  },
  if: {
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw INVALID_ARGUMENTS

      if (input.length === 1) return runOptimizedOrFallback(input[0], engine, context, above)
      if (input.length < 2) return null

      input = [...input]
      if (input.length % 2 !== 1) input.push(null)

      // fallback to the default if the condition is false
      const onFalse = input.pop()

      // while there are still conditions
      while (input.length) {
        const check = input.shift()
        const onTrue = input.shift()

        const test = runOptimizedOrFallback(check, engine, context, above)

        // if the condition is true, run the true branch
        if (engine.truthy(test)) return runOptimizedOrFallback(onTrue, engine, context, above)
      }

      return runOptimizedOrFallback(onFalse, engine, context, above)
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw INVALID_ARGUMENTS

      // check the bounds
      if (input.length === 1) return engine.run(input[0], context, { above })
      if (input.length < 2) return null

      input = [...input]

      if (input.length % 2 !== 1) input.push(null)

      // fallback to the default if the condition is false
      const onFalse = input.pop()

      // while there are still conditions
      while (input.length) {
        const check = input.shift()
        const onTrue = input.shift()

        const test = await engine.run(check, context, { above })

        // if the condition is true, run the true branch
        if (engine.truthy(test)) return engine.run(onTrue, context, { above })
      }

      return engine.run(onFalse, context, { above })
    },
    lazy: true
  },
  '<': createComparator('<', (a, b) => a < b),
  '<=': createComparator('<=', (a, b) => a <= b),
  '>': createComparator('>', (a, b) => a > b),
  '>=': createComparator('>=', (a, b) => a >= b),
  // eslint-disable-next-line eqeqeq
  '==': createComparator('==', (a, b) => a == b),
  '===': createComparator('===', (a, b) => a === b),
  // eslint-disable-next-line eqeqeq
  '!=': createComparator('!=', (a, b) => a != b),
  '!==': createComparator('!==', (a, b) => a !== b),
  or: {
    method: (arr, context, above, engine) => {
      if (!Array.isArray(arr)) throw INVALID_ARGUMENTS
      if (!arr.length) return null

      let item
      for (let i = 0; i < arr.length; i++) {
        item = runOptimizedOrFallback(arr[i], engine, context, above)
        if (engine.truthy(item)) return item
      }

      return item
    },
    asyncMethod: async (arr, _1, _2, engine) => {
      if (!Array.isArray(arr)) throw INVALID_ARGUMENTS
      if (!arr.length) return null

      let item
      for (let i = 0; i < arr.length; i++) {
        item = await engine.run(arr[i], _1, { above: _2 })
        if (engine.truthy(item)) return item
      }

      return item
    },

    lazy: true
  },
  '??': {
    method: (arr, context, above, engine) => {
      if (!Array.isArray(arr)) throw INVALID_ARGUMENTS

      let item
      for (let i = 0; i < arr.length; i++) {
        item = runOptimizedOrFallback(arr[i], engine, context, above)
        if (item !== null && item !== undefined) return item
      }

      if (item === undefined) return null
      return item
    },
    asyncMethod: async (arr, _1, _2, engine) => {
      if (!Array.isArray(arr)) throw INVALID_ARGUMENTS

      let item
      for (let i = 0; i < arr.length; i++) {
        item = await engine.run(arr[i], _1, { above: _2 })
        if (item !== null && item !== undefined) return item
      }

      if (item === undefined) return null
      return item
    },
    lazy: true
  },
  try: {
    method: (arr, context, above, engine) => {
      if (!Array.isArray(arr)) arr = [arr]

      let item
      let lastError
      for (let i = 0; i < arr.length; i++) {
        try {
          // Todo: make this message thing more robust.
          if (lastError) item = runOptimizedOrFallback(arr[i], engine, { type: lastError.type || lastError.error || lastError.message || lastError.constructor.name }, [null, context, above])
          else item = runOptimizedOrFallback(arr[i], engine, context, above)
          return item
        } catch (e) {
          if (Number.isNaN(e)) lastError = { message: 'NaN' }
          else lastError = e
        }
      }

      throw lastError
    },
    asyncMethod: async (arr, _1, _2, engine) => {
      if (!Array.isArray(arr)) arr = [arr]

      let item
      let lastError
      for (let i = 0; i < arr.length; i++) {
        try {
          // Todo: make this message thing more robust.
          if (lastError) item = await engine.run(arr[i], { type: lastError.type || lastError.error || lastError.message || lastError.constructor.name }, { above: [null, _1, _2] })
          else item = await engine.run(arr[i], _1, { above: _2 })
          return item
        } catch (e) {
          if (Number.isNaN(e)) lastError = { message: 'NaN' }
          else lastError = e
        }
      }

      throw lastError
    },
    lazy: true

  },
  and: {
    method: (arr, context, above, engine) => {
      if (!Array.isArray(arr)) throw INVALID_ARGUMENTS
      if (!arr.length) return null

      let item
      for (let i = 0; i < arr.length; i++) {
        item = runOptimizedOrFallback(arr[i], engine, context, above)
        if (!engine.truthy(item)) return item
      }
      return item
    },
    asyncMethod: async (arr, _1, _2, engine) => {
      if (!Array.isArray(arr)) throw INVALID_ARGUMENTS
      if (!arr.length) return null
      let item
      for (let i = 0; i < arr.length; i++) {
        item = await engine.run(arr[i], _1, { above: _2 })
        if (!engine.truthy(item)) return item
      }
      return item
    },
    lazy: true

  },
  substr: ([string, from, end]) => {
    if (end < 0) {
      const result = string.substr(from)
      return result.substr(0, result.length + end)
    }
    return string.substr(from, end)
  },
  length: {
    method: (data, context, above, engine) => {
      if (!data) throw INVALID_ARGUMENTS
      const parsed = runOptimizedOrFallback(data, engine, context, above)
      const i = Array.isArray(data) ? parsed[0] : parsed
      if (typeof i === 'string' || Array.isArray(i)) return i.length
      if (i && typeof i === 'object') return Object.keys(i).length
      throw INVALID_ARGUMENTS
    },
    asyncMethod: async (data, context, above, engine) => {
      if (!data) throw INVALID_ARGUMENTS
      const parsed = await runOptimizedOrFallback(data, engine, context, above)
      const i = Array.isArray(data) ? parsed[0] : parsed
      if (typeof i === 'string' || Array.isArray(i)) return i.length
      if (i && typeof i === 'object') return Object.keys(i).length
      throw INVALID_ARGUMENTS
    },
    lazy: true
  },
  exists: {
    method: (key, context, above, engine) => {
      const result = defaultMethods.val.method(key, context, above, engine, Unfound)
      return result !== Unfound
    }
  },
  val: {
    [OriginalImpl]: true,
    method: (args, context, above, engine, /** @type {null | Symbol} */ unFound = null) => {
      if (Array.isArray(args) && args.length === 1 && !Array.isArray(args[0])) args = args[0]
      // A unary optimization
      if (!Array.isArray(args)) {
        if (unFound && !(context && args in context)) return unFound
        if (context === null || context === undefined) return null
        const result = context[args]
        if (typeof result === 'undefined') return null
        return result
      }
      let result = context
      let start = 0
      // This block handles scope traversal
      if (Array.isArray(args[0]) && args[0].length === 1) {
        start++
        const climb = +Math.abs(args[0][0])
        let pos = 0
        for (let i = 0; i < climb; i++) {
          result = above[pos++]
          if (i === above.length - 1 && Array.isArray(result)) {
            above = result
            result = result[0]
            pos = 1
          }
        }
      }
      // This block handles traversing the path
      for (let i = start; i < args.length; i++) {
        if (unFound && !(result && args[i] in result)) return unFound
        if (result === null || result === undefined) return null
        result = result[args[i]]
      }
      if (typeof result === 'undefined') return unFound
      if (typeof result === 'function' && !engine.allowFunctions) return unFound
      return result
    },
    optimizeUnary: true
  },
  map: createArrayIterativeMethod('map'),
  some: {
    ...createArrayIterativeMethod('some', true),
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw INVALID_ARGUMENTS
      let [selector, mapper] = input

      selector = runOptimizedOrFallback(selector, engine, context, above) || []

      for (let i = 0; i < selector.length; i++) {
        if (engine.truthy(runOptimizedOrFallback(mapper, engine, selector[i], [selector, context, above]))) return true
      }
      return false
    }
  },
  all: {
    method: (args, context, above, engine) => {
      if (!Array.isArray(args)) throw INVALID_ARGUMENTS
      const selector = runOptimizedOrFallback(args[0], engine, context, above) || []
      if (Array.isArray(selector) && selector.length === 0) return false

      const mapper = args[1]

      for (let i = 0; i < selector.length; i++) {
        if (!engine.truthy(runOptimizedOrFallback(mapper, engine, selector[i], [selector, context, above]))) return false
      }
      return true
    },
    asyncMethod: async (args, context, above, engine) => {
      if (Array.isArray(args)) {
        const first = await engine.run(args[0], context, above)
        if (Array.isArray(first) && first.length === 0) return false
      }
      return oldAll.asyncMethod(args, context, above, engine)
    },
    lazy: oldAll.lazy
  },
  none: {
    lazy: true,
    method: (val, context, above, engine) => !defaultMethods.some.method(val, context, above, engine),
    asyncMethod: async (val, context, above, engine) => !(await defaultMethods.some.asyncMethod(val, context, above, engine))
  },
  merge: (args) => {
    if (!Array.isArray(args)) return [args]
    const result = []
    for (let i = 0; i < args.length; i++) {
      if (Array.isArray(args[i])) {
        for (let j = 0; j < args[i].length; j++) {
          result.push(args[i][j])
        }
      } else result.push(args[i])
    }
    return result
  },
  filter: createArrayIterativeMethod('filter', true),
  reduce: {
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw INVALID_ARGUMENTS
      let [selector, mapper, defaultValue] = input

      defaultValue = assertAllowedDepth(runOptimizedOrFallback(defaultValue, engine, context, above), engine.options.maxDepth)
      selector = runOptimizedOrFallback(selector, engine, context, above) || []
      const func = (accumulator, current) => assertAllowedDepth(engine.run(mapper, { accumulator, current }, { above: [selector, context, above] }), engine.options.maxDepth)

      if (typeof defaultValue === 'undefined') return selector.reduce(func)

      return selector.reduce(func, defaultValue)
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw INVALID_ARGUMENTS
      let [selector, mapper, defaultValue] = input

      defaultValue = assertAllowedDepth(await engine.run(defaultValue, context, { above }), engine.options.maxDepth)
      selector = (await engine.run(selector, context, { above })) || []
      return asyncIterators.reduce(
        selector,
        (accumulator, current) => {
          return engine.run(
            mapper,
            {
              accumulator,
              current
            },
            {
              above: [selector, context, above]
            }
          )
        },
        defaultValue,
        engine.options.maxDepth
      )
    },
    lazy: true
  },
  '!': (value, _1, _2, engine) => Array.isArray(value) ? !engine.truthy(value[0]) : !engine.truthy(value),
  '!!': (value, _1, _2, engine) => Boolean(Array.isArray(value) ? engine.truthy(value[0]) : engine.truthy(value)),
  cat: {
    method: (arr) => {
      if (typeof arr === 'string') return arr
      if (!Array.isArray(arr)) return arr.toString()
      let res = ''
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === null || arr[i] === undefined) continue
        res += arr[i]
      }
      return res
    },
    optimizeUnary: true
  },
  keys: ([obj]) => typeof obj === 'object' ? Object.keys(obj) : [],
  pipe: {
    lazy: true,
    method: (args, context, above, engine) => {
      if (!Array.isArray(args)) throw new Error('Data for pipe must be an array')
      let answer = engine.run(args[0], context, { above: [args, context, above] })
      for (let i = 1; i < args.length; i++) answer = engine.run(args[i], answer, { above: [args, context, above] })
      return answer
    },
    asyncMethod: async (args, context, above, engine) => {
      if (!Array.isArray(args)) throw new Error('Data for pipe must be an array')
      let answer = await engine.run(args[0], context, { above: [args, context, above] })
      for (let i = 1; i < args.length; i++) answer = await engine.run(args[i], answer, { above: [args, context, above] })
      return answer
    }
  },
  eachKey: {
    lazy: true,
    method: (object, context, above, engine) => {
      const result = Object.keys(object).reduce((accumulator, key) => {
        const item = object[key]
        Object.defineProperty(accumulator, key, {
          enumerable: true,
          value: engine.run(item, context, { above })
        })
        return accumulator
      }, {})
      return result
    },
    asyncMethod: async (object, context, above, engine) => {
      const result = await asyncIterators.reduce(
        Object.keys(object),
        async (accumulator, key) => {
          const item = object[key]
          Object.defineProperty(accumulator, key, {
            enumerable: true,
            value: await engine.run(item, context, { above })
          })
          return accumulator
        },
        {},
        Infinity
      )
      return result
    }
  }
}

function createComparator (name, func) {
  const strict = name.length === 3
  return {
    method: (args, context, above, engine) => {
      if (!Array.isArray(args) || args.length <= 1) throw INVALID_ARGUMENTS
      if (args.length === 2) {
        const a = runOptimizedOrFallback(args[0], engine, context, above)
        const b = runOptimizedOrFallback(args[1], engine, context, above)
        if (strict || ((typeof a === 'string' || a === null) && (typeof b === 'string' || b === null))) return func(a, b)
        if (Number.isNaN(+precoerceNumber(a))) throw NaN
        if (Number.isNaN(+precoerceNumber(b)) && a !== null) throw NaN
        return func(+a, +b)
      }
      let prev = runOptimizedOrFallback(args[0], engine, context, above)
      for (let i = 1; i < args.length; i++) {
        const current = runOptimizedOrFallback(args[i], engine, context, above)
        if (strict || ((typeof current === 'string' || current === null) && (typeof prev === 'string' || prev === null))) if (!func(prev, current)) return false
        if (Number.isNaN(+precoerceNumber(current)) && prev !== null) throw NaN
        if (i === 1 && Number.isNaN(+precoerceNumber(prev))) throw NaN
        if (!func(+prev, +current)) return false
        prev = current
      }
      return true
    },
    asyncMethod: async (args, context, above, engine) => {
      if (!Array.isArray(args) || args.length <= 1) throw INVALID_ARGUMENTS
      if (args.length === 2) {
        const a = await runOptimizedOrFallback(args[0], engine, context, above)
        const b = await runOptimizedOrFallback(args[1], engine, context, above)
        if (strict || ((typeof a === 'string' || a === null) && (typeof b === 'string' || b === null))) return func(a, b)
        if (Number.isNaN(+precoerceNumber(a))) throw NaN
        if (Number.isNaN(+precoerceNumber(b)) && a !== null) throw NaN
        return func(+a, +b)
      }
      let prev = await runOptimizedOrFallback(args[0], engine, context, above)
      for (let i = 1; i < args.length; i++) {
        const current = await runOptimizedOrFallback(args[i], engine, context, above)
        if (strict || ((typeof current === 'string' || current === null) && (typeof prev === 'string' || prev === null))) if (!func(prev, current)) return false
        if (Number.isNaN(+precoerceNumber(current)) && prev !== null) throw NaN
        if (i === 1 && Number.isNaN(+precoerceNumber(prev))) throw NaN
        if (!func(+prev, +current)) return false
        prev = current
      }
      return true
    },
    lazy: true
  }
}

function createArrayIterativeMethod (name, useTruthy = false) {
  return {

    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw INVALID_ARGUMENTS
      let [selector, mapper] = input

      selector = runOptimizedOrFallback(selector, engine, context, above) || []

      return selector[name]((i, index) => {
        if (!mapper || typeof mapper !== 'object') return useTruthy ? engine.truthy(mapper) : mapper
        const result = runOptimizedOrFallback(mapper, engine, i, [{ iterator: selector, index }, context, above])
        return useTruthy ? engine.truthy(result) : result
      })
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw INVALID_ARGUMENTS
      let [selector, mapper] = input
      selector = (await engine.run(selector, context, { above })) || []
      return asyncIterators[name](selector, async (i, index) => {
        if (!mapper || typeof mapper !== 'object') return useTruthy ? engine.truthy(mapper) : mapper
        const result = await engine.run(mapper, i, {
          above: [{ iterator: selector, index }, context, above]
        })
        return useTruthy ? engine.truthy(result) : result
      })
    },
    lazy: true
  }
}

defaultMethods.every = defaultMethods.all
defaultMethods['?:'] = defaultMethods.if
defaultMethods.not = defaultMethods['!']
// declare all of the functions here synchronous

export default {
  ...defaultMethods,
  ...legacyMethods
}
