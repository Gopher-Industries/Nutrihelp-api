const Joi = require('joi');

/**
 * validate(schema, property)
 * - schema: Joi schema object
 * - property: 'body' | 'query' | 'params' | 'headers'
 */
module.exports = function validate(schema, property = 'body') {
  return (req, res, next) => {
    const value = req[property];

    const { error, value: validated } = schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        message: d.message,
        path: d.path.join('.'),
      }));
      return res.status(400).json({ success: false, error: 'ValidationError', details });
    }

    // replace the original with the validated/normalized value
    req[property] = validated;
    return next();
  };
};
