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
 * Used to assert in compiled templates that a value is an array of at least a certain size.
 * @param {*} arr
 * @param {number} size
 */
export function assertSize (arr, size) {
  // eslint-disable-next-line no-throw-literal
  if (!Array.isArray(arr) || arr.length < size) throw { type: 'Invalid Arguments' }
  return arr
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

/**
 * Used to assert in compiled templates that when a numeric comparison is made, both values are numbers.
 * @param {*} item
 * @param {*} prev
 * @returns {number}
 */
export function compareCheck (item, prev, strict) {
  if (strict || (typeof item === 'string' && typeof prev === 'string')) return item

  if (Number.isNaN(+precoerceNumber(item)) && prev !== null) throw NaN
  if (Number.isNaN(+precoerceNumber(prev))) throw NaN

  // The following two checks allow us to handle null == 0 and 0 == null; it's honestly
  // kind of gross that JavaScript works this way out of the box. Like, why is 0 <= null true,
  // but null == false. It's just weird.
  if (prev === null && !item) return null
  if (item === null && !prev) return 0

  return item
}
