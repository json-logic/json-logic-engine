// @ts-check
'use strict'

export const Sync = Symbol.for('json_logic_sync')
export const Compiled = Symbol.for('json_logic_compiled')
export const OriginalImpl = Symbol.for('json_logic_original')
export const Unfound = Symbol.for('json_logic_unfound')

/**
 * Checks if an item is synchronous.
 * This allows us to optimize the logic a bit
 * further so that we don't need to await everything.
 *
 * @param {*} item
 * @returns {Boolean}
 */
export function isSync (item) {
  if (typeof item === 'function') return item[Sync] === true
  if (Array.isArray(item)) return item.every(isSync)
  if (item && item.asyncMethod && !item.method) return false
  return true
}

export default {
  Sync,
  OriginalImpl,
  isSync
}
