import defaultMethods from '../defaultMethods.js'

function configurePrecisionDecimalJs (engine, constructor, compatible = true) {
  engine.precision = constructor

  engine.truthy = (data) => {
    if ((data || false).toNumber) return Number(data)
    if (compatible && Array.isArray(data) && data.length === 0) return false
    return data
  }

  if (engine.fallback) engine.fallback.truthy = engine.truthy

  engine.addMethod('+', {
    method: (data) => {
      if (typeof data === 'string') return new constructor(data)
      if (typeof data === 'number') return new constructor(data)
      let res = new constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.plus(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(new engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.plus(${args[i]}))`
        return res
      }
      return false
    },
    traverse: true
  }, { optimizeUnary: true, sync: true, deterministic: true })

  engine.addMethod('-', {
    method: (data) => {
      if (typeof data === 'string') return new constructor(data).mul(-1)
      if (typeof data === 'number') return new constructor(data).mul(-1)
      let res = new constructor(data[0])
      if (data.length === 1) return res.mul(-1)
      for (let i = 1; i < data.length; i++) res = res.minus(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(new engine.precision(${args[0]}))`
        if (args.length === 1) return buildState.compile`(${res}.mul(-1))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.minus(${args[i]}))`
        return res
      }
      return false
    },
    traverse: true
  }, { optimizeUnary: true, sync: true, deterministic: true })

  engine.addMethod('*', {
    method: (data) => {
      let res = new constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.mul(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(new engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.mul(${args[i]}))`
        return res
      }
      return false
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('/', {
    method: (data) => {
      let res = new constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.div(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(new engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.div(${args[i]}))`
        return res
      }
      return false
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('%', {
    method: (data) => {
      let res = new constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.mod(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(new engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.mod(${args[i]}))`
        return res
      }
      return false
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('===', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].eq && (args[1].eq || typeof args[1] === 'number')) return args[0].eq(args[1])
        if (args[1].eq && (args[0].eq || typeof args[0] === 'number')) return args[1].eq(args[0])
        return args[0] === args[1]
      }
      for (let i = 1; i < args.length; i++) {
        if (args[i - 1].eq && !args[i - 1].eq(args[i])) return false
        if (args[i].eq && !args[i].eq(args[i - 1])) return false
        if (args[i - 1] !== args[i]) return false
      }
      return true
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('==', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].eq) return args[0].eq(args[1])
        if (args[1].eq) return args[1].eq(args[0])
        // eslint-disable-next-line eqeqeq
        return args[0] == args[1]
      }
      for (let i = 1; i < args.length; i++) {
        if (args[i - 1].eq && !args[i - 1].eq(args[i])) return false
        if (args[i].eq && !args[i].eq(args[i - 1])) return false
        // eslint-disable-next-line eqeqeq
        if (args[i - 1] != args[i]) return false
      }
      return true
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('!=', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].eq) return !args[0].eq(args[1])
        if (args[1].eq) return !args[1].eq(args[0])
        // eslint-disable-next-line eqeqeq
        return args[0] != args[1]
      }
      for (let i = 1; i < args.length; i++) {
        if (args[i - 1].eq && args[i - 1].eq(args[i])) return false
        if (args[i].eq && args[i].eq(args[i - 1])) return false
        // eslint-disable-next-line eqeqeq
        if (args[i - 1] !== args[i]) return true
      }
      return true
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('!==', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].eq && (args[1].eq || typeof args[1] === 'number')) return !args[0].eq(args[1])
        if (args[1].eq && (args[0].eq || typeof args[0] === 'number')) return !args[1].eq(args[0])
        return args[0] !== args[1]
      }
      for (let i = 1; i < args.length; i++) {
        if (args[i - 1].eq && args[i - 1].eq(args[i])) return false
        if (args[i].eq && args[i].eq(args[i - 1])) return false
        if (args[i - 1] !== args[i]) return true
      }
      return false
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('>', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].gt) return args[0].gt(args[1])
        if (args[1].lt) return args[1].lt(args[0])
        return args[0] > args[1]
      }
      for (let i = 1; i < args.length; i++) {
        if (args[i - 1].gt && !args[i - 1].gt(args[i])) return false
        if (args[i].lt && !args[i].lt(args[i - 1])) return false
        if (args[i - 1] <= args[i]) return false
      }
      return true
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('>=', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].gte) return args[0].gte(args[1])
        if (args[1].lte) return args[1].lte(args[0])
        return args[0] >= args[1]
      }
      for (let i = 1; i < args.length; i++) {
        if (args[i - 1].gte && !args[i - 1].gte(args[i])) return false
        if (args[i].lte && !args[i].lte(args[i - 1])) return false
        if (args[i - 1] < args[i]) return false
      }
      return true
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('<', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].lt) return args[0].lt(args[1])
        if (args[1].gt) return args[1].gt(args[0])
        return args[0] < args[1]
      }
      for (let i = 1; i < args.length; i++) {
        if (args[i - 1].lt && !args[i - 1].lt(args[i])) return false
        if (args[i].gt && !args[i].gt(args[i - 1])) return false
        if (args[i - 1] >= args[i]) return false
      }
      return true
    },
    traverse: true
  }, { sync: true, deterministic: true })

  engine.addMethod('<=', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].lte) return args[0].lte(args[1])
        if (args[1].gte) return args[1].gte(args[0])
        return args[0] <= args[1]
      }
      for (let i = 1; i < args.length; i++) {
        if (args[i - 1].lte && !args[i - 1].lte(args[i])) return false
        if (args[i].gte && !args[i].gte(args[i - 1])) return false
        if (args[i - 1] > args[i]) return false
      }
      return true
    },
    traverse: true
  }, { sync: true, deterministic: true })
}

/**
 * Allows you to configure precision for JSON Logic Engine.
 *
 * You can pass the following in:
 * - `ieee754` - Uses the IEEE 754 standard for calculations.
 * - `precise` - Tries to improve accuracy of calculations by scaling numbers during operations.
 * - A constructor for decimal.js.
 *
 * @example ```js
 * import { LogicEngine, configurePrecision } from 'json-logic-js'
 * import { Decimal } from 'decimal.js' // or decimal.js-light
 *
 * const engine = new LogicEngine()
 * configurePrecision(engine, Decimal)
 * ```
 *
 * The class this mechanism uses requires the following methods to be implemented:
 * - `eq`
 * - `gt`
 * - `gte`
 * - `lt`
 * - `lte`
 * - `plus`
 * - `minus`
 * - `mul`
 * - `div`
 * - `mod`
 * - `toNumber`
 *
 * ### FAQ:
 *
 * Q: Why is this not included in the class?
 *
 * A: This mechanism reimplements a handful of operators. Keeping this method separate makes it possible to tree-shake this code out
 *   if you don't need it.
 *
 * @param {import('../logic.d.ts').default | import('../asyncLogic.d.ts').default} engine
 * @param {'precise' | 'ieee754' | (...args: any[]) => any} constructor
 * @param {Boolean} compatible
 */
export function configurePrecision (engine, constructor, compatible = true) {
  if (typeof constructor === 'function') return configurePrecisionDecimalJs(engine, constructor, compatible)

  if (constructor === 'ieee754') {
    const operators = ['+', '-', '*', '/', '%', '===', '==', '!=', '!==', '>', '>=', '<', '<=']
    for (const operator of operators) engine.methods[operator] = defaultMethods[operator]
  }

  if (constructor !== 'precise') throw new Error('Unsupported precision type')

  engine.addMethod('+', (data) => {
    if (typeof data === 'string') return +data
    if (typeof data === 'number') return +data
    let res = 0
    let overflow = 0
    for (let i = 0; i < data.length; i++) {
      const item = +data[i]
      if (Number.isInteger(data[i])) res += item
      else {
        res += item | 0
        overflow += +('0.' + item.toString().split('.')[1]) * 1e6
      }
    }
    return res + (overflow / 1e6)
  }, { deterministic: true, sync: true })

  engine.addMethod('*', (data) => {
    const SCALE_FACTOR = 1e6 // Fixed scale for precision
    let result = 1

    for (let i = 0; i < data.length; i++) {
      const item = +data[i]

      if (item > 1e6 || result > 1e6) {
        result *= item
        continue
      }

      result *= (item * SCALE_FACTOR) | 0
      result /= SCALE_FACTOR
    }

    return result
  }, { deterministic: true, sync: true })

  engine.addMethod('/', (data) => {
    let res = data[0]
    for (let i = 1; i < data.length; i++) res /= +data[i]
    // if the value is really close to 0, we'll just return 0
    if (Math.abs(res) < 1e-10) return 0
    return res
  }, { deterministic: true, sync: true })

  engine.addMethod('-', (data) => {
    if (typeof data === 'string') return -data
    if (typeof data === 'number') return -data
    if (data.length === 1) return -data[0]
    let res = data[0]
    let overflow = 0
    for (let i = 1; i < data.length; i++) {
      const item = +data[i]
      if (Number.isInteger(data[i])) res -= item
      else {
        res -= item | 0
        overflow += +('0.' + item.toString().split('.')[1]) * 1e6
      }
    }
    return res - (overflow / 1e6)
  }, { deterministic: true, sync: true })

  engine.addMethod('%', (data) => {
    let res = data[0]

    if (data.length === 2) {
      if (data[0] < 1e6 && data[1] < 1e6) return ((data[0] * 10e3) % (data[1] * 10e3)) / 10e3
    }

    for (let i = 1; i < data.length; i++) res %= +data[i]
    // if the value is really close to 0, we'll just return 0
    if (Math.abs(res) < 1e-10) return 0
    return res
  }, { deterministic: true, sync: true })
}
