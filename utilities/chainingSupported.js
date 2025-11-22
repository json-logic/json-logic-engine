let result

// @ts-check
'use strict'
/**
 * Checks if optional chaining is supported for the compiler
 * @returns {Boolean}
 */
const getIsOptionalChainingSupported = () => {
  if (typeof result === 'boolean') return result
  try {
    // eslint-disable-next-line no-unused-vars
    const test = {}
    // eslint-disable-next-line no-eval
    const isUndefined = (typeof globalThis !== 'undefined' ? globalThis : global).eval('(test) => test?.foo?.bar')(test)
    return result = (isUndefined === undefined)
  } catch (err) {
    return false
  }
}
export default getIsOptionalChainingSupported()
