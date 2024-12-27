import { LogicEngine } from '../index.js'
import { Decimal } from 'decimal.js'
import { configurePrecision } from './index.js'

const ieee754Engine = new LogicEngine()
const decimalEngine = new LogicEngine()
configurePrecision(decimalEngine, Decimal.clone({ precision: 100 }))

console.log(decimalEngine.build({ '+': ['85070591730234615847396907784232501249', 100] })().toFixed()) // 85070591730234615847396907784232501349
console.log(decimalEngine.run({ '+': [0.1, 0.2] })) // 0.3

console.log(ieee754Engine.run({ '>': [{ '+': [0.1, 0.2] }, 0.3] })) // true, because 0.1 + 0.2 = 0.30000000000000004
console.log(decimalEngine.run({ '>': [{ '+': [0.1, 0.2] }, 0.3] })) // false, because 0.1 + 0.2 = 0.3
