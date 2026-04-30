const { registerRouteGroups } = require('./routeGroups');

module.exports = (app) => {
  registerRouteGroups(app);
};
