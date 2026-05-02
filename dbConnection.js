/**
 * Simple in-memory supabase-like mock for tests.
 * Persists inserted rows and supports common chainable methods:
 * select, order, range, limit, ilike, gte, lte, in, eq, maybeSingle, single,
 * insert(...).select().maybeSingle(), update(...).eq(...).select().maybeSingle(),
 * delete(...).eq(...)
 */
const tables = {
  health_news: [],
  authors: [],
  categories: [],
  tags: [],
  news_tags: []
};
let nextId = 1000000;

function normalize(val) {
  if (val === undefined || val === null) return null;
  return String(val);
}

function matchFilters(row, filters) {
  if (!filters || filters.length === 0) return true;
  for (const f of filters) {
    const col = f.col;
    const v = row[col];
    if (f.type === 'eq') {
      if (normalize(v) !== normalize(f.val)) return false;
    } else if (f.type === 'in') {
      if (!Array.isArray(f.vals)) return false;
      if (!f.vals.map(String).includes(String(v))) return false;
    } else if (f.type === 'ilike') {
      if (!v || !String(v).toLowerCase().includes(String(f.val).toLowerCase().replace(/%/g, ''))) return false;
    } else if (f.type === 'gte') {
      if (!(String(v) >= String(f.val))) return false;
    } else if (f.type === 'lte') {
      if (!(String(v) <= String(f.val))) return false;
    }
  }
  return true;
}

function createBuilder(table, selectStmt, opts) {
  const state = {
    table,
    select: selectStmt || '*',
    opts: opts || {},
    filters: [],
    orderBy: null,
    limitVal: null,
    rangeVal: null
  };

  const builder = {
    select(selectStmt, options) {
      state.select = selectStmt || state.select;
      if (options) state.opts = options;
      return builder;
    },
    order(col, opts) { state.orderBy = { col, opts }; return builder; },
    limit(n) { state.limitVal = n; return builder; },
    range(a, b) { state.rangeVal = [a, b]; return builder; },
    ilike(col, val) { state.filters.push({ type: 'ilike', col, val }); return builder; },
    gte(col, val) { state.filters.push({ type: 'gte', col, val }); return builder; },
    lte(col, val) { state.filters.push({ type: 'lte', col, val }); return builder; },
    in(col, vals) { state.filters.push({ type: 'in', col, vals }); return builder; },
    eq(col, val) { state.filters.push({ type: 'eq', col, val }); state.lastEq = { col, val }; return builder; },

    maybeSingle: async () => {
      const arr = tables[state.table] || [];
      const results = arr.filter(r => matchFilters(r, state.filters));
      const single = results.length > 0 ? results[0] : null;
      return { data: single, error: null };
    },

    single: async () => {
      const arr = tables[state.table] || [];
      const results = arr.filter(r => matchFilters(r, state.filters));
      const single = results.length > 0 ? results[0] : null;
      return { data: single, error: null };
    },

    then(onFulfilled, onRejected) {
      return (async () => {
        const arr = tables[state.table] || [];
        let results = arr.filter(r => matchFilters(r, state.filters));

        // ordering (basic)
        if (state.orderBy && state.orderBy.col) {
          const col = state.orderBy.col;
          const asc = state.orderBy.opts && state.orderBy.opts.ascending;
          results = results.sort((a, b) => {
            if (a[col] === b[col]) return 0;
            if (a[col] === undefined) return 1;
            if (b[col] === undefined) return -1;
            if (a[col] > b[col]) return asc ? 1 : -1;
            return asc ? -1 : 1;
          });
        }

        // range/limit
        if (Array.isArray(state.rangeVal)) {
          const [a, b] = state.rangeVal;
          results = results.slice(a, b + 1);
        } else if (state.limitVal) {
          results = results.slice(0, state.limitVal);
        }

        // head+count option
        if (state.opts && state.opts.head && state.opts.count === 'exact') {
          return { count: results.length, error: null };
        }

        return { data: results, error: null };
      })().then(onFulfilled, onRejected);
    }
  };

  return builder;
}

module.exports = {
  from: (table) => {
    table = table || 'unknown';
    tables[table] = tables[table] || [];

    return {
      select: (selectStmt, options) => createBuilder(table, selectStmt, options),

      insert: (rows) => {
        const arr = Array.isArray(rows) ? rows : [rows];
        return {
          select: () => ({
            maybeSingle: async () => {
              const inserted = arr.map(r => {
                const id = r.id || nextId++;
                const now = new Date().toISOString();
                const item = Object.assign({ id, created_at: now, published_at: now }, r);
                tables[table].push(item);
                return item;
              })[0];
              return { data: inserted, error: null };
            }
          })
        };
      },

      update: (patch) => ({
        eq: (col, val) => ({
          select: () => ({
            maybeSingle: async () => {
              const arr = tables[table] || [];
              const idx = arr.findIndex(it => String(it[col]) === String(val));
              if (idx === -1) return { data: null, error: null };
              arr[idx] = Object.assign({}, arr[idx], patch);
              return { data: arr[idx], error: null };
            }
          })
        })
      }),

      delete: () => ({
        eq: (col, val) => {
          const arr = tables[table] || [];
          const idx = arr.findIndex(it => String(it[col]) === String(val));
          if (idx === -1) return Promise.resolve({ data: null, error: null });
          const removed = arr.splice(idx, 1);
          return Promise.resolve({ data: removed, error: null });
        }
      })
    };
  }
};
