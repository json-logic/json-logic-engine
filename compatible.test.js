import fs from 'fs'
import { LogicEngine, AsyncLogicEngine } from './index.js'

const tests = []

// get all json files from "suites" directory
const files = fs.readdirSync('./suites')
for (const file of files) {
  if (file.endsWith('.json')) {
    tests.push(...JSON.parse(fs.readFileSync(`./suites/${file}`).toString()).filter(i => typeof i !== 'string').map(i => {
      if (Array.isArray(i)) return { rule: i[0], data: i[1] || null, result: i[2], description: JSON.stringify(i[0]) }
      return i
    }))
  }
}

function correction (x) {
  // eslint-disable-next-line no-compare-neg-zero
  if (x === -0) return 0
  if (Number.isNaN(x)) return { error: 'NaN' }
  return x
}

const engines = []

for (let i = 0; i < 8; i++) {
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
  engines.push([engine, res])
}

describe('All of the compatible tests', () => {
  for (const testCase of tests) {
    for (const engine of engines) {
      test(`${engine[1]} ${JSON.stringify(testCase.rule)} ${JSON.stringify(
        testCase.data
      )}`, async () => {
        let result = await engine[0].run(testCase.rule, testCase.data)
        if ((result || 0).toNumber) result = Number(result)
        if (Array.isArray(result)) result = result.map(i => (i || 0).toNumber ? Number(i) : i)
        expect(correction(result)).toStrictEqual(testCase.result)
      })

      test(`${engine[1]} ${JSON.stringify(testCase.rule)} ${JSON.stringify(
        testCase.data
      )} (built)`, async () => {
        const f = await engine[0].build(testCase.rule)
        let result = await f(testCase.data)
        if ((result || 0).toNumber) result = Number(result)
        if (Array.isArray(result)) result = result.map(i => i.toNumber ? Number(i) : i)
        expect(correction(result)).toStrictEqual(testCase.result)
      })
    }
  }
})
