import { AsyncLogicEngine } from '../index.js'
import { Decimal } from 'decimal.js'
import { configurePrecision } from './index.js'
import { isDeepStrictEqual } from 'util'

import fs from 'fs'

const tests = JSON.parse(fs.readFileSync('../bench/tests.json').toString())

Decimal.prototype.toString = function () {
  return this.toFixed()
}

Decimal.prototype.valueOf = function () {
  return this.toFixed()
}

const decimalEngine = new AsyncLogicEngine(undefined, { compatible: true })
configurePrecision(decimalEngine, Decimal.clone({ precision: 100 }))

let count = 0
for (const test of tests) {
  if (typeof test !== 'string') {
    let result = await decimalEngine.run(test[0], test[1])
    if (result && result.toNumber) result = Number(result)
    if (Array.isArray(result)) result = result.map((x) => (x && x.toNumber ? Number(x) : x))
    if (!isDeepStrictEqual(result, test[2])) {
      count++
      console.log(test[0], test[2], result)
    }
  }
}

console.log(count, 'Wrong')
