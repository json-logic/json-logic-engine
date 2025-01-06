import { AsyncLogicEngine } from './index.js'
const x = new AsyncLogicEngine(undefined)
async function test () {
  const logic = {
    if: [
      {
        '>': [{ val: 'x' }, { '+': [11, 5, { '+': [1, { val: 'y' }, 1] }, 2] }]
      },
      {
        '*': [{ val: 'x' }, { '*': { map: [[2, 5, 5], { val: [] }] } }]
      },
      {
        '/': [{ val: 'x' }, { '-': { map: [[100, 50, 30, 10], { val: [] }] } }]
      }
    ]
  }
  console.time('interpreted')
  console.log(await x.run(logic, { x: 15, y: 1 }))
  for (let i = 0; i < 2e6; i++) {
    await x.run(logic, { x: i, y: i % 20 })
  }
  console.timeEnd('interpreted')
}
test()
