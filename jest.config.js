/**
 * Jest configuration.
 *
 * `npm test` runs unit tests only. The legacy live-server tests listed
 * in LIVE_SERVER_TESTS hit http://localhost:80 (or :3001) and require
 * `npm run dev` to be running. They are excluded from the default run
 * to keep CI green; invoke them with `npm run test:integration`.
 *
 * Contract tests under test/contractTests are run via their own
 * `npm run test:contract` script.
 */

const LIVE_SERVER_TESTS = [
  '/test/auth\\.test\\.js$',
  '/test/barcodeScanning\\.test\\.js$',
  '/test/be26_consolidation\\.test\\.js$',
  '/test/chatbot\\.test\\.js$',
  '/test/foodDataAllergies\\.test\\.js$',
  '/test/foodDataCookingMethods\\.test\\.js$',
  '/test/foodDataCuisines\\.test\\.js$',
  '/test/foodDataDietary\\.test\\.js$',
  '/test/foodDataHealth\\.test\\.js$',
  '/test/foodDataIngredients\\.test\\.js$',
  '/test/foodDataSpice\\.test\\.js$',
  '/test/healthNews\\.test\\.js$',
  '/test/shoppingList\\.test\\.js$',
  '/test/waterIntake\\.test\\.js$',
];

const ignore = [
  '/node_modules/',
  '/test/contractTests/',
  '/test/integration/',
  '/test/fixtures/',
  // CLI scripts that happen to match Jest's default test filename glob.
  '/security/',
];

// Only exclude live-server tests when not explicitly running integration suite.
if (!process.env.RUN_INTEGRATION) {
  ignore.push(...LIVE_SERVER_TESTS);
}

module.exports = {
  testEnvironment: 'node',
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testPathIgnorePatterns: ignore,
};
