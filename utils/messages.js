/**
 * Centralized message resolver.
 *
 * Loads strings from locales/en.json (default). Designed for easy i18n
 * extension — swap the locale file based on Accept-Language header when
 * multi-language support is added.
 *
 * Usage:
 *   const { msg } = require('../utils/messages');
 *   msg('auth.login.success')          // "Login successful."
 *   msg('validation.required_field', { field: 'Email' })  // "Email is required."
 */

const path = require('path');
const fs = require('fs');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const DEFAULT_LOCALE = 'en';

const cache = {};

function loadLocale(locale) {
  if (cache[locale]) return cache[locale];
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    if (locale !== DEFAULT_LOCALE) return loadLocale(DEFAULT_LOCALE);
    throw new Error(`Default locale file not found: ${filePath}`);
  }
  cache[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return cache[locale];
}

/**
 * Resolve a dot-notation message key to a string.
 *
 * @param {string} key      - Dot-notation key, e.g. "auth.login.success"
 * @param {Object} [vars]   - Template variables, e.g. { field: 'Email' }
 * @param {string} [locale] - Locale code, defaults to 'en'
 * @returns {string}
 */
function msg(key, vars = {}, locale = DEFAULT_LOCALE) {
  const strings = loadLocale(locale);
  const value = key.split('.').reduce((obj, part) => obj?.[part], strings);

  if (typeof value !== 'string') {
    // Return the key itself so missing strings are visible in logs
    return key;
  }

  return value.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    vars[name] !== undefined ? vars[name] : `{{${name}}}`
  );
}

/**
 * Express middleware — attaches msg() to res.locals so controllers can call
 * res.locals.msg('auth.login.success') with auto locale detection.
 */
function localeMiddleware(req, res, next) {
  const locale =
    (req.headers['accept-language'] || DEFAULT_LOCALE)
      .split(',')[0]
      .split('-')[0]
      .trim();

  res.locals.msg = (key, vars = {}) => msg(key, vars, locale);
  next();
}

module.exports = { msg, localeMiddleware };
