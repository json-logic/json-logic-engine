
/**
 * Used to make an "error" piece of data null, for the purposes of coalescing.
 * @param {any} item
 */
export function downgrade (item) {
  if (item && typeof item === 'object' && 'error' in item) return null
  if (Number.isNaN(item)) return null
  return item
}

/**
 * Used to precoerce a data value to a number, for the purposes of coalescing.
 * @param {any} item
 */
export function precoerceNumber (item) {
  if (!item) return item
  if (typeof item === 'object') throw new Error('NaN')
  return item
}
