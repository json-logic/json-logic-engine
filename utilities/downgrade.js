/**
 * Used to precoerce a data value to a number, for the purposes of coalescing.
 * @param {any} item
 */
export function precoerceNumber (item) {
  if (Number.isNaN(item)) throw NaN
  if (!item) return item
  if (typeof item === 'object') throw NaN
  return item
}

/**
 * Used to assert in compiled templates that a value is an array of at least a certain size.
 * @param {*} arr
 * @param {number} size
 */
export function assertSize (arr, size) {
  // eslint-disable-next-line no-throw-literal
  if (!Array.isArray(arr) || arr.length < size) throw { type: 'Invalid Arguments' }
  return arr
}
