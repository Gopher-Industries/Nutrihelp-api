// nyc.config.js
// NYC coverage configuration for test reporting

module.exports = {
    reporter: ['lcov', 'text', 'html', 'json-summary'],
    all: true,
    include: [
      '**/*.js',
      '!**/test/**',
      '!**/scripts/**'
    ],
    exclude: [
      'node_modules/**',
      'test/**',
      'coverage/**',
      'scripts/**',
      '**/*.test.js',
      '**/*.spec.js',
      '**/config/**',
      '**/migrations/**',
      '**/seeders/**'
    ],
    'check-coverage': false, // Set to true to enforce coverage thresholds
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80,
    watermarks: {
      lines: [70, 85],
      functions: [70, 85],
      branches: [65, 80],
      statements: [70, 85]
    },
    'temp-dir': '.nyc_output',
    'report-dir': 'coverage',
    'skip-full': false,
    'skip-empty': false
  };