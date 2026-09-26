const Joi = require('joi');

module.exports = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });

    if (error) {
      const details = error.details.map(d => ({ message: d.message, path: d.path }));
      return res.status(400).json({
        success: false, 
        error: 'Validation Error',
        details
      });
    }
    next();
  };
};
