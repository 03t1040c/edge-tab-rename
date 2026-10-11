// Produce a self-contained privacy page for GitHub Pages. No external dependencies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'store-assets');
fs.mkdirSync(destination, { recursive: true });
const policy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'options.css'), 'utf8');
const standalone = policy.replace('<link rel="stylesheet" href="options.css">', `<style>${css}</style>`);
if (standalone === policy) throw new Error('Privacy stylesheet reference not found.');
fs.writeFileSync(path.join(destination, 'privacy.html'), standalone);
const description = fs.readFileSync(path.join(destination, 'description-ja.txt'), 'utf8').trim();
if (description.length < 250 || description.length > 10000) throw new Error('Store description must be 250–10,000 characters.');
console.log(`Self-contained privacy page generated. Japanese description: ${description.length} characters.`);
