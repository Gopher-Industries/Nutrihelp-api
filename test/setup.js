const { expect: chaiExpect } = require('chai');
const Module = require('module');
const path = require('path');
const supertestPath = require.resolve('supertest');
const originalSupertest = require('supertest');

const mockRegistry = new Map();
const createdMocks = new Set();
const originalLoad = Module._load;

function createMockFunction() {
  const onceQueue = [];
  let defaultImplementation;

  function mockFn(...args) {
    mockFn.mock.calls.push(args);

    if (onceQueue.length > 0) {
      return onceQueue.shift().apply(this, args);
    }

    if (defaultImplementation) {
      return defaultImplementation.apply(this, args);
    }

    return undefined;
  }

  mockFn.mock = { calls: [] };

  mockFn.mockImplementation = (fn) => {
    defaultImplementation = fn;
    return mockFn;
  };

  mockFn.mockReturnValue = (value) => mockFn.mockImplementation(() => value);
  mockFn.mockReturnThis = () =>
    mockFn.mockImplementation(function mockReturnThis() {
      return this;
    });
  mockFn.mockResolvedValue = (value) => mockFn.mockImplementation(() => Promise.resolve(value));
  mockFn.mockRejectedValue = (error) => mockFn.mockImplementation(() => Promise.reject(error));
  mockFn.mockResolvedValueOnce = (value) => {
    onceQueue.push(() => Promise.resolve(value));
    return mockFn;
  };
  mockFn.mockRejectedValueOnce = (error) => {
    onceQueue.push(() => Promise.reject(error));
    return mockFn;
  };
  mockFn.mockImplementationOnce = (fn) => {
    onceQueue.push(fn);
    return mockFn;
  };
  mockFn.mockClear = () => {
    mockFn.mock.calls = [];
    return mockFn;
  };
  mockFn.mockReset = () => {
    mockFn.mock.calls = [];
    onceQueue.length = 0;
    defaultImplementation = undefined;
    return mockFn;
  };

  createdMocks.add(mockFn);
  return mockFn;
}

function createExpect(actual) {
  return {
    toBe(expected) {
      chaiExpect(actual).to.equal(expected);
    },
    toEqual(expected) {
      chaiExpect(actual).to.deep.equal(expected);
    },
    toHaveProperty(propertyPath, expectedValue) {
      if (arguments.length === 2) {
        chaiExpect(actual).to.have.nested.property(propertyPath, expectedValue);
        return;
      }

      chaiExpect(actual).to.have.nested.property(propertyPath);
    },
    toBeDefined() {
      chaiExpect(actual).to.not.equal(undefined);
    },
    toBeGreaterThanOrEqual(expected) {
      chaiExpect(actual).to.be.at.least(expected);
    },
    toContain(expected) {
      chaiExpect(actual).to.contain(expected);
    },
    toMatch(expected) {
      if (expected instanceof RegExp) {
        chaiExpect(actual).to.match(expected);
        return;
      }

      chaiExpect(actual).to.contain(expected);
    },
  };
}

function resolveFromCaller(request) {
  const previousPrepare = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack;
  Error.prepareStackTrace = previousPrepare;

  const callerSite = stack.find((site) => {
    const fileName = site.getFileName();
    return fileName && fileName !== __filename;
  });

  const callerFile = callerSite ? callerSite.getFileName() : __filename;
  return Module.createRequire(path.resolve(callerFile)).resolve(request);
}

global.expect = createExpect;
global.test = (...args) => global.it(...args);

global.jest = {
  fn: createMockFunction,
  clearAllMocks() {
    for (const mockFn of createdMocks) {
      mockFn.mockClear();
    }
  },
  mock(request, factory) {
    const resolvedRequest = resolveFromCaller(request);
    const mockValue = factory ? factory() : createMockFunction();
    mockRegistry.set(resolvedRequest, mockValue);
    return mockValue;
  },
};

Module._load = function patchedLoad(request, parent, isMain) {
  let resolvedRequest = request;

  try {
    resolvedRequest = Module._resolveFilename(request, parent);
  } catch {
    resolvedRequest = request;
  }

  if (mockRegistry.has(resolvedRequest)) {
    return mockRegistry.get(resolvedRequest);
  }

  return originalLoad.apply(this, arguments);
};

function getLocalApp() {
  return require('../server');
}

function wrappedSupertest(target, ...rest) {
  if (target === 'http://localhost:80' || target === 'http://127.0.0.1:80') {
    return originalSupertest(getLocalApp(), ...rest);
  }

  return originalSupertest(target, ...rest);
}

Object.assign(wrappedSupertest, originalSupertest);

wrappedSupertest.agent = (target, ...rest) => {
  if (target === 'http://localhost:80' || target === 'http://127.0.0.1:80') {
    return originalSupertest.agent(getLocalApp(), ...rest);
  }

  return originalSupertest.agent(target, ...rest);
};

require.cache[supertestPath].exports = wrappedSupertest;
