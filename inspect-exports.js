const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('node_modules/convex/package.json', 'utf8'));
console.log(JSON.stringify(pkg.exports['./server'], null, 2));
