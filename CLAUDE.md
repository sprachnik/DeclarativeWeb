# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeclarativeWeb is a minimal, LLM-friendly JavaScript library for rendering websites from a single JSON schema. Zero build step, pure HTML + JS. The key philosophy is **single-file editing** - update only `site.json`, never touch HTML/CSS/JS framework files.

## Commands

```bash
npm install           # Install dependencies
npm run build         # Bundle JS into dist/declarativeweb.min.js
npm test              # Run tests with coverage
npm run test:watch    # Run tests in watch mode
npm run test:ci       # CI mode (--ci --coverage --maxWorkers=2)
```

Coverage thresholds: 70% lines/functions/statements, 55% branches.

**Important:** After modifying any JS source files, run `npm run build` before committing. CI will fail if the bundle is out of date.

## Architecture

### Core Modules

| File | Purpose |
|------|---------|
| `render.js` | Core framework - initialization, routing, block rendering |
| `expression-evaluator.js` | Safe expression parser (no eval/Function) |
| `streaming-json-parser.js` | Incremental JSON parser for LLM streaming |
| `action-executor.js` | Action execution (setState, navigate, fetch) |
| `state-manager.js` | Deep reactive proxy for state management |
| `data-fetcher.js` | API data fetching with caching |
| `form-gen.js` | Dynamic form generation from JSON |
| `conditional-renderer.js` | if/then/else block rendering |
| `loop-renderer.js` | Iteration/loop rendering |
| `watch-manager.js` | State change subscriptions |

### Initialization Flow

1. Load `site.json` (or pass data object)
2. Parse JSON and initialize components/functions/pages
3. Create reactive state proxy
4. Render current page
5. Attach event listeners for routing and actions

### Block Types

Eight content blocks: `hero`, `section`, `markdown`, `code`, `html`, `button`, `table`, `mermaid`, `frappe-chart`, and `$ref` (component references). See `BLOCKS.md` for complete reference.

### Composable JSON with $import

DeclarativeWeb supports lazy-loaded, composable JSON using `$import`:

```json
{
  "pages": [
    { "path": "/", "$import": "pages/home.json" },
    { "path": "/about", "$import": "pages/about.json" }
  ]
}
```

**Benefits:**
- **Lazy Loading**: Pages are fetched only when navigated to
- **HTTP Caching**: Imported files are cached in memory to avoid redundant requests
- **Better Organization**: Split large JSON files into logical page/component files
- **Smaller Initial Payload**: Main site.json stays minimal

**Backward Compatibility**: Sites without `$import` work exactly as before.

### Flexible Property Names

DeclarativeWeb accepts alternative property names for forgiveness:
- Hero: `headline`/`title`, `subhead`/`subtitle`
- HTML: `html`/`content`
- Section: `description`/`subtitle`

## Key Patterns

### Component Definition (HTML string, not object)

```json
{
  "components": {
    "card": "<div class='card'><h3>{{title}}</h3></div>"
  }
}
```

### Template Interpolation (Mustache-style)

```json
"headline": "Welcome to {{site.title}}"
"text": "Count: {{state.count}}"
"footer": "© {{year()}} Company"
```

### Reactive State

```javascript
Render.state.count = 5  // Auto-triggers re-render
```

### Component Injection

```javascript
Render.inject('#container', { type: 'hero', headline: 'Title' }, { mode: 'replace' })
const stream = Render.createStream('#output')
stream.append('{"type": "hero"}')
stream.complete()
```

## For Content Changes

1. Edit only `site.json`
2. Never modify `render.js`, `styles.css`, or `index.html`
3. Validate against `schema.json` for VS Code auto-completion
4. Reference `BLOCKS.md` for block syntax, `INJECTION.md` for injection API

## External Dependencies (CDN-loaded)

- Pico CSS 2 - Minimal CSS framework
- Marked.js - Markdown parser
- Lucide Icons - Icon library
- Mermaid v10 - Diagram rendering (flowcharts, sequence diagrams, ERDs, etc.)
- Frappe Charts v1.6.2 - Data visualization (line, bar, pie, percentage, heatmap charts)

Zero npm production dependencies.
