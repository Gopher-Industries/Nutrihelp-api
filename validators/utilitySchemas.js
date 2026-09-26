const Joi = require('joi');

const numericId = Joi.string().pattern(/^\d+$/);

module.exports = {
  barcodeScan: Joi.object({
    barcode: Joi.string().required().min(8).max(14)
  }),
  shoppingItem: Joi.object({
    user_id: numericId.required(),
    item_name: Joi.string().required(),
    quantity: Joi.string().allow(''),
    category: Joi.string().allow('')
  }),
  notificationQuery: Joi.object({
    user_id: numericId.required(),
    unread_only: Joi.boolean().default(false)
  })
};
