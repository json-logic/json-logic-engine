
export function configurePrecision (engine, constructor, compatible = true) {
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
        if (args[0].eq) return args[0].eq(args[1])
        if (args[1].eq) return args[1].eq(args[0])
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

  engine.addMethod('!==', {
    method: (args) => {
      if (args.length === 2) {
        if (args[0].eq) return !args[0].eq(args[1])
        if (args[1].eq) return !args[1].eq(args[0])
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
