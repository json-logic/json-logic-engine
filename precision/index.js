export function configurePrecision (engine, constructor) {
  engine.precision = constructor
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
    },
    optimizeUnary: true,
    deterministic: true,
    precise: true
  })

  engine.addMethod('-', {
    method: (data) => {
      if (typeof data === 'string') return constructor(data).mul(-1)
      if (typeof data === 'number') return constructor(data).mul(-1)
      let res = constructor(data[0])
      for (let i = 1; i < data.length; i++) res = res.minus(data[i])
      return res
    },
    compile: (args, buildState) => {
      if (Array.isArray(args)) {
        let res = buildState.compile`(engine.precision(${args[0]}))`
        for (let i = 1; i < args.length; i++) res = buildState.compile`(${res}.minus(${args[i]}))`
        return res
      }
      return false
    },
    optimizeUnary: true,
    deterministic: true,
    precise: true
  })

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
    },
    deterministic: true,
    precise: true
  })

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
    },
    deterministic: true,
    precise: true
  })

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
    },
    deterministic: true,
    precise: true
  })
}
