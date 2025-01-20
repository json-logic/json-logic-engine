/**
 * Used to precoerce a data value to a number, for the purposes of coalescing.
 * @param {any} item
 */
export function precoerceNumber (item) {
  if (Number.isNaN(item)) throw new Error('NaN')
  if (!item) return item
  if (typeof item === 'object') throw new Error('NaN')
  return item
}
