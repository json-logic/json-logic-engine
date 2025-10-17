// @ts-check
'use strict'

import { assertNotType } from './utilities/downgrade.js'

// Note: Each of these iterators executes synchronously, and will not "run in parallel"
// I am supporting filter, reduce, some, every, map
export async function filter (arr, iter) {
  const result = []
  let index = 0
  for (const item of arr) {
    if (await iter(item, index++, arr)) result.push(item)
  }
  return result
}

export async function some (arr, iter) {
  let index = 0
  for (const item of arr) {
    if (await iter(item, index++, arr)) return true
  }
  return false
}

export async function every (arr, iter) {
  let index = 0
  for (const item of arr) {
    if (!(await iter(item, index++, arr))) return false
  }
  return true
}

export async function map (arr, iter) {
  const result = []
  let index = 0
  for (const item of arr) {
    result.push(await iter(item, index++, arr))
  }
  return result
}

export async function reduce (arr, iter, defaultValue, skipTypeCheck = false) {
  if (arr.length === 0) {
    if (typeof defaultValue !== 'undefined') return defaultValue
    throw new Error('Array has no elements.')
  }

  const start = typeof defaultValue === 'undefined' ? 1 : 0
  let data = assertNotType(start ? arr[0] : defaultValue, skipTypeCheck ? '' : 'object')

  for (let i = start; i < arr.length; i++) {
    data = assertNotType(await iter(data, arr[i]), skipTypeCheck ? '' : 'object')
  }

  return data
}

export default {
  filter,
  some,
  every,
  map,
  reduce
}
