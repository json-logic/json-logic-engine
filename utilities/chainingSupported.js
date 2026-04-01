// @ts-check
'use strict'
/**
 * Checks if optional chaining is supported for the compiler
 * @returns {Boolean}
 */
const getIsOptionalChainingSupported = () => {
  if (typeof res !== 'undefined') return res
  try {
    // eslint-disable-next-line no-unused-vars
    const test = {}
    // eslint-disable-next-line no-eval
    const isUndefined = (typeof globalThis !== 'undefined' ? globalThis : global).eval('(test) => test?.foo?.bar')(test)
    // eslint-disable-next-line no-return-assign
    return res = isUndefined === undefined
  } catch (err) {
    // eslint-disable-next-line no-return-assign
    return res = false
  }
}
/** @type {boolean} */
let res
export default getIsOptionalChainingSupported
