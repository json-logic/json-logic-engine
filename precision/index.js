
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
      if (typeof data === 'string') return constructor(data)
      if (typeof data === 'number') return constructor(data)
      let res = constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.plus(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.plus(${args[i]}))`
        return res
      }
      return false
    }
  }, { optimizeUnary: true, sync: true, deterministic: true })

  engine.addMethod('-', {
    method: (data) => {
      if (typeof data === 'string') return constructor(data).mul(-1)
      if (typeof data === 'number') return constructor(data).mul(-1)
      let res = constructor(data[0])
      if (data.length === 1) return res.mul(-1)
      for (let i = 1; i < data.length; i++) res = res.minus(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(engine.precision(${args[0]}))`
        if (args.length === 1) return buildState.compile`(${res}.mul(-1))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.minus(${args[i]}))`
        return res
      }
      return false
    }
  }, { optimizeUnary: true, sync: true, deterministic: true })

  engine.addMethod('*', {
    method: (data) => {
      let res = constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.mul(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.mul(${args[i]}))`
        return res
      }
      return false
    }
  }, { sync: true, deterministic: true })

  engine.addMethod('/', {
    method: (data) => {
      let res = constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.div(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.div(${args[i]}))`
        return res
      }
      return false
    }
  }, { sync: true, deterministic: true })

  engine.addMethod('%', {
    method: (data) => {
      let res = constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.mod(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.mod(${args[i]}))`
        return res
      }
      return false
    }
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
    }
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
    deterministic: true
  }, { sync: true, deterministic: true })
}
