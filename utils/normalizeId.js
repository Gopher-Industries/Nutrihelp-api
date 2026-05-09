/**
 * Normalizes input IDs to either Number (for BigInt/Int columns) 
 * or String (for UUID columns).
 */
module.exports = function normalizeId(id) {
  if (id === null || id === undefined) return id;
  
  // If it's a string that contains only digits, convert to Number
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    return Number(id);
  }
  
  // Otherwise return as-is (UUIDs, objects, or already Numbers)
  return id;
};
