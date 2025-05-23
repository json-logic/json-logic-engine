// @ts-check
'use strict'

import {
  isSync,
  Sync,
  Compiled
} from './constants.js'

// asyncIterators is required for the compiler to operate as intended.
import asyncIterators from './async_iterators.js'
import { coerceArray } from './utilities/coerceArray.js'
import { countArguments } from './utilities/countArguments.js'
import { precoerceNumber, assertSize, compareCheck } from './utilities/downgrade.js'

/**
 * Provides a simple way to compile logic into a function that can be run.
 * @param {string[]} strings
 * @param  {...any} items
 * @returns {{ [Compiled]: string }}
 */
function compileTemplate (strings, ...items) {
  let res = ''
  const buildState = this
  for (let i = 0; i < strings.length; i++) {
    res += strings[i]
    if (i < items.length) {
      if (typeof items[i] === 'function') {
        this.methods.push(items[i])
        if (!isSync(items[i])) buildState.asyncDetected = true
        res += (isSync(items[i]) ? '' : ' await ') + 'methods[' + (buildState.methods.length - 1) + ']'
      } else if (items[i] && typeof items[i][Compiled] !== 'undefined') res += items[i][Compiled]
      else res += buildString(items[i], buildState)
    }
  }
  return { [Compiled]: res }
}

/**
 * @typedef BuildState
 * Used to keep track of the compilation.
 * @property {*} [engine]
 * @property {Object} [notTraversed]
 * @property {Object} [methods]
 * @property {Object} [state]
 * @property {Array} [processing]
 * @property {*} [async]
 * @property {Array} [above]
 * @property {Boolean} [asyncDetected]
 * @property {*} [values]
 * @property {Boolean} [avoidInlineAsync]
 * @property {string} [extraArguments]
 * @property {(strings: string[], ...items: any[]) => { compiled: string }} [compile] A function that can be used to compile a template.
 */

/**
 * Checks if the value passed in is a primitive JS object / value.
 * @param {*} x
 * @returns
 */
function isPrimitive (x, preserveObject) {
  if (typeof x === 'number' && (x === Infinity || x === -Infinity || Number.isNaN(x))) return false
  return (
    x === null ||
    x === undefined ||
    ['Number', 'String', 'Boolean'].includes(x.constructor.name) ||
    (!preserveObject && x.constructor.name === 'Object')
  )
}

/**
 * Checks if the method & its inputs are deterministic.
 * @param {*} method
 * @param {*} engine
 * @param {BuildState} buildState
 * @returns
 */
export function isDeterministic (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every((i) => isDeterministic(i, engine, buildState))
  }

  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]

    if (engine.isData(method, func)) return true
    if (func === undefined) return true

    // eslint-disable-next-line no-throw-literal
    if (!engine.methods[func]) throw { type: 'Unknown Operator', key: func }

    if (engine.methods[func].lazy) {
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

/**
 * Checks if the method & its inputs are synchronous.
 * @param {*} method
 * @param {*} engine
 */
function isDeepSync (method, engine) {
  if (!engine.async) return true

  if (Array.isArray(method)) return method.every(i => isDeepSync(i, engine))

  if (method && typeof method === 'object') {
    const keys = Object.keys(method)
    if (keys.length === 0) return true
    const func = keys[0]

    const lower = method[func]
    if (!isSync(engine.methods[func])) return false

    if (engine.methods[func].lazy) {
      if (typeof engine.methods[func][Sync] === 'function' && engine.methods[func][Sync](method, { engine })) return true
      return false
    }

    return isDeepSync(lower, engine)
  }

  return true
}

/**
 * Builds the string for the function that will be evaluated.
 * @param {*} method
 * @param {BuildState} buildState
 * @returns
 */
function buildString (method, buildState = {}) {
  const {
    notTraversed = [],
    async,
    processing = [],
    values = [],
    engine
  } = buildState
  function pushValue (value, preserveObject = false) {
    if (isPrimitive(value, preserveObject)) return JSON.stringify(value)
    values.push(value)
    return `values[${values.length - 1}]`
  }

  if (Array.isArray(method)) {
    let res = ''
    for (let i = 0; i < method.length; i++) {
      if (i > 0) res += ','
      res += buildString(method[i], buildState)
    }
    return '[' + res + ']'
  }

  let asyncDetected = false

  function makeAsync (result) {
    buildState.asyncDetected = buildState.asyncDetected || asyncDetected
    if (async && asyncDetected) return `await ${result}`
    return result
  }

  if (method && typeof method === 'object') {
    const keys = Object.keys(method)
    const func = keys[0]

    if (!func) return pushValue(method)
    if (!engine.methods[func] || keys.length > 1) {
      // Check if this is supposed to be "data" rather than a function.
      if (engine.isData(method, func)) return pushValue(method, true)
      // eslint-disable-next-line no-throw-literal
      throw { type: 'Unknown Operator', key: func }
    }

    if (
      !buildState.engine.disableInline &&
      engine.methods[func] &&
      isDeterministic(method, engine, buildState)
    ) {
      if (isDeepSync(method, engine)) {
        return pushValue((engine.fallback || engine).run(method), true)
      } else if (!buildState.avoidInlineAsync) {
        processing.push(engine.run(method).then((i) => pushValue(i)))
        return `__%%%${processing.length - 1}%%%__`
      } else {
        buildState.asyncDetected = true
        return `(await ${pushValue(engine.run(method))})`
      }
    }

    let lower = method[func]
    if ((!lower || typeof lower !== 'object') && (!engine.methods[func].lazy)) lower = [lower]

    if (engine.methods[func] && engine.methods[func].compile) {
      let str = engine.methods[func].compile(lower, buildState)
      if (str[Compiled]) str = str[Compiled]

      if ((str || '').startsWith('await')) buildState.asyncDetected = true

      if (str !== false) return str
    }

    let coerce = engine.methods[func].optimizeUnary ? '' : 'coerceArray'
    if (!coerce && Array.isArray(lower) && lower.length === 1 && !Array.isArray(lower[0])) lower = lower[0]
    else if (coerce && Array.isArray(lower)) coerce = ''

    const argumentsDict = [', context', ', context, above', ', context, above, engine']

    if (typeof engine.methods[func] === 'function') {
      asyncDetected = !isSync(engine.methods[func])
      const argumentsNeeded = argumentsDict[countArguments(engine.methods[func]) - 1] || argumentsDict[2]
      return makeAsync(`engine.methods["${func}"](${coerce}(` + buildString(lower, buildState) + ')' + argumentsNeeded + ')')
    } else {
      asyncDetected = Boolean(async && engine.methods[func] && engine.methods[func].asyncMethod)
      const argCount = countArguments(asyncDetected ? engine.methods[func].asyncMethod : engine.methods[func].method)
      let argumentsNeeded = argumentsDict[argCount - 1] || argumentsDict[2]

      if (asyncDetected && typeof engine.methods[func][Sync] === 'function' && engine.methods[func][Sync](lower, { engine })) {
        asyncDetected = false
        argumentsNeeded = argumentsNeeded.replace('engine', 'engine.fallback')
      }

      if (engine.methods[func] && !engine.methods[func].lazy) {
        return makeAsync(`engine.methods["${func}"]${asyncDetected ? '.asyncMethod' : '.method'}(${coerce}(` + buildString(lower, buildState) + ')' + argumentsNeeded + ')')
      } else {
        notTraversed.push(lower)
        return makeAsync(`engine.methods["${func}"]${asyncDetected ? '.asyncMethod' : '.method'}(` + `notTraversed[${notTraversed.length - 1}]` + argumentsNeeded + ')')
      }
    }
  }
  return pushValue(method)
}

/**
 * Synchronously compiles the logic to a function that can run the logic more optimally.
 * @param {*} method
 * @param {BuildState} [buildState]
 * @returns
 */
function build (method, buildState = {}) {
  Object.assign(
    buildState,
    Object.assign(
      {
        notTraversed: [],
        methods: [],
        state: {},
        processing: [],
        async: buildState.engine.async,
        asyncDetected: false,
        values: [],
        compile: compileTemplate
      },
      buildState
    )
  )
  const str = buildString(method, buildState)
  return processBuiltString(method, str, buildState)
}

/**
 * Asynchronously compiles the logic to a function that can run the logic more optimally. Also supports async logic methods.
 * @param {*} method
 * @param {BuildState} [buildState]
 * @returns
 */
async function buildAsync (method, buildState = {}) {
  Object.assign(
    buildState,
    Object.assign(
      {
        notTraversed: [],
        methods: [],
        state: {},
        processing: [],
        async: buildState.engine.async,
        asyncDetected: false,
        values: [],
        compile: compileTemplate
      },
      buildState
    )
  )
  const str = buildString(method, buildState)
  buildState.processing = await Promise.all(buildState.processing || [])
  return processBuiltString(method, str, buildState)
}

/**
 * Takes the string that's been generated and does some post-processing on it to be evaluated.
 * @param {*} method
 * @param {*} str
 * @param {BuildState} buildState
 * @returns
 */
function processBuiltString (method, str, buildState) {
  const {
    engine,
    methods,
    notTraversed,
    processing = [],
    values
  } = buildState

  const above = []

  processing.forEach((item, x) => {
    str = str.replace(`__%%%${x}%%%__`, item)
  })

  const final = `(values, methods, notTraversed, asyncIterators, engine, above, coerceArray, precoerceNumber, assertSize, compareCheck) => ${buildState.asyncDetected ? 'async' : ''} (context ${buildState.extraArguments ? ',' + buildState.extraArguments : ''}) => { ${str.includes('prev') ? 'let prev;' : ''} const result = ${str}; return result }`
  // console.log(str)
  // console.log(final)
  // eslint-disable-next-line no-eval
  return Object.assign(
    (typeof globalThis !== 'undefined' ? globalThis : global).eval(final)(values, methods, notTraversed, asyncIterators, engine, above, coerceArray, precoerceNumber, assertSize, compareCheck), {
      [Sync]: !buildState.asyncDetected,
      deterministic: !str.includes('('),
      aboveDetected: typeof str === 'string' && str.includes(', above')
    })
}

export { build }
export { buildAsync }
export { buildString }

export default {
  build,
  buildAsync,
  buildString
}
