const yaml = require('yamljs');
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');

const base = yaml.load(path.join(process.cwd(), 'index.yaml'));
const opts = {
  swaggerDefinition: {
    openapi: base.openapi || base.swagger || '3.0.0',
    info: base.info || { title: 'temp', version: '1.0.0' },
    servers: base.servers || [{ url: 'http://localhost' }]
  },
  apis: [path.join(process.cwd(), 'routes', '**', '*.js'), path.join(process.cwd(), 'routes', '*.js')]
};

try {
  const gen = swaggerJSDoc(opts);
  const merged = JSON.parse(JSON.stringify(base));
  merged.paths = Object.assign({}, merged.paths || {}, gen.paths || {});
  merged.components = Object.assign({}, merged.components || {}, gen.components || {});
  const p = merged.paths['/api/scanner/scan'];
  console.log(JSON.stringify(p, null, 2));
} catch (e) {
  console.error('ERROR', e && e.stack ? e.stack : e);
  process.exit(1);
}
