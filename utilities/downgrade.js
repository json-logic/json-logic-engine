/**
 * Used to precoerce a data value to a number, for the purposes of coalescing.
 * @param {any} item
 */
export function precoerceNumber (item) {
  if (Number.isNaN(item)) throw NaN
  if (!item) return item
  if (item && typeof item === 'object') throw NaN
  return item
}

/**
 * Asserts that an object has a certain allowed depth.
 */
export function assertAllowedDepth (item, depthAllowed = 0) {
  if (!item) return item
  if (depthAllowed === Infinity) return item
  if (typeof item !== 'object') return item

  // checks for depthAllowed levels of depth being objects
  if (Array.isArray(item)) {
    for (let i = 0; i < item.length; i++) {
      if (typeof item[i] === 'object' && item[i]) {
        // eslint-disable-next-line no-throw-literal
        if (depthAllowed === 0) throw { type: 'Exceeded Allowed Depth' }
        assertAllowedDepth(item[i], depthAllowed - 1)
      }
    }
  } else {
    const keys = Object.keys(item)
    for (let i = 0; i < keys.length; i++) {
      const val = item[keys[i]]
      if (typeof val === 'object' && val) {
        // eslint-disable-next-line no-throw-literal
        if (depthAllowed === 0) throw { type: 'Exceeded Allowed Depth' }
        assertAllowedDepth(val, depthAllowed - 1)
      }
    }
  }

  return item
}
