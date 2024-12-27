import { LogicEngine } from '../index.js'
import { Decimal } from 'decimal.js'
import { configurePrecision } from './index.js'

Decimal.prototype.toString = function () {
  return this.toFixed()
}

const ieee754Engine = new LogicEngine()
const decimalEngine = new LogicEngine()
configurePrecision(decimalEngine, Decimal.clone({ precision: 100 }))

console.log(ieee754Engine.build({ '*': [9007199254740991, 5] })()) // 45035996273704950, inaccurate
console.log(decimalEngine.build({ '*': [9007199254740991, 5] })()) // 45035996273704955, accurate

console.log(ieee754Engine.run({ '+': [0.1, 0.2] })) // 0.30000000000000004
console.log(decimalEngine.run({ '+': [0.1, 0.2] })) // 0.3

console.log(ieee754Engine.run({ '>': [{ '+': [0.1, 0.2] }, 0.3] })) // true, because 0.1 + 0.2 = 0.30000000000000004
console.log(decimalEngine.run({ '>': [{ '+': [0.1, 0.2] }, 0.3] })) // false, because 0.1 + 0.2 = 0.3
