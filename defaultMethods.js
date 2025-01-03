// @ts-check
'use strict'

import asyncIterators from './async_iterators.js'
import { Sync, isSync, Unfound, OriginalImpl } from './constants.js'
import declareSync from './utilities/declareSync.js'
import { build, buildString } from './compiler.js'
import chainingSupported from './utilities/chainingSupported.js'
import InvalidControlInput from './errors/InvalidControlInput.js'
import legacyMethods from './legacy.js'

function isDeterministic (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every((i) => isDeterministic(i, engine, buildState))
  }
  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]

    if (engine.isData(method, func)) return true
    if (!engine.methods[func]) throw new Error(`Method '${func}' was not found in the Logic Engine.`)

    if (engine.methods[func].traverse === false) {
      return typeof engine.methods[func].deterministic === 'function'
        ? engine.methods[func].deterministic(lower, buildState)
        : engine.methods[func].deterministic
    }
    return typeof engine.methods[func].deterministic === 'function'
      ? engine.methods[func].deterministic(lower, buildState)
      : engine.methods[func].deterministic &&
          isDeterministic(lower, engine, buildState)
  }
  return true
}

function isSyncDeep (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every((i) => isSyncDeep(i, engine, buildState))
  }

  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]
    if (engine.isData(method, func)) return true
    if (!engine.methods[func]) throw new Error(`Method '${func}' was not found in the Logic Engine.`)
    if (engine.methods[func].traverse === false) return typeof engine.methods[func][Sync] === 'function' ? engine.methods[func][Sync](lower, buildState) : engine.methods[func][Sync]
    return typeof engine.methods[func][Sync] === 'function' ? engine.methods[func][Sync](lower, buildState) : engine.methods[func][Sync] && isSyncDeep(lower, engine, buildState)
  }

  return true
}

const defaultMethods = {
  '+': (data) => {
    if (typeof data === 'string') return +data
    if (typeof data === 'number') return +data
    let res = 0
    for (let i = 0; i < data.length; i++) res += +data[i]
    return res
  },
  '*': (data) => {
    let res = 1
    for (let i = 0; i < data.length; i++) res *= +data[i]
    return res
  },
  '/': (data) => {
    let res = data[0]
    for (let i = 1; i < data.length; i++) res /= +data[i]
    return res
  },
  '-': (data) => {
    if (typeof data === 'string') return -data
    if (typeof data === 'number') return -data
    if (data.length === 1) return -data[0]
    let res = data[0]
    for (let i = 1; i < data.length; i++) res -= +data[i]
    return res
  },
  '%': (data) => {
    let res = data[0]
    for (let i = 1; i < data.length; i++) res %= +data[i]
    return res
  },
  max: (data) => Math.max(...data),
  min: (data) => Math.min(...data),
  in: ([item, array]) => (array || []).includes(item),
  preserve: {
    traverse: false,
    method: declareSync((i) => i, true),
    [Sync]: () => true
  },
  if: {
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

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

        const test = engine.run(check, context, { above })

        // if the condition is true, run the true branch
        if (engine.truthy(test)) return engine.run(onTrue, context, { above })
      }

      return engine.run(onFalse, context, { above })
    },
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    deterministic: (data, buildState) => {
      return isDeterministic(data, buildState.engine, buildState)
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

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
    traverse: false
  },
  '<': (args) => {
    if (args.length === 2) return args[0] < args[1]
    for (let i = 1; i < args.length; i++) {
      if (args[i - 1] >= args[i]) return false
    }
    return true
  },
  '<=': (args) => {
    if (args.length === 2) return args[0] <= args[1]
    for (let i = 1; i < args.length; i++) {
      if (args[i - 1] > args[i]) return false
    }
    return true
  },
  '>': (args) => {
    if (args.length === 2) return args[0] > args[1]
    for (let i = 1; i < args.length; i++) {
      if (args[i - 1] <= args[i]) return false
    }
    return true
  },
  '>=': (args) => {
    if (args.length === 2) return args[0] >= args[1]
    for (let i = 1; i < args.length; i++) {
      if (args[i - 1] < args[i]) return false
    }
    return true
  },
  '==': (args) => {
    // eslint-disable-next-line eqeqeq
    if (args.length === 2) return args[0] == args[1]
    for (let i = 1; i < args.length; i++) {
      // eslint-disable-next-line eqeqeq
      if (args[i - 1] != args[i]) return false
    }
    return true
  },
  '===': (args) => {
    if (args.length === 2) return args[0] === args[1]
    for (let i = 1; i < args.length; i++) {
      if (args[i - 1] !== args[i]) return false
    }
    return true
  },
  '!=': (args) => {
    // eslint-disable-next-line eqeqeq
    if (args.length === 2) return args[0] != args[1]
    for (let i = 1; i < args.length; i++) {
      // eslint-disable-next-line eqeqeq
      if (args[i - 1] == args[i]) return false
    }
    return true
  },
  '!==': (args) => {
    if (args.length === 2) return args[0] !== args[1]
    for (let i = 1; i < args.length; i++) {
      if (args[i - 1] === args[i]) return false
    }
    return true
  },
  xor: ([a, b]) => a ^ b,
  // Why "executeInLoop"? Because if it needs to execute to get an array, I do not want to execute the arguments,
  // Both for performance and safety reasons.
  '??': {
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    method: (arr, _1, _2, engine) => {
      // See "executeInLoop" above
      const executeInLoop = Array.isArray(arr)
      if (!executeInLoop) arr = engine.run(arr, _1, { above: _2 })

      let item
      for (let i = 0; i < arr.length; i++) {
        item = executeInLoop ? engine.run(arr[i], _1, { above: _2 }) : arr[i]
        if (item !== null && item !== undefined) return item
      }

      if (item === undefined) return null
      return item
    },
    asyncMethod: async (arr, _1, _2, engine) => {
      // See "executeInLoop" above
      const executeInLoop = Array.isArray(arr)
      if (!executeInLoop) arr = await engine.run(arr, _1, { above: _2 })

      let item
      for (let i = 0; i < arr.length; i++) {
        item = executeInLoop ? await engine.run(arr[i], _1, { above: _2 }) : arr[i]
        if (item !== null && item !== undefined) return item
      }

      if (item === undefined) return null
      return item
    },
    deterministic: (data, buildState) => isDeterministic(data, buildState.engine, buildState),
    compile: (data, buildState) => {
      if (!chainingSupported) return false
      if (Array.isArray(data) && data.length) return `(${data.map((i) => buildString(i, buildState)).join(' ?? ')})`
      return `(${buildString(data, buildState)}).reduce((a,b) => a ?? b, null)`
    },
    traverse: false
  },
  or: {
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    method: (arr, _1, _2, engine) => {
      // See "executeInLoop" above
      const executeInLoop = Array.isArray(arr)
      if (!executeInLoop) arr = engine.run(arr, _1, { above: _2 })

      let item
      for (let i = 0; i < arr.length; i++) {
        item = executeInLoop ? engine.run(arr[i], _1, { above: _2 }) : arr[i]
        if (engine.truthy(item)) return item
      }

      return item
    },
    asyncMethod: async (arr, _1, _2, engine) => {
      // See "executeInLoop" above
      const executeInLoop = Array.isArray(arr)
      if (!executeInLoop) arr = await engine.run(arr, _1, { above: _2 })

      let item
      for (let i = 0; i < arr.length; i++) {
        item = executeInLoop ? await engine.run(arr[i], _1, { above: _2 }) : arr[i]
        if (engine.truthy(item)) return item
      }

      return item
    },
    deterministic: (data, buildState) => isDeterministic(data, buildState.engine, buildState),
    compile: (data, buildState) => {
      if (!buildState.engine.truthy[OriginalImpl]) return false
      if (Array.isArray(data) && data.length) return `(${data.map((i) => buildString(i, buildState)).join(' || ')})`
      return `(${buildString(data, buildState)}).reduce((a,b) => a||b, false)`
    },
    traverse: false
  },
  and: {
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    method: (arr, _1, _2, engine) => {
      // See "executeInLoop" above
      const executeInLoop = Array.isArray(arr)
      if (!executeInLoop) arr = engine.run(arr, _1, { above: _2 })

      let item
      for (let i = 0; i < arr.length; i++) {
        item = executeInLoop ? engine.run(arr[i], _1, { above: _2 }) : arr[i]
        if (!engine.truthy(item)) return item
      }
      return item
    },
    asyncMethod: async (arr, _1, _2, engine) => {
      // See "executeInLoop" above
      const executeInLoop = Array.isArray(arr)
      if (!executeInLoop) arr = await engine.run(arr, _1, { above: _2 })

      let item
      for (let i = 0; i < arr.length; i++) {
        item = executeInLoop ? await engine.run(arr[i], _1, { above: _2 }) : arr[i]
        if (!engine.truthy(item)) return item
      }
      return item
    },
    traverse: false,
    deterministic: (data, buildState) => isDeterministic(data, buildState.engine, buildState),
    compile: (data, buildState) => {
      if (!buildState.engine.truthy[OriginalImpl]) return false
      if (Array.isArray(data) && data.length) return `(${data.map((i) => buildString(i, buildState)).join(' && ')})`
      return `(${buildString(data, buildState)}).reduce((a,b) => a&&b, true)`
    }
  },
  substr: ([string, from, end]) => {
    if (end < 0) {
      const result = string.substr(from)
      return result.substr(0, result.length + end)
    }
    return string.substr(from, end)
  },
  length: ([i]) => {
    if (typeof i === 'string' || Array.isArray(i)) return i.length
    if (i && typeof i === 'object') return Object.keys(i).length
    return 0
  },
  exists: {
    method: (key, context, above, engine) => {
      const result = defaultMethods.val.method(key, context, above, engine, Unfound)
      return result !== Unfound
    },
    traverse: true,
    deterministic: false
  },
  val: {
    [OriginalImpl]: true,
    method: (args, context, above, engine, /** @type {null | Symbol} */ unFound = null) => {
      if (Array.isArray(args) && args.length === 1) args = args[0]
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
    optimizeUnary: true,
    deterministic: (data, buildState) => {
      if (buildState.insideIterator) {
        if (Array.isArray(data) && Array.isArray(data[0]) && Math.abs(data[0][0]) >= 2) return false
        return true
      }
      return false
    },
    compile: (data, buildState) => {
      function wrapNull (data) {
        if (!chainingSupported) return buildState.compile`(methods.preventFunctions(((a) => a === null || a === undefined ? null : a)(${data})))`
        return buildState.compile`(methods.preventFunctions(${data} ?? null))`
      }

      if (!buildState.engine.allowFunctions) buildState.methods.preventFunctions = a => typeof a === 'function' ? null : a
      else buildState.methods.preventFunctions = a => a

      if (typeof data === 'object' && !Array.isArray(data)) {
        // If the input for this function can be inlined, we will do so right here.
        if (isSyncDeep(data, buildState.engine, buildState) && isDeterministic(data, buildState.engine, buildState) && !buildState.engine.disableInline) data = (buildState.engine.fallback || buildState.engine).run(data, buildState.context, { above: buildState.above })
        else return false
      }
      if (Array.isArray(data) && Array.isArray(data[0])) {
        // A very, very specific optimization.
        if (buildState.iteratorCompile && Math.abs(data[0][0] || 0) === 1 && data[1] === 'index') return buildState.compile`index`
        return false
      }
      if (Array.isArray(data) && data.length === 1) data = data[0]
      if (data === null) return wrapNull(buildState.compile`context`)
      if (!Array.isArray(data)) return wrapNull(buildState.compile`(context || 0)[${data}]`)
      if (Array.isArray(data)) {
        let res = buildState.compile`context`
        for (let i = 0; i < data.length; i++) {
          if (data[i] === null) continue
          if (chainingSupported) res = buildState.compile`${res}?.[${data[i]}]`
          else res = buildState.compile`(${res}|| 0)[${data[i]}]`
        }
        return wrapNull(buildState.compile`(${res})`)
      }
      return false
    }
  },
  map: createArrayIterativeMethod('map'),
  some: createArrayIterativeMethod('some', true),
  all: createArrayIterativeMethod('every', true),
  none: {
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    traverse: false,
    // todo: add async build & build
    method: (val, context, above, engine) => {
      return !defaultMethods.some.method(val, context, above, engine)
    },
    asyncMethod: async (val, context, above, engine) => {
      return !(await defaultMethods.some.asyncMethod(
        val,
        context,
        above,
        engine
      ))
    },
    compile: (data, buildState) => {
      const result = defaultMethods.some.compile(data, buildState)
      return result ? buildState.compile`!(${result})` : false
    }
  },
  merge: (arrays) => (Array.isArray(arrays) ? [].concat(...arrays) : [arrays]),
  every: createArrayIterativeMethod('every'),
  filter: createArrayIterativeMethod('filter', true),
  reduce: {
    deterministic: (data, buildState) => {
      return (
        isDeterministic(data[0], buildState.engine, buildState) &&
        isDeterministic(data[1], buildState.engine, {
          ...buildState,
          insideIterator: true
        })
      )
    },
    compile: (data, buildState) => {
      if (!Array.isArray(data)) throw new InvalidControlInput(data)
      const { async } = buildState
      let [selector, mapper, defaultValue] = data
      selector = buildString(selector, buildState)
      if (typeof defaultValue !== 'undefined') {
        defaultValue = buildString(defaultValue, buildState)
      }
      const mapState = {
        ...buildState,
        extraArguments: 'above',
        avoidInlineAsync: true
      }
      mapper = build(mapper, mapState)
      const aboveArray = mapper.aboveDetected ? '[null, context, above]' : 'null'

      buildState.methods.push(mapper)
      if (async) {
        if (!isSync(mapper) || selector.includes('await')) {
          buildState.asyncDetected = true
          if (typeof defaultValue !== 'undefined') {
            return `await asyncIterators.reduce(${selector} || [], (a,b) => methods[${
              buildState.methods.length - 1
            }]({ accumulator: a, current: b }, ${aboveArray}), ${defaultValue})`
          }
          return `await asyncIterators.reduce(${selector} || [], (a,b) => methods[${
            buildState.methods.length - 1
          }]({ accumulator: a, current: b }, ${aboveArray}))`
        }
      }
      if (typeof defaultValue !== 'undefined') {
        return `(${selector} || []).reduce((a,b) => methods[${
          buildState.methods.length - 1
        }]({ accumulator: a, current: b }, ${aboveArray}), ${defaultValue})`
      }
      return `(${selector} || []).reduce((a,b) => methods[${
        buildState.methods.length - 1
      }]({ accumulator: a, current: b }, ${aboveArray}))`
    },
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper, defaultValue] = input
      defaultValue = engine.run(defaultValue, context, {
        above
      })
      selector =
        engine.run(selector, context, {
          above
        }) || []
      const func = (accumulator, current) => {
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
      }
      if (typeof defaultValue === 'undefined') {
        return selector.reduce(func)
      }
      return selector.reduce(func, defaultValue)
    },
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper, defaultValue] = input
      defaultValue = await engine.run(defaultValue, context, {
        above
      })
      selector =
        (await engine.run(selector, context, {
          above
        })) || []
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
        defaultValue
      )
    },
    traverse: false
  },
  '!': (value, _1, _2, engine) => Array.isArray(value) ? !engine.truthy(value[0]) : !engine.truthy(value),
  '!!': (value, _1, _2, engine) => Boolean(Array.isArray(value) ? engine.truthy(value[0]) : engine.truthy(value)),
  cat: {
    [OriginalImpl]: true,
    [Sync]: true,
    method: (arr) => {
      if (typeof arr === 'string') return arr
      if (!Array.isArray(arr)) return arr.toString()
      let res = ''
      for (let i = 0; i < arr.length; i++) res += arr[i].toString()
      return res
    },
    deterministic: true,
    traverse: true,
    optimizeUnary: true,
    compile: (data, buildState) => {
      if (typeof data === 'string') return JSON.stringify(data)
      if (typeof data === 'number') return '"' + JSON.stringify(data) + '"'
      if (!Array.isArray(data)) return false
      let res = buildState.compile`''`
      for (let i = 0; i < data.length; i++) res = buildState.compile`${res} + ${data[i]}`
      return buildState.compile`(${res})`
    }
  },
  keys: ([obj]) => typeof obj === 'object' ? Object.keys(obj) : [],
  pipe: {
    traverse: false,
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
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
    },
    compile: (args, buildState) => {
      let res = buildState.compile`${args[0]}`
      for (let i = 1; i < args.length; i++) res = buildState.compile`${build(args[i], { ...buildState, extraArguments: 'above' })}(${res}, [null, context, above])`
      return res
    },
    deterministic: (data, buildState) => {
      if (!Array.isArray(data)) return false
      data = [...data]
      const first = data.shift()
      return isDeterministic(first, buildState.engine, buildState) && isDeterministic(data, buildState.engine, { ...buildState, insideIterator: true })
    }
  },
  eachKey: {
    traverse: false,
    [Sync]: (data, buildState) => isSyncDeep(Object.values(data[Object.keys(data)[0]]), buildState.engine, buildState),
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
    deterministic: (data, buildState) => {
      if (data && typeof data === 'object') {
        return Object.values(data).every((i) => {
          return isDeterministic(i, buildState.engine, buildState)
        })
      }
      throw new InvalidControlInput(data)
    },
    compile: (data, buildState) => {
      // what's nice about this is that I don't have to worry about whether it's async or not, the lower entries take care of that ;)
      // however, this is not engineered support yields, I will have to make a note of that & possibly support it at a later point.
      if (data && typeof data === 'object') {
        const result = `({ ${Object.keys(data)
          .reduce((accumulator, key) => {
            accumulator.push(
              // @ts-ignore Never[] is not accurate
              `${JSON.stringify(key)}: ${buildString(data[key], buildState)}`
            )
            return accumulator
          }, [])
          .join(',')} })`
        return result
      }
      throw new InvalidControlInput(data)
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
        {}
      )
      return result
    }
  }
}

function createArrayIterativeMethod (name, useTruthy = false) {
  return {
    deterministic: (data, buildState) => {
      return (
        isDeterministic(data[0], buildState.engine, buildState) &&
        isDeterministic(data[1], buildState.engine, {
          ...buildState,
          insideIterator: true
        })
      )
    },
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper] = input
      selector =
        engine.run(selector, context, {
          above
        }) || []

      return selector[name]((i, index) => {
        const result = engine.run(mapper, i, {
          above: [{ iterator: selector, index }, context, above]
        })
        return useTruthy ? engine.truthy(result) : result
      })
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper] = input
      selector =
        (await engine.run(selector, context, {
          above
        })) || []
      return asyncIterators[name](selector, async (i, index) => {
        const result = await engine.run(mapper, i, {
          above: [{ iterator: selector, index }, context, above]
        })
        return useTruthy ? engine.truthy(result) : result
      })
    },
    compile: (data, buildState) => {
      if (!Array.isArray(data)) throw new InvalidControlInput(data)
      const { async } = buildState
      const [selector, mapper] = data

      const mapState = {
        ...buildState,
        avoidInlineAsync: true,
        iteratorCompile: true,
        extraArguments: 'index, above'
      }

      const method = build(mapper, mapState)
      const aboveArray = method.aboveDetected ? buildState.compile`[{ iterator: z, index: x }, context, above]` : buildState.compile`null`
      const useTruthyMethod = useTruthy ? buildState.compile`engine.truthy` : buildState.compile``

      if (async) {
        if (!isSync(method)) {
          buildState.asyncDetected = true
          return buildState.compile`await asyncIterators[${name}](${selector} || [], async (i, x, z) => ${useTruthyMethod}(${method}(i, x, ${aboveArray})))`
        }
      }

      return buildState.compile`(${selector} || [])[${name}]((i, x, z) => ${useTruthyMethod}(${method}(i, x, ${aboveArray})))`
    },
    traverse: false
  }
}
defaultMethods['?:'] = defaultMethods.if
// declare all of the functions here synchronous
Object.keys(defaultMethods).forEach((item) => {
  if (typeof defaultMethods[item] === 'function') {
    defaultMethods[item][Sync] = true
  }
  defaultMethods[item].deterministic =
    typeof defaultMethods[item].deterministic === 'undefined'
      ? true
      : defaultMethods[item].deterministic
})

// @ts-ignore Allow custom attribute
defaultMethods['<'].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 2) return false
  let res = buildState.compile`(${data[0]} < ${data[1]})`
  for (let i = 2; i < data.length; i++) res = buildState.compile`(${res} && ${data[i - 1]} < ${data[i]})`
  return res
}
// @ts-ignore Allow custom attribute
defaultMethods['<='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 2) return false
  let res = buildState.compile`(${data[0]} <= ${data[1]})`
  for (let i = 2; i < data.length; i++) res = buildState.compile`(${res} && ${data[i - 1]} <= ${data[i]})`
  return res
}
// @ts-ignore Allow custom attribute
defaultMethods.min.compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  return `Math.min(${data
    .map((i) => buildString(i, buildState))
    .join(', ')})`
}
// @ts-ignore Allow custom attribute
defaultMethods.max.compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  return `Math.max(${data
    .map((i) => buildString(i, buildState))
    .join(', ')})`
}
// @ts-ignore Allow custom attribute
defaultMethods['>'].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 2) return false
  let res = buildState.compile`(${data[0]} > ${data[1]})`
  for (let i = 2; i < data.length; i++) res = buildState.compile`(${res} && ${data[i - 1]} > ${data[i]})`
  return res
}
// @ts-ignore Allow custom attribute
defaultMethods['>='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 2) return false
  let res = buildState.compile`(${data[0]} >= ${data[1]})`
  for (let i = 2; i < data.length; i++) res = buildState.compile`(${res} && ${data[i - 1]} >= ${data[i]})`
  return res
}
// @ts-ignore Allow custom attribute
defaultMethods['=='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 2) return false
  let res = buildState.compile`(${data[0]} == ${data[1]})`
  for (let i = 2; i < data.length; i++) res = buildState.compile`(${res} && ${data[i - 1]} == ${data[i]})`
  return res
}
// @ts-ignore Allow custom attribute
defaultMethods['!='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 2) return false
  let res = buildState.compile`(${data[0]} != ${data[1]})`
  for (let i = 2; i < data.length; i++) res = buildState.compile`(${res} && ${data[i - 1]} != ${data[i]})`
  return res
}
// @ts-ignore Allow custom attribute
defaultMethods.if.compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 3) return false

  data = [...data]
  if (data.length % 2 !== 1) data.push(null)
  const onFalse = data.pop()

  let res = buildState.compile``
  while (data.length) {
    const condition = data.shift()
    const onTrue = data.shift()
    res = buildState.compile`${res} engine.truthy(${condition}) ? ${onTrue} : `
  }

  return buildState.compile`(${res} ${onFalse})`
}
// @ts-ignore Allow custom attribute
defaultMethods['==='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 2) return false
  let res = buildState.compile`(${data[0]} === ${data[1]})`
  for (let i = 2; i < data.length; i++) res = buildState.compile`(${res} && ${data[i - 1]} === ${data[i]})`
  return res
}
// @ts-ignore Allow custom attribute
defaultMethods['+'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' + ')})`
  } else if (typeof data === 'string' || typeof data === 'number') {
    return `(+${buildString(data, buildState)})`
  } else {
    return `([].concat(${buildString(
      data,
      buildState
    )})).reduce((a,b) => (+a)+(+b), 0)`
  }
}

// @ts-ignore Allow custom attribute
defaultMethods['%'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' % ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)%(+b))`
  }
}

// @ts-ignore Allow custom attribute
defaultMethods.in.compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  return buildState.compile`(${data[1]} || []).includes(${data[0]})`
}

// @ts-ignore Allow custom attribute
defaultMethods['-'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `${data.length === 1 ? '-' : ''}(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' - ')})`
  }
  if (typeof data === 'string' || typeof data === 'number') {
    return `(-${buildString(data, buildState)})`
  } else {
    return `((a=>(a.length===1?a[0]=-a[0]:a)&0||a)([].concat(${buildString(
      data,
      buildState
    )}))).reduce((a,b) => (+a)-(+b))`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods['/'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' / ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)/(+b))`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods['*'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' * ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)*(+b))`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods.cat.compile = function (data, buildState) {
  if (typeof data === 'string') return JSON.stringify(data)
  if (!Array.isArray(data)) return false
  let res = buildState.compile`''`
  for (let i = 0; i < data.length; i++) res = buildState.compile`${res} + ${data[i]}`
  return buildState.compile`(${res})`
}

// @ts-ignore Allow custom attribute
defaultMethods['!'].compile = function (
  data,
  buildState
) {
  if (Array.isArray(data)) return buildState.compile`(!engine.truthy(${data[0]}))`
  return buildState.compile`(!engine.truthy(${data}))`
}

defaultMethods.not = defaultMethods['!']

// @ts-ignore Allow custom attribute
defaultMethods['!!'].compile = function (data, buildState) {
  if (Array.isArray(data)) return buildState.compile`(!!engine.truthy(${data[0]}))`
  return `(!!engine.truthy(${data}))`
}
defaultMethods.none.deterministic = defaultMethods.some.deterministic

// @ts-ignore Allowing a optimizeUnary attribute that can be used for performance optimizations
defaultMethods['+'].optimizeUnary = defaultMethods['-'].optimizeUnary = defaultMethods['!'].optimizeUnary = defaultMethods['!!'].optimizeUnary = defaultMethods.cat.optimizeUnary = true

export default {
  ...defaultMethods,
  ...legacyMethods
}
