
/**
 * Coerces a value into an array.
 * This is used for unary value operations.
 */
export function coerceArray (value) {
  return Array.isArray(value) ? value : [value]
}
