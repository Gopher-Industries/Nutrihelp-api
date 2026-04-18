const { body } = require('express-validator');

function optionalField(selector) {
  return body(selector)
    .optional({ nullable: true })
    .isString()
    .withMessage(`${selector} must be a string`)
    .trim();
}

const updateUserProfileValidation = [
  optionalField('name'),
  optionalField('username'),
  optionalField('first_name'),
  optionalField('firstName'),
  optionalField('last_name'),
  optionalField('lastName'),
  optionalField('contact_number'),
  optionalField('contactNumber'),
  optionalField('address'),
  optionalField('user_image'),
  optionalField('userImage'),
  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('email must be a valid email address')
    .normalizeEmail(),
  body('profile').optional().isObject().withMessage('profile must be an object'),
  body('profile.name').optional({ nullable: true }).isString().withMessage('profile.name must be a string').trim(),
  body('profile.username').optional({ nullable: true }).isString().withMessage('profile.username must be a string').trim(),
  body('profile.firstName').optional({ nullable: true }).isString().withMessage('profile.firstName must be a string').trim(),
  body('profile.lastName').optional({ nullable: true }).isString().withMessage('profile.lastName must be a string').trim(),
  body('profile.contactNumber').optional({ nullable: true }).isString().withMessage('profile.contactNumber must be a string').trim(),
  body('profile.address').optional({ nullable: true }).isString().withMessage('profile.address must be a string').trim(),
  body('profile.userImage').optional({ nullable: true }).isString().withMessage('profile.userImage must be a string'),
  body('profile.email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('profile.email must be a valid email address')
    .normalizeEmail()
];

module.exports = {
  updateUserProfileValidation
};
