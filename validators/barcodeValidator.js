const Joi = require('joi');

const barcodeParams = Joi.object({
  barcode: Joi.string().trim().min(3).max(64).required()
});

module.exports = { barcodeParams };
