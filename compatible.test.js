import fs from 'fs'
import { LogicEngine, AsyncLogicEngine } from './index.js'
import { configurePrecision } from './precision/index.js'
import Decimal from 'decimal.js'

const tests = []

// get all json files from "suites" directory
const files = fs.readdirSync('./suites')
for (const file of files) {
  if (file.endsWith('.json')) {
    tests.push(...JSON.parse(fs.readFileSync(`./suites/${file}`).toString()).filter(i => typeof i !== 'string').map(i => {
      if (Array.isArray(i)) return i
      return [i.rule, i.data || {}, i.result]
    }))
  }
}

const engines = []

for (let i = 0; i < 16; i++) {
  let res = 'sync'
  let engine = new LogicEngine(undefined, { compatible: true })
  // sync / async
  if (i & 1) {
    engine = new AsyncLogicEngine(undefined, { compatible: true })
    res = 'async'
  }
  // inline / disabled
  if (i & 2) {
    engine.disableInline = true
    res += ' no-inline'
  }
  // optimized / not optimized
  if (i & 4) {
    engine.disableInterpretedOptimization = true
    res += ' no-optimized'
  }
  // ieee754 / decimal
  if (i & 8) {
    configurePrecision(engine, Decimal)
    res += ' decimal'
  }
  engines.push([engine, res])
}

describe('All of the compatible tests', () => {
  for (const testCase of tests) {
    for (const engine of engines) {
      test(`${engine[1]} ${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )}`, async () => {
        let result = await engine[0].run(testCase[0], testCase[1])
        if ((result || 0).toNumber) result = Number(result)
        if (Array.isArray(result)) result = result.map(i => (i || 0).toNumber ? Number(i) : i)
        expect(result).toStrictEqual(testCase[2])
      })

      test(`${engine[1]} ${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )} (built)`, async () => {
        const f = await engine[0].build(testCase[0])
        let result = await f(testCase[1])
        if ((result || 0).toNumber) result = Number(result)
        if (Array.isArray(result)) result = result.map(i => i.toNumber ? Number(i) : i)
        expect(result).toStrictEqual(testCase[2])
      })
    }
  }
})
