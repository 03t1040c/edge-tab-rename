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
// GitHub Pages can publish this /docs folder directly from the main branch.
const pagesFolder = path.join(root, 'docs');
fs.mkdirSync(pagesFolder, { recursive: true });
fs.writeFileSync(path.join(pagesFolder, 'privacy.html'), standalone);
fs.writeFileSync(path.join(pagesFolder, '.nojekyll'), '');
const description = fs.readFileSync(path.join(destination, 'description-ja.txt'), 'utf8').trim();
if (description.length < 250 || description.length > 10000) throw new Error('Store description must be 250–10,000 characters.');
console.log(`Self-contained privacy pages generated in store-assets/ and docs/. Japanese description: ${description.length} characters.`);
