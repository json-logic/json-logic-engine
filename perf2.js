// @ts-check
'use strict'

import { AsyncLogicEngine } from './index.js'

const x = new AsyncLogicEngine(undefined)
async function main () {
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
  console.time('built')
  const f = await x.build(logic)
  // console.log(f[Sync])
  console.log(await f({ x: 15, y: 1 }))
  for (let i = 0; i < 2e6; i++) {
    await f({ x: i, y: i % 20 })
  }
  console.timeEnd('built')
}
main()
