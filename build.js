#!/usr/bin/env node
/**
 * Build script for DeclarativeWeb
 * Bundles all JS modules into a single minified file
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Files to bundle in dependency order
const sourceFiles = [
  'expression-evaluator.js',
  'conditional-renderer.js',
  'loop-renderer.js',
  'state-manager.js',
  'watch-manager.js',
  'data-fetcher.js',
  'action-executor.js',
  'streaming-json-parser.js',
  'form-gen.js',
  'render.js'
];

const outputFile = 'dist/declarativeweb.min.js';
const outputFileUnminified = 'dist/declarativeweb.js';

async function build() {
  console.log('Building DeclarativeWeb bundle...');

  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Concatenate all source files
  let combined = `/**
 * DeclarativeWeb v${require('./package.json').version}
 * A minimal, LLM-friendly JavaScript library for rendering websites from JSON
 * https://github.com/sprachnik/DeclarativeWeb
 */
`;

  for (const file of sourceFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
      combined += `\n// === ${file} ===\n${content}\n`;
      console.log(`  ✓ Added ${file}`);
    } else {
      console.warn(`  ⚠ Warning: ${file} not found, skipping`);
    }
  }

  // Write unminified version
  fs.writeFileSync(outputFileUnminified, combined);
  console.log(`  ✓ Created ${outputFileUnminified}`);

  // Use esbuild to minify
  const result = await esbuild.build({
    stdin: {
      contents: combined,
      loader: 'js',
    },
    outfile: outputFile,
    minify: true,
    bundle: false,
    sourcemap: true,
    target: ['es2020'],
    format: 'iife',
  });

  const stats = fs.statSync(outputFile);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log(`  ✓ Created ${outputFile} (${sizeKB} KB)`);
  console.log('\nBuild complete!');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
