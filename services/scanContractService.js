const {
  buildClassification,
  buildExplainability,
  CONTRACT_VERSION,
} = require('./imageClassificationContract');

const SCAN_CONTRACT_VERSION = CONTRACT_VERSION;

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim()))];
}

function buildScanPayload({
  type,
  entity = 'food',
  status,
  query = {},
  item = {},
  classification = {},
  allergens = {},
  nutrition,
  explainability = {},
  warnings = [],
} = {}) {
  const normalizedClassification = {
    ...buildClassification(),
    ...classification,
  };

  const combinedWarnings = uniqueStrings([
    ...(warnings || []),
    ...(explainability.warnings || []),
  ]);

  const normalizedExplainability = {
    ...buildExplainability(),
    ...explainability,
    warnings: combinedWarnings,
    contractVersion: SCAN_CONTRACT_VERSION,
  };

  const normalizedAllergens = {
    detectedIngredients: uniqueStrings(allergens.detectedIngredients),
    userIngredients: uniqueStrings(allergens.userIngredients),
    hasMatch: Boolean(allergens.hasMatch),
    matchingIngredients: uniqueStrings(allergens.matchingIngredients),
  };

  const resolvedStatus = status
    || (normalizedClassification.uncertain ? 'uncertain' : 'matched');

  const scan = {
    type,
    entity,
    status: resolvedStatus,
    query,
    item: {
      id: item.id || null,
      name: item.name || null,
      barcode: item.barcode || null,
      imageName: item.imageName || null,
    },
    classification: normalizedClassification,
    allergens: normalizedAllergens,
    nutrition: nutrition || normalizedClassification.calories || null,
    explainability: normalizedExplainability,
    warnings: combinedWarnings,
  };

  return {
    scan,
    classification: scan.classification,
    explainability: scan.explainability,
  };
}

function buildBarcodeScanPayload({
  barcode,
  productName,
  barcodeIngredients = [],
  userAllergenIngredients = [],
  matchingAllergens = [],
} = {}) {
  const normalizedBarcodeIngredients = uniqueStrings(barcodeIngredients);
  const normalizedUserIngredients = uniqueStrings(userAllergenIngredients);
  const normalizedMatches = uniqueStrings(matchingAllergens);

  const payload = buildScanPayload({
    type: 'barcode',
    entity: 'product',
    status: 'matched',
    query: {
      barcode: barcode || null,
      hasUserContext: normalizedUserIngredients.length > 0,
    },
    item: {
      name: productName || null,
      barcode: barcode || null,
    },
    classification: {
      label: productName || null,
      rawLabel: productName || null,
      confidence: null,
      uncertain: false,
      source: 'barcode',
      fallbackUsed: false,
      alternatives: [],
      calories: null,
    },
    allergens: {
      detectedIngredients: normalizedBarcodeIngredients,
      userIngredients: normalizedUserIngredients,
      hasMatch: normalizedMatches.length > 0,
      matchingIngredients: normalizedMatches,
    },
    explainability: {
      service: 'barcode_scanning',
      source: 'barcode',
      fallbackUsed: false,
      timedOut: false,
      circuitOpen: false,
      durationMs: 0,
      confidence: null,
      warnings: [],
    },
  });

  return {
    ...payload,
    productName: productName || null,
    detectionResult: {
      hasUserAllergen: normalizedMatches.length > 0,
      matchingAllergens: normalizedMatches,
    },
    barcodeIngredients: normalizedBarcodeIngredients,
    userAllergenIngredients: normalizedUserIngredients,
  };
}

function buildImageScanPayload({
  type,
  entity = 'food',
  query = {},
  item = {},
  classification = {},
  explainability = {},
} = {}) {
  return buildScanPayload({
    type,
    entity,
    status: classification.uncertain ? 'uncertain' : 'matched',
    query,
    item,
    classification,
    explainability,
  });
}

module.exports = {
  SCAN_CONTRACT_VERSION,
  buildScanPayload,
  buildBarcodeScanPayload,
  buildImageScanPayload,
};
