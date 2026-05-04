/**
 * services/dbConnection.js
 * Chainable query stub for Supabase-like DB interactions in tests.
 */
const db = {
  from: (table) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      order: () => chain,
      limit: () => chain,
    };
    return chain;
  }
};

module.exports = db;
