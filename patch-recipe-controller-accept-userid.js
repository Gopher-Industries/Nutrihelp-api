const fs = require('fs');
const p = 'controller/recipeController.js';
if (!fs.existsSync(p)) { console.error('controller file not found:', p); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
// This is a best-effort find/replace; I'll tailor it if you paste the controller.
s = s.replace(/req\\.body\\.userId/g, '(req.query?.userId || req.body?.userId || req.headers[\\'x-user-id\\'])');
fs.writeFileSync(p, s);
console.log('Patched controller to accept userId from query/body/header');
